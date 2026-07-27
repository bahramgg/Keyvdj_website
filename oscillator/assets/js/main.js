/* =============================================================
   OSCILLATOR — builds the page from artists.js and info.js
   Home page: the latest release row, the artist cards, the listening
   room. artists.html: the full roster. No framework, no build step.
   ============================================================= */

(function () {
  'use strict';

  var ARTISTS = Array.isArray(window.OSCILLATOR_ARTISTS) ? window.OSCILLATOR_ARTISTS : [];
  var INFO = window.OSCILLATOR_INFO || {};
  var FEATURED = 6;                     // two rows of three on a wide screen

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

  /* Photographs are duotoned to the accent — the treatment is a class on
     the wrapper plus a blend mode, so the source images stay untouched. */
  function duotone(artist, cls) {
    var fig = el('figure', 'duo' + (cls ? ' ' + cls : ''));
    if (!artist.cover) return fig;
    var img = new Image();
    img.src = artist.cover;
    img.alt = '';
    img.width = 700;
    img.height = 700;
    img.loading = 'lazy';
    img.decoding = 'async';
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

  /* ---- latest release ---------------------------------------------- */
  function renderRelease() {
    var host = document.getElementById('release');
    var artist = ARTISTS[0];
    if (!host || !artist) return;
    var url = safeUrl(artist.url);

    var spec = el('div', 'spec');
    /* Only facts we actually hold — the reference lists runtime and a
       pressing date, neither of which exists for these. Where it lives is
       not a fact worth a row of its own; the Listen button says it. */
    [
      ['Artist', artist.name || ''],
      ['Mix', artist.number ? 'No. ' + artist.number : ''],
      ['Format', 'DJ mix · digital']
    ].forEach(function (pair) {
      if (!pair[1]) return;
      var row = el('div', 'spec__row');
      row.appendChild(el('span', 'spec__key', pair[0]));
      row.appendChild(el('span', 'spec__val', pair[1]));
      spec.appendChild(row);
    });

    var left = el('div');
    left.appendChild(spec);
    if (url) {
      var go = el('p', 'after');
      go.appendChild(externalLink('btn btn--acid', 'Listen', url, listenLabel(artist)));
      left.appendChild(go);
    }

    host.appendChild(duotone(artist, 'release__shot'));   /* artwork leads */
    host.appendChild(left);
  }

  /* ---- artist cards ------------------------------------------------- */
  function cardNode(artist) {
    var item = el('li');
    var url = safeUrl(artist.url);
    var card = url ? externalLink('card', null, url, listenLabel(artist)) : el('div', 'card');

    /* the cover sits behind the card, knocked back — the name is what
       should be read, the picture is there as texture */
    card.appendChild(duotone(artist, 'card__shot'));

    var top = el('div', 'card__top');
    top.appendChild(el('span', 'tag', artist.number ? '— ' + artist.number : '—'));
    top.appendChild(el('span', 'tag', 'Mix'));
    card.appendChild(top);

    /* The bios are hand-written and may not be filled in yet; the card
       simply closes up rather than leaving a gap where one should be. */
    if (artist.bio) card.appendChild(el('p', 'card__bio', artist.bio));
    card.appendChild(el('h3', 'card__name', artist.name || ''));

    item.appendChild(card);
    return item;
  }

  /* ---- roster (artists page) ---------------------------------------- */
  function rosterNode(artist) {
    var row = el('li', 'roster__row');
    var url = safeUrl(artist.url);

    row.appendChild(duotone(artist, 'roster__shot'));

    var body = el('div');
    if (artist.number) body.appendChild(el('span', 'roster__no', artist.number));
    body.appendChild(el('h2', 'roster__name', artist.name || ''));
    if (artist.bio) body.appendChild(el('p', 'roster__bio', artist.bio));
    row.appendChild(body);

    if (url) row.appendChild(externalLink('btn', 'Listen', url, listenLabel(artist)));
    return row;
  }

  /* ---- listening room ------------------------------------------------
     No SoundCloud iframe is loaded until the reader presses play, so the
     page costs nothing to anyone who never does. */
  function renderRoom() {
    var host = document.getElementById('room-shot');
    var artist = ARTISTS[0];
    if (!host || !artist) return;
    var url = safeUrl(artist.url);
    if (!url) return;

    var shot = duotone(artist, 'room__shot');
    var play = el('button', 'room__play');
    play.type = 'button';
    play.setAttribute('aria-label', listenLabel(artist));
    play.appendChild(el('span', null, 'Play'));
    play.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.className = 'room__frame';
      frame.title = listenLabel(artist);
      frame.allow = 'autoplay';
      frame.loading = 'lazy';
      frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
                  '&color=%23feed07&auto_play=true&hide_related=true&show_comments=false' +
                  '&show_user=true&show_reposts=false&visual=false';
      shot.replaceWith(frame);
    });
    shot.appendChild(play);
    host.appendChild(shot);
  }

  /* ---- events -------------------------------------------------------- */
  /* A label page saying "no upcoming shows" is worse than one that simply
     does not have the section, so an empty list removes it. */
  function renderEvents() {
    var band = document.getElementById('events-band');
    var list = document.getElementById('event-list');
    if (!band || !list) return;

    var today = new Date().toISOString().slice(0, 10);
    var upcoming = (Array.isArray(INFO.events) ? INFO.events : [])
      .filter(function (e) { return e && e.date && e.date >= today; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (!upcoming.length) return;

    upcoming.forEach(function (e) {
      var row = el('li', 'event');
      row.appendChild(el('span', 'event__date', e.date));
      row.appendChild(el('span', 'event__what', e.what || ''));
      if (e.where) row.appendChild(el('span', 'event__where', e.where));
      list.appendChild(row);
    });
    band.classList.remove('is-empty');
  }

  /* ---- contact dialog -------------------------------------------------
     One button for demos, bookings and press alike. The form composes a
     message and hands it to whichever route is configured: a Formspree
     endpoint if there is one, otherwise the mail client. With neither
     set it says so instead of pretending to have sent anything. */
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
      else modal.setAttribute('open', '');       /* very old browsers */
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
        fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data
        }).then(function (res) {
          if (!res.ok) throw new Error('rejected');
          form.reset();
          say('Sent. We will come back to you.');
        }).catch(function () {
          say('That did not send. Try Instagram instead.', true);
        });
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

  function fill(node, list, build) {
    if (!node || !list.length) return;
    var frag = document.createDocumentFragment();
    list.forEach(function (artist) { frag.appendChild(build(artist)); });
    node.appendChild(frag);
  }

  function render() {
    fill(document.getElementById('featured-artists'), ARTISTS.slice(0, FEATURED), cardNode);
    fill(document.getElementById('roster'), ARTISTS, rosterNode);
    renderRelease();
    renderRoom();
    renderEvents();
    setUpContact();

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* The hero loop is decoration. Autoplay can be refused (low power mode,
     data saver); it is muted, so a rejection is not an error. */
  function primeVideo() {
    var video = document.querySelector('.hero__video');
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }
    /* the clip races through its own states — slowing it lets each be read */
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
