/* =============================================================
   KEYV — main
   Reads config.js, applies localStorage overrides from admin.html,
   renders every section, wires the booking form, then adds motion.
   ============================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'keyv.config.overrides';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js');

  /* ---- config ----------------------------------------------------- */

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /* Deep-merge overrides on top of defaults. Arrays are replaced whole —
     a roster of 3 must be able to shrink from a roster of 4. */
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

  var defaults = window.KEYV_CONFIG || {};
  var overrides = {};
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) overrides = JSON.parse(raw) || {};
  } catch (err) {
    console.warn('KEYV: ignoring unreadable config overrides —', err);
  }

  var cfg = merge(defaults, overrides);
  window.KEYV = cfg;

  /* ---- helpers ---------------------------------------------------- */

  function get(path) {
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, cfg);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function $(sel) { return document.querySelector(sel); }

  /* Config can be edited from the admin panel, so treat its URLs as
     untrusted: relative paths and fragments are fine, but an explicit
     scheme has to be http(s) or mailto — no javascript:, data:, vbscript:. */
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
      if (/^https?:/i.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    } else {
      a.setAttribute('aria-disabled', 'true');
    }
    return a;
  }

  /* Missing photo → the frame stays, filled with a dark placeholder,
     so a half-populated img/ folder never shows a broken-image icon. */
  function img(src, alt, ratioClass) {
    var node = el('img');
    node.alt = alt || '';
    node.loading = 'lazy';
    node.decoding = 'async';
    node.src = safeUrl(src) || '';
    if (ratioClass) node.className = ratioClass;
    node.addEventListener('error', function () {
      node.remove();
    }, { once: true });
    return node;
  }

  /* ---- static bindings -------------------------------------------- */

  function applyColors() {
    var colors = get('colors');
    if (!isPlainObject(colors)) return;
    var root = document.documentElement;
    var map = { bg: '--bg', surface: '--surface', text: '--text', muted: '--muted', accent: '--accent' };
    Object.keys(map).forEach(function (key) {
      var value = colors[key];
      if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim())) {
        root.style.setProperty(map[key], value.trim());
      }
    });
    if (typeof colors.accent === 'string' && /^#[0-9a-f]{6}$/i.test(colors.accent.trim())) {
      var hex = colors.accent.trim();
      var r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);
      root.style.setProperty('--line', 'rgba(' + r + ',' + g + ',' + b + ',.4)');
    }
  }

  function applyTextBindings() {
    document.querySelectorAll('[data-config]').forEach(function (node) {
      var value = get(node.getAttribute('data-config'));
      if (typeof value === 'string' && value) node.textContent = value;
    });
    document.querySelectorAll('[data-config-src]').forEach(function (node) {
      var value = safeUrl(get(node.getAttribute('data-config-src')));
      if (value) node.src = value;
    });

    var hero = safeUrl(get('artist.hero'));
    var heroImg = $('#hero-img');
    if (hero && heroImg) heroImg.src = hero;
    if (heroImg) heroImg.addEventListener('error', function () { heroImg.style.display = 'none'; }, { once: true });

    var name = get('artist.name');
    if (name) document.title = name + ' — Techno DJ & Producer';
  }

  function applyEmail() {
    var email = get('booking.email');
    if (!email) return;
    ['#bio-email', '#booking-email', '#footer-email'].forEach(function (sel) {
      var node = $(sel);
      if (!node) return;
      node.href = 'mailto:' + email;
      node.textContent = email;
    });
  }

  function renderSocials() {
    var socials = get('socials');
    if (!Array.isArray(socials)) return;
    ['#bio-socials', '#booking-socials', '#footer-socials'].forEach(function (sel) {
      var list = $(sel);
      if (!list) return;
      list.textContent = '';
      socials.forEach(function (s) {
        if (!s || !s.label) return;
        var li = el('li');
        li.appendChild(extLink(s.url, s.label, 'link-grow'));
        list.appendChild(li);
      });
    });
  }

  /* ---- releases --------------------------------------------------- */

  function releaseCard(release, compact) {
    var card = el('article', 'card');

    var media = el('div', 'card__media');
    media.appendChild(img(release.cover, release.title ? release.title + ' cover art' : ''));
    if (release.year) media.appendChild(el('span', 'card__year', release.year));
    card.appendChild(media);

    card.appendChild(el('h3', 'card__title', release.title || 'Untitled'));
    if (release.mix) card.appendChild(el('p', 'card__mix', release.mix));

    if (!compact) {
      if (release.genre) card.appendChild(el('span', 'card__genre', release.genre));
      if (Array.isArray(release.links) && release.links.length) {
        var links = el('div', 'card__links');
        release.links.forEach(function (l) {
          if (l && l.label) links.appendChild(extLink(l.url, l.label));
        });
        card.appendChild(links);
      }
    }
    return card;
  }

  function renderReleases() {
    var releases = Array.isArray(get('releases')) ? get('releases') : [];

    var strip = $('#latest-strip');
    if (strip) {
      strip.textContent = '';
      releases.slice(0, 4).forEach(function (r) { strip.appendChild(releaseCard(r, true)); });
    }

    var grid = $('#release-grid');
    if (grid) {
      grid.textContent = '';
      releases.forEach(function (r) { grid.appendChild(releaseCard(r, false)); });
    }
  }

  function renderPlatforms() {
    var list = $('#platform-list');
    var platforms = get('platforms');
    if (!list || !Array.isArray(platforms)) return;
    list.textContent = '';
    platforms.forEach(function (p) {
      if (!p || !p.label) return;
      var li = el('li');
      li.appendChild(extLink(p.url, p.label));
      list.appendChild(li);
    });
  }

  /* ---- featured player -------------------------------------------- */

  /* The embed is loaded on click, not on page load: it keeps a ~400KB
     third-party request off the critical path, and when SoundCloud is
     unreachable the visitor still gets a styled block and a direct link
     instead of a blank white iframe. */
  function renderPlayer() {
    var frame = $('#featured-player');
    if (!frame) return;

    var trackTitle = get('featuredTrackTitle') || 'Featured';
    var url = safeUrl(get('featuredTrackUrl'));
    frame.textContent = '';

    if (!/^https?:\/\/(www\.)?soundcloud\.com\//i.test(url)) {
      frame.appendChild(el('p', 'player__fallback', 'Add a SoundCloud URL in config.js'));
      return;
    }

    function embed(autoplay) {
      var params =
        'url=' + encodeURIComponent(url) +
        '&color=%23e5e418&auto_play=' + (autoplay ? 'true' : 'false') +
        '&hide_related=true&show_comments=false&show_user=true' +
        '&show_reposts=false&show_teaser=false&visual=false';

      var iframe = el('iframe');
      iframe.title = 'SoundCloud player — ' + trackTitle;
      iframe.width = '100%';
      iframe.height = '166';
      iframe.allow = 'autoplay';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', 'no');
      iframe.src = 'https://w.soundcloud.com/player/?' + params;

      frame.textContent = '';
      frame.appendChild(iframe);
    }

    var facade = el('div', 'player__facade');

    var play = el('button', 'player__play');
    play.type = 'button';
    play.setAttribute('aria-label', 'Play ' + trackTitle + ' (loads the SoundCloud player)');
    play.appendChild(el('span', 'player__icon'));
    play.appendChild(el('span', 'player__cta', 'Play'));
    play.addEventListener('click', function () { embed(true); });

    var meta = el('div', 'player__meta');
    meta.appendChild(el('p', 'player__track', trackTitle));
    meta.appendChild(extLink(url, 'Open on SoundCloud ↗', 'player__out'));

    facade.appendChild(play);
    facade.appendChild(meta);
    frame.appendChild(facade);
  }

  /* ---- label ------------------------------------------------------ */

  function renderRoster() {
    var grid = $('#roster-grid');
    var roster = get('label.roster');
    if (grid && Array.isArray(roster)) {
      grid.textContent = '';
      roster.forEach(function (artist) {
        if (!artist || !artist.name) return;
        var photo = safeUrl(artist.photo);
        var card = el('article', 'roster-card' + (photo ? '' : ' roster-card--text'));

        var media = el('div', 'roster-card__media');
        if (photo) {
          media.appendChild(img(photo, artist.name));
        } else {
          /* no photo yet — a typographic tile reads as a design choice,
             an empty frame reads as a bug */
          media.appendChild(el('span', 'roster-card__initial', artist.name.charAt(0)));
        }
        card.appendChild(media);

        card.appendChild(el('h4', 'roster-card__name', artist.name));
        if (artist.handle) card.appendChild(el('p', 'roster-card__handle', artist.handle));
        grid.appendChild(card);
      });
    }

    var logo = $('#label-logo');
    if (logo) {
      var logoSrc = safeUrl(get('label.logo'));
      if (logoSrc) {
        logo.src = logoSrc;
        logo.addEventListener('error', function () { logo.remove(); }, { once: true });
      } else {
        logo.remove();
      }
    }

    var link = $('#label-link');
    if (link) {
      var href = safeUrl(get('label.url'));
      link.textContent = get('label.linkLabel') || 'Listen';
      if (href) {
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else {
        link.removeAttribute('href');
      }
    }
  }

  /* ---- shows ------------------------------------------------------ */

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function parseDate(value) {
    if (typeof value !== 'string') return null;
    var m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function renderEvents() {
    var list = $('#event-list');
    if (!list) return;
    list.textContent = '';

    var events = Array.isArray(get('events')) ? get('events').slice() : [];

    /* keep today's shows visible; drop yesterday's */
    var cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);

    events = events.filter(function (e) {
      var d = parseDate(e && e.date);
      return !d || d >= cutoff;
    }).sort(function (a, b) {
      var da = parseDate(a.date), db = parseDate(b.date);
      if (!da || !db) return 0;
      return da - db;
    });

    if (!events.length) {
      list.appendChild(el('li', 'events__empty', 'No dates announced — check back soon.'));
      return;
    }

    events.forEach(function (ev) {
      var row = el('li', 'event');
      var d = parseDate(ev.date);

      var date = el('div', 'event__date');
      date.appendChild(el('span', 'event__day', d ? String(d.getDate()).padStart(2, '0') : '--'));
      date.appendChild(el('span', 'event__month', d ? MONTHS[d.getMonth()] : (ev.date || 'TBA')));
      row.appendChild(date);

      var main = el('div', 'event__main');
      main.appendChild(el('h3', 'event__title', ev.title || 'TBA'));
      if (ev.artist) main.appendChild(el('p', 'event__artist', ev.artist));
      row.appendChild(main);

      var place = [ev.city, ev.country].filter(Boolean).join(', ');
      row.appendChild(el('div', 'event__place', place));

      var action = el('div', 'event__action');
      if (ev.status === 'soldout') {
        action.appendChild(el('span', 'tag tag--soldout', 'Sold Out'));
      } else if (ev.status === 'free') {
        action.appendChild(el('span', 'tag tag--free', 'Free Entrance'));
      } else {
        var url = safeUrl(ev.ticketUrl);
        if (url) {
          var a = extLink(url, 'Buy Tickets', 'tag tag--tickets');
          a.setAttribute('aria-label', 'Buy tickets for ' + (ev.title || 'this show'));
          action.appendChild(a);
        } else {
          action.appendChild(el('span', 'tag tag--free', 'Announced'));
        }
      }
      row.appendChild(action);

      list.appendChild(row);
    });
  }

  /* ---- booking form ----------------------------------------------- */

  function renderForm() {
    var form = $('#booking-form');
    if (!form) return;

    var status = $('#form-status');
    var button = $('#form-submit');

    function say(message, state) {
      if (!status) return;
      status.textContent = message;
      status.className = 'form__status' + (state ? ' is-' + state : '');
    }

    function mailtoFallback(data) {
      var email = get('booking.email');
      if (!email) return false;
      var body =
        'Name: ' + data.name + '\n' +
        'Email: ' + data.email + '\n' +
        'Date: ' + (data.date || '—') + '\n' +
        'Venue / City: ' + (data.venue || '—') + '\n\n' +
        data.message;
      window.location.href =
        'mailto:' + email +
        '?subject=' + encodeURIComponent('Booking enquiry — ' + data.name) +
        '&body=' + encodeURIComponent(body);
      return true;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var fields = ['name', 'email', 'message'];
      var invalid = null;

      fields.forEach(function (name) {
        var input = form.elements[name];
        var ok = input && input.value.trim() && (name !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()));
        if (input) input.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !invalid) invalid = input;
      });

      if (invalid) {
        say('Fill in your name, a valid email and a message.', 'err');
        invalid.focus();
        return;
      }

      var data = {};
      ['name', 'email', 'date', 'venue', 'message'].forEach(function (name) {
        data[name] = form.elements[name] ? form.elements[name].value.trim() : '';
      });

      var endpoint = safeUrl(get('booking.formspreeEndpoint'));

      if (!/^https?:/i.test(endpoint)) {
        if (mailtoFallback(data)) {
          say('Opening your email app…', 'ok');
        } else {
          say('No booking endpoint configured yet.', 'err');
        }
        return;
      }

      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      say('Sending…');

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        say('Sent. You’ll get a reply soon.', 'ok');
      }).catch(function () {
        if (mailtoFallback(data)) {
          say('Network issue — opening your email app instead.', 'err');
        } else {
          say('Could not send. Email ' + (get('booking.email') || 'us') + ' directly.', 'err');
        }
      }).then(function () {
        if (button) { button.disabled = false; button.textContent = 'Send enquiry'; }
      });
    });
  }

  /* ---- motion ------------------------------------------------------ */

  function revealTargets() {
    return Array.prototype.slice.call(
      document.querySelectorAll('.reveal, .card, .roster-card, .event')
    );
  }

  function fallbackReveal() {
    var targets = revealTargets();
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
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    targets.forEach(function (node) { io.observe(node); });

    /* A jump to an anchor can carry an element from below the viewport to
       above it between frames — the observer never sees it intersect and it
       would stay invisible. Sweep anything already scrolled past. */
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

  function initMotion() {
    if (reduced) {
      revealTargets().forEach(function (node) { node.classList.add('is-in'); });
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      fallbackReveal();
      return;
    }

    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    /* hand the pre-hide over to GSAP: drop the CSS transition so it does
       not fight the tween, then re-apply the hidden state inline */
    document.documentElement.classList.add('gsap');
    var targets = revealTargets();
    targets.forEach(function (node) { node.classList.add('is-in'); });
    gsap.set(targets, { opacity: 0, y: 28 });

    document.querySelectorAll('.section, .footer').forEach(function (section) {
      var children = section.querySelectorAll('.reveal, .card, .roster-card, .event');
      if (!children.length) return;
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: .9,
        ease: 'power3.out',
        stagger: .07,
        scrollTrigger: { trigger: section, start: 'top 78%', once: true }
      });
    });

    /* hero photo parallax */
    var heroImg = document.querySelector('.hero__img');
    if (heroImg) {
      gsap.to(heroImg, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }

    /* ghost numbers drift + fade */
    document.querySelectorAll('[data-parallax]').forEach(function (node) {
      gsap.fromTo(node,
        { y: 60, opacity: .25 },
        {
          y: -80, opacity: .75, ease: 'none',
          scrollTrigger: { trigger: node.closest('.section') || node, start: 'top bottom', end: 'bottom top', scrub: true }
        }
      );
    });

    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* nav hides on scroll-down, returns on scroll-up */
  function initNav() {
    var nav = $('#nav');
    if (!nav) return;
    var last = window.scrollY;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        nav.classList.toggle('is-hidden', y > last && y > 240);
        last = y;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- boot -------------------------------------------------------- */

  function init() {
    applyColors();
    applyTextBindings();
    applyEmail();
    renderSocials();
    renderReleases();
    renderPlayer();
    renderPlatforms();
    renderRoster();
    renderEvents();
    renderForm();
    initNav();
    initMotion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
