"""What the harness may rely on for a model: the exact-id registry, else its LangChain profile.

Each registry entry records what the harness relies on for one `provider:model` id and is the only
source that claims provider features (native tool search, prompt-cache lifetimes, context editing).
Lookups are exact: no substring matching on provider or model names. A model without an entry is
described by the profile LangChain publishes for it (`from_profile`: image input, output limit,
effort levels) and runs on the portable path; a model with neither is unknown, and a role that
looks at images runs it with a warning. `tests/unit/test_config_and_registry.py` cross-checks every
entry against the limits the installed provider package publishes.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass, field, replace
from enum import StrEnum
from functools import cache
from typing import Any

from design_agent.config import ModelSpec


class ToolDisclosure(StrEnum):
    """How deferred tools reach the model."""

    PROVIDER_NATIVE = "provider_native"
    """Provider-side deferred tool search (Anthropic tool search, OpenAI Responses tool_search)."""
    PORTABLE_SELECTOR = "portable_selector"
    """`LLMToolSelectorMiddleware` picks a bounded subset per turn."""
    ALL = "all"
    """Every tool bound on every call (scripted model only)."""


_LOGGER = logging.getLogger(__name__)

#: Every effort level any provider takes, least thinking first.
EFFORT_ORDER = ("none", "minimal", "low", "medium", "high", "xhigh", "max")
ANTHROPIC_EFFORTS = frozenset({"low", "medium", "high", "xhigh", "max"})
OPENAI_EFFORTS = frozenset({"none", "low", "medium", "high", "xhigh", "max"})
#: Anthropic's recommended output headroom for the two highest effort levels.
HIGH_EFFORT_MIN_OUTPUT_TOKENS = 64_000


@dataclass(frozen=True)
class ModelCapabilities:
    """What one exact model id supports. Only `verified` entries claim provider features."""

    provider: str
    vision: bool | None
    """None: no capability data says whether it takes images."""
    tool_calling: bool = True
    disclosure: ToolDisclosure = ToolDisclosure.PORTABLE_SELECTOR
    efforts: frozenset[str] = frozenset()
    default_effort: str | None = None
    context_window: int | None = None
    max_output_tokens: int | None = None
    adaptive_thinking: bool = False
    """Claude 5: thinking is adaptive and replayed thinking must match unedited history."""
    cache_ttls: frozenset[str] = frozenset()
    server_context_editing: bool = False
    streaming_tool_calls: bool = True
    responses_api: bool = False
    integration_package: str = ""
    image_tokens_per_megapixel: int | None = None
    """Approximate input tokens for a 1-megapixel image; drives the look tool's budget."""
    thinking_budget: bool = False
    """Google models that think to a token budget rather than a level (Gemini 2.5)."""
    source: str = "registry"
    """Where these facts come from: `registry`, `profile` (LangChain's) or `unknown`."""
    verified: bool = False
    notes: str = ""
    extra: dict[str, object] = field(default_factory=dict)

    def min_output_tokens(self, effort: str | None) -> int | None:
        """The output budget the harness needs for `effort`, or None when any budget works."""
        if self.provider == "anthropic" and effort in {"xhigh", "max"}:
            return HIGH_EFFORT_MIN_OUTPUT_TOKENS
        return None


def _claude(
    default_effort: str | None, *, efforts: frozenset[str] = ANTHROPIC_EFFORTS
) -> ModelCapabilities:
    return ModelCapabilities(
        provider="anthropic",
        vision=True,
        disclosure=ToolDisclosure.PROVIDER_NATIVE,
        efforts=efforts,
        default_effort=default_effort,
        context_window=1_000_000,
        max_output_tokens=128_000,
        adaptive_thinking=bool(efforts),
        cache_ttls=frozenset({"5m", "1h"}),
        server_context_editing=True,
        integration_package="langchain-anthropic",
        # platform.claude.com vision docs: tokens ~= width * height / 750.
        image_tokens_per_megapixel=1_334,
        verified=True,
        notes="Anthropic tool search, prompt caching (5m/1h) and context editing per current docs.",
    )


