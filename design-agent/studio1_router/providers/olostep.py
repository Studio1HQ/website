"""Olostep: search and read through the REST API (bearer key in OLOSTEP_API_KEY).

Docs used, 2026-11-27:
  https://docs.olostep.com/api-reference/searches/create   POST https://api.olostep.com/v1/searches
  https://docs.olostep.com/api-reference/scrapes/create    POST https://api.olostep.com/v1/scrapes

search: body {query, limit 1-25}; response result.links[] of {url, title, description}.
read: body {url_to_scrape, formats: ["markdown"]}; response result.markdown_content. The docs have
  no final or redirected URL field, so the requested URL is returned.
extract: body {url_to_scrape, formats: ["json"], llm_extract: {schema}}. The docs do not say where
  the extracted object comes back (json_content is the closest match), so it is unverified and the
  example config ships it disabled.
"""

from __future__ import annotations

import json
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

API = "https://api.olostep.com/v1"


class Olostep(Provider):
    name = "olostep"
    key_env = "OLOSTEP_API_KEY"
    VERIFIED = {"search": True, "read": True, "extract": False}

    def _headers(self, call: Call) -> dict[str, str]:
        return {"Authorization": f"Bearer {call.key}", "Content-Type": "application/json"}

    async def search(self, call: Call, query: str, limit: int) -> list[SearchHit]:
        body = await request(
            call,
            "POST",
            f"{API}/searches",
            headers=self._headers(call),
            json_body={"query": query, "limit": max(1, min(limit, 25))},
        )
        links = as_dict(as_dict(parse_json(body)).get("result")).get("links")
        if not isinstance(links, list):
            raise ProviderError("unexpected response shape")
        return [
            SearchHit(text_of(x.get("title")), text_of(x.get("url")), text_of(x.get("description")))
            for x in links
            if isinstance(x, dict) and x.get("url")
        ]

    async def read(self, call: Call, url: str) -> Page:
        body = await request(
            call,
            "POST",
            f"{API}/scrapes",
            headers=self._headers(call),
            json_body={"url_to_scrape": url, "formats": ["markdown"]},
        )
        result = as_dict(as_dict(parse_json(body)).get("result"))
        text = text_of(result.get("markdown_content"))
        if not text:
            raise ProviderError("no markdown_content in the response")
        return Page(url, text)

    async def extract(self, call: Call, url: str, fields: Mapping[str, str]) -> dict[str, Any]:
        schema = {
            "type": "object",
            "properties": {k: {"type": "string", "description": d} for k, d in fields.items()},
        }
        body = await request(
            call,
            "POST",
            f"{API}/scrapes",
            headers=self._headers(call),
            json_body={
                "url_to_scrape": url,
                "formats": ["json"],
                "llm_extract": {"schema": schema},
            },
        )
        content = as_dict(as_dict(parse_json(body)).get("result")).get("json_content")
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except ValueError as exc:
                raise ProviderError("json_content was not JSON") from exc
        data = as_dict(content)
        return {k: data.get(k) for k in fields}


PROVIDER = Olostep()
