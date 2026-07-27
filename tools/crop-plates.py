#!/usr/bin/env python3
"""Cut the photograph out of each Oscillator sleeve.

Every sleeve is the same composition: the photograph on the left, a
solid rail on the right carrying the artist's name, the number and the
wordmark, and a black parting between the two. The site's first screen
is that same composition rebuilt in HTML, so it needs the photograph on
its own — dropping the whole sleeve in would put the sleeve's rail
beside the page's rail and say everything twice.

The parting is a column of pure black running the full height, so it can
be found rather than guessed. It sits at about 62% across on most of the
catalogue and about 77% on the two with white rails, which is why this
measures each file instead of taking one number for all of them.

    python3 tools/crop-plates.py

Reads oscillator/img/covers/*.webp, writes oscillator/img/plates/*.webp.
Existing plates are overwritten; nothing else is touched.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is needed: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
COVERS = ROOT / "oscillator" / "img" / "covers"
PLATES = ROOT / "oscillator" / "img" / "plates"

SCAN = 300          # columns to sample across; enough to place the parting
DARK = 40           # a channel at or under this counts as black
MIN_X, MAX_X = 0.45, 0.95    # the parting is never outside this band
FALLBACK = 0.61     # if no parting is found, cut where most of them sit
BLEED = 0.004       # trim a hair past the parting so no rail edge survives


def parting(image):
    """Fraction across at which the black parting starts, or None."""
    small = image.resize((SCAN, SCAN))
    px = small.load()
    lo, hi = int(SCAN * MIN_X), int(SCAN * MAX_X)

    black = []
    for x in range(lo, hi):
        dark = sum(
            1 for y in range(0, SCAN, 2)
            if max(px[x, y][:3]) < DARK
        )
        if dark / (SCAN / 2) > 0.97:
            black.append(x)

    if not black:
        return None

    # take the leftmost column of the first run, which is where the
    # photograph actually stops
    return black[0] / SCAN


def main():
    if not COVERS.is_dir():
        sys.exit(f"no covers at {COVERS}")
    PLATES.mkdir(parents=True, exist_ok=True)

    covers = sorted(COVERS.glob("*.webp"))
    if not covers:
        sys.exit(f"no .webp files in {COVERS}")

    for path in covers:
        image = Image.open(path).convert("RGB")
        width, height = image.size

        found = parting(image)
        cut = (found if found is not None else FALLBACK) - BLEED
        plate = image.crop((0, 0, max(1, int(width * cut)), height))

        out = PLATES / path.name
        plate.save(out, "WEBP", quality=86, method=6)
        print(
            f"  {path.name:<12} cut at {cut:.3f}"
            f"{'' if found is not None else ' (no parting found, used fallback)'}"
            f"  -> {plate.size[0]}x{plate.size[1]}, {out.stat().st_size // 1024}KB"
        )


if __name__ == "__main__":
    main()
