"""Offline tests for the dashboard queue: a fake Supabase behind httpx.MockTransport."""

from __future__ import annotations

import json
import logging
import threading
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import httpx
import pytest
from click.testing import CliRunner as ClickRunner

import studio1_worker.__main__ as cli_module
from studio1_worker.queue import QueueError, Supabase, lead_slug_for, thread_for
from studio1_worker.runners import RunnerError, TurnResult
from studio1_worker.serve import CAP_ERROR, Worker, file_kind, mail_from_row, upload_new_files
from studio1_worker.sort_eval import collect
from studio1_worker.sorter import SorterSettings

URL = "https://project.example"
KEY = "fake-publishable-key-0000"
JWT = "fake.worker.jwt-0000"
ORG = "11111111-2222-3333-4444-555555555555"
EVENT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
MAIL = "99999999-8888-7777-6666-555555555555"
AUTHSERV = "mx.studio1.example"
REPLY = """Drafted the intro.

Done:
- Brief written

Waiting on a founder:
- The price

Next:
- Book a call
"""


class FakeSupabase:
    """Just enough of PostgREST and Storage to see which calls were made."""

    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []
        self.mails: list[dict[str, Any]] = []
        self.settings: dict[str, Any] = {}
        self.orgs: list[dict[str, Any]] = []
        self.today = 0
        self.requests: list[tuple[str, str, dict[str, str], Any]] = []
        self.uploads: list[str] = []
        self.fail_with: tuple[int, dict[str, Any]] | None = None

    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self.handle)

    def calls(self, method: str, path: str) -> list[Any]:
        return [b for m, p, _q, b in self.requests if m == method and p == path]

    def handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.removeprefix("/")
        query = dict(request.url.params)
        is_json = request.headers.get("content-type", "").startswith("application/json")
        body: Any = json.loads(request.content) if request.content and is_json else None
        assert request.headers["apikey"] == KEY
        assert request.headers["authorization"] == f"Bearer {JWT}"
        self.requests.append((request.method, path, query, body))
        if self.fail_with:
            return httpx.Response(self.fail_with[0], json=self.fail_with[1])
        if path == "rest/v1/rpc/agent_claim_event":
            return httpx.Response(200, json=self.events[:1])
        if path == "rest/v1/rpc/agent_claim_mail":
            return httpx.Response(200, json=[self.mails.pop(0)] if self.mails else [])
        if path == "rest/v1/agent_settings":
            return httpx.Response(
                200, json=[{"key": k, "value": v} for k, v in self.settings.items()]
            )
        if path == "rest/v1/outreach_orgs" and request.method == "GET":
            return httpx.Response(200, json=self._orgs(query))
        if path == "rest/v1/outreach_orgs" and request.method == "PATCH":
            return httpx.Response(200, json=self._patch_orgs(query, body))
        if path == "rest/v1/outreach_orgs":
            self.orgs.append({"id": ORG, "name": body["name"], "domain": body.get("domain")})
            return httpx.Response(201, json=[{"id": ORG}])
        if path == "rest/v1/agent_events" and request.method == "GET":
            return httpx.Response(200, json=[{"id": str(n)} for n in range(self.today)])
        if path.startswith("storage/v1/object/agent-files/"):
            self.uploads.append(path.removeprefix("storage/v1/object/agent-files/"))
        return httpx.Response(204)

    def _patch_orgs(self, query: dict[str, str], body: dict[str, Any]) -> list[dict[str, Any]]:
        """Filters as PostgREST would, plus the worker's row policy: inbound leads only."""
        changed = []
        for org in self.orgs:
            if query.get("id") != f"eq.{org.get('id')}":
                continue
            if org.get("source", "inbound_email") not in ("inbound_call", "inbound_email"):
                continue
            filters = {k: v for k, v in query.items() if k not in ("id", "select")}
            if any(f"eq.{org.get(k) or ''}" != v for k, v in filters.items()):
                continue
            org.update(body)
            changed.append({"id": org["id"]})
        return changed

    def _orgs(self, query: dict[str, str]) -> list[dict[str, Any]]:
        if "id" in query:
            return [o for o in self.orgs if query["id"] == f"eq.{o.get('id')}"]
        if query.get("domain", "").startswith("like.*"):
            suffix = query["domain"].removeprefix("like.*")
            return [o for o in self.orgs if str(o.get("domain") or "").endswith(suffix)]
        if "domain" in query:
            wanted = query["domain"].removeprefix("in.(").removesuffix(")").split(",")
            found = [o for o in self.orgs if o.get("domain") in wanted]
            if "source" in query:
                sources = query["source"].removeprefix("in.(").removesuffix(")").split(",")
                found = [o for o in found if o.get("source", "inbound_email") in sources]
            return found
        return [o for o in self.orgs if o["name"]]


def db_for(fake: FakeSupabase) -> Supabase:
    return Supabase(URL, KEY, JWT, transport=fake.transport())


def event_row(kind: str = "lead_created", **payload: Any) -> dict[str, Any]:
    return {
        "id": EVENT,
        "org_id": ORG,
        "kind": kind,
        "payload": payload,
        "attempts": 1,
        "created_by": "webhook:cal",
        "name": "Acme Cloud",
        "website": "https://acme.example",
        "domain": "acme.example",
    }


def mail_row(**fields: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": MAIL,
        "from_address": "sam@orbit.example",
        "from_name": "Sam Rivera",
        "subject": "Launch help",
        "headers": {},
        "body_text": "We are Orbit Labs and want help with launch content. What do you charge?",
    }
    return {**base, **fields}


