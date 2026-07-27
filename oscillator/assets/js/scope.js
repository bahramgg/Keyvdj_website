/* =============================================================
   OSCILLATOR — the lines

   Three lines that wander down the whole site.

   This was a Lissajous figure before, which was wrong twice over. A
   Lissajous is amplitude times a sine on both axes, so it can only ever
   live inside a box in the middle of the screen; and it was painted on
   a canvas fixed to the window, so it sat still while the page moved
   under it. Boxed, and stuck to the glass.

   So there is no figure and no centre now. Each line is a function of
   how far down the document you are —

       x = f(y)

   — evaluated across whatever slice of the document is on screen. That
   makes them continuous over the entire page: scroll and you travel
   along them, because they belong to the document rather than to the
   viewport. They are infinite and hold no state; nothing is remembered
   between frames, which is also why scrolling can never smear them.

   f is two sines of very different wavelength added together: a long
   one that carries the line across the full width, and a short one that
   stops it being a plain wave. The phase creeps, so the whole set
   drifts upward slowly — about half a minute for one pass.
   ============================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('scope');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ACID = '254, 237, 7';

  /* Three, at different weights, so the set reads as composed rather
     than as a machine's output. Wavelengths are in document pixels:
     `long` carries a line across the page, `short` roughens it.
     `sway` is the fraction of the viewport width it swings through. */
  var LINES = [
    { long: 1180, short: 337, sway: 0.40, rough: 0.15, at: 0.50, seed: 0.0, lit: 0.34 },
    { long:  860, short: 271, sway: 0.32, rough: 0.11, at: 0.34, seed: 2.1, lit: 0.20 },
    { long: 1490, short: 419, sway: 0.28, rough: 0.09, at: 0.68, seed: 4.3, lit: 0.14 }
  ];

  var STEP = 14;                 /* document px between samples */
  var DRIFT = 0.0042;            /* radians of phase per frame */
  var OVER = 120;                /* sampled past both edges, so no line
                                    ends in mid-air at the fold */

  var w = 0, h = 0, dpr = 1;
  var raf = null, running = false;
  var phase = 0;

  /* the pointer leans the lines, without ever driving them */
  var lean = 0, leanTo = 0;

  /* ---- sizing ----------------------------------------------------------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw();
  }

  /* ---- the readout ------------------------------------------------------ */
  var rx = document.getElementById('scope-x');
  var ry = document.getElementById('scope-y');
  var rp = document.getElementById('scope-p');
  var readoutAt = 0;

  function readout(now) {
    if (now - readoutAt < 240) return;   /* four times a second is plenty */
    readoutAt = now;
    if (rx) rx.textContent = LINES[0].long;
    if (ry) ry.textContent = LINES[0].short;
    if (rp) rp.textContent = (((phase % 6.28318) + 6.28318) % 6.28318).toFixed(2);
  }

  /* ---- one line ---------------------------------------------------------
     Drawn three times: a wide faint pass for the bloom, a middle one for
     the halo, and the line itself. Cheaper than a blur filter and it is
     the only way the glow survives without costing the frame. */
  function trace(line, top, bottom, top0, alpha, width) {
    var longK = 6.28318 / line.long;
    var shortK = 6.28318 / line.short;
    var swing = w * line.sway;
    var rough = w * line.rough;
    var mid = w * line.at;

    ctx.beginPath();
    for (var y = top; y <= bottom; y += STEP) {
      var x = mid
        + Math.sin(y * longK + line.seed + phase + lean) * swing
        + Math.sin(y * shortK + line.seed * 1.7 - phase * 0.55) * rough;
      var screenY = y - top0;
      if (y === top) ctx.moveTo(x, screenY);
      else ctx.lineTo(x, screenY);
    }
    ctx.strokeStyle = 'rgba(' + ACID + ',' + alpha + ')';
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function scrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* The slice of the document that is on screen. `from` is snapped to
       the sample grid so the samples sit at fixed document positions and
       the curve does not shimmer as it scrolls; the offset used to put
       it back on screen has to be the true scroll position, not the
       snapped one, or the lines would step instead of glide. */
    var y0 = scrollTop();
    var from = Math.floor((y0 - OVER) / STEP) * STEP;
    var to = y0 + h + OVER;

    for (var i = 0; i < LINES.length; i++) {
      var line = LINES[i];
      trace(line, from, to, y0, line.lit * 0.09, 7);
      trace(line, from, to, y0, line.lit * 0.26, 3);
      trace(line, from, to, y0, line.lit, 1.1);
    }
  }

  function frame(now) {
    phase += DRIFT;
    lean += (leanTo - lean) * 0.04;
    draw();
    readout(now);
    raf = running ? requestAnimationFrame(frame) : null;
  }

  function start() {
    if (reduced.matches) { draw(); return; }
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---- boot ------------------------------------------------------------- */
  resize();
  start();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  }, { passive: true });

  /* Standing still, the lines are anchored to the document, so a reduced
     motion visitor still has to see them move past as they scroll — this
     is the only redraw they get. */
  var pending = false;
  window.addEventListener('scroll', function () {
    if (running || pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; draw(); });
  }, { passive: true });

  if (!reduced.matches) {
    window.addEventListener('pointermove', function (e) {
      leanTo = ((e.clientX / window.innerWidth) - 0.5) * 0.7;
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  reduced.addEventListener('change', function () {
    if (reduced.matches) { stop(); draw(); } else start();
  });
})();
