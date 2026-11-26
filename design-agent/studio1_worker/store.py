"""A local stand-in for the dashboard's lead timeline.

Lives under `workspace/state/leads/`, which the repository already ignores.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from studio1_worker.directory import FREE_MAIL, LeadRef, host_matches
from studio1_worker.events import HEADINGS, SLUG, LeadEvent, slugify
from studio1_worker.runners import REPO_ROOT

DEFAULT_ROOT = REPO_ROOT / "workspace" / "state" / "leads"
_IDENTITY = (
    "company_name",
    "company_url",
    "source",
    "contact_name",
    "contact_role",
    "message",
    "call_at",
)
_BULLET = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+(.*\S)\s*$")


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def parse_report(reply: str) -> dict[str, list[str]]:
    """The three closing lists of a reply. A missing list comes back empty."""
    wanted = {h.lower(): h for h in HEADINGS}
    found: dict[str, list[str]] = {h: [] for h in HEADINGS}
    current: str | None = None
    for line in reply.splitlines():
        heading = re.sub(r"^[\s#*_`]+|[\s*_`:]+$", "", line).lower()
        if heading in wanted:
            current = wanted[heading]
            found[current] = []  # the last copy of a heading wins
        elif current and (match := _BULLET.match(line)):
            found[current].append(match.group(1))
    return found


class LeadStore:
    def __init__(self, root: Path = DEFAULT_ROOT) -> None:
        self.root = root

    def folder(self, slug: str) -> Path:
        if not SLUG.fullmatch(slug):
            raise ValueError(f"not a lead slug: {slug!r}")
        return self.root / slug

    def slugs(self) -> list[str]:
        if not self.root.is_dir():
            return []
        return sorted(p.name for p in self.root.iterdir() if (p / "lead.json").is_file())

    def load_lead(self, slug: str) -> dict[str, Any] | None:
        path = self.folder(slug) / "lead.json"
        if not path.is_file():
            return None
        data: dict[str, Any] = json.loads(path.read_text())
        return data

    def _save_lead(self, slug: str, lead: dict[str, Any]) -> None:
        folder = self.folder(slug)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "lead.json").write_text(json.dumps(lead, indent=2) + "\n")

    def _ref(self, slug: str, lead: dict[str, Any]) -> LeadRef:
        return LeadRef(
            key=slug,
            slug=slug,
            name=str(lead.get("company_name") or slug),
            url=str(lead.get("company_url") or ""),
            source=str(lead.get("source") or "mail"),
        )

    def find_by_sender_domain(self, domain: str) -> LeadRef | None:
        if not domain or domain in FREE_MAIL:
            return None
        for slug in self.slugs():
            lead = self.load_lead(slug) or {}
            ref = self._ref(slug, lead)
            if ref.host and host_matches(domain, ref.host):
                return ref
        return None

    def find_by_name(self, name: str) -> LeadRef | None:
        slug = slugify(name)
        lead = self.load_lead(slug) if slug else None
        return self._ref(slug, lead) if lead else None

    def upsert_lead(self, event: LeadEvent, thread_id: str) -> dict[str, Any]:
        """Latest known facts; a new value replaces an old one, an absent one keeps it."""
        lead = self.load_lead(event.lead_slug) or {"lead_slug": event.lead_slug}
        for key in _IDENTITY:
            value = getattr(event, key)
            if value is not None:
                lead[key] = value
        lead["thread_id"] = thread_id
        lead["updated_at"] = _now()
        self._save_lead(event.lead_slug, lead)
        return lead

    def _events(self, slug: str) -> list[dict[str, Any]]:
        path = self.folder(slug) / "events.jsonl"
        if not path.is_file():
            return []
        return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

    def _write_events(self, slug: str, events: list[dict[str, Any]]) -> None:
        text = "".join(json.dumps(e) + "\n" for e in events)
        (self.folder(slug) / "events.jsonl").write_text(text)

    def events(self, slug: str) -> list[dict[str, Any]]:
        return self._events(slug)

    def queue(self, event: LeadEvent) -> int:
        events = self._events(event.lead_slug)
        number = len(events) + 1
        events.append(
            {
                "n": number,
                "at": _now(),
                "status": "queued",
                "event": event.model_dump(mode="json", exclude_none=True),
            }
        )
        self.folder(event.lead_slug).mkdir(parents=True, exist_ok=True)
        self._write_events(event.lead_slug, events)
        return number

    def set_status(self, slug: str, number: int, status: str, error: str | None = None) -> None:
        events = self._events(slug)
        for item in events:
            if item["n"] == number:
                item["status"] = status
                item[f"{status}_at"] = _now()
                if error:
                    item["error"] = error
        self._write_events(slug, events)

    def finish(self, event: LeadEvent, number: int, reply: str, files: list[str]) -> dict[str, Any]:
        slug = event.lead_slug
        reports = self.folder(slug) / "reports"
        reports.mkdir(parents=True, exist_ok=True)
        (reports / f"{number}-{event.kind.value}.md").write_text(reply.rstrip() + "\n")
        lists = parse_report(reply)
        lead = self.load_lead(slug) or {"lead_slug": slug}
        lead.update(
            last_event=event.kind.value,
            last_event_n=number,
            files=files,
            done=lists["Done"],
            waiting=lists["Waiting on a founder"],
            next=lists["Next"],
            updated_at=_now(),
        )
        self._save_lead(slug, lead)
        self.set_status(slug, number, "done")
        return lead