class FakeModel:
    def __init__(self, reply: str | Exception = "") -> None:
        self.reply = reply
        self.calls = 0

    def complete(self, system: str, user: str) -> str:
        self.calls += 1
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def lead_verdict(**fields: Any) -> str:
    base: dict[str, Any] = {
        "label": "lead",
        "is_company": True,
        "wants_services": True,
        "company_name": "Orbit Labs",
        "company_url": "https://orbit.example",
        "asked_for": "launch content",
        "confidence": 0.92,
        "reason": "a company asks for launch content",
    }
    return json.dumps({**base, **fields})


class FakeRunner:
    def __init__(self, out_root: Path, files: dict[str, bytes] | None = None) -> None:
        self.out_root = out_root
        self.files = files or {}
        self.error: Exception | None = None
        self.calls: list[tuple[str, str, list[Path]]] = []

    def run(self, thread_id: str, prompt: str, attachments: Sequence[Path] = ()) -> TurnResult:
        self.calls.append((thread_id, prompt, list(attachments)))
        if self.error:
            raise self.error
        folder = self.out_root / thread_id
        folder.mkdir(parents=True, exist_ok=True)
        for name, data in self.files.items():
            (folder / name).write_bytes(data)
        return TurnResult(reply=REPLY, files=sorted(self.files))


def worker_for(
    fake: FakeSupabase,
    tmp_path: Path,
    *,
    model: FakeModel | None = None,
    runner: FakeRunner | None = None,
    runner_name: str = "api",
) -> Worker:
    return Worker(
        db_for(fake),
        runner or FakeRunner(tmp_path / "out"),
        runner_name,
        SorterSettings(trusted_authserv=AUTHSERV),
        model or FakeModel(lead_verdict()),
        out_root=tmp_path / "out",
        state_root=tmp_path / "state",
    )


def finished_sort(fake: FakeSupabase) -> dict[str, Any]:
    patches = fake.calls("PATCH", "rest/v1/inbound_mail")
    assert len(patches) == 1
    return patches[0]  # type: ignore[no-any-return]


# ---------- claiming and mapping events ----------


def test_claim_returns_an_event_and_none(tmp_path: Path) -> None:
    fake = FakeSupabase()
    db = db_for(fake)
    assert db.claim_event() is None
    fake.events = [event_row(message="hi")]
    claimed = db.claim_event()
    assert claimed is not None
    assert (claimed.id, claimed.org_id, claimed.kind.value) == (EVENT, ORG, "lead_created")
    assert fake.calls("POST", "rest/v1/rpc/agent_claim_event") == [{}, {}]


def test_an_event_maps_to_the_lead_thread_and_prompt() -> None:
    from studio1_worker.events import prompt_for, thread_id_for

    fake = FakeSupabase()
    fake.events = [event_row(message="We want launch help", contact_name="Sam", source="mail")]
    event = db_for(fake).claim_event()
    assert event is not None
    lead = event.to_lead_event()
    assert event.thread == "lead-acme-cloud-11111111" == thread_id_for(lead)
    assert lead.lead_slug == lead_slug_for("Acme Cloud", ORG)
    assert (lead.company_url, lead.source, lead.contact_name) == (
        "https://acme.example",
        "mail",
        "Sam",
    )
    prompt = prompt_for(lead)
    assert "Event: lead_created on thread lead-acme-cloud-11111111" in prompt
    assert "We want launch help" in prompt


def test_the_claim_function_columns_are_read_as_the_website_names_them() -> None:
    # agent_claim_event() returns the org's columns as org_name, org_website, org_domain, and
    # the inbound_mail columns claimed_at and attempts ride along on mail rows.
    row = event_row()
    for old in ("name", "website", "domain"):
        del row[old]
    row.update(org_name="Acme Cloud", org_website="https://acme.example", org_domain="acme.example")
    fake = FakeSupabase()
    fake.events = [row]
    event = db_for(fake).claim_event()
    assert event is not None
    assert (event.org_name, event.website, event.domain) == (
        "Acme Cloud",
        "https://acme.example",
        "acme.example",
    )
    assert event.thread == "lead-acme-cloud-11111111"
    assert event.to_lead_event().company_url == "https://acme.example"
    # The domain alone is enough for the site address.
    del row["org_website"]
    fake.events = [row]
    again = db_for(fake).claim_event()
    assert again is not None and again.to_lead_event().company_url == "https://acme.example"


def test_the_slug_is_cut_to_forty_characters_then_the_id() -> None:
    assert lead_slug_for("A" * 60 + " Co", ORG) == "a" * 40 + "-11111111"
    assert thread_for("Café & Co.", ORG) == "lead-caf-co-11111111"


def test_finish_and_fail_write_the_right_columns() -> None:
    fake = FakeSupabase()
    db = db_for(fake)
    db.finish_event(EVENT, "the report", ["a"], ["b"], ["c"])
    db.fail_event(EVENT, "x" * 900)
    finish, fail = fake.calls("PATCH", "rest/v1/agent_events")
    assert set(finish) == {
        "status",
        "finished_at",
        "error",
        "report",
        "done_items",
        "waiting_items",
        "next_items",
    }
    assert (finish["status"], finish["done_items"], finish["next_items"]) == ("done", ["a"], ["c"])
    assert fail["status"] == "failed" and len(fail["error"]) == 500
    # A cancelled event is never overwritten.
    assert fake.requests[0][2] == {"id": f"eq.{EVENT}", "status": "eq.running"}


