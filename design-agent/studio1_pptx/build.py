"""Build an editable .pptx from deck/outline.json.

Every word is a real text box. The only pictures are the sunrise panel, the grain and the logos.
Sizes are in inches on a 13.333 x 7.5 slide; the brand's 80px slide margin is 0.556 in.
"""

from __future__ import annotations

import math
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.presentation import Presentation as PresentationType
from pptx.shapes.autoshape import Shape
from pptx.shapes.picture import Picture
from pptx.slide import Slide as PptxSlide
from pptx.text.text import _Paragraph as Paragraph
from pptx.util import Emu, Inches, Pt

from studio1_pptx.brand import ASSETS, BODY_FONT, HEADLINE_FONT, Brand, load_brand
from studio1_pptx.outline import Outline, Slide, load_outline

SLIDE_W = 12192000  # 13.333 in
SLIDE_H = 6858000  # 7.5 in
MARGIN = 0.556
FRAME_PT = 1.5
LOGO_RATIO = 669.3 / 160

KIND_LABEL = {
    "cover": "Cover",
    "observations": "What we noticed",
    "gap": "The gap",
    "plan": "What we would do",
    "proof": "Proof",
    "how": "How we work",
    "next": "Next step",
    "section": "",
    "generic": "",
}


def _rgb(hex_: str) -> RGBColor:
    return RGBColor.from_string(hex_)  # type: ignore[no-any-return,no-untyped-call]


def _tidy(shape: Shape) -> None:
    shape.shadow.inherit = False


def _lines_needed(text: str, width_in: float, size_pt: float) -> int:
    chars = max(1, int(width_in * 72 / (size_pt * 0.52)))  # Inter Medium, tracked tight, ~0.52 em
    return sum(max(1, math.ceil(len(part) / chars)) for part in text.split("\n"))


def _describe(pic: Picture, text: str) -> None:
    """Alt text, so a screen reader or Google Slides names the picture."""
    pic._element.xpath("p:nvPicPr/p:cNvPr")[0].set("descr", text)


def _picture(
    slide: PptxSlide, name: str, file: str, x: float, y: float, w: float, h: float
) -> None:
    pic = slide.shapes.add_picture(str(ASSETS / file), Inches(x), Inches(y), Inches(w), Inches(h))
    pic.name = name
    _describe(pic, "Studio1 logo" if name.startswith("logo") else name)


def _full_picture(slide: PptxSlide, name: str, file: str) -> None:
    pic = slide.shapes.add_picture(str(ASSETS / file), Emu(0), Emu(0), Emu(SLIDE_W), Emu(SLIDE_H))
    pic.name = name
    _describe(pic, name)


def _logo(slide: PptxSlide, *, dark: bool, x: float, y: float, width: float) -> None:
    file = "logo-on-dark.png" if dark else "logo-on-light.png"
    _picture(slide, "logo", file, x, y, width, width / LOGO_RATIO)


def _text(
    slide: PptxSlide,
    name: str,
    box: tuple[float, float, float, float],
    lines: list[str],
    *,
    size: float,
    color: str,
    font: str = BODY_FONT,
    align: PP_ALIGN = PP_ALIGN.LEFT,
    leading: float = 1.3,
    after: float = 0,
    bullets: str | None = None,
    tracking: float = -0.03,
) -> None:
    """One text box, one paragraph per line. bullets is a colour: real bullet paragraphs."""
    x, y, w, h = box
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    shape.name = name
    frame = shape.text_frame
    frame.word_wrap = True
    frame.auto_size = MSO_AUTO_SIZE.NONE
    frame.vertical_anchor = MSO_ANCHOR.TOP
    frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
    for i, line in enumerate(lines):
        para = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        para.alignment = align
        para.line_spacing = leading
        para.space_after = Pt(after)
        run = para.add_run()
        run.text = line
        run.font.name = font
        run.font.size = Pt(size)
        run.font.color.rgb = _rgb(color)
        run._r.get_or_add_rPr().set("spc", str(round(tracking * size * 100)))
        if bullets:
            _bullet(para, bullets)


def _bullet(para: Paragraph, color: str) -> None:
    ppr = para._p.get_or_add_pPr()
    hang = int(Inches(0.3))
    ppr.set("marL", str(hang))
    ppr.set("indent", str(-hang))
    clr = ppr.makeelement(qn("a:buClr"), {})
    clr.append(clr.makeelement(qn("a:srgbClr"), {"val": color}))
    ppr.append(clr)
    ppr.append(ppr.makeelement(qn("a:buSzPct"), {"val": "180000"}))
    ppr.append(ppr.makeelement(qn("a:buFont"), {"typeface": BODY_FONT}))
    # The middle dot is the house separator; the brand bans the heavy round bullet.
    ppr.append(ppr.makeelement(qn("a:buChar"), {"char": "·"}))


