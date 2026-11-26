"""The long-running worker: claims events and unsorted mail from the dashboard's database."""

from __future__ import annotations

import hashlib
import json
import logging
import mimetypes
import os
import re
import stat
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from studio1_worker.directory import FREE_MAIL, host_of
from studio1_worker.events import NOTES_FILENAME, EventKind, prompt_for
from studio1_worker.queue import (
    DbDirectory,
    QueuedEvent,
    QueuedMail,
    QueueError,
    Supabase,
)
from studio1_worker.runners import REPO_ROOT, Runner, RunnerError
from studio1_worker.sorter import (
    Mail,
    ModelClient,
    SorterSettings,
    SortResult,
    classify,
    excerpt_of,
    is_authenticated,
)
from studio1_worker.store import parse_report
from studio1_worker.turn import OUT_ROOT, run_turn

_LOGGER = logging.getLogger(__name__)
STATE_ROOT = REPO_ROOT / "workspace" / "state" / "queue"
MAX_FILE_BYTES = 100 * 1024 * 1024
DEFAULT_DAILY_CAP = 6
CAP_ERROR = "daily cap reached for this lead"
# The only headers the website stores; a row with others is read as if it had none of them.
# Authentication-Results is not one: a sender can write their own copy, so the website no longer
# stores it and the worker ignores it even if a row carries one. Whether the sender is proven
# is the row's sender_verified, which the website computes from its own provider's verdict.
_HEADER_NAMES = frozenset(
    {
        "auto-submitted",
        "precedence",
        "list-unsubscribe",
        "list-id",
        "return-path",
        "x-autoreply",
        "x-auto-response-suppress",
        "reply-to",
    }
)
_FILE_NAME = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.:-]{0,127}")
_ADDRESS = re.compile(r"[^\s<>,;:\"'\\()\[\]@]+@[^\s<>,;:\"'\\()\[\]@]+")


# ---------- files ----------


def file_kind(name: str) -> str:
    lower = name.lower()
    if lower.endswith(".pptx"):
        return "deck_pptx"
    if lower.endswith(".pdf") and "deck" in lower:
        return "deck_pdf"
    if lower.endswith((".pdf", ".md")) and "brief" in lower:
        return "brief"
    if lower.endswith("outline.json"):
        return "outline"
    return "other"


def _read_regular(path: Path) -> bytes | None:
    """The file's bytes, or None for a link, a non-regular file or one over the cap. Opening
    without following links closes the gap between checking a name and reading it."""
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    except OSError:
        return None
    with os.fdopen(fd, "rb") as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_FILE_BYTES:
            return None
        return handle.read()


def upload_new_files(
    db: Supabase,
    event: QueuedEvent,
    thread: str,
    *,
    out_root: Path = OUT_ROOT,
    state_root: Path = STATE_ROOT,
) -> int:
    """Upload what is new or changed in `out/<thread>/` since this thread's last event.

    The manifest holds name, size and sha256 per file. An entry is written only after its file
    is stored and recorded, so a failed upload is tried again after the next event.
    """
    folder = out_root / thread
    if folder.is_symlink() or not folder.is_dir():
        return 0
    root = folder.resolve()
    manifest_path = state_root / "manifests" / f"{thread}.json"
    try:
        manifest: dict[str, dict[str, Any]] = json.loads(manifest_path.read_text())
    except (OSError, ValueError):
        manifest = {}
    uploaded = 0
    for entry in sorted(root.iterdir(), key=lambda p: p.name):
        name = entry.name
        if not _FILE_NAME.fullmatch(name) or entry.is_symlink() or not entry.is_file():
            continue
        if entry.resolve().parent != root:
            continue
        data = _read_regular(entry)
        if data is None:
            _LOGGER.warning(
                "skipped %s on %s: not a regular file or over the size cap", name, thread
            )
            continue
        digest = hashlib.sha256(data).hexdigest()
        if manifest.get(name) == {"size": len(data), "sha256": digest}:
            continue
        path = f"{event.org_id}/{event.id}/{name}"
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        try:
            db.upload_file(path, data, content_type)
            db.record_file(
                event.org_id, event.id, name, path, content_type, len(data), file_kind(name)
            )
        except QueueError as error:
            _LOGGER.warning("file %s on %s not stored: %s", name, thread, error)
            continue
        manifest[name] = {"size": len(data), "sha256": digest}
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        uploaded += 1
    return uploaded


# ---------- mail ----------


