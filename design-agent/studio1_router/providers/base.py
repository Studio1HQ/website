"""Shared pieces of every adapter: the call context, errors and a size-limited JSON request."""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

import httpx

#: A provider response larger than this is refused rather than read into memory.
MAX_RESPONSE_BYTES = 8 * 1024 * 1024


class ProviderError(Exception):
    """A provider call failed. The message is safe to show: never a key, never a response body."""


@dataclass(frozen=True)
class Call:
    client: httpx.AsyncClient
    key: str
    timeout: float
    options: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class SearchHit:
    title: str
    url: str
    snippet: str

    def as_dict(self) -> dict[str, str]:
        return {"title": self.title, "url": self.url, "snippet": self.snippet}


@dataclass(frozen=True)
class Page:
    url: str
    text: str


class Provider:
    """Implements only the capabilities it has; the router finds them with `has`."""

    name = ""
    key_env = ""
    key_required = True
    #: Per capability: True once the endpoint, request and response were confirmed in the
    #: provider's own docs (the URL and date are at the top of each module).
    VERIFIED: Mapping[str, bool] = {}

    def has(self, capability: str) -> bool:
        return getattr(type(self), capability, None) is not getattr(Provider, capability, None)

    async def search(self, call: Call, query: str, limit: int) -> list[SearchHit]:
        raise NotImplementedError

    async def read(self, call: Call, url: str) -> Page:
        raise NotImplementedError

    async def extract(self, call: Call, url: str, fields: Mapping[str, str]) -> dict[str, Any]:
        raise NotImplementedError

    async def lookup(self, call: Call, name: str, github: str | None) -> dict[str, Any]:
        raise NotImplementedError


async def request(
    call: Call,
    method: str,
    url: str,
    *,
    headers: Mapping[str, str],
    json_body: Mapping[str, Any] | None = None,
    params: Mapping[str, str | int] | None = None,
) -> bytes:
    """One request with the call's timeout, no redirects and a hard cap on the body size."""
    try:
        async with call.client.stream(
            method,
            url,
            headers=dict(headers),
            json=json_body,
            params=params,
            timeout=call.timeout,
            follow_redirects=False,
        ) as response:
            if response.status_code >= 400:
                raise ProviderError(f"HTTP {response.status_code}")
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body += chunk
                if len(body) > MAX_RESPONSE_BYTES:
                    raise ProviderError("response larger than the size limit")
            return bytes(body)
    except httpx.TimeoutException as exc:
        raise ProviderError("timeout") from exc
    except httpx.HTTPError as exc:
        raise ProviderError(type(exc).__name__) from exc


def parse_json(body: bytes) -> Any:
    try:
        return json.loads(body)
    except ValueError as exc:
        raise ProviderError("response was not JSON") from exc


def as_dict(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ProviderError("unexpected response shape")
    return value


def text_of(value: Any) -> str:
    return value if isinstance(value, str) else ""
