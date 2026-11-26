"""MDA memory: a team layer for every caller, a personal layer that follows a person anywhere in Slack.

`memory.py` declares both layers with no policy, so MDA's defaults apply (personal memory in the
person's DM and Studio); the `agent.py` factory selects both for every Slack run.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[2]


def load(name: str, monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    monkeypatch.syspath_prepend(str(ROOT))
    spec = importlib.util.spec_from_file_location(f"mda_{name}", ROOT / f"{name}.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_from(provider: str | None) -> Any:
    """The part of MDA's factory runtime the selection reads: the channel a run arrived on."""
    channel = None if provider is None else SimpleNamespace(provider=provider)
    return SimpleNamespace(
        thread=SimpleNamespace(origin=channel and SimpleNamespace(channel=channel))
    )


def layer_types(memory: Any) -> list[str]:
    return [layer["type"] for layer in memory.config["scope"]]


def test_both_layers_are_declared_with_no_policy(monkeypatch: pytest.MonkeyPatch) -> None:
    layers = load("memory", monkeypatch).memory.config["scope"]
    assert [layer["type"] for layer in layers] == ["agent", "user"]
    assert not any("allow" in layer for layer in layers)


def test_a_slack_run_selects_both_layers(monkeypatch: pytest.MonkeyPatch) -> None:
    selected = load("agent", monkeypatch).agent(run_from("slack")).config["memory"]
    assert layer_types(selected) == ["agent", "user"]
    assert not any("allow" in layer for layer in selected.config["scope"])


@pytest.mark.parametrize("provider", [None, "teams"])
def test_every_other_run_keeps_the_declaration(
    provider: str | None, monkeypatch: pytest.MonkeyPatch
) -> None:
    definition = load("agent", monkeypatch).agent(run_from(provider))
    assert definition.config["name"] == "design-agent"
    assert "memory" not in definition.config


def test_the_selection_changes_nothing_but_memory(monkeypatch: pytest.MonkeyPatch) -> None:
    """MDA calls the factory again on resume, so what can interrupt a run must not depend on it."""
    agent = load("agent", monkeypatch).agent
    slack, studio = agent(run_from("slack")).config, agent(run_from(None)).config
    assert {key: value for key, value in slack.items() if key != "memory"} == studio
