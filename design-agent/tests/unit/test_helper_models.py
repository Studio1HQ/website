"""Checking and building the model and effort a lead picks for one helper (`models/helpers.py`)."""

from __future__ import annotations

import pytest

from design_agent.config import Settings
from design_agent.models.cache import CachedChatAnthropic
from design_agent.models.compat import CompatChatOpenAI
from design_agent.models.helpers import (
    HelperChoice,
    build_helper_model,
    choose_helper_model,
)
from design_agent.models.registry import ToolDisclosure, warn_once


def settings(**values: object) -> Settings:
    return Settings(_env_file=None, **{"anthropic_api_key": "sk-ant", **values})  # type: ignore[arg-type]


@pytest.fixture(autouse=True)
def fresh_warnings() -> None:
    warn_once.cache_clear()


def test_unset_runs_the_helper_model_at_the_leads_effort() -> None:
    assert choose_helper_model(settings()) == HelperChoice(
        "anthropic:claude-opus-5-5", "high", ToolDisclosure.PROVIDER_NATIVE
    )
    s = settings(helper_model="anthropic:claude-sonnet-5-5", model_effort="medium")
    assert choose_helper_model(s) == HelperChoice(
        "anthropic:claude-sonnet-5-5", "medium", ToolDisclosure.PROVIDER_NATIVE
    )


def test_an_effort_is_capped_then_clamped_to_what_the_model_takes() -> None:
    capped = choose_helper_model(settings(helper_effort_cap="xhigh"), effort="max")
    assert isinstance(capped, HelperChoice) and capped.effort == "xhigh"
    gemini = choose_helper_model(
        settings(google_api_key="g"), "google_genai:gemini-3.6-flash", "xhigh"
    )
    assert isinstance(gemini, HelperChoice) and gemini.effort == "high"
    assert gemini.disclosure is ToolDisclosure.PORTABLE_SELECTOR
    haiku = choose_helper_model(settings(), "anthropic:claude-haiku-5-5", "max")
    assert isinstance(haiku, HelperChoice) and haiku.effort is None, "it takes no effort setting"


def test_any_model_langchain_builds_is_accepted() -> None:
    choice = choose_helper_model(settings(), " mistralai:mistral-large-latest ", "low")
    assert choice == HelperChoice(
        "mistralai:mistral-large-latest", None, ToolDisclosure.PORTABLE_SELECTOR
    )


@pytest.mark.parametrize(
    ("model", "effort", "says"),
    [
        ("claude-opus-5-5", None, "is not a provider:model id"),
        ("anthropic:claude-opus-5-5", "ultra", "is not one of low, medium, high, xhigh, max"),
        ("nosuchprovider:model-1", None, "cannot run here"),
        ("mistralai:codestral-latest", None, "takes no image input"),
        ("openai:gpt-6-sol", None, "cannot run here"),  # OpenAI refuses to build without a key
    ],
)
def test_a_choice_that_cannot_run_says_why(model: str, effort: str | None, says: str) -> None:
    refused = choose_helper_model(settings(), model, effort)
    assert isinstance(refused, str) and says in refused


def test_a_key_the_settings_hold_must_be_set() -> None:
    refused = choose_helper_model(Settings(_env_file=None), "anthropic:claude-sonnet-5-5")  # type: ignore[call-arg]
    assert refused == "anthropic:claude-sonnet-5-5 needs ANTHROPIC_API_KEY, which is not set."


def test_the_built_model_streams_with_the_efforts_ceiling_and_the_routes_repairs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    opus = build_helper_model(settings(), "anthropic:claude-opus-5-5", "max")
    assert isinstance(opus, CachedChatAnthropic)
    assert (opus.streaming, opus.default_request_timeout, opus.effort) == (True, 2700.0, "max")
    assert opus.cache_ttl == "5m", "a helper's calls come seconds apart"
    monkeypatch.setenv("LOCAL_KEY", "local-secret")
    local = build_helper_model(
        settings(
            look_model="openai:local-vision",
            look_model_base_url="http://llm.internal/v1",
            look_model_api_key_env="LOCAL_KEY",
        ),
        "openai:local-vision",
        "low",
    )
    assert isinstance(local, CompatChatOpenAI), "OpenAI-compatible repairs apply"
    assert local.openai_api_base == "http://llm.internal/v1", "the look model's endpoint travels"
    assert local.streaming and local.tool_search is False
