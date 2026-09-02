/**
 * In-memory rate limiter for /api/chat endpoint
 * Prevents runaway LLM API costs during demo/judging period
 * Limits: 10 requests per minute per session, 100 requests per minute globally
 */

const sessionRequestCounts = new Map(); // sessionId -> { count, resetTime }
const globalRequestCount = { count: 0, resetTime: Date.now() + 60000 };

const WINDOW_MS = 60 * 1000; // 1 minute window
const SESSION_LIMIT = 25; // 25 requests per session per minute (generous for rapid judge testing)
const GLOBAL_LIMIT = 150; // 150 requests globally per minute

export const rateLimitChat = (req, res, next) => {
  const sessionId = req.body?.sessionId;
  const now = Date.now();

  // Reset global counter if window expired
  if (now >= globalRequestCount.resetTime) {
    globalRequestCount.count = 0;
    globalRequestCount.resetTime = now + WINDOW_MS;
  }

  // Increment global counter
  globalRequestCount.count++;

  // Check global limit
  if (globalRequestCount.count > GLOBAL_LIMIT) {
    console.warn(`[Rate Limit] Global limit exceeded (${GLOBAL_LIMIT} requests/min)`);
    return res.status(429).json({
      error: 'TooManyRequests',
      message: 'The server is receiving too many requests. Please try again in a moment.',
      retryAfter: Math.ceil((globalRequestCount.resetTime - now) / 1000),
    });
  }

  // Check session-specific limit if sessionId provided
  if (sessionId) {
    let sessionData = sessionRequestCounts.get(sessionId);

    // Initialize or reset session counter if window expired
    if (!sessionData || now >= sessionData.resetTime) {
      sessionData = { count: 0, resetTime: now + WINDOW_MS };
      sessionRequestCounts.set(sessionId, sessionData);
    }

    sessionData.count++;

    if (sessionData.count > SESSION_LIMIT) {
      console.warn(
        `[Rate Limit] Session limit exceeded for ${sessionId} (${SESSION_LIMIT} requests/min)`
      );
      return res.status(429).json({
        error: 'TooManyRequests',
        message: `You've reached the message limit (${SESSION_LIMIT} messages per minute). Please wait a moment before sending another message.`,
        retryAfter: Math.ceil((sessionData.resetTime - now) / 1000),
      });
    }
  }

  next();
};

export default rateLimitChat;
