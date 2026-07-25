#!/usr/bin/env python3
"""
raw/ -> img/   ·   B&W, cropped, resized, WebP

    pip install Pillow
    python3 tools/prepare-images.py

Photos are desaturated and contrast-lifted — yellow stays a UI accent and
never appears inside a photo. The label logo is the one exception: it keeps
its colour and gets an alpha circle so it can sit on the yellow section.

Add a new photo by dropping it in raw/ and adding a line to JOBS below.
Images are never upscaled past their source resolution.
"""

import os
import sys

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
except ImportError:
    sys.exit("Pillow is missing.  pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
IMG = os.path.join(ROOT, "img")

QUALITY = 82

# src      file in raw/
# out      file in img/
# width    max width, never upscaled past the source
# aspect   crop to this ratio (omit to keep the source ratio)
# focus    0..1 vertical crop anchor — 0 keeps the top of the frame, 1 the bottom
# trim     strip uniform black letterbox bars (phone screenshots have them).
#          Opt-in: a genuinely dark photo edge would otherwise be eaten.
# lift     exposure multiplier for an underexposed source (1.0 = leave alone)
# sharpen  unsharp-mask after resize, for a soft source shown large
# mono     False keeps the source colour — release artwork keeps its identity;
#          the card CSS shows it grayscale at rest and lets colour through on
#          hover, so the files stay colour. Photos default to B&W.
JOBS = [
    # full-bleed hero: the 1080px source is upscaled once here with Lanczos
    # + unsharp (better than letting the browser stretch it) and lifted
    dict(src="hero-led-blue.jpeg",   out="hero.webp",       width=1920, upscale=True, lift=1.10, sharpen=True),
    dict(src="portrait-studio.jpeg", out="bio.webp",        width=1400, aspect=(4, 5),  focus=0.20),
    dict(src="live-beams.jpeg",      out="roster/artist-01.webp", width=900, aspect=(3, 4), focus=0.38),

    # spare scene shots, not referenced by config.js yet
    dict(src="crowd-booth.jpeg",     out="scene-crowd.webp", width=1600),
    dict(src="crowd-party.jpeg",     out="scene-party.webp", width=1600, trim=True),
    dict(src="hero-red-burst.jpeg",  out="scene-burst.webp", width=1080),
    dict(src="scene-blue-wall.jpeg", out="scene-blue.webp",  width=1080),

    # release covers — real artwork pulled from SoundCloud / YouTube
    dict(src="covers/qryptic.png",        out="releases/qryptic.webp",        width=900, aspect=(1, 1), mono=False),
    dict(src="covers/demonstrator-2.jpg", out="releases/demonstrator-2.webp", width=900, aspect=(1, 1), mono=False),
    dict(src="covers/demonstrator.jpg",   out="releases/demonstrator.webp",   width=900, aspect=(1, 1), mono=False),
    dict(src="covers/live-set.jpg",       out="releases/live-set.webp",       width=900, aspect=(1, 1), mono=False),
]

LOGO = "oscillator-logo.jpeg"           # circular stamp -> favicon + footer
WORDMARK = "oscillator-wordmark.jpeg"   # horizontal lockup -> label section


def trim_letterbox(im, threshold=12):
    """Strip uniform black bars around a phone-screenshot export."""
    grey = ImageOps.grayscale(im)
    w, h = grey.size
    px = grey.load()
    step = max(1, w // 200)

    def row_max(y):
        return max(px[x, y] for x in range(0, w, step))

    def col_max(x):
        return max(px[x, y] for y in range(0, h, step))

    top, bottom, left, right = 0, h - 1, 0, w - 1
    while top < bottom and row_max(top) < threshold:
        top += 1
    while bottom > top and row_max(bottom) < threshold:
        bottom -= 1
    while left < right and col_max(left) < threshold:
        left += 1
    while right > left and col_max(right) < threshold:
        right -= 1

    return im.crop((left, top, right + 1, bottom + 1))


def crop_to(im, aspect, focus):
    """Centre-crop horizontally, focus-weighted vertically."""
    if aspect is None:
        return im
    w, h = im.size
    target = aspect[0] / aspect[1]
    if abs(w / h - target) < 0.01:
        return im
    if w / h > target:                       # too wide -> trim sides
        new_w = int(round(h * target))
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    new_h = int(round(w / target))           # too tall -> trim top/bottom
    top = int(round((h - new_h) * focus))
    top = max(0, min(top, h - new_h))
    return im.crop((0, top, w, top + new_h))


def monochrome(im, lift=1.0):
    im = ImageOps.grayscale(im)
    im = ImageOps.autocontrast(im, cutoff=(0.4, 0.2))
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = ImageEnhance.Brightness(im).enhance(0.94 * lift)
    return im.convert("RGB")


def resize(im, max_w, upscale=False):
    if im.width == max_w or (im.width < max_w and not upscale):
        return im                            # never upscale by default
    h = round(im.height * max_w / im.width)
    return im.resize((max_w, h), Image.LANCZOS)


def save(im, rel, **kw):
    out = os.path.join(IMG, rel)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    kw.setdefault("quality", QUALITY)
    im.save(out, "WEBP", method=6, **kw)
    print(f"  {rel:32s} {im.width:>5}x{im.height:<5} {os.path.getsize(out)/1024:7.1f} KB")


ACCENT = (0xE5, 0xE4, 0x18)


def build_logo(src):
    """Keep the brand colour; mask to a circle so the black corners of the
    source do not show when the logo sits on the yellow section.

    The source is a JPEG of a two-colour mark, so it carries compression
    noise. Remapping every pixel onto the black -> accent ramp by luminance
    strips that noise while keeping the edge antialiasing — the mark comes
    out crisp and the file drops by an order of magnitude.
    """
    im = Image.open(src).convert("RGB")
    side = min(im.size)
    im = im.crop(((im.width - side) // 2, (im.height - side) // 2,
                  (im.width - side) // 2 + side, (im.height - side) // 2 + side))
    im = im.resize((600, 600), Image.LANCZOS)

    # Normalise against the accent's own luma rather than the image maximum:
    # JPEG ringing produces pixels brighter than the flat yellow, and
    # autocontrast would anchor on those and wash the brand colour out.
    luma = (ACCENT[0] * 299 + ACCENT[1] * 587 + ACCENT[2] * 114) / 1000
    ramp = ImageOps.grayscale(im).point(
        lambda v: min(255, round(v * 255 / luma))
    )
    logo = Image.merge("RGB", [
        ramp.point(lambda v, c=c: round(v * c / 255)) for c in ACCENT
    ])

    mask = Image.new("L", (2400, 2400), 0)
    ImageDraw.Draw(mask).ellipse((8, 8, 2392, 2392), fill=255)
    mask = mask.resize((600, 600), Image.LANCZOS)

    logo = logo.convert("RGBA")
    logo.putalpha(mask)
    save(logo, "oscillator-logo.webp", lossless=True)

    build_icons(logo)


def build_wordmark(src):
    """The horizontal lockup ships as yellow-on-black. The site is dark, so
    keep the ink acid yellow and turn luminance into the alpha channel — a
    transparent asset that sits directly on the black sections."""
    im = ImageOps.grayscale(Image.open(src).convert("RGB"))
    im = ImageOps.autocontrast(im, cutoff=1)

    alpha = im                                     # bright ink -> opaque
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    if box:
        alpha = alpha.crop(box)

    mark = Image.new("RGBA", alpha.size, ACCENT + (255,))
    mark.putalpha(alpha)

    target_w = 1200
    if mark.width > target_w:
        mark = mark.resize(
            (target_w, round(mark.height * target_w / mark.width)), Image.LANCZOS
        )
    save(mark, "oscillator-wordmark.webp", lossless=True)


def build_icons(logo):
    # favicon + touch icon, flattened on the brand black
    for size, name in ((64, "favicon.png"), (180, "apple-touch-icon.png")):
        icon = Image.new("RGB", (size, size), "#0A0A0A")
        small = logo.resize((size, size), Image.LANCZOS)
        icon.paste(small, (0, 0), small)
        path = os.path.join(IMG, name)
        icon.save(path, "PNG", optimize=True)
        print(f"  {name:32s} {size:>5}x{size:<5} {os.path.getsize(path)/1024:7.1f} KB")


def main():
    if not os.path.isdir(RAW):
        sys.exit("raw/ not found")
    os.makedirs(IMG, exist_ok=True)

    print("photos (B&W):")
    missing = []
    for job in JOBS:
        path = os.path.join(RAW, job["src"])
        if not os.path.exists(path):
            missing.append(job["src"])
            continue
        im = Image.open(path).convert("RGB")
        if job.get("trim"):
            im = trim_letterbox(im)
        im = crop_to(im, job.get("aspect"), job.get("focus", 0.5))
        if job.get("mono", True):
            im = monochrome(im, job.get("lift", 1.0))
        im = resize(im, job["width"], job.get("upscale", False))
        if job.get("sharpen"):
            im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=2))
        save(im, job["out"])

    print("logos (colour):")
    for name, builder in ((LOGO, build_logo), (WORDMARK, build_wordmark)):
        path = os.path.join(RAW, name)
        if os.path.exists(path):
            builder(path)
        else:
            missing.append(name)

    if missing:
        print("\nnot found in raw/: " + ", ".join(sorted(set(missing))))

    total = sum(
        os.path.getsize(os.path.join(dirpath, f))
        for dirpath, _, files in os.walk(IMG) for f in files
    )
    print(f"\nimg/ total: {total/1024:.0f} KB")


if __name__ == "__main__":
    main()
