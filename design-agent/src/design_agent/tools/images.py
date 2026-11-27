"""Image providers for `generate_image`, chosen per call by the model asked for.

A model is `openai:<id>`, `google:<id>`, or a plain id routed by its family (`gpt-image…`,
`dall-e…` to OpenAI; `gemini-…`, `imagen-…` to Google). Unset, it is `DESIGN_AGENT_IMAGE_MODEL`,
else the default of whichever provider is reachable (Google's when the lead model is Google).

- `OpenAIImages` serves any OpenAI-compatible images endpoint: `DESIGN_AGENT_IMAGE_BASE_URL` with
  the key named by `DESIGN_AGENT_IMAGE_API_KEY_ENV` when set (and then any plain id goes there),
  else OpenAI with `OPENAI_API_KEY`, else the LangSmith Gateway's OpenAI path.
- `GeminiImages` serves Gemini image models through `generateContent`: Google with
  `GOOGLE_API_KEY`, else the gateway's Google path.

The gateway is used only by a deployment that uses it (a `langsmith:` model or
`LANGSMITH_GATEWAY_API_KEY`). A key only ever goes to its own provider or the gateway, and a model
id that reaches a URL path must be URL-safe. A model nothing can serve is an error that says what
to set, never a quiet switch to another model.
"""

from __future__ import annotations

import asyncio
import base64
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

import httpx
from pydantic import JsonValue

from design_agent.config import Settings
from design_agent.models.factory import (
    GATEWAY_NATIVE_ROUTES,
    GATEWAY_ORIGIN,
    gateway_key,
    named_key,
)
from design_agent.tools.files import WorkspaceError

Provider = Literal["openai", "google"]
#: Image bytes and their media type ("" when the provider does not say).
Images = list[tuple[bytes, str]]

OPENAI_BASE_URL = "https://api.openai.com/v1"
GOOGLE_API = "https://generativelanguage.googleapis.com/v1beta"
#: The LangSmith Gateway's direct Google path, which passes Gemini API requests through.
GATEWAY_GOOGLE = f"{GATEWAY_ORIGIN}/gemini/v1beta"
OPENAI_IMAGE_MODEL = "gpt-image-2.5-flare"
#: Google makes images with Gemini image models through `generateContent` (Imagen is shut down).
GOOGLE_IMAGE_MODEL = "gemini-nano-banana-2.1"
#: A model id safe to put in a request path: never a value with `/`, `?`, `#`, `:` or `%`.
URL_SAFE_MODEL_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._\-]*")
#: Provider prefixes a model may carry, and the provider each names.
PREFIXES: dict[str, Provider] = {
    "openai": "openai",
    "google": "google",
    "google_genai": "google",
    "gemini": "google",
}
#: Plain ids routed by family.
FAMILIES: dict[str, Provider] = {
    "gpt-image": "openai",
    "dall-e": "openai",
    "chatgpt-image": "openai",
    "gemini-": "google",
    "imagen-": "google",
}
#: Google makes one image per request; `n` becomes up to this many requests made together.
GOOGLE_MAX_N = 4
CAP_MB = 40  # a high-quality 4K PNG can be several MB; bound the downloaded response
GOOGLE_ASPECT_RATIOS = {
    "1:1": 1.0,
    "2:3": 2 / 3,
    "3:2": 3 / 2,
    "3:4": 3 / 4,
    "4:3": 4 / 3,
    "4:5": 4 / 5,
    "5:4": 5 / 4,
    "9:16": 9 / 16,
    "16:9": 16 / 9,
    "21:9": 21 / 9,
}


class ImageError(Exception):
    """Why no image was made, as the tool says it: safe to hand back, never a key."""


@dataclass(frozen=True)
class ImageAsk:
    """One `generate_image` call, as every provider reads it."""

    prompt: str
    size: str = "1024x1024"
    quality: str = "high"
    n: int = 1
    background: str | None = None
    output_format: str | None = None
    params: Mapping[str, JsonValue] = field(default_factory=dict)


@dataclass(frozen=True)
class Made:
    """What a provider made, and what it could not (some of `n` failed)."""

    images: Images
    notes: tuple[str, ...] = ()


class ImageProvider(Protocol):
    """One provider family: `generate` makes images for a model id it serves, or raises
    `ImageError`. `via` names where requests go, for messages."""

    @property
    def provider(self) -> Provider: ...

    @property
    def via(self) -> str: ...

    async def generate(self, model: str, ask: ImageAsk) -> Made: ...


