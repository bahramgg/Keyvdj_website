/* =============================================================
   OSCILLATOR — builds the page from artists.js and info.js
   Home: the newest mix as the hero, then the whole archive.
   artists.html: the index, with bios when they exist.
   No framework, no build step.
   ============================================================= */

(function () {
  'use strict';

  var ARTISTS = Array.isArray(window.OSCILLATOR_ARTISTS) ? window.OSCILLATOR_ARTISTS : [];
  var INFO = window.OSCILLATOR_INFO || {};

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

  function cover(artist, cls, eager) {
    var fig = el('figure', cls);
    if (!artist.cover) return fig;
    var img = new Image();
    img.src = artist.cover;
    img.alt = '';                       /* the name is set next to it */
    img.width = 1100;
    img.height = 1100;
    img.decoding = 'async';
    if (eager) img.fetchPriority = 'high';
    else img.loading = 'lazy';
    fig.appendChild(img);
    return fig;
  }

  function listenLabel(artist) {
    return 'Listen to ' + (artist.name || 'this artist') + ' on SoundCloud';
  }

  function externalLink(cls, text, url, label) {
    var a = el('a', cls, text);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    if (label) a.setAttribute('aria-label', label);
    return a;
  }

  /* ---- catalogue -----------------------------------------------------
     Each session is a row of type. The artwork is not laid out with the
     rows — it is held to one side and swapped in as the cursor moves, so
     the archive reads as a list rather than as a wall of squares. */
  function peekAt(peek, artist) {
    if (!peek || !artist.cover) return;
    var img = peek.firstChild;
    if (!img) {
      img = new Image();
      img.alt = '';
      img.decoding = 'async';
      peek.appendChild(img);
    }
    img.src = artist.cover;
    peek.classList.add('is-on');
  }

  function rowNode(artist, peek) {
    var item = el('li');
    var url = safeUrl(artist.url);
    var row = el(url ? 'a' : 'div', 'row');
    if (url) {
      row.href = url;
      row.target = '_blank';
      row.rel = 'noopener';
      row.setAttribute('aria-label', listenLabel(artist));
    }

    row.appendChild(el('span', 'row__no', artist.number || ''));
    row.appendChild(el('h3', 'row__name', artist.name || ''));
    row.appendChild(el('span', 'row__go', 'Listen'));

    /* the field behind the cover retunes to this artist's own frequency */
    function enter() {
      if (peek) peekAt(peek, artist);
      var scope = window.OSCILLATOR_SCOPE;
      if (scope) scope.retune(artist.number || artist.slug || artist.name);
    }
    row.addEventListener('mouseenter', enter);
    row.addEventListener('focus', enter);

    item.appendChild(row);
    return item;
  }

  function renderSessions() {
    var list = document.getElementById('session-list');
    var peek = document.getElementById('session-peek');
    if (!list || !ARTISTS.length) return;

    var frag = document.createDocumentFragment();
    ARTISTS.forEach(function (a) { frag.appendChild(rowNode(a, peek)); });
    list.appendChild(frag);

    list.addEventListener('mouseleave', function () {
      if (peek) peek.classList.remove('is-on');
      var scope = window.OSCILLATOR_SCOPE;
      if (scope) scope.retune(null);          /* back to the label's own */
    });

    var count = document.getElementById('spec-count');
    if (count) count.textContent = ARTISTS.length + ' sessions';

    var latest = document.getElementById('spec-latest');
    var newest = ARTISTS[0];
    if (latest && newest) {
      latest.textContent = (newest.number ? newest.number + ' — ' : '') + (newest.name || '');
    }
  }

  /* ---- roster (artists page) ---------------------------------------- */
  function rosterNode(artist) {
    var row = el('li', 'roster__row');
    var url = safeUrl(artist.url);

    row.appendChild(cover(artist, 'roster__shot'));

    var body = el('div');
    if (artist.number) body.appendChild(el('span', 'roster__no', artist.number));
    body.appendChild(el('h2', 'roster__name', artist.name || ''));
    /* bios are hand-written and may not be filled in yet */
    if (artist.bio) body.appendChild(el('p', 'roster__bio', artist.bio));
    row.appendChild(body);

    if (url) row.appendChild(externalLink('btn', 'Listen', url, listenLabel(artist)));
    return row;
  }

  function fill(node, list, build) {
    if (!node || !list.length) return;
    var frag = document.createDocumentFragment();
    list.forEach(function (artist) { frag.appendChild(build(artist)); });
    node.appendChild(frag);
  }

  /* ---- contact dialog -------------------------------------------------
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
    renderSessions();
    fill(document.getElementById('roster'), ARTISTS, rosterNode);
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
