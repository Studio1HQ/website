"""The studio1-context builder: exclusion rule and frontmatter parsing, from tiny fixtures.

Nothing here reads the website repository; every source is written to a temp directory.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
_SPEC = importlib.util.spec_from_file_location(
    "build_studio1_context", ROOT / "scripts" / "build_studio1_context.py"
)
assert _SPEC and _SPEC.loader
builder = importlib.util.module_from_spec(_SPEC)
sys.modules["build_studio1_context"] = builder
_SPEC.loader.exec_module(builder)

FRONTMATTER = """---
title: "Acme: 10x Stars"
client: Acme
description: >-
  A folded
  description.
services:
  - Docs
  - 'Launch & Growth'
featured: false
order: 2.5
metrics:
  - value: '1,700+'
    label: 'GitHub stars'
    evidence: 'https://example.com/e'
  - value: 100K+
    label: impressions
quotes:
  - text: >-
      [PLACEHOLDER: quote]
    author: '[PLACEHOLDER: name]'
outcomes:
  - Plain outcome
  - >-
    Folded outcome
    on two lines
---
Body text.

<Frame>
  <img src="/x.webp" alt="x" />
</Frame>

See [guide](/blog/guide).
"""


def _case(slug: str, client: str, extra: str = "") -> str:
    return (
        f'---\ntitle: "{client}: result"\nclient: {client}\n{extra}'
        f"summary: Did a thing.\nmetrics:\n  - value: '5x'\n    label: growth\n---\nBody.\n"
    )


def _site(tmp_path: Path, studies: dict[str, str], hidden: str = "") -> Path:
    cases = tmp_path / "content" / "case-studies" / "en"
    cases.mkdir(parents=True)
    for slug, text in studies.items():
        (cases / f"{slug}.mdx").write_text(text, encoding="utf-8")
    if hidden:
        constants = tmp_path / "constants"
        constants.mkdir()
        (constants / "case-study-visibility.ts").write_text(
            f"export const HIDDEN_CASE_STUDIES: ReadonlySet<string> = new Set([{hidden}]);\n",
            encoding="utf-8",
        )
    return tmp_path


def test_frontmatter_scalars_lists_and_blocks() -> None:
    data, body = builder.parse_frontmatter(FRONTMATTER)
    assert data["title"] == "Acme: 10x Stars"
    assert data["description"] == "A folded description."
    assert data["services"] == ["Docs", "Launch & Growth"]
    assert data["featured"] is False
    assert data["order"] == "2.5"
    assert data["metrics"] == [
        {"value": "1,700+", "label": "GitHub stars", "evidence": "https://example.com/e"},
        {"value": "100K+", "label": "impressions"},
    ]
    assert data["outcomes"] == ["Plain outcome", "Folded outcome on two lines"]
    assert body.startswith("Body text.")


def test_body_drops_jsx_and_images_and_absolutizes_links() -> None:
    _, body = builder.parse_frontmatter(FRONTMATTER)
    cleaned = builder.clean_body(body)
    assert "<" not in cleaned and "img" not in cleaned
    assert "(https://www.studio1hq.com/blog/guide)" in cleaned


def test_unclosed_frontmatter_fails() -> None:
    with pytest.raises(builder.ContextBuildError):
        builder.parse_frontmatter("---\ntitle: x\nno end")


def test_site_rules_and_hard_exclusions() -> None:
    hidden = frozenset({"secret"})
    assert builder.is_public("acme", "Acme", {}, hidden)
    assert not builder.is_public("acme", "Acme", {"draft": True}, hidden)
    assert not builder.is_public("secret", "Acme", {}, hidden)
    # Public by every flag, still excluded by name.
    assert not builder.is_public("nebius", "Nebius", {"draft": False}, frozenset())
    assert not builder.is_public("bd", "Bright Data", {}, frozenset())
    assert not builder.is_public("brightdata", "Whoever", {}, frozenset())


def test_build_keeps_public_and_drops_hidden_and_excluded(tmp_path: Path) -> None:
    site = _site(
        tmp_path,
        {
            "acme": _case("acme", "Acme"),
            "draftco": _case("draftco", "DraftCo", "draft: true\n"),
            "hiddenco": _case("hiddenco", "HiddenCo"),
            "nebius": _case("nebius", "Nebius"),
            "bd": _case("bd", "Bright Data"),
        },
        hidden='"hiddenco"',
    )
    files = builder.build_pack(site, strict=False)
    paths = set(files)
    assert "references/case-studies/acme.md" in paths
    for gone in ("draftco", "hiddenco", "nebius", "bd"):
        assert f"references/case-studies/{gone}.md" not in paths
    blob = "\n".join(files.values()).lower()
    for word in ("nebius", "bright data", "draftco", "hiddenco"):
        assert word not in blob


def test_build_is_deterministic(tmp_path: Path) -> None:
    site = _site(tmp_path, {"acme": _case("acme", "Acme"), "zed": _case("zed", "Zed")})
    assert builder.build_pack(site, strict=False) == builder.build_pack(site, strict=False)


def test_build_fails_loudly_when_an_excluded_name_leaks_into_a_public_study(
    tmp_path: Path,
) -> None:
    leaky = _case("acme", "Acme").replace("Body.", "We also worked with Nebius.")
    site = _site(tmp_path, {"acme": leaky})
    with pytest.raises(builder.ContextBuildError, match="nebius"):
        builder.build_pack(site, strict=False)


def test_other_agencies_fail_the_build() -> None:
    with pytest.raises(builder.ContextBuildError):
        builder.assert_clean({"x.md": "Compared with Hackmamba."})
