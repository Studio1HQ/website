"""Background helpers on Managed Deep Agents: MDA's async subagents, on the model the lead picks.

MDA 0.10 runs each subagent declared `"async": True` as its own graph on the Agent Server, on a
thread of its own that shares the lead's sandbox, and gives the lead deepagents' tools for it:
`start_async_task`, `check_async_task`, `update_async_task`, `cancel_async_task` and
`list_async_tasks`. A task survives a deploy, and deepagents wakes an idle lead when one ends.
This agent declares one such subagent, `worker` (`agent.py`), and the lead picks each task's model
and effort:

- `AsyncHelpersMiddleware` (the lead's) shows `start_async_task` with `model` and `effort` in place
  of `subagent_type`, checks the choice (`choose`), and stamps it on the run context deepagents
  forwards to the task's run. That context goes without MDA's routing (`mda_*` keys), so nothing
  the worker sends carries the lead's Slack binding. `update_async_task` runs a task on again on
  the choice it started with, kept on the task's record in `async_tasks`.
- `WorkerModelMiddleware` (first in the worker's own stack) swaps the stamped model in on every
  call. A run with no stamp, such as one the lead did not start, keeps the worker's own model.
- `WorkerNotesMiddleware` gives the worker `report_progress`: a note is kept in the deployment's
  store under the lead's thread, and `AsyncHelpersMiddleware` hands the lead what came in before
  its next model call. An urgent note also wakes an idle lead, the way deepagents does when a task
  ends (a run on the lead's thread through the Agent Server's own client).
- The lead names each task (`name`, a role such as "Act 3 builder"). When it starts one from a
  Slack thread it keeps that thread in the store (`SLACK_TARGETS`), and the worker draws its own
  progress line there (`progress.AsyncHelperProgressMiddleware`), found by its lead's thread: the
  thread id a caller cannot reach without owning the lead's thread.

MDA builds an async subagent's graph from a static spec, so a model cannot be declared per task;
the choice travels on the run context instead. Middleware that reads `request.model` per call
follows the swap; what deepagents settled at build time from the spec's model (its summarization
trigger) does not. The self-hosted runtime has no Agent Server, so it keeps `start_task`
(`middleware/background.py`).
"""

from __future__ import annotations

import dataclasses
import logging
import time
import uuid
from collections.abc import Awaitable, Callable, Mapping
from pathlib import Path
from typing import Any

from deepagents.middleware.async_subagents import StartAsyncTaskSchema
from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse
from langchain.agents.middleware.types import ModelCallResult
from langchain.tools import ToolRuntime
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tools import BaseTool, StructuredTool
from langgraph.config import get_config
from langgraph.types import Command
from langgraph_sdk import get_client
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from design_agent.config import Settings
from design_agent.models.helpers import HelperChoice, choose_helper_model
from design_agent.models.registry import ToolDisclosure
from design_agent.subagents import WORKERS

_LOGGER = logging.getLogger(__name__)

#: The async subagent every task the lead starts runs on (`agent.py` declares it by this name).
WORKER = "worker"
#: Where the lead's choice travels on the task's run context:
#: `{"model": ..., "effort": ..., "disclosure": ...}`.
CHOICE_KEY = "design_agent_helper"
START, UPDATE = "start_async_task", "update_async_task"
#: Where a worker's progress notes wait for its lead, under the lead's thread id.
NOTES = ("design_agent", "helper_notes")
#: Where the lead keeps the Slack thread it started tasks from, under its own thread id.
SLACK_TARGETS = ("design_agent", "slack_target")
#: Lead thread statuses a wake-up run can start on: neither running nor waiting for a person.
_WAKEABLE = frozenset({"idle", "error"})
#: deepagents' key for an async run's parent reference, which it adds itself.
_PARENT_KEY = "deepagents_parent"
#: MDA's routing keys on a run context: a Slack binding the worker must not carry.
_ROUTING_PREFIX = "mda_"
#: Where deepagents' description lists its agent types, which the lead sees as a choice instead.
_TYPES_HEAD, _USAGE_HEAD = "Available async agent types:", "## Usage notes:"

