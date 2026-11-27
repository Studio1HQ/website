"""Editable PowerPoint export for Studio1 pitch decks."""

from studio1_pptx.build import build_deck
from studio1_pptx.check import CheckResult, check_deck
from studio1_pptx.outline import OutlineError

__all__ = ["CheckResult", "OutlineError", "build_deck", "check_deck"]