def _openai(default_effort: str) -> ModelCapabilities:
    return ModelCapabilities(
        provider="openai",
        vision=True,
        disclosure=ToolDisclosure.PROVIDER_NATIVE,
        efforts=OPENAI_EFFORTS,
        default_effort=default_effort,
        context_window=1_050_000,
        max_output_tokens=128_000,
        responses_api=True,
        integration_package="langchain-openai",
        verified=True,
        notes="OpenAI Responses tool_search; automatic prompt caching.",
    )


CAPABILITY_REGISTRY: dict[str, ModelCapabilities] = {
    "anthropic:claude-opus-5-5": _claude("high"),
    "anthropic:claude-fable-5-1": _claude("high"),
    "anthropic:claude-sonnet-5-5": _claude("high"),
    # No effort parameter: a fast, cheap model for `look` and the tool selector.
    "anthropic:claude-haiku-5-5": _claude(None, efforts=frozenset()),
    "openai:gpt-6.1-sol": _openai("medium"),
    "openai:gpt-6-sol": _openai("medium"),
    "openai:gpt-5.6-sol": _openai("medium"),
    "google_genai:gemini-3.6-flash": ModelCapabilities(
        provider="google_genai",
        vision=True,
        disclosure=ToolDisclosure.PORTABLE_SELECTOR,
        efforts=frozenset({"minimal", "low", "medium", "high"}),
        default_effort="medium",
        context_window=1_048_576,
        max_output_tokens=65_536,
        streaming_tool_calls=False,
        integration_package="langchain-google-genai",
        verified=True,
        notes="No provider-side deferred tool search: portable selector path.",
    ),
    "scripted:demo": ModelCapabilities(
        provider="scripted",
        vision=True,
        disclosure=ToolDisclosure.ALL,
        streaming_tool_calls=False,
        integration_package="design-agent",
        verified=True,
        notes="Deterministic scripted model for the offline demo and tests.",
    ),
}

#: Providers the LangSmith Gateway serves on their own API (`models.factory.GATEWAY_NATIVE_ROUTES`).
GATEWAY_NATIVE_PROVIDERS = frozenset({"anthropic", "openai"})

UNKNOWN_MODEL = ModelCapabilities(
    provider="",
    vision=None,
    source="unknown",
    notes="No registry entry or LangChain profile: portable path, no provider-feature claims.",
)

#: Providers whose effort is Gemini's thinking level (or, before Gemini 3, a token budget).
GOOGLE_PROVIDERS = frozenset({"google_genai", "google_vertexai"})
#: The efforts a budget-thinking Gemini model is offered (`ModelCapabilities.thinking_budget`).
BUDGET_EFFORTS = frozenset({"minimal", "low", "medium", "high"})


def from_profile(provider: str, profile: Mapping[str, Any] | None) -> ModelCapabilities | None:
    """A model's capabilities from its LangChain profile (`BaseChatModel.profile`), or None.

    The profile says what the model takes, never which provider features the harness may use, so
    the result is portable: no native tool search, cache lifetimes or context editing.
    """
    if not profile:
        return None
    levels = frozenset(
        level
        for level in profile.get("reasoning_effort_levels") or ()
        if isinstance(level, str) and level in EFFORT_ORDER
    )
    budget = provider in GOOGLE_PROVIDERS and not levels and profile.get("reasoning_output") is True
    efforts = levels or (BUDGET_EFFORTS if budget else frozenset())
    default = profile.get("reasoning_effort_default")
    image = profile.get("image_inputs")
    return ModelCapabilities(
        provider=provider,
        vision=image if isinstance(image, bool) else None,
        tool_calling=profile.get("tool_calling") is not False,
        efforts=efforts,
        default_effort=default if default in efforts else None,
        context_window=_count(profile.get("max_input_tokens")),
        max_output_tokens=_count(profile.get("max_output_tokens")),
        streaming_tool_calls=profile.get("tool_call_streaming") is not False,
        thinking_budget=budget,
        source="profile",
        notes="LangChain profile: portable path, no provider-feature claims.",
    )


