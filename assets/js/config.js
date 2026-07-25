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
    genreTag: "#techno",
    bio:
      "KEYV is a DJ and producer working in the harder, faster end of the " +
      "techno spectrum: hypnotic loops, rolling percussion and industrial " +
      "textures pushed through a raw, high-energy set. Founder of the " +
      "Oscillator label, he has spent the last decade building a sound that " +
      "sits between warehouse tradition and contemporary hardgroove.",
    bioShort: "DJ · Producer · Founder of Oscillator.",
    portrait: "img/bio.webp",
    hero: "img/hero-phone.webp"
  },

  /* ---- contact ----------------------------------------------------- */
  booking: {
    email: "booking@keyvdj.com",
    /* Create a form at https://formspree.io and paste the endpoint here.
       Leave empty to fall back to a mailto: link automatically. */
    formspreeEndpoint: ""
  },

  socials: [
    { label: "Instagram",  url: "https://www.instagram.com/keyvdj",                  handle: "@keyvdj" },
    { label: "SoundCloud", url: "https://soundcloud.com/keyvdj",                     handle: "keyvdj"  },
    { label: "Beatport",   url: "https://www.beatport.com/artist/keyv/1267942",      handle: "KEYV"    },
    { label: "Bandcamp",   url: "https://tugwaverecords.bandcamp.com/track/qryptic", handle: "Tugwave" }
  ],

  /* ---- music ------------------------------------------------------- */
  /* Paste any SoundCloud track/playlist URL — it is wrapped in the
     official embed player automatically. */
  featuredTrackUrl: "https://soundcloud.com/keyvdj/demonstrator-2",
  featuredTrackTitle: "DEMONSTRATOR #2",

  /* type: "release" | "mix" | "video" — groups the discography page */
  releases: [
    {
      title: "Qryptic",
      mix: "TUGwave V.A. Vol.01",
      genre: "Electro",
      year: "2025",
      type: "release",
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
      type: "mix",
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
      type: "mix",
      cover: "img/releases/demonstrator.webp",
      links: [
        { label: "SoundCloud", url: "https://soundcloud.com/keyvdj/demonstrator" }
      ]
    },
    {
      title: "Live DJ Set",
      mix: "Uchiha Mob Series 01",
      genre: "Electro",
      year: "",
      type: "mix",
      cover: "img/releases/live-set.webp",
      links: [
        { label: "YouTube", url: "https://youtu.be/qVqKLeuRrA0" }
      ]
    }
  ],

  /* shown in the header next to the nav — everything else lives in the
     footer, so the bar stays on one row */
  platforms: [
    { label: "Instagram", url: "https://www.instagram.com/keyvdj" }
  ],

  /* ---- label ------------------------------------------------------- */
  label: {
    name: "Oscillator",
    tagline: "Raw techno from the edge of the signal.",
    description:
      "Oscillator is an independent techno label founded by KEYV. It exists " +
      "for records that are built for the floor first: stripped, loud and " +
      "unpolished, and made to be played loud.",
    logo: "img/oscillator-logo.webp",          /* circular stamp — footer + favicon */
    wordmark: "img/oscillator-wordmark.webp",  /* horizontal lockup — section title */
    links: [
      { label: "Instagram",  url: "https://www.instagram.com/oscillator__" },
      { label: "SoundCloud", url: "https://soundcloud.com/oscillatorr" }
    ]
  },

  /* ---- shows ------------------------------------------------------- */
  /* Empty list shows the "Coming soon." state.
     status: "tickets" | "soldout" | "free" */
  events: [],

  /* ---- theme ------------------------------------------------------- */
  colors: {
    bg: "#000000",
    surface: "#0D0D0D",
    text: "#EDEDED",
    muted: "#9A9A9A",
    accent: "#E5E418"
  },

  /* ---- footer ------------------------------------------------------ */
  credit: "© " + new Date().getFullYear() + " KEYV. All rights reserved."
};
