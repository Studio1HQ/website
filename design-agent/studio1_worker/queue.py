"""The dashboard's database, reached only through Supabase's REST interfaces.

The worker holds a JWT whose role is `agent_worker`, never the service role key. Its column
grants are the limit, so each call here names only columns the grant allows.
"""

from __future__ import annotations

import logging
import os
import re
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, urlparse

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

from studio1_worker.directory import LeadRef
from studio1_worker.events import EventKind, LeadEvent, slugify

_LOGGER = logging.getLogger(__name__)
BUCKET = "agent-files"
INBOUND_SOURCES = ("inbound_call", "inbound_email")
MAX_ERROR_LENGTH = 500
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_ENV_URL, _ENV_KEY, _ENV_JWT = (
    "STUDIO1_SUPABASE_URL",
    "STUDIO1_SUPABASE_APIKEY",
    "STUDIO1_SUPABASE_WORKER_JWT",
)


class QueueError(RuntimeError):
    """A database call failed. The message has the status and PostgREST's message, no headers."""


class QueueConfigError(QueueError):
    """A setting is missing or wrong; the message names it."""


def _uuid(value: str) -> str:
    # Ids go into URL filters, so only the plain form is accepted.
    if not _UUID.fullmatch(value):
        raise QueueError("an id was not a UUID")
    return value


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class Supabase:
    def __init__(
        self,
        url: str,
        apikey: str,
        jwt: str,
        *,
        transport: httpx.BaseTransport | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._secrets = [s for s in (apikey, jwt) if s]
        self._base = url.rstrip("/")
        self._client = httpx.Client(
            headers={"apikey": apikey, "Authorization": f"Bearer {jwt}"},
            timeout=httpx.Timeout(timeout, connect=10.0),
            transport=transport,
        )

    @classmethod
    def from_env(
        cls, env: Mapping[str, str] | None = None, *, transport: httpx.BaseTransport | None = None
    ) -> Supabase:
        env = os.environ if env is None else env
        missing = [n for n in (_ENV_URL, _ENV_KEY, _ENV_JWT) if not (env.get(n) or "").strip()]
        if missing:
            raise QueueConfigError(f"Set {', '.join(missing)}.")
        url = env[_ENV_URL].strip()
        if urlparse(url).scheme not in ("http", "https") or not urlparse(url).hostname:
            raise QueueConfigError(f"{_ENV_URL} must be a web address like https://x.supabase.co.")
        return cls(url, env[_ENV_KEY].strip(), env[_ENV_JWT].strip(), transport=transport)

    def _scrub(self, text: str) -> str:
        for secret in self._secrets:
            text = text.replace(secret, "[redacted]")
        return text

    def _send(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json: Any = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
        allow: tuple[int, ...] = (),
    ) -> httpx.Response:
        """One call, one retry when the connection could not be made (nothing was sent)."""
        kwargs: dict[str, Any] = {"params": params, "json": json, "content": content}
        kwargs["headers"] = headers
        if timeout is not None:
            kwargs["timeout"] = httpx.Timeout(timeout, connect=10.0)
        for attempt in (1, 2):
            try:
                response = self._client.request(method, f"{self._base}/{path}", **kwargs)
                break
            except (httpx.ConnectError, httpx.ConnectTimeout) as error:
                if attempt == 2:
                    raise QueueError(f"{method} {path} failed: {type(error).__name__}") from None
            except httpx.HTTPError as error:
                raise QueueError(f"{method} {path} failed: {type(error).__name__}") from None
        _LOGGER.info("%s %s %s", method, path, response.status_code)
        if response.status_code >= 400 and response.status_code not in allow:
            raise QueueError(
                f"{method} {path} failed with HTTP {response.status_code}: {self._message(response)}"
            )
        return response

    def _message(self, response: httpx.Response) -> str:
        try:
            body = response.json()
            text = (
                str(body.get("message") or body.get("error") or "")
                if isinstance(body, dict)
                else ""
            )
            code = str(body.get("code") or "") if isinstance(body, dict) else ""
        except ValueError:
            text, code = "", ""
        shown = f"{text} ({code})" if code and text else text or code or "no message"
        return self._scrub(shown)[:200]

    def _rpc(self, name: str) -> Any:
        response = self._send("POST", f"rest/v1/rpc/{name}", json={})
        return response.json() if response.content else None

    def _patch(self, table: str, row_filter: dict[str, str], body: dict[str, Any]) -> None:
        self._send(
            "PATCH",
            f"rest/v1/{table}",
            params=row_filter,
            json=body,
            headers={"Prefer": "return=minimal"},
        )

    def _select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        rows = self._send("GET", f"rest/v1/{table}", params=params).json()
        return [r for r in rows if isinstance(r, dict)] if isinstance(rows, list) else []

    def _insert_id(self, table: str, body: dict[str, Any]) -> str:
        response = self._send(
            "POST",
            f"rest/v1/{table}",
            params={"select": "id"},
            json=body,
            headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        row = rows[0] if isinstance(rows, list) and rows else rows
        if not isinstance(row, dict) or not isinstance(row.get("id"), str):
            raise QueueError(f"POST {table} returned no id")
        return _uuid(row["id"])

    @staticmethod
    def _first(data: Any) -> dict[str, Any] | None:
        """A function that returns a row may come back as a list, one object, or nothing."""
        if isinstance(data, list):
            data = data[0] if data else None
        return data if isinstance(data, dict) and data.get("id") else None

    # ---------- events ----------

    def claim_event(self) -> QueuedEvent | None:
        row = self._first(self._rpc("agent_claim_event"))
        if row is None:
            return None
        try:
            return QueuedEvent.from_row(row)
        except ValidationError:
            # Marked failed so it does not sit in `running` until the 45 minute timeout.
            self.fail_event(_uuid(str(row["id"])), "the event could not be read")
            return None

    def finish_event(
        self, event_id: str, report: str, done: list[str], waiting: list[str], next: list[str]
    ) -> None:
        # Only a running event is finished: one a person cancelled meanwhile stays cancelled.
        self._patch(
            "agent_events",
            {"id": f"eq.{_uuid(event_id)}", "status": "eq.running"},
            {
                "status": "done",
                "finished_at": _now(),
                "error": "",
                "report": report,
                "done_items": done,
                "waiting_items": waiting,
                "next_items": next,
            },
        )

    def fail_event(self, event_id: str, error: str) -> None:
        self._patch(
            "agent_events",
            {"id": f"eq.{_uuid(event_id)}", "status": "eq.running"},
            {"status": "failed", "finished_at": _now(), "error": error[:MAX_ERROR_LENGTH]},
        )

    def count_events_today(self, org_id: str, ignore_error: str) -> int:
        """Events claimed for this org since UTC midnight, not counting ones the cap refused."""
        midnight = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        rows = self._select(
            "agent_events",
            {
                "select": "id",
                "org_id": f"eq.{_uuid(org_id)}",
                "claimed_at": f"gte.{midnight.isoformat(timespec='seconds')}",
                "error": f"neq.{ignore_error}",
                "limit": "1000",
            },
        )
        return len(rows)

    def queue_event(self, org_id: str, kind: str, payload: dict[str, Any], created_by: str) -> None:
        self._send(
            "POST",
            "rest/v1/agent_events",
            json={
                "org_id": _uuid(org_id),
                "kind": kind,
                "payload": payload,
                "created_by": created_by,
            },
            headers={"Prefer": "return=minimal"},
        )

    # ---------- files ----------

    def upload_file(self, storage_path: str, data: bytes, content_type: str) -> bool:
        """Upload one object. False when it is already there: the role cannot overwrite."""
        path = "/".join(quote(part, safe="") for part in storage_path.split("/"))
        response = self._send(
            "POST",
            f"storage/v1/object/{BUCKET}/{path}",
            content=data,
            headers={"Content-Type": content_type or "application/octet-stream"},
            timeout=300.0,
            allow=(400, 409),
        )
        if response.status_code in (400, 409):
            if "duplicate" in response.text.lower() or "409" in response.text:
                return False
            raise QueueError(
                f"upload failed with HTTP {response.status_code}: {self._message(response)}"
            )
        return True

    def record_file(
        self,
        org_id: str,
        event_id: str,
        name: str,
        storage_path: str,
        content_type: str,
        bytes: int,
        kind: str,
    ) -> None:
        self._send(
            "POST",
            "rest/v1/agent_files",
            json={
                "org_id": _uuid(org_id),
                "event_id": _uuid(event_id),
                "name": name,
                "storage_path": storage_path,
                "content_type": content_type,
                "bytes": bytes,
                "kind": kind,
            },
            headers={"Prefer": "return=minimal"},
            allow=(409,),  # the path is unique: an earlier attempt already recorded it
        )

    # ---------- mail ----------

    def claim_mail(self) -> QueuedMail | None:
        row = self._first(self._rpc("agent_claim_mail"))
        if row is None:
            return None
        try:
            return QueuedMail.from_row(row)
        except ValidationError:
            self.finish_mail(
                _uuid(str(row["id"])), "not_sure", "rules", "sorter error", None, True, None, ""
            )
            return None

    def finish_mail(
        self,
        mail_id: str,
        label: str,
        decided_by: str,
        reason: str,
        confidence: float | None,
        held: bool,
        org_id: str | None,
        excerpt: str,
    ) -> None:
        self._patch(
            "inbound_mail",
            {"id": f"eq.{_uuid(mail_id)}"},
            {
                "status": "sorted",
                "label": label,
                "decided_by": decided_by,
                "reason": reason[:1000],
                "confidence": confidence,
                "held": held,
                "org_id": _uuid(org_id) if org_id else None,
                "excerpt": excerpt[:300],
                "body_text": None,  # the body is not kept once it has been read
            },
        )

    def link_mail(self, mail_id: str, org_id: str) -> None:
        self._patch("inbound_mail", {"id": f"eq.{_uuid(mail_id)}"}, {"org_id": _uuid(org_id)})

    # ---------- settings and leads ----------

    def get_settings(self) -> dict[str, Any]:
        rows = self._select("agent_settings", {"select": "key,value"})
        return {str(r["key"]): r.get("value") for r in rows if "key" in r}

    def find_org_by_domain(
        self, domain: str, sources: Sequence[str] | None = INBOUND_SOURCES
    ) -> LeadRef | None:
        """An org whose domain is this domain or a parent of it. By default only inbound leads
        count; `sources=None` looks at orgs of every source."""
        parts = domain.lower().split(".")
        candidates = [".".join(parts[i:]) for i in range(len(parts) - 1)]
        if not candidates or any(not re.fullmatch(r"[a-z0-9.-]+", c) for c in candidates):
            return None
        rows = self._select(
            "outreach_orgs",
            {
                "select": "id,name,website,domain,source",
                "domain": f"in.({','.join(candidates)})",
                **({"source": f"in.({','.join(sources)})"} if sources is not None else {}),
                "limit": "20",
            },
        )
        # The most specific domain wins, so a subdomain lead beats its parent.
        rows.sort(key=lambda r: -len(str(r.get("domain") or "")))
        return next((ref for r in rows if (ref := _ref(r)) is not None), None)

    def find_org_under_domain(self, domain: str) -> LeadRef | None:
        """An org of any source filed under a subdomain of this domain."""
        wanted = domain.lower()
        if not re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", wanted):
            return None
        rows = self._select(
            "outreach_orgs",
            {"select": "id,name,website,domain,source", "domain": f"like.*.{wanted}", "limit": "5"},
        )
        return next((ref for r in rows if (ref := _ref(r)) is not None), None)

    def org_exists_by_name(self, name: str) -> LeadRef | None:
        words = slugify(name).split("-")
        if not words or not words[0]:
            return None
        rows = self._select(
            "outreach_orgs",
            {
                "select": "id,name,website,domain,source",
                "name": f"ilike.*{'*'.join(words)}*",
                "limit": "50",
            },
        )
        wanted = slugify(name)
        return next(
            (ref for r in rows if slugify(str(r.get("name") or "")) == wanted and (ref := _ref(r))),
            None,
        )

    def create_lead(
        self,
        name: str,
        website: str,
        domain: str | None,
        contact_name: str | None,
        contact_email: str | None,
        interest: str,
    ) -> str:
        body: dict[str, Any] = {
            "name": name,
            "website": website,
            "stage": "lead",
            "source": "inbound_email",
            "interest": interest,
            "created_by": "sorter",
            "updated_by": "sorter",
        }
        # No domain key at all when the mail was not authenticated, so the unique slot stays free.
        if domain:
            body["domain"] = domain
        org_id = self._insert_id("outreach_orgs", body)
        if contact_email:
            self._send(
                "POST",
                "rest/v1/outreach_contacts",
                json={
                    "org_id": org_id,
                    "name": contact_name or contact_email.partition("@")[0],
                    "email": contact_email,
                    "is_primary": True,
                    "created_by": "sorter",
                },
                headers={"Prefer": "return=minimal"},
            )
        return org_id


def lead_slug_for(name: str, org_id: str) -> str:
    """`<name, lowercase, non-alphanumerics as hyphens, 40 characters>-<first 8 of the id>`."""
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40].rstrip("-") or "lead"
    return f"{base}-{org_id.replace('-', '')[:8]}"


def thread_for(name: str, org_id: str) -> str:
    return f"lead-{lead_slug_for(name, org_id)}"


def _source_of(org_source: str) -> str:
    return {"inbound_email": "mail", "inbound_call": "booking"}.get(org_source, "manual")


def _ref(row: dict[str, Any]) -> LeadRef | None:
    org_id = str(row.get("id") or "")
    if not _UUID.fullmatch(org_id):
        return None
    name = str(row.get("name") or "")
    site = str(row.get("website") or row.get("domain") or "")
    return LeadRef(
        key=org_id,
        slug=lead_slug_for(name, org_id),
        name=name,
        url=site,
        source=_source_of(str(row.get("source") or "")),
    )


class DbDirectory:
    """The sorter's view of the leads: inbound lead rows in `outreach_orgs`."""

    def __init__(self, db: Supabase) -> None:
        self._db = db

    def find_by_sender_domain(self, domain: str) -> LeadRef | None:
        return self._db.find_org_by_domain(domain)

    def find_by_name(self, name: str) -> LeadRef | None:
        return self._db.org_exists_by_name(name)


class QueuedEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    org_id: str
    kind: EventKind
    payload: dict[str, Any] = {}
    attempts: int = 0
    created_by: str | None = None
    org_name: str = ""
    website: str | None = None
    domain: str | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> QueuedEvent:
        # agent_claim_event() joins the org in as org_name, org_website and org_domain. The
        # plain name, website and domain are accepted too, as the contract first spelled them.
        fields = {
            **row,
            "org_name": row.get("org_name") or row.get("name") or "",
            "website": row.get("org_website") or row.get("website"),
            "domain": row.get("org_domain") or row.get("domain"),
        }
        event = cls.model_validate(fields)
        _uuid(event.id)
        _uuid(event.org_id)
        return event

    @property
    def thread(self) -> str:
        return thread_for(self.org_name, self.org_id)

    def text(self, key: str) -> str | None:
        value = self.payload.get(key)
        return value.strip() or None if isinstance(value, str) else None

    def to_lead_event(self) -> LeadEvent:
        """The same LeadEvent the hand-run commands build, so one prompt and runner path."""
        source = self.text("source")
        site = self.website or (f"https://{self.domain}" if self.domain else "")
        return LeadEvent(
            kind=self.kind,
            lead_slug=lead_slug_for(self.org_name, self.org_id),
            company_name=self.org_name or "(unnamed)",
            company_url=site,
            source=source if source in ("booking", "mail", "manual") else "manual",
            contact_name=self.text("contact_name"),
            contact_role=self.text("contact_role"),
            message=self.text("message"),
            # Call notes travel as an attached file, as in the hand-run command.
            answers=self.text("answers"),
            call_at=self.text("call_at"),
            reason=self.text("reason"),
        )


class QueuedMail(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    from_address: str
    from_name: str = ""
    subject: str = ""
    headers: dict[str, Any] = {}
    body_text: str | None = None
    # The website's own answer, from the receiving provider's DMARC verdict. Anything but a
    # real true (missing, null, a string) is false. claimed_at and attempts are ignored.
    sender_verified: bool = False

    @field_validator("sender_verified", mode="before")
    @classmethod
    def _only_true_is_true(cls, value: object) -> bool:
        return value is True

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> QueuedMail:
        mail = cls.model_validate(
            {k: v for k, v in row.items() if v is not None or k == "body_text"}
        )
        _uuid(mail.id)
        return mail