def mail_from_row(row: QueuedMail) -> Mail | None:
    """The sorter's Mail, or None when the sender address is not one plain address. The sender
    is rebuilt from the row's address, so text in the display name cannot add a second one."""
    address = row.from_address.strip()
    if not _ADDRESS.fullmatch(address):
        return None
    name = re.sub(r"[^\w .'-]", "", row.from_name).strip()
    headers = {
        k.lower(): v
        for k, v in row.headers.items()
        if isinstance(v, str) and k.lower() in _HEADER_NAMES
    }
    return Mail(
        sender=f'"{name}" <{address}>' if name else address,
        reply_to=headers.get("reply-to", ""),
        subject=row.subject,
        body=row.body_text or "",
        headers=headers,
        verified=row.sender_verified,
    )


def _decided_by(result: SortResult) -> str:
    return "rules" if result.decided_pass == 1 else "model"


def _truthy(settings: dict[str, Any], key: str, field: str) -> bool:
    value = settings.get(key)
    return isinstance(value, dict) and value.get(field) is True


# ---------- the worker ----------


@dataclass
class Worker:
    db: Supabase
    runner: Runner
    runner_name: str
    sorter: SorterSettings
    client: ModelClient
    out_root: Path = OUT_ROOT
    state_root: Path = STATE_ROOT

    # -- mail --

    def sort_waiting_mail(self, stop: threading.Event) -> int:
        count = 0
        while not stop.is_set() and (row := self.db.claim_mail()) is not None:
            self.sort_one(row)
            count += 1
        return count

    def sort_one(self, row: QueuedMail) -> None:
        body = row.body_text or ""
        try:
            self._sort(row)
        except Exception as error:  # noqa: BLE001 - a mail that fails to sort is held, never dropped
            _LOGGER.warning("mail %s: sorter error (%s)", row.id, type(error).__name__)
            try:
                self.db.finish_mail(
                    row.id, "not_sure", "rules", "sorter error", None, True, None, excerpt_of(body)
                )
            except QueueError as again:
                _LOGGER.error("mail %s: could not record the error (%s)", row.id, again)

    def _sort(self, row: QueuedMail) -> None:
        mail = mail_from_row(row)
        excerpt = excerpt_of(row.body_text or "")
        if mail is None:
            self.db.finish_mail(
                row.id, "not_sure", "rules", "sender address not usable", None, True, None, excerpt
            )
            _LOGGER.info("mail %s: held, sender address not usable", row.id)
            return
        settings = self.db.get_settings()
        leads = DbDirectory(self.db)
        result = classify(mail, leads=leads, client=self.client, settings=self.sorter)
        # Checked before anything is written, and whether or not apply is on, so the review list
        # is truthful in silent mode too.
        bound = self._lead_hold_reason(mail, result)
        self.db.finish_mail(
            row.id,
            result.label.value,
            "rules" if bound else _decided_by(result),
            bound or result.reason,
            result.confidence,
            bool(bound) or result.action == "hold",
            result.lead_key,
            excerpt,
        )
        if bound:
            _LOGGER.info("mail %s: held, lead domain not bound to the sender", row.id)
            return
        _LOGGER.info("mail %s: %s, %s", row.id, result.label.value, result.action)
        if not _truthy(settings, "sorter", "apply"):
            return
        self._apply(row, mail, result, settings)

    def _lead_hold_reason(self, mail: Mail, result: SortResult) -> str | None:
        """Why a new lead must wait for a person, or None when it may be created.

        The website in the mail is whatever the sender (or the model reading the sender's text)
        says. A company's domain is its identity in the database, so a mail may only claim the
        domain it was sent from. Without this, anyone could write in as another company's
        website, take that domain's unique slot before the real company ever writes, and have
        the real company's later mail attach to the attacker's lead.
        """
        if result.action != "create_lead" or result.event is None:
            return None
        claimed = host_of(result.event.company_url)
        sender = mail.sender_domain
        # Exact match only. Accepting "the sender is on a subdomain of the site" would let
        # someone at evil.co.uk or evil.github.io claim co.uk or github.io: without a public
        # suffix list a company's parent domain cannot be told from a suffix shared by strangers.
        # A real sender on a subdomain is held for a person, which costs one click.
        if not claimed or claimed in FREE_MAIL or sender != claimed:
            return f"the sender is not at the website the mail names ({claimed or 'none'})"
        # Orgs of every source count: an outbound prospect or a client owns its domain too,
        # and so does one filed under a subdomain of the claimed site.
        owner = self.db.find_org_by_domain(claimed, sources=None) or self.db.find_org_under_domain(
            claimed
        )
        if owner is not None:
            return f"{claimed} already belongs to {owner.name}"
        return None

    def _apply(
        self, row: QueuedMail, mail: Mail, result: SortResult, settings: dict[str, Any]
    ) -> None:
        event = result.event
        if event is None:
            return
        payload = {"message": event.message or "", "source": "mail"}
        if event.contact_name:
            payload["contact_name"] = event.contact_name
        if result.action == "create_lead":
            org_id = self.db.create_lead(
                event.company_name,
                event.company_url,
                # Only mail our own server vouches for may store the unique domain; an
                # unauthenticated From line could be forged by someone squatting the slot.
                (
                    host_of(event.company_url)
                    if is_authenticated(mail, self.sorter.trusted_authserv)
                    else None
                ),
                event.contact_name,
                mail.sender_addr,
                excerpt_of(result.verdict.asked_for if result.verdict else "", 300),
            )
            try:
                self.db.link_mail(row.id, org_id)
            except QueueError as error:
                _LOGGER.warning("mail %s: not linked to its lead (%s)", row.id, error)
            _LOGGER.info("mail %s: created lead %s", row.id, org_id)
            if _truthy(settings, "auto_start", "mail"):
                self.db.queue_event(org_id, EventKind.LEAD_CREATED.value, payload, "sorter")
                _LOGGER.info("mail %s: queued lead_created for %s", row.id, org_id)
        elif result.action == "reply" and result.lead_key:
            self.db.queue_event(result.lead_key, EventKind.REPLY_RECEIVED.value, payload, "sorter")
            _LOGGER.info("mail %s: queued reply_received for %s", row.id, result.lead_key)

    # -- events --

    def daily_cap(self) -> int:
        value = self.db.get_settings().get("caps")
        cap = value.get("events_per_lead_per_day") if isinstance(value, dict) else None
        return (
            cap
            if isinstance(cap, int) and not isinstance(cap, bool) and cap >= 0
            else DEFAULT_DAILY_CAP
        )

    def run_next_event(self) -> bool:
        event = self.db.claim_event()
        if event is None:
            return False
        _LOGGER.info(
            "event %s: %s on org %s, attempt %s",
            event.id,
            event.kind.value,
            event.org_id,
            event.attempts,
        )
        try:
            self._run(event)
        except Exception as error:  # noqa: BLE001 - one bad event must not stop the loop
            message = (
                str(error)
                if isinstance(error, RunnerError | QueueError | _Refused)
                else (f"unexpected error ({type(error).__name__})")
            )
            _LOGGER.warning("event %s: failed (%s)", event.id, message)
            try:
                self.db.fail_event(event.id, message)
            except QueueError as again:
                _LOGGER.error("event %s: could not record the failure (%s)", event.id, again)
        return True

    def _run(self, event: QueuedEvent) -> None:
        if self.db.count_events_today(event.org_id, CAP_ERROR) > self.daily_cap():
            raise _Refused(CAP_ERROR)
        lead_event = event.to_lead_event()
        thread = event.thread
        attachments: list[Path] = []
        if event.kind is EventKind.CALL_NOTES_ADDED:
            notes = event.text("notes")
            if notes is None:
                raise _Refused("the call notes are empty")
            folder = self.state_root / "attachments" / thread
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / NOTES_FILENAME
            path.write_text(notes)
            attachments.append(path)
        outcome = run_turn(
            self.runner,
            thread,
            prompt_for(lead_event),
            attachments,
            build_deck=self.runner_name == "cli",
            out_root=self.out_root,
        )
        if outcome.deck_problem:
            _LOGGER.info("event %s: deck not built (%s)", event.id, outcome.deck_problem)
        stored = upload_new_files(
            self.db, event, thread, out_root=self.out_root, state_root=self.state_root
        )
        lists = parse_report(outcome.result.reply)
        self.db.finish_event(
            event.id,
            outcome.result.reply,
            lists["Done"],
            lists["Waiting on a founder"],
            lists["Next"],
        )
        _LOGGER.info("event %s: done, %s files stored", event.id, stored)

    # -- loop --

    def tick(self, stop: threading.Event) -> None:
        self.sort_waiting_mail(stop)
        if not stop.is_set():
            self.run_next_event()

    def serve(
        self, *, once: bool, poll_seconds: float, stop: threading.Event | None = None
    ) -> None:
        stop = stop or threading.Event()
        while not stop.is_set():
            try:
                self.tick(stop)
            except QueueError as error:
                if once:
                    raise
                # The database was unreachable or refused a call; try again next tick.
                _LOGGER.error("tick failed: %s", error)
            if once:
                return
            stop.wait(poll_seconds)


class _Refused(Exception):
    """An event the worker will not run; the message is safe to show on the dashboard."""


def make_stop_event(install: Callable[[int, Any], Any]) -> threading.Event:
    """An event set by SIGINT or SIGTERM. The current event finishes; then the loop ends."""
    import signal

    stop = threading.Event()
    for number in (signal.SIGINT, signal.SIGTERM):
        install(number, lambda *_args: stop.set())
    return stop
