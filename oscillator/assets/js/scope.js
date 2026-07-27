/* =============================================================
   OSCILLATOR — the beam

   An oscilloscope in XY mode does not draw a waveform, it draws a
   Lissajous figure: two oscillators at right angles, one on each axis.
   The label is named after the thing, so this is the picture of it.

   Nothing here is a texture or an image. Two sines, a beam that sweeps
   them, and phosphor:

     · the screen is never cleared. Each frame lays a nearly-transparent
       black over the last, so the beam leaves a decaying trail and the
       brightest part is wherever it just passed
     · the strokes are additive, so where the trace crosses itself it
       burns toward white instead of merely overlapping
     · the ratio drifts. It locks onto a small integer ratio, holds a
       closed figure a while, then slides to the next — and everything
       between is an open, tumbling curve

   ---- why it is not in a box ----------------------------------------

   A figure reads as boxed when you can see where it stops. The first
   version used one radius for both axes and kept it well inside the
   window, so its bounding square was plainly visible and it sat in the
   middle of the screen like a picture hung on a wall.

   Two changes, and there is no frame to see:

     · the amplitudes are larger than the window and set per axis, so
       the curve runs off all four edges. You only ever see the part of
       it that is passing through
     · the centre is never still. It drifts on its own slow cycle and is
       pushed further by the scroll position, so the figure wanders the
       page instead of orbiting one point

   The trail is drawn in screen space, so when the centre moves the old
   trace fades where it was rather than following. That is what a scope
   does when the signal moves, and it is why this is left alone.
   ============================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('scope');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ACID = '254, 237, 7';
  var GROUND = '5, 5, 4';        /* --black; the decay has to match it */

  /* Slow, and a short enough tail that it reads as one line being drawn
     rather than as a ball of wire. */
  var SEGS = 12;                 /* segments drawn per frame */
  var DT = 0.0035;               /* radians of sweep per segment */
  var DECAY = 0.016;             /* how fast the phosphor gives up */

  /* Amplitudes and centre drift, both as a fraction of the window.

     These are not picked by eye: the amplitude has to beat the worst
     case the centre can drift to, or the figure keeps one edge inside
     the window and that edge is the box. On x the centre reaches
     0.5 ± 0.22, so an amplitude of 0.80 puts the near extreme at -0.08
     and the far one at 1.08 — outside on both sides whatever the drift
     is doing. Same arithmetic on y. Measured before this: it was
     leaving by left, right and bottom but never the top. */
  var AMP_X = 0.80, DRIFT_X = 0.12, SCROLL_X = 0.08, LEAN_X = 0.02;
  var AMP_Y = 0.72, DRIFT_Y = 0.10, SCROLL_Y = 0.08;

  /* Small integers only: the ratio is how many lobes the figure has, so
     7:5 is a thicket and 3:2 is a shape. */
  var RATIOS = [
    [1, 2], [2, 3], [3, 2], [1, 1], [3, 4], [4, 3], [2, 1], [1, 3]
  ];

  var w = 0, h = 0, dpr = 1;
  var raf = null, running = false;

  /* The two oscillators carry their own accumulated angle rather than a
     shared clock.

     This used to be one running t with x = sin(a*t), and t grew without
     bound. A drifting `a` then multiplied by an ever-larger t, so a
     change of 0.004 in the ratio moved the phase by whole radians from
     one frame to the next and the trace came out in dashes. Advancing
     each angle by its own frequency each step is what an oscillator
     actually does: changing the frequency changes the rate from here on
     and never rewrites where the beam has already been. */
  var angX = 0, angY = 0;
  var a = 3, b = 2;              /* live frequency ratio */
  var aTo = 3, bTo = 2;          /* where it is heading */
  var phase = 0, phaseRate = 0.02;
  var hold = 0;                  /* frames left before the next ratio */
  var wander = 0;                /* the centre's own slow clock */

  /* the pointer leans the figure, without ever driving it */
  var lean = 0, leanTo = 0;

  function pickRatio() {
    var next = RATIOS[(Math.random() * RATIOS.length) | 0];
    /* never pick the one already showing, or it looks stuck */
    if (next[0] === aTo && next[1] === bTo) {
      next = RATIOS[(RATIOS.indexOf(next) + 1) % RATIOS.length];
    }
    aTo = next[0];
    bTo = next[1];
    hold = 620 + ((Math.random() * 420) | 0);
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

    /* a resize wipes the buffer, so lay the ground back down */
    ctx.fillStyle = 'rgb(' + GROUND + ')';
    ctx.fillRect(0, 0, w, h);
    if (reduced.matches) still();
  }

  function scrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  /* ---- the centre --------------------------------------------------------
     Two slow cycles of its own, plus a term taken from the scroll — put
     through a sine so it stays bounded however long the page is, but
     still means that moving down the site moves the figure. */
  function centreX() {
    return w * 0.5
      + Math.sin(wander * 0.31) * w * DRIFT_X
      + Math.sin(scrollTop() / 1100) * w * SCROLL_X
      + lean * w * LEAN_X;
  }

  function centreY() {
    return h * 0.5
      + Math.cos(wander * 0.23) * h * DRIFT_Y
      + Math.sin(scrollTop() / 760 + 1.2) * h * SCROLL_Y;
  }

  /* ---- the readout ------------------------------------------------------ */
  var rx = document.getElementById('scope-x');
  var ry = document.getElementById('scope-y');
  var rp = document.getElementById('scope-p');
  var readoutAt = 0;

  function readout(now) {
    if (now - readoutAt < 240) return;   /* four times a second is plenty */
    readoutAt = now;
    if (rx) rx.textContent = a.toFixed(2);
    if (ry) ry.textContent = b.toFixed(2);
    if (rp) rp.textContent = (((phase % 6.28318) + 6.28318) % 6.28318).toFixed(2);
  }

  /* ---- one frame -------------------------------------------------------- */
  function sweep(cx, cy, ax, ay, alpha, width, steps) {
    var n = steps || SEGS;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var x = cx + Math.sin(angX + a * i * DT + phase) * ax;
      var y = cy + Math.sin(angY + b * i * DT) * ay;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
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
    a += (aTo - a) * 0.004;
    b += (bTo - b) * 0.004;
    phase += phaseRate * 0.016;
    wander += 0.0016;
    lean += (leanTo - lean) * 0.04;

    /* Additive, so the crossings burn rather than merely overlap. Kept
       dim: this is behind every section, not only the first screen. */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var cx = centreX(), cy = centreY();
    var ax = w * AMP_X, ay = h * AMP_Y;
    sweep(cx, cy, ax, ay, 0.035, 7);   /* bloom */
    sweep(cx, cy, ax, ay, 0.09, 3);    /* halo */
    sweep(cx, cy, ax, ay, 0.42, 1.2);  /* the beam itself */

    /* No dot marks the head. One was drawn here and left a speck at
       every frame's position; once the ratio drifted those specks sat
       off the curve the beam was now on and read as dirt. */

    /* each angle advances by its own frequency, and is wrapped so it
       never grows large enough for float error to reach the curve */
    angX = (angX + a * SEGS * DT) % 6.28318;
    angY = (angY + b * SEGS * DT) % 6.28318;
    readout(now);
    raf = running ? requestAnimationFrame(frame) : null;
  }

  /* ---- the still ---------------------------------------------------------
     Reduced motion gets one closed figure drawn in full rather than a
     blank screen: the same picture, just not sweeping. */
  function still() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgb(' + GROUND + ')';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    a = aTo = 3; b = bTo = 2; phase = Math.PI / 2; lean = 0;
    angX = angY = 0;
    var cx = centreX(), cy = centreY();
    var ax = w * AMP_X, ay = h * AMP_Y;
    var whole = Math.ceil(6.28318 / DT);   /* one entire period */
    sweep(cx, cy, ax, ay, 0.035, 7, whole);
    sweep(cx, cy, ax, ay, 0.09, 3, whole);
    sweep(cx, cy, ax, ay, 0.42, 1.2, whole);
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
  start();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  }, { passive: true });

  /* standing still, the figure still has to move when the page does */
  var pending = false;
  window.addEventListener('scroll', function () {
    if (running || pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; still(); });
  }, { passive: true });

  if (!reduced.matches) {
    window.addEventListener('pointermove', function (e) {
      leanTo = ((e.clientX / window.innerWidth) - 0.5) * 1.4;
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  reduced.addEventListener('change', function () {
    if (reduced.matches) { stop(); still(); } else start();
  });
})();
