/**
 * AI Shopping Agent - Frontend Client Logic
 */

// ==========================================
// 1. Session Management
// ==========================================

const getSessionId = () => {
  let sessionId = localStorage.getItem('ai_agent_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem('ai_agent_session_id', sessionId);
  }
  return sessionId;
};

const updateSessionBadge = () => {
  const badge = document.getElementById('session-badge');
  const sid = getSessionId();
  if (badge) {
    badge.textContent = `ID: ${sid.slice(0, 14)}...`;
    badge.title = `Full Session ID: ${sid}`;
  }
};

const resetSession = () => {
  localStorage.removeItem('ai_agent_session_id');
  const newSid = getSessionId();
  updateSessionBadge();
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify({ type: 'set_session', sessionId: newSid }));
  }
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.innerHTML = `
      <div class="message-row assistant">
        <div class="message-bubble">
          <p>Fresh conversation started! How can I help you find the right shoes or apparel today?</p>
          <div class="quick-prompts">
            <button class="chip" data-prompt="Show me running shoes under $180">Running shoes under $180</button>
            <button class="chip" data-prompt="I want to buy AeroGlide with coupon WELCOME10">Buy AeroGlide with 10% coupon</button>
            <button class="chip" data-prompt="What promo coupons are available?">Available coupons</button>
          </div>
        </div>
      </div>
    `;
  }
};

// ==========================================
// 2. UI Helpers & Message Rendering
// ==========================================

const scrollToBottom = () => {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
};

const setInputState = (isLoading) => {
  const input = document.getElementById('message-input');
  const btn = document.getElementById('send-btn');
  const typingIndicator = document.getElementById('typing-indicator');

  if (input) input.disabled = isLoading;
  if (btn) btn.disabled = isLoading;

  if (typingIndicator) {
    if (isLoading) {
      typingIndicator.classList.remove('hidden');
    } else {
      typingIndicator.classList.add('hidden');
    }
  }

  if (!isLoading && input) {
    input.focus();
  }
  scrollToBottom();
};

const appendUserMessage = (text) => {
  const chatMessages = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = 'message-row user';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  scrollToBottom();
};

const appendAssistantMessage = (replyText, data = {}) => {
  const chatMessages = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = 'message-row assistant';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Format markdown bold and line breaks safely
  const formattedText = escapeHtml(replyText)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

  const p = document.createElement('p');
  p.innerHTML = formattedText;
  bubble.appendChild(p);

  // 1. Render Inline Product Cards if available
  if (data.products && Array.isArray(data.products) && data.products.length > 0) {
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';

    data.products.forEach((prod) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div>
          <div class="product-card-header">
            <span class="product-title">${escapeHtml(prod.name)}</span>
            <span class="product-price">$${Number(prod.price).toFixed(2)}</span>
          </div>
          <p class="product-desc">${escapeHtml(prod.description || '')}</p>
        </div>
        <div>
          <div class="product-meta">
            <span class="product-tag">${escapeHtml(prod.category || 'General')}</span>
            <span class="product-stock">${prod.stock > 0 ? `In Stock (${prod.stock})` : 'Out of Stock'}</span>
          </div>
          <div class="product-actions">
            <button class="btn-card-secondary btn-add-cart" data-name="${escapeHtml(prod.name)}">Add to Cart</button>
            <button class="btn-card-primary btn-buy-now" data-name="${escapeHtml(prod.name)}">Buy Now</button>
          </div>
        </div>
      `;
      productsGrid.appendChild(card);
    });

    bubble.appendChild(productsGrid);
  }

  // 2. Render Checkout Card if payment link & order ID are present
  if (data.paymentLink && data.orderId) {
    const checkoutBox = document.createElement('div');
    checkoutBox.className = 'checkout-card';
    checkoutBox.innerHTML = `
      <div class="checkout-card-header">Order Ready for Checkout</div>
      <p style="font-size: 0.85rem; color: #166534;">Click below to launch the Razorpay Checkout modal or open the direct payment link.</p>
      <div class="checkout-actions">
        <button class="btn-pay-rzp" data-order-id="${data.orderId}" data-payment-link="${data.paymentLink}">
          💳 Pay via Razorpay Modal
        </button>
        <a href="${data.paymentLink}" target="_blank" rel="noopener noreferrer" class="btn-link-fallback">
          Open Link ↗
        </a>
      </div>
    `;
    bubble.appendChild(checkoutBox);

    // Auto-trigger Razorpay modal
    setTimeout(() => {
      openRazorpayCheckout(data.orderId, data.paymentLink);
    }, 500);
  }

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  scrollToBottom();
};

const appendErrorBubble = (errorMessage) => {
  const chatMessages = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = 'message-row assistant';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble alert-error';
  bubble.textContent = `⚠️ ${errorMessage}`;

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  scrollToBottom();
};

const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ==========================================
// 3. Razorpay Checkout Integration
// ==========================================

let cachedKeyId = null;

const getRazorpayKeyId = async () => {
  if (cachedKeyId) return cachedKeyId;
  try {
    const res = await fetch('/api/config/razorpay');
    const data = await res.json();
    cachedKeyId = data.keyId;
    return cachedKeyId;
  } catch (err) {
    console.error('Failed to load Razorpay config:', err);
    return null;
  }
};

const openRazorpayCheckout = async (orderId, paymentLink) => {
  try {
    const keyId = await getRazorpayKeyId();
    if (!keyId || keyId.includes('placeholder')) {
      console.warn('Razorpay test key is not configured yet.');
      return;
    }

    // Fetch order metadata from /api/order/:id
    const orderRes = await fetch(`/api/order/${orderId}`);
    if (!orderRes.ok) {
      console.warn('Could not fetch order details for modal.');
      return;
    }

    const { order } = await orderRes.json();
    if (!order) return;

    if (typeof window.Razorpay === 'undefined') {
      console.warn('Razorpay SDK script is still loading or unavailable.');
      return;
    }

    const options = {
      key: keyId,
      amount: Math.round(order.total * 100),
      currency: 'INR',
      name: 'AI Shopping Store',
      description: `Order #${order._id.slice(-6)}`,
      order_id: order.razorpayOrderId,
      handler: function (response) {
        console.log('[Razorpay Payment Success]', response);
        // Show success alert in chat
        const chatMessages = document.getElementById('chat-messages');
        const row = document.createElement('div');
        row.className = 'message-row assistant';
        row.innerHTML = `
          <div class="message-bubble alert-success">
            <strong>✅ Payment Successful!</strong><br/>
            Payment ID: <code>${response.razorpay_payment_id}</code><br/>
            Order total of $${order.total} has been confirmed. Thank you for your purchase!
          </div>
        `;
        chatMessages.appendChild(row);
        scrollToBottom();
      },
      modal: {
        ondismiss: function () {
          console.log('[Razorpay Modal Dismissed]');
          const chatMessages = document.getElementById('chat-messages');
          const row = document.createElement('div');
          row.className = 'message-row assistant';
          row.innerHTML = `
            <div class="message-bubble alert-warning">
              ℹ️ Payment was not completed. You can click <strong>"Pay via Razorpay"</strong> above anytime to resume checkout or continue shopping!
            </div>
          `;
          chatMessages.appendChild(row);
          scrollToBottom();
        },
      },
      theme: {
        color: '#0f172a',
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      console.error('[Razorpay Payment Failed]', response.error);
      const chatMessages = document.getElementById('chat-messages');
      const row = document.createElement('div');
      row.className = 'message-row assistant';
      row.innerHTML = `
        <div class="message-bubble alert-error">
          ❌ Payment failed: ${response.error.description || 'Transaction declined'}
        </div>
      `;
      chatMessages.appendChild(row);
      scrollToBottom();
    });

    rzp.open();
  } catch (error) {
    console.error('Error launching Razorpay modal:', error);
  }
};