def _count(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else None


def capabilities_for(
    spec: ModelSpec, *, base_url: str | None = None, profile: Mapping[str, Any] | None = None
) -> ModelCapabilities:
    """The registry's exact entry, else what `profile` says, else `UNKNOWN_MODEL`. A custom
    endpoint, or a gateway route that is not the provider's own API, never inherits
    provider-native features."""
    if spec.via_gateway:
        upstream = spec.upstream
        found = _lookup(upstream, profile)
        if upstream.provider in GATEWAY_NATIVE_PROVIDERS:
            return found
        return _portable(found, "LangSmith Gateway shared route: portable selector.")
    found = _lookup(spec, profile)
    if base_url is not None and found.disclosure is ToolDisclosure.PROVIDER_NATIVE:
        return _portable(found, "custom base URL: provider-native search is not assumed.")
    return found


def _lookup(spec: ModelSpec, profile: Mapping[str, Any] | None) -> ModelCapabilities:
    return (
        CAPABILITY_REGISTRY.get(str(spec)) or from_profile(spec.provider, profile) or UNKNOWN_MODEL
    )


def _portable(caps: ModelCapabilities, note: str) -> ModelCapabilities:
    return replace(
        caps,
        disclosure=ToolDisclosure.PORTABLE_SELECTOR,
        cache_ttls=frozenset(),
        server_context_editing=False,
        responses_api=False,
        extra={},
        notes=note,
    )


class ModelConfigurationError(ValueError):
    """A model setting the harness cannot run with. The message is safe to print."""


@cache
def warn_once(message: str) -> None:
    """Log a configuration warning once per process: models are built per role and per task."""
    _LOGGER.warning("[models] %s", message)


def require_vision(spec: ModelSpec, caps: ModelCapabilities, *, role: str, setting: str) -> None:
    """Lead, helper and look look at renders: refuse a model whose capability data says it takes
    no images. Without data it runs (the factory warns once; doctor shows it as unverified)."""
    if caps.vision is False:
        raise ModelConfigurationError(
            f"{role} model {spec} takes no image input (its {caps.source} says so), and the "
            f"{role} looks at its own renders. Choose a vision model, or set {setting}=1 if that "
            "is wrong."
        )


def resolve_effort(
    spec: ModelSpec,
    caps: ModelCapabilities,
    requested: str | None,
    *,
    role: str,
    quiet: bool = False,
) -> str | None:
    """The effort to send for `requested`: as asked when the model takes it; else the most it
    takes at or under the request (the least it takes, when none is that low); None when it takes
    no effort setting. A clipped or dropped request is logged, never refused. A value that is no
    effort level at all is a typo and is refused."""
    asked = (requested or "").strip().lower()
    if asked and asked not in EFFORT_ORDER:
        raise ModelConfigurationError(
            f"{role} effort {asked!r} is not an effort level; choose one of: "
            + ", ".join(sorted(caps.efforts, key=EFFORT_ORDER.index) or EFFORT_ORDER)
        )
    effort = asked or caps.default_effort
    if effort is None:
        return None
    if not caps.efforts:
        if asked and not quiet:
            warn_once(f"{spec} takes no effort setting; the {role}'s {asked!r} is dropped")
        return None
    if effort in caps.efforts:
        return effort
    clipped = clip_effort(effort, caps.efforts)
    if not quiet:
        warn_once(f"{spec} does not take effort {effort!r}; the {role} runs at {clipped!r}")
    return clipped


def clip_effort(effort: str, efforts: frozenset[str]) -> str:
    """The most of `efforts` at or under `effort`, else the least of them."""
    taken = sorted(efforts, key=EFFORT_ORDER.index)
    under = [e for e in taken if EFFORT_ORDER.index(e) <= EFFORT_ORDER.index(effort)]
    return under[-1] if under else taken[0]
