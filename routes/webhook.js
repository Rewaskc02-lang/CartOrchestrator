import { Router } from 'express';
import { handleWebhook } from '../controllers/orderController.js';

const router = Router();

// POST /webhook/razorpay
router.post('/razorpay', handleWebhook);

export default router;
