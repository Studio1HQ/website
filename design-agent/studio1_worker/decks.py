"""The editable PowerPoint, built on the host from the outline the agent delivered."""

from __future__ import annotations

import contextlib
import os
import tempfile
import zipfile
from pathlib import Path

OUTLINE_SUFFIX = "outline.json"
DECK_NAME = "deck.pptx"
MAX_OUTLINE_BYTES = 1024 * 1024


_FIXED_ZIP_TIME = (2020, 1, 1, 0, 0, 0)


def _freeze_zip_times(path: Path) -> None:
    """Rewrite the .pptx with one fixed timestamp on every entry.

    python-pptx stamps each zip entry with the current second, so the same outline built a
    second apart gave different bytes. The upload manifest compares hashes, so every event
    re-uploaded an unchanged deck. With fixed stamps the same outline is the same file.
    """
    with zipfile.ZipFile(path) as source:
        entries = [
            (info.filename, info.compress_type, source.read(info)) for info in source.infolist()
        ]
    with zipfile.ZipFile(path, "w") as target:
        for name, compress_type, data in entries:
            info = zipfile.ZipInfo(name, _FIXED_ZIP_TIME)
            info.compress_type = compress_type
            info.external_attr = 0o600 << 16
            target.writestr(info, data)


def _delivered_outlines(root: Path) -> list[Path]:
    """Regular files directly inside `root`. The agent wrote this folder, so a link or a name
    that resolves elsewhere could point the build at (or away from) a file it does not own."""
    found = []
    for candidate in root.glob(f"*{OUTLINE_SUFFIX}"):
        if candidate.is_symlink() or not candidate.is_file():
            continue
        if candidate.resolve().parent != root:
            continue
        found.append(candidate)
    return sorted(found)


def build_editable_deck(out_dir: Path) -> tuple[Path | None, str | None]:
    """Build `deck.pptx` beside a delivered outline.

    Returns the deck path, or a reason it was not built. Both are None when the turn delivered
    no outline. A deck that cannot be built never fails the event: the PDF is still there.
    """
    if out_dir.is_symlink():
        return None, f"{out_dir.name} is a symbolic link, so no deck was built there"
    if not out_dir.is_dir():
        return None, None
    root = out_dir.resolve()
    outlines = _delivered_outlines(root)
    if not outlines:
        return None, None
    outline = outlines[-1]
    if outline.stat().st_size > MAX_OUTLINE_BYTES:
        return None, f"{outline.name} is larger than {MAX_OUTLINE_BYTES // 1024} KiB"
    try:
        from studio1_pptx import OutlineError, build_deck
    except ImportError:
        return None, "python-pptx is not installed; run `uv sync --extra studio1`"
    deck = root / DECK_NAME
    # Exclusive creation of a fresh file, then an atomic swap: a link planted at deck.pptx is
    # replaced, never written through.
    handle, temp_name = tempfile.mkstemp(prefix=".deck-", suffix=".pptx", dir=root)
    os.close(handle)
    temp = Path(temp_name)
    try:
        build_deck(outline, temp)
        _freeze_zip_times(temp)
        if deck.is_symlink() or (deck.exists() and not deck.is_file()):
            deck.unlink()
        os.replace(temp, deck)
    except OutlineError as error:
        return None, str(error)
    except (OSError, zipfile.BadZipFile) as error:
        return None, f"the deck could not be written ({type(error).__name__})"
    finally:
        with contextlib.suppress(FileNotFoundError):
            temp.unlink()
    return out_dir / DECK_NAME, None