Choose = Callable[[str, str], "HelperChoice | str"]
BuildModel = Callable[[str, str], BaseChatModel]


def choose(
    settings: Settings, model: str, effort: str, *, project_root: Path | None = None
) -> HelperChoice | str:
    """The lead's choice, checked (`models.helpers.choose_helper_model`): any `provider:model`
    LangChain can build here, empty for the helper default, at an effort that model takes under
    the deployment's cap. A refusal says what to fix."""
    picked = choose_helper_model(settings, model or None, effort or None, project_root=project_root)
    return f"Not started: {picked}" if isinstance(picked, str) else picked


def stamped(context: object) -> tuple[str, str] | None:
    """The model and effort stamped on a run context or a task record, or None."""
    data = _as_mapping(context)
    chosen = data.get(CHOICE_KEY) if data is not None else None
    if not isinstance(chosen, Mapping):
        return None
    model, effort = chosen.get("model"), chosen.get("effort")
    return (model, effort) if isinstance(model, str) and isinstance(effort, str) else None


def helper_label(context: object) -> str:
    """How people are told which helper this is: the role the lead named, else its model."""
    data = _as_mapping(context)
    chosen = data.get(CHOICE_KEY) if data is not None else None
    if not isinstance(chosen, Mapping):
        return ""
    name, model = chosen.get("name"), chosen.get("model")
    if isinstance(name, str) and name:
        return name
    return f"Helper on {str(model).rpartition('/')[2].rpartition(':')[2]}" if model else ""


def forwarded(context: object) -> dict[str, Any]:
    """A run context as data for a task's run: without deepagents' parent reference, MDA's
    routing, or a choice that came back on a finished task's notification."""
    data = _as_mapping(context) or {}
    return {
        str(key): value
        for key, value in data.items()
        if key not in {_PARENT_KEY, CHOICE_KEY} and not str(key).startswith(_ROUTING_PREFIX)
    }


def _as_mapping(context: object) -> Mapping[str, Any] | None:
    if isinstance(context, BaseModel):
        return context.model_dump(mode="json")
    if dataclasses.is_dataclass(context) and not isinstance(context, type):
        return dataclasses.asdict(context)
    return context if isinstance(context, Mapping) else None


class _StartSchema(StartAsyncTaskSchema):
    # Every task runs on `worker`, so the lead is not shown a type.
    subagent_type: SkipJsonSchema[str] = WORKER
    model: str = Field(
        default="",
        description=(
            "The model this helper runs on: any LangChain `provider:model`. Empty for the default."
        ),
    )
    effort: str = Field(
        default="",
        description=(
            "Its reasoning effort: low, medium, high, xhigh or max, as the model takes it. Empty "
            "for the model's default."
        ),
    )
    name: str = Field(
        default="",
        description=(
            'A short role name, 2 to 4 words, like "Act 3 builder" or "Critic". It heads the '
            "helper's progress line in the thread."
        ),
    )


def listing(settings: Settings) -> str:
    """What the lead reads in place of deepagents' agent types."""
    uses = "\n".join(f"- `{worker.effort}`: {worker.use}" for worker in WORKERS)
    return (
        "Every task runs on a helper with the same tools and skills as you. Pick its `model`: any "
        f"LangChain `provider:model` (default {settings.role_model('helper')}), and its "
        f"`effort`, matched to the work:\n{uses}\nIts whole prompt is your `description`: send a "
        "complete brief. Give it a `name`, the role people see in the thread."
    )


