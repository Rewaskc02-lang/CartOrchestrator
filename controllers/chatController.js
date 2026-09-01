import ai from '../config/gemini.js';
import Conversation from '../models/Conversation.js';
import {
  geminiTools,
  SYSTEM_INSTRUCTION,
  executeToolCall,
} from '../services/aiAgent.js';

/**
 * Robust Gemini model invoker with retry backoff
 */
const callGeminiWithRetry = async (geminiContents, retries = 3) => {
  const candidateModels = ['gemini-3.7-flash', 'gemini-3.5-flash'];

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
      console.warn(`[Gemini Attempt ${attempt + 1}/${retries} Failed with model ${modelToUse}]:`, err.message);

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
};

/**
 * POST /api/chat
 * Multi-turn AI shopping agent endpoint with guarded tool calling.
 */
export const handleChat = async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'A valid sessionId string is required.',
      });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Message cannot be empty.',
      });
    }

    const cleanSessionId = sessionId.trim();

    // 1. Load or initialize Conversation
    let conversation = await Conversation.findOne({ sessionId: cleanSessionId });
    if (!conversation) {
      conversation = new Conversation({
        sessionId: cleanSessionId,
        messages: [],
      });
    }

    // 2. Build sanitized multi-turn history (only text turns to avoid thought_signature errors)
    const geminiContents = [];

    for (const msg of conversation.messages) {
      if (msg.role === 'user' && msg.content) {
        geminiContents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant' && msg.content) {
        geminiContents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user turn
    const userMessageText = message.trim();
    geminiContents.push({
      role: 'user',
      parts: [{ text: userMessageText }],
    });

    // Save user message to DB
    conversation.messages.push({
      role: 'user',
      content: userMessageText,
      timestamp: new Date(),
    });

    // Structured response payload collector
    const turnData = {
      products: [],
      paymentLink: null,
      orderId: null,
      coupon: null,
      cart: null,
    };

    // 3. Multi-turn Agent Tool Execution Loop
    let loopCount = 0;
    const MAX_TOOL_LOOPS = 5;
    let finalAssistantReply = '';

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;

      // Call Gemini API
      const response = await callGeminiWithRetry(geminiContents);

      // Extract function calls
      const functionCalls = typeof response.functionCalls === 'function'
        ? response.functionCalls()
        : response.functionCalls;

      // Case A: Model requested tool/function execution
      if (Array.isArray(functionCalls) && functionCalls.length > 0) {
        console.log(`[AI Agent] Turn ${loopCount} requested ${functionCalls.length} tool call(s):`, functionCalls);

        // Keep raw model response candidate in active memory
        const candidateContent = response.candidates?.[0]?.content;
        if (candidateContent) {
          geminiContents.push(candidateContent);
        }

        const functionResponses = [];

        // Execute each tool call
        for (const call of functionCalls) {
          const { name, args } = call;
          const toolArgs = {
            sessionId: cleanSessionId,
            ...(args || {}),
          };

          const toolResult = await executeToolCall(name, toolArgs);

          // Collect structured data
          if (name === 'searchProducts' && Array.isArray(toolResult.products)) {
            turnData.products.push(...toolResult.products);
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

        // Return tool results back to Gemini in active turn
        geminiContents.push({
          role: 'user',
          parts: functionResponses,
        });

        // Continue loop to let Gemini generate the conversational response or further tool calls
        continue;
      }

      // Case B: Model returned a final textual response
      finalAssistantReply = response.text || '';
      break;
    }

    if (!finalAssistantReply) {
      finalAssistantReply = "I've processed your request. Let me know how else I can assist you!";
    }

    // 4. Save final assistant response to DB
    conversation.messages.push({
      role: 'assistant',
      content: finalAssistantReply,
      timestamp: new Date(),
    });
    await conversation.save();

    return res.status(200).json({
      success: true,
      sessionId: cleanSessionId,
      reply: finalAssistantReply,
      data: {
        ...(turnData.products.length > 0 && { products: turnData.products }),
        ...(turnData.paymentLink && {
          paymentLink: turnData.paymentLink,
          orderId: turnData.orderId,
        }),
        ...(turnData.coupon && { coupon: turnData.coupon }),
        ...(turnData.cart && { cart: turnData.cart }),
      },
    });
  } catch (error) {
    console.error('[Chat Controller Error]', error);
    return res.status(500).json({
      error: 'ChatProcessingError',
      message: error.message || 'An unexpected error occurred while communicating with the AI agent.',
    });
  }
};

export default {
  handleChat,
};