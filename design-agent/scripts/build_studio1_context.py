#!/usr/bin/env python3
"""Build the `studio1-context` skill from the Studio1 website repository.

Usage:
    uv run python scripts/build_studio1_context.py [--site /path/to/the/website/repo]

Reads (never writes) the website repo and writes `skills/studio1-context/`. Python standard library
only. Output is deterministic: same sources, byte-identical files.

Sources and how each is read (no TypeScript is evaluated, only text-matched):
    content/case-studies/en/*.mdx   frontmatter (small YAML subset parser) and body, full fidelity
    constants/case-study-visibility.ts  the HIDDEN_CASE_STUDIES set literal
    public/llms.txt                 the "## Services" list (name, url, description)
    data/home.tsx                   homeTestimonials objects and two homeFeatures stat lines
    constants/data.ts               company names in the trustedbyLogo array (names only)

Not read: data/client-work.ts (a list of published articles, not needed for decks).

Visibility follows the site: a case study is public when its frontmatter has no `draft: true` and
its slug is not in HIDDEN_CASE_STUDIES. On top of that, EXCLUDED_TERMS are removed whatever the
flags say, and the build fails if any of them (or another agency's name) reaches the output.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

SITE_URL = "https://www.studio1hq.com"

#: Work that is not public. Matched case-insensitively against slug, client, and every output.
EXCLUDED_TERMS = ("nebius", "bright data", "brightdata", "bright-data")

#: Other agencies are never named, linked or shown. A hit anywhere in the output fails the build.
OTHER_AGENCY_TERMS = ("draft.dev", "hackmamba", "infrasity", "everydeveloper", "literally.dev")

HOME_STAT_TITLES = ("Experience", "Results")


class ContextBuildError(RuntimeError):
    """The source could not be read reliably, or the output broke a rule."""


# ---------------------------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------------------------


def mentions_excluded(*texts: str) -> bool:
    haystack = " ".join(texts).lower()
    return any(term in haystack for term in EXCLUDED_TERMS)


def is_public(slug: str, client: str, frontmatter: dict, hidden: frozenset[str]) -> bool:
    """The site's rule (draft flag, hidden list) plus the hard exclusions."""
    if frontmatter.get("draft") is True:
        return False
    if slug in hidden:
        return False
    return not mentions_excluded(slug, client)


def assert_clean(files: dict[str, str]) -> None:
    """Fail loudly if an excluded client or another agency appears in any output file."""
    problems: list[str] = []
    for name, text in sorted(files.items()):
        lowered = text.lower()
        for term in EXCLUDED_TERMS + OTHER_AGENCY_TERMS:
            if term in lowered:
                problems.append(f"{name}: contains {term!r}")
    if problems:
        raise ContextBuildError("Output breaks the exclusion rules:\n" + "\n".join(problems))


# ---------------------------------------------------------------------------------------------
# Frontmatter (a small YAML subset: scalars, folded and literal blocks, lists, lists of maps)
# ---------------------------------------------------------------------------------------------

_KEY = re.compile(r"^([A-Za-z_][\w-]*):(?:\s+(.*))?$")
_BLOCK_MARKERS = {">", ">-", ">+", "|", "|-", "|+"}


def _indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _scalar(raw: str):
    text = raw.strip()
    if text.startswith('"'):
        if not text.endswith('"') or len(text) < 2:
            raise ContextBuildError(f"Unsupported double-quoted scalar: {raw!r}")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text[1:-1].replace('\\"', '"')
    if text.startswith("'"):
        if not text.endswith("'") or len(text) < 2:
            raise ContextBuildError(f"Unsupported single-quoted scalar: {raw!r}")
        return text[1:-1].replace("''", "'")
    if text in ("true", "false"):
        return text == "true"
    return text


