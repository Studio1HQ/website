"""`uv run python -m studio1_pptx build outline.json --out deck.pptx` and `... check deck.pptx`."""

from __future__ import annotations

import sys
from pathlib import Path

import click

from studio1_pptx.build import build_deck
from studio1_pptx.check import check_deck
from studio1_pptx.outline import OutlineError


@click.group()
def main() -> None:
    """Build and check the editable PowerPoint for a Studio1 deck."""


@main.command()
@click.argument("outline", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--out", "out", required=True, type=click.Path(dir_okay=False, path_type=Path))
def build(outline: Path, out: Path) -> None:
    """Build OUTLINE (deck/outline.json) into a .pptx."""
    try:
        path = build_deck(outline, out)
    except OutlineError as exc:
        click.echo(f"outline refused: {exc}", err=True)
        sys.exit(1)
    click.echo(f"wrote {path}")


@main.command()
@click.argument("deck", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--outline", type=click.Path(exists=True, dir_okay=False, path_type=Path))
def check(deck: Path, outline: Path | None) -> None:
    """Reopen DECK and report whether it is on brand. Exit 1 on any failure."""
    result = check_deck(deck, outline)
    for line in result.report():
        click.echo(line)
    sys.exit(0 if result.ok else 1)


if __name__ == "__main__":
    main()
