"""The router's tools as plain functions, shared by the MCP server and in-process callers.

The worker's enrichment step calls these directly instead of going through MCP, so the provider
order, the monthly caps and the usage log apply to it exactly as they do to the agent. There is no
other way into a provider.
"""

from __future__ import annotations

import re
from typing import Any

from studio1_router.config import HARD_MAX_CHARS
from studio1_router.providers.base import Call, Provider
from studio1_router.router import Router
from studio1_router.safety import ensure_public_url, host_of

MAX_FIELDS = 30
MAX_QUERY = 500
#: A LinkedIn company page; the slug is the company's id on LinkedIn, never a person's.
LINKEDIN_COMPANY = re.compile(
    r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/company/([A-Za-z0-9][A-Za-z0-9_-]{0,99})/?"
    r"(?:[?#][^\s]*)?",
    re.IGNORECASE,
)


class ToolInputError(ValueError):
    """The caller's input was refused. The message is safe to show."""


def linkedin_company_url(url: str) -> str | None:
    """The page in one canonical form, or None when it is not a LinkedIn company page."""
    match = LINKEDIN_COMPANY.fullmatch(url.strip())
    return f"https://www.linkedin.com/company/{match.group(1).lower()}" if match else None


def clean_fields(fields: dict[str, str]) -> dict[str, str]:
    if not fields or len(fields) > MAX_FIELDS:
        raise ToolInputError(f"fields needs between 1 and {MAX_FIELDS} entries")
    return {str(k)[:64]: str(v)[:300] for k, v in fields.items()}


async def web_search(
    router: Router, query: str, max_results: int = 8, context: str | None = None
) -> list[dict[str, str]]:
    query = query.strip()[:MAX_QUERY]
    if not query:
        raise ToolInputError("query is empty")
    limit = max(1, min(max_results, 25))

    async def invoke(provider: Provider, call: Call) -> list[dict[str, str]]:
        return [h.as_dict() for h in (await provider.search(call, query, limit))[:limit]]

    _, hits = await router.dispatch("web_search", query, context, invoke)
    return list(hits)


async def read_page(router: Router, url: str, context: str | None = None) -> dict[str, Any]:
    """Raises UnsafeUrl for an address the router will not pass on."""
    url = await ensure_public_url(url)
    limit = router.config.max_chars

    async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
        page = await provider.read(call, url)
        final = await ensure_public_url(page.url)
        text = page.text
        return {"url": final, "content": text[:limit], "truncated": len(text) > limit}

    provider_name, result = await router.dispatch("read_page", host_of(url), context, invoke)
    return {**result, "provider": provider_name, "max_chars": min(limit, HARD_MAX_CHARS)}


async def extract_fields(
    router: Router, url: str, fields: dict[str, str], context: str | None = None
) -> dict[str, Any]:
    url = await ensure_public_url(url)
    wanted = clean_fields(fields)

    async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
        return await provider.extract(call, url, wanted)

    provider_name, values = await router.dispatch("extract_fields", host_of(url), context, invoke)
    return {"url": url, "fields": values, "provider": provider_name}


async def lookup_company(
    router: Router,
    name: str,
    github: str | None = None,
    context: str | None = None,
    website: str | None = None,
) -> dict[str, Any]:
    name = name.strip()[:200]
    if not name and not github:
        raise ToolInputError("name is empty")
    site = (website or "").strip()[:300] or None

    async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
        return await provider.lookup(call, name, github, site)

    _, result = await router.dispatch("lookup_company", github or name, context, invoke)
    return dict(result)


async def company_profile(router: Router, url: str, context: str | None = None) -> dict[str, Any]:
    """A company's LinkedIn record. Only a LinkedIn company page is accepted."""
    page = linkedin_company_url(url)
    if page is None:
        raise ToolInputError("url must be a LinkedIn company page")

    async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
        return await provider.company(call, page)

    subject = page.removeprefix("https://www.")
    _, record = await router.dispatch("company_profile", subject, context, invoke)
    return {**dict(record), "page": page}
