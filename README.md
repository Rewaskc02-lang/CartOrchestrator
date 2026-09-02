# AI Shopping Agent - Backend, Razorpay & LLM Agent Integration

Node.js + Express backend with MongoDB (Mongoose) data layer, Razorpay test-mode payment integration, and an autonomous AI shopping agent powered by Google Gemini API tool-calling (`@google/genai`).

---

## 🏆 Judging Deliverables

### 1. Where the Audit Trail Lives & How to View It
- **Order Registry Overview**: Navigate to [`http://localhost:5001/admin/orders`](http://localhost:5001/admin/orders) to view all processed orders, their current lifecycle status (`pending`, `paid`, `failed`), monetary totals, and applied coupons.
- **Detailed Audit Trail View**: Click on any order or navigate to [`http://localhost:5001/admin/orders/:id`](http://localhost:5001/admin/orders/6a962dd20b2007e79fe47c5d) to inspect the complete, timestamped, chronological `auditLog` table showing:
  - **Action**: `order_created`, `payment_captured`, `payment_failed`
  - **Actor**: `system`, `razorpay_webhook`, `ai_agent`
  - **Timestamp**: Precise ISO timestamp and local datetime
  - **Details**: Exact cryptographic and monetary payloads (subtotals, discounts, Razorpay IDs, webhook events)
- *Note for Judges*: You can also click the **"📋 Audit Trail"** button in the chat interface header at [`http://localhost:5001/`](http://localhost:5001/) to jump directly to this view. *(Demo mode: unauthenticated for local evaluation).*

---

### 2. Deliberate Failure Demos & How to Trigger Them

During live judge evaluation, type these exact messages into the chat interface at [`http://localhost:5001/`](http://localhost:5001/) or send via `curl`:

#### Demo A: Expired Coupon Failure (Explainable Rejection & Active Alternatives)
- **What to type**:
  > *"I want to add 1 pair of AeroGlide to my cart and apply coupon EXPIRED50"*
- **Expected Outcome**:
  - The tool deterministically checks the database and flags that `EXPIRED50` expired on `2024-01-01`.
  - The assistant explicitly and honestly tells the user:
    > *"Unfortunately, coupon EXPIRED50 could not be applied because it expired on January 1, 2024. However, you can use our active coupon SPRINT20 (20% off) or WELCOME10 (10% off) instead!"*
  - The system **never** hallucinates a discount, never papers over the failure, and never guesses.

#### Demo B: Minimum Order Value Rejection
- **What to type**:
  > *"I want to add 1 SpeedLace Elastic No-Tie Lock Laces to my cart and use coupon code FLAT50"*
- **Expected Outcome**:
  - The tool calculates that the item is $14.99, while `FLAT50` requires a $200 minimum order.
  - The assistant explains the threshold clearly:
    > *"Coupon FLAT50 requires a minimum order value of $200. Your current cart subtotal is $14.99."*

#### Demo C: Out-of-Stock / Non-Existent Product
- **What to type**:
  > *"Can I buy the Quantum Levitation Sneaker 3000?"*
- **Expected Outcome**:
  - The `searchProducts` tool queries MongoDB and returns 0 matches.
  - The assistant politely informs the customer that the item is unavailable and offers real in-stock recommendations from the catalog.

---

### 3. Guardrail Architecture Explanation

> **Explainable, Bounded, and Gated AI**: The LLM acts purely as a natural language interface that requests actions via strictly typed, named tools (`searchProducts`, `applyCoupon`, `generatePaymentLink`, `addToCart`). The LLM **never** possesses raw database write access and **never** communicates with Razorpay directly. All monetary calculations, inventory checks, coupon constraints, and payment link creations execute deterministically on the server via MongoDB snapshots. Crucially, every state transition and order-touching action is validated and chronologically logged into an immutable `auditLog` before and after execution, ensuring full traceability and zero-trust operation.

---

## 1. Setup & Environment Configuration

### Install Dependencies
```bash
npm install
```

### Configure Environment Variables
Ensure `.env` contains your MongoDB URI, Razorpay test credentials, and Gemini API key:
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/ai_shopping_agent
RAZORPAY_KEY_ID=rzp_test_YourKeyId
RAZORPAY_KEY_SECRET=YourKeySecret
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecret
GEMINI_API_KEY=YourGeminiApiKey
```

### Seed Database
Populate 18 realistic footwear & apparel items and promo coupons (including demo expired and capped coupons):
```bash
npm run seed
```

### Run Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### Access Frontend Chat Widget
Open your browser at:
👉 **`http://localhost:5001/`**

---

## 2. API Endpoints Reference

- `GET /` — Frontend chat application
- `POST /api/chat` — Multi-turn AI Agent endpoint with function calling
- `POST /api/order` — Server-side order & Razorpay payment link generation
- `GET /api/order/:id` — JSON order & audit trail inspection
- `POST /webhook/razorpay` — HMAC SHA256 verified payment webhook handler
- `GET /admin/orders` — Read-only Admin Order Registry
- `GET /admin/orders/:id` — Human-readable Order Audit Trail inspection page
- `GET /health` — Service & database health check

---

## 3. Webhook Simulation (`POST /webhook/razorpay`)

Simulate an incoming Razorpay `payment.captured` event locally:
```bash
node test-local-webhook.js
```

---

## 4. Demo Management

### Reset Demo to Clean State
Between demo runs, reset all transactional data (orders, conversations, carts) while re-seeding fresh Products and Coupons:
```bash
npm run reset-demo
```

---

## 5. Enhanced Features (Post-Testing)

### ✨ New Features Added
- **Request Logging Middleware**: All API requests logged with method, route, status, and duration for real-time debugging during demo
- **Rate Limiting on `/api/chat`**: Per-session (10 req/min) and global (100 req/min) limits prevent runaway LLM costs
- **Order History Tool**: Users can ask "What did I order?" — new 5th AI tool `getOrderHistory` retrieves all past orders
- **Demo Reset Script**: `npm run reset-demo` clears transactional data and re-seeds Products/Coupons in 10 seconds

### 🔒 Security Audit Results
- ✅ Webhook HMAC-SHA256 signature verification rejects tampered payloads (tested with invalid signatures)
- ✅ Input validation on all endpoints (missing sessionId, empty message, invalid items, non-existent coupons)
- ✅ API keys read from environment only (never hardcoded or logged)
- ✅ Stock decrement is idempotent (webhook retries won't double-decrement)
- ✅ Coupon usage counts increment only on confirmed payment (not on link generation)

### 📋 Test Report
See [TEST_REPORT.md](./TEST_REPORT.md) for comprehensive testing results, security audit, and verification of all guardrails.