def test_a_bad_id_never_reaches_a_url() -> None:
    with pytest.raises(QueueError):
        db_for(FakeSupabase()).fail_event("1&status=eq.done", "x")


# ---------- running events ----------


def test_a_run_finishes_the_event_with_the_three_lists(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.events = [event_row(message="hi")]
    runner = FakeRunner(tmp_path / "out")
    assert worker_for(fake, tmp_path, runner=runner).run_next_event()
    assert runner.calls[0][0] == "lead-acme-cloud-11111111"
    (done,) = fake.calls("PATCH", "rest/v1/agent_events")
    assert done["status"] == "done"
    assert (done["done_items"], done["waiting_items"], done["next_items"]) == (
        ["Brief written"],
        ["The price"],
        ["Book a call"],
    )
    assert "Drafted the intro." in done["report"]


def test_call_notes_travel_as_an_attached_file(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.events = [event_row("call_notes_added", notes="they want a launch")]
    runner = FakeRunner(tmp_path / "out")
    worker_for(fake, tmp_path, runner=runner).run_next_event()
    attached = runner.calls[0][2][0]
    assert attached.name == "call-notes.txt" and attached.read_text() == "they want a launch"
    fake.requests.clear()
    fake.events = [event_row("call_notes_added")]
    worker_for(fake, tmp_path, runner=runner).run_next_event()
    (fail,) = fake.calls("PATCH", "rest/v1/agent_events")
    assert fail["error"] == "the call notes are empty"


def test_a_failing_run_is_recorded_and_the_loop_goes_on(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    fake = FakeSupabase()
    fake.events = [event_row()]
    runner = FakeRunner(tmp_path / "out")
    worker = worker_for(fake, tmp_path, runner=runner)
    runner.error = RunnerError("design-agent ask exited with 1; the thread is saved")
    assert worker.run_next_event()
    runner.error = RuntimeError(f"traceback with {JWT}")
    assert worker.run_next_event()
    first, second = fake.calls("PATCH", "rest/v1/agent_events")
    assert first["error"] == "design-agent ask exited with 1; the thread is saved"
    assert second["error"] == "unexpected error (RuntimeError)"
    runner.error = None
    assert worker.run_next_event()
    assert fake.calls("PATCH", "rest/v1/agent_events")[2]["status"] == "done"
    assert JWT not in caplog.text


def test_serve_once_sorts_mail_then_runs_one_event(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row(), mail_row()]
    fake.events = [event_row()]
    runner = FakeRunner(tmp_path / "out")
    worker_for(fake, tmp_path, runner=runner).serve(once=True, poll_seconds=1)
    kinds = [(m, p) for m, p, _q, _b in fake.requests if m != "GET"]
    assert kinds.count(("PATCH", "rest/v1/inbound_mail")) == 2
    assert kinds.count(("PATCH", "rest/v1/agent_events")) == 1
    assert len(runner.calls) == 1


def test_a_stop_signal_ends_the_loop_after_the_current_tick(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.events = [event_row()]
    stop = threading.Event()
    runner = FakeRunner(tmp_path / "out")

    def stopping(thread: str, prompt: str, attachments: Sequence[Path] = ()) -> TurnResult:
        stop.set()
        return FakeRunner.run(runner, thread, prompt, attachments)

    runner.run = stopping  # type: ignore[method-assign]
    worker_for(fake, tmp_path, runner=runner).serve(once=False, poll_seconds=60, stop=stop)
    assert fake.calls("PATCH", "rest/v1/agent_events")[0]["status"] == "done"


def test_the_daily_cap_refuses_the_event(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.events = [event_row()]
    runner = FakeRunner(tmp_path / "out")
    fake.today = 6  # six counted, this one included: still allowed
    worker_for(fake, tmp_path, runner=runner).run_next_event()
    assert len(runner.calls) == 1
    fake.today = 7
    fake.settings = {"caps": {"events_per_lead_per_day": 6}}
    worker_for(fake, tmp_path, runner=runner).run_next_event()
    assert len(runner.calls) == 1
    assert fake.calls("PATCH", "rest/v1/agent_events")[-1]["error"] == CAP_ERROR
    count = [q for m, p, q, _b in fake.requests if m == "GET" and p == "rest/v1/agent_events"][-1]
    assert count["error"] == f"neq.{CAP_ERROR}" and count["org_id"] == f"eq.{ORG}"
    assert count["claimed_at"].startswith("gte.") and "T00:00:00" in count["claimed_at"]


def test_the_cap_setting_is_read_from_caps(tmp_path: Path) -> None:
    fake = FakeSupabase()
    worker = worker_for(fake, tmp_path)
    assert worker.daily_cap() == 6
    fake.settings = {"caps": {"events_per_lead_per_day": 2}}
    assert worker.daily_cap() == 2
    fake.settings = {"caps": {"events_per_lead_per_day": "lots"}}
    assert worker.daily_cap() == 6


# ---------- files ----------


def outline() -> bytes:
    return json.dumps(
        {
            "company": "Acme Cloud",
            "deck_title": "How Acme Cloud Reaches Developers",
            "slides": [
                {"n": "01", "kind": "cover", "headline": "How Acme Cloud Reaches Developers"},
                {"n": "02", "kind": "observations", "headline": "A headline", "body": ["Line"]},
            ],
        }
    ).encode()


def test_files_are_uploaded_once_and_again_only_when_changed(tmp_path: Path) -> None:
    fake = FakeSupabase()
    files = {
        "acme-intro-deck.pdf": b"%PDF deck",
        "acme-brief.md": b"# brief",
        "acme-outline.json": outline(),
        "notes.txt": b"x",
    }
    runner = FakeRunner(tmp_path / "out", files)
    worker = worker_for(fake, tmp_path, runner=runner, runner_name="cli")
    fake.events = [event_row()]
    worker.run_next_event()
    base = f"{ORG}/{EVENT}/"
    assert sorted(fake.uploads) == sorted(base + n for n in [*files, "deck.pptx"])
    recorded = {r["name"]: r["kind"] for r in fake.calls("POST", "rest/v1/agent_files")}
    assert recorded == {
        "acme-intro-deck.pdf": "deck_pdf",
        "acme-brief.md": "brief",
        "acme-outline.json": "outline",
        "notes.txt": "other",
        "deck.pptx": "deck_pptx",
    }
    one = fake.calls("POST", "rest/v1/agent_files")[0]
    assert set(one) == {
        "org_id",
        "event_id",
        "name",
        "storage_path",
        "content_type",
        "bytes",
        "kind",
    }
    # The next event on the thread: nothing changed, so nothing is uploaded.
    fake.uploads.clear()
    fake.calls("POST", "rest/v1/agent_files").clear()
    worker.run_next_event()
    assert fake.uploads == []
    # One file changes: only that one goes up.
    runner.files = {"acme-brief.md": b"# brief, second version"}
    worker.run_next_event()
    assert fake.uploads == [base + "acme-brief.md"]


def test_the_same_outline_builds_the_same_deck_a_second_apart(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """python-pptx stamps zip entries with the clock, so the deck's hash changed with the second
    and the upload manifest saw a changed file on every event (the flaky test's cause)."""
    from studio1_worker.decks import build_editable_deck

    folder = tmp_path / "thread"
    folder.mkdir()
    (folder / "acme-outline.json").write_bytes(outline())
    real = time.time
    ticks = iter(range(10_000))
    monkeypatch.setattr(time, "time", lambda: real() + 5 * next(ticks))
    first, _ = build_editable_deck(folder)
    assert first is not None
    one = first.read_bytes()
    second, _ = build_editable_deck(folder)
    assert second is not None
    assert second.read_bytes() == one


def test_a_symlink_a_folder_and_a_big_file_are_skipped(tmp_path: Path) -> None:
    fake = FakeSupabase()
    folder = tmp_path / "out" / "lead-x"
    folder.mkdir(parents=True)
    secret = tmp_path / "secret.txt"
    secret.write_text("not for upload")
    (folder / "link.txt").symlink_to(secret)
    (folder / "sub").mkdir()
    (folder / "sub" / "inner.txt").write_text("deep")
    (folder / "good.txt").write_text("fine")
    (folder / "bad name.txt").write_text("odd name")
    event = db_for(fake)
    fake.events = [event_row()]
    claimed = event.claim_event()
    assert claimed is not None
    stored = upload_new_files(
        db_for(fake), claimed, "lead-x", out_root=tmp_path / "out", state_root=tmp_path / "state"
    )
    assert stored == 1
    assert fake.uploads == [f"{ORG}/{EVENT}/good.txt"]


def test_a_linked_output_folder_is_not_followed(tmp_path: Path) -> None:
    fake = FakeSupabase()
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / "a.txt").write_text("x")
    (tmp_path / "out").mkdir()
    (tmp_path / "out" / "lead-x").symlink_to(elsewhere)
    fake.events = [event_row()]
    claimed = db_for(fake).claim_event()
    assert claimed is not None
    assert upload_new_files(db_for(fake), claimed, "lead-x", out_root=tmp_path / "out") == 0


def test_a_failed_upload_is_tried_again_after_the_next_event(tmp_path: Path) -> None:
    fake = FakeSupabase()
    runner = FakeRunner(tmp_path / "out", {"a.txt": b"x"})
    worker = worker_for(fake, tmp_path, runner=runner)
    fake.events = [event_row()]
    original = fake.handle

    failed: list[int] = []

    def flaky(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/storage/") and not failed:
            failed.append(1)
            return httpx.Response(500, json={"message": "storage is down"})
        return original(request)

    worker.db = Supabase(URL, KEY, JWT, transport=httpx.MockTransport(flaky))
    worker.run_next_event()
    manifest = tmp_path / "state" / "manifests" / "lead-acme-cloud-11111111.json"
    assert not manifest.exists()
    assert fake.calls("PATCH", "rest/v1/agent_events")[-1]["status"] == "done"
    worker.run_next_event()
    assert "a.txt" in json.loads(manifest.read_text())


@pytest.mark.parametrize(
    ("name", "kind"),
    [
        ("deck.pptx", "deck_pptx"),
        ("intro-deck.pdf", "deck_pdf"),
        ("Brief.PDF", "brief"),
        ("company-brief.md", "brief"),
        ("acme-outline.json", "outline"),
        ("outline.json", "outline"),
        ("report.pdf", "other"),
        ("brief.txt", "other"),
        ("deck.md", "other"),
    ],
)
def test_file_kinds(name: str, kind: str) -> None:
    assert file_kind(name) == kind


# ---------- mail ----------


def test_mail_is_labelled_and_its_body_is_wiped(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]
    worker_for(fake, tmp_path).serve(once=True, poll_seconds=1)
    done = finished_sort(fake)
    assert done["label"] == "lead" and done["decided_by"] == "model"
    assert done["status"] == "sorted" and done["body_text"] is None and done["held"] is False
    assert done["confidence"] == 0.92 and len(done["excerpt"]) <= 300
    assert set(done) == {
        "status",
        "label",
        "decided_by",
        "reason",
        "confidence",
        "held",
        "org_id",
        "excerpt",
        "body_text",
    }


def test_the_excerpt_is_at_most_three_hundred_characters(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row(body_text="word " * 500)]
    worker_for(fake, tmp_path, model=FakeModel(lead_verdict(label="noise"))).sort_waiting_mail(
        threading.Event()
    )
    assert len(finished_sort(fake)["excerpt"]) == 300


def test_apply_false_only_labels(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]
    fake.settings = {"sorter": {"apply": False}, "auto_start": {"mail": True}}
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    writes = [(m, p) for m, p, _q, _b in fake.requests if m in ("POST", "PATCH")]
    assert ("POST", "rest/v1/outreach_orgs") not in writes
    assert ("POST", "rest/v1/agent_events") not in writes
    assert not fake.orgs


def test_apply_with_a_new_lead_creates_org_contact_and_event(tmp_path: Path) -> None:
    fake = FakeSupabase()
    # The domain is stored only for authenticated mail, so this mail carries a valid result.
    fake.mails = [mail_row(**VERIFIED)]
    fake.settings = {"sorter": {"apply": True}, "auto_start": {"mail": True}}
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    (org,) = fake.calls("POST", "rest/v1/outreach_orgs")
    assert org["stage"] == "lead" and org["source"] == "inbound_email"
    assert (org["name"], org["website"], org["domain"]) == (
        "Orbit Labs",
        "https://orbit.example",
        "orbit.example",
    )
    (contact,) = fake.calls("POST", "rest/v1/outreach_contacts")
    assert contact["org_id"] == ORG and contact["email"] == "sam@orbit.example"
    assert contact["name"] == "Sam Rivera" and contact["is_primary"] is True
    (queued,) = fake.calls("POST", "rest/v1/agent_events")
    assert (queued["org_id"], queued["kind"], queued["created_by"]) == (
        ORG,
        "lead_created",
        "sorter",
    )
    assert "launch content" in queued["payload"]["message"]
    # Only the columns the agent_worker role may write.
    assert set(org) <= {
        "name", "website", "domain", "kind", "stage", "source", "interest", "about", "funding",
        "why_fit", "conflict", "created_by", "updated_by",
    }  # fmt: skip
    selects = [q for m, p, q, _b in fake.requests if p == "rest/v1/outreach_orgs" and m == "POST"]
    assert selects == [{"select": "id"}]


def test_apply_without_auto_start_creates_the_lead_but_no_event(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]
    fake.settings = {"sorter": {"apply": True}, "auto_start": {"booking": True, "mail": False}}
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    assert len(fake.calls("POST", "rest/v1/outreach_orgs")) == 1
    assert fake.calls("POST", "rest/v1/agent_events") == []


def test_a_name_that_is_already_a_lead_is_held_and_creates_nothing(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.orgs = [{"id": ORG, "name": "ORBIT  labs", "domain": "elsewhere.example"}]
    fake.mails = [mail_row()]
    fake.settings = {"sorter": {"apply": True}, "auto_start": {"mail": True}}
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    done = finished_sort(fake)
    assert done["held"] is True and done["label"] == "not_sure"
    assert "already lead" in done["reason"]
    assert fake.calls("POST", "rest/v1/outreach_orgs") == []
    assert fake.calls("POST", "rest/v1/agent_events") == []


# What the website writes when its own provider's DMARC verdict was pass.
VERIFIED = {"sender_verified": True}
# A header the sender wrote themselves: it would have passed the old header check.
FORGED = {"authentication-results": f"{AUTHSERV}; dmarc=pass header.from=orbit.example"}
APPLY_ALL = {"sorter": {"apply": True}, "auto_start": {"mail": True}}


def assert_held_and_nothing_created(fake: FakeSupabase, reason: str) -> None:
    done = finished_sort(fake)  # exactly one PATCH, so the held flag is written with the label
    assert done["held"] is True and done["decided_by"] == "rules"
    assert done["label"] == "lead" and done["reason"] == reason
    assert fake.calls("POST", "rest/v1/outreach_orgs") == []
    assert fake.calls("POST", "rest/v1/outreach_contacts") == []
    assert fake.calls("POST", "rest/v1/agent_events") == []
    assert not [r for r in fake.requests if r[0] == "PATCH" and r[1] != "rest/v1/inbound_mail"]


def test_a_lead_naming_another_domain_is_held_and_creates_nothing(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]
    fake.settings = APPLY_ALL
    model = FakeModel(lead_verdict(company_url="https://realcompany.example"))
    worker_for(fake, tmp_path, model=model).sort_waiting_mail(threading.Event())
    assert_held_and_nothing_created(
        fake, "the sender is not at the website the mail names (realcompany.example)"
    )


def test_a_sender_cannot_claim_a_parent_domain(tmp_path: Path) -> None:
    # evil.co.example must not be able to file itself as co.example, a suffix others share.
    fake = FakeSupabase()
    fake.mails = [mail_row(from_address="sam@evil.co.example", **VERIFIED)]
    fake.settings = APPLY_ALL
    model = FakeModel(lead_verdict(company_url="https://co.example"))
    worker_for(fake, tmp_path, model=model).sort_waiting_mail(threading.Event())
    assert_held_and_nothing_created(
        fake, "the sender is not at the website the mail names (co.example)"
    )


def test_a_lead_is_held_when_an_org_sits_on_a_subdomain_of_its_site(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.orgs = [
        {"id": ORG, "name": "Orbit App", "domain": "app.orbit.example", "source": "outbound"}
    ]
    fake.mails = [mail_row(**VERIFIED)]
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    assert_held_and_nothing_created(fake, "orbit.example already belongs to Orbit App")


def test_a_held_lead_is_held_with_apply_off_too(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]
    fake.settings = {"sorter": {"apply": False}}
    model = FakeModel(lead_verdict(company_url="https://realcompany.example"))
    worker_for(fake, tmp_path, model=model).sort_waiting_mail(threading.Event())
    assert finished_sort(fake)["held"] is True


def test_a_lead_from_free_mail_naming_a_company_site_is_held(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row(from_address="sam@gmail.com")]
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    assert_held_and_nothing_created(
        fake, "the sender is not at the website the mail names (orbit.example)"
    )


def test_a_lead_on_a_domain_an_outbound_org_owns_is_held(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.orgs = [
        {"id": ORG, "name": "Orbit Prospect", "domain": "orbit.example", "source": "outbound"}
    ]
    fake.mails = [mail_row(**VERIFIED)]
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    assert_held_and_nothing_created(fake, "orbit.example already belongs to Orbit Prospect")
    lookup = [q for m, p, q, _b in fake.requests if m == "GET" and p == "rest/v1/outreach_orgs"]
    assert any("source" not in q and "domain" in q for q in lookup)


def test_an_unauthenticated_lead_is_created_without_a_domain(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    (org,) = fake.calls("POST", "rest/v1/outreach_orgs")
    assert "domain" not in org
    assert org["website"] == "https://orbit.example" and org["name"] == "Orbit Labs"


def test_an_authenticated_lead_stores_its_domain(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row(**VERIFIED)]
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    (org,) = fake.calls("POST", "rest/v1/outreach_orgs")
    assert org["domain"] == "orbit.example"


def test_a_forged_header_without_sender_verified_does_not_store_the_domain(
    tmp_path: Path,
) -> None:
    # The row carries a header that parses as a pass from the trusted server, and the worker is
    # configured with that server's name: database mail is still not authenticated.
    fake = FakeSupabase()
    fake.mails = [mail_row(headers=FORGED, sender_verified=False)]
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    (org,) = fake.calls("POST", "rest/v1/outreach_orgs")
    assert "domain" not in org


def test_a_forged_header_holds_a_reply_from_an_existing_lead(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.orgs = [{"id": ORG, "name": "Acme Cloud", "domain": "acme.example"}]
    forged = {"authentication-results": f"{AUTHSERV}; dmarc=pass header.from=acme.example"}
    fake.mails = [acme_reply(headers=forged)]  # no sender_verified key at all
    fake.settings = APPLY_ALL
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    done = finished_sort(fake)
    assert done["held"] is True and "not authenticated" in done["reason"]
    assert fake.calls("POST", "rest/v1/agent_events") == []


def test_sender_verified_alone_authenticates_database_mail(tmp_path: Path) -> None:
    from studio1_worker.sorter import is_authenticated

    row = row_model(mail_row(sender_verified=True))
    mail = mail_from_row(row)
    assert mail is not None and mail.verified is True
    # No trusted server configured, no header: the flag is the whole answer.
    assert is_authenticated(mail, "") is True
    for value in (False, None, "true", 1):
        other = mail_from_row(row_model(mail_row(sender_verified=value)))
        assert other is not None and other.verified is False
    # claimed_at and attempts come with the row and are harmless.
    assert mail_from_row(row_model(mail_row(claimed_at="2026-11-27T00:00:00Z", attempts=1)))


def test_eml_mail_still_uses_the_header_check() -> None:
    from studio1_worker.sorter import Mail, is_authenticated

    header = f"{AUTHSERV}; dmarc=pass header.from=orbit.example"
    mail = Mail(sender="sam@orbit.example", headers={"authentication-results": header})
    assert mail.verified is None
    assert is_authenticated(mail, AUTHSERV) is True
    assert is_authenticated(mail, "other.example") is False
    assert is_authenticated(mail, "") is False


def test_all_source_domain_lookup_drops_the_source_filter() -> None:
    fake = FakeSupabase()
    db_for(fake).find_org_by_domain("mail.acme.example", sources=None)
    (_m, _p, query, _b) = fake.requests[0]
    assert query["domain"] == "in.(mail.acme.example,acme.example)"
    assert "source" not in query and query["select"] == "id,name,website,domain,source"


def acme_reply(**fields: Any) -> dict[str, Any]:
    base = mail_row(
        from_address="jo@acme.example", from_name="Jo", subject="Re: proposal", body_text="Thu?"
    )
    return {**base, **fields}


def test_an_unauthenticated_domain_match_is_held_and_creates_nothing(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.orgs = [{"id": ORG, "name": "Acme Cloud", "domain": "acme.example"}]
    fake.mails = [acme_reply()]
    fake.settings = {"sorter": {"apply": True}, "auto_start": {"mail": True}}
    model = FakeModel(lead_verdict())
    worker_for(fake, tmp_path, model=model).sort_waiting_mail(threading.Event())
    done = finished_sort(fake)
    assert done["held"] is True and done["decided_by"] == "rules"
    assert "not authenticated" in done["reason"]
    assert model.calls == 0
    assert fake.calls("POST", "rest/v1/agent_events") == []
    assert fake.calls("POST", "rest/v1/outreach_orgs") == []


def test_an_authenticated_reply_queues_reply_received_only_with_apply(tmp_path: Path) -> None:
    for apply, expected in ((False, 0), (True, 1)):
        fake = FakeSupabase()
        fake.orgs = [{"id": ORG, "name": "Acme Cloud", "domain": "acme.example"}]
        fake.mails = [acme_reply(**VERIFIED)]
        fake.settings = {"sorter": {"apply": apply}}
        worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
        queued = fake.calls("POST", "rest/v1/agent_events")
        assert len(queued) == expected
        assert finished_sort(fake)["org_id"] == ORG
        if apply:
            assert (queued[0]["kind"], queued[0]["org_id"]) == ("reply_received", ORG)
            assert fake.calls("POST", "rest/v1/outreach_orgs") == []


def test_a_loose_database_match_is_checked_again_by_the_sorter(tmp_path: Path) -> None:
    # A lookup that returned a lead for another domain must not link the sender to it.
    fake = FakeSupabase()
    fake.orgs = [{"id": ORG, "name": "Other", "domain": "orbit.example"}]
    db = db_for(fake)
    ref = db.find_org_by_domain("sub.orbit.example")
    assert ref is not None and ref.key == ORG
    from studio1_worker.sorter import Mail, apply_rules

    class Loose:
        def find_by_sender_domain(self, domain: str) -> Any:
            return ref

        def find_by_name(self, name: str) -> Any:
            return None

    assert apply_rules(Mail(sender="x@unrelated.example"), Loose()) is None


def test_domain_lookup_only_reads_inbound_leads_and_granted_columns() -> None:
    fake = FakeSupabase()
    db_for(fake).find_org_by_domain("mail.acme.example")
    (_m, _p, query, _b) = fake.requests[0]
    assert query["domain"] == "in.(mail.acme.example,acme.example)"
    assert query["source"] == "in.(inbound_call,inbound_email)"
    assert query["select"] == "id,name,website,domain,source"


def test_a_mail_that_fails_to_sort_is_held_not_dropped(tmp_path: Path) -> None:
    fake = FakeSupabase()
    fake.mails = [mail_row()]

    worker = worker_for(fake, tmp_path)

    def broken(*_a: Any, **_k: Any) -> None:
        raise ValueError("kaboom with secrets")

    worker.db.get_settings = broken  # type: ignore[method-assign]
    worker.sort_waiting_mail(threading.Event())
    done = finished_sort(fake)
    assert (done["label"], done["held"], done["decided_by"], done["reason"]) == (
        "not_sure",
        True,
        "rules",
        "sorter error",
    )
    assert done["body_text"] is None


def test_a_sender_with_more_than_one_address_is_held(tmp_path: Path) -> None:
    row = mail_row(from_address="a@evil.example>, <jo@acme.example")
    assert mail_from_row(row_model(row)) is None
    fake = FakeSupabase()
    fake.mails = [row]
    worker_for(fake, tmp_path).sort_waiting_mail(threading.Event())
    assert finished_sort(fake)["reason"] == "sender address not usable"


def row_model(row: dict[str, Any]) -> Any:
    from studio1_worker.queue import QueuedMail

    return QueuedMail.from_row(row)


def test_only_the_stored_headers_reach_the_sorter() -> None:
    row = row_model(
        mail_row(
            headers={
                "Authentication-Results": "x",
                "reply-to": "boss@evil.example",
                "x-other": "ignored",
                "precedence": 5,
            },
            from_name='Evil" <a@b.example>',
        )
    )
    mail = mail_from_row(row)
    assert mail is not None
    assert set(mail.headers) == {"reply-to"}
    assert mail.sender_addr == "sam@orbit.example"


# ---------- settings, secrets, errors ----------


def test_a_missing_setting_is_named(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("STUDIO1_SUPABASE_URL", "STUDIO1_SUPABASE_APIKEY", "STUDIO1_SUPABASE_WORKER_JWT"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("STUDIO1_SUPABASE_URL", URL)
    monkeypatch.setenv("STUDIO1_SUPABASE_WORKER_JWT", JWT)
    out = ClickRunner().invoke(cli_module.cli, ["serve", "--once"])
    assert out.exit_code == 1
    assert "STUDIO1_SUPABASE_APIKEY" in out.output
    assert "STUDIO1_SUPABASE_URL" not in out.output and JWT not in out.output


def test_the_url_must_be_a_web_address() -> None:
    with pytest.raises(QueueError, match="STUDIO1_SUPABASE_URL"):
        Supabase.from_env(
            {
                "STUDIO1_SUPABASE_URL": "ftp://x",
                "STUDIO1_SUPABASE_APIKEY": KEY,
                "STUDIO1_SUPABASE_WORKER_JWT": JWT,
            }
        )


def test_errors_carry_status_and_message_but_never_a_secret(
    caplog: pytest.LogCaptureFixture,
) -> None:
    fake = FakeSupabase()
    fake.fail_with = (401, {"message": f"bad token {JWT} and {KEY}", "code": "PGRST301"})
    caplog.set_level(logging.DEBUG)
    with pytest.raises(QueueError) as caught:
        db_for(fake).claim_event()
    text = str(caught.value)
    assert "HTTP 401" in text and "PGRST301" in text and "[redacted]" in text
    assert JWT not in text and KEY not in text
    assert JWT not in caplog.text and KEY not in caplog.text


def test_a_connection_error_is_retried_once() -> None:
    seen: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(1)
        if len(seen) == 1:
            raise httpx.ConnectError("no route", request=request)
        return httpx.Response(200, json=[])

    db = Supabase(URL, KEY, JWT, transport=httpx.MockTransport(handler))
    assert db.claim_event() is None and len(seen) == 2
    seen.clear()

    def down(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError(f"cannot reach {JWT}", request=request)

    with pytest.raises(QueueError) as caught:
        Supabase(URL, KEY, JWT, transport=httpx.MockTransport(down)).claim_event()
    assert str(caught.value) == "POST rest/v1/rpc/agent_claim_event failed: ConnectError"


def test_one_log_line_per_action_with_ids_and_no_content(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO)
    fake = FakeSupabase()
    fake.events = [event_row(message="SECRET-BODY-TEXT")]
    fake.mails = [mail_row(body_text="SECRET-MAIL-TEXT")]
    worker_for(fake, tmp_path).serve(once=True, poll_seconds=1)
    assert EVENT in caplog.text and MAIL in caplog.text
    assert "SECRET-BODY-TEXT" not in caplog.text and "SECRET-MAIL-TEXT" not in caplog.text
    assert JWT not in caplog.text and KEY not in caplog.text


# ---------- sort-eval ----------


def write_eml(folder: Path, label: str, name: str, sender: str, subject: str, body: str) -> None:
    (folder / label).mkdir(parents=True, exist_ok=True)
    (folder / label / name).write_text(
        f"From: {sender}\nTo: contact@studio1hq.com\nSubject: {subject}\n"
        f"Date: Fri, 20 Nov 2026 10:00:00 +0000\n\n{body}\n"
    )


class ScriptedModel:
    """Answers by what the mail says, so each file gets a known label."""

    def __init__(self) -> None:
        self.calls = 0

    def complete(self, system: str, user: str) -> str:
        self.calls += 1
        if "WIDGET" in user:
            return lead_verdict(company_name="Widget Co", company_url="https://widget.example")
        if "SEO" in user:
            return lead_verdict(label="selling_to_us", is_company=False, wants_services=False)
        if "MAYBE" in user:
            return lead_verdict(label="not_sure", confidence=0.3)
        return lead_verdict(label="noise")


@pytest.fixture
def eval_folder(tmp_path: Path) -> Path:
    root = tmp_path / "labelled"
    write_eml(root, "lead", "a.eml", "A <a@widget.example>", "Launch", "WIDGET wants launch help")
    write_eml(root, "lead", "b.eml", "B <b@maybe.example>", "Hello", "MAYBE something")
    write_eml(root, "selling_to_us", "c.eml", "C <c@seo.example>", "Rank", "We do SEO")
    write_eml(root, "noise", "d.eml", "D <d@widget2.example>", "Hi", "WIDGET too, but spam")
    write_eml(root, "noise", "e.eml", "E <noreply@x.example>", "Receipt", "Your receipt")
    return root


def run_eval(
    monkeypatch: pytest.MonkeyPatch, model: Any, folder: Path, *args: str, input: str | None = None
) -> Any:
    monkeypatch.setattr(cli_module, "_model_client", lambda _settings: model)
    monkeypatch.delenv("STUDIO1_SORTER_TRUSTED_AUTHSERV", raising=False)
    return ClickRunner().invoke(cli_module.cli, ["sort-eval", str(folder), *args], input=input)


def test_sort_eval_reports_the_table_and_the_leads_that_matter(
    monkeypatch: pytest.MonkeyPatch, eval_folder: Path
) -> None:
    model = ScriptedModel()
    out = run_eval(monkeypatch, model, eval_folder, "--yes")
    assert out.exit_code == 0, out.output
    assert "5 mails, 4 model calls" in out.output and model.calls == 4
    assert "Lead recall: 50% (1 of 2 true leads labelled lead)" in out.output
    assert "Lead precision: 50%" in out.output
    assert "Missed leads, neither labelled lead nor held for review (0):" in out.output
    assert "d.eml (noise)" in out.output.split("would have started the agent")[1]
    assert "newsletter" in out.output and "not_sure" in out.output
    assert "WIDGET" not in out.output  # never a body


def test_sort_eval_exits_one_when_a_true_lead_is_skipped(
    monkeypatch: pytest.MonkeyPatch, eval_folder: Path
) -> None:
    write_eml(eval_folder, "lead", "z.eml", "Z <z@seo.example>", "Offer", "We do SEO for you")
    out = run_eval(monkeypatch, ScriptedModel(), eval_folder, "--yes")
    assert out.exit_code == 1
    missed = out.output.split("Missed leads")[1].split("Not leads")[0]
    assert "z.eml: said selling_to_us" in missed and "b.eml" not in missed


def test_sort_eval_asks_first_and_limit_caps_each_label(
    monkeypatch: pytest.MonkeyPatch, eval_folder: Path
) -> None:
    model = ScriptedModel()
    declined = run_eval(monkeypatch, model, eval_folder, input="n\n")
    assert declined.exit_code != 0 and model.calls == 0
    assert "4 model calls" in declined.output
    out = run_eval(monkeypatch, model, eval_folder, "--limit", "1", "--yes")
    assert "3 mails, 2 model calls" in out.output or "3 mails, 3 model calls" in out.output
    assert len(collect(eval_folder, 1)) == 3


def test_sort_eval_needs_mail(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    out = run_eval(monkeypatch, ScriptedModel(), tmp_path, "--yes")
    assert out.exit_code != 0 and "No .eml files" in out.output
