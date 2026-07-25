/* =============================================================
   KEYV — signature orbital
   One luminous acid-yellow ring that rotates and drifts over the
   hero subject. Canvas, ~20s loop, DPR-aware, pauses off-screen.
   ============================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('orbital');
  if (!canvas || !canvas.getContext) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ctx = canvas.getContext('2d');

  var ACCENT = '#E5E418';
  var LOOP = 20000;              // ms per full revolution
  var w = 0, h = 0, dpr = 1;
  var rafId = null;
  var visible = true;
  var start = null;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* The ring is an ellipse drawn on a tilted, slowly-precessing plane,
     centred a little above the middle of the frame — roughly where the
     subject's head sits in a portrait crop. */
  function draw(t) {
    var p = (t % LOOP) / LOOP;             // 0 → 1 over the loop
    var a = p * Math.PI * 2;

    var cx = w * 0.5;
    var cy = h * 0.42;
    var base = Math.min(w, h);
    var rx = base * 0.34;
    var ry = base * 0.34 * (0.20 + 0.16 * (1 + Math.sin(a)) / 2); // breathing tilt
    var tilt = -0.22 + Math.sin(a * 0.5) * 0.12;                  // slow precession

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    // soft outer glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(229, 228, 24, 0.16)';
    ctx.lineWidth = 6;
    ctx.filter = 'blur(6px)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, Math.max(ry, 2), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.filter = 'none';

    // the line itself
    ctx.strokeStyle = 'rgba(229, 228, 24, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, Math.max(ry, 2), 0, 0, Math.PI * 2);
    ctx.stroke();

    // travelling highlight — a bright head riding the orbit
    var hx = Math.cos(a) * rx;
    var hy = Math.sin(a) * Math.max(ry, 2);
    var reach = base * 0.035;
    var glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, reach);
    glow.addColorStop(0, 'rgba(229, 228, 24, 0.55)');
    glow.addColorStop(1, 'rgba(229, 228, 24, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hx, hy, reach, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function frame(now) {
    if (start === null) start = now;
    draw(now - start);
    rafId = requestAnimationFrame(frame);
  }

  function play() {
    if (rafId !== null || reduced.matches) return;
    rafId = requestAnimationFrame(frame);
  }

  function pause() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function apply() {
    resize();
    if (reduced.matches) {
      pause();
      draw(LOOP * 0.12);   // one static, pleasant frame
    } else if (visible) {
      play();
    }
  }

  /* stop burning frames once the hero scrolls away */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { play(); } else { pause(); }
    }, { threshold: 0 }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pause(); } else if (visible) { play(); }
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 150);
  }, { passive: true });

  if (reduced.addEventListener) {
    reduced.addEventListener('change', apply);
  } else if (reduced.addListener) {
    reduced.addListener(apply);
  }

  apply();
})();
