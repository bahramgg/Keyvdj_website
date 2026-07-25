#!/usr/bin/env bash
# =============================================================
# raw/ → img/  ·  desaturated, resized, WebP q82
#
#   ./tools/optimize-images.sh              # everything in raw/
#   ./tools/optimize-images.sh raw/hero.jpg # a single file
#
# Naming decides the target size:
#   hero*        → 2500px wide
#   bio*, scene* → 1800px
#   everything else (release/roster covers) → 900px
#
# Keeps subfolders: raw/releases/x.jpg → img/releases/x.webp
# =============================================================
set -euo pipefail

command -v ffmpeg >/dev/null 2>&1 || {
  echo "ffmpeg not found. Install it:  sudo apt install ffmpeg" >&2
  exit 1
}

QUALITY=82
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

shopt -s nullglob nocaseglob

collect() {
  if [ "$#" -gt 0 ]; then
    printf '%s\n' "$@"
  else
    find raw -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \
      -o -iname '*.webp' -o -iname '*.tif' -o -iname '*.tiff' -o -iname '*.heic' \) | sort
  fi
}

count=0
while IFS= read -r src; do
  [ -f "$src" ] || continue

  rel="${src#raw/}"
  out="img/${rel%.*}.webp"
  base="$(basename "$out")"

  case "$base" in
    hero*)        width=2500 ;;
    bio*|scene*)  width=1800 ;;
    *)            width=900  ;;
  esac

  mkdir -p "$(dirname "$out")"

  # B&W with a slight contrast lift — yellow stays a UI accent, never in the photo
  ffmpeg -loglevel error -y -i "$src" \
    -vf "scale='min($width,iw)':-2:flags=lanczos,format=gray,eq=contrast=1.08:brightness=-0.02,format=yuv420p" \
    -c:v libwebp -quality "$QUALITY" -compression_level 6 "$out"

  printf '%-42s → %-42s %s\n' "$src" "$out" "$(du -h "$out" | cut -f1)"
  count=$((count + 1))
done < <(collect "$@")

echo
echo "$count image(s) written to img/"
[ "$count" -gt 0 ] && du -sh img
