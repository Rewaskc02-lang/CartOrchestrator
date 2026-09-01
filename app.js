import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/healthRoutes.js';
import orderRoutes from './routes/order.js';
import webhookRoutes from './routes/webhook.js';
import chatRoutes from './routes/chat.js';
import configRoutes from './routes/config.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/productRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());

// Request logging middleware for debugging
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;
    const method = req.method;
    const route = req.originalUrl;
    const status = res.statusCode;
    const timestamp = new Date().toISOString();

    // Only log API and webhook routes, not static assets
    if (route.startsWith('/api/') || route.startsWith('/webhook') || route.startsWith('/admin')) {
      console.log(
        `[${timestamp}] ${method} ${route} | Status: ${status} | Duration: ${duration}ms`
      );
    }

    return originalSend.call(this, data);
  };

  next();
});

// Parse JSON while preserving raw body buffer for HMAC webhook signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/config', configRoutes);
app.use('/api/products', productRoutes);
app.use('/admin', adminRoutes);

// 404 Catch-all handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  });
});

export default app;
