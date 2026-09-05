# Autonomous AI Commerce Concierge & Cart Orchestrator

An enterprise-grade, zero-trust autonomous AI shopping engine powered by **Google Gemini Tool-Calling (`@google/genai`)**, **Node.js/Express**, **MongoDB (Mongoose)**, and **Razorpay Payment Gateway**.

Designed with **Nutlope Hallmark** minimalist principles and featuring a **Skiper-15 3D isometric preloader**, precision vector branding, real-time WebSocket communication, and an immutable cryptographic audit registry.

---

## 📑 Table of Contents
- [System Architecture & Flow](#-system-architecture--flow)
- [Key Architectural Pillars](#-key-architectural-pillars)
- [UI/UX & Hallmark Design System](#-uiux--hallmark-design-system)
- [Available AI Tools (Server-Gated)](#-available-ai-tools-server-gated)
- [Interactive Demos & Guardrail Verifications](#-interactive-demos--guardrail-verifications)
- [API & Route Reference](#-api--route-reference)
- [Setup & Quickstart Guide](#-setup--quickstart-guide)
- [Security & Production Hardening](#-security--production-hardening)
- [Audit Registry & Observability](#-audit-registry--observability)

---

## 🏛 System Architecture & Flow

```
+-------------------------------------------------------------------------+
|                  MINIMALIST FRONTEND (HTML5 / CSS / JS)                 |
|  - Skiper-15 3D Preloader  - Flow-Field Particle Canvas                 |
|  - Name Authentication     - Razorpay Modal Checkout SDK                |
+------------------------------------+------------------------------------+
                                     |
                          WebSocket / REST API
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        EXPRESS BACKEND ENGINE                           |
|  - Rate Limiter (Per-Session & Global)                                  |
|  - Real-Time WebSocket Session Dispatcher                               |
|  - Request Logger & Security Headers                                    |
+------------------------------------+------------------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
+-----------------------------+               +-----------------------------+
|    GEMINI LLM ENGINE        |               |   ZERO-TRUST TOOL RUNTIME   |
| - Natural Language Parser   |  Tool Calls   | - searchProducts            |
| - Parameter Intent Extractor| ------------> | - applyCoupon               |
| - Strict Function Calling   | <------------ | - generatePaymentLink       |
+-----------------------------+  Tool Results | - addToCart                 |
                                              | - getOrderHistory           |
                                              +--------------+--------------+
                                                             |
                                           +-----------------+-----------------+
                                           |                                   |
                                           v                                   v
                            +-----------------------------+     +-----------------------------+
                            |       MONGODB ATLAS         |     |      RAZORPAY GATEWAY       |
                            | - Products (Atomic Stock)   |     | - Order Creation API        |
                            | - Coupons (Date & Caps)     |     | - Payment Link Webhooks     |
                            | - Immutable Audit Logs      |     | - HMAC SHA-256 Signatures   |
                            +-----------------------------+     +-----------------------------+
```

---

## 🛡 Key Architectural Pillars

### 1. Zero-Trust Server AI Gating
- The LLM **never** touches raw database queries, **never** calculates discounts or totals, and **never** creates Razorpay orders directly.
- All monetary calculations, stock deductions, coupon validation checks, and payment links are computed deterministically on the server via MongoDB snapshots.

### 2. Immutable Cryptographic Audit Registry
- Every transition in an order's lifecycle is logged into an immutable `auditLog` with:
  - **Timestamp**: High-precision ISO datetime.
  - **Actor**: `system`, `razorpay_webhook`, `ai_agent`, or `customer`.
  - **Action**: `order_created`, `payment_captured`, `payment_failed`, `coupon_applied`.
  - **Payload**: Cryptographic parameters, price breakdowns, Razorpay order IDs, and webhook signatures.

### 3. Dual-Mode Razorpay Integration
- **Interactive In-App Modal**: Built with Razorpay Checkout JS SDK for immediate in-chat completion.
- **Direct Payment Links**: Generates hosted Razorpay fallback URLs for multi-device checkout.
- **HMAC SHA-256 Webhook**: Webhook endpoint verifies signatures, decrements stock atomically, and records payments idempotently.

---

## 🎨 UI/UX & Hallmark Design System

The frontend is built according to **Nutlope Hallmark** design principles and inspired by **Skiper UI (skiper15)**:

- **Zero "AI Slop"**: No cartoonish emojis (`👋`, `🏃`, `🛡️`, `💳`, `⚡`), no generic rainbow gradients, and no cluttered marketing wrappers.
- **Standard Vector Assets**: Official **Razorpay geometric vector logo**, Geist SVG glyphs, and standard security badges.
- **Skiper-15 3D Isometric Preloader**: Pure CSS 3D rotating wireframe isometric cube with electric blue perspective highlights.
- **Monochrome Dark Palette**:
  - Base: `#000000` & `#09090b`
  - Surfaces: `#121215`, `#18181b`, `#27272a`
  - Accents: Sapphire Electric Blue (`#3b82f6`) and Emerald (`#10b981`)
- **Name-Based Authentication**:
  - Quick sign-in modal with local persistence.
  - Personalized top navigation bar, avatar pill, and dynamic dashboard greetings (*"Welcome, [Name]"*).

---

## ⚙️ Available AI Tools (Server-Gated)

| Tool Name | Purpose | Server Validation & Guardrails |
|---|---|---|
| `searchProducts` | Query catalog by text, category, or price cap | Fuzzy matching, price filtering, stock availability check |
| `applyCoupon` | Apply promotional discounts to session cart | Expiration date check, minimum order value, usage limit per customer |
| `addToCart` | Add items and quantities to active session | Live inventory check, stock cap enforcement |
| `generatePaymentLink` | Create verified Razorpay order & checkout card | Atomic price recalculation from DB, creates Razorpay Order API payload |
| `getOrderHistory` | Retrieve customer's past orders | Queries verified orders by active `sessionId` |

---

## 🧪 Interactive Demos & Guardrail Verifications

Test these realistic scenarios directly in the chat interface at [`http://localhost:5001`](http://localhost:5001):

### Demo 1: Expired Coupon Guardrail
- **User Prompt**:
  > *"I want to buy 1 pair of AeroGlide with coupon EXPIRED50"*
- **Observed Behavior**:
  - The server verifies `EXPIRED50` and discovers its expiration date (`2024-01-01`).
  - Assistant responds with clear, explainable feedback and recommends active coupons like `SPRINT20` (20% off) or `WELCOME10` (10% off).
  - Discount is **strictly rejected**; the system never guesses or hallucinates.

### Demo 2: Minimum Order Threshold
- **User Prompt**:
  > *"Add SpeedLace Elastic Laces to my cart and use coupon FLAT50"*
- **Observed Behavior**:
  - Tool calculates the subtotal ($14.99), whereas `FLAT50` requires a $200 minimum order.
  - Assistant explains the threshold restriction and provides current cart balance.

### Demo 3: Out-of-Stock Catalog Fallback
- **User Prompt**:
  > *"Do you have Quantum Levitation Sneaker 3000?"*
- **Observed Behavior**:
  - Tool returns 0 matches.
  - Assistant politely explains the item is unavailable and suggests real database footwear items.

### Demo 4: End-to-End Razorpay Checkout
- **User Prompt**:
  > *"Show me running shoes under $180 and buy the first one with coupon SPRINT20"*
- **Observed Behavior**:
  - Shows product card, applies 20% discount, generates verified order, and launches the Razorpay payment modal.

---

## 🔌 API & Route Reference

### Client & Agent Endpoints
- `GET /` — Minimalist UI/UX with 3D preloader, chat concierge, and top navigation
- `POST /api/chat` — Multi-turn Gemini Tool-Calling agent with session rate limiting
- `POST /api/order` — Deterministic order generation & Razorpay payment link dispatch
- `GET /api/order/:id` — JSON order details with chronological audit log

### Payment & Webhook Endpoints
- `POST /webhook/razorpay` — HMAC SHA-256 verified webhook listener
- `POST /api/webhook/razorpay` — Alias webhook route for external proxy compatibility
- `GET /api/config/razorpay` — Returns public Razorpay Key ID for client modal SDK

### Observability & Administration
- `GET /admin/orders` — Read-only Order Registry displaying all transactions
- `GET /admin/orders/:id` — Human-readable Order Audit Trail inspection page
- `GET /health` — Service & MongoDB connectivity status check

---

## 🚀 Setup & Quickstart Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- **Razorpay Account** (Test Mode credentials)
- **Google Gemini API Key**

### 2. Installation
```bash
git clone <repository_url>
cd Razor
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/ai_shopping_agent
RAZORPAY_KEY_ID=rzp_test_YourKeyId
RAZORPAY_KEY_SECRET=YourKeySecret
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecret
GEMINI_API_KEY=YourGeminiApiKey
```

### 4. Seed Inventory & Coupons
Populate 18 verified footwear products and test coupons:
```bash
npm run seed
```

### 5. Run the Application
```bash
# Development (with nodemon auto-reload)
npm run dev

# Production
npm start
```
Open **`http://localhost:5001`** in your browser.

### 6. Run Automated Tests
```bash
npm test
```

---

## 🔒 Security & Production Hardening

- **HMAC-SHA256 Webhook Verification**: Rejects tampered, unsigned, or forged webhook requests (`400 SignatureMissing` / `400 SignatureInvalid`).
- **Session & Global Rate Limiting**:
  - 10 requests per minute per chat session.
  - 100 requests per minute global firewall.
- **Idempotent Inventory Decrements**: Webhook delivery retries will never decrement inventory twice for the same transaction.
- **Zero Raw LLM DB Writes**: The LLM output is parsed, validated, and executed strictly through deterministic controller schemas.

---

## 📊 Audit Registry & Observability

Judges and evaluators can monitor all agent decisions and financial transactions in real time:

1. Click **"Audit Trail"** in the top navigation or chat header.
2. Open [`http://localhost:5001/admin/orders`](http://localhost:5001/admin/orders) for the overview registry.
3. Drill down into any individual order (e.g. [`http://localhost:5001/admin/orders/:id`](http://localhost:5001/admin/orders/)) to inspect the chronological timeline of actions, actors, timestamps, and payload snapshots.

---

## 🛠 Project Scripts

| Command | Action |
|---|---|
| `npm start` | Launches production server |
| `npm run dev` | Launches dev server with live hot reload |
| `npm test` | Runs the automated test suite (`node --test`) |
| `npm run seed` | Seeds catalog items and promo codes |
| `npm run reset-demo` | Clears transactions and re-seeds fresh data in seconds |
| `node test-local-webhook.js` | Simulates a Razorpay `payment.captured` webhook payload |
