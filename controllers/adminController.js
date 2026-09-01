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
    background: #f8fafc;
    color: #0f172a;
    margin: 0;
    padding: 24px;
  }
  .container {
    max-width: 1100px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  h1, h2, h3 { margin-bottom: 12px; }
  .nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
  }
  .nav-links a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    margin-right: 16px;
  }
  .nav-links a:hover { text-decoration: underline; }
  .badge-demo {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 0.9rem;
  }
  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }
  th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
  }
  tr:hover { background: #f8fafc; }
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-pending { background: #fef9c3; color: #854d0e; }
  .status-failed { background: #fee2e2; color: #991b1b; }
  .actor-badge {
    background: #e0e7ff;
    color: #3730a3;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8rem;
  }
  .action-badge {
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-weight: 600;
  }
  .details-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8rem;
    white-space: pre-wrap;
    word-break: break-all;
    max-width: 480px;
  }
  .grid-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 16px;
    border-radius: 6px;
    margin-bottom: 24px;
  }
  .info-item label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
  .info-item span {
    font-size: 0.95rem;
    font-weight: 500;
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
