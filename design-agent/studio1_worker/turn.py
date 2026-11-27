"""One turn of the agent, shared by the hand-run commands and the queue."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from studio1_worker.decks import build_editable_deck
from studio1_worker.runners import REPO_ROOT, Runner, TurnResult

OUT_ROOT = REPO_ROOT / "workspace" / "out"


@dataclass
class TurnOutcome:
    result: TurnResult
    deck: Path | None = None
    deck_problem: str | None = None


def run_turn(
    runner: Runner,
    thread: str,
    prompt: str,
    attachments: Sequence[Path] = (),
    *,
    build_deck: bool,
    out_root: Path = OUT_ROOT,
) -> TurnOutcome:
    """Run the turn, then build `deck.pptx` from a delivered outline.

    Only the CLI runner has the files on this machine, so only it asks for the deck.
    """
    result = runner.run(thread, prompt, attachments)
    if not build_deck:
        return TurnOutcome(result)
    deck, problem = build_editable_deck(out_root / thread)
    if deck is not None:
        result.files = sorted({*result.files, deck.name})
    return TurnOutcome(result, deck, problem)
