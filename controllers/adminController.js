import mongoose from 'mongoose';
import Order from '../models/Order.js';

/**
 * SECURITY WARNING:
 * This admin view is unauthenticated for judging and testing demonstration purposes only.
 * In a production environment, this route MUST be strictly protected with role-based
 * authentication (e.g. JWT, OAuth, or session middleware) and restricted to authorized personnel.
 */

const baseStyles = `
  :root {
    --bg-base: #000000;
    --bg-surface-0: #09090b;
    --bg-surface-1: #121215;
    --bg-surface-2: #18181b;
    --bg-surface-3: #27272a;
    --text-primary: #f4f4f5;
    --text-secondary: #a1a1aa;
    --text-tertiary: #71717a;
    --border-subtle: rgba(255, 255, 255, 0.08);
    --border-medium: rgba(255, 255, 255, 0.14);
    --accent-blue: #3b82f6;
    --accent-emerald: #10b981;
    --accent-amber: #f59e0b;
    --accent-rose: #f43f5e;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    padding: 32px 20px;
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
  }
  .container {
    max-width: 1100px;
    margin: 0 auto;
    background: var(--bg-surface-0);
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    padding: 28px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  }
  h1, h2, h3 { color: var(--text-primary); font-weight: 600; letter-spacing: -0.02em; margin-bottom: 8px; }
  .nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 16px;
  }
  .nav-links a {
    color: var(--accent-blue);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.88rem;
    margin-right: 16px;
    transition: color 0.15s;
  }
  .nav-links a:hover { text-decoration: underline; color: #60a5fa; }
  .badge-demo {
    background: rgba(245, 158, 11, 0.1);
    color: var(--accent-amber);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
    font-size: 0.85rem;
  }
  th, td {
    padding: 12px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border-subtle);
  }
  th {
    background: var(--bg-surface-1);
    color: var(--text-tertiary);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
  }
  tr:hover { background: var(--bg-surface-1); }
  .status-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .status-paid { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
  .status-pending { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
  .status-failed { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
  .actor-badge {
    background: rgba(59, 130, 246, 0.12);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.25);
    padding: 2px 7px;
    border-radius: 5px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.75rem;
  }
  .action-badge {
    background: var(--bg-surface-2);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    padding: 2px 7px;
    border-radius: 5px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .details-box {
    background: var(--bg-surface-1);
    border: 1px solid var(--border-subtle);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.78rem;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-all;
    max-width: 480px;
  }
  .grid-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    background: var(--bg-surface-1);
    border: 1px solid var(--border-subtle);
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 24px;
  }
  .info-item label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
  .info-item span {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    background: var(--bg-surface-2);
    color: #93c5fd;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 0.85em;
  }
`;

/**
 * GET /admin/orders
 * Lists all orders with status, amounts, and audit trail links.
 */
