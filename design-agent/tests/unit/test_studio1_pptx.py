"""The editable PowerPoint export: build, check, and refusals. Offline."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.slide import Slide as PptxSlide

from studio1_pptx import OutlineError, build_deck, check_deck
from studio1_pptx.brand import BODY_FONT, FONTS, HEADLINE_FONT
from studio1_pptx.outline import KINDS

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "skills" / "studio1-pitch-deck" / "references" / "outline.schema.json"

OUTLINE: dict[str, Any] = {
    "company": "Acme Cloud",
    "deck_title": "How Acme Cloud Reaches Developers",
    "date": "27 November 2026",
    "slides": [
        {"n": "01", "kind": "cover", "headline": "An intro from Studio1", "body": ["For the DevRel team"]},
        {"n": "02", "kind": "observations", "purpose": "Show we looked",
         "headline": "Your Last Three Launches Had No Tutorial",
         "body": ["The v2 post has no code sample", "The quickstart takes eleven steps"]},
        {"n": "03", "kind": "gap", "headline": "Rivals Ship A Tutorial On Launch Day", "body": ["Two of three do"]},
        {"n": "04", "kind": "plan", "headline": "Three Moves", "body": ["A tutorial per release"]},
        {"n": "05", "kind": "proof", "purpose": "Closest work", "headline": "Work Like Yours",
         "notes": "Do not round.",
         "proof": [{"claim": "OpenLore: 1.2M views", "source": "case-studies.md, OpenLore"},
                   {"claim": "Tensorlake: AI citations", "source": "case-studies.md, Tensorlake"}]},
        {"n": "06", "kind": "how", "headline": "How We Work", "body": ["A weekly call"]},
        {"n": "07", "kind": "section", "headline": "Let Us Talk", "body": ["One call"]},
        {"n": "08", "kind": "next", "headline": "Book A Call", "body": ["Pick a time"]},
        {"n": "09", "kind": "generic", "headline": "Appendix"},
    ],
}  # fmt: skip


def _write(tmp_path: Path, data: dict[str, Any], name: str = "outline.json") -> Path:
    path = tmp_path / name
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


@pytest.fixture
def built(tmp_path: Path) -> tuple[Path, Path]:
    outline = _write(tmp_path, OUTLINE)
    return outline, build_deck(outline, tmp_path / "deck.pptx")


def _texts(slide: PptxSlide) -> list[str]:
    return [p.text for sh in slide.shapes if sh.has_text_frame for p in sh.text_frame.paragraphs]


def test_build_reopens_with_one_slide_per_outline_slide(built: tuple[Path, Path]) -> None:
    _, deck = built
    prs = Presentation(str(deck))
    assert len(prs.slides) == len(OUTLINE["slides"])


def test_every_headline_and_body_line_is_a_text_frame(built: tuple[Path, Path]) -> None:
    _, deck = built
    prs = Presentation(str(deck))
    for spec, slide in zip(OUTLINE["slides"], prs.slides, strict=True):
        texts = _texts(slide)
        assert spec["headline"] in texts
        for line in spec.get("body", []):
            assert line in texts
    cover = _texts(prs.slides[0])
    assert OUTLINE["company"] in cover and OUTLINE["deck_title"] in cover


def test_proof_cards_hold_claim_and_source(built: tuple[Path, Path]) -> None:
    _, deck = built
    texts = _texts(Presentation(str(deck)).slides[4])
    for item in OUTLINE["slides"][4]["proof"]:
        assert item["claim"] in texts and item["source"] in texts


def test_speaker_notes_hold_purpose_notes_and_sources(built: tuple[Path, Path]) -> None:
    _, deck = built
    notes = Presentation(str(deck)).slides[4].notes_slide.notes_text_frame.text
    assert notes.index("Closest work") < notes.index("Do not round.") < notes.index("OpenLore")
    assert "case-studies.md, Tensorlake" in notes


def test_pictures_are_only_the_brand_assets(built: tuple[Path, Path]) -> None:
    _, deck = built
    for slide in Presentation(str(deck)).slides:
        names = {sh.name for sh in slide.shapes if sh.shape_type == 13}
        assert names <= {"grain", "sunrise", "logo"}


def test_content_slides_have_one_frame_and_grain_first(built: tuple[Path, Path]) -> None:
    _, deck = built
    slide = Presentation(str(deck)).slides[1]
    assert list(slide.shapes)[0].name == "grain"
    assert [sh.name for sh in slide.shapes].count("selection-frame") == 1


def test_check_passes_on_a_built_deck(built: tuple[Path, Path]) -> None:
    outline, deck = built
    result = check_deck(deck, outline)
    assert result.ok, result.failures
    assert result.slide_count == 9


def test_only_the_two_font_names_are_used(built: tuple[Path, Path]) -> None:
    _, deck = built
    used = {
        r.font.name
        for slide in Presentation(str(deck)).slides
        for sh in slide.shapes
        if sh.has_text_frame
        for p in sh.text_frame.paragraphs
        for r in p.runs
    }
    assert used == {BODY_FONT, HEADLINE_FONT} == set(FONTS)


@pytest.mark.parametrize("char", ["—", "–", "!"])
def test_banned_character_is_refused_with_the_slide_number(tmp_path: Path, char: str) -> None:
    data = copy.deepcopy(OUTLINE)
    data["slides"][2]["body"] = [f"Two of three do{char} really"]
    with pytest.raises(OutlineError, match=r"slide 03 body"):
        build_deck(_write(tmp_path, data), tmp_path / "deck.pptx")
    assert not (tmp_path / "deck.pptx").exists()


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda d: d["slides"][1].pop("headline"), "slide 02: missing required field 'headline'"),
        (lambda d: d["slides"][1].update(kind="poster"), "'kind' must be one of"),
        (lambda d: d["slides"][1].update(n="2"), "'n' must be two digits"),
        (lambda d: d["slides"][1].update(body="one line"), "'body' must be a list of strings"),
        (lambda d: d["slides"][1].update(colour="red"), "unknown field 'colour'"),
        (lambda d: d["slides"][4].update(proof=[{"claim": "x"}] * 4), "at most 3"),
        (lambda d: d["slides"][4]["proof"][0].pop("source"), "missing required field 'source'"),
        (lambda d: d.pop("company"), "outline: missing required field 'company'"),
        (lambda d: d.update(slides=[]), "non-empty list"),
    ],
)
def test_schema_breaks_are_refused_clearly(tmp_path: Path, mutate: Any, message: str) -> None:
    data = copy.deepcopy(OUTLINE)
    mutate(data)
    with pytest.raises(OutlineError, match=message):
        build_deck(_write(tmp_path, data), tmp_path / "deck.pptx")


def test_invalid_json_is_refused(tmp_path: Path) -> None:
    path = tmp_path / "outline.json"
    path.write_text("{nope", encoding="utf-8")
    with pytest.raises(OutlineError, match="not valid JSON"):
        build_deck(path, tmp_path / "deck.pptx")


def test_check_fails_on_an_off_brand_colour(built: tuple[Path, Path], tmp_path: Path) -> None:
    _, deck = built
    prs = Presentation(str(deck))
    run = next(
        r
        for sh in prs.slides[1].shapes
        if sh.has_text_frame
        for p in sh.text_frame.paragraphs
        for r in p.runs
    )
    run.font.color.rgb = RGBColor(0x00, 0x66, 0xFF)
    bad = tmp_path / "bad.pptx"
    prs.save(str(bad))
    result = check_deck(bad)
    assert not result.ok
    assert any("0066FF" in f for f in result.failures)


def test_check_fails_when_a_headline_is_missing(built: tuple[Path, Path], tmp_path: Path) -> None:
    outline, deck = built
    data = copy.deepcopy(OUTLINE)
    data["slides"][3]["headline"] = "A Different Headline"
    result = check_deck(deck, _write(tmp_path, data, "other.json"))
    assert not result.ok and any("A Different Headline" in f for f in result.failures)
    assert outline.exists()


def test_check_fails_on_a_second_selection_frame(built: tuple[Path, Path], tmp_path: Path) -> None:
    _, deck = built
    prs = Presentation(str(deck))
    slide = prs.slides[1]
    frame = next(sh for sh in slide.shapes if sh.name == "selection-frame")
    slide.shapes._spTree.append(copy.deepcopy(frame._element))
    bad = tmp_path / "two-frames.pptx"
    prs.save(str(bad))
    assert any("selection frames" in f for f in check_deck(bad).failures)


def test_schema_file_agrees_with_the_code() -> None:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    slide = schema["properties"]["slides"]["items"]
    assert tuple(slide["properties"]["kind"]["enum"]) == KINDS
    assert set(slide["required"]) == {"n", "kind", "headline"}
    assert OUTLINE["slides"][0].keys() <= slide["properties"].keys()
