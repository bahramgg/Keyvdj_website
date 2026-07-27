#!/usr/bin/env python3
"""
Stamp ?v=<content hash> onto every local CSS/JS URL in the HTML pages.

Railway (and most zero-config static hosts) serve assets with an ETag but
no Cache-Control, so browsers — Safari on iOS especially — hold on to a
cached style.css or config.js long after index.html has been refreshed.
That shows up as a half-updated site: new markup, old styles and data.

A content hash in the query string sidesteps the whole problem: when a
file changes its URL changes, so the browser has to fetch it. When it
does not change, the URL is stable and the cache still does its job.

    python3 tools/stamp-assets.py      # run after editing assets/
"""

import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ("index.html", "releases.html", "admin.html",
         "oscillator/index.html", "oscillator/artists.html")

# href="assets/…" or src="assets/…", with or without an existing ?v=
PATTERN = re.compile(r'(?P<attr>href|src)="(?P<path>assets/[^"?]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"')


def digest(full_path):
    with open(full_path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:8]


def stamp(page):
    path = os.path.join(ROOT, page)
    if not os.path.exists(path):
        return None

    # asset URLs are relative to the page, not the repo root — the label
    # site lives in a subfolder and references its own assets/
    base = os.path.join(ROOT, os.path.dirname(page))

    with open(path, encoding="utf-8") as f:
        html = f.read()

    missing = []

    def replace(match):
        rel = match.group("path")
        full = os.path.join(base, rel)
        if not os.path.exists(full):
            missing.append(rel)
            return match.group(0)
        return f'{match.group("attr")}="{rel}?v={digest(full)}"'

    stamped, count = PATTERN.subn(replace, html)

    if missing:
        sys.exit(f"{page}: referenced but not on disk: {', '.join(missing)}")

    if stamped != html:
        with open(path, "w", encoding="utf-8") as f:
            f.write(stamped)
    return count


for page in PAGES:
    n = stamp(page)
    if n is None:
        print(f"  {page:16s} (skipped, not found)")
    else:
        print(f"  {page:16s} {n} asset URL(s) stamped")
