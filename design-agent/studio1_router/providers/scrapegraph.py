"""ScrapeGraphAI: extract, read and search through the v2 API (key in SGAI_API_KEY).

Docs used, 2026-11-27:
  https://docs.scrapegraphai.com/api-reference/introduction.md  (v2 is current; the v1 host
    api.scrapegraphai.com/v1 and its names smartscraper, searchscraper and markdownify are
    deprecated, so this targets v2 only)
  https://docs.scrapegraphai.com/services/extract.md
  https://docs.scrapegraphai.com/services/scrape.md
  https://docs.scrapegraphai.com/services/search.md
Base https://v2-api.scrapegraphai.com, header `SGAI-APIKEY`.

extract: POST /api/extract {url, prompt, schema}; the object is in the response `json` field.
read: POST /api/scrape {url, formats: [{type: "markdown"}]}; text in results.markdown.data[].
  The docs show no final URL, so the requested URL is returned.
search: POST /api/search {query, numResults}. The docs show results items read as title and url
  but no raw JSON response and no snippet field name, so search is unverified and the example
  config ships it disabled.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from studio1_router.providers.base import (
    Call,
    Page,
    Provider,
    ProviderError,
    SearchHit,
    as_dict,
    parse_json,
    request,
    text_of,
)

API = "https://v2-api.scrapegraphai.com/api"


class ScrapeGraph(Provider):
    name = "scrapegraph"
    key_env = "SGAI_API_KEY"
    VERIFIED = {"search": False, "read": True, "extract": True}

    def _headers(self, call: Call) -> dict[str, str]:
        return {"SGAI-APIKEY": call.key, "Content-Type": "application/json"}

    async def extract(self, call: Call, url: str, fields: Mapping[str, str]) -> dict[str, Any]:
        prompt = "Extract these fields from the page, null when absent: " + "; ".join(
            f"{k}: {d}" for k, d in fields.items()
        )
        schema = {
            "type": "object",
            "properties": {
                k: {"type": ["string", "null"], "description": d} for k, d in fields.items()
            },
        }
        body = await request(
            call,
            "POST",
            f"{API}/extract",
            headers=self._headers(call),
            json_body={"url": url, "prompt": prompt, "schema": schema},
        )
        data = as_dict(as_dict(parse_json(body)).get("json"))
        return {k: data.get(k) for k in fields}

    async def read(self, call: Call, url: str) -> Page:
        body = await request(
            call,
            "POST",
            f"{API}/scrape",
            headers=self._headers(call),
            json_body={"url": url, "formats": [{"type": "markdown"}]},
        )
        results = as_dict(as_dict(parse_json(body)).get("results"))
        parts = as_dict(results.get("markdown")).get("data")
        if not isinstance(parts, list) or not parts:
            raise ProviderError("no markdown in the response")
        return Page(url, "\n\n".join(text_of(p) for p in parts))

    async def search(self, call: Call, query: str, limit: int) -> list[SearchHit]:
        body = await request(
            call,
            "POST",
            f"{API}/search",
            headers=self._headers(call),
            json_body={"query": query, "numResults": max(1, min(limit, 20))},
        )
        rows = as_dict(parse_json(body)).get("results")
        if not isinstance(rows, list):
            raise ProviderError("unexpected response shape")
        return [
            SearchHit(
                text_of(r.get("title")),
                text_of(r.get("url")),
                text_of(r.get("content") or r.get("snippet")),
            )
            for r in rows
            if isinstance(r, dict) and r.get("url")
        ]


PROVIDER = ScrapeGraph()
