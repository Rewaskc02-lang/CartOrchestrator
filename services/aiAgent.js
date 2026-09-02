import mongoose from 'mongoose';
import { Type } from '@google/genai';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { processCreateOrder } from '../controllers/orderController.js';

// ==========================================
// Tool Implementations (Deterministic Server Logic)
// ==========================================

/**
 * 1. searchProducts tool
 * Executes MongoDB query against Product collection.
 * Returns structured JSON with real DB pricing & inventory.
 */
export const searchProductsTool = async ({ query, maxPrice, category }) => {
  try {
    const filter = {};

    if (query && typeof query === 'string' && query.trim()) {
      const cleanQuery = query.trim();
      const tokens = cleanQuery
        .split(/\s+/)
        .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((t) => t.length >= 2);

      const orConditions = [
        { name: new RegExp(cleanQuery, 'i') },
        { description: new RegExp(cleanQuery, 'i') },
        { category: new RegExp(cleanQuery, 'i') },
        { sku: new RegExp(cleanQuery, 'i') },
      ];

      // Add individual token regexes for flexible discovery
      for (const token of tokens) {
        const stemmed = token.replace(/(es|s|ing|ed)$/i, '');
        const tokenRegex = new RegExp(stemmed.length >= 3 ? stemmed : token, 'i');
        orConditions.push(
          { name: tokenRegex },
          { description: tokenRegex },
          { category: tokenRegex }
        );
      }

      filter.$or = orConditions;
    }

    if (maxPrice !== undefined && maxPrice !== null && !isNaN(Number(maxPrice))) {
      filter.price = { $lte: Number(maxPrice) };
    }

    if (category && typeof category === 'string' && category.trim()) {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    const products = await Product.find(filter).limit(10).lean();

    const formatted = products.map((p) => ({
      productId: p._id.toString(),
      name: p.name,
      price: p.price,
      stock: p.stock,
      category: p.category,
      sku: p.sku,
      description: p.description,
    }));

    return {
      success: true,
      count: formatted.length,
      products: formatted,
    };
  } catch (error) {
    console.error('[Tool: searchProducts Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to search products',
      products: [],
    };
  }
};

/**
 * 2. applyCoupon tool
 * Validates coupon server-side against current session cart/draft.
 * Returns { success, discount, reason, subtotal, totalAfterDiscount }
 */
export const applyCouponTool = async ({ sessionId, code }) => {
  try {
    if (!sessionId) {
      return { success: false, reason: 'Session ID is required.' };
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return { success: false, reason: 'Coupon code cannot be empty.' };
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Look up session cart
    const cart = await Cart.findOne({ sessionId });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        success: false,
        reason: 'Your shopping cart is currently empty. Please add items to your cart before applying a coupon.',
      };
    }

    // 2. Compute subtotal from DB prices
    let subtotal = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        subtotal += product.price * item.qty;
      }
    }
    subtotal = Number(subtotal.toFixed(2));

    const now = new Date();

    // Helper to fetch active coupons
    const getActiveCoupons = async () => {
      const active = await Coupon.find({
        expiresAt: { $gt: now },
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
      })
        .select('code discountType discountValue minOrderValue')
        .lean();
      return active.map((c) => ({
        code: c.code,
        discount: c.discountType === 'percent' ? `${c.discountValue}% off` : `$${c.discountValue} flat off`,
        minOrder: c.minOrderValue > 0 ? `$${c.minOrderValue}` : 'No minimum',
      }));
    };

    // 3. Validate coupon in DB
    const coupon = await Coupon.findOne({ code: cleanCode });
    if (!coupon) {
      const available = await getActiveCoupons();
      return {
        success: false,
        reason: `Coupon code "${cleanCode}" does not exist.`,
        activeCoupons: available,
      };
    }

    if (coupon.expiresAt < now) {
      const available = await getActiveCoupons();
      return {
        success: false,
        reason: `Coupon "${cleanCode}" expired on ${coupon.expiresAt.toISOString().split('T')[0]}.`,
        activeCoupons: available,
      };
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      const available = await getActiveCoupons();
      return {
        success: false,
        reason: `Coupon "${cleanCode}" has reached its maximum redemption limit (${coupon.usageLimit} uses).`,
        activeCoupons: available,
      };
    }

    if (subtotal < coupon.minOrderValue) {
      const available = await getActiveCoupons();
      return {
        success: false,
        reason: `Coupon "${cleanCode}" requires a minimum order value of $${coupon.minOrderValue}. Current cart subtotal is only $${subtotal}.`,
        activeCoupons: available,
      };
    }

    // 4. Compute discount
    let discount = 0;
    if (coupon.discountType === 'percent') {
      discount = Number(((subtotal * coupon.discountValue) / 100).toFixed(2));
    } else if (coupon.discountType === 'flat') {
      discount = Math.min(subtotal, coupon.discountValue);
    }

    const totalAfterDiscount = Math.max(0, Number((subtotal - discount).toFixed(2)));

    // Save coupon to cart
    cart.couponCode = cleanCode;
    await cart.save();

    return {
      success: true,
      couponCode: cleanCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      subtotal,
      discount,
      totalAfterDiscount,
      message: `Coupon "${cleanCode}" applied successfully. You save $${discount}!`,
    };
  } catch (error) {
    console.error('[Tool: applyCoupon Error]', error);
    return {
      success: false,
      reason: error.message || 'Failed to validate coupon',
    };
  }
};

