"""Settings parsing and the exact-id capability registry."""

from __future__ import annotations

import pytest

from design_agent.config import ModelSpec, Settings
from design_agent.models.cache import CachedChatAnthropic
from design_agent.models.factory import GATEWAY_NATIVE_ROUTES, build_chat_model, resolve_model
from design_agent.models.registry import (
    CAPABILITY_REGISTRY,
    GATEWAY_NATIVE_PROVIDERS,
    HIGH_EFFORT_MIN_OUTPUT_TOKENS,
    UNKNOWN_MODEL,
    ModelConfigurationError,
    ToolDisclosure,
    capabilities_for,
    warn_once,
)


def settings(**values: object) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


@pytest.fixture(autouse=True)
def fresh_warnings() -> None:
    warn_once.cache_clear()


def test_model_spec_parses_provider_and_gateway() -> None:
    spec = ModelSpec.parse("anthropic:claude-opus-5-5")
    assert (spec.provider, spec.model, spec.via_gateway) == ("anthropic", "claude-opus-5-5", False)
    gateway = ModelSpec.parse("langsmith:anthropic/claude-opus-5-5")
    assert gateway.via_gateway and str(gateway.upstream) == "anthropic:claude-opus-5-5"
    with pytest.raises(ValueError, match="provider:model"):
        ModelSpec.parse("claude-opus-5-5")


def test_lookup_is_exact_never_substring() -> None:
    assert capabilities_for(ModelSpec.parse("anthropic:claude-opus-5-5")).verified
    assert capabilities_for(ModelSpec.parse("anthropic:claude-opus-5-5-preview")) is UNKNOWN_MODEL
    assert capabilities_for(ModelSpec.parse("anthropic:claude-opus")) is UNKNOWN_MODEL


def test_the_gateway_keeps_native_features_only_on_a_providers_own_route() -> None:
    native = capabilities_for(ModelSpec.parse("langsmith:anthropic/claude-opus-5-5"))
    assert native == CAPABILITY_REGISTRY["anthropic:claude-opus-5-5"]
    shared = capabilities_for(ModelSpec.parse("langsmith:google_genai/gemini-3-pro"))
    assert shared.disclosure is ToolDisclosure.PORTABLE_SELECTOR
    assert set(GATEWAY_NATIVE_ROUTES) == GATEWAY_NATIVE_PROVIDERS


def test_a_gateway_anthropic_model_is_the_native_class_on_the_gateway_route() -> None:
    s = settings(
        model="langsmith:anthropic/claude-opus-5-5",
        langsmith_gateway_api_key="lsv2_gateway",
        anthropic_api_key="sk-ant-never-sent",
    )
    model = build_chat_model(s, "lead")
    assert isinstance(model, CachedChatAnthropic)
    assert model.model == "claude-opus-5-5"
    assert model.anthropic_api_url == "https://gateway.smith.langchain.com/anthropic"
    assert model.anthropic_api_key.get_secret_value() == "lsv2_gateway"
    assert (model.effort, model.thinking, model.cache_ttl) == ("high", {"type": "adaptive"}, "1h")


def test_the_gateway_falls_back_to_the_langsmith_key_and_never_to_a_provider_key() -> None:
    s = settings(model="langsmith:anthropic/claude-opus-5-5", langsmith_api_key="lsv2_workspace")
    assert build_chat_model(s, "lead").anthropic_api_key.get_secret_value() == "lsv2_workspace"  # type: ignore[attr-defined]
    keyless = settings(model="langsmith:anthropic/claude-opus-5-5", anthropic_api_key="sk-ant-x")
    assert build_chat_model(keyless, "lead").anthropic_api_key.get_secret_value() == ""  # type: ignore[attr-defined]


def test_a_gateway_openai_model_uses_the_openai_route() -> None:
    s = settings(model="langsmith:openai/gpt-6-sol", langsmith_gateway_api_key="lsv2_gateway")
    model = build_chat_model(s, "lead")
    assert model.openai_api_base == "https://gateway.smith.langchain.com/openai/v1"  # type: ignore[attr-defined]


def test_custom_base_url_never_claims_native_search() -> None:
    proxied = capabilities_for(
        ModelSpec.parse("openai:gpt-6-sol"), base_url="https://proxy.example"
    )
    assert proxied.disclosure is ToolDisclosure.PORTABLE_SELECTOR
    assert (
        capabilities_for(ModelSpec.parse("openai:gpt-6-sol")).disclosure
        is ToolDisclosure.PROVIDER_NATIVE
    )


def test_lead_defaults_to_high_effort_and_look_to_low() -> None:
    s = settings()
    assert resolve_model(s, "lead").effort == "high"
    assert resolve_model(s, "look").effort == "low"


def test_unsupported_effort_is_refused_with_choices() -> None:
    with pytest.raises(ModelConfigurationError, match="choose one of"):
        resolve_model(settings(model_effort="ultra"), "lead")


