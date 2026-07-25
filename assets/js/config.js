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
    { label: "SoundCloud", url: "https://soundcloud.com/keyvdj",                    handle: "keyvdj" },
    { label: "Beatport",   url: "https://www.beatport.com/artist/keyv/1267942",     handle: "KEYV"   },
    { label: "Bandcamp",   url: "https://tugwaverecords.bandcamp.com/track/qryptic", handle: "Tugwave" },
    { label: "YouTube",    url: "https://youtu.be/qVqKLeuRrA0",                     handle: "KEYV"   }
  ],

  /* ---- music ------------------------------------------------------- */
  /* Paste any SoundCloud track/playlist URL — it is wrapped in the
     official embed player automatically. */
  featuredTrackUrl: "https://soundcloud.com/keyvdj/demonstrator-2",
  featuredTrackTitle: "DEMONSTRATOR #2",

  releases: [
    {
      title: "Qryptic",
      mix: "TUGwave V.A. Vol.01 · A",
      genre: "Electro",
      year: "2025",
      cover: "img/releases/qryptic.webp",
      links: [
        { label: "Bandcamp",   url: "https://tugwaverecords.bandcamp.com/track/qryptic" },
        { label: "SoundCloud", url: "https://soundcloud.com/tehran_underground/keyv-qryptic-tugwaveva001a" }
      ]
    },
    {
      title: "Demonstrator #2",
      mix: "Live Mix",
      genre: "Techno",
      year: "2023",
      cover: "img/releases/demonstrator-2.webp",
      links: [
        { label: "SoundCloud", url: "https://soundcloud.com/keyvdj/demonstrator-2" }
      ]
    },
    {
      title: "Demonstrator",
      mix: "Live Mix",
      genre: "Techno",
      year: "2020",
      cover: "img/releases/demonstrator.webp",
      links: [
        { label: "SoundCloud", url: "https://soundcloud.com/keyvdj/demonstrator" }
      ]
    },
    {
      title: "Live DJ Set",
      mix: "Uchiha Mob · Series 01 EP01",
      genre: "Electro",
      year: "",
      cover: "img/releases/live-set.webp",
      links: [
        { label: "YouTube", url: "https://youtu.be/qVqKLeuRrA0" }
      ]
    }
  ],

  platforms: [
    { label: "SoundCloud", url: "https://soundcloud.com/keyvdj" },
    { label: "Beatport",   url: "https://www.beatport.com/artist/keyv/1267942" },
    { label: "Bandcamp",   url: "https://tugwaverecords.bandcamp.com/track/qryptic" },
    { label: "YouTube",    url: "https://youtu.be/qVqKLeuRrA0" }
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
    logo: "img/oscillator-logo.webp",          /* circular stamp — footer + favicon */
    wordmark: "img/oscillator-wordmark.webp",  /* horizontal lockup — section title */
    /* photo: "" renders a typographic card instead of an empty frame —
       drop a file in raw/, add it to tools/prepare-images.py, point here */
    roster: [
      { name: "KEYV", handle: "@keyvdj", photo: "img/roster/artist-01.webp" }
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
