"""Where the sorter looks leads up: the local store or the dashboard's database."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse

FREE_MAIL = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "outlook.com",
        "hotmail.com",
        "live.com",
        "msn.com",
        "yahoo.com",
        "ymail.com",
        "icloud.com",
        "me.com",
        "aol.com",
        "proton.me",
        "protonmail.com",
        "pm.me",
        "gmx.com",
        "gmx.net",
        "mail.com",
        "zoho.com",
        "zohomail.com",
        "yandex.com",
        "fastmail.com",
        "hey.com",
        "qq.com",
        "163.com",
    }
)


def host_of(url: str) -> str:
    raw = url.strip()
    if not raw:
        return ""
    host = (urlparse(raw if "://" in raw else f"https://{raw}").hostname or "").lower()
    return host.removeprefix("www.")


def host_matches(sender_domain: str, host: str) -> bool:
    """True when the From domain is the lead's host or a subdomain of it. Free mail never is."""
    if not sender_domain or not host or host in FREE_MAIL or sender_domain in FREE_MAIL:
        return False
    return sender_domain == host or sender_domain.endswith(f".{host}")


@dataclass(frozen=True)
class LeadRef:
    """A lead that already exists. `key` is what an event is queued against: the local slug, or
    the organization id in the database. `slug` is the one used in the thread id."""

    key: str
    slug: str
    name: str
    url: str
    source: str = "mail"

    @property
    def host(self) -> str:
        return host_of(self.url)


class LeadDirectory(Protocol):
    def find_by_sender_domain(self, domain: str) -> LeadRef | None:
        """The lead whose website is this From domain or a parent of it, else None."""
        ...

    def find_by_name(self, name: str) -> LeadRef | None:
        """The lead whose name makes the same slug, else None."""
        ...
