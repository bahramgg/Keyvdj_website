/* =============================================================
   OSCILLATOR — the beam

   An oscilloscope in XY mode does not draw a waveform, it draws a
   Lissajous figure: two oscillators at right angles, one on each axis.
   The label is called Oscillator, so the first screen is that — the
   canonical picture of the thing the label is named after.

   Nothing here is a texture or an image. Two sines, a beam that sweeps
   them, and phosphor.

   Three things make it read as a scope rather than as a drawing:

     · the screen is never cleared. Each frame lays a nearly-transparent
       black over the last one, so the beam leaves a decaying trail and
       the brightest part of the figure is wherever it just passed
     · the strokes are additive, so where the trace crosses itself it
       burns toward white instead of just overlapping
     · the frequency ratio drifts. It locks onto a small-integer ratio,
       holds a closed figure for a few seconds, then slides to the next
       one — and everything in between is an open, tumbling curve

   The ratio is on screen at the foot of the page, because a scope with
   no readout is a screensaver.
   ============================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('scope');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ACID = '254, 237, 7';
  var GROUND = '5, 5, 4';        /* --black; the decay has to match it */

  /* the beam */
  var SEGS = 70;                 /* segments drawn per frame */
  var DT = 0.006;                /* radians of sweep per segment */
  var DECAY = 0.075;             /* how fast the phosphor gives up */

  /* Ratios worth landing on. Small integers close into a figure that
     holds still; anything else tumbles, which is what the drift between
     them is for. */
  var RATIOS = [
    [1, 2], [2, 3], [3, 2], [3, 4], [4, 3],
    [5, 4], [5, 3], [1, 3], [4, 5], [5, 6], [2, 1], [7, 5]
  ];

  var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, radius = 0;
  var raf = null, running = false;

  var t = 0;                     /* beam position along the figure */
  var a = 3, b = 2;              /* live frequency ratio */
  var aTo = 3, bTo = 2;          /* where it is heading */
  var phase = 0, phaseRate = 0.055;
  var hold = 0;                  /* frames left before the next ratio */

  /* the pointer nudges the phase, so the figure leans toward the cursor
     without ever being driven by it */
  var lean = 0, leanTo = 0;

  function pickRatio() {
    var next = RATIOS[(Math.random() * RATIOS.length) | 0];
    /* never pick the one already showing, or it looks stuck */
    if (next[0] === aTo && next[1] === bTo) {
      next = RATIOS[(RATIOS.indexOf(next) + 1) % RATIOS.length];
    }
    aTo = next[0];
    bTo = next[1];
    hold = 260 + ((Math.random() * 200) | 0);
  }

  /* ---- sizing ----------------------------------------------------------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    w = rect.width;
    h = rect.height;
    /* the beam is a hairline on black; full device ratio rasterises far
       more than the look needs and the decay fill is per-pixel work */
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = w / 2;
    cy = h * 0.47;               /* sits with the badge, not with the box */
    radius = Math.min(w, h) * 0.42;

    /* a resize wipes the buffer, so lay the ground back down */
    ctx.fillStyle = 'rgb(' + GROUND + ')';
    ctx.fillRect(0, 0, w, h);
    if (reduced.matches) still();
  }

  /* ---- the readout ------------------------------------------------------ */
  var rx = document.getElementById('scope-x');
  var ry = document.getElementById('scope-y');
  var rp = document.getElementById('scope-p');
  var readoutAt = 0;

  function readout(now) {
    if (now - readoutAt < 220) return;   /* four times a second is plenty */
    readoutAt = now;
    if (rx) rx.textContent = a.toFixed(2);
    if (ry) ry.textContent = b.toFixed(2);
    if (rp) rp.textContent = (((phase % 6.28318) + 6.28318) % 6.28318).toFixed(2);
  }

  /* ---- one frame -------------------------------------------------------- */
  function point(k) {
    return [
      cx + Math.sin(a * k + phase + lean) * radius,
      cy + Math.sin(b * k) * radius
    ];
  }

  function sweep(alpha, width) {
    ctx.beginPath();
    var p = point(t);
    ctx.moveTo(p[0], p[1]);
    for (var i = 1; i <= SEGS; i++) {
      p = point(t + i * DT);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = 'rgba(' + ACID + ',' + alpha + ')';
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function frame(now) {
    /* phosphor: never cleared, only dimmed */
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(' + GROUND + ',' + DECAY + ')';
    ctx.fillRect(0, 0, w, h);

    if (--hold <= 0) pickRatio();
    a += (aTo - a) * 0.012;
    b += (bTo - b) * 0.012;
    phase += phaseRate * 0.016;
    lean += (leanTo - lean) * 0.05;

    /* additive, so the crossings burn rather than merely overlap */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    sweep(0.05, 7);              /* bloom */
    sweep(0.12, 3);              /* halo */
    sweep(0.55, 1.2);            /* the beam itself */

    /* No dot marks the head. One was drawn here and it left a speck at
       every frame's position; once the ratio drifted, those specks were
       scattered off the curve the beam is now on and read as dirt. The
       decay already makes the leading edge the brightest part, which is
       what a scope's head actually is. */
    t += SEGS * DT;
    readout(now);
    raf = running ? requestAnimationFrame(frame) : null;
  }

  /* ---- the still ---------------------------------------------------------
     Reduced motion gets one closed figure drawn in full rather than a
     blank box: the same picture, just not sweeping. */
  function still() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgb(' + GROUND + ')';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    a = aTo = 3; b = bTo = 2; phase = Math.PI / 2; lean = 0;
    var whole = SEGS;
    SEGS = Math.ceil(6.28318 / DT);       /* one entire period */
    t = 0;
    sweep(0.05, 7);
    sweep(0.12, 3);
    sweep(0.55, 1.2);
    SEGS = whole;
  }

  function start() {
    if (reduced.matches) { still(); return; }
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---- boot ------------------------------------------------------------- */
  resize();
  pickRatio();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  }, { passive: true });

  /* only run while it is actually on screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0 }).observe(canvas);
  } else {
    start();
  }

  if (!reduced.matches) {
    window.addEventListener('pointermove', function (e) {
      leanTo = ((e.clientX / window.innerWidth) - 0.5) * 1.6;
    }, { passive: true });
  }

  reduced.addEventListener('change', function () {
    if (reduced.matches) { stop(); still(); } else start();
  });
})();
