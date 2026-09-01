import { Router } from 'express';
import { renderOrderList, renderOrderDetail } from '../controllers/adminController.js';

const router = Router();

// GET /admin/orders
router.get('/orders', renderOrderList);

// GET /admin/orders/:id
router.get('/orders/:id', renderOrderDetail);

export default router;