/**
 * 3. generatePaymentLink tool
 * Reuses server-side processCreateOrder from orderController.
 * Zero-trust: Recomputes subtotal/discount/total directly from DB.
 */
export const generatePaymentLinkTool = async ({ sessionId, items, couponCode }) => {
  try {
    if (!sessionId) {
      return { success: false, reason: 'Session ID is required.' };
    }

    let orderItems = items;
    let couponToUse = couponCode;

    // If items were not directly provided in tool call, pull from Cart draft
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      const cart = await Cart.findOne({ sessionId });
      if (cart && Array.isArray(cart.items) && cart.items.length > 0) {
        orderItems = cart.items.map((it) => ({
          productId: it.productId.toString(),
          qty: it.qty,
        }));
        if (!couponToUse && cart.couponCode) {
          couponToUse = cart.couponCode;
        }
      }
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return {
        success: false,
        reason: 'No items to checkout. Please search for products and specify what you want to buy.',
      };
    }

    // Call shared processCreateOrder
    const result = await processCreateOrder({
      sessionId,
      items: orderItems,
      couponCode: couponToUse,
      actor: 'ai_agent',
    });

    // Clear session cart on successful order creation
    await Cart.deleteOne({ sessionId });

    return {
      success: true,
      orderId: result.order._id.toString(),
      paymentLink: result.paymentLink,
      subtotal: result.subtotal,
      discount: result.discount,
      total: result.total,
      couponApplied: result.order.couponApplied,
      status: result.order.status,
      itemCount: result.validatedItems.length,
      message: `Order created successfully! Total: $${result.total}. Payment link: ${result.paymentLink}`,
    };
  } catch (error) {
    console.error('[Tool: generatePaymentLink Error]', error);
    return {
      success: false,
      reason: error.message || 'Failed to generate payment link',
    };
  }
};

/**
 * 4. Helper Tool: addToCart
 * Lets agent put items in the user session cart draft.
 */
export const addToCartTool = async ({ sessionId, productId, qty = 1 }) => {
  try {
    if (!sessionId) {
      return { success: false, reason: 'Session ID is required.' };
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return { success: false, reason: `Invalid product ID format: "${productId}".` };
    }

    const quantity = Math.max(1, parseInt(qty, 10) || 1);
    const product = await Product.findById(productId);
    if (!product) {
      return { success: false, reason: `Product with ID "${productId}" not found.` };
    }

    if (product.stock < quantity) {
      return {
        success: false,
        reason: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${quantity}.`,
      };
    }

    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (it) => it.productId.toString() === productId.toString()
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].qty += quantity;
    } else {
      cart.items.push({ productId: product._id, qty: quantity });
    }

    await cart.save();

    return {
      success: true,
      productId: product._id.toString(),
      name: product.name,
      price: product.price,
      qty: quantity,
      message: `Added ${quantity}x "${product.name}" ($${product.price} each) to your cart.`,
      cartItemCount: cart.items.reduce((acc, it) => acc + it.qty, 0),
    };
  } catch (error) {
    console.error('[Tool: addToCart Error]', error);
    return { success: false, reason: error.message || 'Failed to add item to cart' };
  }
};

/**
 * 5. getOrderHistory tool
 * Returns all orders for a given session, with summary details.
 * Allows customer to ask "what did I order" or "show my past orders".
 */
export const getOrderHistoryTool = async ({ sessionId }) => {
  try {
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return {
        success: false,
        reason: 'Session ID is required.',
        orders: [],
      };
    }

    const cleanSessionId = sessionId.trim();
    const orders = await Order.find({ sessionId: cleanSessionId })
      .sort({ createdAt: -1 })
      .select('_id items couponApplied subtotal discount total status createdAt updatedAt razorpayOrderId')
      .lean();

    if (!orders || orders.length === 0) {
      return {
        success: true,
        reason: 'You have no order history yet.',
        orderCount: 0,
        orders: [],
      };
    }

    const formattedOrders = orders.map((order) => ({
      orderId: order._id.toString(),
      status: order.status,
      itemCount: order.items.length,
      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        qty: item.qty,
        price: item.price,
        subtotal: Number((item.qty * item.price).toFixed(2)),
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      couponApplied: order.couponApplied || 'None',
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }));

    const orderSummary = formattedOrders
      .map(
        (o) =>
          `Order #${o.orderId.slice(-6)} (${o.status.toUpperCase()}): ${o.itemCount} item(s), Total: $${o.total} (${new Date(o.createdAt).toLocaleDateString()})`
      )
      .join('\n');

    return {
      success: true,
      orderCount: orders.length,
      orders: formattedOrders,
      summary: `You have ${orders.length} order(s):\n${orderSummary}`,
    };
  } catch (error) {
    console.error('[Tool: getOrderHistory Error]', error);
    return {
      success: false,
      reason: error.message || 'Failed to retrieve order history',
      orders: [],
    };
  }
};

// ==========================================
// Gemini Tool Declarations
// ==========================================

export const functionDeclarations = [
  {
    name: 'searchProducts',
    description: 'Search the store inventory catalog for matching footwear, apparel, and accessories. Always search before recommending or buying a product.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Search keywords, product title, category, or style (e.g. "marathon running shoes", "retro sneakers", "insoles")',
        },
        maxPrice: {
          type: Type.NUMBER,
          description: 'Optional maximum price filter',
        },
        category: {
          type: Type.STRING,
          description: 'Optional category filter (e.g. "Running", "Lifestyle", "Trail & Outdoor", "Basketball", "Training", "Athletic", "Accessories")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'addToCart',
    description: 'Adds a product to the user active session shopping cart.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: {
          type: Type.STRING,
          description: 'The MongoDB ObjectId of the product',
        },
        qty: {
          type: Type.INTEGER,
          description: 'Quantity to add (defaults to 1)',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'applyCoupon',
    description: 'Validates and applies a promo coupon code to the session shopping cart. The discount is calculated strictly on the server.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        code: {
          type: Type.STRING,
          description: 'The promo coupon code to apply (e.g. "WELCOME10", "FLAT50", "SPRINT20")',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'generatePaymentLink',
    description: 'Creates a verified server-side order and returns a secure Razorpay payment link. Recomputes all totals from the DB.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          description: 'Optional list of items to checkout directly [ { productId, qty } ]',
          items: {
            type: Type.OBJECT,
            properties: {
              productId: {
                type: Type.STRING,
                description: 'MongoDB ObjectId of the product',
              },
              qty: {
                type: Type.INTEGER,
                description: 'Quantity to purchase (must be >= 1)',
              },
            },
            required: ['productId', 'qty'],
          },
        },
        couponCode: {
          type: Type.STRING,
          description: 'Optional coupon code to apply',
        },
      },
    },
  },
  {
    name: 'getOrderHistory',
    description: 'Retrieves all past orders for the user session. Use this when a customer asks about their order history, past purchases, or what they have ordered.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
];

