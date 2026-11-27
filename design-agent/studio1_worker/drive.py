"""Upload an editable deck to Google Drive, where Google converts it to Google Slides.

One shared Google account signs in once (OAuth for a desktop app, loopback redirect, PKCE).
The agent then uploads into a folder it created itself. The only scope is `drive.file`, so
the app sees only the files and folders it made.

Rules this module keeps:
- It never overwrites, updates or deletes a Drive file. Every upload is a new file with a UTC
  time stamp in its title, because a founder may have edited the earlier Slides copy.
- It never makes an "anyone with the link" permission.
- No token, code or client secret is printed, logged or written anywhere but `token.json`.
- Every request goes over https to Google's OAuth and Drive hosts only.

State lives under `workspace/state/drive/` (ignored by git): `token.json`, `folder.json` and
`uploads.jsonl`.

    uv run python -m studio1_worker.drive login | status | upload <deck.pptx> --title "..." | logout
"""

from __future__ import annotations

import base64
import contextlib
import hashlib
import http.server
import json
import logging
import os
import re
import secrets
import tempfile
import threading
import time
import urllib.parse
import webbrowser
from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import click
import httpx

from studio1_worker.runners import REPO_ROOT

log = logging.getLogger("studio1_worker.drive")

SCOPE = "https://www.googleapis.com/auth/drive.file"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
FILES_URL = "https://www.googleapis.com/drive/v3/files"
UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
ALLOWED_HOSTS = frozenset({"accounts.google.com", "oauth2.googleapis.com", "www.googleapis.com"})

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
SLIDES_MIME = "application/vnd.google-apps.presentation"
FOLDER_MIME = "application/vnd.google-apps.folder"

MAX_BYTES = 100 * 1024 * 1024  # the worker's existing upload limit
MULTIPART_LIMIT = 5 * 1024 * 1024  # Google: multipart is for files of 5 MB or less
DEFAULT_FOLDER_NAME = "Studio1 Design decks"
DEFAULT_STATE_DIR = REPO_ROOT / "workspace" / "state" / "drive"
HTTP_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
UPLOAD_TIMEOUT = httpx.Timeout(300.0, connect=10.0)
LOGIN_TIMEOUT_SECONDS = 300.0
EXPIRY_MARGIN_SECONDS = 60

_ENV_ID = "STUDIO1_DRIVE_CLIENT_ID"
_ENV_SECRET = "STUDIO1_DRIVE_CLIENT_SECRET"  # noqa: S105
_ENV_FOLDER = "STUDIO1_DRIVE_FOLDER_NAME"
_ENV_SHARE = "STUDIO1_DRIVE_SHARE_WITH"
_EMAIL = re.compile(r"^[^@\s,]+@[^@\s,]+\.[^@\s,]+$")


class DriveError(Exception):
    """A short message that names the step that failed. Never holds a secret."""


class DriveConfigError(DriveError):
    """A setting is missing or wrong; the message names it."""


class NotSignedIn(DriveError):
    """No saved sign-in. Run `login`."""


def _now() -> float:
    return time.time()


def _utc_stamp(moment: datetime | None = None) -> str:
    return (moment or datetime.now(UTC)).strftime("%Y-%m-%d %H-%M-%S UTC")


# ---------------------------------------------------------------------------------------------
# settings


class DriveSettings:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        folder_name: str = DEFAULT_FOLDER_NAME,
        share_with: tuple[str, ...] = (),
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.folder_name = folder_name
        self.share_with = share_with

    def __repr__(self) -> str:  # keeps the secret out of any traceback or log line
        return f"DriveSettings(folder_name={self.folder_name!r}, share_with={self.share_with!r})"

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> DriveSettings:
        env = os.environ if env is None else env
        missing = [n for n in (_ENV_ID, _ENV_SECRET) if not (env.get(n) or "").strip()]
        if missing:
            raise DriveConfigError(f"Set {', '.join(missing)}.")
        emails = tuple(
            e.strip().lower() for e in (env.get(_ENV_SHARE) or "").split(",") if e.strip()
        )
        bad = [e for e in emails if not _EMAIL.match(e)]
        if bad:
            raise DriveConfigError(f"{_ENV_SHARE} has an address that is not an email: {bad[0]!r}.")
        return cls(
            env[_ENV_ID].strip(),
            env[_ENV_SECRET].strip(),
            (env.get(_ENV_FOLDER) or "").strip() or DEFAULT_FOLDER_NAME,
            emails,
        )


