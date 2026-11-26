"""URL checks for `read_page` and `extract_fields`: the agent must not reach internal addresses."""

from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit


class UnsafeUrl(ValueError):
    """The URL is not one the router will pass to a provider."""


async def resolve(host: str) -> list[str]:
    infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    return [str(info[4][0]) for info in infos]


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%")[0])
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    # is_global is false for private, loopback, link-local (169.254.169.254 metadata), shared
    # (100.64/10), multicast, reserved and unspecified ranges.
    return ip.is_global


async def ensure_public_url(url: str) -> str:
    parts = urlsplit(url.strip())
    if parts.scheme not in ("http", "https"):
        raise UnsafeUrl("only http and https URLs are allowed")
    if not parts.hostname or parts.username or parts.password:
        raise UnsafeUrl("the URL needs a host and no embedded credentials")
    try:
        addresses = await resolve(parts.hostname)
    except OSError as exc:
        raise UnsafeUrl("the host does not resolve") from exc
    if not addresses or not all(_is_public(a) for a in addresses):
        raise UnsafeUrl("the host is not a public address")
    return parts.geturl()


def host_of(url: str) -> str:
    return urlsplit(url).hostname or ""
