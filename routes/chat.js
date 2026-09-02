import { Router } from 'express';
import { handleChat } from '../controllers/chatController.js';
import { rateLimitChat } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/chat (with rate limiting to prevent runaway LLM costs)
router.post('/', rateLimitChat, handleChat);

export default router;