def _block_scalar(marker: str, lines: list[str], start: int, parent_indent: int):
    """Collect a `>-` / `|` block that follows a key. Returns (text, next_index)."""
    chunk: list[str] = []
    i = start
    while i < len(lines) and (not lines[i].strip() or _indent(lines[i]) > parent_indent):
        chunk.append(lines[i])
        i += 1
    while chunk and not chunk[-1].strip():
        chunk.pop()
    stripped = [c.strip() for c in chunk]
    if marker.startswith("|"):
        text = "\n".join(stripped)
    else:
        paragraphs: list[list[str]] = [[]]
        for part in stripped:
            if part:
                paragraphs[-1].append(part)
            elif paragraphs[-1]:
                paragraphs.append([])
        text = "\n".join(" ".join(p) for p in paragraphs if p)
    return text, i


def _parse_map(lines: list[str], i: int, indent: int):
    out: dict = {}
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if _indent(line) < indent:
            break
        if _indent(line) > indent:
            raise ContextBuildError(f"Unexpected indentation in frontmatter: {line!r}")
        match = _KEY.match(line.strip())
        if not match:
            raise ContextBuildError(f"Unsupported frontmatter line: {line!r}")
        key, rest = match.group(1), (match.group(2) or "").strip()
        i += 1
        if rest in _BLOCK_MARKERS:
            out[key], i = _block_scalar(rest, lines, i, indent)
        elif rest == "":
            j = i
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines) and (
                _indent(lines[j]) > indent
                or (_indent(lines[j]) == indent and lines[j].lstrip().startswith("- "))
            ):
                out[key], i = _parse_node(lines, j, _indent(lines[j]))
            else:
                out[key] = ""
        else:
            out[key] = _scalar(rest)
    return out, i


def _is_map_item(rest: str) -> bool:
    if rest.startswith(("'", '"')) or not _KEY.match(rest):
        return False
    after = rest.split(":", 1)[1]
    return after.strip() == "" or after.startswith((" ", "\t"))


def _parse_list(lines: list[str], i: int, indent: int):
    out: list = []
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if _indent(line) != indent or not line.lstrip().startswith("- "):
            break
        rest = line.lstrip()[2:].strip()
        i += 1
        if rest in _BLOCK_MARKERS:
            text, i = _block_scalar(rest, lines, i, indent)
            out.append(text)
        elif _is_map_item(rest):
            # A map item: its first key sits after "- ", the rest are indented two further.
            virtual = [" " * (indent + 2) + rest]
            while i < len(lines) and (not lines[i].strip() or _indent(lines[i]) > indent):
                virtual.append(lines[i])
                i += 1
            item, _ = _parse_map(virtual, 0, indent + 2)
            out.append(item)
        else:
            parts = [rest]
            while (
                i < len(lines)
                and lines[i].strip()
                and _indent(lines[i]) > indent
                and not lines[i].lstrip().startswith("- ")
            ):
                parts.append(lines[i].strip())
                i += 1
            out.append(_scalar(" ".join(parts)))
    return out, i


