/**
 * ============================================================================
 * Cinematic Flow-Field Particle Current & Parallax Tilt Engine
 * ============================================================================
 */

(function () {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // DOM Elements
  const heroSection = document.getElementById('hero-section');
  const deviceFrame = document.getElementById('hero-device-frame');
  const pipWindow = document.getElementById('hero-pip-window');
  const canvas = document.getElementById('flow-canvas');

  if (!canvas || !deviceFrame) return;

  const ctx = canvas.getContext('2d');
  let canvasWidth = 0;
  let canvasHeight = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Resize canvas to match frame
  const resizeCanvas = () => {
    const rect = deviceFrame.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    if (ctx) ctx.scale(dpr, dpr);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ==========================================
  // 1. Flow-Field Particle Simulation Engine
  // ==========================================
  const NUM_PARTICLES = 220;
  const particles = [];

  // Mouse interaction state
  const mouse = {
    x: -9999,
    y: -9999,
    radius: 90,
  };

  // Lightweight inline 2D Noise / Vector Field Generator
  const getFlowAngle = (x, y, t) => {
    // Multi-scale harmonic curl field
    const scale1 = 0.0035;
    const scale2 = 0.007;
    const a1 = Math.sin(x * scale1 + t * 0.4) * Math.cos(y * scale1 + t * 0.3) * Math.PI * 2;
    const a2 = Math.sin(y * scale2 - t * 0.2) * Math.cos(x * scale2 + t * 0.5) * Math.PI;
    return a1 + a2 * 0.5;
  };

  class FlowParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * (canvasWidth || 800);
      this.y = Math.random() * (canvasHeight || 500);
      this.prevX = this.x;
      this.prevY = this.y;
      this.speed = 1.2 + Math.random() * 1.6;
      this.radius = 0.8 + Math.random() * 1.4;
      this.baseAlpha = 0.25 + Math.random() * 0.55;
      this.alpha = this.baseAlpha;
      this.life = initial ? Math.random() * 300 : 0;
      this.maxLife = 200 + Math.random() * 250;
      // Tone: cyan to cobalt blue
      this.hue = Math.random() > 0.4 ? 198 : 218; // 198 = cyan (#38bdf8), 218 = blue (#2563eb)
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
        const force = (1 - dist / mouse.radius) * 2.2;
        const pushAngle = Math.atan2(dy, dx);
        this.x += Math.cos(pushAngle) * force * 3;
        this.y += Math.sin(pushAngle) * force * 3;
      }

      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;

      this.life++;

      // Fade in and out over lifetime
      const lifeRatio = this.life / this.maxLife;
      if (lifeRatio < 0.15) {
        this.alpha = this.baseAlpha * (lifeRatio / 0.15);
      } else if (lifeRatio > 0.8) {
        this.alpha = this.baseAlpha * (1 - (lifeRatio - 0.8) / 0.2);
      }

      // Wrap around bounds or reset on end of life
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
      ctx.strokeStyle = `hsla(${this.hue}, 90%, 65%, ${this.alpha.toFixed(3)})`;
      ctx.lineWidth = this.radius;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Initialize particles
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new FlowParticle());
  }

  // ==========================================
  // 2. Parallax 3D Tilt on Floating Window
  // ==========================================
  const tilt = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    maxAngle: 5.5, // Subtle 4-6 degrees
    lerp: 0.08,    // Damped inertia
  };

  const handlePointerMove = (e) => {
    const frameRect = deviceFrame.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Track mouse position relative to canvas
    mouse.x = clientX - frameRect.left;
    mouse.y = clientY - frameRect.top;

    // Compute normalized coordinates [-1, 1] for 3D tilt
    const centerX = frameRect.left + frameRect.width / 2;
    const centerY = frameRect.top + frameRect.height / 2;
    const normX = Math.max(-1, Math.min(1, (clientX - centerX) / (frameRect.width / 2)));
    const normY = Math.max(-1, Math.min(1, (clientY - centerY) / (frameRect.height / 2)));

    tilt.targetY = normX * tilt.maxAngle;
    tilt.targetX = -normY * tilt.maxAngle;
  };

  const handlePointerLeave = () => {
    mouse.x = -9999;
    mouse.y = -9999;
    tilt.targetX = 0;
    tilt.targetY = 0;
  };

  deviceFrame.addEventListener('mousemove', handlePointerMove, { passive: true });
  deviceFrame.addEventListener('mouseleave', handlePointerLeave);

  // ==========================================
  // 3. Animation Loop & Visibility Lifecycle
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
      // Draw single clean static background and stop
      ctx.fillStyle = '#070a13';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      particles.forEach((p) => p.draw());
      return;
    }

    animTime += 0.008;

    // A. Soft fading trails (motion blur via low-alpha repaint)
    ctx.fillStyle = 'rgba(7, 10, 19, 0.14)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // B. Update and render particle flow
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.update(animTime);
      p.draw();
    }

    // C. Damped 3D Parallax Tilt on Picture-in-Picture window
    if (pipWindow) {
      tilt.currentX += (tilt.targetX - tilt.currentX) * tilt.lerp;
      tilt.currentY += (tilt.targetY - tilt.currentY) * tilt.lerp;

      const rotX = tilt.currentX.toFixed(2);
      const rotY = tilt.currentY.toFixed(2);
      pipWindow.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(12px)`;
    }

    requestAnimationFrame(renderLoop);
  };

  // Start Animation
  requestAnimationFrame(renderLoop);
})();