def missing_settings(env: Mapping[str, str] | None = None) -> list[str]:
    env = os.environ if env is None else env
    return [n for n in (_ENV_ID, _ENV_SECRET) if not (env.get(n) or "").strip()]


def configured(env: Mapping[str, str] | None = None) -> bool:
    """True when the two OAuth settings are present."""
    return not missing_settings(env)


def signed_in(state_dir: Path = DEFAULT_STATE_DIR) -> bool:
    """True when a saved sign-in with a refresh token exists. Makes no network call."""
    return _read_json(state_dir / "token.json").get("refresh_token") is not None


# ---------------------------------------------------------------------------------------------
# small file helpers


def _read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _private_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    path.chmod(0o700)


def _write_private(path: Path, data: dict[str, Any]) -> None:
    """Write JSON with mode 0600, by a fresh file and an atomic swap."""
    _private_dir(path.parent)
    handle, temp_name = tempfile.mkstemp(prefix=".tmp-", dir=path.parent)  # created as 0600
    try:
        with os.fdopen(handle, "w") as stream:
            json.dump(data, stream, indent=2)
            stream.write("\n")
        os.chmod(temp_name, 0o600)
        os.replace(temp_name, path)
    except BaseException:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(temp_name)
        raise


# ---------------------------------------------------------------------------------------------
# PKCE and the loopback listener


def pkce_pair() -> tuple[str, str]:
    """A code verifier (43 to 128 characters) and its S256 challenge, without padding."""
    verifier = secrets.token_urlsafe(64)  # 86 characters of A-Z a-z 0-9 - _
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return verifier, base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def build_auth_url(client_id: str, redirect_uri: str, challenge: str, state: str) -> str:
    query = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": SCOPE,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",  # makes Google hand back a refresh token on a re-login
        }
    )
    return f"{AUTH_URL}?{query}"


_PAGE = b"<!doctype html><meta charset=utf-8><title>Studio1</title><p>%s</p>"


