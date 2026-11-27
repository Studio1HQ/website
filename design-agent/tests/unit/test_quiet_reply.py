"""A `[quiet]` reply on a real agent graph: no loop, and nothing posted where the platform skips a
reply of exactly `[quiet]` (MDA 0.10's answer delivery, `harness.notices.should_post` locally)."""

from __future__ import annotations

from typing import Any

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware, AgentState
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from design_agent.harness.notices import should_post
from design_agent.middleware.quiet import SENTINEL_MARK, QuietReplyMiddleware
from design_agent.testing.scripted_model import ScriptedChatModel, reply


class AnswerDelivery(AgentMiddleware[AgentState[Any], Any, Any]):
    """Stands in for the platform: posts the final assistant text unless it is exactly `[quiet]`."""

    def __init__(self) -> None:
        super().__init__()
        self.posted: list[str] = []

    def after_agent(self, state: AgentState[Any], runtime: Runtime[Any]) -> None:
        text = str(state["messages"][-1].text).strip()
        if should_post(text):
            self.posted.append(text)


def graph(model: ScriptedChatModel, *, running: bool) -> tuple[Any, AnswerDelivery]:
    delivery = AnswerDelivery()
    quiet = QuietReplyMiddleware(lambda _t: running, lambda: "t1")
    return create_agent(model, tools=[], middleware=[delivery, quiet]), delivery


async def test_a_quiet_line_among_chatter_settles_to_the_marker_and_posts_nothing() -> None:
    agent, delivery = graph(
        ScriptedChatModel(steps=[lambda _m: reply("Checked the render.\n[quiet]")]), running=True
    )
    result = await agent.ainvoke({"messages": [HumanMessage("<check-in>Look at the render.")]})
    assert result["messages"][-1].text == "[quiet]"
    assert delivery.posted == []


async def test_a_reply_that_only_mentions_the_marker_is_left_alone() -> None:
    text = "Reply [quiet] when nothing changed; here the render is done."
    agent, delivery = graph(ScriptedChatModel(steps=[lambda _m: reply(text)]), running=False)
    await agent.ainvoke({"messages": [HumanMessage("<check-in>Look.")]})
    assert delivery.posted == [text]


async def test_a_watchdog_turn_with_work_running_ends_without_a_model_call() -> None:
    model = ScriptedChatModel(steps=[])
    agent, delivery = graph(model, running=True)
    await agent.ainvoke(
        {"messages": [HumanMessage(f"{SENTINEL_MARK}>\nA restart may have stopped work.")]}
    )
    assert model.call_count == 0
    assert delivery.posted == []