def _rect(
    slide: PptxSlide,
    name: str,
    box: tuple[float, float, float, float],
    *,
    fill: str | None,
    line: str | None = None,
    line_pt: float = 1.0,
) -> Shape:
    x, y, w, h = box
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.name = name
    _tidy(shape)
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = _rgb(fill)
    else:
        shape.fill.background()
    if line:
        shape.line.color.rgb = _rgb(line)
        shape.line.width = Pt(line_pt)
    else:
        shape.line.fill.background()
    return shape


def _selection_frame(
    slide: PptxSlide, brand: Brand, box: tuple[float, float, float, float], tag: str
) -> None:
    """The one orange frame: 1.5 pt outline, square corner handles, a layer tag above it."""
    pad = 0.06
    x, y, w, h = box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad
    _rect(slide, "selection-frame", (x, y, w, h), fill=None, line=brand.print_, line_pt=FRAME_PT)
    handle = 0.0625
    for i, (cx, cy) in enumerate([(x, y), (x + w, y), (x, y + h), (x + w, y + h)]):
        _rect(
            slide,
            f"frame-handle-{i + 1}",
            (cx - handle / 2, cy - handle / 2, handle, handle),
            fill=brand.paper,
            line=brand.print_,
        )
    tag_h = 0.22
    tag_w = 0.2 + len(tag) * 0.075
    shape = _rect(slide, "layer-tag", (x, y - tag_h - 0.02, tag_w, tag_h), fill=brand.print_)
    frame = shape.text_frame
    frame.margin_left = frame.margin_right = Inches(0.06)
    frame.margin_top = frame.margin_bottom = 0
    frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    frame.word_wrap = False
    run = frame.paragraphs[0].add_run()
    run.text = tag
    run.font.name = HEADLINE_FONT
    run.font.size = Pt(11)
    run.font.color.rgb = _rgb(brand.white)
    frame.paragraphs[0].alignment = PP_ALIGN.LEFT


def _eyebrow(slide: PptxSlide, s: Slide, color: str) -> None:
    label = KIND_LABEL[s.kind]
    text = f"{s.n}  {label}".strip().upper()
    _text(
        slide,
        "eyebrow",
        (MARGIN, 0.5, 6, 0.25),
        [text],
        size=12,
        color=color,
        font=HEADLINE_FONT,
        tracking=0.1,
    )


def _headline_size(text: str) -> float:
    return 44 if len(text) <= 40 else 40 if len(text) <= 80 else 32


def _blank(prs: PresentationType) -> PptxSlide:
    slide: PptxSlide = prs.slides.add_slide(prs.slide_layouts[6])
    return slide


def _paper_slide(prs: PresentationType) -> PptxSlide:
    slide = _blank(prs)
    _full_picture(slide, "grain", "grain-1920x1080.png")  # first, so it sits behind everything
    return slide


def _content(prs: PresentationType, s: Slide, brand: Brand) -> PptxSlide:
    slide = _paper_slide(prs)
    _eyebrow(slide, s, brand.muted)
    _logo(slide, dark=False, x=13.333 - MARGIN - 1.3, y=0.45, width=1.3)
    size = _headline_size(s.headline)
    width = 8.4
    h = _lines_needed(s.headline, width, size) * size * 1.1 / 72 + 0.05
    top = 2.1
    box = (MARGIN + 0.2, top, width, h)
    _text(
        slide,
        "headline",
        box,
        [s.headline],
        size=size,
        color=brand.ink,
        font=HEADLINE_FONT,
        leading=1.1,
        tracking=-0.045,
    )
    _selection_frame(slide, brand, box, f"headline-{s.kind}")
    if s.body:
        _text(
            slide,
            "body",
            (MARGIN + 0.2, top + h + 0.6, 7.6, 2.6),
            s.body,
            size=20,
            color=brand.ink,
            leading=1.3,
            after=10,
            bullets=brand.ink,
        )
    return slide


def _proof(prs: PresentationType, s: Slide, brand: Brand) -> PptxSlide:
    slide = _paper_slide(prs)
    _eyebrow(slide, s, brand.muted)
    _logo(slide, dark=False, x=13.333 - MARGIN - 1.3, y=0.45, width=1.3)
    size = 36
    width = 9.5
    h = _lines_needed(s.headline, width, size) * size * 1.1 / 72 + 0.05
    _text(
        slide,
        "headline",
        (MARGIN, 1.1, width, h),
        [s.headline],
        size=size,
        color=brand.ink,
        font=HEADLINE_FONT,
        leading=1.1,
        tracking=-0.045,
    )
    y = 1.1 + h + 0.2
    if s.body:
        _text(
            slide,
            "body",
            (MARGIN, y, 9.5, 0.9),
            s.body,
            size=16,
            color=brand.muted,
            leading=1.3,
            after=4,
            bullets=brand.muted,
        )
    gap, card_w, card_h = 0.4, 3.7, 3.0
    for i, item in enumerate(s.proof):
        x = MARGIN + i * (card_w + gap)
        top = 4.1
        _rect(slide, f"proof-card-{i + 1}", (x, top, card_w, card_h), fill=brand.white)
        _text(
            slide,
            f"proof-claim-{i + 1}",
            (x + 0.3, top + 0.3, card_w - 0.6, 1.9),
            [item.claim],
            size=22,
            color=brand.ink,
            font=HEADLINE_FONT,
            leading=1.15,
            tracking=-0.04,
        )
        _text(
            slide,
            f"proof-source-{i + 1}",
            (x + 0.3, top + card_h - 0.65, card_w - 0.6, 0.45),
            [item.source],
            size=11,
            color=brand.muted,
            leading=1.2,
        )
    return slide


