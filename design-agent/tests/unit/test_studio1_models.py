"""The Studio1 setup, proven offline: Opus leads, Nebius models help, every model is priced, and
the web search MCP example parses. Nothing here calls a model or a search provider."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from dotenv import dotenv_values

from design_agent.config import Settings
from design_agent.harness.meter import cost_of
from design_agent.models.factory import build_chat_model, resolve_model
from design_agent.tools.mcp import declared_servers

ROOT = Path(__file__).resolve().parents[2]
NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/"
ROLE_MODELS = {
    "helper": "moonshotai/Kimi-K3.1-Pro",
    "look": "Qwen/Qwen3.8-27B",
    "tool_selector": "zai-org/GLM-5.3-Flash",
    "learning": "zai-org/GLM-5.3-Flash",
}


@pytest.fixture
def studio1(monkeypatch: pytest.MonkeyPatch) -> Settings:
    """The example block applied as environment variables, with fake keys."""
    block = dotenv_values(ROOT / "config" / "studio1.env.example")
    assert block["NEBIUS_API_KEY"] == "" and block["ANTHROPIC_API_KEY"] == ""
    for name, value in block.items():
        monkeypatch.setenv(name, value or "")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-anthropic")
    monkeypatch.setenv("NEBIUS_API_KEY", "fake-nebius")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    monkeypatch.delenv("LANGSMITH_GATEWAY_API_KEY", raising=False)
    return Settings(_env_file=None)  # type: ignore[call-arg]


def test_the_block_resolves_each_role_to_its_model_and_endpoint(studio1: Settings) -> None:
    assert str(studio1.role_model("lead")) == "anthropic:claude-opus-5-5"
    for role, model in ROLE_MODELS.items():
        spec = studio1.role_model(role)  # type: ignore[arg-type]
        assert (spec.provider, spec.model) == ("openai", model)
        options = studio1.model_options(role)  # type: ignore[arg-type]
        assert options.base_url == NEBIUS_URL
        assert options.api_key_env == "NEBIUS_API_KEY"
    assert studio1.model_options("lead").base_url is None
    assert studio1.model_options("helper").vision is True
    assert studio1.model_options("look").vision is True


def test_each_role_is_built_against_nebius_and_the_lead_against_anthropic(
    studio1: Settings,
) -> None:
    for role, model in ROLE_MODELS.items():
        chat = build_chat_model(studio1, role)  # type: ignore[arg-type]
        assert chat.model_name == model  # type: ignore[attr-defined]
        assert chat.openai_api_base == NEBIUS_URL  # type: ignore[attr-defined]
        assert chat.openai_api_key.get_secret_value() == "fake-nebius"  # type: ignore[attr-defined]
        assert chat.use_responses_api is False, "Chat Completions, as for any compatible endpoint"  # type: ignore[attr-defined]
    lead = build_chat_model(studio1, "lead")
    assert lead.model == "claude-opus-5-5"  # type: ignore[attr-defined]
    assert "nebius" not in str(lead.anthropic_api_url)  # type: ignore[attr-defined]
    assert lead.anthropic_api_key.get_secret_value() == "fake-anthropic"  # type: ignore[attr-defined]


def test_the_vision_flags_settle_the_roles_that_look_at_images(studio1: Settings) -> None:
    for role in ("helper", "look"):
        resolved = resolve_model(studio1, role)  # type: ignore[arg-type]
        assert resolved.caps.vision is True
    # Without the flag the harness has no data: it runs the role but cannot call it verified.
    bare = studio1.model_copy(update={"look_model_vision": None})
    assert resolve_model(bare, "look").caps.vision is None


def test_nebius_models_use_the_portable_path_with_no_provider_features(studio1: Settings) -> None:
    for role in ROLE_MODELS:
        caps = resolve_model(studio1, role).caps  # type: ignore[arg-type]
        assert caps.disclosure.name == "PORTABLE_SELECTOR"
        assert not caps.cache_ttls and not caps.server_context_editing


@pytest.mark.parametrize(
    ("model", "usage"),
    [
        ("openai:moonshotai/Kimi-K3.1-Pro", {"input_tokens": 1000, "output_tokens": 500}),
        ("moonshotai/Kimi-K3.1-Pro", {"input_tokens": 1000, "output_tokens": 500}),
        ("Kimi-K3.1-Pro", {"input_tokens": 1000, "output_tokens": 500}),
        ("openai:Qwen/Qwen3.8-27B", {"input_tokens": 1000, "output_tokens": 500}),
        ("openai:zai-org/GLM-5.3-Flash", {"input_tokens": 1000, "output_tokens": 500}),
        (
            "openai:zai-org/GLM-5.3-Flash",
            {
                "input_tokens": 1000,
                "output_tokens": 500,
                "input_token_details": {"cache_read": 400},
            },
        ),
        ("anthropic:claude-opus-5-5", {"input_tokens": 1000, "output_tokens": 500}),
        ("claude-opus-5-5", {"input_tokens": 1000, "output_tokens": 500}),
    ],
)
def test_the_meter_prices_every_model_in_the_setup(model: str, usage: dict[str, object]) -> None:
    assert cost_of(usage, model).usd > 0


def test_nebius_cost_is_list_price_with_cache_priced_at_about_input() -> None:
    usage = {"input_tokens": 1_000_000, "output_tokens": 1_000_000}
    assert cost_of(usage, "openai:moonshotai/Kimi-K3.1-Pro").usd == pytest.approx(12.00)
    assert cost_of(usage, "openai:Qwen/Qwen3.8-27B").usd == pytest.approx(3.45)
    assert cost_of(usage, "openai:zai-org/GLM-5.3-Flash").usd == pytest.approx(0.65)
    cached = {**usage, "input_token_details": {"cache_read": 1_000_000}}
    assert cost_of(cached, "openai:zai-org/GLM-5.3-Flash").usd == pytest.approx(0.64)


def _copy_to_project(tmp_path: Path, text: str) -> Path:
    (tmp_path / "config").mkdir()
    (tmp_path / "config" / "mcp.toml").write_text(text, encoding="utf-8")
    return tmp_path


def test_the_mcp_example_enables_the_router_only(tmp_path: Path) -> None:
    text = (ROOT / "config" / "mcp.studio1.example.toml").read_text(encoding="utf-8")
    servers = declared_servers(_copy_to_project(tmp_path, text))
    assert [s.name for s in servers] == ["router"]
    router = servers[0]
    assert router.url == "http://127.0.0.1:8765/mcp" and router.transport == "http"
    assert router.owner == "agent" and router.connection is None
    # The router refuses callers without its shared secret, so the entry sends it.
    assert router.headers_env == {"Authorization": "STUDIO1_ROUTER_AUTHORIZATION"}


def test_the_commented_mcp_entries_parse_once_uncommented(tmp_path: Path) -> None:
    text = (ROOT / "config" / "mcp.studio1.example.toml").read_text(encoding="utf-8")
    entry = re.compile(r"^# (\[servers\.[a-z0-9]+\]|[A-Za-z_\"-]+ = .*)$")
    uncommented = "\n".join(m.group(1) for line in text.splitlines() if (m := entry.match(line)))
    servers = declared_servers(
        _copy_to_project(tmp_path, uncommented.replace("<", "").replace(">", ""))
    )
    assert [s.name for s in servers] == ["olostep", "brightdata", "scrapegraphai"]
