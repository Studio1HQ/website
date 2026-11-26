"""A helper's model, chosen per task by the lead: check the choice, then build it.

`choose_helper_model` checks the `provider:model` and effort the lead asked for and returns what
the helper will run on, or a short reason the lead can act on. `build_helper_model` builds that
choice the way every role's model is built (`factory.py`: the registry or LangChain profile, the
role's settings that travel with the model, the OpenAI-compatible repairs in `compat.py`), as a
helper: the helper prompt-cache lifetime, server-side tool clearing when on, streamed, and with a
stall ceiling that grows with the effort.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langchain_core.language_models import BaseChatModel
from pydantic import ValidationError

from design_agent.config import ModelSpec, Settings
from design_agent.models.factory import build_resolved, missing_key, resolve_model
from design_agent.models.registry import EFFORT_ORDER, ToolDisclosure

#: The efforts a lead may ask a helper for, least thinking first.
HELPER_EFFORTS = ("low", "medium", "high", "xhigh", "max")
#: The model-call stall ceiling by effort: a call at xhigh or max thinks long and writes a lot.
#: Others keep `DESIGN_AGENT_MODEL_TIMEOUT_SECONDS`. Streaming makes it a ceiling on silence.
TIMEOUT_BY_EFFORT = {"xhigh": 1800.0, "max": 2700.0}


@dataclass(frozen=True)
class HelperChoice:
    """What a helper runs on."""

    #: The normalized `provider:model` spec.
    model: str
    #: The effort it runs at; None when the model takes no effort setting.
    effort: str | None
    #: How tools reach it: provider search fails on a model without it.
    disclosure: ToolDisclosure


def choose_helper_model(
    settings: Settings,
    model: str | None = None,
    effort: str | None = None,
    *,
    project_root: Path | None = None,
) -> HelperChoice | str:
    """The model and effort a helper runs on, or a short reason it cannot.

    `model` is any `provider:model` (or `langsmith:provider/model`) LangChain can build here;
    unset, `DESIGN_AGENT_HELPER_MODEL`. `effort` is one of `HELPER_EFFORTS`; unset, the lead's.
    Over `DESIGN_AGENT_HELPER_EFFORT_CAP` it runs at the cap, and then at the most the model takes
    at or under that (None when it takes no effort setting). The model is built to check it (no
    network call), and a key the settings hold must be set.
    """
    text = (model or "").strip() or str(settings.role_model("helper"))
    try:
        spec = ModelSpec.parse(text, setting="model")
    except ValueError:
        return f"{text!r} is not a provider:model id (for example anthropic:claude-opus-5-5)."
    asked = (effort or "").strip().lower()
    if asked and asked not in HELPER_EFFORTS:
        return f"Effort {asked!r} is not one of {', '.join(HELPER_EFFORTS)}."
    try:
        asked = asked or _lead_effort(settings)
        cap = (settings.helper_effort_cap or "").strip().lower()
        if cap and cap not in HELPER_EFFORTS:
            return (
                f"DESIGN_AGENT_HELPER_EFFORT_CAP {cap!r} is not one of {', '.join(HELPER_EFFORTS)}."
            )
        if cap and EFFORT_ORDER.index(asked) > EFFORT_ORDER.index(cap):
            asked = cap
        resolved = resolve_model(
            settings, "helper", spec=spec, effort=asked, probe=True, project_root=project_root
        )
        build_resolved(settings, resolved, project_root=project_root)
    except Exception as error:  # noqa: BLE001 - any provider's refusal is told, never raised
        return f"{spec} cannot run here: {_why(error)}"
    if needed := missing_key(settings, spec, resolved.options, project_root):
        return f"{spec} needs {needed}, which is not set."
    return HelperChoice(str(spec), resolved.effort, resolved.caps.disclosure)


def build_helper_model(
    settings: Settings,
    model: str,
    effort: str | None = None,
    *,
    project_root: Path | None = None,
    **overrides: Any,
) -> BaseChatModel:
    """The chat model for a choice `choose_helper_model` returned. Building performs no network
    call and the model holds no run's state, so one instance per (model, effort) serves every task.
    `overrides` go to the provider class and win (tests pass api_key)."""
    resolved = resolve_model(
        settings,
        "helper",
        spec=ModelSpec.parse(model),
        effort=effort,
        probe=True,
        project_root=project_root,
    )
    kwargs: dict[str, Any] = {"streaming": True}
    if timeout := TIMEOUT_BY_EFFORT.get(resolved.effort or ""):
        kwargs["timeout"] = timeout
    return build_resolved(settings, resolved, project_root=project_root, **(kwargs | overrides))


def _lead_effort(settings: Settings) -> str:
    """The lead's effort: as set, else its model's default, else `high`."""
    return (
        (settings.model_effort or "").strip().lower()
        or resolve_model(settings, "lead").effort
        or "high"
    )


def _why(error: Exception) -> str:
    """An error's first line, without the input a validation error echoes (it can hold a key)."""
    if isinstance(error, ValidationError):
        found = error.errors(include_input=False, include_url=False)
        return str(found[0]["msg"]) if found else type(error).__name__
    return (str(error).splitlines() or [type(error).__name__])[0][:200]
