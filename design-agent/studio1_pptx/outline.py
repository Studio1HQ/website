"""Read deck/outline.json, check it against the schema's rules and the brand's copy rules.

The checks are hand-written (jsonschema is not a dependency) and mirror
skills/studio1-pitch-deck/references/outline.schema.json. Nothing is repaired: a bad outline is
refused with a message that names the slide, so the outline gets fixed.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from studio1_pptx.brand import load_brand

KINDS = (
    "cover",
    "observations",
    "gap",
    "plan",
    "proof",
    "how",
    "next",
    "section",
    "generic",
)
MAX_PROOF = 3
_TOP = {"company", "deck_title", "date", "slides"}
_SLIDE = {"n", "kind", "purpose", "headline", "body", "proof", "visual", "notes"}


class OutlineError(ValueError):
    """The outline breaks the schema or the copy rules. Fix the outline."""


@dataclass(frozen=True)
class ProofItem:
    claim: str
    source: str


@dataclass(frozen=True)
class Slide:
    n: str
    kind: str
    headline: str
    purpose: str = ""
    body: list[str] = field(default_factory=list)
    proof: list[ProofItem] = field(default_factory=list)
    visual: str = ""
    notes: str = ""


@dataclass(frozen=True)
class Outline:
    company: str
    deck_title: str
    slides: list[Slide]
    date: str = ""


def _fail(where: str, message: str) -> OutlineError:
    return OutlineError(f"{where}: {message}")


def _text(where: str, obj: dict[str, Any], key: str, *, required: bool) -> str:
    if key not in obj:
        if required:
            raise _fail(where, f"missing required field '{key}'")
        return ""
    value = obj[key]
    if not isinstance(value, str):
        raise _fail(where, f"'{key}' must be a string")
    if required and not value.strip():
        raise _fail(where, f"'{key}' must not be empty")
    return value


def _unknown(where: str, obj: dict[str, Any], allowed: set[str]) -> None:
    extra = sorted(set(obj) - allowed)
    if extra:
        raise _fail(where, f"unknown field '{extra[0]}' (allowed: {', '.join(sorted(allowed))})")


def _slide(index: int, raw: object) -> Slide:
    where = f"slide #{index + 1}"
    if not isinstance(raw, dict):
        raise _fail(where, "must be an object")
    _unknown(where, raw, _SLIDE)
    n = _text(where, raw, "n", required=True)
    where = f"slide {n}"
    if not re.fullmatch(r"[0-9]{2}", n):
        raise _fail(where, f"'n' must be two digits such as 01, got '{n}'")
    kind = _text(where, raw, "kind", required=True)
    if kind not in KINDS:
        raise _fail(where, f"'kind' must be one of {', '.join(KINDS)}, got '{kind}'")
    body = raw.get("body", [])
    if not isinstance(body, list) or not all(isinstance(line, str) for line in body):
        raise _fail(where, "'body' must be a list of strings")
    proof_raw = raw.get("proof", [])
    if not isinstance(proof_raw, list):
        raise _fail(where, "'proof' must be a list of {claim, source}")
    if len(proof_raw) > MAX_PROOF:
        raise _fail(where, f"'proof' holds at most {MAX_PROOF} items, got {len(proof_raw)}")
    proof: list[ProofItem] = []
    for i, item in enumerate(proof_raw):
        label = f"{where}, proof item {i + 1}"
        if not isinstance(item, dict):
            raise _fail(label, "must be an object with 'claim' and 'source'")
        _unknown(label, item, {"claim", "source"})
        proof.append(
            ProofItem(
                _text(label, item, "claim", required=True),
                _text(label, item, "source", required=True),
            )
        )
    return Slide(
        n=n,
        kind=kind,
        headline=_text(where, raw, "headline", required=True),
        purpose=_text(where, raw, "purpose", required=False),
        body=list(body),
        proof=proof,
        visual=_text(where, raw, "visual", required=False),
        notes=_text(where, raw, "notes", required=False),
    )


def parse_outline(data: object) -> Outline:
    if not isinstance(data, dict):
        raise _fail("outline", "must be a JSON object")
    _unknown("outline", data, _TOP)
    slides_raw = data.get("slides")
    if not isinstance(slides_raw, list) or not slides_raw:
        raise _fail("outline", "'slides' must be a non-empty list")
    return Outline(
        company=_text("outline", data, "company", required=True),
        deck_title=_text("outline", data, "deck_title", required=True),
        date=_text("outline", data, "date", required=False),
        slides=[_slide(i, s) for i, s in enumerate(slides_raw)],
    )


def strings_of(outline: Outline) -> list[tuple[str, str]]:
    """Every string in the outline, with where it came from."""
    out = [("outline company", outline.company), ("outline deck_title", outline.deck_title)]
    out.append(("outline date", outline.date))
    for s in outline.slides:
        w = f"slide {s.n}"
        out += [(f"{w} headline", s.headline), (f"{w} purpose", s.purpose)]
        out += [(f"{w} visual", s.visual), (f"{w} notes", s.notes)]
        out += [(f"{w} body", line) for line in s.body]
        for p in s.proof:
            out += [(f"{w} proof claim", p.claim), (f"{w} proof source", p.source)]
    return out


def banned_char_in(text: str) -> tuple[str, str] | None:
    """The first banned character in text, as (name, character), or None."""
    for name, char in load_brand().banned_chars.items():
        if char in text:
            return name, char
    return None


def check_copy(outline: Outline) -> None:
    for where, text in strings_of(outline):
        hit = banned_char_in(text)
        if hit:
            name, char = hit
            raise OutlineError(
                f"{where}: contains {name} ({char!r}). The brand copy rules ban it; "
                "fix the outline, the build does not edit your words."
            )


def load_outline(path: Path) -> Outline:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise OutlineError(f"cannot read {path}: {exc.strerror}") from exc
    except json.JSONDecodeError as exc:
        raise OutlineError(f"{path} is not valid JSON: {exc}") from exc
    outline = parse_outline(data)
    check_copy(outline)
    return outline