class AsyncHelpersMiddleware(AgentMiddleware[Any, Any, Any]):
    """The lead's side: `start_async_task` with `model` and `effort` (module doc)."""

    def __init__(self, settings: Settings, choose_for: Choose, *, slack: Any = None) -> None:
        super().__init__()
        self._listing = listing(settings)
        self._choose = choose_for
        self._slack = slack

    async def abefore_model(self, state: Any, runtime: Any) -> dict[str, Any] | None:  # noqa: ARG002
        """Hand the lead the progress notes its tasks sent since its last model call."""
        store = getattr(runtime, "store", None)
        thread = (get_config().get("configurable") or {}).get("thread_id")
        if store is None or not thread:
            return None
        items = await store.asearch((*NOTES, str(thread)), limit=50)
        if not items:
            return None
        for item in items:
            await store.adelete(item.namespace, item.key)
        notes = sorted((item.value for item in items), key=lambda note: note.get("at", 0))
        return {"messages": [notes_message(notes)]}

    async def _keep_slack_thread(self, runtime: Any) -> None:
        """Keep the Slack thread this lead answers, for its tasks' progress lines (module doc)."""
        config = getattr(runtime, "config", None) or {}
        thread = (config.get("configurable") or {}).get("thread_id")
        binding = self._slack.bound(str(thread)) if self._slack is not None and thread else None
        store = getattr(runtime, "store", None)
        if binding is None or store is None:
            return
        target = binding.target
        event = {"channel": target.channel, "ts": target.thread_ts, "thread_ts": target.thread_ts}
        event |= {"team": target.team_id, "user": target.user_id}
        await store.aput(SLACK_TARGETS, str(thread), event)

    def _shown(self, tool: Any) -> Any:
        if not isinstance(tool, BaseTool) or tool.name != START:
            return tool
        head, found, rest = (tool.description or "").partition(_TYPES_HEAD)
        _, usage, notes = rest.partition(_USAGE_HEAD)
        text = f"{head}{self._listing}\n\n{usage}{notes}" if found and usage else tool.description
        return tool.model_copy(update={"args_schema": _StartSchema, "description": text})

    def _with_start(self, request: ModelRequest[Any]) -> ModelRequest[Any]:
        tools = [self._shown(tool) for tool in request.tools]
        changed = any(new is not old for new, old in zip(tools, request.tools, strict=True))
        return request.override(tools=tools) if changed else request

    def wrap_model_call(
        self, request: ModelRequest[Any], handler: Callable[[ModelRequest[Any]], ModelResponse[Any]]
    ) -> ModelResponse[Any]:
        return handler(self._with_start(request))

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], Awaitable[ModelResponse[Any]]],
    ) -> ModelResponse[Any]:
        return await handler(self._with_start(request))

    async def awrap_tool_call(
        self, request: Any, handler: Callable[[Any], Awaitable[Any]]
    ) -> ToolMessage | Command[Any]:
        call = request.tool_call
        name = call.get("name")
        if name == START:
            args = dict(call.get("args") or {})
            picked = self._choose(
                str(args.pop("model", "") or ""), str(args.pop("effort", "") or "")
            )
            if isinstance(picked, str):
                return ToolMessage(picked, tool_call_id=call["id"], status="error")
            chosen: Mapping[str, str] | None = {
                "model": picked.model,
                "effort": picked.effort or "",
                "disclosure": picked.disclosure.value,
                "name": " ".join(str(args.pop("name", "") or "").split())[:40],
            }
            request = request.override(
                tool_call={**call, "args": {**args, "subagent_type": WORKER}}
            )
            await self._keep_slack_thread(getattr(request, "runtime", None))
        elif name == UPDATE:
            chosen = _chosen_for(request, str((call.get("args") or {}).get("task_id") or ""))
        else:
            result: ToolMessage | Command[Any] = await handler(request)
            return result
        result = await handler(_with_choice(request, chosen))
        return _marked(result, chosen) if name == START and chosen is not None else result


def _with_choice(request: Any, chosen: Mapping[str, str] | None) -> Any:
    """`request` with a runtime whose context is what the task's run gets (`forwarded`), plus the
    model and effort it runs on."""
    runtime = getattr(request, "runtime", None)
    if not dataclasses.is_dataclass(runtime) or isinstance(runtime, type):
        return request
    context = forwarded(getattr(runtime, "context", None))
    if chosen is not None:
        context[CHOICE_KEY] = dict(chosen)
    return request.override(runtime=dataclasses.replace(runtime, context=context or None))