// ==========================================
// 4. Global Real-time WebSocket Client
// ==========================================

let wsClient = null;
let wsReconnectTimer = null;

const initWebSocket = () => {
  const sid = getSessionId();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${encodeURIComponent(sid)}`;

  try {
    wsClient = new WebSocket(wsUrl);

    wsClient.onopen = () => {
      console.log('[WebSocket] Connected to global real-time agent socket.');
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }
    };

    wsClient.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'tool_executing') {
          const typingText = document.querySelector('.typing-text');
          if (typingText && payload.message) {
            typingText.textContent = payload.message;
          }
        } else if (payload.type === 'chat_response') {
          setInputState(false);
          const typingText = document.querySelector('.typing-text');
          if (typingText) typingText.textContent = 'Agent is thinking...';
          appendAssistantMessage(payload.reply, payload.data || {});
        } else if (payload.type === 'error') {
          setInputState(false);
          appendErrorBubble(payload.message || 'An error occurred.');
        }
      } catch (err) {
        console.warn('[WS Message Parse Error]', err);
      }
    };

    wsClient.onclose = () => {
      console.log('[WebSocket] Connection closed. Attempting reconnect in 2s...');
      if (!wsReconnectTimer) {
        wsReconnectTimer = setTimeout(initWebSocket, 2000);
      }
    };

    wsClient.onerror = (err) => {
      console.warn('[WebSocket Error]', err);
    };
  } catch (e) {
    console.warn('[WebSocket Init Error]', e);
  }
};

const sendMessage = async (userMessage) => {
  if (!userMessage || !userMessage.trim()) return;

  const text = userMessage.trim();
  appendUserMessage(text);
  setInputState(true);

  const sessionId = getSessionId();

  // 1. If WebSocket is active, send via fast WebSocket
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'chat_message',
        sessionId,
        message: text,
      })
    );
    return;
  }

  // 2. HTTP Fallback if WebSocket is connecting or offline
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message: text,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errMsg = result.message || result.error || 'Server returned an error. Please try again.';
      appendErrorBubble(errMsg);
    } else {
      appendAssistantMessage(result.reply, result.data);
    }
  } catch (error) {
    console.error('Network Error:', error);
    appendErrorBubble('Network connection error. Please ensure the backend server is running.');
  } finally {
    setInputState(false);
  }
};

// ==========================================
// 5. Event Listeners Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  updateSessionBadge();
  initWebSocket();

  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const resetBtn = document.getElementById('reset-session-btn');
  const chatMessages = document.getElementById('chat-messages');

  // Submit Handler
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = messageInput.value;
      messageInput.value = '';
      sendMessage(text);
    });
  }

  // Reset Session
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSession);
  }

  // Click delegation for quick prompt chips, card buttons & pay modal buttons
  if (chatMessages) {
    chatMessages.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) sendMessage(prompt);
        return;
      }

      const addBtn = e.target.closest('.btn-add-cart');
      if (addBtn) {
        const name = addBtn.getAttribute('data-name');
        if (name) sendMessage(`Add 1 pair of "${name}" to my cart`);
        return;
      }

      const buyBtn = e.target.closest('.btn-buy-now');
      if (buyBtn) {
        const name = buyBtn.getAttribute('data-name');
        if (name) sendMessage(`I want to buy 1 pair of "${name}"`);
        return;
      }

      const payBtn = e.target.closest('.btn-pay-rzp');
      if (payBtn) {
        const orderId = payBtn.getAttribute('data-order-id');
        const paymentLink = payBtn.getAttribute('data-payment-link');
        if (orderId) openRazorpayCheckout(orderId, paymentLink);
        return;
      }
    });
  }
});
