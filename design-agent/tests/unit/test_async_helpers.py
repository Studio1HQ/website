"""Background helpers on MDA: the lead picks any model and effort per task, and the task runs on it."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

from deepagents.middleware.async_subagents import ASYNC_TASK_TOOL_DESCRIPTION
from langchain.agents import create_agent
from langchain.agents.middleware.types import ToolCallRequest
from langchain.tools import ToolRuntime
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langgraph.store.memory import InMemoryStore
from langgraph.types import Command

from design_agent.config import Settings
from design_agent.middleware.async_helpers import (
    CHOICE_KEY,
    WORKER,
    AsyncHelpersMiddleware,
    WorkerModelMiddleware,
    WorkerNotesMiddleware,
    choose,
    helper_label,
    report_progress,
)
from design_agent.middleware.progress import AsyncHelperProgressMiddleware
from design_agent.models.helpers import HelperChoice
from design_agent.models.registry import ToolDisclosure
from design_agent.surfaces.slack.target import SlackBinding, SlackTarget
from design_agent.testing.scripted_model import ScriptedChatModel, reply, tool_call

SETTINGS = Settings(  # type: ignore[call-arg]
    _env_file=None, model="anthropic:claude-opus-5-5", anthropic_api_key="a", openai_api_key="o"
)
PICKED = HelperChoice("openai:gpt-5.5", "high", ToolDisclosure.PROVIDER_NATIVE)
CHOSEN = {"model": "openai:gpt-5.5", "effort": "high", "disclosure": "provider_native", "name": ""}


def test_any_model_that_builds_is_taken_and_anything_else_says_what_to_fix() -> None:
    picked = choose(SETTINGS, "openai:gpt-5.5", "high")
    assert isinstance(picked, HelperChoice)
    assert (picked.model, picked.effort) == ("openai:gpt-5.5", "high")
    assert getattr(choose(SETTINGS, "", ""), "model", None) == "anthropic:claude-opus-5-5"
    for model, effort in (("gpt-5.5", ""), ("openai:gpt-5.5", "ultra"), ("nope:model", "")):
        refused = choose(SETTINGS, model, effort)
        assert isinstance(refused, str) and refused.startswith("Not started: "), refused


def start_tool() -> StructuredTool:
    async def start(description: str, subagent_type: str) -> str:
        return ""

    text = ASYNC_TASK_TOOL_DESCRIPTION.format(available_agents="- worker: a helper")
    return StructuredTool.from_function(coroutine=start, name="start_async_task", description=text)


def test_the_lead_is_shown_model_and_effort_instead_of_a_type() -> None:
    shown = AsyncHelpersMiddleware(SETTINGS, lambda m, e: PICKED)._shown(start_tool())
    fields = shown.args_schema.model_json_schema()["properties"]  # type: ignore[union-attr]
    assert {"description", "model", "effort"} <= fields.keys() and "subagent_type" not in fields
    assert "any LangChain `provider:model`" in shown.description
    assert "Available async agent types" not in shown.description


def call(
    name: str,
    args: dict[str, Any],
    *,
    tasks: dict[str, Any] | None = None,
    store: Any = None,
    config: dict[str, Any] | None = None,
) -> ToolCallRequest:
    state = {"messages": [], "async_tasks": tasks or {}}
    runtime = ToolRuntime(
        state=state,
        context={"brand": "acme", "mda_channel": {"provider": "slack"}, CHOICE_KEY: {"old": 1}},
        config=config or {},  # type: ignore[arg-type]
        stream_writer=lambda _: None,
        tool_call_id="c1",
        store=store,
    )
    tool_call = {"name": name, "args": args, "id": "c1", "type": "tool_call"}
    return ToolCallRequest(tool_call=tool_call, tool=None, state=state, runtime=runtime)  # type: ignore[arg-type]


async def test_a_started_task_runs_on_the_worker_with_the_choice_and_without_slack_routing() -> (
    None
):
    seen: list[ToolCallRequest] = []

    async def handler(request: ToolCallRequest) -> Command[Any]:
        seen.append(request)
        task = {"task_id": "t1", "agent_name": WORKER, "status": "running"}
        message = ToolMessage("Launched async subagent. task_id: t1", tool_call_id="c1")
        return Command(update={"messages": [message], "async_tasks": {"t1": task}})

    lead = AsyncHelpersMiddleware(SETTINGS, lambda m, e: PICKED)
    args = {
        "description": "Cut the 15s.",
        "model": "x",
        "effort": "high",
        "name": " Act 3  builder",
    }
    result = await lead.awrap_tool_call(call("start_async_task", args), handler)
    (sent,) = seen
    named = {**CHOSEN, "name": "Act 3 builder"}
    assert sent.tool_call["args"] == {"description": "Cut the 15s.", "subagent_type": WORKER}
    assert sent.runtime.context == {"brand": "acme", CHOICE_KEY: named}
    assert isinstance(result, Command) and result.update["async_tasks"]["t1"][CHOICE_KEY] == named
    assert helper_label(sent.runtime.context) == "Act 3 builder"
    assert helper_label({CHOICE_KEY: CHOSEN}) == "Helper on gpt-5.5"


class Surface:
    """The part of `SlackSurface` the lead and the worker read."""

    def __init__(self, binding: SlackBinding | None) -> None:
        self.binding = binding
        self.resolver = self

    def bound(self, thread_id: str) -> SlackBinding | None:
        return self.binding if thread_id == "lead-1" else None

    async def client(self) -> Any:
        return self.binding.client if self.binding else None


async def test_the_worker_finds_the_slack_thread_its_lead_started_it_from() -> None:
    store = InMemoryStore()
    client = SimpleNamespace(auth_failed=False)
    target = SlackTarget(
        channel="C0TEST0CHAN", thread_ts="1700000000.000100", user_id="U0TEST0USER"
    )
    surface = Surface(SlackBinding(target, client))  # type: ignore[arg-type]

    async def handler(_request: ToolCallRequest) -> str:
        return "started"

    lead = AsyncHelpersMiddleware(SETTINGS, lambda m, e: PICKED, slack=surface)
    config = {"configurable": {"thread_id": "lead-1"}}
    await lead.awrap_tool_call(
        call("start_async_task", {"description": "x"}, store=store, config=config), handler
    )
    progress = AsyncHelperProgressMiddleware(surface)  # type: ignore[arg-type]
    worker = {"configurable": {"thread_id": "task-1"}, "metadata": {"parent_thread_id": "lead-1"}}
    context = {CHOICE_KEY: {**CHOSEN, "name": "Critic"}}
    runtime = SimpleNamespace(store=store, context=context)
    with patch("design_agent.middleware.progress.get_config", return_value=worker):
        key, binding = await progress._where(runtime)
        label = progress._label()
    assert key == ("C0TEST0CHAN", "1700000000.000100", "task-1") and label == "Critic"
    assert binding is not None and binding.target.channel == "C0TEST0CHAN"
    stranger = {"configurable": {"thread_id": "task-2"}, "metadata": {"parent_thread_id": "other"}}
    with patch("design_agent.middleware.progress.get_config", return_value=stranger):
        assert await progress._where(runtime) == ((), None)


class FakeServer:
    def __init__(self, status: str) -> None:
        self.status, self.created = status, []  # type: ignore[var-annotated]
        self.threads, self.runs = self, self

    async def get(self, thread_id: str) -> dict[str, str]:
        return {"thread_id": thread_id, "status": self.status}

    async def create(self, **kwargs: Any) -> dict[str, str]:
        self.created.append(kwargs)
        return {"run_id": "r1"}


async def urgent(status: str, store: InMemoryStore) -> tuple[str, FakeServer]:
    server = FakeServer(status)
    config = {
        "configurable": {"thread_id": "task-1"},
        "metadata": {"parent_thread_id": "lead-1", "parent_assistant_id": "a-lead"},
    }
    runtime = ToolRuntime(
        state={},
        context={CHOICE_KEY: {**CHOSEN, "name": "Critic"}, "brand": "acme"},
        config=config,  # type: ignore[arg-type]
        stream_writer=lambda _: None,
        tool_call_id="c1",
        store=store,
    )
    with patch("design_agent.middleware.async_helpers.get_client", return_value=server):
        said = await report_progress("Blocked: pick a palette.", runtime, urgent=True)
    return said, server


async def test_an_urgent_note_wakes_an_idle_lead_and_waits_for_a_busy_one() -> None:
    store = InMemoryStore()
    said, server = await urgent("idle", store)
    (run,) = server.created
    assert "woken" in said and run["thread_id"] == "lead-1" and run["assistant_id"] == "a-lead"
    assert "Critic (urgent): Blocked: pick a palette." in run["input"]["messages"][0]["content"]
    assert run["context"] == {"brand": "acme"} and run["multitask_strategy"] == "reject"
    assert not await store.asearch(("design_agent", "helper_notes", "lead-1"))

    said, server = await urgent("busy", store)
    assert not server.created and "before its next step" in said
    assert len(await store.asearch(("design_agent", "helper_notes", "lead-1"))) == 1


async def test_a_choice_that_does_not_build_starts_nothing() -> None:
    async def handler(_request: ToolCallRequest) -> Any:
        raise AssertionError("not started")

    lead = AsyncHelpersMiddleware(SETTINGS, lambda m, e: "Not started: no such model.")
    result = await lead.awrap_tool_call(call("start_async_task", {"description": "x"}), handler)
    assert isinstance(result, ToolMessage) and result.status == "error"


async def test_a_follow_up_runs_on_the_choice_its_task_started_with() -> None:
    seen: list[ToolCallRequest] = []

    async def handler(request: ToolCallRequest) -> str:
        seen.append(request)
        return "updated"

    tasks = {"t1": {"task_id": "t1", CHOICE_KEY: CHOSEN}}
    lead = AsyncHelpersMiddleware(SETTINGS, lambda m, e: PICKED)
    await lead.awrap_tool_call(call("update_async_task", {"task_id": "t1"}, tasks=tasks), handler)
    assert seen[0].runtime.context == {"brand": "acme", CHOICE_KEY: CHOSEN}


async def test_the_worker_answers_on_the_stamped_model_and_its_own_without_one() -> None:
    default = ScriptedChatModel(steps=[lambda _m: reply("default"), lambda _m: reply("default")])
    picked = ScriptedChatModel(steps=[lambda _m: reply("picked")])
    asked: list[tuple[str, str]] = []

    def build(model: str, effort: str) -> Any:
        asked.append((model, effort))
        return picked

    worker = create_agent(default, tools=[], middleware=[WorkerModelMiddleware(build)])
    stamped = await worker.ainvoke({"messages": [HumanMessage("go")]}, context={CHOICE_KEY: CHOSEN})
    plain = await worker.ainvoke({"messages": [HumanMessage("go")]}, context={})
    assert stamped["messages"][-1].text == "picked" and asked == [("openai:gpt-5.5", "high")]
    assert plain["messages"][-1].text == "default"


async def test_a_workers_progress_note_reaches_its_lead_at_the_next_turn() -> None:
    store = InMemoryStore()
    note = "Act 2 is done; act 3 lands by 14:10."
    worker_model = ScriptedChatModel(
        steps=[lambda _m: tool_call("report_progress", {"note": note}), lambda _m: reply("ok")]
    )
    worker = create_agent(worker_model, tools=[], middleware=[WorkerNotesMiddleware()], store=store)
    task = {"configurable": {"thread_id": "task-1"}, "metadata": {"parent_thread_id": "lead-1"}}
    await worker.ainvoke({"messages": [HumanMessage("build act 2")]}, config=task)  # type: ignore[arg-type]

    lead_model = ScriptedChatModel(steps=[lambda _m: reply("noted")])
    middleware = [AsyncHelpersMiddleware(SETTINGS, lambda m, e: PICKED)]
    lead = create_agent(lead_model, tools=[], middleware=middleware, store=store)
    turn = {"configurable": {"thread_id": "lead-1"}}
    result = await lead.ainvoke({"messages": [HumanMessage("how is it going?")]}, config=turn)  # type: ignore[arg-type]
    notes = [m.text for m in result["messages"] if "<helper-notes>" in m.text]
    assert len(notes) == 1 and "task-1: " + note in notes[0]
    assert not await store.asearch(("design_agent", "helper_notes", "lead-1"))
