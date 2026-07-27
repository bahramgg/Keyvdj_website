/* =============================================================
   OSCILLATOR — renders the artists from artists.js
   The home page shows a few; artists.html shows all of them with
   their bios. No framework, no build step.
   ============================================================= */

(function () {
  'use strict';

  var ARTISTS = Array.isArray(window.OSCILLATOR_ARTISTS) ? window.OSCILLATOR_ARTISTS : [];
  var FEATURED = 4;                     // one row on desktop, two on a phone

  /* The data file is regenerated from SoundCloud, so treat its URLs as
     untrusted input and only ever build links to hosts we expect. */
  function safeUrl(value) {
    if (typeof value !== 'string') return '';
    return /^https:\/\/(soundcloud\.com|www\.instagram\.com)\//.test(value) ? value : '';
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function cover(artist, cls) {
    var shot = el('div', cls);
    if (!artist.cover) return shot;
    var img = new Image();
    img.src = artist.cover;
    img.alt = '';                       // the name sits next to it
    img.width = 700;
    img.height = 700;
    img.loading = 'lazy';
    img.decoding = 'async';
    shot.appendChild(img);
    return shot;
  }

  function listenLabel(artist) {
    return 'Listen to ' + (artist.name || 'this artist') + ' on SoundCloud';
  }

  /* ---- home page: a few, as tiles ---------------------------------- */
  function featuredNode(artist) {
    var item = el('li', 'artist');
    var url = safeUrl(artist.url);
    var link = el(url ? 'a' : 'div', 'artist__link');
    if (url) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', listenLabel(artist));
    }
    link.appendChild(cover(artist, 'artist__shot'));

    var name = el('h3', 'artist__name', artist.name || '');
    link.appendChild(name);
    if (artist.number) link.appendChild(el('span', 'artist__no', artist.number));

    item.appendChild(link);
    return item;
  }

  /* ---- artists page: all of them, with bios ------------------------ */
  function rosterNode(artist) {
    var row = el('li', 'roster__row');
    var url = safeUrl(artist.url);

    row.appendChild(cover(artist, 'roster__shot'));

    var body = el('div', 'roster__body');
    if (artist.number) body.appendChild(el('span', 'roster__no', artist.number));
    body.appendChild(el('h2', 'roster__name', artist.name || ''));

    /* Bios are written by hand and may not be filled in yet — an empty one
       simply leaves the row as name plus link rather than showing a gap. */
    if (artist.bio) body.appendChild(el('p', 'roster__bio', artist.bio));

    if (url) {
      var go = el('p', 'roster__go');
      var link = el('a', 'link', 'Listen');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', listenLabel(artist));
      go.appendChild(link);
      body.appendChild(go);
    }

    row.appendChild(body);
    return row;
  }

  function fill(node, list, build) {
    if (!node || !list.length) return;
    var frag = document.createDocumentFragment();
    list.forEach(function (artist) { frag.appendChild(build(artist)); });
    node.appendChild(frag);
  }

  function render() {
    fill(document.getElementById('featured-artists'), ARTISTS.slice(0, FEATURED), featuredNode);
    fill(document.getElementById('roster'), ARTISTS, rosterNode);

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* The hero loop is decoration. Autoplay can be refused (low power mode,
     data saver); it is muted, so a rejection is not an error — the poster
     frame stays and nothing else is affected. */
  function primeVideo() {
    var video = document.querySelector('.hero__video');
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }
    var attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(function () {});
  }

  function boot() { render(); primeVideo(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
