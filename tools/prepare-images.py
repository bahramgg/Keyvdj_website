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
    from PIL import Image, ImageDraw, ImageEnhance, ImageOps
except ImportError:
    sys.exit("Pillow is missing.  pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
IMG = os.path.join(ROOT, "img")

QUALITY = 82

# src in raw/ , output in img/ , max width , aspect (None = keep) , vertical
# focus 0..1 used when cropping (0 = top of frame, 1 = bottom)
JOBS = [
    ("hero-red-burst.jpeg",  "hero.webp",                 1600, None,      0.50),
    ("bio-lasers.jpeg",      "bio.webp",                  1400, (4, 5),    0.42),
    ("live-beams.jpeg",      "roster/artist-01.webp",      900, (3, 4),    0.38),
    ("scene-blue-wall.jpeg", "scene-blue.webp",           1600, None,      0.50),

    # release covers — square crops standing in until real artwork exists
    ("hero-red-burst.jpeg",  "releases/release-01.webp",   900, (1, 1),    0.50),
    ("scene-blue-wall.jpeg", "releases/release-02.webp",   900, (1, 1),    0.50),
    ("bio-lasers.jpeg",      "releases/release-03.webp",   900, (1, 1),    0.35),
    ("live-beams.jpeg",      "releases/release-04.webp",   900, (1, 1),    0.32),
]

LOGO = "oscillator-logo.jpeg"


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


def monochrome(im):
    im = ImageOps.grayscale(im)
    im = ImageOps.autocontrast(im, cutoff=(0.4, 0.2))
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = ImageEnhance.Brightness(im).enhance(0.94)
    return im.convert("RGB")


def resize(im, max_w):
    if im.width <= max_w:
        return im                            # never upscale
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
    for src, rel, max_w, aspect, focus in JOBS:
        path = os.path.join(RAW, src)
        if not os.path.exists(path):
            missing.append(src)
            continue
        im = Image.open(path).convert("RGB")
        save(resize(monochrome(crop_to(im, aspect, focus)), max_w), rel)

    logo_path = os.path.join(RAW, LOGO)
    if os.path.exists(logo_path):
        print("logo (colour):")
        build_logo(logo_path)
    else:
        missing.append(LOGO)

    if missing:
        print("\nnot found in raw/: " + ", ".join(sorted(set(missing))))

    total = sum(
        os.path.getsize(os.path.join(dirpath, f))
        for dirpath, _, files in os.walk(IMG) for f in files
    )
    print(f"\nimg/ total: {total/1024:.0f} KB")


if __name__ == "__main__":
    main()
