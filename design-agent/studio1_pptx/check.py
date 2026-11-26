"""Reopen a .pptx and report whether it is still on brand. Reads the file only, never edits it."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pptx import Presentation
from pptx.dml.fill import FillFormat
from pptx.enum.dml import MSO_COLOR_TYPE, MSO_FILL
from pptx.shapes.autoshape import Shape
from pptx.slide import Slide as PptxSlide
from pptx.util import Pt

from studio1_pptx.brand import FONTS, load_brand
from studio1_pptx.build import SLIDE_H, SLIDE_W
from studio1_pptx.outline import banned_char_in, load_outline


@dataclass
class CheckResult:
    slide_count: int = 0
    passed: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures

    def report(self) -> list[str]:
        lines = [f"ok    {line}" for line in self.passed]
        lines += [f"FAIL  {line}" for line in self.failures]
        lines.append("deck is on brand" if self.ok else f"{len(self.failures)} problem(s)")
        return lines


def _solid_hex(fill: FillFormat) -> str | None:
    if fill.type == MSO_FILL.SOLID and fill.fore_color.type == MSO_COLOR_TYPE.RGB:
        return str(fill.fore_color.rgb).upper()
    return None


def _shapes(slide: PptxSlide) -> list[Any]:
    return list(slide.shapes)


def check_deck(deck_path: Path | str, outline_path: Path | str | None = None) -> CheckResult:
    brand = load_brand()
    prs = Presentation(str(deck_path))
    res = CheckResult(slide_count=len(prs.slides))
    res.passed.append(f"{res.slide_count} slides")

    if (prs.slide_width, prs.slide_height) == (SLIDE_W, SLIDE_H):
        res.passed.append("16:9 (13.333 x 7.5 in)")
    else:
        res.failures.append(f"slide size is {prs.slide_width} x {prs.slide_height} EMU, not 16:9")

    fonts: set[str] = set()
    colors: dict[str, str] = {}  # hex -> first place seen
    banned: list[str] = []
    frames_bad: list[str] = []
    style_bad: list[str] = []
    slide_texts: list[list[str]] = []

    for i, slide in enumerate(prs.slides, start=1):
        where = f"slide {i:02d}"
        texts: list[str] = []
        frames = 0
        if not slide.follow_master_background:
            hex_ = _solid_hex(slide.background.fill)
            if hex_:
                colors.setdefault(hex_, f"{where} background")
        for shape in _shapes(slide):
            if isinstance(shape, Shape):
                fill_hex = _solid_hex(shape.fill)
                line_hex = _solid_hex(shape.line.fill)
                if fill_hex:
                    colors.setdefault(fill_hex, f"{where} {shape.name} fill")
                if line_hex:
                    colors.setdefault(line_hex, f"{where} {shape.name} line")
                if (
                    shape.fill.type == MSO_FILL.BACKGROUND
                    and line_hex == brand.print_
                    and shape.line.width == Pt(1.5)
                ):
                    frames += 1
            if not getattr(shape, "has_text_frame", False):
                continue
            for para in shape.text_frame.paragraphs:
                texts.append("".join(r.text for r in para.runs))
                for run in para.runs:
                    if run.font.name is None or run.font.name not in FONTS:
                        fonts.add(run.font.name or "(none set)")
                    if run.font.bold or run.font.italic:
                        style_bad.append(f"{where} {shape.name}: bold or italic text")
                    if run.font.color.type == MSO_COLOR_TYPE.RGB:
                        colors.setdefault(
                            str(run.font.color.rgb).upper(), f"{where} {shape.name} text"
                        )
        slide_texts.append(texts)
        if frames > 1:
            frames_bad.append(f"{where} has {frames} selection frames, the limit is one")
        notes = slide.notes_slide.notes_text_frame.text if slide.has_notes_slide else ""
        for text in [*texts, notes]:
            hit = banned_char_in(text)
            if hit:
                banned.append(f"{where}: {hit[0]} ({hit[1]!r}) in {text[:40]!r}")

    _report(
        res, not fonts, f"only {' and '.join(sorted(FONTS))} used", f"other fonts: {sorted(fonts)}"
    )
    off = {h: w for h, w in colors.items() if h not in brand.allowed}
    detail = "; ".join(f"#{h} at {w}" for h, w in off.items())
    _report(res, not off, "only brand colours on text and shapes", f"off-brand colours: {detail}")
    _report(res, not banned, "no banned characters", "; ".join(banned))
    _report(res, not frames_bad, "at most one selection frame per slide", "; ".join(frames_bad))
    _report(res, not style_bad, "no bold or italic text", "; ".join(style_bad))

    if outline_path is not None:
        outline = load_outline(Path(outline_path))
        if len(outline.slides) != res.slide_count:
            res.failures.append(
                f"outline has {len(outline.slides)} slides, the deck has {res.slide_count}"
            )
        missing = [
            f"slide {s.n}: {s.headline!r}"
            for s, texts in zip(outline.slides, slide_texts, strict=False)
            if s.headline not in texts
        ]
        _report(res, not missing, "every outline headline is present as text", "; ".join(missing))
    return res


def _report(res: CheckResult, passed: bool, ok_text: str, fail_text: str) -> None:
    (res.passed if passed else res.failures).append(ok_text if passed else fail_text)
