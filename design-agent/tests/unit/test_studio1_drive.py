"""Offline tests for the Google Drive upload: a fake Google behind httpx.MockTransport."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import stat
import urllib.parse
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from click.testing import CliRunner

from studio1_worker import drive
from studio1_worker.drive import DriveClient, DriveError, DriveSettings, NotSignedIn

CLIENT_ID = "fake-client-id.apps.example"
SECRET = "fake-client-secret-0000"
ACCESS = "fake-access-token-1111"
REFRESH = "fake-refresh-token-2222"
CODE = "fake-auth-code-3333"
SECRETS = (SECRET, ACCESS, REFRESH, CODE, "fake-access-token-new")


class FakeGoogle:
    def __init__(self) -> None:
        self.calls: list[httpx.Request] = []
        self.folders: dict[str, dict[str, Any]] = {}
        self.permissions: list[dict[str, Any]] = []
        self.uploads: list[dict[str, Any]] = []
        self.reject_access_once = False
        self.refreshes = 0
        self.token_form: dict[str, str] = {}
        self.revoked: str | None = None
        self.next_id = 0

    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self.handle)

    def _id(self, prefix: str) -> str:
        self.next_id += 1
        return f"{prefix}{self.next_id}"

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request)
        url = request.url
        assert url.scheme == "https" and url.host in drive.ALLOWED_HOSTS
        if url.path == "/token":
            form = dict(urllib.parse.parse_qsl(request.content.decode()))
            if form["grant_type"] == "refresh_token":
                self.refreshes += 1
                return httpx.Response(
                    200, json={"access_token": "fake-access-token-new", "expires_in": 3600}
                )
            self.token_form = form
            return httpx.Response(
                200,
                json={"access_token": ACCESS, "refresh_token": REFRESH, "expires_in": 3600},
            )
        if url.path == "/revoke":
            self.revoked = dict(urllib.parse.parse_qsl(request.content.decode()))["token"]
            return httpx.Response(200)
        if self.reject_access_once and request.headers.get("authorization") == f"Bearer {ACCESS}":
            self.reject_access_once = False
            return httpx.Response(401, json={"error": {"message": "Invalid Credentials"}})
        auth = request.headers.get("authorization", "")
        assert auth.startswith("Bearer fake-access-token")
        if request.method == "POST" and url.path == "/drive/v3/files":
            body = json.loads(request.content)
            folder_id = self._id("folder")
            self.folders[folder_id] = {"id": folder_id, "mimeType": body["mimeType"]}
            return httpx.Response(200, json={"id": folder_id})
        if request.method == "GET" and url.path.startswith("/drive/v3/files/"):
            folder = self.folders.get(url.path.rsplit("/", 1)[1])
            if not folder:
                return httpx.Response(404, json={"error": {"message": "File not found"}})
            return httpx.Response(200, json=folder)
        if url.path.endswith("/permissions"):
            self.permissions.append(
                {"query": dict(url.params), "body": json.loads(request.content)}
            )
            return httpx.Response(200, json={"id": "perm"})
        if request.method == "PUT":
            self.uploads[-1]["bytes"] = request.content
            return httpx.Response(200, json=self._file())
        if url.path == "/upload/drive/v3/files":
            kind = url.params["uploadType"]
            if kind == "multipart":
                self.uploads.append({"kind": kind, "raw": request.content})
                return httpx.Response(200, json=self._file())
            self.uploads.append({"kind": kind, "meta": json.loads(request.content)})
            return httpx.Response(
                200,
                headers={
                    "Location": "https://www.googleapis.com/upload/drive/v3/files?upload_id=u1"
                },
            )
        raise AssertionError(f"unexpected call {request.method} {url}")

    def _file(self) -> dict[str, str]:
        file_id = self._id("file")
        return {
            "id": file_id,
            "webViewLink": f"https://docs.google.com/presentation/d/{file_id}/edit",
        }


def settings(share: tuple[str, ...] = ()) -> DriveSettings:
    return DriveSettings(CLIENT_ID, SECRET, "Test decks", share)


def make(tmp_path: Path, google: FakeGoogle, share: tuple[str, ...] = (), **kw: Any) -> DriveClient:
    return DriveClient(
        settings(share), state_dir=tmp_path / "drive", transport=google.transport(), **kw
    )


def sign_in(client: DriveClient, expires_in: float = 3600, clock: float = 1000.0) -> None:
    drive._write_private(
        client.token_path,
        {"access_token": ACCESS, "refresh_token": REFRESH, "expires_at": clock + expires_in},
    )


def deck(tmp_path: Path, content: bytes = b"PK deck one", name: str = "deck.pptx") -> Path:
    path = tmp_path / name
    path.write_bytes(content)
    return path


# ------------------------------------------------------------------------------------ settings


def test_missing_settings_are_named() -> None:
    with pytest.raises(
        drive.DriveConfigError, match="STUDIO1_DRIVE_CLIENT_ID, STUDIO1_DRIVE_CLIENT_SECRET"
    ):
        DriveSettings.from_env({})
    assert not drive.configured({"STUDIO1_DRIVE_CLIENT_ID": "a"})
    assert drive.configured({"STUDIO1_DRIVE_CLIENT_ID": "a", "STUDIO1_DRIVE_CLIENT_SECRET": "b"})


def test_settings_defaults_and_share_list() -> None:
    env = {
        "STUDIO1_DRIVE_CLIENT_ID": "a",
        "STUDIO1_DRIVE_CLIENT_SECRET": "b",
        "STUDIO1_DRIVE_SHARE_WITH": "One@x.com, two@y.org",
    }
    parsed = DriveSettings.from_env(env)
    assert parsed.folder_name == "Studio1 Design decks"
    assert parsed.share_with == ("one@x.com", "two@y.org")
    assert "b" not in repr(parsed).replace("share_with", "")
    with pytest.raises(drive.DriveConfigError, match="not an email"):
        DriveSettings.from_env({**env, "STUDIO1_DRIVE_SHARE_WITH": "nope"})


# ---------------------------------------------------------------------------------- login


def test_pkce_pair_is_valid() -> None:
    verifier, challenge = drive.pkce_pair()
    assert 43 <= len(verifier) <= 128
    expected = hashlib.sha256(verifier.encode()).digest()
    import base64

    assert challenge == base64.urlsafe_b64encode(expected).rstrip(b"=").decode()
    assert drive.pkce_pair()[0] != verifier


def _browser(answer: dict[str, str] | None, seen: list[str]):
    """A fake browser: reads the printed URL's redirect_uri and calls it back."""

    def open_url(url: str) -> None:
        query = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).query))
        seen.append(url)
        reply = dict(answer if answer is not None else {"code": CODE})
        reply.setdefault("state", query["state"])
        httpx.get(query["redirect_uri"] + "/?" + urllib.parse.urlencode(reply), timeout=5)

    return open_url