def _chosen_for(request: Any, task_id: str) -> Mapping[str, str] | None:
    """The choice a task started on, from its record: a follow-up keeps its model and its cache."""
    state = getattr(request, "state", None)
    tasks = state.get("async_tasks") if isinstance(state, Mapping) else None
    task = tasks.get(task_id) if isinstance(tasks, Mapping) else None
    data = _as_mapping(task)
    chosen = data.get(CHOICE_KEY) if data is not None else None
    return dict(chosen) if isinstance(chosen, Mapping) else None


def _marked(result: Any, chosen: Mapping[str, str]) -> Any:
    """The started task's record carrying its choice; deepagents' later updates keep the key."""
    update = getattr(result, "update", None)
    if not isinstance(update, Mapping):
        return result
    tasks = update.get("async_tasks")
    if not isinstance(tasks, Mapping) or len(tasks) != 1:
        return result
    ((task_id, task),) = tasks.items()
    marked = {**task, CHOICE_KEY: dict(chosen)}
    return dataclasses.replace(result, update={**update, "async_tasks": {task_id: marked}})


class WorkerModelMiddleware(AgentMiddleware[Any, Any, Any]):
    """The worker's side: each model call runs on the stamped model and effort (module doc)."""

    def __init__(self, build: BuildModel) -> None:
        super().__init__()
        self._build = build
        self._built: dict[tuple[str, str], BaseChatModel | None] = {}

    def _swapped(self, request: ModelRequest[Any]) -> ModelRequest[Any]:
        chosen = stamped(getattr(request.runtime, "context", None))
        if chosen is None:
            return request
        if chosen not in self._built:
            try:
                self._built[chosen] = self._build(*chosen)
            except Exception:  # noqa: BLE001 - the lead checked it; a later deploy may not build it
                _LOGGER.warning("[worker] %s at %s no longer builds; using the default", *chosen)
                self._built[chosen] = None
        model = self._built[chosen]
        return request if model is None else request.override(model=model)

    def wrap_model_call(
        self, request: ModelRequest[Any], handler: Callable[[ModelRequest[Any]], ModelResponse[Any]]
    ) -> ModelResponse[Any]:
        return handler(self._swapped(request))

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], Awaitable[ModelResponse[Any]]],
    ) -> ModelResponse[Any]:
        return await handler(self._swapped(request))


class WorkerDisclosure(AgentMiddleware[Any, Any, Any]):
    """MCP tool disclosure for the model each call runs on. The worker's model changes per task,
    and provider-native tool search fails on a model without it (`middleware/tool_disclosure.py`),
    so it is picked per call: the disclosure checked with the task's choice, else the default's."""

    def __init__(
        self,
        default: ToolDisclosure,
        for_disclosure: Callable[[ToolDisclosure], AgentMiddleware[Any, Any, Any] | None],
    ) -> None:
        super().__init__()
        self._default = default
        self._for = for_disclosure
        self._made: dict[ToolDisclosure, AgentMiddleware[Any, Any, Any] | None] = {}

    def _pick(self, request: ModelRequest[Any]) -> AgentMiddleware[Any, Any, Any] | None:
        data = _as_mapping(getattr(request.runtime, "context", None)) or {}
        chosen = data.get(CHOICE_KEY)
        raw = chosen.get("disclosure") if isinstance(chosen, Mapping) else None
        disclosure = ToolDisclosure(raw) if raw in set(ToolDisclosure) else self._default
        if disclosure not in self._made:
            self._made[disclosure] = self._for(disclosure)
        return self._made[disclosure]

    def wrap_model_call(
        self, request: ModelRequest[Any], handler: Callable[[ModelRequest[Any]], ModelResponse[Any]]
    ) -> ModelCallResult[Any]:
        inner = self._pick(request)
        return handler(request) if inner is None else inner.wrap_model_call(request, handler)

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], Awaitable[ModelResponse[Any]]],
    ) -> ModelCallResult[Any]:
        inner = self._pick(request)
        if inner is None:
            return await handler(request)
        return await inner.awrap_model_call(request, handler)