def _parse_node(lines: list[str], i: int, indent: int):
    if lines[i].lstrip().startswith("- "):
        return _parse_list(lines, i, indent)
    return _parse_map(lines, i, indent)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split an MDX file into (frontmatter dict, body). No frontmatter gives ({}, text)."""
    text = text.replace("\r\n", "\n")
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end == -1:
        raise ContextBuildError("Frontmatter is not closed")
    block = text[4:end]
    body = text[end + 4 :].lstrip("\n")
    data, _ = _parse_map(block.split("\n"), 0, 0)
    return data, body


# ---------------------------------------------------------------------------------------------
# Case studies
# ---------------------------------------------------------------------------------------------


def clean_body(body: str) -> str:
    """Drop JSX wrappers, images and embeds; make site links absolute."""
    text = re.sub(r"<img\b[^>]*>", "", body)
    text = re.sub(r"</?[A-Za-z][^>]*>", "", text)
    text = re.sub(r"^!\[[^\]]*\]\([^)]*\)\s*$", "", text, flags=re.M)
    text = re.sub(r"(\]\()(/[^)\s]*)", lambda m: f"{m.group(1)}{SITE_URL}{m.group(2)}", text)
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _strings(value) -> list[str]:
    return [v for v in value if isinstance(v, str) and v.strip()] if isinstance(value, list) else []


def _maps(value) -> list[dict]:
    return [v for v in value if isinstance(v, dict)] if isinstance(value, list) else []


def load_hidden(site: Path, strict: bool) -> frozenset[str]:
    path = site / "constants" / "case-study-visibility.ts"
    if not path.is_file():
        if strict:
            raise ContextBuildError(f"Missing {path}")
        return frozenset()
    text = path.read_text(encoding="utf-8")
    match = re.search(r"HIDDEN_CASE_STUDIES[^=]*=\s*new Set\(\[(.*?)\]\)", text, re.S)
    if not match:
        raise ContextBuildError("Could not find the HIDDEN_CASE_STUDIES set literal")
    return frozenset(re.findall(r'"([^"]+)"', match.group(1)))


def load_case_studies(site: Path, hidden: frozenset[str]) -> list[dict]:
    directory = site / "content" / "case-studies" / "en"
    if not directory.is_dir():
        raise ContextBuildError(f"Missing {directory}")
    studies: list[dict] = []
    for path in sorted(directory.glob("*.mdx")):
        slug = path.stem
        data, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        client = str(data.get("client") or data.get("title") or slug)
        if not is_public(slug, client, data, hidden):
            continue
        quotes = [
            q
            for q in _maps(data.get("quotes"))
            if "[PLACEHOLDER" not in f"{q.get('text', '')} {q.get('author', '')}"
        ]
        try:
            order = float(data.get("order", 999))
        except ValueError:
            order = 999.0
        studies.append(
            {
                "slug": slug,
                "title": str(data.get("title", "")),
                "client": client,
                "description": str(data.get("description", "")),
                "summary": str(data.get("summary") or data.get("description", "")),
                "category": str(data.get("category", "")),
                "industry": str(data.get("industry", "")),
                "services": _strings(data.get("services")),
                "website": str(data.get("website", "")),
                "timeline": str(data.get("timeline", "")),
                "date": str(data.get("date", "")),
                "updated": str(data.get("updatedDate", "")),
                "order": order,
                "metrics": _maps(data.get("metrics")),
                "quotes": quotes,
                "outcomes": _strings(data.get("outcomes")),
                "challenge": str(data.get("challenge", "")).strip(),
                "goals": _strings(data.get("goals")),
                "deliverables": _strings(data.get("deliverables")),
                "body": clean_body(body),
            }
        )
    studies.sort(key=lambda s: (s["order"], s["slug"]))
    return studies


def render_case_study(study: dict, header: str) -> str:
    out = [header, f"# {study['title']}", ""]
    out.append(f"- Client: {study['client']}")
    out.append(f"- Source: {SITE_URL}/case-studies/{study['slug']}")
    if study["category"]:
        out.append(f"- Category: {study['category']}")
    if study["industry"]:
        out.append(f"- Industry: {study['industry']}")
    if study["services"]:
        out.append(f"- Services: {', '.join(study['services'])}")
    if study["timeline"]:
        out.append(f"- Timeline: {study['timeline']}")
    if study["website"]:
        out.append(f"- Client website: {study['website']}")
    if study["date"]:
        out.append(f"- Date: {study['date']} (updated {study['updated'] or study['date']})")
    out += ["", f"> {study['description']}", ""]
    if study["metrics"]:
        out += ["## Headline numbers", ""]
        for metric in study["metrics"]:
            line = f"- {metric.get('value', '')}: {metric.get('label', '')}"
            if metric.get("evidence"):
                line += f" (evidence: {metric['evidence']})"
            out.append(line)
        out.append("")
    for heading, items in (
        ("Outcomes", study["outcomes"]),
        ("Goals", study["goals"]),
        ("What Studio1 delivered", study["deliverables"]),
    ):
        if items:
            out += [f"## {heading}", ""] + [f"- {item}" for item in items] + [""]
    if study["challenge"]:
        out += ["## Challenge", "", study["challenge"], ""]
    if study["quotes"]:
        out += ["## Client quotes", ""]
        for quote in study["quotes"]:
            who = ", ".join(x for x in (quote.get("author"), quote.get("role")) if x)
            out.append(f"> {quote.get('text', '').strip()}")
            out.append(f"> {who}")
            out.append("")
    if study["body"]:
        out += ["## Full write-up (images and embeds removed)", "", study["body"], ""]
    return "\n".join(out).rstrip() + "\n"


def top_numbers(study: dict) -> str:
    metrics = [f"{m.get('value', '')} {m.get('label', '')}".strip() for m in study["metrics"][:3]]
    if metrics:
        return "; ".join(metrics)
    return "; ".join(study["outcomes"][:2]) or "none listed"


def render_index(studies: list[dict], header: str) -> str:
    out = [
        header,
        "# Case study index",
        "",
        f"{len(studies)} public case studies. Detail files are in"
        " `references/case-studies/<slug>.md`. Numbers are the site's own headline metrics; when a"
        " study lists none, its first outcomes are shown instead.",
        "",
    ]
    for study in studies:
        out += [
            f"## {study['client']} ({study['slug']})",
            "",
            f"- Title: {study['title']}",
            f"- Services: {', '.join(study['services']) or 'not listed'}",
            f"- Numbers: {top_numbers(study)}",
            f"- What was done: {study['summary']}",
            f"- Detail: `references/case-studies/{study['slug']}.md`",
            "",
        ]
    return "\n".join(out).rstrip() + "\n"


# ---------------------------------------------------------------------------------------------
# Services (public/llms.txt)
# ---------------------------------------------------------------------------------------------


def load_services(site: Path) -> list[dict]:
    path = site / "public" / "llms.txt"
    if not path.is_file():
        raise ContextBuildError(f"Missing {path}")
    text = path.read_text(encoding="utf-8")
    match = re.search(r"^## Services\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    if not match:
        raise ContextBuildError("llms.txt has no '## Services' section")
    services = []
    for line in match.group(1).splitlines():
        item = re.match(r"^- \[([^\]]+)\]\((https://www\.studio1hq\.com/[^)]*)\): (.+)$", line)
        if item:
            services.append({"name": item[1], "url": item[2], "description": item[3].strip()})
    if not services:
        raise ContextBuildError("No services parsed from llms.txt")
    return services


def render_services(services: list[dict], header: str) -> str:
    out = [
        header,
        "# Studio1 services",
        "",
        "Source: the Services list in the site's llms.txt. Numbers inside a description come from"
        " the case study named there.",
        "",
    ]
    for service in services:
        out += [
            f"## {service['name']}",
            "",
            f"- Page: {service['url']}",
            service["description"],
            "",
        ]
    return "\n".join(out).rstrip() + "\n"


# ---------------------------------------------------------------------------------------------
# Home page data (data/home.tsx) and logo strip (constants/data.ts)
# ---------------------------------------------------------------------------------------------


def _array_block(text: str, declaration: str, path: Path) -> str:
    start = text.find(declaration)
    if start == -1:
        raise ContextBuildError(f"{path.name}: could not find {declaration!r}")
    end = text.find("\n];", start)
    if end == -1:
        raise ContextBuildError(f"{path.name}: could not find the end of {declaration!r}")
    return text[start:end]


def load_testimonials(site: Path) -> list[dict]:
    path = site / "data" / "home.tsx"
    if not path.is_file():
        raise ContextBuildError(f"Missing {path}")
    text = path.read_text(encoding="utf-8")
    block = _array_block(text, "export const homeTestimonials", path)
    pattern = re.compile(
        r'name:\s*"(?P<name>[^"]+)",\s*role:\s*"(?P<role>[^"]+)",\s*'
        r"avatar:\s*[^\n]*,\s*content:\s*`(?P<content>[^`]*)`",
        re.S,
    )
    found = [m.groupdict() for m in pattern.finditer(block)]
    declared = len(re.findall(r"^\s{4}name:", block, re.M))
    if not found or len(found) != declared:
        raise ContextBuildError(
            f"home.tsx testimonials: parsed {len(found)} of {declared} entries, refusing to guess"
        )
    out = []
    for item in found:
        if "${" in item["content"] or "\\" in item["content"]:
            raise ContextBuildError(f"Testimonial by {item['name']} has template escapes")
        if mentions_excluded(item["name"], item["role"], item["content"]):
            continue
        out.append({"name": item["name"], "role": item["role"], "content": item["content"].strip()})
    return out


def render_testimonials(items: list[dict], header: str) -> str:
    out = [
        header,
        "<!-- Parsed from the homeTestimonials array in data/home.tsx by matching name, role and"
        " content; the entry count is checked against the source. Avatars and highlight lists are"
        " not extracted. -->",
        "# Testimonials",
        "",
        "Quote only these words, with the name and role shown. Source: Studio1 website home page.",
        "",
    ]
    for item in items:
        out += [f"## {item['name']}, {item['role']}", ""]
        out += [f"> {line}" if line else ">" for line in item["content"].split("\n")]
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def load_home_stats(site: Path) -> list[dict]:
    path = site / "data" / "home.tsx"
    text = path.read_text(encoding="utf-8")
    block = _array_block(text, "export const homeFeatures", path)
    stats = []
    for title in HOME_STAT_TITLES:
        entry = re.search(rf'title:\s*"{title}",\s*description:\s*\n?\s*"([^"]+)"', block)
        if not entry:
            raise ContextBuildError(f"home.tsx: no '{title}' description found")
        if mentions_excluded(entry.group(1)):
            continue
        stats.append({"title": title, "text": entry.group(1)})
    return stats


def load_logo_names(site: Path) -> list[str]:
    path = site / "constants" / "data.ts"
    if not path.is_file():
        raise ContextBuildError(f"Missing {path}")
    text = path.read_text(encoding="utf-8")
    block = _array_block(text, "export const trustedbyLogo", path)
    names = re.findall(r'^ {4}name:\s*"([^"]+)",$', block, re.M)
    declared = len(re.findall(r"^ {2}\{$", block, re.M))
    if not names or len(names) != declared:
        raise ContextBuildError(
            f"data.ts trustedbyLogo: parsed {len(names)} of {declared} names, refusing to guess"
        )
    return sorted({n for n in names if not mentions_excluded(n)}, key=str.lower)


def render_clients(logos: list[str], studies: list[dict], stats: list[dict], header: str) -> str:
    out = [
        header,
        "<!-- Names only. Logo names come from the trustedbyLogo array in constants/data.ts by"
        " matching its name fields; image files, sizing and styling are ignored. Company-wide"
        " numbers come from the homeFeatures array in data/home.tsx. -->",
        "# Clients and company numbers",
        "",
        "## Company numbers (Studio1 website home page)",
        "",
    ]
    out += [f"- {s['title']}: {s['text']}" for s in stats]
    out += [
        "",
        "These are site-wide claims, not tied to one case study. Quote them as 'per the Studio1"
        " website'.",
        "",
        "## Clients with a public case study",
        "",
    ]
    out += [f"- {s['client']}: `references/case-studies/{s['slug']}.md`" for s in studies]
    out += [
        "",
        "## Companies on the site's trusted-by logo strip",
        "",
        f"{len(logos)} names. A name here means the company appears on the strip, not that a case"
        " study or a quote exists.",
        "",
    ]
    out += [f"- {name}" for name in logos]
    return "\n".join(out).rstrip() + "\n"


# ---------------------------------------------------------------------------------------------
# SKILL.md and build
# ---------------------------------------------------------------------------------------------


def render_skill(studies: list[dict]) -> str:
    count = len(studies)
    return f"""---
