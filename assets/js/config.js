/* =============================================================
   KEYV — site content
   Edit this file directly, or use admin.html (localStorage overrides).
   Everything the site renders comes from here.
   ============================================================= */

window.KEYV_CONFIG = {
  /* ---- identity ---------------------------------------------------- */
  artist: {
    name: "KEYV",
    wordmark: "KEYV",
    genreTag: "#techno / #hardgroove",
    location: "Tehran / Berlin",
    bio:
      "KEYV is a DJ and producer working in the harder, faster end of the " +
      "techno spectrum — hypnotic loops, rolling percussion and industrial " +
      "textures pushed through a raw, high-energy set. Founder of the " +
      "Oscillator label, he has spent the last decade building a sound that " +
      "sits between warehouse tradition and contemporary hardgroove.",
    bioShort: "DJ · Producer · Founder of Oscillator.",
    portrait: "img/bio.webp",
    hero: "img/hero.webp"
  },

  /* ---- contact ----------------------------------------------------- */
  booking: {
    email: "booking@keyvdj.com",
    /* Create a form at https://formspree.io and paste the endpoint here.
       Leave empty to fall back to a mailto: link automatically. */
    formspreeEndpoint: ""
  },

  socials: [
    { label: "Instagram",  url: "https://instagram.com/",  handle: "@keyvdj" },
    { label: "SoundCloud", url: "https://soundcloud.com/", handle: "keyvdj"  },
    { label: "Beatport",   url: "https://beatport.com/",   handle: "KEYV"    },
    { label: "Spotify",    url: "https://spotify.com/",    handle: "KEYV"    }
  ],

  /* ---- music ------------------------------------------------------- */
  /* Paste any SoundCloud track/playlist URL — it is wrapped in the
     official embed player automatically. */
  featuredTrackUrl: "https://soundcloud.com/keyvdj",
  featuredTrackTitle: "Latest Mix",

  releases: [
    {
      title: "Null Sequence",
      mix: "Original Mix",
      genre: "Hardgroove",
      year: "2025",
      cover: "img/releases/release-01.webp",
      links: [
        { label: "Beatport",   url: "https://beatport.com/" },
        { label: "SoundCloud", url: "https://soundcloud.com/" }
      ]
    },
    {
      title: "Drift Protocol",
      mix: "Extended Mix",
      genre: "Techno",
      year: "2025",
      cover: "img/releases/release-02.webp",
      links: [
        { label: "Beatport",   url: "https://beatport.com/" },
        { label: "SoundCloud", url: "https://soundcloud.com/" }
      ]
    },
    {
      title: "Static Field",
      mix: "KEYV Remix",
      genre: "Industrial",
      year: "2024",
      cover: "img/releases/release-03.webp",
      links: [
        { label: "Beatport",   url: "https://beatport.com/" },
        { label: "SoundCloud", url: "https://soundcloud.com/" }
      ]
    },
    {
      title: "Oscillate",
      mix: "Original Mix",
      genre: "Hardgroove",
      year: "2024",
      cover: "img/releases/release-04.webp",
      links: [
        { label: "Beatport",   url: "https://beatport.com/" },
        { label: "SoundCloud", url: "https://soundcloud.com/" }
      ]
    }
  ],

  platforms: [
    { label: "SoundCloud", url: "https://soundcloud.com/" },
    { label: "Spotify",    url: "https://spotify.com/"    },
    { label: "Mixcloud",   url: "https://mixcloud.com/"   },
    { label: "Beatport",   url: "https://beatport.com/"   }
  ],

  /* ---- label ------------------------------------------------------- */
  label: {
    name: "Oscillator",
    tagline: "Raw techno from the edge of the signal.",
    description:
      "Oscillator is an independent techno label founded by KEYV. It exists " +
      "for records that are built for the floor first — stripped, loud and " +
      "unpolished — and for a roster of artists who play the same way.",
    url: "https://soundcloud.com/",
    linkLabel: "Listen on SoundCloud",
    roster: [
      { name: "KEYV",     handle: "@keyvdj",     photo: "img/roster/artist-01.webp" },
      { name: "Nima R",   handle: "@nima.r",     photo: "img/roster/artist-02.webp" },
      { name: "VOLTA",    handle: "@voltasound", photo: "img/roster/artist-03.webp" },
      { name: "Sepehr K", handle: "@sepehr.k",   photo: "img/roster/artist-04.webp" }
    ]
  },

  /* ---- shows ------------------------------------------------------- */
  /* status: "tickets" | "soldout" | "free" */
  events: [
    {
      date: "2026-08-14",
      title: "Oscillator Night",
      artist: "KEYV b2b VOLTA",
      city: "Berlin",
      country: "DE",
      status: "tickets",
      ticketUrl: "https://ra.co/"
    },
    {
      date: "2026-08-29",
      title: "Warehouse 09",
      artist: "KEYV",
      city: "Amsterdam",
      country: "NL",
      status: "soldout",
      ticketUrl: ""
    },
    {
      date: "2026-09-12",
      title: "Signal / Noise",
      artist: "KEYV",
      city: "Tbilisi",
      country: "GE",
      status: "tickets",
      ticketUrl: "https://ra.co/"
    },
    {
      date: "2026-09-27",
      title: "Open Air — Rooftop",
      artist: "KEYV",
      city: "Tehran",
      country: "IR",
      status: "free",
      ticketUrl: ""
    }
  ],

  /* ---- theme ------------------------------------------------------- */
  colors: {
    bg: "#0A0A0A",
    surface: "#141414",
    text: "#EDEDED",
    muted: "#8A8A8A",
    accent: "#E5E418"
  },

  /* ---- footer ------------------------------------------------------ */
  credit: "© " + new Date().getFullYear() + " KEYV. All rights reserved."
};
