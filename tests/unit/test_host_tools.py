"""Host tools: SSRF hardening, media tools without keys, provider calls with a mocked transport."""

from __future__ import annotations

import base64
import json
import re
import struct
import zlib
from typing import Any

import httpx
import pytest
from deepagents.backends.protocol import FileDownloadResponse, FileUploadResponse

from design_agent.config import Settings
from design_agent.tools.fetch import FetchRefused, build_fetch_tool, check_url, public_address
from design_agent.tools.images import (
    GATEWAY_GOOGLE,
    GOOGLE_API,
    GOOGLE_IMAGE_MODEL,
    OPENAI_IMAGE_MODEL,
    ImageError,
    image_routes,
)
from design_agent.tools.media import _png_alpha_report, build_media_tools


class MemoryBackend:
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}

    async def aupload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        self.files.update(files)
        return [FileUploadResponse(path=p) for p, _ in files]

    async def adownload_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        return [
            FileDownloadResponse(
                path=p,
                content=self.files.get(p),
                error=None if p in self.files else "file_not_found",
            )
            for p in paths
        ]


def resolver_for(mapping: dict[str, list[str]]):  # type: ignore[no-untyped-def]
    async def resolve(host: str, port: int) -> list[str]:
        return mapping[host]

    return resolve


@pytest.mark.parametrize(
    "address",
    [
        "10.0.0.5",
        "127.0.0.1",
        "169.254.169.254",
        "::1",
        "fe80::1",
        "100.64.1.1",
        "::ffff:10.0.0.1",
        "0.0.0.0",
    ],
)
def test_private_and_metadata_addresses_are_not_public(address: str) -> None:
    assert not public_address(address)


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.com/a.png",
        "https://user:pw@example.com/a.png",
        "https://example.com:8443/a.png",
        "http://localhost/a.png",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/a.png",
        "https://rebind.example/a.png",
    ],
)
async def test_unsafe_urls_are_refused(url: str) -> None:
    with pytest.raises(FetchRefused):
        await check_url(url, resolver_for({"rebind.example": ["93.184.216.34", "192.168.1.10"]}))


async def test_fetch_rechecks_redirects_and_writes_the_file() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "cdn.example":
            return httpx.Response(302, headers={"location": "https://internal.example/secret.png"})
        return httpx.Response(200, content=b"x", headers={"content-type": "image/png"})

    backend = MemoryBackend()
    tool = build_fetch_tool(
        lambda _rt: backend,  # type: ignore[arg-type,return-value]
        resolver=resolver_for({"cdn.example": ["93.184.216.34"], "internal.example": ["10.1.2.3"]}),
        transport=httpx.MockTransport(handler),
    )
    result = await tool.coroutine(
        url="https://cdn.example/a.png", sandbox_path="/workspace/attachments/a.png", runtime=None
    )  # type: ignore[misc]
    assert "private or reserved" in result and not backend.files


async def test_fetch_refuses_web_pages_and_svg() -> None:
    backend = MemoryBackend()
    for kind in ("text/html", "image/svg+xml"):
        tool = build_fetch_tool(
            lambda _rt: backend,  # type: ignore[arg-type,return-value]
            resolver=resolver_for({"cdn.example": ["93.184.216.34"]}),
            transport=httpx.MockTransport(
                lambda _r, kind=kind: httpx.Response(
                    200, content=b"<x>", headers={"content-type": kind}
                )
            ),
        )
        result = await tool.coroutine(
            url="https://cdn.example/a", sandbox_path="/workspace/attachments/a", runtime=None
        )  # type: ignore[misc]
        assert "not fetched" in result
    assert not backend.files


async def test_media_tools_explain_missing_keys_without_calling_out() -> None:
    backend = MemoryBackend()
    tools = {t.name: t for t in build_media_tools(Settings(_env_file=None), lambda _rt: backend)}  # type: ignore[call-arg,arg-type,return-value]
    image = await tools["generate_image"].coroutine(
        prompt="a lamp", sandbox_path="/workspace/projects/p/lamp.png", runtime=None
    )  # type: ignore[misc]
    assert "no OPENAI_API_KEY" in image
    voice = await tools["generate_voiceover"].coroutine(
        text="Hi",
        voice_id="abcdefghij12",
        sandbox_path="/workspace/projects/p/vo.mp3",
        runtime=None,
    )  # type: ignore[misc]
    assert "no ELEVENLABS_API_KEY" in voice
    assert "under /workspace" in await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/etc/x.png", runtime=None
    )  # type: ignore[misc]


