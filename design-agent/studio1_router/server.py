"""The MCP tools the agent sees. Providers behind them are the router's business."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

from studio1_router.config import HARD_MAX_CHARS
from studio1_router.guard import RouterGuard
from studio1_router.providers.base import Call, Provider
from studio1_router.router import AllProvidersFailed, Router
from studio1_router.safety import UnsafeUrl, ensure_public_url, host_of

MAX_FIELDS = 30
MAX_QUERY = 500


def _clean_fields(fields: dict[str, str]) -> dict[str, str]:
    if not fields or len(fields) > MAX_FIELDS:
        raise ToolError(f"fields needs between 1 and {MAX_FIELDS} entries")
    return {str(k)[:64]: str(v)[:300] for k, v in fields.items()}


async def _safe_url(url: str) -> str:
    try:
        return await ensure_public_url(url)
    except UnsafeUrl as exc:
        raise ToolError(f"URL refused: {exc}") from exc


def build_app(mcp: FastMCP, *, authorization: str, port: int) -> RouterGuard:
    """fastmcp's HTTP app behind the guard, for every path."""
    return RouterGuard(mcp.http_app(path="/mcp"), authorization=authorization, port=port)


def build_server(router: Router) -> FastMCP:
    mcp = FastMCP("router")

    async def run(
        tool: str,
        subject: str,
        context: str | None,
        invoke: Callable[[Provider, Call], Awaitable[Any]],
    ) -> tuple[str, Any]:
        try:
            return await router.dispatch(tool, subject, context, invoke)
        except AllProvidersFailed as exc:
            raise ToolError(str(exc)) from exc

    @mcp.tool
    async def web_search(
        query: str, max_results: int = 8, context: str | None = None
    ) -> list[dict[str, str]]:
        """Search the web. Returns a list of results with title, url and snippet."""
        query = query.strip()[:MAX_QUERY]
        if not query:
            raise ToolError("query is empty")
        limit = max(1, min(max_results, 25))

        async def invoke(provider: Provider, call: Call) -> list[dict[str, str]]:
            return [h.as_dict() for h in (await provider.search(call, query, limit))[:limit]]

        _, hits = await run("web_search", query, context, invoke)
        return list(hits)

    @mcp.tool
    async def read_page(url: str, context: str | None = None) -> dict[str, Any]:
        """Read a public web page as markdown or text, trimmed to a maximum length."""
        url = await _safe_url(url)
        limit = router.config.max_chars

        async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
            page = await provider.read(call, url)
            final = await _safe_url(page.url)
            text = page.text
            return {
                "url": final,
                "content": text[:limit],
                "truncated": len(text) > limit,
            }

        provider_name, result = await run("read_page", host_of(url), context, invoke)
        return {**result, "provider": provider_name, "max_chars": min(limit, HARD_MAX_CHARS)}

    @mcp.tool
    async def extract_fields(
        url: str, fields: dict[str, str], context: str | None = None
    ) -> dict[str, Any]:
        """Pull named fields out of a public page. fields maps each name to what to extract."""
        url = await _safe_url(url)
        wanted = _clean_fields(fields)

        async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
            return await provider.extract(call, url, wanted)

        provider_name, values = await run("extract_fields", host_of(url), context, invoke)
        return {"url": url, "fields": values, "provider": provider_name}

    @mcp.tool
    async def lookup_company(
        name: str, github: str | None = None, context: str | None = None
    ) -> dict[str, Any]:
        """Public GitHub facts for a company (org or owner/repo), or candidates when none given."""
        name = name.strip()[:200]
        if not name and not github:
            raise ToolError("name is empty")

        async def invoke(provider: Provider, call: Call) -> dict[str, Any]:
            return await provider.lookup(call, name, github)

        _, result = await run("lookup_company", github or name, context, invoke)
        return dict(result)

    return mcp
