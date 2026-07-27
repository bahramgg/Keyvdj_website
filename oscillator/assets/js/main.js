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

  /* ---- hero: the newest mix ---------------------------------------- */
  function renderHero() {
    var art = document.getElementById('hero-art');
    var name = document.getElementById('hero-name');
    var kicker = document.getElementById('hero-kicker');
    var go = document.getElementById('hero-go');
    var artist = ARTISTS[0];
    if (!art || !artist) return;

    var img = cover(artist, 'hero__art-inner', true).firstChild;
    if (img) art.appendChild(img);

    if (kicker && artist.number) kicker.textContent = 'Latest — ' + artist.number;
    if (name) name.textContent = artist.name || 'Oscillator';

    var url = safeUrl(artist.url);
    if (go && url) go.appendChild(externalLink('btn btn--acid', 'Listen', url, listenLabel(artist)));
  }

  /* ---- archive: every mix ------------------------------------------ */
  function tileNode(artist) {
    var item = el('li');
    var url = safeUrl(artist.url);
    var tile = url ? externalLink('tile', null, url, listenLabel(artist)) : el('div', 'tile');

    tile.appendChild(cover(artist, 'tile__art'));

    /* The covers already carry the name and the number, so this only
       appears on hover — it is a target, not a caption. */
    var over = el('div', 'tile__over');
    over.setAttribute('aria-hidden', 'true');
    over.appendChild(el('span', 'tile__name', artist.name || ''));
    over.appendChild(el('span', 'tile__play tag', 'Play'));
    tile.appendChild(over);

    item.appendChild(tile);
    return item;
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
    renderHero();
    fill(document.getElementById('archive-grid'), ARTISTS, tileNode);
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