export const geminiTools = [
  {
    functionDeclarations,
  },
];

// System instruction for the AI shopping assistant
export const SYSTEM_INSTRUCTION = `You are the AI Shopping Agent for a premium footwear and athletic apparel brand.
Your job is to assist customers with discovering products, checking stock, answering questions, managing their cart, applying valid promo coupons, viewing their order history, and completing orders.

CRITICAL RULES YOU MUST STRICTLY FOLLOW:
1. NEVER ask the customer for their session ID or technical credentials. The session is managed automatically by the backend.
2. NEVER hallucinate or invent products, prices, stock levels, or discounts.
3. ALWAYS use the searchProducts tool to look up catalog inventory before suggesting products or completing orders. If a requested product is not found in search results or is out of stock, explicitly inform the customer that it is unavailable and suggest matching in-stock items from the catalog.
4. When a customer asks about their order history, past purchases, or what they've ordered, use the getOrderHistory tool to retrieve and display their orders.
4. NEVER compute money math or calculate final discounts yourself. Always rely on the tool outputs (applyCoupon, generatePaymentLink) as the single source of truth.
5. When a user wants to purchase or checkout:
   - If you need the productId, use searchProducts first.
   - Use addToCart, applyCoupon (if requested), and generatePaymentLink.
   - Present the returned payment link clearly so the customer can click to pay.
6. EXPLAINABLE FAILURE HANDLING: If a coupon fails validation (e.g. expired, redemption limit reached, minimum order value not met, or invalid code):
   - You MUST explicitly tell the user the exact failure reason returned by the tool (e.g. "That coupon expired on January 1, 2024" or "Coupon FLAT50 requires a minimum order value of $200").
   - If the tool provides active coupons, warmly suggest them to the user (e.g. "However, you can use our active coupon WELCOME10 for 10% off!").
   - NEVER silently skip or pretend the coupon worked.
7. Be friendly, concise, and helpful. Format product recommendations with their price, category, and key features.`;

/**
 * Executes a single tool call based on name and arguments.
 */
export const executeToolCall = async (toolName, toolArgs) => {
  switch (toolName) {
    case 'searchProducts':
      return await searchProductsTool(toolArgs);
    case 'applyCoupon':
      return await applyCouponTool(toolArgs);
    case 'generatePaymentLink':
      return await generatePaymentLinkTool(toolArgs);
    case 'addToCart':
      return await addToCartTool(toolArgs);
    case 'getOrderHistory':
      return await getOrderHistoryTool(toolArgs);
    default:
      return { success: false, error: `Unknown tool name: "${toolName}"` };
  }
};

export default {
  searchProductsTool,
  applyCouponTool,
  generatePaymentLinkTool,
  addToCartTool,
  geminiTools,
  SYSTEM_INSTRUCTION,
  executeToolCall,
};