def test_login_saves_token_with_private_modes(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google)
    seen: list[str] = []
    client.login(open_url=_browser(None, seen), timeout=10, echo=lambda _t: None)
    query = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(seen[0]).query))
    assert query["scope"] == drive.SCOPE == "https://www.googleapis.com/auth/drive.file"
    assert query["code_challenge_method"] == "S256"
    assert query["access_type"] == "offline"
    assert query["redirect_uri"].startswith("http://127.0.0.1:")
    form = google.token_form
    assert form["code"] == CODE and form["redirect_uri"] == query["redirect_uri"]
    assert drive.pkce_pair  # verifier matches the challenge that was sent
    digest = hashlib.sha256(form["code_verifier"].encode()).digest()
    import base64

    assert base64.urlsafe_b64encode(digest).rstrip(b"=").decode() == query["code_challenge"]
    assert stat.S_IMODE(client.token_path.stat().st_mode) == 0o600
    assert stat.S_IMODE(client.token_path.parent.stat().st_mode) == 0o700
    assert drive.signed_in(client.state_dir)


def test_login_refuses_wrong_state(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google)
    with pytest.raises(DriveError, match="state did not match"):
        client.login(
            open_url=_browser({"code": CODE, "state": "forged"}, []),
            timeout=10,
            echo=lambda _t: None,
        )
    assert not client.token_path.exists()
    assert google.calls == []  # no code exchange was attempted


