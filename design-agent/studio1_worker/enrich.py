"""Enrichment: a short factual profile of a new lead's company, saved before the agent starts.

No model is involved. Facts come through the search router's own tool functions, called in this
process (`studio1_router.tools`), so the router's provider order, monthly caps and usage log apply
exactly as they do to the agent. There is no other way to a provider from here.

Two sources, in this order of trust:
1. GitHub (free). An org counts as the company only when the website on its GitHub profile is the
   lead's website, or when a person names the org (`--github`).
2. A LinkedIn company record through Bright Data (paid). It runs only when the router's
   `company_profile` tool is switched on, which it is not in the shipped config (see
   `studio1_router/providers/brightdata.py` for why). One web search finds the company page, and
   the record counts only when the website it names is the lead's website.

Everything fetched is outside text. It is cleaned to one plain line per fact and capped before it
is stored or shown to the agent, the prompt puts it inside an outside-text block, and email
addresses and phone numbers are removed. No person is ever looked up.
"""

from __future__ import annotations

import asyncio
import logging
import re
from collections.abc import Coroutine, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from enum import StrEnum
from typing import Any

from studio1_router import tools
from studio1_router.providers.github import REF as GITHUB_REF
from studio1_router.providers.github import site_host
from studio1_router.router import AllProvidersFailed, Router
from studio1_worker.events import plain_text
from studio1_worker.queue import LeadResearch, QueuedEvent, Supabase

_LOGGER = logging.getLogger(__name__)

#: The whole lookup, both sources together, stops after this many seconds.
ENRICH_SECONDS = 60.0
#: A repository this starred is used by developers outside the company.
STAR_TRACTION = 100
#: A push or a release this recent means the product is alive.
ACTIVE_DAYS = 365
#: A team this big has a real product, whatever GitHub shows.
SIZED_TEAM = 11
#: Words that say a company builds for developers.
DEV_TERMS = re.compile(
    r"\b(developers?|devtools?|developer tools?|apis?|sdks?|cli|open[- ]source|devops|"
    r"infrastructure|databases?|observability|kubernetes|frameworks?|libraries|self-hosted|"
    r"backend|mcp|llm ops|mlops)\b",
    re.IGNORECASE,
)
_STAGES = ("pre-seed", "seed", *(f"series {c}" for c in "abcdefghijk"), "ipo")
_STAGE = re.compile(r"\b(pre-seed|seed|series [a-k]|ipo)\b", re.IGNORECASE)
_EMAIL = re.compile(r"[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}")
_PHONE = re.compile(
    r"(?:\+|\b00)\d[\d ().-]{6,}\d|\(\d{2,4}\)\s?\d[\d .-]{5,}\d|\b\d{3}[ .-]\d{3}[ .-]\d{4}\b"
)
# Funding keys that could carry a person's name are skipped (its shape is undocumented).
_PERSONAL_KEYS = ("investor", "name", "person", "people", "contact", "email", "phone", "founder")


class FitLevel(StrEnum):
    STRONG = "Strong"
    GOOD = "Good"
    WEAK = "Weak"
    UNCLEAR = "Unclear"


@dataclass(frozen=True)
class Fit:
    level: FitLevel
    reasons: tuple[str, ...] = ()

    def line(self) -> str:
        """`Fit: <level>`, then ` - ` and the reasons when there are any. Always one line."""
        head = f"Fit: {self.level.value}"
        reasons = plain_text(", ".join(self.reasons), 200 - len(head) - 3)
        return f"{head} - {reasons}" if reasons else head


@dataclass(frozen=True)
class Target:
    """What is known before the lookup. `github` and `linkedin` only when a person gives them."""

    company: str
    website: str
    github: str | None = None
    linkedin: str | None = None

    @property
    def host(self) -> str:
        return site_host(self.website)


@dataclass(frozen=True)
class Repo:
    name: str  # owner/repo, checked against GitHub's name rules
    stars: int | None = None
    last_push: str = ""  # YYYY-MM-DD
    description: str = ""

    @property
    def url(self) -> str:
        return f"https://github.com/{self.name}"


@dataclass(frozen=True)
class Source:
    label: str
    url: str


@dataclass(frozen=True)
class Profile:
    company: str
    website: str
    what_they_do: str = ""
    industry: str = ""
    team_size: str = ""
    employees: int | None = None  # the lower bound of the team size, for the rules
    funding: str = ""
    stage: str = ""
    github: str = ""
    headline_repo: str = ""
    stars: int | None = None  # of the headline repository
    last_release: str = ""
    last_activity: str = ""  # the newest push or release, YYYY-MM-DD
    top_repos: tuple[Repo, ...] = ()
    sources: tuple[Source, ...] = ()
    notes: tuple[str, ...] = ()
    failed: bool = False  # a lookup errored or ran out of time

    @property
    def found(self) -> bool:
        return bool(
            self.what_they_do or self.industry or self.team_size or self.funding or self.github
        )


