#!/usr/bin/env python3
"""
Generate dark, grainy B&W placeholder WebPs so the layout reads correctly
before the real photos land. Delete img/ and re-run tools/optimize-images.sh
once you have shot files in raw/.

    pip install Pillow && python3 tools/make-placeholders.py
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")

TARGETS = [
    ("hero.webp", 2500, 1600, "HERO"),
    ("bio.webp", 1400, 1750, "PORTRAIT"),
    ("releases/release-01.webp", 900, 900, "RELEASE 01"),
    ("releases/release-02.webp", 900, 900, "RELEASE 02"),
    ("releases/release-03.webp", 900, 900, "RELEASE 03"),
    ("releases/release-04.webp", 900, 900, "RELEASE 04"),
    ("roster/artist-01.webp", 900, 1200, "ARTIST 01"),
    ("roster/artist-02.webp", 900, 1200, "ARTIST 02"),
    ("roster/artist-03.webp", 900, 1200, "ARTIST 03"),
    ("roster/artist-04.webp", 900, 1200, "ARTIST 04"),
]


def font(size):
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def build(width, height, label, seed):
    rng = random.Random(seed)
    img = Image.new("L", (width, height), 16)
    draw = ImageDraw.Draw(img)

    # soft radial pool of light, off-centre — reads like a lit subject
    cx = width * rng.uniform(0.38, 0.62)
    cy = height * rng.uniform(0.30, 0.45)
    radius = max(width, height) * rng.uniform(0.45, 0.65)
    steps = 46
    for i in range(steps, 0, -1):
        r = radius * i / steps
        value = int(18 + 74 * (1 - i / steps) ** 1.7)
        draw.ellipse((cx - r, cy - r * 1.15, cx + r, cy + r * 1.15), fill=value)

    img = img.filter(ImageFilter.GaussianBlur(radius=max(width, height) * 0.045))

    # faint diagonal scan lines for texture
    overlay = Image.new("L", (width, height), 0)
    od = ImageDraw.Draw(overlay)
    spacing = max(6, height // 90)
    for y in range(-height, height * 2, spacing):
        od.line([(0, y), (width, y - int(width * 0.35))], fill=rng.randint(6, 16), width=1)
    img = Image.blend(img, Image.eval(img, lambda v: min(255, v + 10)), 0.0)
    img = Image.composite(
        Image.eval(img, lambda v: min(255, v + 14)), img, overlay.point(lambda v: 255 if v > 8 else 0)
    )

    # grain
    px = img.load()
    for y in range(height):
        for x in range(0, width, 2):
            n = rng.randint(-11, 11)
            px[x, y] = max(0, min(255, px[x, y] + n))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))

    # label
    draw = ImageDraw.Draw(img)
    size = max(14, int(min(width, height) * 0.045))
    f = font(size)
    text = f"{label}  ·  {width}×{height}"
    box = draw.textbbox((0, 0), text, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    x, y = (width - tw) / 2, (height - th) / 2
    pad = size * 0.6
    draw.rectangle((x - pad, y - pad, x + tw + pad, y + th + pad * 1.4), fill=8)
    draw.text((x, y), text, fill=110, font=f)

    sub = font(max(10, int(size * 0.42)))
    note = "placeholder — replace via raw/ + tools/optimize-images.sh"
    nbox = draw.textbbox((0, 0), note, font=sub)
    draw.text(((width - (nbox[2] - nbox[0])) / 2, y + th + pad * 2.2), note, fill=64, font=sub)

    # vignette
    vign = Image.new("L", (width, height), 0)
    vd = ImageDraw.Draw(vign)
    inset = int(min(width, height) * 0.02)
    vd.ellipse((-width * 0.25, -height * 0.25, width * 1.25, height * 1.25), fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(radius=min(width, height) * 0.12))
    img = Image.composite(img, Image.new("L", (width, height), 6), vign)

    return img.convert("RGB")


def main():
    for index, (name, w, h, label) in enumerate(TARGETS):
        path = os.path.join(IMG, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        build(w, h, label, seed=index * 977 + 3).save(path, "WEBP", quality=78, method=6)
        print(f"{name:34s} {os.path.getsize(path) / 1024:7.1f} KB")


if __name__ == "__main__":
    main()
