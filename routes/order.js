import { Router } from 'express';
import { createOrder, getOrderById } from '../controllers/orderController.js';

const router = Router();

// POST /api/order
router.post('/', createOrder);

// GET /api/order/:id
router.get('/:id', getOrderById);

export default router;