def test_high_effort_gets_the_output_floor() -> None:
    resolved = resolve_model(settings(model_effort="max"), "lead")
    assert resolved.max_output_tokens is not None
    assert resolved.max_output_tokens >= HIGH_EFFORT_MIN_OUTPUT_TOKENS


def test_only_capability_data_that_says_no_images_refuses_a_looking_role(
    caplog: pytest.LogCaptureFixture,
) -> None:
    # A text-only model by its LangChain profile is refused, naming the override.
    with pytest.raises(ModelConfigurationError, match="DESIGN_AGENT_MODEL_VISION"):
        resolve_model(settings(model="mistralai:codestral-latest"), "lead", probe=True)
    with pytest.raises(ModelConfigurationError, match="DESIGN_AGENT_LOOK_MODEL_VISION"):
        resolve_model(settings(look_model="mistralai:codestral-latest"), "look", probe=True)
    # A model nothing describes runs, with a warning; the override settles it either way.
    unknown = resolve_model(settings(model="mystery:model-1"), "lead", probe=True)
    assert unknown.caps.vision is None and unknown.caps.source == "unknown"
    assert "no capability data says it takes images" in caplog.text
    assert resolve_model(settings(model="mystery:model-1", model_vision=True)).caps.vision
    with pytest.raises(ModelConfigurationError, match="image input"):
        resolve_model(settings(helper_model="mystery:model-1", helper_model_vision=False), "helper")
    # The tool selector never looks at images.
    resolve_model(settings(tool_selector_model="mistralai:codestral-latest"), "tool_selector")


def test_a_model_the_registry_lacks_is_described_by_its_langchain_profile() -> None:
    s = settings(model="anthropic:claude-sonnet-4-5", anthropic_api_key="sk-test")
    resolved = resolve_model(s, "lead", probe=True)
    assert resolved.caps.source == "profile" and resolved.caps.vision is True
    assert resolved.caps.disclosure is ToolDisclosure.PORTABLE_SELECTOR
    assert resolved.max_output_tokens == 64_000, "its output budget comes from the profile"
    model = build_chat_model(s, "lead")
    assert model.max_tokens == 64_000  # type: ignore[attr-defined]
    assert resolve_model(s, "lead").caps is UNKNOWN_MODEL, "no profile without probing"


def test_each_role_has_its_own_endpoint_budget_and_constructor_arguments(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HELPER_KEY", "helper-secret")
    s = settings(
        model="anthropic:claude-opus-5-5",
        anthropic_api_key="sk-ant",
        helper_model="openai:local-model",
        helper_model_base_url="https://llm.example/v1",
        helper_model_api_key_env="HELPER_KEY",
        helper_model_max_output_tokens=8_000,
        helper_model_kwargs='{"temperature": 0.2}',
        helper_model_vision=True,
    )
    helper = build_chat_model(s, "helper")
    assert helper.openai_api_base == "https://llm.example/v1"  # type: ignore[attr-defined]
    assert helper.openai_api_key.get_secret_value() == "helper-secret"  # type: ignore[attr-defined]
    assert helper.max_tokens == 8_000 and helper.temperature == 0.2  # type: ignore[attr-defined]
    assert helper.use_responses_api is False, "an OpenAI-compatible endpoint is Chat Completions"  # type: ignore[attr-defined]
    lead = build_chat_model(s, "lead")
    assert lead.anthropic_api_url != "https://llm.example/v1"  # type: ignore[attr-defined]
    # The lead starting a helper on the helper model, or `look` on it, reaches it the same way.
    look = build_chat_model(s, "look", spec=ModelSpec.parse("openai:local-model"))
    assert look.openai_api_base == "https://llm.example/v1"  # type: ignore[attr-defined]


def test_a_helper_on_the_leads_model_reaches_the_leads_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EXAMPLE_KEY", "secret")
    s = settings(
        model="openai:gpt-6-sol",
        model_base_url="https://llm.example/v1",
        model_api_key_env="EXAMPLE_KEY",
        model_max_output_tokens=4_000,
    )
    helper = build_chat_model(s, "helper")
    assert helper.openai_api_base == "https://llm.example/v1"  # type: ignore[attr-defined]
    assert helper.max_tokens == 128_000, "the lead's budget is the lead's own"  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    ("value", "match"),
    [
        ("not json", "JSON object"),
        ("[1, 2]", "JSON object"),
        ('{"base_url": "https://elsewhere.example"}', "may not set base_url"),
        ('{"api_key": "sk"}', "may not set api_key"),
        ('{"default_headers": {"x": "y"}}', "may not set default_headers"),
    ],
)
def test_constructor_arguments_never_choose_an_endpoint_or_a_key(value: str, match: str) -> None:
    with pytest.raises(ModelConfigurationError, match=match):
        build_chat_model(settings(anthropic_api_key="sk", model_kwargs=value), "lead")


