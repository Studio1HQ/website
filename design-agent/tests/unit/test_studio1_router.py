"""The search router, offline: every provider call goes to an httpx.MockTransport."""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest

from studio1_router import safety
from studio1_router.config import TOOL_CAPABILITY, ConfigFile, parse
from studio1_router.providers import brightdata, github, olostep, scrapegraph
from studio1_router.providers.base import Call, Provider, ProviderError
from studio1_router.router import AllProvidersFailed, Router
from studio1_router.usage import UsageLog

ROOT = Path(__file__).resolve().parents[2]
SECRET = "sk-secret-value-123"
Handler = Callable[[httpx.Request], httpx.Response]


def _call(handler: Handler, **options: str) -> Call:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return Call(client, SECRET, 5.0, options)


def _json(request: httpx.Request) -> dict[str, Any]:
    body: dict[str, Any] = json.loads(request.content)
    return body


@pytest.fixture(autouse=True)
def public_dns(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hosts resolve offline: names ending .test are public, `internal.test` is private."""

    async def resolve(host: str) -> list[str]:
        if host == "internal.test":
            return ["10.0.0.5"]
        if host == "localhost":
            return ["127.0.0.1"]
        if ":" in host or host.replace(".", "").isdigit():
            return [host]
        return ["93.184.216.34"]

    monkeypatch.setattr(safety, "resolve", resolve)


# adapters ---------------------------------------------------------------------------------


async def test_olostep_search_and_read_build_the_documented_requests() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path == "/v1/searches":
            links = [{"url": "https://a.test", "title": "A", "description": "about a"}]
            return httpx.Response(200, json={"result": {"links": links}})
        return httpx.Response(200, json={"result": {"markdown_content": "# Hi"}})

    call = _call(handler)
    hits = await olostep.PROVIDER.search(call, "agents", 8)
    page = await olostep.PROVIDER.read(call, "https://a.test/x")
    assert hits[0].as_dict() == {"title": "A", "url": "https://a.test", "snippet": "about a"}
    assert (page.url, page.text) == ("https://a.test/x", "# Hi")
    assert str(seen[0].url) == "https://api.olostep.com/v1/searches"
    assert seen[0].headers["Authorization"] == f"Bearer {SECRET}"
    assert _json(seen[0]) == {"query": "agents", "limit": 8}
    assert _json(seen[1]) == {"url_to_scrape": "https://a.test/x", "formats": ["markdown"]}


async def test_brightdata_search_uses_the_serp_zone_and_parses_organic() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        organic = [{"title": "T", "link": "https://t.test", "description": "d"}]
        return httpx.Response(200, json={"organic": organic})

    hits = await brightdata.PROVIDER.search(_call(handler, serp_zone="z1"), "mcp servers", 3)
    assert hits[0].as_dict() == {"title": "T", "url": "https://t.test", "snippet": "d"}
    assert str(seen[0].url) == "https://api.brightdata.com/request"
    body = _json(seen[0])
    assert body["zone"] == "z1" and body["format"] == "raw"
    assert body["url"].startswith("https://www.google.com/search?q=mcp+servers")
    assert "brd_json=1" in body["url"]
    with pytest.raises(ProviderError, match="serp_zone"):
        await brightdata.PROVIDER.search(_call(handler), "q", 3)


async def test_brightdata_read_asks_for_markdown() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert _json(request) == {
            "zone": "u1",
            "url": "https://a.test",
            "format": "raw",
            "data_format": "markdown",
        }
        return httpx.Response(200, text="# Page")

    page = await brightdata.PROVIDER.read(_call(handler, unlocker_zone="u1"), "https://a.test")
    assert page.text == "# Page"


async def test_scrapegraph_v2_extract_read_and_search() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        match request.url.path:
            case "/api/extract":
                return httpx.Response(200, json={"id": "1", "json": {"price": "$9"}})
            case "/api/scrape":
                data = {"results": {"markdown": {"data": ["# A", "more"]}}}
                return httpx.Response(200, json=data)
            case _:
                rows = [{"title": "S", "url": "https://s.test", "content": "c"}]
                return httpx.Response(200, json={"results": rows})

    call = _call(handler)
    got = await scrapegraph.PROVIDER.extract(call, "https://a.test", {"price": "the price"})
    page = await scrapegraph.PROVIDER.read(call, "https://a.test")
    hits = await scrapegraph.PROVIDER.search(call, "q", 2)
    assert got == {"price": "$9"} and page.text == "# A\n\nmore" and hits[0].url == "https://s.test"
    assert str(seen[0].url) == "https://v2-api.scrapegraphai.com/api/extract"
    assert seen[0].headers["SGAI-APIKEY"] == SECRET
    body = _json(seen[0])
    assert body["url"] == "https://a.test" and "the price" in body["prompt"]
    assert body["schema"]["properties"]["price"]["description"] == "the price"
    assert _json(seen[1])["formats"] == [{"type": "markdown"}]
    assert _json(seen[2]) == {"query": "q", "numResults": 2}


async def test_olostep_extract_is_unverified_but_parses_json_content() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert _json(request)["llm_extract"]["schema"]["type"] == "object"
        return httpx.Response(200, json={"result": {"json_content": '{"a": "1"}'}})

    got = await olostep.PROVIDER.extract(_call(handler), "https://a.test", {"a": "x"})
    assert got == {"a": "1"} and olostep.PROVIDER.VERIFIED["extract"] is False


async def test_a_provider_error_never_carries_the_key_or_body() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text=f"bad key {SECRET}")

    with pytest.raises(ProviderError) as info:
        await olostep.PROVIDER.search(_call(handler), "q", 1)
    assert str(info.value) == "HTTP 401" and SECRET not in str(info.value)


async def test_an_oversized_response_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    from studio1_router.providers import base

    monkeypatch.setattr(base, "MAX_RESPONSE_BYTES", 100)
    with pytest.raises(ProviderError, match="size limit"):
        await olostep.PROVIDER.search(
            _call(lambda r: httpx.Response(200, content=b"x" * 500)), "q", 1
        )


def _github_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/search/users":
        return httpx.Response(
            200, json={"items": [{"login": "acme", "html_url": "u", "score": 9.5}]}
        )
    if path == "/search/repositories":
        q = request.url.params["q"]
        item = {
            "full_name": "acme/core",
            "html_url": "r",
            "stargazers_count": 120,
            "forks_count": 7,
            "open_issues_count": 3,
            "pushed_at": "2026-11-01T00:00:00Z",
            "score": 4.2,
        }
        assert q in ("user:acme", "Acme")
        return httpx.Response(200, json={"items": [item]})
    if path == "/repos/acme/core":
        return httpx.Response(
            200,
            json={
                "full_name": "acme/core",
                "html_url": "r",
                "stargazers_count": 120,
                "forks_count": 7,
                "open_issues_count": 3,
                "pushed_at": "2026-11-01T00:00:00Z",
            },
        )
    if path == "/repos/acme/core/releases/latest":
        return httpx.Response(200, json={"published_at": "2026-10-20T00:00:00Z"})
    return httpx.Response(404)


async def test_lookup_company_with_github_returns_facts() -> None:
    for ref in ("acme", "acme/core"):
        result = await github.PROVIDER.lookup(_call(_github_handler), "Acme", ref)
        assert result["kind"] == "facts"
        head = result["headline_repository"]
        assert (head["stars"], head["forks"], head["open_issues"]) == (120, 7, 3)
        assert head["last_push"] == "2026-11-01T00:00:00Z"
        assert head["latest_release"] == "2026-10-20T00:00:00Z"
        assert result["top_repositories"][0]["name"] == "acme/core"


async def test_lookup_company_without_github_returns_scored_candidates_only() -> None:
    result = await github.PROVIDER.lookup(_call(_github_handler), "Acme", None)
    assert result["kind"] == "candidates" and "candidates" in result["note"]
    assert {c["type"] for c in result["candidates"]} == {"org", "repo"}
    assert all(c["score"] for c in result["candidates"])
    assert "headline_repository" not in result


async def test_lookup_company_rejects_a_malformed_github_value() -> None:
    with pytest.raises(ProviderError):
        await github.PROVIDER.lookup(_call(_github_handler), "Acme", "../../etc")


# routing ----------------------------------------------------------------------------------


class Fake(Provider):
    def __init__(self, name: str, *, fail: bool = False) -> None:
        self.name = name
        self.key_env = f"{name.upper()}_KEY"
        self.fail = fail
        self.calls = 0

    async def search(self, call: Call, query: str, limit: int) -> list[Any]:
        self.calls += 1
        if self.fail:
            raise ProviderError("HTTP 500")
        return [f"from {self.name}"]


def _router(
    tmp_path: Path,
    toml: str,
    providers: dict[str, Provider],
    env: dict[str, str],
    now: datetime | None = None,
) -> Router:
    path = tmp_path / "router.toml"
    path.write_text(f'state_dir = "{tmp_path}/state"\n{toml}', encoding="utf-8")
    moment = now or datetime(2026, 11, 27, tzinfo=UTC)
    return Router(path, env=env, providers=providers, clock=lambda: moment)


async def _search(router: Router) -> tuple[str, Any]:
    async def invoke(provider: Provider, call: Call) -> Any:
        return await provider.search(call, "q", 1)

    return await router.dispatch("web_search", "q", "lead-acme", invoke)


ORDER = '[tools.web_search]\nproviders = ["a", "b"]\n'


async def _with_fakes(
    tmp_path: Path, toml: str = "", env: dict[str, str] | None = None, now: datetime | None = None
) -> tuple[Router, Fake, Fake]:
    a, b = Fake("a"), Fake("b")
    # Fake names are not in the provider registry, so the order is set on the router directly.
    router = _router(tmp_path, toml, {"a": a, "b": b}, env or {"A_KEY": "k", "B_KEY": "k"}, now)
    return router, a, b


@pytest.fixture(autouse=True)
def fake_names_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    from studio1_router import config

    monkeypatch.setitem(config.ALL, "a", Fake("a"))
    monkeypatch.setitem(config.ALL, "b", Fake("b"))


async def test_fallback_goes_in_order_and_logs_each_call(tmp_path: Path) -> None:
    router, a, b = await _with_fakes(tmp_path, ORDER)
    a.fail = True
    name, result = await _search(router)
    assert (name, result) == ("b", ["from b"]) and (a.calls, b.calls) == (1, 1)
    rows = [json.loads(x) for x in (tmp_path / "state" / "usage.jsonl").read_text().splitlines()]
    assert [(r["provider"], r["ok"], r["error"]) for r in rows] == [
        ("a", False, "ProviderError"),
        ("b", True, None),
    ]
    assert rows[0]["context"] == "lead-acme" and rows[0]["subject"] == "q"


async def test_a_provider_without_a_key_is_skipped(tmp_path: Path) -> None:
    router, a, b = await _with_fakes(tmp_path, ORDER, env={"B_KEY": "k"})
    assert (await _search(router))[0] == "b" and a.calls == 0


async def test_a_disabled_provider_is_skipped(tmp_path: Path) -> None:
    toml = ORDER + "[providers.a]\nenabled = false\n"
    router, a, _ = await _with_fakes(tmp_path, toml)
    assert (await _search(router))[0] == "b" and a.calls == 0


async def test_a_capped_provider_is_skipped_and_only_this_month_counts(tmp_path: Path) -> None:
    toml = ORDER + "[providers.a]\nmonthly_cap = 2\n"
    router, a, _ = await _with_fakes(tmp_path, toml)
    log = router.usage
    old = datetime(2026, 10, 30, tzinfo=UTC)
    for _ in range(5):  # last month's calls do not count
        log.record(
            tool="web_search",
            provider="a",
            error=None,
            duration_ms=1,
            context=None,
            subject="q",
            now=old,
        )
    assert (await _search(router))[0] == "a"
    assert (await _search(router))[0] == "a"
    assert (await _search(router))[0] == "b" and a.calls == 2
    next_month = datetime(2026, 12, 1, tzinfo=UTC)
    router2, a2, _ = await _with_fakes(tmp_path, toml, now=next_month)
    assert (await _search(router2))[0] == "a" and a2.calls == 1


async def test_all_failing_gives_one_error_without_secrets(tmp_path: Path) -> None:
    router, a, b = await _with_fakes(
        tmp_path, ORDER + "[providers.b]\nenabled = false\n", env={"A_KEY": SECRET, "B_KEY": SECRET}
    )
    a.fail = True
    with pytest.raises(AllProvidersFailed) as info:
        await _search(router)
    message = str(info.value)
    assert "a: failed, HTTP 500" in message and "b: skipped, disabled" in message
    assert SECRET not in message


async def test_the_config_is_reloaded_when_its_mtime_changes(tmp_path: Path) -> None:
    router, a, b = await _with_fakes(tmp_path, ORDER)
    assert (await _search(router))[0] == "a"
    path = tmp_path / "router.toml"
    path.write_text(
        f'state_dir = "{tmp_path}/state"\n[tools.web_search]\nproviders = ["b", "a"]\n',
        encoding="utf-8",
    )
    stat = path.stat()
    os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 5_000_000_000))
    assert (await _search(router))[0] == "b"


def test_a_broken_reload_keeps_the_last_good_config(tmp_path: Path) -> None:
    path = tmp_path / "r.toml"
    path.write_text("[tools.web_search]\nproviders = ['olostep']\n", encoding="utf-8")
    file = ConfigFile(path)
    assert file.get().order["web_search"] == ("olostep",)
    path.write_text("not [valid toml", encoding="utf-8")
    os.utime(path, ns=(0, path.stat().st_mtime_ns + 5_000_000_000))
    assert file.get().order["web_search"] == ("olostep",)


def test_the_usage_report_shows_calls_against_caps(tmp_path: Path) -> None:
    router = _router(tmp_path, "[providers.olostep]\nmonthly_cap = 10\n", {}, {})
    router.usage.record(
        tool="read_page",
        provider="olostep",
        error=None,
        duration_ms=3,
        context=None,
        subject="a.test",
        now=datetime(2026, 11, 2, tzinfo=UTC),
    )
    report = router.usage_report()
    assert "2026-11" in report and "1 / 10" in report and "read_page 1" in report


def test_the_shipped_example_config_parses_and_disables_unverified_capabilities() -> None:
    import tomllib

    data = tomllib.loads((ROOT / "config" / "router.studio1.example.toml").read_text())
    config = parse(data)
    assert config.order["web_search"] == ("brightdata", "olostep")
    assert config.order["read_page"] == ("olostep", "brightdata")
    assert config.order["extract_fields"] == ("scrapegraph", "olostep")
    assert config.order["company_profile"] == ("brightdata",)
    tool = {capability: name for name, capability in TOOL_CAPABILITY.items()}
    for provider, module in (
        ("olostep", olostep),
        ("brightdata", brightdata),
        ("scrapegraph", scrapegraph),
        ("github", github),
    ):
        for capability, verified in module.PROVIDER.VERIFIED.items():
            off = tool[capability] in config.provider(provider).disabled_tools
            assert off == (not verified), (provider, capability)
    assert brightdata.PROVIDER.VERIFIED["company"] is False
    # With no config at all, an unverified capability is off too.
    assert "company_profile" in parse({}).provider("brightdata").disabled_tools


# safety -----------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/admin",
        "http://127.0.0.1:8080/",
        "http://10.1.2.3/",
        "http://192.168.0.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://internal.test/",
        "ftp://example.test/",
        "file:///etc/passwd",
        "http://user:pw@example.test/",
    ],
)
async def test_private_and_odd_urls_are_refused(url: str) -> None:
    with pytest.raises(safety.UnsafeUrl):
        await safety.ensure_public_url(url)


async def test_a_public_url_passes() -> None:
    assert (
        await safety.ensure_public_url("https://example.test/a?b=1") == "https://example.test/a?b=1"
    )


async def test_the_tools_refuse_private_urls_and_trim_pages(tmp_path: Path) -> None:
    from fastmcp import Client
    from fastmcp.exceptions import ToolError

    from studio1_router.server import build_server

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"result": {"markdown_content": "word " * 100}})

    path = tmp_path / "router.toml"
    path.write_text(
        f'state_dir = "{tmp_path}/state"\n[tools.read_page]\nmax_chars = 50\n'
        'providers = ["olostep"]\n',
        encoding="utf-8",
    )
    router = Router(path, env={"OLOSTEP_API_KEY": SECRET}, transport=httpx.MockTransport(handler))
    async with Client(build_server(router)) as client:
        names = {t.name for t in await client.list_tools()}
        assert names == {"web_search", "read_page", "extract_fields", "lookup_company"}
        with pytest.raises(ToolError, match="refused"):
            await client.call_tool("read_page", {"url": "http://169.254.169.254/"})
        ok = await client.call_tool("read_page", {"url": "https://a.test/p", "context": "acme"})
        data = ok.data
        assert data["truncated"] is True and len(data["content"]) == 50
        assert data["url"] == "https://a.test/p"
    text = (tmp_path / "state" / "usage.jsonl").read_text()
    row = json.loads(text.splitlines()[0])
    assert row["subject"] == "a.test" and row["context"] == "acme"
    assert "word" not in text and SECRET not in text


def test_the_usage_log_holds_no_page_content_or_keys(tmp_path: Path) -> None:
    log = UsageLog(tmp_path / "u.jsonl")
    log.record(
        tool="read_page",
        provider="olostep",
        error=None,
        duration_ms=5,
        context="x",
        subject="a.test",
        now=datetime(2026, 11, 27, tzinfo=UTC),
    )
    row = json.loads((tmp_path / "u.jsonl").read_text())
    assert set(row) == {
        "ts",
        "tool",
        "provider",
        "ok",
        "error",
        "duration_ms",
        "context",
        "subject",
    }


# access guard -----------------------------------------------------------------------------

TOKEN = "t" * 40
AUTH = f"Bearer {TOKEN}"
PORT = 8765


async def _guarded_get(headers: dict[str, str]) -> tuple[int, list[str]]:
    from starlette.applications import Starlette
    from starlette.responses import PlainTextResponse
    from starlette.routing import Route

    from studio1_router.guard import RouterGuard

    reached: list[str] = []

    async def inner(request: Any) -> PlainTextResponse:
        reached.append(request.url.path)
        return PlainTextResponse("inner")

    app = RouterGuard(
        Starlette(routes=[Route("/mcp", inner), Route("/other", inner)]),
        authorization=AUTH,
        port=PORT,
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url=f"http://127.0.0.1:{PORT}"
    ) as client:
        response = await client.get("/mcp", headers=headers)
        assert response.status_code in (200, 401, 403, 421)
        assert response.text in ("inner", "")
        return response.status_code, reached


async def test_no_authorization_header_is_401_with_no_detail() -> None:
    status, reached = await _guarded_get({})
    assert status == 401 and reached == []


@pytest.mark.parametrize("value", ["Bearer " + "x" * 40, TOKEN, "bearer " + TOKEN, AUTH + " "])
async def test_a_wrong_token_is_401(value: str) -> None:
    status, reached = await _guarded_get({"Authorization": value})
    assert status == 401 and reached == []


async def test_the_right_token_reaches_the_app() -> None:
    status, reached = await _guarded_get({"Authorization": AUTH})
    assert status == 200 and reached == ["/mcp"]


@pytest.mark.parametrize(
    "host",
    [
        "127.0.0.1:8765",
        "localhost:8765",
        "[::1]:8765",
        "127.0.0.1",
        "LOCALHOST:8765",
    ],
)
async def test_loopback_hosts_for_the_bound_port_pass(host: str) -> None:
    status, _ = await _guarded_get({"Authorization": AUTH, "Host": host})
    assert status == 200


@pytest.mark.parametrize(
    "host",
    [
        "evil.example",
        "evil.example:8765",
        "127.0.0.1:9999",
        "localhost.evil.example:8765",
        "0.0.0.0:8765",
    ],
)
async def test_a_wrong_host_is_rejected(host: str) -> None:
    status, reached = await _guarded_get({"Authorization": AUTH, "Host": host})
    assert status == 421 and reached == []


@pytest.mark.parametrize("origin", ["http://evil.example", "http://127.0.0.1:8765", "null"])
async def test_any_origin_is_rejected(origin: str) -> None:
    status, reached = await _guarded_get({"Authorization": AUTH, "Origin": origin})
    assert status == 403 and reached == []


async def test_the_wrapped_fastmcp_app_is_guarded_on_the_mcp_path(tmp_path: Path) -> None:
    from studio1_router.server import build_app, build_server

    path = tmp_path / "router.toml"
    path.write_text(f'state_dir = "{tmp_path}/state"\n', encoding="utf-8")
    app = build_app(build_server(Router(path, env={})), authorization=AUTH, port=PORT)
    headers = {"Authorization": AUTH, "Accept": "application/json, text/event-stream"}
    initialize = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {"name": "t", "version": "0"},
        },
    }
    async with (
        app.app.router.lifespan_context(app.app),
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url=f"http://127.0.0.1:{PORT}"
        ) as client,
    ):
        assert (await client.post("/mcp", json=initialize)).status_code == 401
        assert (await client.get("/anything")).status_code == 401
        passed = await client.post("/mcp", json=initialize, headers=headers)
        assert passed.status_code == 200 and "serverInfo" in passed.text


def test_the_router_refuses_to_start_without_a_strong_secret() -> None:
    from studio1_router.guard import AUTH_ENV, GuardConfigError, read_authorization

    with pytest.raises(GuardConfigError, match="secrets.token_urlsafe"):
        read_authorization({})
    for weak in ("Bearer short", "Bearer ", TOKEN, "Basic " + TOKEN):
        with pytest.raises(GuardConfigError) as caught:
            read_authorization({AUTH_ENV: weak})
        assert weak.strip() not in str(caught.value) or weak == "Bearer "
    assert read_authorization({AUTH_ENV: AUTH}) == AUTH


def test_the_router_refuses_a_non_loopback_host(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    from studio1_router.__main__ import main
    from studio1_router.guard import GuardConfigError, check_bind_host

    for host in ("127.0.0.1", "localhost", "::1", "[::1]"):
        check_bind_host(host)
    for host in ("0.0.0.0", "192.168.1.5", "example.com", ""):
        with pytest.raises(GuardConfigError, match="127.0.0.1"):
            check_bind_host(host)
    monkeypatch.setenv("STUDIO1_ROUTER_AUTHORIZATION", AUTH)
    assert main(["--host", "0.0.0.0", "--config", str(tmp_path / "none.toml")]) == 2
    assert "only binds to" in capsys.readouterr().err
    monkeypatch.delenv("STUDIO1_ROUTER_AUTHORIZATION")
    assert main(["--config", str(tmp_path / "none.toml")]) == 2
    err = capsys.readouterr().err
    assert "STUDIO1_ROUTER_AUTHORIZATION" in err and "secrets.token_urlsafe(32)" in err


async def test_the_real_server_needs_the_token(tmp_path: Path) -> None:
    import socket
    import subprocess
    import sys
    import time

    from fastmcp import Client
    from fastmcp.client.transports import StreamableHttpTransport

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    config = tmp_path / "router.toml"
    config.write_text(f'state_dir = "{tmp_path}/state"\n', encoding="utf-8")
    env = {**os.environ, "STUDIO1_ROUTER_AUTHORIZATION": AUTH}
    proc = subprocess.Popen(
        [sys.executable, "-m", "studio1_router", "--config", str(config), "--port", str(port)],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    url = f"http://127.0.0.1:{port}/mcp"
    try:
        for _ in range(100):
            try:
                socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
                break
            except OSError:
                assert proc.poll() is None, "the router exited"
                time.sleep(0.1)
        async with Client(StreamableHttpTransport(url, headers={"Authorization": AUTH})) as ok:
            names = {t.name for t in await ok.list_tools()}
        assert names == {"web_search", "read_page", "extract_fields", "lookup_company"}
        with pytest.raises(Exception):  # noqa: B017 - any refusal is the point
            async with Client(StreamableHttpTransport(url)) as bare:
                await bare.list_tools()
        wrong = {"Authorization": "Bearer " + "x" * 40}
        with pytest.raises(Exception):  # noqa: B017
            async with Client(StreamableHttpTransport(url, headers=wrong)) as bad:
                await bad.list_tools()
    finally:
        proc.terminate()
        proc.wait(timeout=10)
