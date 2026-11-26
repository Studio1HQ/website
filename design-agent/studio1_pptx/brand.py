"""Brand values, read from the pack at build time. The only place that knows where the pack is."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path

# Studio1 Sans is Inter renamed, and Google Slides has Inter but not "Studio1 Sans". Change the
# names here, nowhere else.
BODY_FONT = "Inter"
HEADLINE_FONT = "Inter Medium"
FONTS = frozenset({BODY_FONT, HEADLINE_FONT})

ASSETS = Path(__file__).resolve().parent / "assets"
TOKENS_PATH = Path(__file__).resolve().parent.parent / "workspace" / "brand" / "tokens.json"


@dataclass(frozen=True)
class Brand:
    paper: str
    ink: str
    night: str
    white: str
    print_: str
    print_700: str
    muted: str  # neutral-700, readable on paper
    muted_dark: str  # neutral-400, readable on Night
    allowed: frozenset[str]  # every hex a text or shape may use, upper case, no hash
    banned_chars: dict[str, str]  # human name -> character


def _hex(value: str) -> str:
    return value.lstrip("#").upper()


@cache
def load_brand(path: Path = TOKENS_PATH) -> Brand:
    data = json.loads(path.read_text(encoding="utf-8"))
    design, tokens = data["design"], data["design"]["tokens"]

    def tok(name: str) -> str:
        return _hex(str(tokens[f"--brand-color-{name}"]))

    allowed = {_hex(c) for c in design["allowedColors"]}
    allowed |= {_hex(c) for c in design["extendedPalette"]["colors"]}
    banned = {
        re.sub(r"(?<!^)(?=[A-Z])", " ", key).lower(): char
        for key, char in data["copy"]["bannedChars"].items()
    }
    return Brand(
        paper=tok("paper"),
        ink=tok("ink"),
        night=tok("night"),
        white=tok("white"),
        print_=tok("print"),
        print_700=tok("print-700"),
        muted=tok("neutral-700"),
        muted_dark=tok("neutral-400"),
        allowed=frozenset(allowed),
        banned_chars=banned,
    )