def test_effort_maps_to_each_providers_parameter(caplog: pytest.LogCaptureFixture) -> None:
    google = build_chat_model(
        settings(model="google_genai:gemini-3.6-flash", google_api_key="g", model_effort="low"),
        "lead",
    )
    assert google.reasoning_effort == "low"  # type: ignore[attr-defined]  # thinking_level
    budget = build_chat_model(
        settings(model="google_genai:gemini-2.5-flash", google_api_key="g", model_effort="high"),
        "lead",
    )
    assert budget.thinking_budget == 24_576  # type: ignore[attr-defined]
    chat = build_chat_model(
        settings(
            model="openai:gpt-6-sol",
            model_effort="high",
            model_base_url="https://llm.example/v1",
            model_api_key_env="PATH",  # any variable that is set
        ),
        "lead",
    )
    assert chat.reasoning_effort == "high" and chat.reasoning is None  # type: ignore[attr-defined]
    native = build_chat_model(settings(model="openai:gpt-6-sol", openai_api_key="sk"), "lead")
    assert native.reasoning == {"effort": "medium"}  # type: ignore[attr-defined]
    # No effort parameter: dropped with a warning, never refused.
    mistral = resolve_model(
        settings(model="mistralai:mistral-large-latest", model_effort="high"), probe=True
    )
    assert mistral.effort is None and "takes no effort setting" in caplog.text
    # A level the model does not take runs at the most it takes under it.
    assert resolve_model(settings(model_effort="minimal")).effort == "low"


def test_anthropic_model_is_built_with_registry_behavior() -> None:
    model = build_chat_model(settings(anthropic_api_key="sk-test"), "lead")
    assert model.max_retries == 0  # type: ignore[attr-defined]
    assert model.max_tokens == 128_000  # type: ignore[attr-defined]
    assert model.effort == "high"  # type: ignore[attr-defined]
    assert model.thinking == {"type": "adaptive"}  # type: ignore[attr-defined]


def test_base_url_requires_a_named_key(monkeypatch: pytest.MonkeyPatch) -> None:
    s = settings(model="openai:gpt-6-sol", model_base_url="https://llm.example/v1")
    with pytest.raises(ModelConfigurationError, match="MODEL_API_KEY_ENV"):
        build_chat_model(s, "lead")
    monkeypatch.setenv("EXAMPLE_KEY", "secret")
    s = settings(
        model="openai:gpt-6-sol",
        model_base_url="https://llm.example/v1",
        model_api_key_env="EXAMPLE_KEY",
    )
    assert build_chat_model(s, "lead").openai_api_base == "https://llm.example/v1"  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    "model_id", sorted(k for k in CAPABILITY_REGISTRY if k.startswith(("anthropic:", "openai:")))
)
def test_registry_agrees_with_installed_provider_profiles(model_id: str) -> None:
    provider, model = model_id.split(":", 1)
    if provider == "anthropic":
        from langchain_anthropic.data._profiles import _PROFILES
    else:
        from langchain_openai.data._profiles import _PROFILES
    profile = _PROFILES.get(model)
    assert profile is not None, f"{model_id} is not a model the installed package knows"
    caps = CAPABILITY_REGISTRY[model_id]
    assert caps.vision == bool(profile.get("image_inputs"))
    assert caps.max_output_tokens == profile.get("max_output_tokens")
    assert caps.context_window == profile.get("max_input_tokens")
    if profile.get("reasoning_effort_levels"):
        assert caps.efforts == frozenset(profile["reasoning_effort_levels"])


def test_secrets_never_appear_in_repr() -> None:
    s = settings(anthropic_api_key="sk-very-secret")
    assert "sk-very-secret" not in repr(s)
    assert "sk-very-secret" not in str(s.model_dump())


def test_brand_path_falls_back_to_the_sample_brand(tmp_path) -> None:  # type: ignore[no-untyped-def]
    (tmp_path / "examples/brands/example-studio").mkdir(parents=True)
    assert settings().resolved_brand_path(tmp_path) == tmp_path / "examples/brands/example-studio"
    (tmp_path / "workspace/brand").mkdir(parents=True)
    (tmp_path / "workspace/brand/brand.toml").write_text("name = 'x'\n")
    assert settings().resolved_brand_path(tmp_path) == tmp_path / "workspace/brand"


@pytest.mark.parametrize("name", ["Design Agent", "Design Agent Test", "design-agent_2.0", "A"])
def test_a_slack_name_mda_accepts_is_accepted(name: str) -> None:
    assert settings(slack_name=name).slack_name == name


@pytest.mark.parametrize(
    "name", ["Design Agent (test)", " Design Agent", "Design Agent-", "Design!"]
)
def test_a_slack_name_mda_would_reject_fails_before_the_deploy(name: str) -> None:
    with pytest.raises(ValueError, match="slack_name"):
        settings(slack_name=name)
