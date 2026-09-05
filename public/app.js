/**
 * AI Shopping Agent - Frontend Client Logic
 * Hallmark & Skiper Minimalist Architecture with Personalized Auth
 */

// ==========================================
// 1. User Authentication (Name-Based Login)
// ==========================================

const getUserName = () => {
  return localStorage.getItem('ai_agent_user_name') || '';
};

const setUserName = (name) => {
  if (name && name.trim()) {
    localStorage.setItem('ai_agent_user_name', name.trim());
  } else {
    localStorage.removeItem('ai_agent_user_name');
  }
  updateUserUI();
};

const updateUserUI = () => {
  const userName = getUserName();
  const navContainer = document.getElementById('nav-user-container');
  const chatUserPill = document.getElementById('chat-user-pill');
  const chatUserAvatar = document.getElementById('chat-user-avatar');
  const chatUserName = document.getElementById('chat-user-name');
  const dashboardHeading = document.getElementById('dashboard-heading');
  const dashboardSubheading = document.getElementById('dashboard-subheading');

  if (userName) {
    const initial = userName.charAt(0).toUpperCase();

    // 1. Top Nav User Badge
    if (navContainer) {
      navContainer.innerHTML = `
        <div class="user-profile-badge">
          <span class="user-avatar">${escapeHtml(initial)}</span>
          <span class="user-display-name">${escapeHtml(userName)}</span>
          <button id="logout-btn" class="user-logout-btn" title="Sign out / Switch user">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          setUserName('');
          renderInitialWelcome();
        });
      }
    }

    // 2. Chat Header User Pill
    if (chatUserPill) {
      chatUserPill.classList.remove('hidden');
      if (chatUserAvatar) chatUserAvatar.textContent = initial;
      if (chatUserName) chatUserName.textContent = userName;
    }

    // 3. Dashboard Heading
    if (dashboardHeading) {
      dashboardHeading.textContent = `Welcome, ${userName}`;
    }
    if (dashboardSubheading) {
      dashboardSubheading.textContent = 'Personalized Session Active';
    }
  } else {
    // Guest State
    if (navContainer) {
      navContainer.innerHTML = `
        <button id="nav-signin-btn" class="btn-auth-signin">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Sign In</span>
        </button>
      `;
      const signinBtn = document.getElementById('nav-signin-btn');
      if (signinBtn) {
        signinBtn.addEventListener('click', openLoginModal);
      }
    }

    if (chatUserPill) {
      chatUserPill.classList.add('hidden');
    }

    if (dashboardHeading) {
      dashboardHeading.textContent = 'AI Commerce Concierge';
    }
    if (dashboardSubheading) {
      dashboardSubheading.textContent = 'Online • Tool-Calling Active';
    }
  }
};

const openLoginModal = () => {
  const modal = document.getElementById('login-modal');
  const input = document.getElementById('user-name-input');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (input) {
      input.value = getUserName();
      setTimeout(() => input.focus(), 100);
    }
  }
};

const closeLoginModal = () => {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
};

// ==========================================
// 2. Skiper-15 Preloader Dismissal
// ==========================================
window.addEventListener('load', () => {
  const preloader = document.getElementById('skiper-preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('fade-out');
      setTimeout(() => {
        preloader.remove();
      }, 500);
    }, 600);
  }
});

// ==========================================
// 3. Session Management
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

const renderInitialWelcome = () => {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const userName = getUserName();
  const greeting = userName
    ? `Welcome back, <strong>${escapeHtml(userName)}</strong>. Your personalized commerce session is active.<br/>I search verified catalog inventory, apply promotional coupons with zero-trust validation, and generate secure Razorpay checkouts.`
    : `<strong>Welcome to the Autonomous Commerce Concierge.</strong><br/>I search verified inventory, evaluate promotional coupons with server-side validation, and generate secure Razorpay checkouts.`;

  chatMessages.innerHTML = `
    <div class="message-row assistant">
      <div class="message-bubble">
        <p>${greeting}</p>
        <div class="quick-prompts">
          <button class="chip" data-prompt="Show me running shoes under $180">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Running shoes under $180</span>
          </button>
          <button class="chip" data-prompt="I want to buy AeroGlide with coupon WELCOME10">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            <span>Buy AeroGlide with 10% coupon</span>
          </button>
          <button class="chip" data-prompt="I want to buy AeroGlide with coupon EXPIRED50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Guardrail Test: Expired coupon</span>
          </button>
          <button class="chip" data-prompt="What promo coupons are available?">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <span>Available promo coupons</span>
          </button>
        </div>
      </div>
    </div>
  `;
};

const resetSession = () => {
  localStorage.removeItem('ai_agent_session_id');
  const newSid = getSessionId();
  updateSessionBadge();
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify({ type: 'set_session', sessionId: newSid }));
  }
  renderInitialWelcome();
};

// ==========================================
// 4. UI Helpers & Message Rendering
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
      <div class="checkout-card-header">
        <div class="checkout-rzp-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 19.5h5.5l1.8-3.5h5.4l1.8 3.5H22L12 2zm0 5.8l2.6 5.2h-5.2L12 7.8z"/>
          </svg>
          <strong>Razorpay Verified Checkout</strong>
        </div>
        <span class="checkout-verified-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Server Verified
        </span>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
        Order #${escapeHtml(data.orderId.slice(-8))}. Zero-trust cryptographic validation complete.
      </p>
      <div class="checkout-actions">
        <button class="btn-pay-rzp" data-order-id="${data.orderId}" data-payment-link="${data.paymentLink}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Pay via Razorpay Modal</span>
        </button>
        <a href="${data.paymentLink}" target="_blank" rel="noopener noreferrer" class="btn-link-fallback">
          <span>Direct Link</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>
    `;
    bubble.appendChild(checkoutBox);

    // Auto-trigger Razorpay modal after brief render
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
  bubble.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <span>${escapeHtml(errorMessage)}</span>
  `;

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
// 5. Razorpay Checkout Integration
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
      name: 'Autonomous AI Commerce',
      description: `Order #${order._id.slice(-6)}`,
      order_id: order.razorpayOrderId,
      handler: function (response) {
        console.log('[Razorpay Payment Success]', response);
        const chatMessages = document.getElementById('chat-messages');
        const row = document.createElement('div');
        row.className = 'message-row assistant';
        row.innerHTML = `
          <div class="message-bubble alert-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <div>
              <strong>Payment Successful</strong><br/>
              Payment ID: <code>${response.razorpay_payment_id}</code><br/>
              Order total of $${order.total} confirmed.
            </div>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Payment modal closed. You can click <strong>"Pay via Razorpay Modal"</strong> anytime to complete the purchase.</span>
            </div>
          `;
          chatMessages.appendChild(row);
          scrollToBottom();
        },
      },
      theme: {
        color: '#0052cc',
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>Payment failed: ${response.error.description || 'Transaction declined'}</span>
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
// 6. Global Real-time WebSocket Client
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
          if (typingText) typingText.textContent = 'Agent is processing...';
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
// 7. Event Listeners Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  updateSessionBadge();
  updateUserUI();
  renderInitialWelcome();
  initWebSocket();

  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const resetBtn = document.getElementById('reset-session-btn');
  const chatMessages = document.getElementById('chat-messages');

  // Login Modal Events
  const loginForm = document.getElementById('login-form');
  const userNameInput = document.getElementById('user-name-input');
  const closeLoginBtn = document.getElementById('close-login-btn');
  const loginModal = document.getElementById('login-modal');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredName = userNameInput ? userNameInput.value : '';
      if (enteredName && enteredName.trim()) {
        setUserName(enteredName.trim());
        closeLoginModal();
        renderInitialWelcome();
      }
    });
  }

  if (closeLoginBtn) {
    closeLoginBtn.addEventListener('click', closeLoginModal);
  }

  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        closeLoginModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLoginModal();
    }
  });

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = messageInput.value;
      messageInput.value = '';
      sendMessage(text);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetSession);
  }

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
