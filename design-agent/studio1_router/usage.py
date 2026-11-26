"""Append-only usage log. One JSON line per provider call: no page content, no keys."""

from __future__ import annotations

import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path


def month_of(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m")


class UsageLog:
    def __init__(self, path: Path) -> None:
        self.path = path

    def record(
        self,
        *,
        tool: str,
        provider: str,
        error: str | None,
        duration_ms: int,
        context: str | None,
        subject: str,
        now: datetime,
    ) -> None:
        line = {
            "ts": now.astimezone(UTC).isoformat(timespec="seconds"),
            "tool": tool,
            "provider": provider,
            "ok": error is None,
            "error": error,
            "duration_ms": duration_ms,
            "context": (context or "")[:120] or None,
            "subject": subject[:200],
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(line) + "\n")

    def month_counts(self, now: datetime) -> Counter[tuple[str, str]]:
        """Calls per (provider, tool) in the calendar month of `now`, errors included."""
        counts: Counter[tuple[str, str]] = Counter()
        if not self.path.exists():
            return counts
        month = month_of(now)
        for raw in self.path.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(raw)
                stamp = datetime.fromisoformat(row["ts"])
                if month_of(stamp) == month:
                    counts[(str(row["provider"]), str(row["tool"]))] += 1
            except (ValueError, KeyError, TypeError):
                continue  # a torn or foreign line never blocks the router
        return counts
