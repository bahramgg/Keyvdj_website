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


html = read("index.html")

# ---- CSS: inline, with fonts as data URIs -----------------------------
css = read("assets/css/style.css")
css = re.sub(
    r"url\('\.\./fonts/([^']+)'\)",
    lambda m: f"url('{data_uri('assets/fonts/' + m.group(1))}')",
    css,
)
html = re.sub(
    r'<link rel="stylesheet" href="assets/css/style.css">',
    lambda m: "<style>\n" + css + "\n</style>",
    html,
)

# preloads point at files that no longer exist as URLs — drop them
html = re.sub(r'<link rel="preload"[^>]*>\n?', "", html)
html = re.sub(
    r'<link rel="icon"[^>]*>',
    f'<link rel="icon" href="{data_uri("img/favicon.png")}">',
    html,
)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', "", html)

# ---- scripts: vendor + config + main, all inline ----------------------
def inline_script(src, body):
    return re.sub(
        r'<script[^>]*src="' + re.escape(src) + r'"></script>',
        lambda m: "<script>\n" + body + "\n</script>",
        html_holder[0],
    )


config = read("assets/js/config.js")
main = read("assets/js/main.js")

# every img/… path in config becomes a data URI
config = re.sub(
    r'"(img/[^"]+\.(?:webp|png|jpg))"',
    lambda m: '"' + data_uri(m.group(1)) + '"',
    config,
)

# the sanitiser must accept the inlined data: images in this preview build
main = main.replace(
    "if (scheme && !/^(https?|mailto)$/i.test(scheme[1])) return '';",
    "if (scheme && !/^(https?|mailto|data)$/i.test(scheme[1])) return '';",
)

html_holder = [html]
for src, body in (
    ("assets/vendor/gsap.min.js", read("assets/vendor/gsap.min.js")),
    ("assets/vendor/ScrollTrigger.min.js", read("assets/vendor/ScrollTrigger.min.js")),
    ("assets/js/config.js", config),
    ("assets/js/main.js", main),
):
    html_holder[0] = inline_script(src, body)
html = html_holder[0]

# ---- static <img> tags ------------------------------------------------
html = re.sub(
    r'src="(img/[^"]+)"',
    lambda m: 'src="' + data_uri(m.group(1)) + '"',
    html,
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"{OUT}  ({os.path.getsize(OUT) / 1024 / 1024:.1f} MB)")
