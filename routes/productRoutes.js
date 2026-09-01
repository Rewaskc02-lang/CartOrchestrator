import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();

/**
 * GET /api/products/featured
 * Returns 5 diverse featured products across catalog categories for the hero showcase.
 */
router.get('/featured', async (req, res) => {
  try {
    const featuredSkus = [
      'SHOE-RUN-001', // AeroGlide Ultra Marathon
      'SHOE-TRL-002', // PulseTrail Waterproof All-Terrain
      'SHOE-RUN-003', // CloudStrider Daily Trainer
      'SHOE-LFS-004', // MetroClassic Leather Low-Top
      'SHOE-BB-005',  // ApexCourt Pro Basketball
    ];

    let products = await Product.find({ sku: { $in: featuredSkus } }).lean();

    if (!products || products.length === 0) {
      products = await Product.find().limit(5).lean();
    }

    // Preserve order matching featuredSkus
    products.sort((a, b) => featuredSkus.indexOf(a.sku) - featuredSkus.indexOf(b.sku));

    res.json({
      success: true,
      products: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        category: p.category,
        sku: p.sku,
        stock: p.stock,
        description: p.description,
      })),
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured products' });
  }
});

/**
 * GET /api/products
 * Returns all products with optional query filtering
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(20).lean();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

export default router;
