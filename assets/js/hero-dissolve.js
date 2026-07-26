/* =============================================================
   KEYV — hero dissolve
   The hero artwork is sampled into thousands of particles. As the page
   scrolls down, the particles drift apart into tiny droplets and fade;
   scrolling back reassembles them. Scroll-position driven, so it is
   fully reversible. Frozen (static image) under prefers-reduced-motion.
   ============================================================= */

(function () {
  'use strict';

  var img = document.querySelector('.hero__art-img');
  if (!img) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;               // leave the static image in place

  var section = document.getElementById('hero');
  var stage = document.getElementById('hero-stage') || section;
  var host = img.parentNode;                 // .hero__art

  /* ---- sample the artwork into particles -------------------------- */
  /* Sampled at a fixed internal resolution and stored as normalised
     coordinates, so the same particle set works at any display size / DPR. */
  var SAMPLE_W = 560;                         // internal sampling width (set below)
  var STRIDE = 2;                             // px between samples
  var ALPHA_MIN = 40;                         // ignore near-transparent pixels
  var SPACING = 1.5;                          // target gap between droplets, CSS px

  var particles = null;                       // {nx,ny,r,g,b,a, dx,dy, t0}
  var canvas, ctx, dpr = 1;
  var boxW = 0, boxH = 0;                     // the artwork's own box
  var canW = 0, canH = 0, artX = 0;          // canvas box (roomier) + art offset
  var PAD_X = 0.24;                          // extra canvas width, fraction
  var PAD_BELOW = 0.75;                      // extra canvas height below the art
  var FADE_END = 0.14;                        // real image is shown until here,
                                             // then it hands off to the particles
  var PIN_SPAN = 0.95;                        // dissolve completes this far into
                                             // the pin
  var LIFT_FROM = 0.5;                        // wordmark starts rising here
  var LIFT_RATIO = 0.42;                      // ...by this much of the art height
  var raf = null;
  var current = 0, target = 0;
  var drawn = -1;                             // last progress actually painted

  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  /* cubic ease-out, written as multiplications — this runs once per particle
     per frame, where Math.pow measurably costs frames */
  function easeOut(t) { var u = 1 - t; return 1 - u * u * u; }

  /* The artwork is greyscale line art, so its colours collapse losslessly
     into a small ramp. Particles carry a bucket index instead of an rgb
     triple, which keeps the per-frame fillStyle changes down to LEVELS. */
  var LEVELS = 12;
  var PALETTE = (function () {
    var p = [];
    for (var i = 0; i < LEVELS; i++) {
      var v = Math.round(255 * (i + 0.5) / LEVELS);
      p.push('rgb(' + v + ',' + v + ',' + v + ')');
    }
    return p;
  })();

  function quantise(r, g, b) {
    var lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    return clamp(Math.floor(lum * LEVELS), 0, LEVELS - 1);
  }

  function buildParticles(source) {
    var iw = source.naturalWidth, ih = source.naturalHeight;
    if (!iw || !ih) return false;

    var sw = SAMPLE_W;
    var sh = Math.round(sw * ih / iw);
    var off = document.createElement('canvas');
    off.width = sw; off.height = sh;
    var octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(source, 0, 0, sw, sh);

    var data;
    try {
      data = octx.getImageData(0, 0, sw, sh).data;
    } catch (err) {
      return false;                          // reading blocked → keep the image
    }

    var list = [];
    for (var y = 0; y < sh; y += STRIDE) {
      for (var x = 0; x < sw; x += STRIDE) {
        var i = (y * sw + x) * 4;
        var a = data[i + 3];
        if (a < ALPHA_MIN) continue;
        var r = data[i], g = data[i + 1], b = data[i + 2];
        if (r + g + b < 40) continue;         // skip the near-black void fill

        var ny = y / sh;
        /* droplets fall and spread: mostly downward, a little sideways,
           lower pixels (the drips) travel further */
        var down = rand(0.10, 0.42) * (0.6 + ny);
        list.push({
          nx: x / sw,
          ny: ny,
          c: quantise(r, g, b),               // colour bucket index
          a: (a / 255),
          dx: rand(-0.16, 0.16),
          dy: down,
          t0: Math.random() * 0.55            // staggered departure
        });
      }
    }
    /* Sorting by colour bucket lets draw() set fillStyle once per bucket
       instead of once per particle — assigning a colour string forces a CSS
       colour parse, and at ~20k particles a frame that was the bottleneck. */
    list.sort(function (p, q) { return p.c - q.c; });
    particles = list;
    return list.length > 0;
  }

  /* ---- canvas sizing --------------------------------------------- */
  /* The canvas is wider and (mostly) taller than the artwork so drifting
     droplets have room to travel before they fade, instead of being
     clipped. The artwork's formed state stays aligned to the image box. */
  function resize() {
    var rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    boxW = rect.width; boxH = rect.height;
    canW = boxW * (1 + PAD_X);
    canH = boxH * (1 + PAD_BELOW);
    artX = boxW * PAD_X / 2;                  // art sits centred, at the top
    /* Full device resolution: capping this below the screen's own ratio
       makes the droplets soft, which is the whole point of the effect. */
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = canW + 'px';
    canvas.style.height = canH + 'px';
    canvas.width = Math.round(canW * dpr);
    canvas.height = Math.round(canH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawn = -1;                               // geometry changed → force a repaint
    kick();
  }

  /* ---- draw one frame at dissolve progress p (0 formed → 1 gone) --- */
  function draw(p) {
    ctx.clearRect(0, 0, canW, canH);
    if (p <= 0) return;                       // at rest the crisp <img> shows,
                                             // so there is nothing to paint here
    var size = Math.max(1, boxW / SAMPLE_W * STRIDE * 0.95);
    var bucket = -1;
    for (var k = 0; k < particles.length; k++) {
      var pt = particles[k];
      var lp = p <= pt.t0 ? 0 : (p - pt.t0) / (1 - pt.t0);
      if (lp >= 1) continue;                  // fully gone
      var alpha = pt.a * (1 - lp * lp);       // hold longer, then fall away
      if (alpha <= 0.01) continue;
      var e = easeOut(lp);
      var x = artX + (pt.nx + pt.dx * e) * boxW;
      var y = (pt.ny + pt.dy * e + 0.18 * e * e) * boxH;   // gravity pulls down
      if (pt.c !== bucket) {                  // particles are colour-sorted
        bucket = pt.c;
        ctx.fillStyle = PALETTE[bucket];
      }
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- scroll → target progress ----------------------------------- */
  function computeTarget() {
    var rect = section.getBoundingClientRect();
    /* The stage stays pinned for however much taller the section is than the
       stage itself, so that distance — not the viewport — is what progress
       is measured against. Read from the DOM so changing the section's
       height in CSS cannot desynchronise the dissolve from the pin. */
    var pinDistance = section.offsetHeight - stage.offsetHeight;
    if (pinDistance <= 0) return 0;
    return clamp(-rect.top / (pinDistance * PIN_SPAN), 0, 1);
  }

  /* the crisp image is fully shown at rest and fades out over the first
     sliver of scrolling, so what you see when the page loads is the real
     high-resolution artwork — not the particle approximation of it */
  function imageOpacity(p) {
    if (p <= 0) return 1;
    if (p >= FADE_END) return 0;
    return 1 - p / FADE_END;
  }

  /* How far the wordmark rises into the space the artwork is vacating.
     Starts once the artwork is mostly gone, so the two do not collide. */
  function lift(p) {
    if (p <= LIFT_FROM) return 0;
    var t = (p - LIFT_FROM) / (1 - LIFT_FROM);
    return -Math.round(easeOut(t) * boxH * LIFT_RATIO);
  }


  function frame() {
    target = computeTarget();
    /* Proportional ease for the big moves, plus a floor on the step size:
       a purely proportional ease crawls asymptotically at the tail, which
       would leave the artwork stuck slightly faded after scrolling back. */
    var d = target - current;
    var MIN_STEP = 0.006;
    if (Math.abs(d) <= MIN_STEP) {
      current = target;
    } else {
      var step = d * 0.18;
      if (Math.abs(step) < MIN_STEP) step = d < 0 ? -MIN_STEP : MIN_STEP;
      current += step;
    }
    if (current !== drawn) {                  // nothing moved → nothing to redo
      img.style.opacity = imageOpacity(current);
      stage.style.setProperty('--art-glow', 1 - current * current);
      stage.style.setProperty('--hero-lift', lift(current) + 'px');
      draw(current);
      drawn = current;
    }
    /* Settled means the frame can only change on the next scroll or resize,
       and both of those kick the loop back to life — so stop burning frames. */
    if (current !== target) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
    }
  }

  function kick() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  /* ---- boot ------------------------------------------------------- */
  function start() {
    /* Sample no finer than the artwork is actually drawn: a phone renders it
       at ~370 CSS px, and particles finer than SPACING there are invisible
       work. Measured before building, so the count suits the device. */
    var shown = img.getBoundingClientRect().width;
    if (shown) SAMPLE_W = clamp(Math.round(shown * STRIDE / SPACING), 320, 560);

    if (!buildParticles(img)) return;         // sampling failed → keep image

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '50%';
    canvas.style.transform = 'translateX(-50%)';
    canvas.style.zIndex = '1';
    ctx = canvas.getContext('2d');
    host.appendChild(canvas);

    /* the real image stays in place and sits ON TOP of the canvas, so at
       rest you see the full-quality artwork; it only fades to reveal the
       particles once the dissolve starts */
    img.style.position = 'relative';
    img.style.zIndex = '2';
    img.style.willChange = 'opacity';

    resize();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) kick();   // catch up after being away
      }, { threshold: 0 }).observe(section);
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; }); }
      kick();
    }, { passive: true });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 150);
    }, { passive: true });

    kick();
  }

  /* wait for the artwork to be decoded before sampling it */
  if (img.complete && img.naturalWidth) {
    (img.decode ? img.decode().catch(function () {}) : Promise.resolve()).then(start);
  } else {
    img.addEventListener('load', start, { once: true });
    img.addEventListener('error', function () { /* keep nothing; img stays hidden? no */ }, { once: true });
  }
})();
