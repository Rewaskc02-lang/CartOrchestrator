import { Router } from 'express';

const router = Router();

// GET /api/config/razorpay - Returns public Razorpay Key ID for client-side Checkout modal
router.get('/razorpay', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  res.json({
    keyId,
  });
});

export default router;
