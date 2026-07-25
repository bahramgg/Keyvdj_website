/* =============================================================
   KEYV — discography page
   Renders every release from config.js (plus localStorage
   overrides), grouped by type: releases, live mixes, video.
   ============================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'keyv.config.overrides';
  document.documentElement.classList.add('js');

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function merge(base, over) {
    if (!isPlainObject(base) || !isPlainObject(over)) {
      return over === undefined ? base : over;
    }
    var out = {}, k;
    for (k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k]; }
    for (k in over) {
      if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
      out[k] = isPlainObject(base[k]) && isPlainObject(over[k]) ? merge(base[k], over[k]) : over[k];
    }
    return out;
  }

  var cfg = window.KEYV_CONFIG || {};
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cfg = merge(cfg, JSON.parse(raw) || {});
  } catch (err) { /* defaults win */ }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function safeUrl(url) {
    if (typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (!trimmed) return '';
    var scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
    if (scheme && !/^(https?|mailto)$/i.test(scheme[1])) return '';
    return trimmed;
  }

  function extLink(url, label, className) {
    var href = safeUrl(url);
    var a = el('a', className, label);
    if (href) {
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  }

  var GROUPS = [
    { type: 'release', title: 'Label releases' },
    { type: 'mix',     title: 'Live mixes' }
  ];

  function workRow(release) {
    var row = el('article', 'work reveal');

    var cover = el('img', 'work__cover');
    cover.alt = '';
    cover.loading = 'lazy';
    cover.decoding = 'async';
    cover.src = safeUrl(release.cover) || '';
    cover.addEventListener('error', function () { cover.removeAttribute('src'); }, { once: true });
    row.appendChild(cover);

    var main = el('div');
    main.appendChild(el('h3', 'work__title', release.title || 'Untitled'));
    if (release.mix) main.appendChild(el('p', 'work__sub', release.mix));
    row.appendChild(main);

    var meta = el('p', 'work__meta');
    if (release.genre) meta.appendChild(el('em', null, '#' + String(release.genre).toLowerCase()));
    if (release.year) meta.appendChild(el('span', null, release.year));
    row.appendChild(meta);

    var links = el('div', 'work__links');
    (Array.isArray(release.links) ? release.links : []).forEach(function (l) {
      if (l && l.label) links.appendChild(extLink(l.url, l.label + ' ↗', 'action'));
    });
    row.appendChild(links);

    return row;
  }

  function render() {
    var host = document.getElementById('works');
    if (!host) return;
    host.textContent = '';

    var releases = Array.isArray(cfg.releases) ? cfg.releases : [];

    GROUPS.forEach(function (group) {
      var items = releases.filter(function (r) { return r && (r.type || 'release') === group.type; });
      if (!items.length) return;

      var section = el('div', 'works__group');
      section.appendChild(el('p', 'tag-label', group.title));
      items.forEach(function (r) { section.appendChild(workRow(r)); });
      host.appendChild(section);
    });

    /* footer bits shared with the main page */
    document.querySelectorAll('[data-config]').forEach(function (node) {
      var path = node.getAttribute('data-config').split('.');
      var value = path.reduce(function (a, k) { return a == null ? undefined : a[k]; }, cfg);
      if (typeof value === 'string' && value) node.textContent = value;
    });

    var navList = document.getElementById('nav-platforms');
    if (navList && Array.isArray(cfg.platforms)) {
      cfg.platforms.forEach(function (p) {
        if (!p || !p.label) return;
        var li = el('li');
        li.appendChild(extLink(p.url, p.label));
        navList.appendChild(li);
      });
    }

    var socials = document.getElementById('footer-socials');
    if (socials && Array.isArray(cfg.socials)) {
      cfg.socials.forEach(function (s) {
        if (!s || !s.label) return;
        var li = el('li');
        li.appendChild(extLink(s.url, s.label, 'link-grow'));
        socials.appendChild(li);
      });
    }

    /* simple reveal — no GSAP dependency on this page */
    var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal, .work'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (node) { node.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (node) { io.observe(node); });

    /* A fast scroll can carry a row from below the viewport to above it
       between frames, so the observer never sees it intersect. Sweep
       anything already scrolled past. */
    var ticking = false;
    function sweep() {
      targets = targets.filter(function (node) {
        if (node.classList.contains('is-in')) return false;
        if (node.getBoundingClientRect().bottom > 0) return true;
        node.classList.add('is-in');
        io.unobserve(node);
        return false;
      });
      if (!targets.length) window.removeEventListener('scroll', onScroll);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { sweep(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
