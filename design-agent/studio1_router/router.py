"""Ordered fallback across providers, with monthly caps counted from the usage log."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from collections.abc import Awaitable, Callable, Mapping
from datetime import UTC, datetime
from functools import partial
from pathlib import Path
from typing import TypeVar

import httpx

from studio1_router.config import TOOL_CAPABILITY, ConfigFile, RouterConfig
from studio1_router.providers import ALL
from studio1_router.providers.base import Call, Provider
from studio1_router.usage import UsageLog, month_of

_LOGGER = logging.getLogger(__name__)
T = TypeVar("T")
#: Git-ignored by the `config/*.toml` pattern.
DEFAULT_CONFIG = Path("config") / "router.toml"


class AllProvidersFailed(Exception):
    """No provider could serve the call. The message lists each one and why; no secrets."""


def default_config_path(flag: str | None) -> Path:
    return Path(flag or os.environ.get("STUDIO1_ROUTER_CONFIG") or DEFAULT_CONFIG)


class Router:
    def __init__(
        self,
        config_path: Path,
        *,
        env: Mapping[str, str] | None = None,
        providers: Mapping[str, Provider] | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._file = ConfigFile(config_path)
        self._env = os.environ if env is None else env
        self._providers = ALL if providers is None else providers
        self._transport = transport
        self._clock = clock

    @property
    def config(self) -> RouterConfig:
        return self._file.get()

    @property
    def usage(self) -> UsageLog:
        return UsageLog(self.config.state_dir / "usage.jsonl")

    def _skip_reason(self, tool: str, name: str, used: Callable[[], int]) -> str | None:
        provider = self._providers.get(name)
        settings = self.config.provider(name)
        if provider is None or not provider.has(TOOL_CAPABILITY[tool]):
            return f"does not offer {TOOL_CAPABILITY[tool]}"
        if not settings.enabled or tool in settings.disabled_tools:
            return "disabled"
        if provider.key_required and not self._key(provider):
            return "no key set"
        if settings.monthly_cap is not None and used() >= settings.monthly_cap:
            return "monthly cap reached"
        return None

    def _key(self, provider: Provider) -> str:
        return (self._env.get(provider.key_env) or "").strip()

    async def dispatch(
        self,
        tool: str,
        subject: str,
        context: str | None,
        invoke: Callable[[Provider, Call], Awaitable[T]],
    ) -> tuple[str, T]:
        """Try the tool's providers in order; return (provider name, result)."""
        config = self.config
        log = self.usage
        problems: list[str] = []
        async with httpx.AsyncClient(transport=self._transport) as client:
            for name in config.order[tool]:
                reason = self._skip_reason(tool, name, partial(self._used, log, name))
                if reason:
                    problems.append(f"{name}: skipped, {reason}")
                    continue
                provider = self._providers[name]
                settings = config.provider(name)
                call = Call(client, self._key(provider), settings.timeout, settings.options)
                started = time.monotonic()
                try:
                    async with asyncio.timeout(settings.timeout + 1):
                        result = await invoke(provider, call)
                except Exception as exc:  # noqa: BLE001 - any provider failure means try the next
                    error = type(exc).__name__
                    detail = str(exc) if error == "ProviderError" else error
                    problems.append(f"{name}: failed, {detail}")
                    _LOGGER.warning("%s via %s failed: %s", tool, name, detail)
                    self._record(log, tool, name, error, started, context, subject)
                else:
                    self._record(log, tool, name, None, started, context, subject)
                    return name, result
        tried = "; ".join(problems) or "no providers are configured for this tool"
        raise AllProvidersFailed(f"{tool} could not be served. {tried}")

    def _used(self, log: UsageLog, provider: str) -> int:
        counts = log.month_counts(self._clock())
        return sum(n for (p, _), n in counts.items() if p == provider)

    def _record(
        self,
        log: UsageLog,
        tool: str,
        provider: str,
        error: str | None,
        started: float,
        context: str | None,
        subject: str,
    ) -> None:
        log.record(
            tool=tool,
            provider=provider,
            error=error,
            duration_ms=int((time.monotonic() - started) * 1000),
            context=context,
            subject=subject,
            now=self._clock(),
        )

    def usage_report(self) -> str:
        now = self._clock()
        counts = self.usage.month_counts(now)
        config = self.config
        lines = [f"Router usage for {month_of(now)} (UTC)"]
        for name in sorted({*self._providers, *(p for p, _ in counts)}):
            per_tool = {t: n for (p, t), n in counts.items() if p == name}
            total = sum(per_tool.values())
            cap = config.provider(name).monthly_cap
            limit = f"{total} / {cap}" if cap is not None else f"{total} / no cap"
            detail = ", ".join(f"{t} {n}" for t, n in sorted(per_tool.items())) or "no calls"
            lines.append(f"  {name:<12} {limit:<14} {detail}")
        return "\n".join(lines)