def _png(width: int, height: int, alpha: int) -> bytes:
    raw = b"".join(b"\x00" + bytes([255, 0, 0, alpha]) * width for _ in range(height))

    def chunk(kind: bytes, body: bytes) -> bytes:
        return (
            struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
        )

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def test_alpha_report_measures_pixels_not_the_request_flag() -> None:
    assert _png_alpha_report(_png(4, 4, 0)) == (True, 1.0)
    assert _png_alpha_report(_png(4, 4, 255)) == (True, 0.0)
    assert _png_alpha_report(b"not a png") == (None, None)


async def test_generate_image_writes_b64_output_and_reports_alpha(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {"data": [{"b64_json": base64.b64encode(_png(2, 2, 0)).decode()}]}
    seen: dict[str, Any] = {}

    async def fake_post(self: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
        seen.update(url=url, body=kwargs["json"])
        return httpx.Response(
            200, content=json.dumps(payload).encode(), request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    backend = MemoryBackend()
    tools = {
        t.name: t
        for t in build_media_tools(
            Settings(_env_file=None, openai_api_key="sk-test"), lambda _rt: backend
        )
    }  # type: ignore[call-arg,arg-type,return-value]
    result = await tools["generate_image"].coroutine(
        prompt="a lamp",
        sandbox_path="/workspace/projects/p/lamp.png",
        runtime=None,
        background="transparent",
        output_format="png",
    )  # type: ignore[misc]
    assert "wrote /workspace/projects/p/lamp.png" in result and "alpha verified" in result
    assert seen["body"]["model"] == "gpt-image-2.5-flare"
    assert seen["url"].startswith("https://api.openai.com/")


def _settings(**values: Any) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def image_route(settings: Settings, model: str | None = None) -> Any:
    """The provider an unnamed (or named) model goes to; None when there is none."""
    try:
        return image_routes(settings).route(model)[0]
    except ImageError:
        return None


def test_images_go_to_openai_with_its_key_else_through_the_gateway() -> None:
    direct = image_route(_settings(openai_api_key="sk-test", langsmith_gateway_api_key="lsv2-g"))
    assert direct is not None and direct.url.startswith("https://api.openai.com/")
    assert direct.key == "sk-test"

    gateway = image_route(_settings(langsmith_gateway_api_key="lsv2-g", langsmith_api_key="lsv2-l"))
    assert gateway is not None
    assert gateway.url == "https://gateway.smith.langchain.com/openai/v1/images/generations"
    assert gateway.key == "lsv2-g"

    lead = image_route(
        _settings(model="langsmith:anthropic/claude-opus-5-5", langsmith_api_key="lsv2-l")
    )
    assert lead is not None and lead.key == "lsv2-l" and lead.via == "the LangSmith Gateway"

    assert image_route(_settings(langsmith_api_key="lsv2-l")) is None


async def test_a_gateway_without_an_openai_key_says_where_to_add_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_post(self: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
        return httpx.Response(424, content=b"{}", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    backend = MemoryBackend()
    tools = {
        t.name: t
        for t in build_media_tools(
            _settings(langsmith_gateway_api_key="lsv2-g"), lambda _rt: backend
        )
    }  # type: ignore[arg-type,return-value]
    result = await tools["generate_image"].coroutine(
        prompt="a lamp", sandbox_path="/workspace/projects/p/lamp.png", runtime=None
    )  # type: ignore[misc]
    assert "LangSmith Gateway HTTP 424" in result and "no OpenAI key" in result
    assert not backend.files


def test_images_pick_a_provider_and_a_key_never_crosses_to_another() -> None:
    google = image_route(_settings(google_api_key="aiza-direct"))
    assert google is not None and google.provider == "google"
    assert google.models_url == f"{GOOGLE_API}/models" and google.key == "aiza-direct"

    # A Google lead on the gateway goes through the gateway's Google path with the LangSmith key;
    # the LangSmith key never goes to Google itself.
    for settings in (
        _settings(model="langsmith:google_genai/gemini-3.8-flash", langsmith_api_key="lsv2-l"),
        _settings(model="google_genai:gemini-3.8-flash", langsmith_gateway_api_key="lsv2-l"),
    ):
        via_gateway = image_route(settings)
        assert via_gateway is not None and via_gateway.provider == "google"
        assert via_gateway.models_url == f"{GATEWAY_GOOGLE}/models"
        assert via_gateway.key == "lsv2-l" and "googleapis.com" not in via_gateway.models_url

    anthropic_lead = image_route(
        _settings(model="langsmith:anthropic/claude-opus-5-5", langsmith_api_key="lsv2-l")
    )
    assert anthropic_lead is not None and anthropic_lead.provider == "openai"

    # A provider key you set wins; DESIGN_AGENT_IMAGE_MODEL=gemini-… chooses Google outright.
    both = _settings(openai_api_key="sk-test", google_api_key="aiza-direct")
    assert image_route(both).provider == "openai"
    chosen = _settings(
        openai_api_key="sk-test", google_api_key="aiza-direct", image_model="gemini-3-pro-image"
    )
    assert image_route(chosen).provider == "google"


@pytest.mark.parametrize(
    ("model", "provider", "sent"),
    [
        ("gemini-3-pro-image", "google", "gemini-3-pro-image"),
        ("google:models/gemini-3.1-flash-image", "google", "gemini-3.1-flash-image"),
        ("GOOGLE:imagen-5", "google", "imagen-5"),
        ("gpt-image-2.5-flare", "openai", "gpt-image-2.5-flare"),
        ("openai:my-org/flux-dev:v2", "openai", "my-org/flux-dev:v2"),
        (None, "openai", OPENAI_IMAGE_MODEL),
    ],
)
def test_each_call_goes_to_the_provider_its_model_names(
    model: str | None, provider: str, sent: str
) -> None:
    routes = image_routes(_settings(openai_api_key="sk-test", google_api_key="aiza-direct"))
    chosen, model_id = routes.route(model)
    assert (chosen.provider, model_id) == (provider, sent)


@pytest.mark.parametrize(
    ("settings", "model", "says"),
    [
        ({"openai_api_key": "sk-test"}, "gemini-3-pro-image", "set GOOGLE_API_KEY"),
        ({"google_api_key": "aiza"}, "gpt-image-2.5-flare", "set OPENAI_API_KEY"),
        ({"openai_api_key": "sk-test"}, "flux-dev", "openai:<model> or google:<model>"),
        ({"openai_api_key": "sk-test", "image_model": "flux-dev"}, None, "no provider is known"),
    ],
)
def test_a_model_nothing_serves_is_an_error_never_another_model(
    settings: dict[str, Any], model: str | None, says: str
) -> None:
    with pytest.raises(ImageError, match=re.escape(says)):
        image_routes(_settings(**settings)).route(model)


@pytest.mark.parametrize(
    "model", ["gemini-x:generateContent?alt=sse#", "gemini-x/../../files", "google:a%2Fb"]
)
async def test_only_a_url_safe_model_id_reaches_googles_url(
    monkeypatch: pytest.MonkeyPatch, model: str
) -> None:
    tools, calls, backend = _google_tools(monkeypatch, _gemini(_png(2, 2, 255)))
    result = await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/workspace/projects/p/x.png", runtime=None, model=model
    )  # type: ignore[misc]
    assert "is not a Google model id" in result
    assert not calls and not backend.files, "nothing was sent and nothing fell back"


async def test_an_openai_deployment_makes_a_gemini_image_when_google_is_reachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tools, calls, backend = _google_tools(
        monkeypatch, _gemini(_png(2, 2, 255)), openai_api_key="sk-openai"
    )
    result = await tools["generate_image"].coroutine(
        prompt="a lamp",
        sandbox_path="/workspace/projects/p/lamp.png",
        runtime=None,
        model="gemini-3-pro-image",
    )  # type: ignore[misc]
    assert result == "wrote /workspace/projects/p/lamp.png"
    assert calls[0]["url"] == f"{GOOGLE_API}/models/gemini-3-pro-image:generateContent"
    assert calls[0]["headers"] == {"x-goog-api-key": "aiza-test"}, "the OpenAI key stays home"


async def test_a_custom_endpoint_gets_its_own_key_and_every_plain_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("IMAGES_KEY", "custom-secret")
    payload = {"data": [{"b64_json": base64.b64encode(_png(2, 2, 255)).decode()}]}
    seen: list[dict[str, Any]] = []

    async def fake_post(self: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
        seen.append({"url": url, **kwargs})
        return httpx.Response(
            200, content=json.dumps(payload).encode(), request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    backend = MemoryBackend()
    settings = _settings(
        openai_api_key="sk-openai",
        image_base_url="https://images.example/v1/",
        image_api_key_env="IMAGES_KEY",
        image_model="black-forest-labs/flux-dev",
    )
    tools = {t.name: t for t in build_media_tools(settings, lambda _rt: backend)}  # type: ignore[arg-type,return-value]
    result = await tools["generate_image"].coroutine(
        prompt="a lamp", sandbox_path="/workspace/projects/p/lamp.png", runtime=None
    )  # type: ignore[misc]
    assert result == "wrote /workspace/projects/p/lamp.png"
    assert seen[0]["url"] == "https://images.example/v1/images/generations"
    assert seen[0]["headers"] == {"Authorization": "Bearer custom-secret"}
    assert seen[0]["json"]["model"] == "black-forest-labs/flux-dev"

    keyless = _settings(image_base_url="https://images.example/v1", image_api_key_env="UNSET_KEY")
    tools = {t.name: t for t in build_media_tools(keyless, lambda _rt: backend)}  # type: ignore[arg-type,return-value]
    result = await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/workspace/projects/p/x.png", runtime=None
    )  # type: ignore[misc]
    assert "DESIGN_AGENT_IMAGE_API_KEY_ENV" in result and len(seen) == 1


async def test_google_keeps_the_images_it_made_and_says_what_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answers = iter([200, 500, 200, 500])

    async def fake_post(self: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
        status = next(answers)
        body = _gemini(_png(2, 2, 255)) if status == 200 else {"error": {"message": "busy"}}
        return httpx.Response(
            status, content=json.dumps(body).encode(), request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    backend = MemoryBackend()
    tools = {
        t.name: t
        for t in build_media_tools(_settings(google_api_key="aiza-test"), lambda _rt: backend)
    }  # type: ignore[arg-type,return-value]
    result = await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/workspace/projects/p/x.png", runtime=None, n=6
    )  # type: ignore[misc]
    assert sorted(backend.files) == [
        "/workspace/projects/p/x_0.png",
        "/workspace/projects/p/x_1.png",
    ]
    assert "made 4 of the 6 asked" in result
    assert "2 of 4 failed: Google HTTP 500: busy" in result


def _gemini(*images: bytes, mime: str = "image/png") -> dict[str, Any]:
    parts = [
        {"inlineData": {"mimeType": mime, "data": base64.b64encode(image).decode()}}
        for image in images
    ]
    return {"candidates": [{"content": {"parts": parts}, "finishReason": "STOP"}]}


def _google_tools(
    monkeypatch: pytest.MonkeyPatch, answer: Any, status: int = 200, **settings: Any
) -> tuple[dict[str, Any], list[dict[str, Any]], Any]:
    calls: list[dict[str, Any]] = []

    async def fake_post(self: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
        calls.append({"url": url, **kwargs})
        return httpx.Response(
            status, content=json.dumps(answer).encode(), request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    backend = MemoryBackend()
    tools = {
        t.name: t
        for t in build_media_tools(
            _settings(**({"google_api_key": "aiza-test"} | settings)), lambda _rt: backend
        )
    }  # type: ignore[arg-type,return-value]
    return tools, calls, backend


async def test_google_images_come_from_generate_content(monkeypatch: pytest.MonkeyPatch) -> None:
    tools, calls, backend = _google_tools(monkeypatch, _gemini(_png(2, 2, 255)))
    result = await tools["generate_image"].coroutine(
        prompt="a lamp",
        sandbox_path="/workspace/projects/p/lamp.jpg",
        runtime=None,
        size="1792x1024",
        n=2,
        background="transparent",
    )  # type: ignore[misc]
    assert len(calls) == 2
    (call, _) = calls
    assert call["url"] == f"{GOOGLE_API}/models/{GOOGLE_IMAGE_MODEL}:generateContent"
    assert call["headers"] == {"x-goog-api-key": "aiza-test"}
    config = call["json"]["generationConfig"]
    assert config["responseModalities"] == ["IMAGE"]
    assert config["imageConfig"]["aspectRatio"] == "16:9"
    # Google answered PNG, so the files say so.
    assert sorted(backend.files) == [
        "/workspace/projects/p/lamp_0.png",
        "/workspace/projects/p/lamp_1.png",
    ]
    assert "no transparent backgrounds" in result


async def test_google_refusals_and_errors_say_why(monkeypatch: pytest.MonkeyPatch) -> None:
    blocked = {"promptFeedback": {"blockReason": "SAFETY"}, "candidates": []}
    tools, _, backend = _google_tools(monkeypatch, blocked)
    result = await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/workspace/projects/p/x.png", runtime=None
    )  # type: ignore[misc]
    assert result == "image generation refused by Google: prompt blocked (SAFETY)."
    assert not backend.files

    invalid = {
        "error": {
            "message": "Request contains an invalid argument.",
            "details": [
                {
                    "@type": "type.googleapis.com/google.rpc.BadRequest",
                    "fieldViolations": [
                        {"field": "imageConfig.aspectRatio", "description": "unsupported"}
                    ],
                }
            ],
        }
    }
    tools, _, _ = _google_tools(monkeypatch, invalid, status=400)
    result = await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/workspace/projects/p/x.png", runtime=None
    )  # type: ignore[misc]
    assert "Google HTTP 400: imageConfig.aspectRatio: unsupported" in result

    tools, calls, _ = _google_tools(
        monkeypatch,
        {},
        status=424,
        google_api_key=None,
        model="langsmith:google_genai/gemini-3.8-flash",
        langsmith_api_key="lsv2-l",
    )
    result = await tools["generate_image"].coroutine(
        prompt="x", sandbox_path="/workspace/projects/p/x.png", runtime=None
    )  # type: ignore[misc]
    assert calls[0]["url"].startswith(GATEWAY_GOOGLE)
    assert "LangSmith Gateway HTTP 424" in result and "no Google key" in result
