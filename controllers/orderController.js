import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import razorpayInstance from '../config/razorpay.js';

/**
 * Core server-side order creation service reusable across HTTP endpoints and AI tools.
 * Zero trust in client/LLM-sent prices.
 */
export const processCreateOrder = async ({ sessionId, items, couponCode, actor = 'system' }) => {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    const err = new Error('A valid sessionId string is required.');
    err.statusCode = 400;
    err.code = 'ValidationError';
    throw err;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Order items array cannot be empty.');
    err.statusCode = 400;
    err.code = 'ValidationError';
    throw err;
  }

  // Server-side price calculation & stock verification
  let calculatedSubtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
      const err = new Error(`Invalid product ID format: ${item.productId}`);
      err.statusCode = 400;
      err.code = 'InvalidProduct';
      throw err;
    }

    const qty = parseInt(item.qty, 10);
    if (isNaN(qty) || qty < 1) {
      const err = new Error(`Quantity for product ${item.productId} must be an integer >= 1.`);
      err.statusCode = 400;
      err.code = 'InvalidQuantity';
      throw err;
    }

    // Fetch fresh product from DB
    const product = await Product.findById(item.productId);
    if (!product) {
      const err = new Error(`Product with ID "${item.productId}" was not found.`);
      err.statusCode = 404;
      err.code = 'ProductNotFound';
      throw err;
    }

    if (product.stock < qty) {
      const err = new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${qty}.`);
      err.statusCode = 400;
      err.code = 'OutOfStock';
      throw err;
    }

    const itemTotal = Number((product.price * qty).toFixed(2));
    calculatedSubtotal += itemTotal;

    validatedItems.push({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      qty,
      price: product.price,
    });
  }

  const subtotal = Number(calculatedSubtotal.toFixed(2));
  let discount = 0;
  let appliedCoupon = null;

  // Server-side coupon validation
  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      const err = new Error(`Coupon code "${cleanCode}" is invalid.`);
      err.statusCode = 400;
      err.code = 'InvalidCoupon';
      throw err;
    }

    const now = new Date();
    if (coupon.expiresAt < now) {
      const err = new Error(`Coupon "${cleanCode}" expired on ${coupon.expiresAt.toISOString().split('T')[0]}.`);
      err.statusCode = 400;
      err.code = 'CouponExpired';
      throw err;
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      const err = new Error(`Coupon "${cleanCode}" has reached its maximum allowed redemptions (${coupon.usageLimit}).`);
      err.statusCode = 400;
      err.code = 'CouponLimitReached';
      throw err;
    }

    if (subtotal < coupon.minOrderValue) {
      const err = new Error(`Coupon "${cleanCode}" requires a minimum order value of $${coupon.minOrderValue}. Current subtotal: $${subtotal}.`);
      err.statusCode = 400;
      err.code = 'MinOrderValueNotMet';
      throw err;
    }

    // Compute discount
    if (coupon.discountType === 'percent') {
      discount = Number(((subtotal * coupon.discountValue) / 100).toFixed(2));
    } else if (coupon.discountType === 'flat') {
      discount = Math.min(subtotal, coupon.discountValue);
    }

    appliedCoupon = cleanCode;
  }

  const total = Math.max(0, Number((subtotal - discount).toFixed(2)));
  const amountInPaise = Math.round(total * 100);

  // Create Razorpay Order via SDK
  let rzpOrder;
  try {
    rzpOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now().toString().slice(-8)}`,
      notes: {
        sessionId,
        itemCount: validatedItems.length.toString(),
      },
    });
  } catch (rzpErr) {
    console.error('[Razorpay Order Error]', rzpErr);
    const err = new Error(rzpErr.error?.description || rzpErr.message || 'Failed to create Razorpay Order');
    err.statusCode = 502;
    err.code = 'RazorpayOrderCreationFailed';
    throw err;
  }

  // Create Razorpay Payment Link via SDK
  let rzpPaymentLink;
  try {
    rzpPaymentLink = await razorpayInstance.paymentLink.create({
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      description: `Order payment for session ${sessionId.slice(0, 8)}`,
      customer: {
        name: `Shopper ${sessionId.slice(0, 8)}`,
        email: `shopper_${sessionId.slice(0, 6)}@example.com`,
        contact: '+919876543210',
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        sessionId,
        razorpayOrderId: rzpOrder.id,
      },
    });
  } catch (linkErr) {
    console.error('[Razorpay Payment Link Error]', linkErr);
    const err = new Error(linkErr.error?.description || linkErr.message || 'Failed to create Razorpay Payment Link');
    err.statusCode = 502;
    err.code = 'RazorpayPaymentLinkCreationFailed';
    throw err;
  }

  // Save Order document in MongoDB with initial audit log
  const order = new Order({
    sessionId: sessionId.trim(),
    items: validatedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price,
    })),
    couponApplied: appliedCoupon,
    subtotal,
    discount,
    total,
    razorpayOrderId: rzpOrder.id,
    paymentLinkId: rzpPaymentLink.id,
    status: 'pending',
    auditLog: [
      {
        action: 'order_created',
        actor,
        timestamp: new Date(),
        details: {
          subtotal,
          discount,
          total,
          couponApplied: appliedCoupon,
          razorpayOrderId: rzpOrder.id,
          paymentLinkId: rzpPaymentLink.id,
          paymentUrl: rzpPaymentLink.short_url,
        },
      },
    ],
  });

  await order.save();

  return {
    order,
    paymentLink: rzpPaymentLink.short_url,
    subtotal,
    discount,
    total,
    validatedItems,
  };
};