def test_login_times_out(tmp_path: Path) -> None:
    client = make(tmp_path, FakeGoogle())
    with pytest.raises(DriveError, match="no answer"):
        client.login(open_url=lambda _u: None, timeout=0.3, echo=lambda _t: None)


# --------------------------------------------------------------------------------- tokens


def test_refresh_when_expired(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 5000.0)
    sign_in(client, expires_in=10, clock=1000.0)
    client.ensure_folder()
    assert google.refreshes == 1
    saved = json.loads(client.token_path.read_text())
    assert saved["access_token"] == "fake-access-token-new"
    assert saved["refresh_token"] == REFRESH  # kept when Google sends none
    assert stat.S_IMODE(client.token_path.stat().st_mode) == 0o600


def test_refresh_on_401(tmp_path: Path) -> None:
    google = FakeGoogle()
    google.reject_access_once = True
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    assert client.ensure_folder().startswith("folder")
    assert google.refreshes == 1


def test_not_signed_in(tmp_path: Path) -> None:
    client = make(tmp_path, FakeGoogle())
    with pytest.raises(NotSignedIn):
        client.ensure_folder()


def test_revoked_refresh_token_asks_for_login(tmp_path: Path) -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": "invalid_grant"})

    client = DriveClient(
        settings(),
        state_dir=tmp_path / "drive",
        transport=httpx.MockTransport(refuse),
        clock=lambda: 9999.0,
    )
    sign_in(client, expires_in=1, clock=0.0)
    with pytest.raises(NotSignedIn, match="login"):
        client.ensure_folder()


def test_logout_revokes_and_deletes(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google)
    sign_in(client)
    assert "Revoked" in client.logout()
    assert google.revoked == REFRESH
    assert not client.token_path.exists()
    assert not drive.signed_in(client.state_dir)


# --------------------------------------------------------------------------------- folder


