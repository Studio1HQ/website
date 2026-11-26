"""Managed Deep Agents entry. Thin: it hands the shared components to `define_deep_agent`.

`agent` is a factory MDA calls at the start of each run, so a Slack run can select both memory
layers (`memory.py`); every other run keeps the declaration. The components are built once, here.
"""

from __future__ import annotations

from pathlib import Path
from typing import TypedDict

from deepagents import SubAgent
from managed_deepagents import (
    DeepAgentDefinition,
    ManagedServerRuntime,
    MemoryDefinition,
    define_deep_agent,
)

from design_agent.config import Settings
from design_agent.middleware.tracing import template_marker
from design_agent.runtime.mda import build_mda_components
from memory import memory, slack_run

_settings = Settings()
_components = build_mda_components(_settings, project_root=Path(__file__).parent)
if _components.worker is None:
    raise RuntimeError("the MDA runtime declares background helpers: its worker is missing")
_worker = dict(_components.worker)
_helpers: list[SubAgent] = list(_components.subagents)


class _Selection(TypedDict, total=False):
    memory: MemoryDefinition


def agent(runtime: ManagedServerRuntime) -> DeepAgentDefinition:
    selection: _Selection = {"memory": memory} if slack_run(runtime) else {}
    return define_deep_agent(
        name="design-agent",
        model=_components.model,
        tools=list(_components.tools),
        middleware=list(_components.middleware),
        # MDA's build finds an async subagent by its literal `name` and `"async": True` here and
        # builds it as its own graph: every background task runs on it (async_helpers.py).
        subagents=[*_helpers, {**_worker, "name": "worker", "async": True}],
        interrupt_on=dict(_components.interrupt_on) or None,
        metadata=template_marker() if _settings.template_telemetry else None,
        **selection,
    )
