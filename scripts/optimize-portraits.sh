#!/usr/bin/env bash
# Regenerate responsive encodings from the original portrait assets.
# Requires ImageMagick with animated WebP support; not run during deployment.
set -euo pipefail
cd "$(dirname "$0")/.."
for variant in '480 78' '768 80' '960 82'; do
  read -r width quality <<< "$variant"
  convert assets/images/avinash-portrait-glitch.gif -coalesce -resize "${width}x" -quality "$quality" -define webp:method=6 -loop 0 "assets/images/avinash-portrait-glitch-${width}.webp"
done
convert assets/images/avinash-portrait.webp -resize 480x -quality 80 assets/images/avinash-portrait-480.webp
convert assets/images/avinash-portrait.webp -resize 768x -quality 82 assets/images/avinash-portrait-768.webp
