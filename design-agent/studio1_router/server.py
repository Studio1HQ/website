"""The MCP tools the agent sees. Providers behind them are the router's business.

Each tool is a thin wrapper over `studio1_router.tools`, the same functions the worker's
enrichment step calls in-process. `company_profile` is not offered here: only the worker uses it.
"""

from __future__ import annotations

from collections.abc import Awaitable
from typing import Any

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

from studio1_router import tools
from studio1_router.guard import RouterGuard
from studio1_router.router import AllProvidersFailed, Router
from studio1_router.safety import UnsafeUrl


async def _served[T](work: Awaitable[T]) -> T:
    try:
        return await work
    except AllProvidersFailed as exc:
        raise ToolError(str(exc)) from exc
    except UnsafeUrl as exc:
        raise ToolError(f"URL refused: {exc}") from exc
    except tools.ToolInputError as exc:
        raise ToolError(str(exc)) from exc


def build_app(mcp: FastMCP, *, authorization: str, port: int) -> RouterGuard:
    """fastmcp's HTTP app behind the guard, for every path."""
    return RouterGuard(mcp.http_app(path="/mcp"), authorization=authorization, port=port)


def build_server(router: Router) -> FastMCP:
    mcp = FastMCP("router")

    @mcp.tool
    async def web_search(
        query: str, max_results: int = 8, context: str | None = None
    ) -> list[dict[str, str]]:
        """Search the web. Returns a list of results with title, url and snippet."""
        return await _served(tools.web_search(router, query, max_results, context))

    @mcp.tool
    async def read_page(url: str, context: str | None = None) -> dict[str, Any]:
        """Read a public web page as markdown or text, trimmed to a maximum length."""
        return await _served(tools.read_page(router, url, context))

    @mcp.tool
    async def extract_fields(
        url: str, fields: dict[str, str], context: str | None = None
    ) -> dict[str, Any]:
        """Pull named fields out of a public page. fields maps each name to what to extract."""
        return await _served(tools.extract_fields(router, url, fields, context))

    @mcp.tool
    async def lookup_company(
        name: str,
        github: str | None = None,
        context: str | None = None,
        website: str | None = None,
    ) -> dict[str, Any]:
        """Public GitHub facts for a company (org or owner/repo), or candidates when none given.

        With `website` and no `github`, an org whose GitHub profile names that same website is
        taken as the company and its facts come back (`matched_by` is "website").
        """
        return await _served(tools.lookup_company(router, name, github, context, website))

    return mcp