/**
 * POST /api/order
 */
export const createOrder = async (req, res) => {
  try {
    const { sessionId, items, couponCode } = req.body;
    const result = await processCreateOrder({
      sessionId,
      items,
      couponCode,
      actor: 'system',
    });

    return res.status(201).json({
      success: true,
      order: {
        id: result.order._id,
        sessionId: result.order.sessionId,
        items: result.validatedItems,
        subtotal: result.order.subtotal,
        discount: result.order.discount,
        total: result.order.total,
        couponApplied: result.order.couponApplied,
        razorpayOrderId: result.order.razorpayOrderId,
        paymentLinkId: result.order.paymentLinkId,
        paymentLink: result.paymentLink,
        status: result.order.status,
        createdAt: result.order.createdAt,
      },
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    return res.status(error.statusCode || 500).json({
      error: error.code || 'OrderCreationError',
      message: error.message || 'An unexpected error occurred during order creation.',
    });
  }
};

/**
 * POST /webhook/razorpay
 * Verifies Razorpay webhook HMAC signature and updates order status & audit log.
 */
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      console.warn('[Webhook Warning] Missing x-razorpay-signature header');
      return res.status(400).json({
        error: 'SignatureMissing',
        message: 'Missing x-razorpay-signature in request headers.',
      });
    }

    if (!webhookSecret) {
      console.error('[Webhook Error] RAZORPAY_WEBHOOK_SECRET is not configured in .env');
      return res.status(500).json({
        error: 'WebhookSecretMissing',
        message: 'Server webhook secret is unconfigured.',
      });
    }

    // Extract raw body string for cryptographic HMAC verification
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    const isSignatureValid = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
    if (!isSignatureValid) {
      console.warn('[Webhook Warning] Invalid webhook signature detected');
      return res.status(400).json({
        error: 'InvalidSignature',
        message: 'Webhook signature verification failed.',
      });
    }

    const { event, payload } = req.body;
    console.log(`[Webhook Received] Event: ${event}`);

    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;
    const paymentLinkEntity = payload?.payment_link?.entity;

    // Identify target order
    const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
    const rzpPaymentLinkId = paymentLinkEntity?.id || paymentEntity?.notes?.paymentLinkId;

    const query = {
      $or: [
        ...(rzpOrderId ? [{ razorpayOrderId: rzpOrderId }] : []),
        ...(rzpPaymentLinkId ? [{ paymentLinkId: rzpPaymentLinkId }] : []),
      ],
    };

    if (query.$or.length === 0) {
      console.warn('[Webhook Warning] Could not identify Razorpay Order ID or Payment Link ID in payload');
      return res.status(200).json({ status: 'ignored', reason: 'No matching identifiers in payload' });
    }

    const order = await Order.findOne(query);
    if (!order) {
      console.warn(`[Webhook Warning] No matching order found for query:`, query);
      return res.status(200).json({ status: 'ignored', reason: 'Order not found in database' });
    }

    const now = new Date();

    // Event: payment.captured or payment_link.paid or order.paid
    if (event === 'payment.captured' || event === 'payment_link.paid' || event === 'order.paid') {
      if (order.status === 'paid') {
        console.log(`[Webhook] Order ${order._id} is already marked as paid. Ignoring duplicate event.`);
        return res.status(200).json({ status: 'ok', message: 'Order already paid' });
      }

      order.status = 'paid';

      order.auditLog.push({
        action: 'payment_captured',
        actor: 'razorpay_webhook',
        timestamp: now,
        details: {
          event,
          paymentId: paymentEntity?.id,
          amount: paymentEntity?.amount ? paymentEntity.amount / 100 : order.total,
          method: paymentEntity?.method,
          email: paymentEntity?.email,
          contact: paymentEntity?.contact,
        },
      });

      // Deduct inventory stock for ordered items
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.qty },
        });
      }

      // Increment coupon usedCount if coupon was applied
      if (order.couponApplied) {
        await Coupon.findOneAndUpdate(
          { code: order.couponApplied },
          { $inc: { usedCount: 1 } }
        );
      }

      await order.save();
      console.log(`[Webhook] Order ${order._id} successfully marked as PAID.`);
      return res.status(200).json({ status: 'ok', orderId: order._id, orderStatus: 'paid' });
    }

    // Event: payment.failed
    if (event === 'payment.failed') {
      order.status = 'failed';
      order.auditLog.push({
        action: 'payment_failed',
        actor: 'razorpay_webhook',
        timestamp: now,
        details: {
          event,
          paymentId: paymentEntity?.id,
          errorCode: paymentEntity?.error_code,
          errorDescription: paymentEntity?.error_description,
          errorSource: paymentEntity?.error_source,
          errorStep: paymentEntity?.error_step,
          errorReason: paymentEntity?.error_reason,
        },
      });

      await order.save();
      console.log(`[Webhook] Order ${order._id} updated with payment failure.`);
      return res.status(200).json({ status: 'ok', orderId: order._id, orderStatus: 'failed' });
    }

    // Other events
    order.auditLog.push({
      action: `event_${event.replace(/\./g, '_')}`,
      actor: 'razorpay_webhook',
      timestamp: now,
      details: { event, payloadSummary: { paymentId: paymentEntity?.id } },
    });
    await order.save();

    return res.status(200).json({ status: 'ok', message: `Recorded event ${event}` });
  } catch (error) {
    console.error('[Webhook Handler Error]', error);
    return res.status(500).json({
      error: 'WebhookProcessingError',
      message: error.message || 'An error occurred while processing the webhook.',
    });
  }
};

/**
 * GET /api/order/:id
 * Fetches order details with populated product metadata and full audit trail.
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'InvalidOrderId',
        message: `"${id}" is not a valid MongoDB ObjectId.`,
      });
    }

    const order = await Order.findById(id).populate('items.productId', 'name sku category price');

    if (!order) {
      return res.status(404).json({
        error: 'OrderNotFound',
        message: `Order with ID "${id}" was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[Get Order Error]', error);
    return res.status(500).json({
      error: 'FetchOrderError',
      message: error.message || 'An error occurred while fetching order details.',
    });
  }
};

export default {
  processCreateOrder,
  createOrder,
  handleWebhook,
  getOrderById,
};