/**
 * ============================================================================
 * Cinematic Hero Engine - "Physical Product Under Glass" Motion Physics
 * ============================================================================
 */

(function () {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // DOM Elements
  const heroSection = document.getElementById('hero-section');
  const stageContainer = document.getElementById('hero-stage');
  const card3D = document.getElementById('hero-3d-card');
  const sheenLayer = document.getElementById('hero-sheen');
  const ambientGlow = document.getElementById('hero-glow');
  const reflectionWrapper = document.getElementById('hero-reflection');
  const canvas = document.getElementById('ripple-canvas');

  if (!heroSection || !card3D || !sheenLayer) return;

  // ==========================================
  // 1. Physics State & Inertial Tilt Variables
  // ==========================================
  const physics = {
    targetRotateX: 0,
    targetRotateY: 0,
    currentRotateX: 0,
    currentRotateY: 0,
    lerpFactor: 0.09, // Damped inertia (~0.08-0.12)
    maxAngle: 16,     // Maximum rotation degrees
    isHovered: false,
    cursorX: 0,
    cursorY: 0,
  };

  // ==========================================
  // 2. Liquid Ripple Ground Plane Engine (Canvas 2D)
  // ==========================================
  let ctx = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const ripples = [];
  let lastRippleSpawnTime = 0;
  const RIPPLE_THROTTLE_MS = 40;

  if (canvas) {
    ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      canvas.width = Math.floor(canvasWidth * dpr);
      canvas.height = Math.floor(canvasHeight * dpr);
      if (ctx) ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  const spawnRipple = (x, y, isPrimary = false) => {
    if (!ctx || prefersReducedMotion) return;
    ripples.push({
      x,
      y,
      radius: 2,
      maxRadius: isPrimary ? 240 : 160,
      speed: isPrimary ? 2.8 : 2.0,
      alpha: isPrimary ? 0.7 : 0.45,
      decay: isPrimary ? 0.978 : 0.965,
      waveWidth: isPrimary ? 16 : 10,
    });
  };

  // ==========================================
  // 3. Mouse Event Handling (rAF Throttled)
  // ==========================================
  let mouseMovePending = false;
  let lastMouseEvent = null;

  const handlePointerMove = (e) => {
    lastMouseEvent = e;
    if (!mouseMovePending) {
      mouseMovePending = true;
      requestAnimationFrame(() => {
        if (!lastMouseEvent || prefersReducedMotion) {
          mouseMovePending = false;
          return;
        }

        const rect = stageContainer.getBoundingClientRect();
        const clientX = lastMouseEvent.clientX;
        const clientY = lastMouseEvent.clientY;

        // Normalized offset from stage center [-1, 1]
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const normX = Math.max(-1, Math.min(1, (clientX - centerX) / (rect.width / 2)));
        const normY = Math.max(-1, Math.min(1, (clientY - centerY) / (rect.height / 2)));

        // Target 3D rotation angles
        physics.targetRotateY = normX * physics.maxAngle;
        physics.targetRotateX = -normY * physics.maxAngle;
        physics.cursorX = clientX;
        physics.cursorY = clientY;

        // Spawn interactive ripple if cursor is near ground plane
        const now = performance.now();
        if (canvas && now - lastRippleSpawnTime > RIPPLE_THROTTLE_MS) {
          const canvasRect = canvas.getBoundingClientRect();
          if (
            clientX >= canvasRect.left &&
            clientX <= canvasRect.right &&
            clientY >= canvasRect.top - 60 &&
            clientY <= canvasRect.bottom + 40
          ) {
            const rippleX = clientX - canvasRect.left;
            const rippleY = clientY - canvasRect.top;
            spawnRipple(rippleX, rippleY, true);
            lastRippleSpawnTime = now;
          }
        }

        mouseMovePending = false;
      });
    }
  };

  const handlePointerEnter = () => {
    physics.isHovered = true;
  };

  const handlePointerLeave = () => {
    physics.isHovered = false;
    // Decelerate back to rest position
    physics.targetRotateX = 0;
    physics.targetRotateY = 0;
  };

  heroSection.addEventListener('mousemove', handlePointerMove, { passive: true });
  heroSection.addEventListener('mouseenter', handlePointerEnter);
  heroSection.addEventListener('mouseleave', handlePointerLeave);

  // Click on stage spawns a high-energy ripple pulse
  if (stageContainer) {
    stageContainer.addEventListener('click', (e) => {
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const rippleX = e.clientX - canvasRect.left;
        const rippleY = e.clientY - canvasRect.top;
        spawnRipple(rippleX, rippleY, true);
        spawnRipple(rippleX, rippleY + 10, false);
      }
    });
  }

  // ==========================================
  // 4. Main Animation & Render Loop (rAF)
  // ==========================================
  let animationTime = 0;
  let ambientRippleTimer = 0;

  const renderLoop = (timestamp) => {
    if (prefersReducedMotion) return;

    animationTime += 0.016;

    // A. Inertial Damped Tilt Interpolation
    physics.currentRotateX += (physics.targetRotateX - physics.currentRotateX) * physics.lerpFactor;
    physics.currentRotateY += (physics.targetRotateY - physics.currentRotateY) * physics.lerpFactor;

    // Apply 3D Transform
    const rotX = physics.currentRotateX.toFixed(3);
    const rotY = physics.currentRotateY.toFixed(3);
    card3D.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(15px)`;

    // B. Specular Sheen Sweep derived from Tilt Angles
    const sheenNormX = physics.currentRotateY / physics.maxAngle;
    const sheenNormY = -physics.currentRotateX / physics.maxAngle;
    const sheenX = (sheenNormX * 110).toFixed(2);
    const sheenY = (sheenNormY * 110).toFixed(2);
    const tiltMagnitude = Math.hypot(physics.currentRotateX, physics.currentRotateY) / (physics.maxAngle * 1.4);
    const sheenOpacity = (0.18 + Math.min(0.52, tiltMagnitude * 0.45)).toFixed(3);

    sheenLayer.style.transform = `translate3d(calc(-50% + ${sheenX}%), calc(-50% + ${sheenY}%), 0) rotate(22deg)`;
    sheenLayer.style.opacity = sheenOpacity;

    // C. Mirrored Reflection Subtle Wave Displacement
    if (reflectionWrapper) {
      const refShiftX = (physics.currentRotateY * 0.4).toFixed(2);
      reflectionWrapper.style.transform = `translateX(calc(-50% + ${refShiftX}px)) scaleY(-1) skewX(${(physics.currentRotateY * 0.15).toFixed(2)}deg)`;
    }

    // D. Ambient Glow Breathing Cycle (~5.2s period)
    if (ambientGlow) {
      const glowScale = (1.0 + 0.07 * Math.sin(animationTime * 1.2)).toFixed(3);
      const glowOpacity = (0.55 + 0.2 * Math.sin(animationTime * 1.2 + 0.4)).toFixed(3);
      ambientGlow.style.transform = `translate(-50%, -50%) scale(${glowScale})`;
      ambientGlow.style.opacity = glowOpacity;
    }

    // E. Liquid Ground Ripple Canvas Rendering
    if (ctx && canvasWidth > 0 && canvasHeight > 0) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Periodic ambient gentle baseline ripple
      ambientRippleTimer += 0.016;
      if (ambientRippleTimer > 2.8) {
        ambientRippleTimer = 0;
        const centerX = canvasWidth / 2 + (Math.random() - 0.5) * 80;
        const centerY = canvasHeight * 0.45;
        spawnRipple(centerX, centerY, false);
      }

      // Draw all active ripple rings
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha *= r.decay;

        if (r.alpha < 0.01 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        // Concentric wave ring with light refraction gradient
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius * 1.6, r.radius * 0.55, 0, 0, Math.PI * 2);

        // Cyan-electric wave gradient
        const grad = ctx.createRadialGradient(
          r.x, r.y, Math.max(0, (r.radius - r.waveWidth) * 0.55),
          r.x, r.y, r.radius * 1.6
        );
        grad.addColorStop(0, `rgba(56, 189, 248, 0)`);
        grad.addColorStop(0.7, `rgba(56, 189, 248, ${(r.alpha * 0.5).toFixed(3)})`);
        grad.addColorStop(0.9, `rgba(255, 255, 255, ${(r.alpha * 0.75).toFixed(3)})`);
        grad.addColorStop(1, `rgba(37, 99, 235, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1, (r.waveWidth * (1 - r.radius / r.maxRadius)).toFixed(1));
        ctx.stroke();
        ctx.restore();
      }
    }

    requestAnimationFrame(renderLoop);
  };

  // Start Physics Loop
  if (!prefersReducedMotion) {
    requestAnimationFrame(renderLoop);
  }
})();