def test_folder_created_once_and_recreated_when_gone(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    first = client.ensure_folder()
    assert client.ensure_folder() == first
    assert len(google.folders) == 1
    google.folders[first]["trashed"] = True
    second = client.ensure_folder()
    assert second != first
    del google.folders[second]
    third = client.ensure_folder()
    assert third not in (first, second)
    assert json.loads(client.folder_path.read_text())["id"] == third


def test_share_is_quiet_writer_and_never_public(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, share=("a@x.com", "b@y.org"), clock=lambda: 1000.0)
    sign_in(client)
    client.ensure_folder()
    client.ensure_folder()  # no second round of shares
    assert len(google.permissions) == 2
    for permission in google.permissions:
        assert permission["query"]["sendNotificationEmail"] == "false"
        assert permission["body"]["role"] == "writer"
        assert permission["body"]["type"] == "user"
    assert {p["body"]["emailAddress"] for p in google.permissions} == {"a@x.com", "b@y.org"}
    assert all(p["body"]["type"] != "anyone" for p in google.permissions)
    assert client.status()["shared_with"] == ["a@x.com", "b@y.org"]


def test_new_folder_is_shared_again(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, share=("a@x.com",), clock=lambda: 1000.0)
    sign_in(client)
    first = client.ensure_folder()
    del google.folders[first]
    client.ensure_folder()
    assert len(google.permissions) == 2


# --------------------------------------------------------------------------------- upload


def test_upload_converts_to_slides_and_returns_link(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    when = datetime(2026, 11, 27, 14, 5, 9, tzinfo=UTC)
    result = client.upload_deck(deck(tmp_path), "Acme Cloud intro deck", moment=when)
    assert result["url"].startswith("https://docs.google.com/presentation/d/")
    upload = google.uploads[0]
    assert upload["kind"] == "multipart"
    raw = upload["raw"]
    assert b'"mimeType": "application/vnd.google-apps.presentation"' in raw
    assert drive.PPTX_MIME.encode() in raw and b"PK deck one" in raw
    assert b"Acme Cloud intro deck (2026-11-27 14-05-09 UTC)" in raw
    assert json.dumps([next(iter(google.folders))]).encode() in raw
    assert all(c.method != "DELETE" and c.method != "PATCH" for c in google.calls)


def test_large_deck_uses_resumable(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    big = deck(tmp_path, b"x" * (drive.MULTIPART_LIMIT + 1), "big.pptx")
    result = client.upload_deck(big, "Big")
    assert google.uploads[0]["kind"] == "resumable"
    assert google.uploads[0]["meta"]["mimeType"] == drive.SLIDES_MIME
    assert len(google.uploads[0]["bytes"]) == drive.MULTIPART_LIMIT + 1
    assert result["id"].startswith("file")


def test_same_bytes_reuse_the_link_and_new_bytes_make_a_new_file(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    path = deck(tmp_path)
    first = client.upload_deck(path, "Acme")
    again = client.upload_deck(path, "Acme, renamed")
    assert again == first
    assert client.existing_upload(path) == first
    assert len(google.uploads) == 1
    path.write_bytes(b"PK deck two")
    assert client.upload_deck(path, "Acme")["id"] != first["id"]
    forced = client.upload_deck(path, "Acme", reuse=False)
    assert len(google.uploads) == 3 and forced["id"]


def test_manifest_has_no_secrets(tmp_path: Path) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    client.upload_deck(deck(tmp_path), "Acme")
    text = client.manifest_path.read_text()
    row = json.loads(text.splitlines()[0])
    assert set(row) == {"at", "file", "sha256", "folder_id", "drive_id", "url"}
    assert row["file"] == "deck.pptx"
    assert not any(secret in text for secret in SECRETS)
    assert stat.S_IMODE(client.manifest_path.stat().st_mode) == 0o600


def test_refuses_bad_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    google = FakeGoogle()
    client = make(tmp_path, google, clock=lambda: 1000.0)
    sign_in(client)
    with pytest.raises(DriveError, match="only .pptx"):
        client.upload_deck(deck(tmp_path, name="deck.pdf"), "x")
    with pytest.raises(DriveError, match="not a regular file"):
        client.upload_deck(tmp_path / "missing.pptx", "x")
    with pytest.raises(DriveError, match="not a regular file"):
        client.upload_deck(tmp_path, "x")
    real = deck(tmp_path)
    link = tmp_path / "link.pptx"
    os.symlink(real, link)
    with pytest.raises(DriveError, match="symbolic link"):
        client.upload_deck(link, "x")
    monkeypatch.setattr(drive, "MAX_BYTES", 5)
    with pytest.raises(DriveError, match="100 MiB"):
        client.upload_deck(real, "x")
    with pytest.raises(DriveError, match="title is empty"):
        monkeypatch.setattr(drive, "MAX_BYTES", 10**6)
        client.upload_deck(real, "  ")
    assert google.calls == []


def test_only_google_hosts_over_https(tmp_path: Path) -> None:
    client = make(tmp_path, FakeGoogle())
    with pytest.raises(DriveError, match="refused"):
        client._send("GET", "https://evil.example/x", "step")
    with pytest.raises(DriveError, match="refused"):
        client._send("GET", "http://www.googleapis.com/x", "step")


def test_errors_are_short_and_secret_free(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    def fail(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": {"message": "Backend Error"}})

    client = DriveClient(
        settings(),
        state_dir=tmp_path / "drive",
        transport=httpx.MockTransport(fail),
        clock=lambda: 1000.0,
    )
    sign_in(client)
    with caplog.at_level(logging.DEBUG), pytest.raises(DriveError) as caught:
        client.upload_deck(deck(tmp_path), "Acme")
    assert str(caught.value) == "creating the Drive folder: Google answered 500: Backend Error."
    assert not any(s in caplog.text + str(caught.value) for s in SECRETS)


def test_cli_status_prints_no_secrets(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(drive, "DEFAULT_STATE_DIR", tmp_path / "drive")
    monkeypatch.setenv("STUDIO1_DRIVE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setenv("STUDIO1_DRIVE_CLIENT_SECRET", SECRET)
    out = CliRunner().invoke(drive.cli, ["status"])
    assert out.exit_code == 0 and "Signed in: no" in out.output
    assert SECRET not in out.output
