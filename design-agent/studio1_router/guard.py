"""Who may call the router: a local process that holds the shared secret, and nobody else.

The router spends provider credits and fetches pages, and it listens on a local port that any
local process or web page can reach. Three checks stop that, on every path:
- Authorization must equal the shared secret (stops any caller without it).
- Host must be a loopback name with the bound port (stops DNS rebinding, where a hostile name
  resolves to 127.0.0.1).
- No Origin header (browsers send it on cross-origin requests; the agent's MCP client does not).
"""

from __future__ import annotations

import hmac
from collections.abc import Mapping
from typing import Any

from starlette.responses import PlainTextResponse
from starlette.types import ASGIApp, Receive, Scope, Send

AUTH_ENV = "STUDIO1_ROUTER_AUTHORIZATION"
MIN_TOKEN = 32
LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})
HOW_TO_MAKE = "python -c \"import secrets; print('Bearer ' + secrets.token_urlsafe(32))\""


class GuardConfigError(ValueError):
    """A setting is wrong; the message is safe to print (it never holds the secret)."""


def read_authorization(env: Mapping[str, str]) -> str:
    value = env.get(AUTH_ENV, "").strip()
    if not value:
        raise GuardConfigError(
            f"Set {AUTH_ENV} before starting the router. Make one with:\n  {HOW_TO_MAKE}\n"
            f"then export {AUTH_ENV}=<that value> here and in the shell that starts the agent."
        )
    scheme, _, token = value.partition(" ")
    if scheme != "Bearer" or len(token.strip()) < MIN_TOKEN:
        raise GuardConfigError(
            f"{AUTH_ENV} must be 'Bearer ' followed by a token of at least {MIN_TOKEN} "
            f"characters. Make one with:\n  {HOW_TO_MAKE}"
        )
    return value


def check_bind_host(host: str) -> None:
    if host.strip("[]").lower() not in LOOPBACK_HOSTS:
        raise GuardConfigError(
            f"The router only binds to 127.0.0.1, localhost or ::1 (got {host!r}). It has no TLS, "
            "so it must not be reachable from another machine."
        )


def allowed_hosts(port: int) -> frozenset[str]:
    names = ("127.0.0.1", "localhost", "[::1]")
    return frozenset({*names, *(f"{name}:{port}" for name in names)})


class RouterGuard:
    """ASGI middleware: wrap the whole app so every path, `/mcp` included, is checked."""

    def __init__(self, app: ASGIApp, *, authorization: str, port: int) -> None:
        self.app = app
        self._authorization = authorization.encode()
        self._hosts = allowed_hosts(port)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "lifespan":
            await self.app(scope, receive, send)
            return
        if scope["type"] != "http":  # no WebSocket endpoint exists
            await send({"type": "websocket.close", "code": 1008})
            return
        headers: dict[str, str] = {}
        for raw_name, raw_value in scope["headers"]:
            headers.setdefault(raw_name.decode("latin-1").lower(), raw_value.decode("latin-1"))
        denied = self._denial(headers)
        if denied is not None:
            await denied(scope, receive, send)
            return
        await self.app(scope, receive, send)

    def _denial(self, headers: Mapping[str, str]) -> Any:
        given = headers.get("authorization", "").encode()
        if not hmac.compare_digest(given, self._authorization):
            return PlainTextResponse("", status_code=401)
        if headers.get("host", "").lower() not in self._hosts:
            return PlainTextResponse("", status_code=421)
        if "origin" in headers:
            return PlainTextResponse("", status_code=403)
        return None
