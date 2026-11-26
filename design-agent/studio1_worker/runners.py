"""Ways to run one turn of the design agent on a thread."""

from __future__ import annotations

import logging
import os
import re
import subprocess
import sys
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

import httpx

REPO_ROOT = Path(__file__).resolve().parent.parent
_LOGGER = logging.getLogger(__name__)
_FILE_NAME = re.compile(r"[A-Za-z0-9_.:-]{1,128}")


class RunnerError(RuntimeError):
    """A turn could not run; the message is safe to print."""


@dataclass
class TurnResult:
    reply: str
    files: list[str] = field(default_factory=list)
    working: bool = False


class Runner(Protocol):
    def run(self, thread_id: str, prompt: str, attachments: Sequence[Path] = ()) -> TurnResult: ...


# `design_agent` has no __main__ module, so the installed entry point's function is called
# through the same interpreter. That keeps the project's virtualenv without relying on PATH.
_ENTRY = "from design_agent.cli import main; main()"


class CliRunner:
    """`design-agent ask`, one subprocess per turn. It waits for background work itself."""

    def __init__(self, root: Path = REPO_ROOT) -> None:
        self.root = root

    def command(self, thread_id: str, prompt: str, attachments: Sequence[Path]) -> list[str]:
        cmd = [sys.executable, "-c", _ENTRY, "ask", prompt, "--thread", thread_id]
        for path in attachments:
            cmd += ["--file", str(path)]
        return cmd

    def run(self, thread_id: str, prompt: str, attachments: Sequence[Path] = ()) -> TurnResult:
        cmd = self.command(thread_id, prompt, attachments)
        with subprocess.Popen(  # noqa: S603 - fixed argv, no shell
            cmd, cwd=self.root, stdout=subprocess.PIPE, text=True, bufsize=1
        ) as proc:
            if proc.stdout is None:
                raise RunnerError("no output stream from design-agent")
            captured: list[str] = []
            for line in proc.stdout:
                sys.stdout.write(line)
                captured.append(line)
            code = proc.wait()
        if code != 0:
            raise RunnerError(f"design-agent ask exited with {code}; the thread is saved")
        folder = self.root / "workspace" / "out" / thread_id
        files = sorted(p.name for p in folder.iterdir() if p.is_file()) if folder.is_dir() else []
        return TurnResult(reply=_reply_from(captured), files=files, working=False)


def _reply_from(lines: list[str]) -> str:
    """Drop the file listing and thread hint the CLI prints after the reply."""
    kept = [
        line
        for line in lines
        if not line.startswith(("  /", "(thread ")) and "cost: about" not in line
    ]
    return "".join(kept).strip()


class ApiRunner:
    """The self-hosted HTTP API. Needs `STUDIO1_AGENT_URL` and `STUDIO1_AGENT_TOKEN`."""

    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        *,
        transport: httpx.BaseTransport | None = None,
        turn_timeout: float = 1800.0,
        poll_interval: float = 5.0,
        deadline: float = 1800.0,
        quiet_polls: int = 3,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        url = base_url or os.environ.get("STUDIO1_AGENT_URL")
        secret = token or os.environ.get("STUDIO1_AGENT_TOKEN")
        if not url or not secret:
            raise RunnerError("Set STUDIO1_AGENT_URL and STUDIO1_AGENT_TOKEN, or pass them in.")
        self._client = httpx.Client(
            base_url=url.rstrip("/"),
            headers={"Authorization": f"Bearer {secret}"},
            timeout=httpx.Timeout(turn_timeout, connect=15.0),
            transport=transport,
        )
        self._poll_interval = poll_interval
        self._deadline = deadline
        self._quiet_polls = quiet_polls
        self._sleep = sleep

    def _call(self, method: str, path: str, **kwargs: object) -> httpx.Response:
        _LOGGER.info("%s %s", method, path)
        try:
            response = self._client.request(method, path, **kwargs)  # type: ignore[arg-type]
        except httpx.HTTPError as error:
            raise RunnerError(f"{method} {path} failed: {type(error).__name__}") from None
        if response.status_code >= 400:
            raise RunnerError(f"{method} {path} failed with HTTP {response.status_code}")
        return response

    def run(self, thread_id: str, prompt: str, attachments: Sequence[Path] = ()) -> TurnResult:
        base = f"/threads/{thread_id}"
        if attachments:
            uploads = []
            for path in attachments:
                if not _FILE_NAME.fullmatch(path.name):
                    raise RunnerError(f"attachment name {path.name!r} is not accepted by the API")
                uploads.append(("files", (path.name, path.read_bytes())))
            self._call("POST", f"{base}/attachments", files=uploads)
        body = self._call("POST", f"{base}/messages", json={"text": prompt}).json()
        reply = str(body["reply"])
        files = [str(name) for name in body["files"]]
        working = bool(body["working"])
        if working:
            extra, working = self._wait(base)
            if extra:
                reply = "\n\n".join([reply, *extra])
        return TurnResult(reply=reply, files=files, working=working)

    def _wait(self, base: str) -> tuple[list[str], bool]:
        """Poll updates. The API has no done flag, so a few empty polls after the last update
        count as finished; the deadline ends it either way."""
        cursor = 0
        collected: list[str] = []
        quiet = 0
        started = time.monotonic()
        while time.monotonic() - started < self._deadline:
            self._sleep(self._poll_interval)
            data = self._call("GET", f"{base}/updates", params={"after": cursor}).json()
            fresh = [str(text) for text in data["updates"]]
            cursor = int(data["cursor"])
            collected += fresh
            quiet = 0 if fresh else quiet + 1
            if collected and quiet >= self._quiet_polls:
                return collected, False
        return collected, True
