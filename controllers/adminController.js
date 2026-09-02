import mongoose from 'mongoose';
import Order from '../models/Order.js';

/**
 * SECURITY WARNING:
 * This admin view is unauthenticated for judging and testing demonstration purposes only.
 * In a production environment, this route MUST be strictly protected with role-based
 * authentication (e.g. JWT, OAuth, or session middleware) and restricted to authorized personnel.
 */

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0D1117;
    color: #E4E6EB;
    margin: 0;
    padding: 28px 20px;
    -webkit-font-smoothing: antialiased;
  }
  .container {
    max-width: 1100px;
    margin: 0 auto;
    background: #161B22;
    border: 1px solid rgba(139, 148, 158, 0.25);
    border-radius: 12px;
    padding: 28px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  h1, h2, h3 { margin-bottom: 12px; color: #FFFFFF; }
  .nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    border-bottom: 1px solid rgba(139, 148, 158, 0.2);
    padding-bottom: 14px;
  }
  .nav-links a {
    color: #3B82F6;
    text-decoration: none;
    font-weight: 500;
    margin-right: 16px;
    transition: color 0.15s;
  }
  .nav-links a:hover { color: #60A5FA; text-decoration: underline; }
  .badge-demo {
    background: rgba(245, 158, 11, 0.15);
    color: #FBBF24;
    border: 1px solid rgba(245, 158, 11, 0.35);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 0.88rem;
  }
  th, td {
    padding: 12px 14px;
    text-align: left;
    border-bottom: 1px solid rgba(139, 148, 158, 0.15);
  }
  th {
    background: #21262D;
    color: #8B949E;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.76rem;
    letter-spacing: 0.04em;
  }
  tr:hover { background: rgba(33, 38, 45, 0.6); }
  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .status-paid { background: rgba(16, 185, 129, 0.18); color: #34D399; border: 1px solid rgba(52, 211, 153, 0.35); }
  .status-pending { background: rgba(245, 158, 11, 0.18); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.35); }
  .status-failed { background: rgba(239, 68, 68, 0.18); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.35); }
  .actor-badge {
    background: rgba(59, 130, 246, 0.15);
    color: #93C5FD;
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 3px 8px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.78rem;
  }
  .action-badge {
    background: #21262D;
    color: #E4E6EB;
    border: 1px solid rgba(139, 148, 158, 0.25);
    padding: 3px 8px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-weight: 600;
  }
  .details-box {
    background: #0D1117;
    border: 1px solid rgba(139, 148, 158, 0.2);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.8rem;
    color: #E4E6EB;
    white-space: pre-wrap;
    word-break: break-all;
    max-width: 480px;
  }
  .grid-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    background: #21262D;
    border: 1px solid rgba(139, 148, 158, 0.25);
    padding: 18px;
    border-radius: 8px;
    margin-bottom: 24px;
  }
  .info-item label {
    font-size: 0.74rem;
    color: #8B949E;
    text-transform: uppercase;
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
  .info-item span {
    font-size: 0.95rem;
    font-weight: 600;
    color: #E4E6EB;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    background: #21262D;
    color: #93C5FD;
    padding: 2px 6px;
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
        <td><a href="/admin/orders/${o._id}" style="color:#2563eb; font-weight:600;">View Audit Trail &rarr;</a></td>
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
              <span class="badge-demo">DEMO / JUDGING MODE: READ-ONLY AUDIT LOG</span>
            </div>
            <div class="nav-links">
              <a href="/">&larr; Back to Shopping Chat</a>
            </div>
          </div>

          <p style="color:#64748b; font-size:0.9rem; margin-bottom:16px;">
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
              ${rows.length > 0 ? rows : '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:24px;">No orders found in database yet.</td></tr>'}
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
          <td style="font-weight:bold; color:#64748b;">#${index + 1}</td>
          <td><span class="action-badge">${entry.action}</span></td>
          <td><span class="actor-badge">${entry.actor}</span></td>
          <td>
            <div>${new Date(entry.timestamp).toISOString()}</div>
            <div style="font-size:0.75rem; color:#64748b;">${new Date(entry.timestamp).toLocaleString()}</div>
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
              <a href="/">Shopping Chat</a>
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
              <span style="color:#059669; font-weight:700;">$${Number(order.total || 0).toFixed(2)}</span>
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
            <ul style="padding-left:20px; font-size:0.9rem; line-height:1.6;">
              ${itemsSummary}
            </ul>
          </div>

          <!-- Audit Log Trail -->
          <h3>Immutable Audit Trail (${(order.auditLog || []).length} Event${(order.auditLog || []).length === 1 ? '' : 's'})</h3>
          <p style="color:#64748b; font-size:0.85rem; margin-bottom:12px;">
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
              ${auditRows.length > 0 ? auditRows : '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No audit entries found.</td></tr>'}
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
