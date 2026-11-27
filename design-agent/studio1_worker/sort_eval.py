"""Measure the inbox sorter on mail a person already sorted by hand."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from studio1_worker.directory import LeadRef
from studio1_worker.sorter import (
    Label,
    Mail,
    ModelClient,
    SorterSettings,
    apply_rules,
    classify,
    parse_eml,
)

TRUE_LABELS = ("lead", "not_sure", "selling_to_us", "job_ask", "partner_ask", "noise")
UNREADABLE = "unreadable"


class NoLeads:
    """No lead exists, so every mail is judged on its own, as a first mail would be."""

    def find_by_sender_domain(self, domain: str) -> LeadRef | None:  # noqa: ARG002
        return None

    def find_by_name(self, name: str) -> LeadRef | None:  # noqa: ARG002
        return None


@dataclass
class Outcome:
    file: str
    truth: str
    label: str
    action: str
    reason: str


@dataclass
class EvalReport:
    outcomes: list[Outcome] = field(default_factory=list)

    @property
    def true_leads(self) -> list[Outcome]:
        return [o for o in self.outcomes if o.truth == "lead"]

    @property
    def missed_leads(self) -> list[Outcome]:
        """True leads that were neither labelled lead nor held for review: nobody would see them."""
        return [o for o in self.true_leads if o.action not in ("create_lead", "hold")]

    @property
    def false_starts(self) -> list[Outcome]:
        """Mail that is not a lead but would have started the agent."""
        return [o for o in self.outcomes if o.truth != "lead" and o.action == "create_lead"]

    @property
    def recall(self) -> float | None:
        leads = self.true_leads
        hits = sum(o.label == "lead" for o in leads)
        return hits / len(leads) if leads else None

    @property
    def precision(self) -> float | None:
        said = [o for o in self.outcomes if o.label == "lead"]
        return sum(o.truth == "lead" for o in said) / len(said) if said else None


def collect(folder: Path, limit: int | None = None) -> list[tuple[str, Path]]:
    found: list[tuple[str, Path]] = []
    for truth in TRUE_LABELS:
        sub = folder / truth
        if sub.is_dir():
            files = sorted(p for p in sub.glob("*.eml") if p.is_file() and not p.is_symlink())
            found += [(truth, p) for p in (files[:limit] if limit else files)]
    return found


def parsed(path: Path) -> Mail | None:
    try:
        return parse_eml(path.read_bytes())
    except (OSError, ValueError):
        return None


def count_model_calls(items: list[tuple[str, Path]]) -> int:
    """Mail the rules decide never reaches the model."""
    total = 0
    for _truth, path in items:
        mail = parsed(path)
        if mail is not None and apply_rules(mail, NoLeads()) is None:
            total += 1
    return total


def evaluate(
    items: list[tuple[str, Path]], client: ModelClient, settings: SorterSettings, root: Path
) -> EvalReport:
    report = EvalReport()
    for truth, path in items:
        name = str(path.relative_to(root))
        mail = parsed(path)
        if mail is None:
            report.outcomes.append(Outcome(name, truth, UNREADABLE, "skip", "could not be read"))
            continue
        result = classify(mail, leads=NoLeads(), client=client, settings=settings)
        report.outcomes.append(
            Outcome(name, truth, result.label.value, result.action, result.reason)
        )
    return report


def format_report(report: EvalReport) -> list[str]:
    seen = [o.label for o in report.outcomes]
    columns = [*(label.value for label in Label), UNREADABLE]
    columns = [c for c in columns if c in seen]
    width = max([len(c) for c in columns] + [5])
    lines = ["Confusion table (rows are the true label, columns what the sorter said):"]
    lines.append(" " * 15 + "".join(c.rjust(width + 2) for c in columns))
    for truth in TRUE_LABELS:
        mine = [o for o in report.outcomes if o.truth == truth]
        if not mine:
            continue
        cells = "".join(str(sum(o.label == c for o in mine)).rjust(width + 2) for c in columns)
        lines.append(truth.ljust(15) + cells)

    def pct(value: float | None) -> str:
        return "n/a" if value is None else f"{value:.0%}"

    lines += [
        "",
        f"Lead recall: {pct(report.recall)} ({sum(o.label == 'lead' for o in report.true_leads)} "
        f"of {len(report.true_leads)} true leads labelled lead)",
        f"Lead precision: {pct(report.precision)}",
        "",
        f"Missed leads, neither labelled lead nor held for review ({len(report.missed_leads)}):",
    ]
    lines += [f"  {o.file}: said {o.label}. {o.reason}" for o in report.missed_leads] or ["  none"]
    lines.append(f"Not leads that would have started the agent ({len(report.false_starts)}):")
    lines += [f"  {o.file} ({o.truth}): {o.reason}" for o in report.false_starts] or ["  none"]
    return lines