def _section(prs: PresentationType, s: Slide, brand: Brand) -> PptxSlide:
    slide = _blank(prs)
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = _rgb(brand.night)
    _eyebrow(slide, s, brand.muted_dark)
    _logo(slide, dark=True, x=13.333 - MARGIN - 1.3, y=0.45, width=1.3)
    size = 54
    width = 9.4
    h = _lines_needed(s.headline, width, size) * size * 1.1 / 72 + 0.05
    _text(
        slide,
        "headline",
        (MARGIN + 0.2, 2.8, width, h),
        [s.headline],
        size=size,
        color=brand.paper,
        font=HEADLINE_FONT,
        leading=1.1,
        tracking=-0.045,
    )
    if s.body:
        _text(
            slide,
            "body",
            (MARGIN + 0.2, 2.8 + h + 0.5, 7.6, 1.8),
            s.body,
            size=20,
            color=brand.muted_dark,
            leading=1.3,
            after=10,
            bullets=brand.muted_dark,
        )
    return slide


def _cover(prs: PresentationType, s: Slide, outline: Outline, brand: Brand) -> PptxSlide:
    slide = _blank(prs)
    _full_picture(slide, "sunrise", "sunrise-1920x1080.png")
    cw, ch = 8.6, 4.5
    cx, cy = (13.333 - cw) / 2, (7.5 - ch) / 2
    _rect(slide, "cover-card", (cx, cy, cw, ch), fill=brand.white)
    pad = 0.5
    inner = cw - 2 * pad
    _text(
        slide,
        "company",
        (cx + pad, cy + pad, inner, 0.3),
        [outline.company],
        size=14,
        color=brand.muted,
        font=HEADLINE_FONT,
        tracking=0,
    )
    title_h = _lines_needed(outline.deck_title, inner, 36) * 36 * 1.1 / 72 + 0.05
    _text(
        slide,
        "deck-title",
        (cx + pad, cy + pad + 0.5, inner, title_h),
        [outline.deck_title],
        size=36,
        color=brand.ink,
        font=HEADLINE_FONT,
        leading=1.1,
        tracking=-0.045,
    )
    y = cy + pad + 0.5 + title_h + 0.2
    sub_h = _lines_needed(s.headline, inner, 18) * 18 * 1.3 / 72 + 0.05
    _text(
        slide,
        "headline",
        (cx + pad, y, inner, sub_h),
        [s.headline],
        size=18,
        color=brand.muted,
        leading=1.3,
    )
    if s.body:
        _text(
            slide,
            "body",
            (cx + pad, y + sub_h + 0.1, inner, 0.8),
            s.body,
            size=12,
            color=brand.muted,
            leading=1.3,
            after=2,
        )
    _logo(slide, dark=False, x=cx + pad, y=cy + ch - pad - 0.3, width=1.25)
    if outline.date:
        _text(
            slide,
            "date",
            (cx + cw - pad - 3, cy + ch - pad - 0.2, 3, 0.25),
            [outline.date],
            size=12,
            color=brand.muted,
            align=PP_ALIGN.RIGHT,
        )
    return slide


def _notes(s: Slide) -> str:
    parts = [s.purpose, s.notes]
    if s.proof:
        parts.append("\n".join(f"Source: {p.source} ({p.claim})" for p in s.proof))
    return "\n\n".join(p for p in parts if p)


def build_deck(outline_path: Path | str, out_path: Path | str) -> Path:
    """Build the deck. Raises OutlineError if the outline breaks the schema or the copy rules."""
    outline = load_outline(Path(outline_path))
    brand = load_brand()
    prs = Presentation()
    prs.slide_width = Emu(SLIDE_W)
    prs.slide_height = Emu(SLIDE_H)
    for s in outline.slides:
        if s.kind == "cover":
            slide = _cover(prs, s, outline, brand)
        elif s.kind == "proof":
            slide = _proof(prs, s, brand)
        elif s.kind == "section":
            slide = _section(prs, s, brand)
        else:
            slide = _content(prs, s, brand)
        notes = _notes(s)
        frame = slide.notes_slide.notes_text_frame if notes else None
        if frame is not None:
            frame.text = notes
    prs.core_properties.title = outline.deck_title
    prs.core_properties.author = "Studio1"
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    return out
