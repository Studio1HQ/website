"""Router settings from a TOML file, re-read whenever its modification time changes."""

from __future__ import annotations

import logging
import tomllib
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from studio1_router.providers import ALL

_LOGGER = logging.getLogger(__name__)

TOOL_CAPABILITY = {
    "web_search": "search",
    "read_page": "read",
    "extract_fields": "extract",
    "lookup_company": "lookup",
}
DEFAULT_ORDER = {
    "web_search": ("brightdata", "olostep"),
    "read_page": ("olostep", "brightdata"),
    "extract_fields": ("scrapegraph", "olostep"),
    "lookup_company": ("github",),
}
DEFAULT_MAX_CHARS = 20_000
#: Whatever the config says, a page is never returned longer than this.
HARD_MAX_CHARS = 200_000


class ConfigError(ValueError):
    """The router config is malformed."""


@dataclass(frozen=True)
class ProviderConfig:
    enabled: bool = True
    monthly_cap: int | None = None
    timeout: float = 30.0
    disabled_tools: frozenset[str] = frozenset()
    options: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class RouterConfig:
    state_dir: Path
    order: Mapping[str, tuple[str, ...]]
    max_chars: int
    providers: Mapping[str, ProviderConfig]

    def provider(self, name: str) -> ProviderConfig:
        return self.providers.get(name) or default_provider(name)


def default_provider(name: str) -> ProviderConfig:
    """With no config, a capability whose endpoint is unverified stays off."""
    provider = ALL.get(name)
    off = {t for t, c in TOOL_CAPABILITY.items() if provider and not provider.VERIFIED.get(c, True)}
    return ProviderConfig(disabled_tools=frozenset(off))


def _table(value: Any, where: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ConfigError(f"{where} must be a table")
    return value


def parse(data: Mapping[str, Any]) -> RouterConfig:
    defaults = _table(data.get("defaults"), "defaults")
    timeout = float(defaults.get("timeout", 30))
    order = dict(DEFAULT_ORDER)
    max_chars = DEFAULT_MAX_CHARS
    for tool, raw in _table(data.get("tools"), "tools").items():
        if tool not in TOOL_CAPABILITY:
            raise ConfigError(f"unknown tool {tool!r}")
        table = _table(raw, f"tools.{tool}")
        if "providers" in table:
            names = table["providers"]
            if not isinstance(names, list) or not all(isinstance(n, str) for n in names):
                raise ConfigError(f"tools.{tool}.providers must be a list of names")
            unknown = [n for n in names if n not in ALL]
            if unknown:
                raise ConfigError(f"tools.{tool}.providers names unknown provider {unknown[0]!r}")
            order[tool] = tuple(names)
        if tool == "read_page" and "max_chars" in table:
            max_chars = int(table["max_chars"])
    providers: dict[str, ProviderConfig] = {}
    for name, raw in _table(data.get("providers"), "providers").items():
        if name not in ALL:
            raise ConfigError(f"unknown provider {name!r}")
        table = _table(raw, f"providers.{name}")
        cap = table.get("monthly_cap")
        base = default_provider(name)
        providers[name] = ProviderConfig(
            enabled=bool(table.get("enabled", True)),
            monthly_cap=None if cap is None else int(cap),
            timeout=float(table.get("timeout", timeout)),
            disabled_tools=frozenset(table.get("disabled_tools", base.disabled_tools)),
            options={str(k): str(v) for k, v in _table(table.get("options"), "options").items()},
        )
    return RouterConfig(
        state_dir=Path(str(data.get("state_dir", "workspace/state/router"))),
        order=order,
        max_chars=max(1, min(max_chars, HARD_MAX_CHARS)),
        providers=providers,
    )


class ConfigFile:
    """Loads `path`; `get()` reloads when the file's mtime changed and keeps the old settings
    (with a warning) if the new file does not parse."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._mtime: int | None = None
        self._config = parse({})
        self._loaded = False

    def get(self) -> RouterConfig:
        try:
            mtime: int | None = self.path.stat().st_mtime_ns
        except OSError:
            mtime = None
        if self._loaded and mtime == self._mtime:
            return self._config
        try:
            data = tomllib.loads(self.path.read_text(encoding="utf-8")) if mtime is not None else {}
            self._config = parse(data)
        except (OSError, ValueError) as exc:
            if not self._loaded:
                raise ConfigError(f"{self.path}: {exc}") from exc
            _LOGGER.warning("router config %s not reloaded: %s", self.path, exc)
        self._mtime = mtime
        self._loaded = True
        return self._config