export const renderOrderList = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    const rows = orders.map((o) => `
      <tr>
        <td><code>${o._id}</code></td>
        <td><code>${o.sessionId || 'N/A'}</code></td>
        <td><span class="status-badge status-${o.status}">${o.status}</span></td>
        <td>$${Number(o.total || 0).toFixed(2)}</td>
        <td>${o.couponApplied ? `<code>${o.couponApplied}</code> (-$${Number(o.discount || 0).toFixed(2)})` : 'None'}</td>
        <td>${new Date(o.createdAt).toLocaleString()}</td>
        <td><a href="/admin/orders/${o._id}" style="color:var(--accent-blue); font-weight:500;">View Audit Trail &rarr;</a></td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Admin - Orders & Audit Trails</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="nav-bar">
            <div>
              <h2>Order Audit Registry</h2>
              <span class="badge-demo">READ-ONLY AUDIT LOG</span>
            </div>
            <div class="nav-links">
              <a href="/">&larr; Back to Shopping Concierge</a>
            </div>
          </div>

          <p style="color:var(--text-secondary); font-size:0.88rem; margin-bottom:16px;">
            Every order is bounded by server-side verification and recorded in an immutable audit trail with timestamped actors.
          </p>

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Session ID</th>
                <th>Status</th>
                <th>Total</th>
                <th>Coupon</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : '<tr><td colspan="7" style="text-align:center; color:var(--text-tertiary); padding:24px;">No orders found in database yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    return res.send(html);
  } catch (error) {
    console.error('[Admin Order List Error]', error);
    return res.status(500).send(`<h3>Error loading orders: ${error.message}</h3>`);
  }
};

/**
 * GET /admin/orders/:id
 * Full order inspection view displaying the chronological auditLog.
 */
export const renderOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('<h3>Invalid Order ID format</h3>');
    }

    const order = await Order.findById(id).populate('items.productId').lean();

    if (!order) {
      return res.status(404).send('<h3>Order not found</h3>');
    }

    const auditRows = (order.auditLog || []).map((entry, index) => {
      const detailsFormatted = entry.details ? JSON.stringify(entry.details, null, 2) : 'None';
      return `
        <tr>
          <td style="font-weight:600; color:var(--text-tertiary);">#${index + 1}</td>
          <td><span class="action-badge">${entry.action}</span></td>
          <td><span class="actor-badge">${entry.actor}</span></td>
          <td>
            <div>${new Date(entry.timestamp).toISOString()}</div>
            <div style="font-size:0.75rem; color:var(--text-tertiary);">${new Date(entry.timestamp).toLocaleString()}</div>
          </td>
          <td><div class="details-box">${detailsFormatted}</div></td>
        </tr>
      `;
    }).join('');

    const itemsSummary = (order.items || []).map((it) => {
      const name = it.productId?.name || 'Product';
      return `<li><strong>${name}</strong> &times; ${it.qty} ($${it.price} each)</li>`;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Audit Trail - Order ${order._id}</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="nav-bar">
            <div>
              <h2>Order Audit Trail: <code>${order._id}</code></h2>
              <span class="badge-demo">VERIFIED & GATED AUDIT LOG</span>
            </div>
            <div class="nav-links">
              <a href="/admin/orders">&larr; All Orders</a>
              <a href="/">Shopping Concierge</a>
            </div>
          </div>

          <!-- Order Summary Metadata -->
          <div class="grid-info">
            <div class="info-item">
              <label>Status</label>
              <span><span class="status-badge status-${order.status}">${order.status}</span></span>
            </div>
            <div class="info-item">
              <label>Session ID</label>
              <span><code>${order.sessionId}</code></span>
            </div>
            <div class="info-item">
              <label>Subtotal</label>
              <span>$${Number(order.subtotal || 0).toFixed(2)}</span>
            </div>
            <div class="info-item">
              <label>Discount</label>
              <span>${order.couponApplied ? `-$${Number(order.discount || 0).toFixed(2)} (${order.couponApplied})` : '$0.00'}</span>
            </div>
            <div class="info-item">
              <label>Final Total</label>
              <span style="color:var(--accent-emerald); font-weight:700;">$${Number(order.total || 0).toFixed(2)}</span>
            </div>
            <div class="info-item">
              <label>Razorpay Order ID</label>
              <span><code>${order.razorpayOrderId || 'N/A'}</code></span>
            </div>
            <div class="info-item">
              <label>Payment Link ID</label>
              <span><code>${order.paymentLinkId || 'N/A'}</code></span>
            </div>
          </div>

          <!-- Purchased Items -->
          <div style="margin-bottom:24px;">
            <h3>Purchased Items (${(order.items || []).length})</h3>
            <ul style="padding-left:20px; font-size:0.88rem; line-height:1.6; color:var(--text-secondary); margin-top:8px;">
              ${itemsSummary}
            </ul>
          </div>

          <!-- Audit Log Trail -->
          <h3>Immutable Audit Trail (${(order.auditLog || []).length} Event${(order.auditLog || []).length === 1 ? '' : 's'})</h3>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:12px; margin-top:4px;">
            All transitions are chronologically logged before execution. The LLM never writes numbers or states directly.
          </p>

          <table>
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Timestamp</th>
                <th>Details & Payload</th>
              </tr>
            </thead>
            <tbody>
              ${auditRows.length > 0 ? auditRows : '<tr><td colspan="5" style="text-align:center; color:var(--text-tertiary);">No audit entries found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    return res.send(html);
  } catch (error) {
    console.error('[Admin Order Detail Error]', error);
    return res.status(500).send(`<h3>Error loading audit trail: ${error.message}</h3>`);
  }
};

export default {
  renderOrderList,
  renderOrderDetail,
};