@dataclass
class _Part:
    """What one source gave: Profile field values, its sources and what it could not do."""

    fields: dict[str, Any] = field(default_factory=dict)
    sources: list[Source] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    failed: bool = False


# ---------- cleaning outside values ----------


def public_text(value: object, limit: int) -> str:
    """One plain line from outside, with email addresses and phone numbers taken out."""
    text = plain_text(value, limit * 2)
    text = _PHONE.sub("", _EMAIL.sub("", text))
    return plain_text(text, limit)


def _count(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value < 10**10:
        return None
    return value


def _day(value: object) -> str:
    if not isinstance(value, str) or not re.match(r"\d{4}-\d{2}-\d{2}", value):
        return ""
    try:
        return date.fromisoformat(value[:10]).isoformat()
    except ValueError:
        return ""


def _joined(value: object) -> str:
    if isinstance(value, list):
        return ", ".join(v for v in value if isinstance(v, str))
    return value if isinstance(value, str) else ""


def _sentences(text: str, limit: int, count: int = 2) -> str:
    """The first one or two sentences, for "what they do"."""
    parts = re.split(r"(?<=[.!?])\s+", text)
    return plain_text(" ".join(parts[:count]), limit)


def lower_bound(size: str) -> int | None:
    """11 from "11-50 employees", 10001 from "10,001+ employees", None without a number."""
    match = re.search(r"\d[\d,]*", size)
    return int(match.group(0).replace(",", "")) if match else None


def stage_of(funding: str, organization_type: str = "") -> str:
    if "public company" in organization_type.lower():
        return "public company"
    found = {m.lower() for m in _STAGE.findall(funding)}
    latest = [s for s in _STAGES if s in found]
    return latest[-1] if latest else ""


def _funding_text(funding: object) -> str:
    """The record's `funding`, flattened. Its sub-fields are not documented, so scalar values are
    shown with their own key names, skipping any key that could hold a person's name."""
    if isinstance(funding, str):
        return public_text(funding, 300)
    if not isinstance(funding, dict):
        return ""
    parts: list[str] = []
    for key, value in list(funding.items())[:12]:
        label = plain_text(str(key).replace("_", " "), 40).lower()
        if any(word in label for word in _PERSONAL_KEYS):
            continue
        if isinstance(value, bool) or not isinstance(value, str | int | float):
            continue
        text = public_text(str(value), 80)
        if label and text:
            parts.append(f"{label}: {text}")
    return plain_text("; ".join(parts), 300)


# ---------- reading what each source gave ----------


def _repo(item: Mapping[str, Any]) -> Repo | None:
    name = item.get("name")
    if not isinstance(name, str) or "/" not in name or not GITHUB_REF.fullmatch(name):
        return None
    return Repo(
        name=name,
        stars=_count(item.get("stars")),
        last_push=_day(item.get("last_push")),
        description=public_text(item.get("description"), 200),
    )


def github_part(result: Mapping[str, Any], *, given: bool, host: str = "") -> _Part:
    """Facts from `lookup_company`. Candidates are never facts."""
    ref = result.get("github")
    if result.get("kind") != "facts" or not isinstance(ref, str) or not GITHUB_REF.fullmatch(ref):
        where = f" names {host}" if host else " matches"
        return _Part(notes=[f"GitHub: no org found whose GitHub profile{where}"])
    head_raw = result.get("headline_repository")
    head = _repo(head_raw) if isinstance(head_raw, dict) else None
    org = result.get("org") if isinstance(result.get("org"), dict) else {}
    top = result.get("top_repositories")
    repos = tuple(
        r for item in (top if isinstance(top, list) else []) if isinstance(item, dict)
        if (r := _repo(item)) is not None
    )  # fmt: skip
    release = _day(head_raw.get("latest_release")) if isinstance(head_raw, dict) else ""
    pushes = [head.last_push if head else "", release, *(r.last_push for r in repos)]
    owner = ref.split("/")[0]
    how = "named by a person" if given else f"its GitHub profile names {host}"
    return _Part(
        fields={
            "github": ref,
            "headline_repo": head.name if head else "",
            "stars": head.stars if head else None,
            "last_release": release,
            "last_activity": max((p for p in pushes if p), default=""),
            "top_repos": repos,
            "what_they_do": public_text(org.get("description") if org else None, 300)
            or (head.description if head else ""),
        },
        sources=[Source(f"GitHub ({how})", f"https://github.com/{owner}")],
    )


def linkedin_part(record: Mapping[str, Any], target: Target) -> _Part:
    """Facts from a LinkedIn company record, used only when it names the lead's website."""
    site = site_host(_joined(record.get("website"))) or site_host(
        _joined(record.get("website_simplified"))
    )
    if not site or site != target.host:
        return _Part(notes=["LinkedIn: the page found does not name this website, so not used"])
    size = public_text(record.get("company_size"), 60)
    employees = lower_bound(size)
    on_linkedin = _count(record.get("employees_in_linkedin"))
    if employees is None and on_linkedin:
        employees, size = on_linkedin, f"{on_linkedin} people on LinkedIn"
    funding = _funding_text(record.get("funding"))
    page = tools.linkedin_company_url(_joined(record.get("page")) or _joined(record.get("url")))
    return _Part(
        fields={
            "what_they_do": _sentences(public_text(record.get("about"), 1000), 300),
            "industry": public_text(_joined(record.get("industries")), 120),
            "team_size": size,
            "employees": employees,
            "funding": funding,
            "stage": stage_of(funding, public_text(record.get("organization_type"), 60)),
        },
        sources=[Source("LinkedIn, through Bright Data", page)] if page else [],
    )


def merge(target: Target, parts: Sequence[_Part]) -> Profile:
    """One profile. Earlier parts win a field both have, so pass LinkedIn before GitHub."""
    values: dict[str, Any] = {}
    for part in parts:
        for key, value in part.fields.items():
            if key not in values and value not in ("", None, ()):
                values[key] = value
    return Profile(
        company=plain_text(target.company, 200),
        website=plain_text(target.website, 300),
        sources=tuple(s for part in parts for s in part.sources),
        notes=tuple(n for part in parts for n in part.notes),
        failed=any(part.failed for part in parts),
        **values,
    )


# ---------- the fit ----------


def _recent(day: str, today: date, days: int) -> bool:
    return bool(day) and date.fromisoformat(day) >= today - timedelta(days=days)


def short_number(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M".replace(".0M", "M")
    if n >= 1_000:
        return f"{n / 1_000:.1f}K".replace(".0K", "K")
    return str(n)


def fit_of(profile: Profile, today: date) -> Fit:
    """Studio1 sells content, DevRel and launch work to DevTools companies at every stage.

    1. Developer-facing means its own words name developer things (API, SDK, CLI, open source and
       so on) or a repository has 100+ stars. Developer-facing with a live product (a push or a
       release in the last year, or a team of 11 or more) is Strong; without one it is Good.
    2. A company that says what it does, with none of that, is Weak: no developer product.
    3. Anything less is Unclear.
    Stage and team size are shown as reasons. They never lower the fit.
    """
    words = " ".join(
        [profile.what_they_do, profile.industry, *(r.description for r in profile.top_repos)]
    )
    terms = list(dict.fromkeys(m.lower() for m in DEV_TERMS.findall(words)))
    stars = profile.stars or 0
    traction = stars >= STAR_TRACTION
    active = _recent(profile.last_activity, today, ACTIVE_DAYS)
    sized = (profile.employees or 0) >= SIZED_TEAM
    extra = tuple(x for x in (profile.team_size, profile.stage) if x)
    if terms or traction:
        reasons = [f"developer-facing ({', '.join(terms[:3])})" if terms else "developer-facing"]
        if traction:
            reasons.append(f"{short_number(stars)} GitHub stars")
        if active:
            reasons.append(f"active on GitHub {profile.last_activity}")
        if active or sized:
            return Fit(FitLevel.STRONG, (*reasons, *extra))
        return Fit(FitLevel.GOOD, (*reasons, "no sign of a live product", *extra))
    if profile.what_they_do or profile.industry:
        return Fit(FitLevel.WEAK, ("no developer product found", *extra))
    if profile.failed:
        return Fit(FitLevel.UNCLEAR, ("the lookups failed or ran out of time",))
    return Fit(FitLevel.UNCLEAR, ("too little public data",))


# ---------- writing it out ----------


def _sentence(text: str) -> str:
    return text if not text or text.endswith((".", "!", "?")) else f"{text}."


def _github_line(profile: Profile) -> str:
    if not profile.github:
        return ""
    facts = [profile.headline_repo or profile.github]
    if profile.stars is not None:
        facts.append(f"{profile.stars:,} stars")
    if profile.last_release:
        facts.append(f"last release {profile.last_release}")
    if profile.last_activity:
        facts.append(f"last activity {profile.last_activity}")
    line = f"GitHub: {', '.join(facts)}."
    if profile.top_repos:
        repos = [
            f"{r.name} ({r.stars:,} stars)" if r.stars is not None else r.name
            for r in profile.top_repos[:5]
        ]
        line += f" Top repositories: {', '.join(repos)}."
    return line


def lead_fields(profile: Profile, fit: Fit, today: date) -> dict[str, str]:
    """The lead page fields: `about` (what they do and size), `funding` and `why_fit`, whose
    first line is the fit line the dashboard reads. Empty values are left out."""
    about = " ".join(
        _sentence(x)
        for x in (
            profile.what_they_do,
            f"Industry: {profile.industry}" if profile.industry else "",
            f"Team size: {profile.team_size}" if profile.team_size else "",
        )
        if x
    )
    why = [fit.line()]
    if line := _github_line(profile):
        why.append(line)
    if profile.sources:
        why.append("Sources: " + ", ".join(s.url for s in profile.sources))
    why.append(
        f"Written by the enrichment step on {today.isoformat()} from public sources, "
        "without a model."
    )
    fields = {
        "about": plain_text(about, 600),
        "funding": plain_text(profile.funding, 300),
        "why_fit": "\n".join(why)[:1200],
    }
    return {k: v for k, v in fields.items() if v}


def profile_text(profile: Profile, fit: Fit) -> str:
    """The profile as plain lines, for the prompt's outside block and for the command line."""
    lines = [
        f"What they do: {profile.what_they_do}" if profile.what_they_do else "",
        f"Industry: {profile.industry}" if profile.industry else "",
        f"Team size: {profile.team_size}" if profile.team_size else "",
        f"Funding: {profile.funding}" if profile.funding else "",
        f"Stage: {profile.stage}" if profile.stage else "",
        _github_line(profile),
    ]
    for repo in profile.top_repos[:5]:
        if repo.description:
            lines.append(f"- {repo.name}: {repo.description}")
    lines.append(fit.line())
    for source in profile.sources:
        lines.append(f"Source: {source.label}, {source.url}")
    lines += [f"Not found: {note}" for note in profile.notes]
    return "\n".join(line for line in lines if line)


def on_file_text(research: LeadResearch) -> str:
    """What the lead page already says, for the prompt, when no lookup is made."""
    lines = ["Already on the lead page (written earlier by a person or by the enrichment step):"]
    for label, value in (
        ("About", research.about),
        ("Funding", research.funding),
        ("Why fit", research.why_fit),
    ):
        if text := plain_text(value, 1200):
            lines.append(f"{label}: {text}")
    return "\n".join(lines)


# ---------- looking it up ----------


class Enricher:
    def __init__(self, router: Router, *, seconds: float = ENRICH_SECONDS) -> None:
        self.router = router
        self.seconds = seconds

    def run(self, target: Target, context: str | None = None) -> Profile:
        return asyncio.run(self.lookup(target, context))

    async def lookup(self, target: Target, context: str | None = None) -> Profile:
        """Both sources at once, under one time limit. A source that fails or runs out of time
        adds a note and marks the profile failed; whatever the other found is kept."""
        deadline = asyncio.get_running_loop().time() + self.seconds
        linkedin, github = await asyncio.gather(
            self._bounded("LinkedIn", self._linkedin(target, context), deadline, context),
            self._bounded("GitHub", self._github(target, context), deadline, context),
        )
        return merge(target, [linkedin, github])

    async def _bounded(
        self,
        label: str,
        work: Coroutine[Any, Any, _Part],
        deadline: float,
        context: str | None,
    ) -> _Part:
        """One source under the shared deadline. A failure is one log line: the source, the
        thread id and the error's type, never a message or any fetched text."""
        try:
            async with asyncio.timeout_at(deadline):
                return await work
        except TimeoutError:
            problem, note = "ran out of time", f"{label}: ran out of time"
        except AllProvidersFailed:
            problem, note = "failed (no provider could serve it)", f"{label}: the lookup failed"
        except Exception as error:  # noqa: BLE001 - one source failing must not stop the other
            problem, note = f"failed ({type(error).__name__})", f"{label}: the lookup failed"
        _LOGGER.warning("enrichment on %s: %s lookup %s", context or "-", label, problem)
        return _Part(notes=[note], failed=True)

    async def _github(self, target: Target, context: str | None) -> _Part:
        if not target.github and not target.host:
            return _Part(notes=["GitHub: no website or org to look up"])
        if not self.router.available("lookup_company"):
            return _Part()
        result = await tools.lookup_company(
            self.router,
            target.company,
            target.github,
            context,
            website=None if target.github else target.website,
        )
        return github_part(result, given=bool(target.github), host=target.host)

    async def _linkedin(self, target: Target, context: str | None) -> _Part:
        if not self.router.available("company_profile"):
            return _Part()  # switched off: nothing to say, nothing spent
        if not target.host:
            return _Part(notes=["LinkedIn: no website to check a record against"])
        if target.linkedin:
            page = tools.linkedin_company_url(target.linkedin)
        else:
            page = await self._find_page(target, context)
        if page is None:
            return _Part(notes=["LinkedIn: no company page found"])
        record = await tools.company_profile(self.router, page, context)
        return linkedin_part(record, target)

    async def _find_page(self, target: Target, context: str | None) -> str | None:
        if not self.router.available("web_search"):
            return None
        hits = await tools.web_search(self.router, _search_query(target), 5, context)
        for hit in hits:
            page = tools.linkedin_company_url(str(hit.get("url") or ""))
            if page is not None:
                return page
        return None

    def plan(self, target: Target) -> list[str]:
        """What `lookup` would call, from the config and the usage log only. Calls nothing."""
        host = target.host
        lines = [f"Would look up {target.company} ({host or 'no website'}). Nothing is called now."]
        github = self._describe("lookup_company")
        if target.github:
            lines.append(f"1. GitHub facts for {target.github} with lookup_company: {github}.")
        elif host:
            lines.append(
                f"1. GitHub orgs named like {target.company!r} with lookup_company; one counts "
                f"only if its GitHub profile names {host}: {github}. Free."
            )
        else:
            lines.append("1. GitHub: skipped, no website or org given.")
        if not self.router.available("company_profile"):
            lines.append(
                "2. LinkedIn through Bright Data: off, so nothing is spent "
                f"({self._describe('company_profile')})."
            )
        elif not host:
            lines.append("2. LinkedIn: skipped, no website to check a record against.")
        else:
            find = (
                f"the page {target.linkedin}"
                if target.linkedin
                else f"web_search for {_search_query(target)} ({self._describe('web_search')})"
            )
            lines.append(
                f"2. LinkedIn: {find}, then company_profile "
                f"({self._describe('company_profile')}); the record counts only if it names "
                f"{host}. Paid: up to two calls."
            )
        lines.append(f"Time limit: {self.seconds:g} seconds for all of it.")
        return lines

    def _describe(self, tool: str) -> str:
        steps = self.router.plan(tool)
        usable = [name for name, reason in steps if reason is None]
        skipped = [f"{name} {reason}" for name, reason in steps if reason is not None]
        head = f"tries {', '.join(usable)}" if usable else "no provider would be tried"
        return head + (f"; skipped: {', '.join(skipped)}" if skipped else "")


def _search_query(target: Target) -> str:
    name = plain_text(target.company, 100).replace('"', "")
    return f'"{name}" site:linkedin.com/company'


# ---------- the queue's lead_created step ----------


def enrich_lead(
    db: Supabase, enricher: Enricher, event: QueuedEvent, *, today: date | None = None
) -> str | None:
    """Look the lead's company up, save what is new to the lead, and return the profile text for
    the prompt (None when there is nothing to show).

    A lead whose `about` and `why_fit` are already filled is not looked up again; what is on file
    goes to the prompt instead. An empty field is filled; one with text is never overwritten,
    unless the event's payload has `"refresh_profile": true`. Only inbound leads are written.
    A lookup that failed and found nothing writes nothing, so no failure reads as "Unclear".
    Database errors are raised: the caller logs them and goes on without a profile.
    """
    if not event.org_name.strip():
        return None
    research = db.get_lead_research(event.org_id)
    if research is None:
        return None
    refresh = event.payload.get("refresh_profile") is True
    if research.filled and not refresh:
        _LOGGER.info(
            "event %s: org %s has a profile already, not looked up", event.id, event.org_id
        )
        return on_file_text(research)
    lead = event.to_lead_event()
    profile = enricher.run(Target(lead.company_name, lead.company_url), context=event.thread)
    day = today or datetime.now(UTC).date()
    fit = fit_of(profile, day)
    saved: list[str] = []
    if research.inbound and (profile.found or not profile.failed):
        wanted = {
            name: value
            for name, value in lead_fields(profile, fit, day).items()
            if refresh or research.empty(name)
        }
        if wanted:
            saved = db.save_lead_research(event.org_id, wanted, only_empty=not refresh)
    _LOGGER.info(
        "event %s: profile for org %s, fit %s, saved %s",
        event.id,
        event.org_id,
        fit.level.value,
        ", ".join(saved) or "nothing",
    )
    return profile_text(profile, fit)
