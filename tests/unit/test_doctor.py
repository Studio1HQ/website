"""`doctor`'s MDA deploy check: what would make a plain `mda deploy` fail or ship the wrong thing."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from design_agent.config import Settings
from design_agent.doctor import _check_mda_deploy, _check_models

ROOT = Path(__file__).resolve().parents[2]


def _project(tmp_path: Path) -> Path:
    root = tmp_path / "project"
    for name in ("skills", "skill-binaries", "licenses"):
        shutil.copytree(ROOT / name, root / name, symlinks=True)
    shutil.copytree(ROOT / ".agents", root / ".agents", symlinks=True)
    shutil.copy(ROOT / "skills-lock.json", root / "skills-lock.json")
    return root


def test_this_checkout_is_ready_for_a_plain_mda_deploy(tmp_path: Path) -> None:
    check = _check_mda_deploy(_project(tmp_path))
    assert check.status == "ok", check.detail


def test_a_binary_file_in_skills_fails_the_check(tmp_path: Path) -> None:
    root = _project(tmp_path)
    (root / "skills" / "stills" / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\n\xff\xfe")
    check = _check_mda_deploy(root)
    assert check.status == "fail"
    assert "skills/stills/logo.png" in check.detail and "skill-binaries/" in check.detail


def test_self_hosting_keys_in_env_are_named_never_printed(tmp_path: Path) -> None:
    root = _project(tmp_path)
    (root / ".env").write_text(
        "ANTHROPIC_API_KEY=sk-ant-secret\nSLACK_APP_TOKEN=xapp-secret\nDATABASE_URL=\n"
    )
    check = _check_mda_deploy(root)
    assert check.status == "warn"
    assert "SLACK_APP_TOKEN" in check.detail and "DATABASE_URL" not in check.detail
    assert "secret" not in check.detail.replace("deployment secrets", "")


def _settings(monkeypatch: pytest.MonkeyPatch, model: str) -> Settings:
    monkeypatch.setenv("DESIGN_AGENT_MODEL", model)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    return Settings(_env_file=None)  # type: ignore[call-arg]


def test_a_shell_only_model_key_is_named_first(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = _project(tmp_path)
    shutil.copytree(ROOT / "sandbox", root / "sandbox")
    settings = _settings(monkeypatch, "anthropic:claude-opus-5-5")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-only-in-the-shell")
    check = _check_mda_deploy(root, settings)
    assert check.status == "warn"
    assert check.detail.startswith("before `mda deploy`: put ANTHROPIC_API_KEY in .env")
    assert "sandbox publish" not in check.detail, "MDA bakes the 16 GiB recipe itself (0.9.5+)"
    assert "only-in-the-shell" not in check.detail and "ready" not in check.detail


def test_the_model_key_in_env_or_a_gateway_model_needs_nothing_more(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = _project(tmp_path)
    (root / ".env").write_text("ANTHROPIC_API_KEY=sk-ant-secret\n")
    assert (
        _check_mda_deploy(root, _settings(monkeypatch, "anthropic:claude-opus-5-5")).status == "ok"
    )
    (root / ".env").unlink()
    gateway = _settings(monkeypatch, "langsmith:anthropic/claude-opus-5-5")
    assert _check_mda_deploy(root, gateway).status == "ok"


def test_a_model_nothing_describes_or_prices_runs_with_both_said(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, model="mystery:model-1")  # type: ignore[call-arg]
    checks = {check.name: check for check in _check_models(settings, tmp_path)}
    lead = checks["model:lead"]
    assert lead.status == "warn" and "unverified" in lead.detail
    assert "DESIGN_AGENT_MODEL_VISION=1" in lead.detail
    assert "run cost can't be counted" in lead.detail
    registered = Settings(_env_file=None)  # type: ignore[call-arg]
    roles = [c for c in _check_models(registered, tmp_path) if c.name != "model:key"]
    assert {c.status for c in roles} == {"ok"}
