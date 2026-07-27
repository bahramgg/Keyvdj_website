/* =============================================================
   OSCILLATOR — the field that writes the name

   The first screen has no logo on it. The name is written by the lines
   themselves: a field of short lit strokes that drift free, gather at
   the centre of the window, and settle into the word. Scroll away and
   they let go again and go back to drifting behind the rest of the site.

   How the word is found
   ---------------------
   "OSCILLATOR" is set once on an offscreen canvas in the display face,
   sized to the window, and its pixels are read back. Every pixel the
   type covers is a candidate; a grid of them becomes the targets. So
   the letterforms come from the font rather than from coordinates typed
   in here, and they stay right at any width and through a font swap.

   How a stroke is drawn
   ---------------------
   Each one is a dash centred on its position, laid along the direction
   it is travelling. Moving fast it stretches into a trail; at rest it
   holds a minimum length along a fixed angle of its own, so the settled
   word is woven out of little lines rather than dotted out of points.

   Cost
   ----
   All of them go into one path and it is stroked three times — wide and
   faint for the bloom, middle for the halo, tight and bright for the
   line. Three stroke calls a frame, not three per stroke, so the count
   can be in the hundreds without touching the frame budget.
   ============================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('scope');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ACID = '254, 237, 7';
  var GROUND = '5, 5, 4';        /* --black; the decay has to match it */

  var WORD = 'OSCILLATOR';
  /* Density is the whole game, and brute force is the wrong way to get
     it: at a 4px grid the mark count reached 2600 and the frame rate
     halved, because the wide bloom pass has to fill every one of them.

     So the marks stay sparse and a settled one keeps a small orbit
     instead of freezing. The screen is never cleared, so over a few
     frames each mark's own wobble paints out the gap around it and the
     letterform fills in — density from movement rather than from count.
     It also stops the held word looking like a printed still. */
  /* These three are set from the type size in buildTargets, not fixed:
     a 5px grid and a 6px dash are right under a 200px word and are as
     thick as the strokes themselves under a 57px one, which is what a
     phone gets — the word came out as mush there. Anton's stroke is
     about 0.17 of its size, and it takes three or four marks across a
     stroke to read, so the grid is a twentieth of the size, clamped. */
  var GRID = 5;                  /* px between sampled targets */
  var MAX_MARKS = 1300;
  var DASH_MIN = 6;              /* a settled stroke is still a stroke */
  var WOBBLE = 2.9;              /* px of orbit once it has arrived */
  var DASH_MAX = 18;

  /* What is left once the word lets go.

     It takes over a thousand marks to write the word solidly, and
     turning all of them loose at once did not read as a few free lines —
     it filled the window with a hairball that buried every section under
     it. So the count is tied to how formed the word is: at rest only
     this fraction stays lit, and the rest wink out as it releases. */
  var FREE_KEEP = 0.085;
  var DECAY = 0.055;             /* how fast the phosphor gives up */

  /* the free drift, when the word is let go */
  var AMP_X = 0.80, DRIFT_X = 0.12, SCROLL_X = 0.08, LEAN_X = 0.02;
  var AMP_Y = 0.72, DRIFT_Y = 0.10, SCROLL_Y = 0.08;

  var w = 0, h = 0, dpr = 1;
  var raf = null, running = false;

  /* per-stroke state, in typed arrays: position, previous position,
     target, its own angle, and where it sits in the stagger */
  var n = 0;
  var px, py, ox, oy, tx, ty, ang, seedA, seedB, spread, delay, rank;

  var angX = 0, angY = 0;        /* the drift oscillators' own angles */
  var angW = 0;                  /* the settled marks' own orbit */
  var wander = 0;
  var lean = 0, leanTo = 0;

  /* 0 = drifting free, 1 = holding the word. The name belongs to the
     first screen, so a page without one never forms it — otherwise the
     word and its guides were drawn behind the artists list, which has no
     hero to scroll past and so could never release them. */
  var hero = document.querySelector('.hero');
  var form = 0, formTo = hero ? 1 : 0;

  /* the word's box, for the guides drawn around it */
  var box = null;

  function scrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  /* ---- the targets -------------------------------------------------------
     Set the word once, read the pixels back, keep a grid of the ones the
     type covers. */
  function buildTargets() {
    var pad = Math.min(w * 0.09, 90);
    var off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    var oc = off.getContext('2d');

    /* find the size that fills the width, by measuring rather than
       guessing — the display face is condensed and its ratio is not
       something to hard-code */
    var size = 10;
    oc.font = '400 ' + size + 'px "Anton", "Arial Narrow", sans-serif';
    var unit = oc.measureText(WORD).width / size;
    /* Held well inside the window on both axes: at h*0.34 the word was
       tall enough to sit on the foot of the screen. */
    var wide = Math.min((w - pad * 2) / unit * 0.82, h * 0.21);
    size = Math.max(28, wide);

    oc.font = '400 ' + size + 'px "Anton", "Arial Narrow", sans-serif';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.fillStyle = '#fff';
    var midX = w / 2, midY = h * 0.46;
    oc.fillText(WORD, midX, midY);

    /* Rounded, and it has to be: the sample loop steps x by GRID and
       indexes the pixel buffer with it, so a fractional step lands
       between bytes and the alpha test never passes. At 390px wide this
       came out 3.07 and found exactly zero targets — the word simply did
       not appear. It only worked at 1440 because the clamp happened to
       return a whole number there. */
    GRID = Math.max(3, Math.min(7, Math.round(size * 0.027)));
    DASH_MIN = GRID * 1.25;
    WOBBLE = GRID * 0.55;

    var textWidth = oc.measureText(WORD).width;
    box = {
      left: midX - textWidth / 2,
      right: midX + textWidth / 2,
      top: midY - size * 0.42,
      bottom: midY + size * 0.42
    };

    var data;
    try {
      data = oc.getImageData(0, 0, off.width, off.height).data;
    } catch (e) {
      return;                    /* nothing to do; the drift still runs */
    }

    var found = [];
    for (var y = 0; y < off.height; y += GRID) {
      for (var x = 0; x < off.width; x += GRID) {
        if (data[(y * off.width + x) * 4 + 3] > 110) found.push(x, y);
      }
    }
    if (!found.length) return;

    var count = Math.min(found.length / 2, MAX_MARKS);
    var step = (found.length / 2) / count;

    n = Math.floor(count);
    px = new Float32Array(n); py = new Float32Array(n);
    ox = new Float32Array(n); oy = new Float32Array(n);
    tx = new Float32Array(n); ty = new Float32Array(n);
    ang = new Float32Array(n); seedA = new Float32Array(n);
    seedB = new Float32Array(n); spread = new Float32Array(n);
    delay = new Float32Array(n); rank = new Float32Array(n);

    for (var i = 0; i < n; i++) {
      var at = Math.floor(i * step) * 2;
      tx[i] = found[at];
      ty[i] = found[at + 1];
      ang[i] = Math.random() * 6.28318;
      seedA[i] = Math.random() * 6.28318;
      seedB[i] = Math.random() * 6.28318;
      spread[i] = 0.45 + Math.random() * 0.55;
      /* the stagger, so they arrive as a wave rather than all at once */
      delay[i] = Math.random() * 0.45;
      /* and the order they leave in — see FREE_KEEP */
      rank[i] = Math.random();
      px[i] = ox[i] = w / 2;
      py[i] = oy[i] = h / 2;
    }
  }

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

    buildTargets();

    ctx.fillStyle = 'rgb(' + GROUND + ')';
    ctx.fillRect(0, 0, w, h);
    if (reduced.matches) still();
  }

  /* ---- where a stroke is when it is not holding the word ----------------- */
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

  /* ---- the guides --------------------------------------------------------
     Two rules above and below the word and two down its sides, with a
     small filled node where they cross — the measurement marks the
     reference sets around its title. They arrive with the word. */
  function guides(alpha) {
    if (!box || alpha <= 0.01) return;
    var over = Math.min(w * 0.035, 42);
    var l = box.left - over, r = box.right + over;
    var t = box.top - over, b = box.bottom + over;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(' + ACID + ',' + (alpha * 0.30) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, t); ctx.lineTo(w, t);
    ctx.moveTo(0, b); ctx.lineTo(w, b);
    ctx.moveTo(l, 0); ctx.lineTo(l, h);
    ctx.moveTo(r, 0); ctx.lineTo(r, h);
    ctx.stroke();

    ctx.fillStyle = 'rgba(' + ACID + ',' + (alpha * 0.85) + ')';
    var s = 4;
    [[l, t], [r, t], [l, b], [r, b]].forEach(function (p) {
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    });
  }

  /* ---- one frame -------------------------------------------------------- */
  function ease(v) { return v <= 0 ? 0 : v >= 1 ? 1 : 1 - Math.pow(1 - v, 3); }

  function place(now) {
    var cx = centreX(), cy = centreY();
    var ax = w * AMP_X, ay = h * AMP_Y;
    var span = 1 - 0.45;                 /* the stagger's own window */

    for (var i = 0; i < n; i++) {
      ox[i] = px[i];
      oy[i] = py[i];

      var dx = cx + Math.sin(angX + seedA[i]) * ax * spread[i];
      var dy = cy + Math.sin(angY + seedB[i]) * ay * spread[i];

      var m = ease((form - delay[i]) / span);
      /* the orbit only applies once it is there, or it would fight the
         approach */
      var wob = WOBBLE * m;
      px[i] = dx + (tx[i] - dx) * m + Math.cos(angW + seedA[i]) * wob;
      py[i] = dy + (ty[i] - dy) * m + Math.sin(angW * 1.31 + seedB[i]) * wob;
    }
  }

  /* One path, stroked three times. Rebuilding it per pass meant laying
     out every dash three times a frame for no gain — the geometry does
     not change between the bloom, the halo and the line. */
  function build() {
    var path = new Path2D();
    var alive = FREE_KEEP + form * (1 - FREE_KEEP);
    for (var i = 0; i < n; i++) {
      if (rank[i] > alive) continue;
      var vx = px[i] - ox[i];
      var vy = py[i] - oy[i];
      var speed = Math.sqrt(vx * vx + vy * vy);
      var len, ux, uy;
      if (speed > 0.35) {
        len = Math.min(speed * 1.7 + DASH_MIN, DASH_MAX);
        ux = vx / speed; uy = vy / speed;
      } else {
        len = DASH_MIN;
        ux = Math.cos(ang[i]); uy = Math.sin(ang[i]);
      }
      var hx = ux * len * 0.5, hy = uy * len * 0.5;
      path.moveTo(px[i] - hx, py[i] - hy);
      path.lineTo(px[i] + hx, py[i] + hy);
    }
    return path;
  }

  function paint(path, alpha, width) {
    ctx.strokeStyle = 'rgba(' + ACID + ',' + alpha + ')';
    ctx.lineWidth = width;
    ctx.stroke(path);
  }

  function frame(now) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(' + GROUND + ',' + DECAY + ')';
    ctx.fillRect(0, 0, w, h);

    form += (formTo - form) * 0.022;
    angX += 0.0042;
    angY += 0.0031;
    angW += 0.055;
    wander += 0.0016;
    lean += (leanTo - lean) * 0.04;

    guides(Math.max(0, form * 1.4 - 0.4));

    place(now);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    var path = build();
    paint(path, 0.030, 6);       /* bloom */
    paint(path, 0.085, 3);       /* halo */
    paint(path, 0.34, 1.3);      /* the stroke itself */

    raf = running ? requestAnimationFrame(frame) : null;
  }

  /* reduced motion: the word, formed, once — and redrawn on scroll so it
     is still there when the page has moved */
  function still() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgb(' + GROUND + ')';
    ctx.fillRect(0, 0, w, h);
    form = 1;
    for (var i = 0; i < n; i++) { px[i] = ox[i] = tx[i]; py[i] = oy[i] = ty[i]; }
    guides(1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    var path = build();
    paint(path, 0.030, 6);
    paint(path, 0.085, 3);
    paint(path, 0.34, 1.3);
  }

  function start() {
    if (reduced.matches) { still(); return; }
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---- boot --------------------------------------------------------------
     The targets come from type, so they are only right once the face has
     actually loaded — otherwise the word is sampled from the fallback
     and keeps its shape. */
  resize();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      buildTargets();
      if (reduced.matches) still();
    });
  }
  start();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  }, { passive: true });

  /* Hold the word while the first screen is in view and let it go once
     the page has moved on, so the same strokes become the field behind
     everything below. */
  var pending = false;
  window.addEventListener('scroll', function () {
    if (hero) formTo = scrollTop() < hero.offsetHeight * 0.55 ? 1 : 0;
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
