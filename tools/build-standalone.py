#!/usr/bin/env python3
"""
Bundle the whole site into one self-contained HTML file for previewing —
every image, font and script inlined as data: URIs, so it opens from a
double-click with no server and no network.

    python3 tools/build-standalone.py [out.html]

Preview-only: the deployable site stays multi-file. The bundled file also
relaxes the URL sanitiser to accept data: (the inlined images need it);
the deployed site keeps the strict rule.
"""

import base64
import mimetypes
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "keyv-preview.html")
# the discography page is bundled next to the main file
OUT_RELEASES = os.path.join(
    os.path.dirname(OUT),
    os.path.splitext(os.path.basename(OUT))[0] + "-releases.html",
)

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def data_uri(rel):
    path = os.path.join(ROOT, rel)
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


def bundle(page, out, extra_scripts, link_map):
    """Inline everything a page needs and write it to `out`."""
    html = read(page)

    css = read("assets/css/style.css")
    css = re.sub(
        r"url\('\.\./fonts/([^']+)'\)",
        lambda m: f"url('{data_uri('assets/fonts/' + m.group(1))}')",
        css,
    )
    html = re.sub(
        r'<link rel="stylesheet" href="assets/css/style\.css(?:\?v=[0-9a-f]+)?">',
        lambda m: "<style>\n" + css + "\n</style>",
        html,
    )

    html = re.sub(r'<link rel="preload"[^>]*>\n?', "", html)
    html = re.sub(
        r'<link rel="icon"[^>]*>',
        f'<link rel="icon" href="{data_uri("img/favicon.png")}">',
        html,
    )
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', "", html)

    config = read("assets/js/config.js")
    config = re.sub(
        r'"(img/[^"]+\.(?:webp|png|jpg))"',
        lambda m: '"' + data_uri(m.group(1)) + '"',
        config,
    )

    for src, body_file in extra_scripts:
        body = read(body_file) if body_file else config
        body = body.replace(
            "if (scheme && !/^(https?|mailto)$/i.test(scheme[1])) return '';",
            "if (scheme && !/^(https?|mailto|data)$/i.test(scheme[1])) return '';",
        )
        html = re.sub(
            r'<script[^>]*src="' + re.escape(src) + r'(?:\?v=[0-9a-f]+)?"></script>',
            lambda m, b=body: "<script>\n" + b + "\n</script>",
            html,
        )

    html = re.sub(
        r'src="(img/[^"]+)"',
        lambda m: 'src="' + data_uri(m.group(1)) + '"',
        html,
    )

    for old, new in link_map.items():
        html = html.replace('href="' + old + '"', 'href="' + new + '"')

    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"{out}  ({os.path.getsize(out) / 1024 / 1024:.1f} MB)")


main_name = os.path.basename(OUT)
releases_name = os.path.basename(OUT_RELEASES)

bundle(
    "index.html", OUT,
    [
        ("assets/vendor/gsap.min.js", "assets/vendor/gsap.min.js"),
        ("assets/vendor/ScrollTrigger.min.js", "assets/vendor/ScrollTrigger.min.js"),
        ("assets/js/config.js", None),
        ("assets/js/main.js", "assets/js/main.js"),
        ("assets/js/hero-dissolve.js", "assets/js/hero-dissolve.js"),
    ],
    {"releases.html": releases_name},
)
bundle(
    "releases.html", OUT_RELEASES,
    [
        ("assets/js/config.js", None),
        ("assets/js/releases.js", "assets/js/releases.js"),
    ],
    {
        "index.html": main_name,
        "index.html#oscillator": main_name + "#oscillator",
        "index.html#music": main_name + "#music",
        "index.html#shows": main_name + "#shows",
        "index.html#booking": main_name + "#booking",
    },
)
