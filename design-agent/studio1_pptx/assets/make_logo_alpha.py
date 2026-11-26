"""Turn two renders of one logo (on white, on black) into one transparent PNG.

html2png.mjs cannot write transparency, so each logo is rendered on pure white and on pure black.
For any pixel, alpha = 1 - (white render - black render), and the colour is the black render
divided by alpha. Usage: python make_logo_alpha.py on-white.png on-black.png out.png
"""

from __future__ import annotations

import sys
from typing import cast

from PIL import Image


def main(white_path: str, black_path: str, out_path: str) -> None:
    white = Image.open(white_path).convert("RGB")
    black = Image.open(black_path).convert("RGB")
    out = Image.new("RGBA", white.size)
    src_w, src_b, dst = white.load(), black.load(), out.load()
    if src_w is None or src_b is None or dst is None:
        raise SystemExit("cannot read pixels")
    for y in range(white.height):
        for x in range(white.width):
            w, b = cast("tuple[int, ...]", src_w[x, y]), cast("tuple[int, ...]", src_b[x, y])
            alpha = max(0.0, min(1.0, 1 - sum(wc - bc for wc, bc in zip(w, b, strict=True)) / 765))
            if alpha >= 0.004:
                dst[x, y] = (*(min(255, round(c / alpha)) for c in b), round(alpha * 255))
    out.save(out_path, optimize=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