@dataclass(frozen=True)
class OpenAIImages:
    """Any OpenAI-compatible `images/generations` endpoint. `custom` is the operator's own."""

    url: str
    key: str
    via: str
    custom: bool = False
    provider: Provider = "openai"

    async def generate(self, model: str, ask: ImageAsk) -> Made:
        body: dict[str, JsonValue] = {
            "model": model,
            "prompt": ask.prompt,
            "size": ask.size,
            "quality": ask.quality,
            "n": ask.n,
        }
        if ask.background is not None:
            body["background"] = ask.background
        if ask.output_format is not None:
            body["output_format"] = ask.output_format
        body.update(ask.params)
        async with httpx.AsyncClient(timeout=240, follow_redirects=False) as client:
            response = await client.post(
                self.url, headers={"Authorization": f"Bearer {self.key}"}, json=body
            )
        if response.status_code != 200:
            raise ImageError(
                f"image generation failed: {self.via} HTTP {response.status_code}"
                f"{reason(response)}{_missing_upstream_key(response, 'OpenAI', 'OPENAI_API_KEY')}"
            )
        images: Images = []
        for item in response.json().get("data") or []:
            if not isinstance(item, dict):
                continue
            if item.get("b64_json"):
                encoded = str(item["b64_json"])
                if len(encoded) > (CAP_MB * 1024 * 1024 + 2) // 3 * 4:
                    raise ImageError(f"generated image too large: limit {CAP_MB} MB.")
                images.append((base64.b64decode(encoded, validate=True), ""))
            elif item.get("url"):
                images.append((await _download(str(item["url"]), provider=self.via), ""))
        return Made(images)


