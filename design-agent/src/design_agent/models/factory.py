"""Build any LangChain chat model for any role from settings, the registry and LangChain profiles.

`provider:model` is LangChain's `init_chat_model` form; `langsmith:provider/model` opts into the
LangSmith Gateway. Anthropic and OpenAI models go through the gateway's native routes, so they keep
their own API (prompt caching, context editing, tool search, effort); other providers use its
shared OpenAI-style route. What the harness relies on comes from, first to last: the role's
settings (`DESIGN_AGENT_<ROLE>_MODEL_VISION`, `_MAX_OUTPUT_TOKENS`), the registry's exact entry, the
profile LangChain publishes for the instantiated model, else nothing: a role that looks at images
then runs with a warning, and only capability data that says "no images" refuses it.

Each role's model settings travel with its model (`model_options`): a helper the lead starts on
the look model reaches it the way `look` does. The SDK's own retries are off:
`TransientModelRetryMiddleware` owns recovery, bounded and logged in one place. Every call has a
stall ceiling.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

from dotenv import dotenv_values
from langchain_core.language_models import BaseChatModel

from design_agent.config import ModelOptions, ModelRole, ModelSpec, Settings
from design_agent.models.registry import (
    CAPABILITY_REGISTRY,
    GOOGLE_PROVIDERS,
    UNKNOWN_MODEL,
    ModelCapabilities,
    ModelConfigurationError,
    ToolDisclosure,
    capabilities_for,
    require_vision,
    resolve_effort,
    warn_once,
)

Role = ModelRole
ROLES: tuple[Role, ...] = ("lead", "helper", "look", "tool_selector", "learning")
VISION_ROLES: frozenset[Role] = frozenset({"lead", "helper", "look"})
SDK_MAX_RETRIES = 0
#: The gateway origin is pinned, never read from settings, so no setting can send its key elsewhere.
GATEWAY_ORIGIN = "https://gateway.smith.langchain.com"
#: Providers the gateway serves on their own API, which keeps their native features.
GATEWAY_NATIVE_ROUTES = {"anthropic": "/anthropic", "openai": "/openai/v1"}
#: The gateway's shared OpenAI-style route for every other provider (model ids `provider/model`).
GATEWAY_SHARED_ROUTE = "/v1"
#: Provider keys the settings hold; any other provider's class reads its own variable.
PROVIDER_KEYS = {
    "anthropic": "anthropic_api_key",
    "openai": "openai_api_key",
    "google_genai": "google_api_key",
}
#: Gemini before 3 thinks to a token budget, not a level.
THINKING_BUDGETS = {"minimal": 512, "low": 1024, "medium": 8192, "high": 24576}
#: Constructor arguments that pick an endpoint or carry a credential never come from
#: `_MODEL_KWARGS`: a key goes only to its own endpoint, set by `_BASE_URL` and `_API_KEY_ENV`.
CONNECTION_ARGUMENT = re.compile(
    r"(^|_)(key|url|base|endpoint|host|headers?|client|token|secret|credentials?|auth)($|_)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ResolvedModel:
    """One role's validated model choice. Building it performs no network call."""

    role: Role
    spec: ModelSpec
    caps: ModelCapabilities
    effort: str | None
    max_output_tokens: int | None
    options: ModelOptions

    @property
    def base_url(self) -> str | None:
        return self.options.base_url


def model_options(settings: Settings, role: Role, spec: ModelSpec) -> ModelOptions:
    """The settings `spec` runs with as `role`.

    On the role's own model: its own settings, and the endpoint of another role on the same model
    when it sets none (a helper on the lead's model reaches it as the lead does). On another model
    (a helper the lead started on the look model): the settings of the first role configured with
    it, the lead first. On a model no role names: none.
    """
    if spec == settings.role_model(role):
        own = settings.model_options(role)
        if own.base_url is None:
            shared = next(
                (
                    settings.model_options(other)
                    for other in ROLES
                    if other != role
                    and settings.role_model(other) == spec
                    and settings.model_options(other).base_url is not None
                ),
                None,
            )
            if shared is not None:
                own = replace(own, base_url=shared.base_url, api_key_env=shared.api_key_env)
        return own
    for other in ROLES:
        if settings.role_model(other) == spec:
            return settings.model_options(other)
    return ModelOptions(role=role)


