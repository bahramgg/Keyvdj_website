#!/usr/bin/env python3
"""Turn the supplied logo files into assets the site can light up.

The masters arrive as flat JPEGs — yellow artwork on solid black. That is
fine to look at and useless to build with: the site glows its yellow with
a stacked drop-shadow, and a drop-shadow needs alpha, so a black rectangle
would halo as a black rectangle.

The artwork is pure yellow on pure black, so keying it is exact rather
than approximate: luminance becomes alpha, and every surviving pixel is
forced to the label's own yellow so JPEG ringing around the strokes does
not leave dirty edges.

    python3 tools/prepare-logo.py <lockup.jpg> [disc.jpg]

Writes oscillator/img/lockup.webp (artwork on transparency) and, when a
second file is given, oscillator/img/disc.webp (kept as-is, trimmed).
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.exit("Pillow is needed: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "oscillator" / "img"

ACID = (254, 237, 7)        # sampled from the wordmark
FLOOR = 26                  # luminance under this is background, not artwork
WIDE = 1400                 # enough for the badge at any viewport


def trim(image, bg=None):
    """Crop away uniform border, whatever colour it is."""
    reference = Image.new(image.mode, image.size, bg or image.getpixel((0, 0)))
    box = ImageChops.difference(image, reference).convert("L").getbbox()
    return image.crop(box) if box else image


def key(path):
    """Yellow-on-black JPEG -> the same artwork on transparency."""
    art = trim(Image.open(path).convert("RGB"))

    lum = art.convert("L")
    # Everything under the floor is the black card and goes fully clear;
    # the rest is scaled back up so the strokes stay solid rather than
    # fading to half-opacity across their whole width.
    alpha = lum.point(lambda v: 0 if v < FLOOR else min(255, int((v - FLOOR) * 255 / (200 - FLOOR))))

    flat = Image.new("RGB", art.size, ACID)
    out = flat.convert("RGBA")
    out.putalpha(alpha)
    return trim_alpha(out)


def trim_alpha(image):
    box = image.getchannel("A").getbbox()
    return image.crop(box) if box else image


def save(image, name, mode="RGBA"):
    if image.width > WIDE:
        height = round(image.height * WIDE / image.width)
        image = image.resize((WIDE, height), Image.LANCZOS)
    out = OUT / name
    image.convert(mode).save(out, "WEBP", quality=90, method=6)
    print(f"  {name:<14} {image.width}x{image.height}  {out.stat().st_size // 1024}KB")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)

    save(key(sys.argv[1]), "lockup.webp")

    if len(sys.argv) > 2:
        # the disc is yellow-on-black by design — keep its black, only
        # square off the border it ships with
        save(trim(Image.open(sys.argv[2]).convert("RGB")), "disc.webp", mode="RGB")


if __name__ == "__main__":
    main()
