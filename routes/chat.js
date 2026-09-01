import { Router } from 'express';
import { handleChat } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat
router.post('/', handleChat);

export default router;