def resolve_model(
    settings: Settings,
    role: Role = "lead",
    *,
    spec: ModelSpec | None = None,
    effort: str | None = None,
    probe: bool = False,
    project_root: Path | None = None,
) -> ResolvedModel:
    """Validate a role's model, effort and output budget. `spec` runs another model in the role
    (a helper the lead chose). `probe` reads the LangChain profile of a model the registry does
    not list by instantiating it (no network call) and warns about what stays unknown."""
    spec = spec or settings.role_model(role)
    options = model_options(settings, role, spec)
    profile = _profile(settings, role, spec, options, project_root) if probe else None
    caps = capabilities_for(spec, base_url=options.base_url, profile=profile)
    if options.vision is not None:
        caps = replace(caps, vision=options.vision)
    if role in VISION_ROLES and spec.provider != "scripted":
        require_vision(spec, caps, role=role, setting=options.setting("VISION"))
        if probe and caps.vision is None:
            warn_once(
                f"{role} model {spec}: no capability data says it takes images; running it anyway. "
                f"Set {options.setting('VISION')}=1 once you have checked."
            )
    requested, quiet = effort, False
    if requested is None and role == "lead":
        requested = settings.model_effort
    if requested is None and role == "look":
        requested, quiet = "low", True
    resolved_effort = resolve_effort(spec, caps, requested, role=role, quiet=quiet or not probe)
    max_output = options.max_output_tokens or caps.max_output_tokens
    floor = caps.min_output_tokens(resolved_effort)
    if floor is not None and (max_output is None or max_output < floor):
        max_output = floor
    return ResolvedModel(
        role=role,
        spec=spec,
        caps=caps,
        effort=resolved_effort,
        max_output_tokens=max_output,
        options=options,
    )


def build_chat_model(
    settings: Settings,
    role: Role = "lead",
    *,
    spec: ModelSpec | None = None,
    effort: str | None = None,
    project_root: Path | None = None,
    **overrides: Any,
) -> BaseChatModel:
    """The chat model for `role` (on `spec` when given). Keyword overrides go to the provider class
    (tests pass api_key; helpers pass streaming and timeout) and win over everything else."""
    resolved = resolve_model(
        settings, role, spec=spec, effort=effort, probe=True, project_root=project_root
    )
    return build_resolved(settings, resolved, project_root=project_root, **overrides)


def build_resolved(
    settings: Settings,
    resolved: ResolvedModel,
    *,
    project_root: Path | None = None,
    **overrides: Any,
) -> BaseChatModel:
    """The chat model for a choice `resolve_model` already validated."""
    kwargs: dict[str, Any] = {
        "timeout": settings.model_timeout_seconds,
        "max_retries": SDK_MAX_RETRIES,
        **constructor_kwargs(resolved.options),
        **overrides,
    }
    return _construct(settings, resolved, kwargs, project_root)


def constructor_kwargs(options: ModelOptions) -> dict[str, Any]:
    """`DESIGN_AGENT_<ROLE>_MODEL_KWARGS`, checked: a JSON object with no connection argument."""
    if not options.kwargs:
        return {}
    name = options.setting("KWARGS")
    try:
        parsed = json.loads(options.kwargs)
    except json.JSONDecodeError:
        raise ModelConfigurationError(f"{name} must be a JSON object") from None
    if not isinstance(parsed, dict):
        raise ModelConfigurationError(f"{name} must be a JSON object")
    refused = sorted(key for key in parsed if CONNECTION_ARGUMENT.search(str(key)))
    if refused:
        raise ModelConfigurationError(
            f"{name} may not set {', '.join(refused)}: an endpoint and its key come from "
            f"{options.setting('BASE_URL')} and {options.setting('API_KEY_ENV')}"
        )
    return parsed


