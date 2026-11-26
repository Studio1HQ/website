"""Small CLI commands: brand init, fonts verify, sandbox use, test db, config set."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from click.testing import CliRunner

from design_agent import cli

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def project(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    shutil.copytree(ROOT / "examples" / "brands", tmp_path / "examples" / "brands")
    shutil.copytree(ROOT / "fonts", tmp_path / "fonts")
    shutil.copy(ROOT / ".env.example", tmp_path / ".env.example")
    monkeypatch.setattr(cli, "_root", lambda: tmp_path)
    monkeypatch.setenv("DESIGN_AGENT_WORKSPACE_ROOT", str(tmp_path / "workspace"))
    return tmp_path


def test_brand_init_copies_the_sample_once(project: Path) -> None:
    (project / "workspace/brand").mkdir(parents=True)
    (project / "workspace/brand/README.md").write_text("tracked")
    first = CliRunner().invoke(cli.main, ["brand", "init"])
    assert first.exit_code == 0 and (project / "workspace/brand/brand.toml").is_file()
    assert (project / "workspace/brand/README.md").read_text() == "tracked"
    assert not (project / "workspace/brand/LICENSE").exists()
    assert CliRunner().invoke(cli.main, ["brand", "init"]).exit_code == 1


def test_fonts_verify_checks_checksums_and_licenses(project: Path) -> None:
    assert CliRunner().invoke(cli.main, ["fonts", "verify"]).exit_code == 0
    (project / "fonts" / "Unlisted-Regular.ttf").write_bytes(b"x")
    result = CliRunner().invoke(cli.main, ["fonts", "verify"])
    assert result.exit_code == 1 and "Unlisted-Regular.ttf is not listed" in result.output


def test_fonts_verify_catches_a_family_the_file_does_not_carry(project: Path) -> None:
    pack = project / "examples/brands/example-studio"
    for name in ("fonts.toml", "tokens.json"):
        text = (pack / name).read_text()
        assert '"Geist"' in text
        (pack / name).write_text(text.replace('"Geist"', '"Geist Display"'))
    result = CliRunner().invoke(cli.main, ["fonts", "verify"])
    assert result.exit_code == 1
    assert 'says family "Geist Display", the file says "Geist"' in result.output


def test_sandbox_use_points_local_runs_at_a_snapshot(project: Path) -> None:
    assert (
        CliRunner().invoke(cli.main, ["sandbox", "use", "design-agent-computer-abc"]).exit_code == 0
    )
    env = (project / ".env").read_text()
    assert (
        "DESIGN_AGENT_SANDBOX=langsmith" in env
        and "DESIGN_AGENT_SANDBOX_SNAPSHOT=design-agent-computer-abc" in env
    )


def test_test_db_writes_and_removes_a_row(project: Path) -> None:
    result = CliRunner().invoke(cli.main, ["test", "db"])
    assert result.exit_code == 0 and "SQLite" in result.output


def test_config_set_with_a_bare_key_asks_for_the_value_hidden(
    project: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli, "_can_prompt", lambda: True)
    result = CliRunner().invoke(
        cli.main, ["config", "set", "ANTHROPIC_API_KEY"], input="sk-ant-typed\n"
    )
    assert result.exit_code == 0, result.output
    assert "sk-ant-typed" not in result.output
    assert "ANTHROPIC_API_KEY=sk-ant-typed" in (project / ".env").read_text()


def test_config_set_with_a_bare_key_refuses_without_a_terminal(project: Path) -> None:
    result = CliRunner().invoke(cli.main, ["config", "set", "ANTHROPIC_API_KEY"])
    assert result.exit_code == 2
    assert "your own terminal" in result.output
    assert not (project / ".env").exists()


def test_config_set_never_prompts_for_an_unknown_key(
    project: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli, "_can_prompt", lambda: True)
    result = CliRunner().invoke(cli.main, ["config", "set", "NOT_A_KEY"], input="x\n")
    assert result.exit_code == 1 and "not a setting" in result.output
