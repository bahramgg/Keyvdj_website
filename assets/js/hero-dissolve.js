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
  var host = img.parentNode;                 // .hero__art

  /* ---- sample the artwork into particles -------------------------- */
  /* Sampled at a fixed internal resolution and stored as normalised
     coordinates, so the same particle set works at any display size / DPR. */
  var SAMPLE_W = 420;                         // internal sampling width
  var STRIDE = 2;                             // px between samples
  var ALPHA_MIN = 40;                         // ignore near-transparent pixels

  var particles = null;                       // {nx,ny,r,g,b,a, dx,dy, t0}
  var canvas, ctx, dpr = 1;
  var boxW = 0, boxH = 0;                     // the artwork's own box
  var canW = 0, canH = 0, artX = 0;          // canvas box (roomier) + art offset
  var PAD_X = 0.24;                          // extra canvas width, fraction
  var PAD_BELOW = 0.75;                      // extra canvas height below the art
  var raf = null, visible = true;
  var current = 0, target = 0;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

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
          r: r, g: g, b: b,
          a: (a / 255),
          dx: rand(-0.16, 0.16),
          dy: down,
          t0: Math.random() * 0.55            // staggered departure
        });
      }
    }
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
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = canW + 'px';
    canvas.style.height = canH + 'px';
    canvas.width = Math.round(canW * dpr);
    canvas.height = Math.round(canH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(current);
  }

  /* ---- draw one frame at dissolve progress p (0 formed → 1 gone) --- */
  function draw(p) {
    ctx.clearRect(0, 0, canW, canH);
    var size = Math.max(1, boxW / SAMPLE_W * STRIDE * 0.95);
    for (var k = 0; k < particles.length; k++) {
      var pt = particles[k];
      var lp = p <= pt.t0 ? 0 : (p - pt.t0) / (1 - pt.t0);
      if (lp >= 1) continue;                  // fully gone
      var e = easeOut(lp);
      var x = artX + (pt.nx + pt.dx * e) * boxW;
      var y = (pt.ny + pt.dy * e + 0.18 * e * e) * boxH;   // gravity pulls down
      var alpha = pt.a * (1 - lp * lp);       // hold longer, then fall away
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgb(' + pt.r + ',' + pt.g + ',' + pt.b + ')';
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- scroll → target progress ----------------------------------- */
  function computeTarget() {
    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    /* 0 while the hero sits at the top; fully dissolved only after a full
       viewport of scrolling, so the break-up feels gradual */
    return clamp(-rect.top / vh, 0, 1);
  }

  function frame() {
    target = computeTarget();
    current += (target - current) * 0.14;     // ease toward the scroll target
    if (Math.abs(target - current) < 0.001) current = target;
    draw(current);
    /* keep animating while on-screen or still settling */
    if (visible || Math.abs(target - current) > 0.001) {
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
    if (!buildParticles(img)) return;         // sampling failed → keep image

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '50%';
    canvas.style.transform = 'translateX(-50%)';
    ctx = canvas.getContext('2d');
    host.appendChild(canvas);
    img.style.visibility = 'hidden';          // keep the layout box, hide pixels

    resize();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
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
