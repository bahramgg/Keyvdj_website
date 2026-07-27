/* =============================================================
   OSCILLATOR — builds the pages from artists.js and info.js

   Everything the label makes is built out of the same parts, so this
   builds the page out of them too: a number in a box with its corners
   cut, a name, and a sleeve held off to the side that cuts to whichever
   row you are on.

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

  /* the registration brackets, which are an overlay rather than a border */
  function frame() {
    var span = el('span', 'frame marks');
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  /* a number in a box with its corners cut, as on every sleeve */
  function notch(text) {
    var box = el('span', 'notch');
    box.appendChild(el('span', null, text));
    return box;
  }

  function coverImage(artist, cls) {
    var img = new Image();
    img.src = artist.cover;
    img.alt = '';                         /* the name is set next to it */
    img.className = cls || '';
    img.width = 1100;
    img.height = 1100;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function listenLabel(artist) {
    return 'Listen to ' + (artist.name || 'this artist') + ' on SoundCloud';
  }

  /* the outlined button is two nested clipped boxes, so its label has to
     live one level down rather than directly on the element */
  function button(tag, cls, text) {
    var node = el(tag, cls);
    node.appendChild(el('span', null, text));
    return node;
  }

  /* ---- the sleeve beside the archive ----------------------------------
     A hard cut, not a fade — a label swaps records, it does not dissolve
     them. The covers are warmed on idle so the cut is instant. */
  var sleeve = (function () {
    var img = document.getElementById('sleeve-img');
    var no = document.getElementById('sleeve-no');
    var name = document.getElementById('sleeve-name');
    if (!img) return { show: function () {}, rest: function () {} };

    var current = null;

    function show(artist) {
      if (!artist || artist === current) return;
      current = artist;
      if (artist.cover) img.src = artist.cover;
      if (no) no.textContent = artist.number || '';
      if (name) name.textContent = artist.name || '';
    }

    return {
      show: show,
      rest: function () { current = null; show(ARTISTS[0]); }
    };
  })();

  function warmCovers() {
    ARTISTS.forEach(function (a) {
      if (a.cover) { var i = new Image(); i.src = a.cover; }
    });
  }

  /* ---- the archive ----------------------------------------------------- */
  function rowNode(artist) {
    var item = el('li');
    var url = safeUrl(artist.url);
    var row = el(url ? 'a' : 'div', 'row');
    if (url) {
      row.href = url;
      row.target = '_blank';
      row.rel = 'noopener';
      row.setAttribute('aria-label', listenLabel(artist));
    }

    /* the sleeve's stand-in on a narrow screen, where there is no room
       for a column beside the list */
    if (artist.cover) {
      var fig = el('figure', 'row__thumb');
      fig.appendChild(coverImage(artist));
      row.appendChild(fig);
    }

    row.appendChild(notch(artist.number || ''));
    row.appendChild(el('h3', 'row__name', artist.name || ''));
    row.appendChild(el('span', 'row__go', 'SoundCloud'));

    function enter() { sleeve.show(artist); }
    row.addEventListener('mouseenter', enter);
    row.addEventListener('focus', enter);

    item.appendChild(row);
    return item;
  }

  function renderArchive() {
    var list = document.getElementById('session-list');
    if (!list || !ARTISTS.length) return;

    var frag = document.createDocumentFragment();
    ARTISTS.forEach(function (a) { frag.appendChild(rowNode(a)); });
    list.appendChild(frag);

    list.addEventListener('mouseleave', function () { sleeve.rest(); });
  }

  /* ---- the roster (artists page) --------------------------------------- */
  function rosterNode(artist) {
    var row = el('li', 'roster__row');
    var url = safeUrl(artist.url);

    var fig = el('figure', 'roster__shot');
    fig.appendChild(frame());
    if (artist.cover) fig.appendChild(coverImage(artist, 'torn'));
    row.appendChild(fig);

    var body = el('div');
    if (artist.number) body.appendChild(notch(artist.number));
    body.appendChild(el('h2', 'roster__name', artist.name || ''));
    /* bios are hand-written and may not be filled in yet */
    if (artist.bio) body.appendChild(el('p', 'roster__bio', artist.bio));
    if (url) {
      var a = button('a', 'btn', 'Listen');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', listenLabel(artist));
      body.appendChild(a);
    }
    row.appendChild(body);
    return row;
  }

  function fill(node, build) {
    if (!node || !ARTISTS.length) return;
    var frag = document.createDocumentFragment();
    ARTISTS.forEach(function (artist) { frag.appendChild(build(artist)); });
    node.appendChild(frag);
  }

  /* ---- the newest session, on the first screen and in the facts -------- */
  function renderLatest() {
    var newest = ARTISTS[0];
    var count = document.getElementById('fact-count');
    var latest = document.getElementById('fact-latest');
    var heroNo = document.getElementById('hero-no');
    var heroName = document.getElementById('hero-name');

    if (count) count.textContent = ARTISTS.length || '—';
    if (!newest) return;

    if (heroNo) heroNo.textContent = newest.number || '';
    if (heroName) heroName.textContent = newest.name || '';
    if (latest) {
      latest.textContent = (newest.number ? newest.number + ' — ' : '') + (newest.name || '');
    }
  }

  /* ---- contact dialog ---------------------------------------------------
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

  function boot() {
    sleeve.rest();
    renderArchive();
    fill(document.getElementById('roster'), rosterNode);
    renderLatest();
    setUpContact();

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    if ('requestIdleCallback' in window) window.requestIdleCallback(warmCovers);
    else setTimeout(warmCovers, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
