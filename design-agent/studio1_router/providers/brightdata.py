"""Bright Data: search through the SERP API, read through Web Unlocker (bearer BRIGHTDATA_API_TOKEN).

Docs used, 2026-11-27:
  https://docs.brightdata.com/products/serp-api/introduction.md
  https://docs.brightdata.com/scraping-automation/web-unlocker/send-your-first-request.md
Both are POST https://api.brightdata.com/request with {zone, url, format}. The zone names are
account settings, not secrets, so they live in the router config under
[providers.brightdata.options] (serp_zone, unlocker_zone).

search: url is a Google search URL with brd_json=1 (a query parameter, per the docs), format "raw";
  the body is parsed SERP JSON with an `organic` list of {title, link, description}. A second
  documented preview uses `results` with `url`, so both names are read.
read: format "raw" plus data_format "markdown". Only the SERP page documents data_format; the
  Web Unlocker page does not, so read is unverified and the example config ships it disabled.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote_plus

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

ENDPOINT = "https://api.brightdata.com/request"


class BrightData(Provider):
    name = "brightdata"
    key_env = "BRIGHTDATA_API_TOKEN"
    VERIFIED = {"search": True, "read": False}

    def _headers(self, call: Call) -> dict[str, str]:
        return {"Authorization": f"Bearer {call.key}", "Content-Type": "application/json"}

    def _zone(self, call: Call, option: str) -> str:
        zone = call.options.get(option)
        if not zone:
            raise ProviderError(f"{option} is not set in the router config")
        return zone

    async def search(self, call: Call, query: str, limit: int) -> list[SearchHit]:
        target = f"https://www.google.com/search?q={quote_plus(query)}&num={limit}&brd_json=1"
        body = await request(
            call,
            "POST",
            ENDPOINT,
            headers=self._headers(call),
            json_body={"zone": self._zone(call, "serp_zone"), "url": target, "format": "raw"},
        )
        data = as_dict(parse_json(body))
        if isinstance(data.get("body"), str):  # the json envelope wraps the page in `body`
            data = as_dict(parse_json(data["body"].encode()))
        rows: Any = data.get("organic", data.get("results"))
        if not isinstance(rows, list):
            raise ProviderError("unexpected response shape")
        hits = [
            SearchHit(
                text_of(r.get("title")),
                text_of(r.get("link") or r.get("url")),
                text_of(r.get("description")),
            )
            for r in rows
            if isinstance(r, dict) and (r.get("link") or r.get("url"))
        ]
        return hits[:limit]

    async def read(self, call: Call, url: str) -> Page:
        body = await request(
            call,
            "POST",
            ENDPOINT,
            headers=self._headers(call),
            json_body={
                "zone": self._zone(call, "unlocker_zone"),
                "url": url,
                "format": "raw",
                "data_format": "markdown",
            },
        )
        text = body.decode("utf-8", errors="replace")
        if not text.strip():
            raise ProviderError("empty response")
        if text.lstrip().startswith("{"):  # an error envelope, not a page
            try:
                json.loads(text)
            except ValueError:
                pass
            else:
                raise ProviderError("JSON response where markdown was expected")
        return Page(url, text)


PROVIDER = BrightData()
