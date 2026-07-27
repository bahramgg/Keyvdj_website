/* =============================================================
   OSCILLATOR — renders the artists from artists.js
   The home page shows a few; artists.html shows all of them with
   their bios. No framework, no build step.
   ============================================================= */

(function () {
  'use strict';

  var ARTISTS = Array.isArray(window.OSCILLATOR_ARTISTS) ? window.OSCILLATOR_ARTISTS : [];
  var INFO = window.OSCILLATOR_INFO || {};
  var FEATURED = 4;                     // one row on desktop, two on a phone
  var INSTAGRAM = 'https://www.instagram.com/oscillator__';

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

  /* ---- latest mix -------------------------------------------------- */
  /* The SoundCloud player is a third-party iframe, so nothing is loaded
     from them until the reader presses play. Until then this is our own
     artwork and a button. */
  function renderLatest() {
    var host = document.getElementById('latest');
    var artist = ARTISTS[0];
    if (!host || !artist) return;
    var url = safeUrl(artist.url);
    if (!url) return;

    var shot = cover(artist, 'latest__shot');
    var play = el('button', 'latest__play');
    play.type = 'button';
    play.appendChild(el('span', null, 'Play'));
    play.setAttribute('aria-label', listenLabel(artist));
    play.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.className = 'latest__frame';
      frame.title = listenLabel(artist);
      frame.allow = 'autoplay';
      frame.loading = 'lazy';
      frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
                  '&color=%23feed07&auto_play=true&hide_related=true&show_comments=false' +
                  '&show_user=true&show_reposts=false&visual=false';
      shot.replaceWith(frame);
    });
    shot.appendChild(play);

    var body = el('div', 'latest__body');
    body.appendChild(el('h3', 'latest__who', artist.name || ''));
    if (artist.number) body.appendChild(el('p', 'latest__meta', 'Mix ' + artist.number));
    if (artist.bio) body.appendChild(el('p', null, artist.bio));

    var go = el('p', null);
    var link = el('a', 'link', 'Open in SoundCloud');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    go.appendChild(link);
    body.appendChild(go);

    host.appendChild(shot);
    host.appendChild(body);
  }

  /* ---- events ------------------------------------------------------ */
  /* A label page saying "no upcoming shows" is worse than one that simply
     does not have the section, so an empty list removes the whole band. */
  function renderEvents() {
    var band = document.getElementById('events-band');
    var list = document.getElementById('event-list');
    if (!band || !list) return;

    var today = new Date().toISOString().slice(0, 10);
    var upcoming = (Array.isArray(INFO.events) ? INFO.events : [])
      .filter(function (e) { return e && e.date && e.date >= today; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    if (!upcoming.length) return;       // band keeps its .is-empty class

    upcoming.forEach(function (e) {
      var row = el('li', 'event');
      row.appendChild(el('span', 'event__date', e.date));
      row.appendChild(el('span', 'event__what', e.what || ''));
      if (e.where) row.appendChild(el('span', 'event__where', e.where));
      list.appendChild(row);
    });
    band.classList.remove('is-empty');
  }

  /* ---- demos ------------------------------------------------------- */
  function renderDemos() {
    var host = document.getElementById('demo-links');
    if (!host) return;

    /* Only print an address if there actually is one — otherwise point at
       the DMs, which always reach someone. */
    var email = typeof INFO.demoEmail === 'string' ? INFO.demoEmail.trim() : '';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      var mail = el('a', 'link', email);
      mail.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Demo — Oscillator');
      host.appendChild(mail);
    }
    var dm = el('a', 'link', 'Instagram DM');
    dm.href = INSTAGRAM;
    dm.target = '_blank';
    dm.rel = 'noopener';
    host.appendChild(dm);
  }

  function render() {
    fill(document.getElementById('featured-artists'), ARTISTS.slice(0, FEATURED), featuredNode);
    fill(document.getElementById('roster'), ARTISTS, rosterNode);
    renderLatest();
    renderEvents();
    renderDemos();

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
    /* The clip races through its own wordmark frames — slowing it lets
       each state actually be read before the loop moves on. */
    try { video.playbackRate = 0.72; } catch (err) { /* not supported */ }

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
