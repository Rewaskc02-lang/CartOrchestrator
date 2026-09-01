/**
 * ============================================================================
 * Flow-Field Particle Current & Parallax Tilt Engine
 * ============================================================================
 */

(function () {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // DOM Elements
  const deviceFrame = document.getElementById('hero-device-frame');
  const pipWindow = document.getElementById('hero-pip-window');
  const chatSection = document.getElementById('chat-app');
  const canvas = document.getElementById('flow-canvas');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let canvasWidth = 0;
  let canvasHeight = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Resize canvas to cover the chat concierge section
  const resizeCanvas = () => {
    const targetElem = chatSection || document.body;
    const rect = targetElem.getBoundingClientRect();
    canvasWidth = rect.width || window.innerWidth;
    canvasHeight = rect.height || window.innerHeight;
    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    if (ctx) ctx.scale(dpr, dpr);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ==========================================
  // 1. Flow-Field Particle Simulation Engine
  // ==========================================
  const NUM_PARTICLES = 240;
  const particles = [];

  // Mouse interaction state
  const mouse = {
    x: -9999,
    y: -9999,
    radius: 110,
  };

  // Multi-scale harmonic curl noise flow field
  const getFlowAngle = (x, y, t) => {
    const scale1 = 0.003;
    const scale2 = 0.006;
    const a1 = Math.sin(x * scale1 + t * 0.35) * Math.cos(y * scale1 + t * 0.25) * Math.PI * 2;
    const a2 = Math.sin(y * scale2 - t * 0.15) * Math.cos(x * scale2 + t * 0.4) * Math.PI;
    return a1 + a2 * 0.5;
  };

  class FlowParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * (canvasWidth || window.innerWidth);
      this.y = Math.random() * (canvasHeight || 800);
      this.prevX = this.x;
      this.prevY = this.y;
      this.speed = 1.1 + Math.random() * 1.5;
      this.radius = 0.8 + Math.random() * 1.3;
      this.baseAlpha = 0.25 + Math.random() * 0.5;
      this.alpha = this.baseAlpha;
      this.life = initial ? Math.random() * 320 : 0;
      this.maxLife = 220 + Math.random() * 260;
      // Tone: cyan to electric blue
      this.hue = Math.random() > 0.35 ? 198 : 218; // 198 = cyan (#38bdf8), 218 = blue (#2563eb)
    }

    update(time) {
      this.prevX = this.x;
      this.prevY = this.y;

      let angle = getFlowAngle(this.x, this.y, time);

      // Mouse deflection: bend around cursor
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.hypot(dx, dy);

      if (dist < mouse.radius && dist > 1) {
        const force = (1 - dist / mouse.radius) * 2.4;
        const pushAngle = Math.atan2(dy, dx);
        this.x += Math.cos(pushAngle) * force * 3.5;
        this.y += Math.sin(pushAngle) * force * 3.5;
      }

      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;

      this.life++;

      // Smooth fade in & out
      const lifeRatio = this.life / this.maxLife;
      if (lifeRatio < 0.15) {
        this.alpha = this.baseAlpha * (lifeRatio / 0.15);
      } else if (lifeRatio > 0.8) {
        this.alpha = this.baseAlpha * (1 - (lifeRatio - 0.8) / 0.2);
      }

      // Wrap around bounds or reset
      if (
        this.life > this.maxLife ||
        this.x < -20 ||
        this.x > canvasWidth + 20 ||
        this.y < -20 ||
        this.y > canvasHeight + 20
      ) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = `hsla(${this.hue}, 92%, 65%, ${this.alpha.toFixed(3)})`;
      ctx.lineWidth = this.radius;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Initialize particle pool
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new FlowParticle());
  }

  // ==========================================
  // 2. Mouse Tracking & Deflection Physics
  // ==========================================
  const handleChatPointerMove = (e) => {
    if (!chatSection) return;
    const rect = chatSection.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  };

  const handleChatPointerLeave = () => {
    mouse.x = -9999;
    mouse.y = -9999;
  };

  if (chatSection) {
    chatSection.addEventListener('mousemove', handleChatPointerMove, { passive: true });
    chatSection.addEventListener('mouseleave', handleChatPointerLeave);
  }

  // ==========================================
  // 3. Parallax 3D Tilt on Floating Mockup Window
  // ==========================================
  const tilt = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    maxAngle: 5.0, // 4-6 degrees
    lerp: 0.08,
  };

  if (deviceFrame) {
    deviceFrame.addEventListener('mousemove', (e) => {
      const frameRect = deviceFrame.getBoundingClientRect();
      const centerX = frameRect.left + frameRect.width / 2;
      const centerY = frameRect.top + frameRect.height / 2;
      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (frameRect.width / 2)));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (frameRect.height / 2)));

      tilt.targetY = normX * tilt.maxAngle;
      tilt.targetX = -normY * tilt.maxAngle;
    }, { passive: true });

    deviceFrame.addEventListener('mouseleave', () => {
      tilt.targetX = 0;
      tilt.targetY = 0;
    });
  }

  // ==========================================
  // 4. Main Render Loop & Lifecycle
  // ==========================================
  let isRunning = true;
  let animTime = 0;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!isRunning) {
        isRunning = true;
        requestAnimationFrame(renderLoop);
      }
    } else {
      isRunning = false;
    }
  });

  const renderLoop = () => {
    if (!isRunning) return;

    if (prefersReducedMotion) {
      ctx.fillStyle = '#070a13';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      particles.forEach((p) => p.draw());
      return;
    }

    animTime += 0.008;

    // Fading motion blur trails via low-alpha canvas repaint
    ctx.fillStyle = 'rgba(7, 10, 19, 0.14)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Update and draw particle currents
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.update(animTime);
      p.draw();
    }

    // Parallax 3D Tilt on Picture-in-Picture window
    if (pipWindow) {
      tilt.currentX += (tilt.targetX - tilt.currentX) * tilt.lerp;
      tilt.currentY += (tilt.targetY - tilt.currentY) * tilt.lerp;

      const rotX = tilt.currentX.toFixed(2);
      const rotY = tilt.currentY.toFixed(2);
      pipWindow.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(12px)`;
    }

    requestAnimationFrame(renderLoop);
  };

  requestAnimationFrame(renderLoop);
})();
