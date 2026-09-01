import { WebSocketServer } from 'ws';
import { executeToolCall, geminiTools, SYSTEM_INSTRUCTION } from './aiAgent.js';
import ai from '../config/gemini.js';
import Conversation from '../models/Conversation.js';

// Map sessionId -> Set of active WebSocket connections
const sessionClients = new Map();

/**
 * Fast Gemini Model Invoker with automatic failover
 */
const callGeminiFast = async (geminiContents, retries = 3) => {
  // Use gemini-3.5-flash first for blazing fast 1s responses, fallback to gemini-3.7-flash
  const candidateModels = ['gemini-3.5-flash', 'gemini-3.7-flash'];

  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const modelToUse = candidateModels[attempt % candidateModels.length];
    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: geminiContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: geminiTools,
          temperature: 0.2,
        },
      });

      return response;
    } catch (err) {
      lastError = err;
      console.warn(`[WS Gemini Attempt ${attempt + 1}/${retries} with ${modelToUse}]:`, err.message);

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  throw lastError;
};

/**
 * Initialize and mount the global WebSocket Server
 */
export const initWebSocketServer = (httpServer) => {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  global.wss = wss;

  wss.on('connection', (ws, req) => {
    // Extract sessionId from URL query params
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let sessionId = url.searchParams.get('sessionId') || `sess_anon_${Date.now()}`;

    // Register client in sessionClients map
    if (!sessionClients.has(sessionId)) {
      sessionClients.set(sessionId, new Set());
    }
    sessionClients.get(sessionId).add(ws);

    // Send connection established confirmation
    ws.send(
      JSON.stringify({
        type: 'connection_ack',
        sessionId,
        message: 'Global real-time WebSocket connection established',
      })
    );

    ws.on('message', async (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString());

        if (payload.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        if (payload.type === 'set_session') {
          const oldSid = sessionId;
          if (sessionClients.has(oldSid)) {
            sessionClients.get(oldSid).delete(ws);
          }
          sessionId = payload.sessionId;
          if (!sessionClients.has(sessionId)) {
            sessionClients.set(sessionId, new Set());
          }
          sessionClients.get(sessionId).add(ws);
          return;
        }

        if (payload.type === 'chat_message') {
          const userText = (payload.message || '').trim();
          const sid = payload.sessionId || sessionId;

          if (!userText) return;

          // Notify client: message received & agent thinking
          sendToSession(sid, {
            type: 'agent_status',
            status: 'thinking',
            message: 'AI agent is processing your request...',
          });

          // Fetch or initialize persistent conversation
          let conversation = await Conversation.findOne({ sessionId: sid });
          if (!conversation) {
            conversation = new Conversation({ sessionId: sid, messages: [] });
          }

          // Append user message
          conversation.messages.push({
            role: 'user',
            content: userText,
            timestamp: new Date(),
          });

          // Prepare sanitized history for Gemini
          const recentMessages = conversation.messages.slice(-8);
          const geminiContents = recentMessages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }],
          }));

          const turnData = {
            products: [],
            paymentLink: null,
            orderId: null,
            coupon: null,
            cart: null,
          };

          let loopCount = 0;
          const MAX_LOOPS = 5;
          let finalAssistantReply = '';

          while (loopCount < MAX_LOOPS) {
            loopCount++;

            const response = await callGeminiFast(geminiContents);

            const functionCalls = typeof response.functionCalls === 'function'
              ? response.functionCalls()
              : response.functionCalls;

            if (Array.isArray(functionCalls) && functionCalls.length > 0) {
              const candidateContent = response.candidates?.[0]?.content;
              if (candidateContent) {
                geminiContents.push(candidateContent);
              }

              const functionResponses = [];

              for (const call of functionCalls) {
                const { name, args } = call;

                // Push real-time status update to client
                sendToSession(sid, {
                  type: 'tool_executing',
                  tool: name,
                  message: getToolStatusText(name, args),
                });

                const toolArgs = {
                  sessionId: sid,
                  ...(args || {}),
                };

                const toolResult = await executeToolCall(name, toolArgs);

                if (name === 'searchProducts' && Array.isArray(toolResult.products)) {
                  for (const prod of toolResult.products) {
                    if (!turnData.products.some((p) => (p.productId || p.id) === (prod.productId || prod.id))) {
                      turnData.products.push(prod);
                    }
                  }
                } else if (name === 'generatePaymentLink' && toolResult.paymentLink) {
                  turnData.paymentLink = toolResult.paymentLink;
                  turnData.orderId = toolResult.orderId;
                } else if (name === 'applyCoupon') {
                  turnData.coupon = toolResult;
                } else if (name === 'addToCart') {
                  turnData.cart = toolResult;
                }

                functionResponses.push({
                  functionResponse: {
                    name,
                    response: { result: toolResult },
                  },
                });
              }

              geminiContents.push({
                role: 'user',
                parts: functionResponses,
              });

              continue;
            }

            finalAssistantReply = response.text || '';
            break;
          }

          if (!finalAssistantReply) {
            finalAssistantReply = "I have processed your request. How else can I assist you?";
          }

          // Save to conversation
          conversation.messages.push({
            role: 'assistant',
            content: finalAssistantReply,
            timestamp: new Date(),
          });
          await conversation.save();

          // Send complete response immediately over WebSocket
          sendToSession(sid, {
            type: 'chat_response',
            success: true,
            sessionId: sid,
            reply: finalAssistantReply,
            data: turnData,
          });
        }
      } catch (err) {
        console.error('[WS Error]', err);
        ws.send(
          JSON.stringify({
            type: 'error',
            error: 'WebSocketProcessingError',
            message: err.message || 'An error occurred during real-time processing.',
          })
        );
      }
    });

    ws.on('close', () => {
      if (sessionClients.has(sessionId)) {
        sessionClients.get(sessionId).delete(ws);
        if (sessionClients.get(sessionId).size === 0) {
          sessionClients.delete(sessionId);
        }
      }
    });

    ws.on('error', (err) => {
      console.warn('[WS Socket Error]', err.message);
    });
  });

  console.log('[WebSocket] Global real-time WebSocket server mounted at /ws');
  return wss;
};

/**
 * Broadcast payload to all open sockets for a specific sessionId
 */
export const sendToSession = (sessionId, payload) => {
  if (!sessionClients.has(sessionId)) return false;
  const clients = sessionClients.get(sessionId);
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  }
  return true;
};

const getToolStatusText = (toolName, args) => {
  switch (toolName) {
    case 'searchProducts':
      return `Searching catalog for "${args?.query || 'footwear'}"...`;
    case 'applyCoupon':
      return `Validating coupon code "${args?.code || ''}"...`;
    case 'addToCart':
      return 'Updating your cart draft...';
    case 'generatePaymentLink':
      return 'Computing verified total & generating Razorpay link...';
    default:
      return `Executing ${toolName}...`;
  }
};
