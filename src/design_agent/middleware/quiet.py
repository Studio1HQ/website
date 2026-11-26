"""`[quiet]`: a wake-up turn with nothing worth saying.

Every runtime leaves a reply of exactly `[quiet]` unposted: local and self-hosted runtimes drop it
themselves (`harness.notices.should_post`), and Managed Deep Agents (0.10) skips it when it posts a
run's answer. A model sometimes adds a line around the marker, so a final reply with a line that
is exactly `[quiet]` becomes exactly `[quiet]`.

A restart watchdog (sentinel) turn on a thread whose work still runs in this process has nothing
to report either: it ends before the model is called, with `[quiet]`.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware, AgentState, hook_config
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.runtime import Runtime

from design_agent.harness.notices import QUIET

SENTINEL_MARK = "<watchdog"
_MARK = re.compile(r"<watchdog\b[^>]*>")


def latest_human(messages: list[Any]) -> str:
    """The newest input's text, passing over date notes (`middleware/today.py`)."""
    for message in reversed(messages):
        if isinstance(message, HumanMessage) and str(message.id or "").startswith("today:"):
            continue
        if isinstance(message, HumanMessage):
            return message.text if isinstance(message.text, str) else str(message.content)
        if isinstance(message, AIMessage):
            return ""
    return ""


def final_reply(messages: list[Any]) -> str:
    if messages and isinstance(messages[-1], AIMessage) and not messages[-1].tool_calls:
        return str(messages[-1].text).strip()
    return ""


def is_watchdog_turn(messages: list[Any]) -> bool:
    return bool(_MARK.search(latest_human(messages)))


class QuietReplyMiddleware(AgentMiddleware[AgentState[Any], Any, Any]):
    """Ends quiet turns cheaply, and makes a quiet reply exactly `[quiet]` (module doc).

    `still_running(thread_id)` says whether this process still runs work for the thread.
    """

    def __init__(self, still_running: Callable[[str], bool], thread_of: Callable[[], str]) -> None:
        super().__init__()
        self._still_running = still_running
        self._thread_of = thread_of

    @property
    def name(self) -> str:
        return "DesignAgentQuietReply"

    @hook_config(can_jump_to=["end"])
    def before_agent(self, state: AgentState[Any], runtime: Runtime[Any]) -> dict[str, Any] | None:  # noqa: ARG002 - hook signature
        messages = list(state.get("messages") or [])
        if is_watchdog_turn(messages) and self._still_running(self._thread_of()):
            return {"messages": [AIMessage(content=QUIET)], "jump_to": "end"}
        return None

    async def abefore_agent(
        self, state: AgentState[Any], runtime: Runtime[Any]
    ) -> dict[str, Any] | None:
        return self.before_agent(state, runtime)

    def after_agent(self, state: AgentState[Any], runtime: Runtime[Any]) -> dict[str, Any] | None:  # noqa: ARG002 - hook signature
        messages = list(state.get("messages") or [])
        reply = final_reply(messages)
        if reply == QUIET or QUIET not in (line.strip() for line in reply.splitlines()):
            return None
        return {"messages": [AIMessage(content=QUIET, id=messages[-1].id)]}

    async def aafter_agent(
        self, state: AgentState[Any], runtime: Runtime[Any]
    ) -> dict[str, Any] | None:
        return self.after_agent(state, runtime)
