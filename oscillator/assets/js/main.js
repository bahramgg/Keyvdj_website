/* =============================================================
   OSCILLATOR — builds the pages from artists.js and info.js

   An artist and their session are one entry — there is no separate
   archive. The sleeves are the strongest thing the label owns, so the
   list is them at size with the number beside the name. Nothing here
   invents artwork; it places what exists.

   No framework, no build step.
   ============================================================= */

(function () {
  'use strict';

  var ARTISTS = Array.isArray(window.OSCILLATOR_ARTISTS) ? window.OSCILLATOR_ARTISTS : [];
  var INFO = window.OSCILLATOR_INFO || {};

  /* artists.js is regenerated from SoundCloud, so treat its URLs as
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

  function listenLabel(artist) {
    return 'Listen to ' + (artist.name || 'this artist') + ' on SoundCloud';
  }

  function coverImage(artist) {
    var img = new Image();
    img.src = artist.cover;
    img.alt = '';                       /* the name is set next to it */
    img.width = 1100;
    img.height = 1100;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  /* ---- the tile ---------------------------------------------------------- */
  function tileNode(artist) {
    var item = el('li');
    var url = safeUrl(artist.url);
    var tile = el(url ? 'a' : 'div', 'tile');
    if (url) {
      tile.href = url;
      tile.target = '_blank';
      tile.rel = 'noopener';
      tile.setAttribute('aria-label', listenLabel(artist));
    }

    var fig = el('figure', 'tile__shot');
    if (artist.cover) fig.appendChild(coverImage(artist));
    tile.appendChild(fig);

    var name = el('h3', 'tile__name');
    if (artist.number) name.appendChild(el('span', 'tile__no', artist.number));
    name.appendChild(el('span', null, artist.name || ''));
    tile.appendChild(name);

    item.appendChild(tile);
    return item;
  }

  /* Three on the home page and the whole list on artists.html — the
     home page is a taster, that page is the reference. */
  var SHOWN = 3;

  function renderTiles() {
    var list = document.getElementById('tiles');
    if (!list || !ARTISTS.length) return;
    var frag = document.createDocumentFragment();
    ARTISTS.slice(0, SHOWN).forEach(function (a) { frag.appendChild(tileNode(a)); });
    list.appendChild(frag);

    var all = document.getElementById('all-count');
    if (all) all.textContent = ARTISTS.length;
  }

  /* ---- the roster (artists page) ----------------------------------------- */
  function rosterNode(artist) {
    var row = el('li', 'roster__row');
    var url = safeUrl(artist.url);

    var fig = el('figure', 'roster__shot');
    if (artist.cover) fig.appendChild(coverImage(artist));
    row.appendChild(fig);

    var body = el('div', 'roster__body');
    if (artist.number) body.appendChild(el('p', 'roster__no', artist.number));
    body.appendChild(el('h2', 'roster__name', artist.name || ''));
    /* bios are hand-written and may not be filled in yet */
    if (artist.bio) body.appendChild(el('p', 'roster__bio', artist.bio));
    row.appendChild(body);

    if (url) {
      var a = el('a', 'btn', 'Listen');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', listenLabel(artist));
      row.appendChild(a);
    }
    return row;
  }

  function renderRoster() {
    var node = document.getElementById('roster');
    if (!node || !ARTISTS.length) return;
    var frag = document.createDocumentFragment();
    ARTISTS.forEach(function (artist) { frag.appendChild(rosterNode(artist)); });
    node.appendChild(frag);
  }

  /* ---- the newest session ------------------------------------------------ */
  function renderLatest() {
    var newest = ARTISTS[0];
    var count = document.getElementById('fact-count');
    if (count) count.textContent = ARTISTS.length || '—';
    if (!newest) return;

    var name = newest.name || '';
    var number = newest.number || '';

    function put(id, text) {
      var node = document.getElementById(id);
      if (node) node.textContent = text;
    }
    put('fact-latest', (newest.number ? newest.number + ' — ' : '') + (newest.name || ''));
    put('strip-no', newest.number ? 'OSC—' + newest.number : '');
    put('spec-artist', name);
    put('spec-number', number);

    var shot = document.getElementById('signal-shot');
    if (shot && newest.cover) shot.src = newest.cover;

    /* the button falls back to the label's own page in the markup, so it
       only moves when this session has a link we trust */
    var link = document.getElementById('signal-link');
    var url = safeUrl(newest.url);
    if (link && url) {
      link.href = url;
      link.setAttribute('aria-label', listenLabel(newest));
    }
  }

  /* ---- contact dialog ----------------------------------------------------
     One way in for demos, bookings and press. The form hands the message
     to whichever route is configured: a Formspree endpoint if there is
     one, otherwise the mail client. With neither set it says so rather
     than pretending to have sent anything. */
  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setUpContact() {
    var open = document.getElementById('contact-open');
    var modal = document.getElementById('contact-modal');
    var form = document.getElementById('contact-form');
    var note = document.getElementById('contact-note');
    var close = document.getElementById('contact-close');
    if (!open || !modal || !form) return;

    var endpoint = typeof INFO.formspreeEndpoint === 'string' ? INFO.formspreeEndpoint.trim() : '';
    var address = typeof INFO.contactEmail === 'string' ? INFO.contactEmail.trim() : '';

    function say(text, bad) {
      if (!note) return;
      note.textContent = text;
      note.setAttribute('data-state', bad ? 'bad' : 'ok');
    }

    open.addEventListener('click', function () {
      say('');
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
    });

    if (close) {
      close.addEventListener('click', function () {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var email = (data.get('email') || '').toString().trim();
      var message = (data.get('message') || '').toString().trim();

      if (!name || !message) { say('Add your name and a message.', true); return; }
      if (!isEmail(email)) { say('That email does not look right.', true); return; }

      if (/^https:\/\/formspree\.io\//.test(endpoint)) {
        say('Sending…');
        fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
          .then(function (res) {
            if (!res.ok) throw new Error('rejected');
            form.reset();
            say('Sent. We will come back to you.');
          })
          .catch(function () { say('That did not send. Try Instagram instead.', true); });
        return;
      }

      if (isEmail(address)) {
        var body = 'From: ' + name + ' <' + email + '>\n\n' + message;
        window.location.href = 'mailto:' + address +
          '?subject=' + encodeURIComponent('Oscillator — ' + name) +
          '&body=' + encodeURIComponent(body);
        say('Opening your mail app…');
        return;
      }

      say('No address is set yet — reach us on Instagram for now.', true);
    });
  }

  /* ---- the intro ---------------------------------------------------------
     The badge turns in and the frame cuts to inverse twice, which is how
     the reel opens. It runs from a class the page ships with, so it
     happens with or without this file; touching the badge plays it
     again. */
  /* Take the intro off once it has played. A finished animation with
     fill:both holds its subtree on a compositing layer, and the glow
     above it is then re-blurred every frame forever — see the note by
     .is-done in the stylesheet. */
  function settle() {
    document.body.classList.add('is-done');
  }

  function armIntro() {
    document.body.classList.remove('is-done');
    if (typeof document.getAnimations !== 'function') {
      setTimeout(settle, 2700);
      return;
    }
    /* the ring's turn runs forever, so its finished promise never
       resolves — waiting on it would mean never settling */
    var running = document.getAnimations().filter(function (an) {
      var timing = an.effect && an.effect.getTiming();
      return timing && timing.iterations !== Infinity;
    });
    if (!running.length) { settle(); return; }
    Promise.all(running.map(function (an) { return an.finished; })).then(settle, settle);
  }

  function setUpIntro() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { settle(); return; }
    armIntro();
  }

  function boot() {
    setUpIntro();
    renderLatest();
    renderTiles();
    renderRoster();
    setUpContact();

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