def missing_key(
    settings: Settings, spec: ModelSpec, options: ModelOptions, project_root: Path | None = None
) -> str | None:
    """The setting `spec` needs to be called and lacks, or None. Only keys the settings hold are
    checked; another provider's class reads its own variable and says when it is missing."""
    if options.base_url is not None:
        if named_key(options.api_key_env, project_root) is None:
            return options.setting("API_KEY_ENV")
        return None
    if spec.via_gateway:
        return None if gateway_key(settings) else "LANGSMITH_GATEWAY_API_KEY"
    field = PROVIDER_KEYS.get(spec.provider)
    if field is not None and getattr(settings, field) is None:
        return field.upper()
    return None


def _profile(
    settings: Settings,
    role: Role,
    spec: ModelSpec,
    options: ModelOptions,
    project_root: Path | None,
) -> dict[str, Any] | None:
    """The LangChain profile of `spec` as it would be built for `role`, when the registry has no
    entry: instantiated with its connection only, and read. None when it cannot be built here (a
    missing key or package) or names no profile (the gateway's shared route)."""
    target = spec.upstream if spec.via_gateway else spec
    if str(target) in CAPABILITY_REGISTRY or spec.provider == "scripted":
        return None
    if spec.via_gateway and target.provider not in GATEWAY_NATIVE_ROUTES:
        return None
    bare = ResolvedModel(role, spec, UNKNOWN_MODEL, None, None, options)
    try:
        model = _construct(settings, bare, {"max_retries": SDK_MAX_RETRIES}, project_root)
    except Exception:  # noqa: BLE001 - no profile; the real build reports what is wrong
        return None
    return dict(model.profile or {}) or None


def _construct(
    settings: Settings, resolved: ResolvedModel, kwargs: dict[str, Any], project_root: Path | None
) -> BaseChatModel:
    """The model class for the route `resolved` takes, with its connection and the harness's
    arguments under `kwargs` (which win)."""
    spec, options = resolved.spec, resolved.options
    connection: dict[str, Any] = {}
    if options.base_url is not None:
        key = named_key(options.api_key_env, project_root)
        if key is None:
            raise ModelConfigurationError(
                f"{options.setting('BASE_URL')} needs {options.setting('API_KEY_ENV')} naming the "
                "variable that holds that endpoint's key"
            )
        connection = {"base_url": options.base_url, "api_key": key}
    kwargs = {**connection, **kwargs}

    if spec.via_gateway:
        upstream = spec.upstream
        # Never "" -> provider key: a missing gateway key must fail at the gateway, not leak.
        kwargs.setdefault("api_key", gateway_key(settings))
        route = GATEWAY_NATIVE_ROUTES.get(upstream.provider, GATEWAY_SHARED_ROUTE)
        kwargs.setdefault("base_url", GATEWAY_ORIGIN + route)
        if upstream.provider == "anthropic":
            return _anthropic(settings, replace(resolved, spec=upstream), kwargs)
        if upstream.provider == "openai":
            return _openai(settings, replace(resolved, spec=upstream), kwargs)
        # The shared route names the provider in the model id and answers the Responses API.
        kwargs.setdefault("use_responses_api", True)
        return _openai(settings, resolved, kwargs, gemini=upstream.provider in GOOGLE_PROVIDERS)
    if spec.provider == "anthropic":
        return _anthropic(settings, resolved, kwargs)
    if spec.provider == "openai":
        return _openai(settings, resolved, kwargs, gemini="gemini" in spec.model.lower())
    return _generic(settings, resolved, kwargs)


#: Server-side tool-result clearing for helpers (platform.claude.com, "Context editing"). A clear
#: invalidates the cached prefix, so it waits for a large prompt and clears at least 20k tokens.
CONTEXT_MANAGEMENT_BETA = "context-management-2025-06-27"
HELPER_TOOL_CLEARING: dict[str, Any] = {
    "type": "clear_tool_uses_20250919",
    "trigger": {"type": "input_tokens", "value": 120_000},
    "keep": {"type": "tool_uses", "value": 6},
    "clear_at_least": {"type": "input_tokens", "value": 20_000},
}


