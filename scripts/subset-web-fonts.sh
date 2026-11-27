#!/usr/bin/env sh
# Makes the website's copies of Studio1 Sans (public/fonts/*.woff2) from the
# full fonts in app/fonts/*.ttf: the same glyphs, spacing and kerning, cut
# into two files per weight (issue #66, mobile LCP):
#
# - core:  what nearly every page uses (Latin-1 for English, French and
#          Spanish, punctuation, €, ₹, ™, arrows). About 23 KB a weight, small
#          enough to arrive with the stylesheet on a slow phone, so the page
#          paints in Studio1 Sans straight away. The layout preloads these.
# - extra: the rest of the site's range (Latin Extended and Vietnamese, Greek,
#          more arrows, maths, technical signs, shapes, symbols). The browser
#          only downloads it when a page shows one of those characters.
#
# Dropped from both: Cyrillic, extended Greek, the private-use alternates,
# and the stylistic sets and character variants (ss01-ss08, cv01-cv14), which
# no CSS on the site turns on. A character outside both files still shows, in
# the fallback font. The OpenType features kept: the defaults (kerning,
# contextual alternates, marks) plus tabular and fraction numbers, case forms,
# super/subscripts, ordinals and slashed zero.
#
# The full fonts in app/fonts stay as they are: the brand kit, Figma and the
# blog covers (app/blog-cover) use them.
#
# The site serves these files itself (the @font-face rules in app/globals.css,
# the preload in app/layout.tsx), cached for a year. When the output changes,
# raise VERSION and update the names there. If CORE or EXTRA change, copy them
# into the unicode-range lines in app/globals.css too.
#
# Needs fontTools with brotli: pip install "fonttools[woff]==4.55.3"
#   pnpm fonts:web
set -eu
cd "$(dirname "$0")/.."

VERSION=v1

CORE="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+20B9,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD"
# Everything else in U+0000-03FF, U+1E00-1EFF, U+2000-23FF and U+25A0-27BF.
EXTRA="U+0100-0130,U+0132-0151,U+0154-02BA,U+02BD-02C5,U+02C7-02D9,U+02DB,U+02DD-03FF,U+1E00-1EFF,U+2070-20AB,U+20AD-20B8,U+20BA-2121,U+2123-218F,U+219A-2211,U+2213-2214,U+2216-23FF,U+25A0-27BF"
FEATURES="kern,liga,calt,ccmp,locl,mark,mkmk,rlig,rvrn,tnum,pnum,case,frac,numr,dnom,sups,subs,ordn,zero"

mkdir -p public/fonts
for weight in Regular Medium; do
  name=$(echo "$weight" | tr '[:upper:]' '[:lower:]')
  for part in core extra; do
    if [ "$part" = core ]; then range=$CORE; else range=$EXTRA; fi
    pyftsubset "app/fonts/Studio1Sans-$weight.ttf" \
      --unicodes="$range" \
      --layout-features="$FEATURES" \
      --flavor=woff2 \
      --output-file="public/fonts/studio1-sans-$name-$part-$VERSION.woff2"
  done
done
ls -l public/fonts
