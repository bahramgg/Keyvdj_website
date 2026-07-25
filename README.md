# KEYV

Static single-page site for a techno DJ / producer and the **Oscillator** label.
No framework, no build step — HTML, CSS and vanilla JS.

Black `#0A0A0A` + acid yellow `#E5E418`, Anton for display, Space Grotesk for body.

---

## Run it

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

Any static server works. Opening `index.html` straight from the filesystem
mostly works too, but `file://` blocks the SoundCloud embed — use a server.

## Deploy

**Vercel** — `vercel.json` is already set up (no build, `outputDirectory: "."`,
`cleanUrls: true`, long cache on `img/`):

```bash
npx vercel          # preview
npx vercel --prod   # production
```

**Any other host** — upload the repo as-is. There is nothing to compile.
`raw/` is gitignored and should not be uploaded.

---

## Editing content

All copy, links, releases, shows and the roster live in **`assets/js/config.js`**.
Edit that file and the site updates — nothing else to touch.

There is also **`admin.html`**, a dark panel for editing the same values without
opening code:

- open `admin.html` → **Unlock to edit** → password `oscillator`
  (set at the top of the `<script>` in `admin.html`)
- edits are saved to that browser's **localStorage** and shown on the site
  **on that device only** — nothing is sent anywhere
- **Export JSON** downloads the full config; paste those values into
  `config.js` to publish them for everyone
- **Import JSON** loads a file back in; **Reset overrides** clears local edits
  and returns to whatever `config.js` says

The password is client-side and not a security boundary — anyone can read it in
the page source. It only stops a casual visitor from rearranging your copy.

**One thing to know:** saving from the panel writes a full snapshot of the
config, not just the fields you changed. So while local overrides exist, later
edits to `config.js` stay hidden on that browser until you hit **Reset
overrides**.

---

## Photos

Originals live in **`raw/`** (gitignored). Everything in `img/` is generated:

```bash
pip install Pillow
python3 tools/prepare-images.py
```

Each photo is desaturated to B&W, contrast-lifted, cropped, resized and written
as WebP at quality 82. Yellow is a UI accent only — it never appears inside a
photo. The label logo is the exception: it keeps its colour and gets an alpha
circle so it can sit on the yellow section.

To add or swap a photo: drop the file in `raw/`, then add an entry to the `JOBS`
list at the top of `tools/prepare-images.py`. Each entry takes:

| key      | meaning                                                        |
|----------|----------------------------------------------------------------|
| `src`    | filename in `raw/`                                             |
| `out`    | output path under `img/`                                       |
| `width`  | max width — never upscaled past the source                     |
| `aspect` | crop ratio, e.g. `(4, 5)`; omit to keep the source ratio       |
| `focus`  | 0–1 vertical crop anchor (0 = keep the top, 1 = keep the bottom) |
| `trim`   | strip black letterbox bars — phone screenshot exports have them |
| `lift`   | exposure multiplier for an underexposed source                 |

`trim` is opt-in on purpose: a genuinely dark photo edge would otherwise get
eaten by the detector.

Currently generated:

```
img/hero.webp                    from raw/hero-warehouse.jpeg
img/bio.webp                     from raw/portrait-studio.jpeg
img/roster/artist-01.webp        from raw/live-beams.jpeg
img/releases/release-01..04.webp square crops of four live shots
img/scene-*.webp                 spares, not referenced by config.js yet
img/oscillator-wordmark.webp     black on transparent — the label section title
img/oscillator-logo.webp         circular stamp — footer + favicon source
img/favicon.png, apple-touch-icon.png
```

The two label marks are handled differently. The **wordmark** ships as
yellow-on-black, so the script turns luminance into alpha and makes the ink
black — it then sits on the yellow section as a clean lockup. The **circular
stamp** keeps its colour and gets an alpha circle, so on the yellow section the
disc would disappear and only the artwork read; it is used on black in the
footer instead.

Two things to replace when you have the assets:

- **Release covers** are square photo crops standing in for real artwork.
- **Roster** is KEYV only. Add artists to `label.roster` in `config.js`; one
  with `photo: ""` renders as a typographic tile (initial on a striped black
  ground) rather than an empty frame, so the grid still looks deliberate.

A missing image degrades to an empty dark frame rather than a broken icon, and
a missing wordmark falls back to the label name set in Anton.

---

## Booking form

The form posts JSON to a **Formspree** endpoint set in
`config.booking.formspreeEndpoint`. Leave it empty (the default) and the form
falls back to opening a prefilled `mailto:` to `config.booking.email`. Native
form submission is never used — a JS handler owns the submit.

To enable Formspree: create a form at <https://formspree.io>, then set

```js
booking: { email: "…", formspreeEndpoint: "https://formspree.io/f/xxxxxxxx" }
```

---

## Structure

```
index.html                 hero · bio · music · oscillator · shows · booking · footer
admin.html                 content panel (localStorage)
assets/css/style.css       tokens, layout, motion
assets/js/config.js        ← all content lives here
assets/js/main.js          config merge, rendering, form, GSAP motion
assets/js/orbital.js       the rotating yellow ring over the hero
assets/fonts/              Anton + Space Grotesk (self-hosted woff2)
assets/vendor/             GSAP 3.12.5 + ScrollTrigger (self-hosted)
img/                       generated WebP, lazy-loaded + icons
raw/                       original photos — gitignored, never deployed
tools/prepare-images.py    raw/ -> img/
vercel.json
```

## Notes on the build

- **Fonts and GSAP are self-hosted**, not pulled from Google Fonts / a CDN.
  Both are unreliable from Iran, and it keeps third parties off the critical
  path. To update GSAP, replace the files in `assets/vendor/`.
- **The SoundCloud player loads on click**, not on page load. Until then it is a
  styled block with a direct link — so the section still looks right if
  SoundCloud is blocked or slow, and the page never pays for the embed unless
  someone wants to listen.
- **No video anywhere.** Critical path is ~195 KB including the hero image;
  GSAP is deferred and the page reveals correctly without it via an
  IntersectionObserver fallback.
- **`prefers-reduced-motion`** disables the parallax, grain, orbit animation and
  scroll reveals; all content shows immediately.
- Config values are treated as untrusted when rendering — URLs are restricted to
  `http(s)`/`mailto:` and text is inserted as text, never as HTML.
