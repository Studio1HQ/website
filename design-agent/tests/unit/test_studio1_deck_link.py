"""Editable decks: the worker sends a PowerPoint deck to Drive and records the link beside it."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
import pytest

from studio1_worker import drive
from studio1_worker.serve import drive_deck_link, slides_link_for, upload_new_files
from tests.unit.test_studio1_queue import EVENT, ORG, FakeSupabase, db_for, event_row

FILE_ID = "1AbC_dEf-123456"
LINK = f"https://docs.google.com/presentation/d/{FILE_ID}/edit"


def claimed_event(fake: FakeSupabase) -> Any:
    fake.events = [event_row()]
    event = db_for(fake).claim_event()
    assert event is not None
    return event


def outputs(tmp_path: Path, **files: bytes) -> Path:
    folder = tmp_path / "out" / "lead-x"
    folder.mkdir(parents=True)
    for name, data in files.items():
        (folder / name.replace("_", ".")).write_bytes(data)
    return tmp_path / "out"


def recorded(fake: FakeSupabase) -> dict[str, dict[str, Any]]:
    return {row["name"]: row for row in fake.calls("POST", "rest/v1/agent_files")}


def test_only_the_powerpoint_deck_goes_to_drive_and_its_link_is_recorded(tmp_path: Path) -> None:
    fake = FakeSupabase()
    event = claimed_event(fake)
    out = outputs(tmp_path, deck_pptx=b"PK deck", brief_md=b"# brief")
    asked: list[tuple[str, str]] = []

    def link(path: Path, title: str) -> str:
        asked.append((path.name, title))
        return LINK

    stored = upload_new_files(
        db_for(fake), event, "lead-x", out_root=out, state_root=tmp_path / "state", deck_link=link
    )
    assert stored == 2
    assert [name for name, _title in asked] == ["deck.pptx"]
    assert asked[0][1].endswith("deck")
    rows = recorded(fake)
    assert rows["deck.pptx"]["open_url"] == LINK
    assert "open_url" not in rows["brief.md"]
    assert sorted(fake.uploads) == [f"{ORG}/{EVENT}/brief.md", f"{ORG}/{EVENT}/deck.pptx"]


def test_without_drive_nothing_changes(tmp_path: Path) -> None:
    fake = FakeSupabase()
    event = claimed_event(fake)
    out = outputs(tmp_path, deck_pptx=b"PK deck")
    assert (
        upload_new_files(db_for(fake), event, "lead-x", out_root=out, state_root=tmp_path / "s")
        == 1
    )
    assert "open_url" not in recorded(fake)["deck.pptx"]


@pytest.mark.parametrize(
    "answer",
    [
        "https://evil.example/presentation",
        "http://docs.google.com/presentation/d/1AbC_dEf-123456/edit",
        "https://docs.google.com.evil.example/presentation/d/1AbC_dEf-123456/edit",
        "https://docs.google.com/forms/d/e/1AbC_dEf-123456/viewform",
        "https://docs.google.com/presentation/d/1AbC_dEf-123456/edit?usp=sharing",
        "https://docs.google.com/presentation/d/1AbC_dEf-123456/edit\nhttps://evil.example",
        "https://docs.google.com/url?q=https://evil.example",
        "javascript:alert(1)",
        "",
        None,
    ],
)
def test_a_link_that_is_not_googles_is_dropped_and_the_deck_is_still_stored(
    tmp_path: Path, answer: str | None
) -> None:
    fake = FakeSupabase()
    event = claimed_event(fake)
    out = outputs(tmp_path, deck_pptx=b"PK deck")
    stored = upload_new_files(
        db_for(fake),
        event,
        "lead-x",
        out_root=out,
        state_root=tmp_path / "s",
        deck_link=lambda _path, _title: answer,
    )
    assert stored == 1
    assert "open_url" not in recorded(fake)["deck.pptx"]


def test_a_drive_failure_never_stops_the_deck_being_stored(tmp_path: Path) -> None:
    fake = FakeSupabase()
    event = claimed_event(fake)
    out = outputs(tmp_path, deck_pptx=b"PK deck")

    def broken(_path: Path, _title: str) -> str:
        raise drive.DriveError("uploading the deck: HTTP 500")

    stored = upload_new_files(
        db_for(fake), event, "lead-x", out_root=out, state_root=tmp_path / "s", deck_link=broken
    )
    assert stored == 1
    assert "open_url" not in recorded(fake)["deck.pptx"]


class NoLinkColumn(FakeSupabase):
    """A database that has not had the open_url migration yet."""

    def handle(self, request: httpx.Request) -> httpx.Response:
        response = super().handle(request)
        body = self.requests[-1][3]
        if request.url.path.endswith("rest/v1/agent_files") and "open_url" in (body or {}):
            return httpx.Response(
                400, json={"code": "PGRST204", "message": "Could not find the 'open_url' column"}
            )
        return response


def test_a_database_without_the_link_column_still_records_the_file(tmp_path: Path) -> None:
    fake = NoLinkColumn()
    event = claimed_event(fake)
    out = outputs(tmp_path, deck_pptx=b"PK deck")
    stored = upload_new_files(
        db_for(fake),
        event,
        "lead-x",
        out_root=out,
        state_root=tmp_path / "s",
        deck_link=lambda _path, _title: LINK,
    )
    assert stored == 1
    tries = fake.calls("POST", "rest/v1/agent_files")
    assert ["open_url" in row for row in tries] == [True, False]


def test_drive_is_used_only_when_set_up_and_signed_in(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in ("STUDIO1_DRIVE_CLIENT_ID", "STUDIO1_DRIVE_CLIENT_SECRET"):
        monkeypatch.delenv(name, raising=False)
    assert drive_deck_link() is None
    monkeypatch.setenv("STUDIO1_DRIVE_CLIENT_ID", "id.apps.googleusercontent.com")
    monkeypatch.setenv("STUDIO1_DRIVE_CLIENT_SECRET", "secret")
    monkeypatch.setattr(drive, "signed_in", lambda *_a, **_k: False)
    assert drive_deck_link() is None
    monkeypatch.setattr(drive, "signed_in", lambda *_a, **_k: True)
    answer = {"id": FILE_ID, "url": "https://evil.example/whatever-google-said"}
    monkeypatch.setattr(drive, "upload_deck", lambda path, title: answer)
    link = drive_deck_link()
    assert link is not None
    # The link is built from the file id; the address in the answer is never used.
    assert link(tmp_path / "deck.pptx", "Acme deck") == LINK
    answer["id"] = "../../forms/d/x"
    assert link(tmp_path / "deck.pptx", "Acme deck") is None


def test_the_link_is_built_only_from_a_plain_file_id() -> None:
    assert slides_link_for(FILE_ID) == LINK
    for bad in ["", "short", "a/b/c/d/e/f/g/h", "x" * 101, "abc def ghi jkl", None, 42]:
        assert slides_link_for(bad) is None
