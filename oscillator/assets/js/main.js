/* =============================================================
   OSCILLATOR — renders the mix series from series.js
   No framework, no build step, same as the main site.
   ============================================================= */

(function () {
  'use strict';

  var SERIES = Array.isArray(window.OSCILLATOR_SERIES) ? window.OSCILLATOR_SERIES : [];

  /* Only ever build links we generated ourselves — the data file is
     regenerated from SoundCloud, so treat its URLs as untrusted input. */
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

  function episodeNode(ep) {
    var item = el('li', 'ep');
    var url = safeUrl(ep.url);

    var link = el(url ? 'a' : 'div', 'ep__link');
    if (url) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label',
        'Listen to Oscillator ' + (ep.number ? '#' + ep.number + ' ' : '') + ep.artist + ' on SoundCloud');
    }

    var frame = el('div', 'ep__frame');
    if (ep.cover) {
      var img = new Image();
      img.src = ep.cover;
      img.alt = '';                       // the artist name is next to it
      img.width = 700;
      img.height = 700;
      img.loading = 'lazy';
      img.decoding = 'async';
      frame.appendChild(img);
    }
    var play = el('div', 'ep__play');
    play.setAttribute('aria-hidden', 'true');
    play.appendChild(el('span', null, 'Listen'));
    frame.appendChild(play);

    /* The number is already set into the cover artwork, so it goes beside
       the name rather than on top of it — repeating it over the image only
       fought with the layout the covers already have. */
    var meta = el('div', 'ep__meta');
    if (ep.number) meta.appendChild(el('span', 'ep__no', ep.number));
    meta.appendChild(el('h3', 'ep__artist', ep.artist || ''));

    link.appendChild(frame);
    link.appendChild(meta);
    item.appendChild(link);
    return item;
  }

  function render() {
    var grid = document.getElementById('series-grid');
    if (grid && SERIES.length) {
      var frag = document.createDocumentFragment();
      SERIES.forEach(function (ep) { frag.appendChild(episodeNode(ep)); });
      grid.appendChild(frag);
    }

    var count = document.getElementById('hero-count');
    if (count && SERIES.length) {
      count.textContent = SERIES.length + ' mixes';
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* The hero loop is decoration. Autoplay can be refused (low power mode,
     data saver), and it is muted anyway, so a rejection is not an error —
     the poster frame stays and the page is unaffected. */
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(); primeVideo(); });
  } else {
    render();
    primeVideo();
  }
})();