def notes_message(notes: list[Mapping[str, Any]]) -> HumanMessage:
    """Progress notes as one message to the lead, marked as not from a person."""
    lines = "\n".join(
        f"- {note.get('task', '?')}{' (urgent)' if note.get('urgent') else ''}: {note.get('note')}"
        for note in notes
    )
    return HumanMessage(
        "<helper-notes>\nProgress notes from your background tasks, not from a person:\n"
        f"{lines}\n</helper-notes>"
    )


def _lead_assistant(config: Mapping[str, Any]) -> str | None:
    reference = (config.get("configurable") or {}).get(_PARENT_KEY)
    assistant = reference.get("assistant_id") if isinstance(reference, Mapping) else None
    assistant = assistant or (config.get("metadata") or {}).get("parent_assistant_id")
    return str(assistant) if assistant else None


async def _wake_lead(config: Mapping[str, Any], context: object, note: Mapping[str, Any]) -> bool:
    """Start a run on an idle lead's thread with `note`; False when it is busy or out of reach,
    and it then reads the note before its next model call. Never raises."""
    lead, assistant = lead_thread(config), _lead_assistant(config)
    if lead is None or assistant is None:
        return False
    try:
        client = get_client()
        if (await client.threads.get(thread_id=lead)).get("status") not in _WAKEABLE:
            return False
        payload: dict[str, Any] = {
            "messages": [{"role": "user", "content": notes_message([note]).text}]
        }
        kept: dict[str, Any] | None = forwarded(context) or None
        await client.runs.create(
            thread_id=lead,
            assistant_id=assistant,
            input=payload,
            multitask_strategy="reject",
            context=kept,
        )
    except Exception as error:  # noqa: BLE001 - the note still waits in the store
        _LOGGER.info("[worker] lead not woken for an urgent note: %s", type(error).__name__)
        return False
    return True


def lead_thread(config: Mapping[str, Any]) -> str | None:
    """The lead's thread, from deepagents' parent reference or the task thread's metadata."""
    reference = (config.get("configurable") or {}).get(_PARENT_KEY)
    thread = reference.get("thread_id") if isinstance(reference, Mapping) else None
    thread = thread or (config.get("metadata") or {}).get("parent_thread_id")
    return str(thread) if thread else None


async def report_progress(note: str, runtime: ToolRuntime, urgent: bool = False) -> str:
    """Tell the lead how this task is going.

    Send one when a section is done, when something blocks you or moves your ETA, and before you
    stop early: one or two sentences on what happened and what comes next, with a time. The lead
    reads it before its next step. Set `urgent` when the lead must act: you are blocked on a
    decision, or the plan no longer works; an idle lead is then woken for it.
    """
    config = runtime.config or {}
    lead, store = lead_thread(config), runtime.store
    if lead is None or store is None:
        return "This task has no lead to tell; put it in your final report instead."
    task = helper_label(runtime.context) or str(
        (config.get("configurable") or {}).get("thread_id") or "task"
    )
    value = {"task": task, "note": note.strip()[:600], "urgent": urgent, "at": time.time()}
    if urgent and await _wake_lead(config, runtime.context, value):
        return "Sent; the lead was woken for it."
    await store.aput((*NOTES, lead), uuid.uuid4().hex, value)
    return "Sent; the lead reads it before its next step."


class WorkerNotesMiddleware(AgentMiddleware[Any, Any, Any]):
    """Gives the worker `report_progress` (module doc)."""

    def __init__(self) -> None:
        super().__init__()
        self.tools = [
            StructuredTool.from_function(coroutine=report_progress, name="report_progress")
        ]