name: studio1-context
description: Verified facts about the agency Studio1 (services, public case studies, proof numbers, client quotes, client names). Use when a deck, post or page must quote Studio1's real work.
---

# Studio1 context

Studio1 is a developer marketing and DevRel agency for DevTools companies. It sells technical
content, documentation and DX audits, developer video, DevRel and growth campaigns, GitHub growth,
product launches, Reddit and content distribution, influencer management and AEO. The pack holds
{count} public case studies.

## Rules

- Quote a number only if it is in this pack, and name the case study it came from. If a number is
  not here, leave it out or ask.
- Never name, link or show another agency.
- Say "DevTools companies" for the audience. Never "early-stage".
- Client work that is not public must not be mentioned. If it is not in this pack, it is not public.
- Company-wide numbers in `references/clients.md` are site claims; attribute them to the Studio1
  website, not to a client.

## Where to look

| File | Holds |
| --- | --- |
| `references/services.md` | Every service, with its page and what it covers |
| `references/case-studies.md` | Index: slug, client, title, services, headline numbers, one line on the work |
| `references/case-studies/<slug>.md` | One file per case study: facts, numbers with evidence links, outcomes, quotes, write-up |
| `references/testimonials.md` | Client quotes, word for word, with name and role |
| `references/clients.md` | Client names, company-wide numbers, and the trusted-by list |

