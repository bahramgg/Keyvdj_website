/* =============================================================
   OSCILLATOR — the oscilloscope

   The label is called Oscillator, so the site is one. Nothing here is a
   picture: every frame is a field of standing waves solved and drawn on
   the spot. Stacked traces, each the sum of a few harmonics, each row
   phase-shifted from the one above it so the field reads as one surface
   rather than a stack of lines. Each trace fills black beneath itself,
   so the rows in front occlude the rows behind and the flat page gets
   depth for free.

   Every session carries its own tuning, derived from its number, and
   the whole field retunes to it when you touch its row — so an artist is
   literally a frequency here.

   Costs nothing to download: there is no asset, only arithmetic.
   ============================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('scope');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ACID = '#FEED07';
  var ROWS = 34;                 // traces down the field
  var STEP = 7;                  // px between samples along a trace
  var SIGMA = 0.30;              // how tightly the activity hugs the centre

  var w = 0, h = 0, dpr = 1;
  var raf = null, running = false;
  var t = 0;

  /* pointer, held in normalised space and eased so it never snaps */
  var px = 0.5, py = 0.5, pxTo = 0.5, pyTo = 0.5, pStrength = 0, pTo = 0;

  /* ---- tuning ---------------------------------------------------------
     Four harmonics: frequency, amplitude, drift. The default is the
     label's own; a session's is derived from its number so the same
     artist always sounds the same. */
  var BASE = [
    { f: 1.6, a: 1.00, s: 0.19 },
    { f: 3.1, a: 0.55, s: -0.13 },
    { f: 5.7, a: 0.28, s: 0.27 },
    { f: 9.3, a: 0.14, s: -0.33 }
  ];

  var tune = BASE.map(function (o) { return { f: o.f, a: o.a, s: o.s }; });
  var target = tune.map(function (o) { return { f: o.f, a: o.a, s: o.s }; });

  function tuningFor(seed) {
    /* a small deterministic hash, so 027 always gives the same shape */
    var n = 0;
    var str = String(seed);
    for (var i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) % 9973;
    function r(k) { return ((n * (k + 7) * 2654435761) % 1000) / 1000; }
    return [
      { f: 1.1 + r(1) * 2.2, a: 0.85 + r(5) * 0.35, s: 0.10 + r(2) * 0.22 },
      { f: 2.4 + r(3) * 3.0, a: 0.40 + r(6) * 0.35, s: -0.08 - r(4) * 0.20 },
      { f: 4.5 + r(2) * 4.0, a: 0.18 + r(1) * 0.25, s: 0.16 + r(6) * 0.26 },
      { f: 7.5 + r(4) * 6.0, a: 0.08 + r(3) * 0.16, s: -0.20 - r(5) * 0.28 }
    ];
  }

  function retune(seed) {
    target = seed == null ? BASE.map(function (o) { return { f: o.f, a: o.a, s: o.s }; })
                          : tuningFor(seed);
    kick();
  }

  /* ---- sizing --------------------------------------------------------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    w = rect.width;
    h = rect.height;
    /* The traces are hairlines on black; at full device ratio this was
       rasterising far more pixels than the look needs. */
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  /* ---- one frame ------------------------------------------------------
     Each trace is solved once into a buffer and then used twice — to fill
     the black beneath it and to stroke the line itself. Solving it per
     pass, which is what this did first, cost half the frame rate. */
  var buf = new Float32Array(2048);

  function draw() {
    ctx.clearRect(0, 0, w, h);

    /* ease the tuning and the pointer toward wherever they are headed */
    for (var k = 0; k < tune.length; k++) {
      tune[k].f += (target[k].f - tune[k].f) * 0.045;
      tune[k].a += (target[k].a - tune[k].a) * 0.045;
      tune[k].s += (target[k].s - tune[k].s) * 0.045;
    }
    px += (pxTo - px) * 0.08;
    py += (pyTo - py) * 0.08;
    pStrength += (pTo - pStrength) * 0.06;

    var top = h * 0.16;
    var spacing = (h * 0.72) / (ROWS - 1);
    var swing = Math.min(h * 0.115, spacing * 4.6);
    var cols = Math.floor(w / STEP) + 2;
    if (cols > buf.length) buf = new Float32Array(cols);

    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    /* Back to front means the top of the field first: a nearer row has to
       be able to paint over the one behind it. Running this the other way
       let the topmost row's fill cover the whole field below it. */
    for (var i = 0; i < ROWS; i++) {
      var rowY = top + i * spacing;
      var rowN = i / (ROWS - 1);
      var rowEnv = Math.sin(Math.PI * rowN);
      rowEnv *= rowEnv;                            /* the middle swings hardest */
      var scale = rowEnv * swing;

      /* per-row phase offsets, lifted out of the sample loop */
      var p0 = t * tune[0].s + rowN * 1.302;
      var p1 = t * tune[1].s + rowN * 2.604;
      var p2 = t * tune[2].s + rowN * 3.906;
      var p3 = t * tune[3].s + rowN * 5.208;
      var f0 = tune[0].f * 6.28318, f1 = tune[1].f * 6.28318;
      var f2 = tune[2].f * 6.28318, f3 = tune[3].f * 6.28318;
      var a0 = tune[0].a, a1 = tune[1].a, a2 = tune[2].a, a3 = tune[3].a;
      var dent = pStrength > 0.001;

      for (var c = 0; c < cols; c++) {
        var nx = (c * STEP) / w;
        var d = nx - 0.5;
        var env = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));

        var v = a0 * Math.sin(nx * f0 + p0)
              + a1 * Math.sin(nx * f1 + p1)
              + a2 * Math.sin(nx * f2 + p2)
              + a3 * Math.sin(nx * f3 + p3);

        if (dent) {                                /* the cursor presses in */
          var ex = nx - px, ey = rowN - py;
          var e2 = ex * ex * 1.6 + ey * ey * 3.4;
          v += pStrength * 2.4 * Math.exp(-e2 * 26) * Math.sin(t * 1.6 - e2 * 40);
        }

        buf[c] = rowY - v * env * scale;
      }

      /* The fill only has to hide the traces immediately behind this one,
         so it stops a few rows down rather than running to the foot of the
         canvas. Filling to the bottom meant painting roughly a quarter of
         a billion pixels a frame and held this to 19fps. */
      var floorY = rowY + swing + spacing * 2;
      ctx.beginPath();
      ctx.moveTo(0, buf[0]);
      for (var c2 = 1; c2 < cols; c2++) ctx.lineTo(c2 * STEP, buf[c2]);
      ctx.lineTo((cols - 1) * STEP, floorY);
      ctx.lineTo(0, floorY);
      ctx.closePath();
      ctx.fillStyle = '#000';
      ctx.fill();

      /* and the trace itself, over its own fill */
      ctx.beginPath();
      ctx.moveTo(0, buf[0]);
      for (var c3 = 1; c3 < cols; c3++) ctx.lineTo(c3 * STEP, buf[c3]);
      ctx.strokeStyle = ACID;
      ctx.globalAlpha = 0.10 + rowEnv * 0.62;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function frame() {
    t += 0.016;
    draw();
    raf = running ? requestAnimationFrame(frame) : null;
  }

  function kick() {
    if (reduced.matches) { draw(); return; }
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }

  function halt() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---- boot ----------------------------------------------------------- */
  resize();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  }, { passive: true });

  /* only run while the field is actually on screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) kick(); else halt();
    }, { threshold: 0 }).observe(canvas);
  } else {
    kick();
  }

  if (!reduced.matches) {
    window.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      pxTo = (e.clientX - rect.left) / rect.width;
      pyTo = (e.clientY - rect.top) / rect.height;
      pTo = (pyTo > -0.2 && pyTo < 1.2) ? 1 : 0;
      kick();
    }, { passive: true });

    window.addEventListener('pointerleave', function () { pTo = 0; }, { passive: true });
  }

  reduced.addEventListener('change', function () {
    if (reduced.matches) { halt(); draw(); } else kick();
  });

  /* the archive retunes the field as you move down it */
  window.OSCILLATOR_SCOPE = { retune: retune };
})();