def _wait_for_redirect(server: http.server.HTTPServer) -> dict[str, str]:
    """Serve exactly one request and return its query parameters."""
    seen: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            seen.update({k: v[0] for k, v in query.items() if v})
            ok = "code" in seen and "error" not in seen
            body = _PAGE % (
                b"Signed in. You can close this tab." if ok else b"Sign-in did not finish."
            )
            self.send_response(200 if ok else 400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: ARG002 (the URL holds the code)
            return

    server.RequestHandlerClass = Handler
    server.handle_request()
    return seen


# ---------------------------------------------------------------------------------------------
# the client


class DriveClient:
    def __init__(
        self,
        settings: DriveSettings,
        *,
        state_dir: Path = DEFAULT_STATE_DIR,
        transport: httpx.BaseTransport | None = None,
        clock: Callable[[], float] = _now,
    ) -> None:
        self.settings = settings
        self.state_dir = state_dir
        self._clock = clock
        self._http = httpx.Client(transport=transport, timeout=HTTP_TIMEOUT, follow_redirects=False)

    # -- paths ------------------------------------------------------------------------------

    @property
    def token_path(self) -> Path:
        return self.state_dir / "token.json"

    @property
    def folder_path(self) -> Path:
        return self.state_dir / "folder.json"

    @property
    def manifest_path(self) -> Path:
        return self.state_dir / "uploads.jsonl"

    # -- http -------------------------------------------------------------------------------

    def _send(self, method: str, url: str, step: str, **kwargs: Any) -> httpx.Response:
        parts = urllib.parse.urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in ALLOWED_HOSTS:
            raise DriveError(f"{step}: refused a request to {parts.hostname or 'an unknown host'}.")
        kwargs.setdefault("timeout", HTTP_TIMEOUT)
        try:
            return self._http.request(method, url, **kwargs)
        except httpx.TimeoutException as error:
            raise DriveError(f"{step}: Google did not answer in time.") from error
        except httpx.HTTPError as error:
            raise DriveError(f"{step}: could not reach Google ({type(error).__name__}).") from error

    @staticmethod
    def _reason(response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            return ""
        if not isinstance(body, dict):
            return ""
        error = body.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or error.get("status") or "")[:200]
        return str(error or "")[:100]

    def _fail(self, step: str, response: httpx.Response) -> DriveError:
        reason = self._reason(response)
        suffix = f": {reason}" if reason else ""
        return DriveError(f"{step}: Google answered {response.status_code}{suffix}.")

    # -- tokens -----------------------------------------------------------------------------

    def _token_request(self, form: dict[str, str], step: str) -> dict[str, Any]:
        form = {
            **form,
            "client_id": self.settings.client_id,
            "client_secret": self.settings.client_secret,
        }
        response = self._send("POST", TOKEN_URL, step, data=form)
        if response.status_code != 200:
            raise self._fail(step, response)
        try:
            body = response.json()
        except ValueError as error:
            raise DriveError(f"{step}: Google sent an unreadable answer.") from error
        if not isinstance(body, dict) or not body.get("access_token"):
            raise DriveError(f"{step}: Google sent no access token.")
        return body

    def _save_token(self, body: dict[str, Any], keep_refresh: str | None = None) -> dict[str, Any]:
        refresh = body.get("refresh_token") or keep_refresh
        saved = {
            "access_token": body["access_token"],
            "refresh_token": refresh,
            "expires_at": self._clock() + float(body.get("expires_in") or 3600),
            "scope": body.get("scope") or SCOPE,
        }
        _write_private(self.token_path, saved)
        return saved

    def _load_token(self) -> dict[str, Any]:
        token = _read_json(self.token_path)
        if not token.get("refresh_token"):
            raise NotSignedIn(
                "Not signed in to Google. Run `python -m studio1_worker.drive login`."
            )
        return token

    def refresh(self) -> dict[str, Any]:
        token = self._load_token()
        step = "refreshing the Google sign-in"
        response = self._send(
            "POST",
            TOKEN_URL,
            step,
            data={
                "grant_type": "refresh_token",
                "refresh_token": token["refresh_token"],
                "client_id": self.settings.client_id,
                "client_secret": self.settings.client_secret,
            },
        )
        if response.status_code in (400, 401):
            raise NotSignedIn(
                "Google refused the saved sign-in (it expired or was revoked). Run `login` again."
            )
        if response.status_code != 200:
            raise self._fail(step, response)
        try:
            body = response.json()
        except ValueError as error:
            raise DriveError(f"{step}: Google sent an unreadable answer.") from error
        if not isinstance(body, dict) or not body.get("access_token"):
            raise DriveError(f"{step}: Google sent no access token.")
        return self._save_token(body, keep_refresh=token["refresh_token"])

    def _access_token(self) -> str:
        token = self._load_token()
        if not token.get("access_token") or float(token.get("expires_at") or 0) <= (
            self._clock() + EXPIRY_MARGIN_SECONDS
        ):
            token = self.refresh()
        return str(token["access_token"])

    def _api(self, method: str, url: str, step: str, **kwargs: Any) -> httpx.Response:
        """An authorised call. A 401 refreshes the token once and tries again."""
        headers = dict(kwargs.pop("headers", {}) or {})
        for attempt in (1, 2):
            headers["Authorization"] = (
                f"Bearer {self._access_token() if attempt == 1 else self.refresh()['access_token']}"
            )
            response = self._send(method, url, step, headers=headers, **kwargs)
            if response.status_code != 401 or attempt == 2:
                return response
        raise AssertionError("unreachable")  # pragma: no cover

    # -- login ------------------------------------------------------------------------------

    def login(
        self,
        open_url: Callable[[str], object] | None = None,
        timeout: float = LOGIN_TIMEOUT_SECONDS,
        echo: Callable[[str], object] = click.echo,
    ) -> None:
        """Sign in once. Listens on 127.0.0.1 only, on a free port, for one request."""
        verifier, challenge = pkce_pair()
        state = secrets.token_urlsafe(32)
        server = http.server.HTTPServer(("127.0.0.1", 0), http.server.BaseHTTPRequestHandler)
        server.timeout = timeout
        try:
            redirect_uri = f"http://127.0.0.1:{server.server_address[1]}"
            url = build_auth_url(self.settings.client_id, redirect_uri, challenge, state)
            echo("Open this address in a browser and sign in with the shared Studio1 account:")
            echo(url)
            opener = open_url or webbrowser.open
            threading.Thread(target=_safe_call, args=(opener, url), daemon=True).start()
            seen = _wait_for_redirect(server)
        finally:
            server.server_close()
        if not seen:
            raise DriveError("signing in: no answer from the browser before the time ran out.")
        if not secrets.compare_digest(seen.get("state", ""), state):
            raise DriveError("signing in: the state did not match, so the answer was refused.")
        if "error" in seen or not seen.get("code"):
            raise DriveError(f"signing in: Google reported {seen.get('error', 'no code')[:60]}.")
        body = self._token_request(
            {
                "grant_type": "authorization_code",
                "code": seen["code"],
                "code_verifier": verifier,
                "redirect_uri": redirect_uri,
            },
            "exchanging the sign-in code",
        )
        if not body.get("refresh_token"):
            raise DriveError(
                "exchanging the sign-in code: Google sent no refresh token. Remove the app at "
                "myaccount.google.com/permissions and run `login` again."
            )
        self._save_token(body)

    def logout(self) -> str:
        """Revoke the token with Google, then delete the local file. Returns a short note."""
        token = _read_json(self.token_path)
        note = "No saved sign-in."
        value = token.get("refresh_token") or token.get("access_token")
        if value:
            try:
                response = self._send(
                    "POST", REVOKE_URL, "revoking the Google sign-in", data={"token": value}
                )
                note = (
                    "Revoked with Google."
                    if response.status_code == 200
                    else f"Google did not revoke it (answered {response.status_code}); "
                    "remove the app at myaccount.google.com/permissions."
                )
            except DriveError as error:
                note = f"{error} Remove the app at myaccount.google.com/permissions."
        with contextlib.suppress(FileNotFoundError):
            self.token_path.unlink()
        return note

    # -- folder -----------------------------------------------------------------------------

    def _folder_alive(self, folder_id: str) -> bool:
        step = "checking the Drive folder"
        response = self._api(
            "GET",
            f"{FILES_URL}/{urllib.parse.quote(folder_id, safe='')}",
            step,
            params={"fields": "id,trashed,mimeType"},
        )
        if response.status_code in (403, 404):
            return False  # gone, or no longer ours to see
        if response.status_code != 200:
            raise self._fail(step, response)
        body = response.json()
        return not body.get("trashed") and body.get("mimeType") == FOLDER_MIME

    def _share(self, folder_id: str, email: str) -> None:
        step = f"sharing the Drive folder with {email}"
        response = self._api(
            "POST",
            f"{FILES_URL}/{urllib.parse.quote(folder_id, safe='')}/permissions",
            step,
            params={"sendNotificationEmail": "false"},
            json={"type": "user", "role": "writer", "emailAddress": email},
        )
        if response.status_code not in (200, 201):
            raise self._fail(step, response)

    def ensure_folder(self) -> str:
        """The agent's folder id. Creates it once and shares it with the listed people."""
        saved = _read_json(self.folder_path)
        folder_id = saved.get("id")
        shared: list[str] = list(saved.get("shared_with") or [])
        if not (isinstance(folder_id, str) and folder_id and self._folder_alive(folder_id)):
            step = "creating the Drive folder"
            response = self._api(
                "POST",
                FILES_URL,
                step,
                params={"fields": "id"},
                json={"name": self.settings.folder_name, "mimeType": FOLDER_MIME},
            )
            if response.status_code not in (200, 201):
                raise self._fail(step, response)
            folder_id = response.json()["id"]
            shared = []
            _write_private(
                self.folder_path,
                {"id": folder_id, "name": self.settings.folder_name, "shared_with": shared},
            )
        for email in self.settings.share_with:
            if email not in shared:
                self._share(folder_id, email)
                shared.append(email)
                _write_private(
                    self.folder_path,
                    {"id": folder_id, "name": self.settings.folder_name, "shared_with": shared},
                )
        return folder_id

    # -- upload -----------------------------------------------------------------------------

    def existing_upload(self, path: Path) -> dict[str, str] | None:
        """The link from an earlier upload of the same bytes into the current folder, if any."""
        digest = _sha256_of(_check_deck(path))
        folder_id = _read_json(self.folder_path).get("id")
        return self._find_in_manifest(digest, folder_id)

    def _find_in_manifest(self, digest: str, folder_id: Any) -> dict[str, str] | None:
        if not folder_id or not self.manifest_path.is_file():
            return None
        found = None
        for line in self.manifest_path.read_text().splitlines():
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if row.get("sha256") == digest and row.get("folder_id") == folder_id:
                found = {"id": row["drive_id"], "url": row["url"]}
        return found

    def _append_manifest(
        self, path: Path, digest: str, folder_id: str, result: dict[str, str]
    ) -> None:
        _private_dir(self.state_dir)
        row = {
            "at": datetime.now(UTC).isoformat(timespec="seconds"),
            "file": path.name,
            "sha256": digest,
            "folder_id": folder_id,
            "drive_id": result["id"],
            "url": result["url"],
        }
        fresh = not self.manifest_path.exists()
        with self.manifest_path.open("a") as stream:
            stream.write(json.dumps(row) + "\n")
        if fresh:
            self.manifest_path.chmod(0o600)

    def upload_deck(
        self, path: Path | str, title: str, *, reuse: bool = True, moment: datetime | None = None
    ) -> dict[str, str]:
        """Upload `path` as a new Google Slides file. Returns `{"id", "url"}`.

        The same bytes uploaded before into the same folder return the earlier link (`reuse`).
        """
        deck = _check_deck(Path(path))
        clean_title = " ".join(title.split())
        if not clean_title:
            raise DriveError("uploading the deck: the title is empty.")
        data = deck.read_bytes()
        if len(data) > MAX_BYTES:
            raise DriveError("uploading the deck: the file is over 100 MiB.")
        digest = hashlib.sha256(data).hexdigest()
        if reuse:
            earlier = self._find_in_manifest(digest, _read_json(self.folder_path).get("id"))
            if earlier:
                return earlier
        folder_id = self.ensure_folder()
        metadata = {
            "name": f"{clean_title[:150]} ({_utc_stamp(moment)})",
            "mimeType": SLIDES_MIME,  # asks Google to convert the .pptx to Slides
            "parents": [folder_id],
        }
        step = "uploading the deck"
        params = {"fields": "id,webViewLink"}
        if len(data) <= MULTIPART_LIMIT:
            boundary = secrets.token_hex(16)
            body = (
                (
                    f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
                    f"{json.dumps(metadata)}\r\n--{boundary}\r\nContent-Type: {PPTX_MIME}\r\n\r\n"
                ).encode()
                + data
                + f"\r\n--{boundary}--".encode()
            )
            response = self._api(
                "POST",
                UPLOAD_URL,
                step,
                params={**params, "uploadType": "multipart"},
                headers={"Content-Type": f"multipart/related; boundary={boundary}"},
                content=body,
                timeout=UPLOAD_TIMEOUT,
            )
        else:
            start = self._api(
                "POST",
                UPLOAD_URL,
                "starting the deck upload",
                params={**params, "uploadType": "resumable"},
                headers={
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Upload-Content-Type": PPTX_MIME,
                    "X-Upload-Content-Length": str(len(data)),
                },
                content=json.dumps(metadata).encode(),
            )
            if start.status_code != 200 or not start.headers.get("location"):
                raise self._fail("starting the deck upload", start)
            response = self._api(
                "PUT",
                start.headers["location"],
                step,
                headers={"Content-Type": PPTX_MIME},
                content=data,
                timeout=UPLOAD_TIMEOUT,
            )
        if response.status_code not in (200, 201):
            raise self._fail(step, response)
        body_json = response.json()
        if not body_json.get("id") or not body_json.get("webViewLink"):
            raise DriveError(f"{step}: Google sent no file link.")
        result = {"id": body_json["id"], "url": body_json["webViewLink"]}
        self._append_manifest(deck, digest, folder_id, result)
        return result

    def status(self) -> dict[str, Any]:
        folder = _read_json(self.folder_path)
        return {
            "signed_in": signed_in(self.state_dir),
            "folder_name": folder.get("name") or self.settings.folder_name,
            "folder_id": folder.get("id"),
            "shared_with": list(folder.get("shared_with") or []),
            "wanted_share_with": list(self.settings.share_with),
        }


def _safe_call(function: Callable[[str], object], url: str) -> None:
    with contextlib.suppress(Exception):  # no browser is not an error: the URL was printed
        function(url)


def _sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _check_deck(path: Path) -> Path:
    """Only a regular, non-linked .pptx of at most 100 MiB."""
    if path.is_symlink():
        raise DriveError("uploading the deck: a symbolic link is not accepted.")
    if not path.is_file():
        raise DriveError("uploading the deck: not a regular file.")
    if path.suffix.lower() != ".pptx":
        raise DriveError("uploading the deck: only .pptx files are accepted.")
    if path.stat().st_size > MAX_BYTES:
        raise DriveError("uploading the deck: the file is over 100 MiB.")
    return path


# ---------------------------------------------------------------------------------------------
# module-level helpers for callers such as `serve`


def upload_deck(
    path: Path | str,
    title: str,
    *,
    env: Mapping[str, str] | None = None,
    state_dir: Path = DEFAULT_STATE_DIR,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, str]:
    """Upload one deck with settings from the environment. Returns `{"id", "url"}`."""
    client = DriveClient(DriveSettings.from_env(env), state_dir=state_dir, transport=transport)
    return client.upload_deck(path, title)


# ---------------------------------------------------------------------------------------------
# command line


@click.group()
def cli() -> None:
    """Upload editable decks to Google Drive, converted to Google Slides."""


def _client() -> DriveClient:
    try:
        return DriveClient(DriveSettings.from_env())
    except DriveConfigError as error:
        raise click.ClickException(str(error)) from error


@cli.command("login")
def login_command() -> None:
    """Sign in once with the shared Studio1 Google account."""
    client = _client()
    try:
        client.login()
    except DriveError as error:
        raise click.ClickException(str(error)) from error
    click.echo("Signed in.")


@cli.command("status")
def status_command() -> None:
    """Say whether it is signed in, which folder, and who it is shared with."""
    missing = missing_settings()
    if missing:
        click.echo(f"Missing settings: {', '.join(missing)}.")
    try:
        info = DriveClient(DriveSettings("-", "-", _folder_name_env())).status()
    except DriveError as error:
        raise click.ClickException(str(error)) from error
    click.echo(f"Signed in: {'yes' if info['signed_in'] else 'no'}")
    click.echo(f"Folder: {info['folder_name']} ({info['folder_id'] or 'not created yet'})")
    click.echo(f"Shared with: {', '.join(info['shared_with']) or 'nobody'}")


def _folder_name_env() -> str:
    return (os.environ.get(_ENV_FOLDER) or "").strip() or DEFAULT_FOLDER_NAME


@cli.command("upload")
@click.argument("deck", type=click.Path(path_type=Path))
@click.option(
    "--title", required=True, help="Name for the Slides file, like 'Acme Cloud intro deck'."
)
def upload_command(deck: Path, title: str) -> None:
    """Upload DECK as a new Google Slides file and print its link."""
    client = _client()
    try:
        result = client.upload_deck(deck, title)
    except DriveError as error:
        raise click.ClickException(str(error)) from error
    click.echo(result["url"])


@cli.command("logout")
def logout_command() -> None:
    """Revoke the sign-in with Google and delete the saved token."""
    client = _client()
    click.echo(client.logout())


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