@dataclass(frozen=True)
class GeminiImages:
    """Gemini image models: `models_url` is the models collection a model id is appended to."""

    models_url: str
    key: str
    via: str
    provider: Provider = "google"

    async def generate(self, model: str, ask: ImageAsk) -> Made:
        if not URL_SAFE_MODEL_ID.fullmatch(model):
            raise ImageError(f"image generation failed: {model!r} is not a Google model id.")
        image_config: dict[str, JsonValue] = {"aspectRatio": aspect_ratio(ask.size)}
        if ask.quality == "high":
            image_config["imageSize"] = "2K"
        for name, value in ask.params.items():
            key = {"aspect_ratio": "aspectRatio", "image_size": "imageSize"}.get(name, name)
            if key in ("aspectRatio", "imageSize"):
                image_config[key] = value
        request: dict[str, JsonValue] = {
            "contents": [{"role": "user", "parts": [{"text": ask.prompt}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": image_config},
        }
        url = f"{self.models_url}/{model}:generateContent"
        count = max(1, min(ask.n, GOOGLE_MAX_N))
        async with httpx.AsyncClient(timeout=240, follow_redirects=False) as client:
            responses = await asyncio.gather(
                *(
                    client.post(url, headers={"x-goog-api-key": self.key}, json=request)
                    for _ in range(count)
                ),
                return_exceptions=True,
            )
        images: Images = []
        failures: list[str] = []
        refusals: list[str] = []
        for response in responses:
            if isinstance(response, BaseException):
                failures.append("the request failed")
                continue
            if response.status_code != 200:
                failures.append(
                    f"{self.via} HTTP {response.status_code}{reason(response)}"
                    f"{_missing_upstream_key(response, 'Google', 'GOOGLE_API_KEY')}"
                )
                continue
            made, refusal = gemini_images(response.json())
            images += made
            if refusal:
                refusals.append(refusal)
        if not images:
            if failures:
                raise ImageError(f"image generation failed: {failures[0]}")
            if refusals:
                raise ImageError(f"image generation refused by Google: {'; '.join(refusals)}.")
            return Made([])
        notes: list[str] = []
        if ask.n > count:
            notes.append(f"Google makes one image per request: made {count} of the {ask.n} asked.")
        if len(images) < count and (failures or refusals):
            notes.append(f"{count - len(images)} of {count} failed: {(failures + refusals)[0]}.")
        return Made(images, tuple(notes))


@dataclass(frozen=True)
class ImageRoutes:
    """Which provider makes each model, for one deployment's settings."""

    openai: OpenAIImages | None
    google: GeminiImages | None
    #: `DESIGN_AGENT_IMAGE_MODEL`; None picks the reachable provider's default.
    default_model: str | None = None
    #: The lead model is Google's: with both reachable, an unnamed model is Google's.
    prefers_google: bool = False
    #: Why the custom endpoint cannot be used, when it is configured but incomplete.
    problem: str | None = None

    def route(self, model: str | None) -> tuple[ImageProvider, str]:
        """The provider for `model` and the id it is sent, or an `ImageError` saying what to set."""
        raw = (model or self.default_model or "").strip()
        if self.problem is not None:
            raise ImageError(f"image generation unavailable: {self.problem}.")
        if not raw:
            if self.google is not None and (self.prefers_google or self.openai is None):
                return self.google, GOOGLE_IMAGE_MODEL
            if self.openai is not None:
                return self.openai, OPENAI_IMAGE_MODEL
            raise ImageError(
                "image generation unavailable: no OPENAI_API_KEY or GOOGLE_API_KEY, and this "
                "deployment does not use the LangSmith Gateway."
            )
        prefix, sep, rest = raw.partition(":")
        provider = PREFIXES.get(prefix.strip().lower()) if sep else None
        model_id = rest.strip() if provider else raw
        provider = provider or next(
            (named for family, named in FAMILIES.items() if model_id.lower().startswith(family)),
            None,
        )
        if provider is None and self.openai is not None and self.openai.custom:
            provider = "openai"
        if provider is None:
            raise ImageError(
                f"image generation unavailable: no provider is known for {raw!r}. Name it as "
                "openai:<model> or google:<model>, or point DESIGN_AGENT_IMAGE_BASE_URL at the "
                "endpoint that serves it."
            )
        if provider == "google":
            model_id = model_id.removeprefix("models/")
            if self.google is None:
                raise ImageError(
                    f"image generation unavailable: {model_id} is a Google model, and Google is "
                    "not reachable: set GOOGLE_API_KEY, or use the LangSmith Gateway."
                )
            return self.google, model_id
        if self.openai is None:
            raise ImageError(
                f"image generation unavailable: {model_id} needs an OpenAI-compatible endpoint: "
                "set OPENAI_API_KEY or DESIGN_AGENT_IMAGE_BASE_URL, or use the LangSmith Gateway."
            )
        return self.openai, model_id


def image_routes(settings: Settings) -> ImageRoutes:
    """Every image provider these settings reach (module doc)."""
    openai = _secret(settings.openai_api_key)
    google = _secret(settings.google_api_key)
    uses_gateway = bool(_secret(settings.langsmith_gateway_api_key))
    lead_is_google = False
    try:
        lead = settings.lead_model()
        uses_gateway = uses_gateway or lead.via_gateway
        lead_is_google = (lead.upstream if lead.via_gateway else lead).provider in (
            "google",
            "google_genai",
        )
    except ValueError:
        pass
    gateway = gateway_key(settings) if uses_gateway else ""
    problem = None
    openai_route: OpenAIImages | None = None
    if settings.image_base_url:
        key = named_key(settings.image_api_key_env, None)
        if key is None:
            problem = (
                "DESIGN_AGENT_IMAGE_BASE_URL needs DESIGN_AGENT_IMAGE_API_KEY_ENV naming the "
                "variable that holds that endpoint's key"
            )
        else:
            url = f"{settings.image_base_url.rstrip('/')}/images/generations"
            openai_route = OpenAIImages(url, key, "the image endpoint", custom=True)
    elif openai:
        openai_route = OpenAIImages(f"{OPENAI_BASE_URL}/images/generations", openai, "OpenAI")
    elif gateway:
        url = f"{GATEWAY_ORIGIN}{GATEWAY_NATIVE_ROUTES['openai']}/images/generations"
        openai_route = OpenAIImages(url, gateway, "the LangSmith Gateway")
    google_route: GeminiImages | None = None
    if google:
        google_route = GeminiImages(f"{GOOGLE_API}/models", google, "Google")
    elif gateway:
        google_route = GeminiImages(f"{GATEWAY_GOOGLE}/models", gateway, "the LangSmith Gateway")
    return ImageRoutes(
        openai=openai_route,
        google=google_route,
        default_model=settings.image_model,
        prefers_google=lead_is_google and not openai,
        problem=problem,
    )


def _secret(secret: Any) -> str | None:
    return (secret.get_secret_value() or None) if secret is not None else None


def _missing_upstream_key(response: httpx.Response, provider: str, setting: str) -> str:
    """The gateway answers 424 when its workspace has no key for the provider."""
    if response.status_code != 424:
        return ""
    return f" (the gateway's workspace has no {provider} key; add one there or set {setting})"


async def _download(url: str, *, provider: str) -> bytes:
    """A bounded host download that never follows a redirect."""
    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=False) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise WorkspaceError(f"{provider} returned HTTP {response.status_code}.")
                data = bytearray()
                async for chunk in response.aiter_bytes():
                    data.extend(chunk)
                    if len(data) > CAP_MB * 1024 * 1024:
                        raise WorkspaceError(f"{provider} image too large: limit {CAP_MB} MB.")
                return bytes(data)
    except httpx.HTTPError:
        raise WorkspaceError(f"{provider} download failed.") from None


def reason(response: httpx.Response) -> str:
    """The provider's own reason for a refusal, which is what lets the model correct the call.

    OpenAI answers `{"error": {"message": ...}}`; Google answers `{"error": {"message": ..., "status": ...}}`.
    The message names the bad field or value and carries no credential, so it is safe to hand back.
    Anything else reads as a bare status.
    """
    try:
        payload = response.json()
        error = payload.get("error")
        message = None
        if isinstance(error, dict):
            detail_msgs: list[str] = []
            if details := error.get("details"):
                if isinstance(details, list):
                    for item in details:
                        if not isinstance(item, dict):
                            continue
                        for fv in item.get("fieldViolations", []):
                            if isinstance(fv, dict) and fv.get("description"):
                                field_prefix = f"{fv['field']}: " if fv.get("field") else ""
                                detail_msgs.append(f"{field_prefix}{fv['description']}")
                        for qv in item.get("violations", []):
                            if isinstance(qv, dict) and qv.get("description"):
                                detail_msgs.append(str(qv["description"]))
                        if item.get("reason") and not detail_msgs:
                            detail_msgs.append(str(item["reason"]))
                        if not detail_msgs and (item.get("description") or item.get("message")):
                            detail_msgs.append(str(item.get("description") or item.get("message")))

            base_msg = error.get("message") or error.get("status")
            if detail_msgs:
                if (
                    base_msg
                    and base_msg not in detail_msgs
                    and base_msg != "Request contains an invalid argument."
                ):
                    message = f"{base_msg} ({'; '.join(detail_msgs)})"
                else:
                    message = "; ".join(detail_msgs)
            else:
                message = base_msg
        elif isinstance(error, str):
            message = error
        elif isinstance(payload.get("message"), str):
            message = payload.get("message")
    except (ValueError, AttributeError):
        return "."
    return f": {str(message).strip()[:300]}" if message else "."


def aspect_ratio(size: str) -> str:
    """The supported Gemini aspect ratio closest to a size (`1792x1024`) or ratio (`16:9`)."""
    text = size.strip().lower().replace("/", ":")
    if text in GOOGLE_ASPECT_RATIOS:
        return text
    named = {
        "square": "1:1",
        "landscape": "16:9",
        "wide": "16:9",
        "portrait": "9:16",
        "tall": "9:16",
    }
    if text in named:
        return named[text]
    for separator in ("x", ":"):
        width, _, height = text.partition(separator)
        try:
            ratio = float(width) / float(height)
        except (ValueError, ZeroDivisionError):
            continue
        if ratio > 0:
            return min(
                GOOGLE_ASPECT_RATIOS, key=lambda name: abs(GOOGLE_ASPECT_RATIOS[name] - ratio)
            )
    return "1:1"


def gemini_images(payload: Any) -> tuple[Images, str]:
    """The images in a Gemini `generateContent` answer, and Google's reason when there are none."""
    images: Images = []
    reasons: list[str] = []
    if not isinstance(payload, dict):
        return images, ""
    feedback = payload.get("promptFeedback")
    if isinstance(feedback, dict) and feedback.get("blockReason"):
        reasons.append(f"prompt blocked ({feedback['blockReason']})")
    for candidate in payload.get("candidates") or []:
        if not isinstance(candidate, dict):
            continue
        content = candidate.get("content")
        parts = content.get("parts") if isinstance(content, dict) else None
        found = False
        for part in parts or []:
            inline = part.get("inlineData") if isinstance(part, dict) else None
            if not isinstance(inline, dict) or not inline.get("data"):
                continue
            encoded = str(inline["data"])
            if len(encoded) > (CAP_MB * 1024 * 1024 + 2) // 3 * 4:
                reasons.append(f"image over {CAP_MB} MB")
                continue
            images.append(
                (base64.b64decode(encoded, validate=True), str(inline.get("mimeType") or ""))
            )
            found = True
        finish = candidate.get("finishReason")
        if not found and finish and finish != "STOP":
            reasons.append(str(finish).lower())
    return images, ", ".join(reasons)