def _anthropic(
    settings: Settings, resolved: ResolvedModel, kwargs: dict[str, Any]
) -> BaseChatModel:
    from design_agent.models.cache import CachedChatAnthropic

    kwargs.setdefault(
        "cache_ttl", settings.cache_ttl if resolved.role == "lead" else settings.helper_cache_ttl
    )
    if settings.enable_tool_clearing and resolved.role == "helper":
        kwargs.setdefault("betas", [CONTEXT_MANAGEMENT_BETA])
        kwargs.setdefault("context_management", {"edits": [HELPER_TOOL_CLEARING]})
    if settings.anthropic_api_key is not None:
        kwargs.setdefault("api_key", settings.anthropic_api_key.get_secret_value())
    if resolved.effort is not None:
        kwargs.setdefault("effort", resolved.effort)
    if resolved.caps.adaptive_thinking:
        kwargs.setdefault("thinking", {"type": "adaptive"})
    if resolved.max_output_tokens is not None:
        kwargs.setdefault("max_tokens", resolved.max_output_tokens)
    return CachedChatAnthropic(model=resolved.spec.model, **kwargs)


def _openai(
    settings: Settings, resolved: ResolvedModel, kwargs: dict[str, Any], *, gemini: bool = False
) -> BaseChatModel:
    """OpenAI, an OpenAI-compatible endpoint, or a gateway route: the Responses API where the
    registry verified it (or the route needs it), Chat Completions everywhere else."""
    from design_agent.models.compat import CompatChatOpenAI

    if settings.openai_api_key is not None:
        kwargs.setdefault("api_key", settings.openai_api_key.get_secret_value())
    responses = bool(kwargs.setdefault("use_responses_api", resolved.caps.responses_api))
    if resolved.effort is not None:
        if responses:
            kwargs.setdefault("reasoning", {"effort": resolved.effort})
        else:
            kwargs.setdefault("reasoning_effort", resolved.effort)
    if resolved.max_output_tokens is not None:
        kwargs.setdefault("max_completion_tokens", resolved.max_output_tokens)
    kwargs.setdefault("tool_search", resolved.caps.disclosure is ToolDisclosure.PROVIDER_NATIVE)
    kwargs.setdefault("gemini_usage", gemini)
    return CompatChatOpenAI(model=resolved.spec.model, **kwargs)


def _generic(settings: Settings, resolved: ResolvedModel, kwargs: dict[str, Any]) -> BaseChatModel:
    """Any other provider through `init_chat_model`. Effort is Gemini's thinking level (or token
    budget) on Google, and `reasoning_effort` elsewhere, sent only when the model lists levels."""
    from langchain.chat_models import init_chat_model

    spec, effort = resolved.spec, resolved.effort
    if effort is not None and spec.provider in GOOGLE_PROVIDERS:
        if resolved.caps.thinking_budget:
            kwargs.setdefault("thinking_budget", THINKING_BUDGETS.get(effort, 8192))
        else:
            kwargs.setdefault("thinking_level", effort)
    elif effort is not None:
        kwargs.setdefault("reasoning_effort", effort)
    if resolved.max_output_tokens is not None:
        kwargs.setdefault("max_tokens", resolved.max_output_tokens)
    if spec.provider == "google_genai" and settings.google_api_key is not None:
        kwargs.setdefault("api_key", settings.google_api_key.get_secret_value())
    model: BaseChatModel = init_chat_model(str(spec), **kwargs)
    return model


def gateway_key(settings: Settings) -> str:
    """The gateway credential: its own key, else the LangSmith key; "" when there is neither."""
    for key in (settings.langsmith_gateway_api_key, settings.langsmith_api_key):
        if key is not None and key.get_secret_value():
            return key.get_secret_value()
    return ""


def named_key(env_name: str | None, project_root: Path | None) -> str | None:
    """The value of the variable `env_name` from the process or the project `.env`."""
    if not env_name:
        return None
    if value := os.environ.get(env_name, "").strip():
        return value
    env_file = (project_root or Path.cwd()) / ".env"
    if env_file.is_file():
        value = (dotenv_values(env_file).get(env_name) or "").strip()
        return value or None
    return None
