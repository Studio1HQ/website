"""Provider adapters, one module each. `ALL` is the registry the router reads."""

from __future__ import annotations

from studio1_router.providers import brightdata, github, olostep, scrapegraph
from studio1_router.providers.base import Provider

ALL: dict[str, Provider] = {
    p.name: p
    for p in (brightdata.PROVIDER, olostep.PROVIDER, scrapegraph.PROVIDER, github.PROVIDER)
}