Generated by `scripts/build_studio1_context.py`. Do not edit by hand; re-run the script.
"""


def build_pack(site: Path, strict: bool = True) -> dict[str, str]:
    """Return {relative path under skills/studio1-context: text}. Raises on any rule break.

    With strict=False, the optional TypeScript and llms.txt sources may be absent (used by tests
    that build from tiny fixtures); the pack then simply omits those files.
    """
    hidden = load_hidden(site, strict)
    studies = load_case_studies(site, hidden)
    if not studies:
        raise ContextBuildError("No public case studies found")

    header = "<!-- Generated by scripts/build_studio1_context.py. Do not edit. -->"
    files: dict[str, str] = {"SKILL.md": render_skill(studies)}
    files["references/case-studies.md"] = render_index(studies, header)
    for study in studies:
        files[f"references/case-studies/{study['slug']}.md"] = render_case_study(study, header)

    has_llms = (site / "public" / "llms.txt").is_file()
    has_home = (site / "data" / "home.tsx").is_file()
    has_data = (site / "constants" / "data.ts").is_file()
    if strict or has_llms:
        files["references/services.md"] = render_services(load_services(site), header)
    if strict or has_home:
        files["references/testimonials.md"] = render_testimonials(load_testimonials(site), header)
    if strict or (has_home and has_data):
        files["references/clients.md"] = render_clients(
            load_logo_names(site), studies, load_home_stats(site), header
        )

    assert_clean(files)
    return files


def write_pack(files: dict[str, str], out: Path) -> None:
    if (out / "references").exists():
        shutil.rmtree(out / "references")
    out.mkdir(parents=True, exist_ok=True)
    for rel, text in sorted(files.items()):
        target = out / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode("utf-8"))


def main(argv: list[str] | None = None) -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Build the studio1-context skill.")
    parser.add_argument("--site", type=Path, default=root.parent)
    parser.add_argument("--out", type=Path, default=root / "skills" / "studio1-context")
    args = parser.parse_args(argv)
    try:
        files = build_pack(args.site.resolve())
    except ContextBuildError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    write_pack(files, args.out)
    print(f"wrote {len(files)} files to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
