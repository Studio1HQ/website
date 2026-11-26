"""Repairs for the OpenAI-style routes models reach besides OpenAI's own Responses API.

`factory.py` builds every OpenAI-family model as `CompatChatOpenAI`: OpenAI itself, an
OpenAI-compatible endpoint (`DESIGN_AGENT_<ROLE>_MODEL_BASE_URL`), and the LangSmith Gateway's
native and shared routes. Each repair says what it fixes; each is a no-op where nothing needs it.
"""

from __future__ import annotations

import re
from collections.abc import AsyncIterator, Iterator
from typing import Any

from langchain_core.language_models.base import LanguageModelInput
from langchain_core.messages import AIMessage
from langchain_core.messages.ai import UsageMetadata, subtract_usage
from langchain_core.outputs import ChatGenerationChunk, ChatResult
from langchain_openai import ChatOpenAI
from langchain_openai.chat_models import base as _openai_chat_module
from openai.types.responses import ResponseFunctionCallArgumentsDeltaEvent


async def _with_done_arguments(events: AsyncIterator[Any]) -> AsyncIterator[Any]:
    """A Responses stream in which a tool call's arguments always arrive as a delta."""
    streamed: set[str] = set()
    try:
        async for event in events:
            kind = getattr(event, "type", "")
            if kind == "response.output_item.added":
                item = getattr(event, "item", None)
                if getattr(item, "type", "") == "function_call" and getattr(item, "arguments", ""):
                    streamed.add(str(getattr(item, "id", "")))
            elif kind == "response.function_call_arguments.delta":
                streamed.add(event.item_id)
            elif kind == "response.function_call_arguments.done" and event.item_id not in streamed:
                streamed.add(event.item_id)
                yield ResponseFunctionCallArgumentsDeltaEvent.model_construct(
                    type="response.function_call_arguments.delta",
                    delta=event.arguments,
                    item_id=event.item_id,
                    output_index=event.output_index,
                    sequence_number=event.sequence_number,
                )
            yield event
    finally:
        if close := getattr(events, "aclose", None):
            await close()


def _stream_tool_arguments_whole() -> None:
    """Route every async stream `langchain_openai` reads through `_with_done_arguments`.

    The gateway can send a streamed tool call's arguments only in its closing `.done` event, and
    LangChain reads them from deltas alone, so the call arrived with empty arguments. The helper
    is looked up by name in the chat model module, so wrapping it there covers every OpenAI-family
    model; a release that renames it leaves streams as they were. Idempotent.
    """
    original = getattr(_openai_chat_module, "_astream_with_chunk_timeout", None)
    if original is None or getattr(original, "_done_arguments", False):
        return

    def wrapped(*args: Any, **kwargs: Any) -> AsyncIterator[Any]:
        return _with_done_arguments(original(*args, **kwargs))

    wrapped._done_arguments = True  # type: ignore[attr-defined]
    _openai_chat_module._astream_with_chunk_timeout = wrapped  # type: ignore[attr-defined]


_stream_tool_arguments_whole()

#: Look-ahead and look-behind, which OpenAI's and Gemini's schema compilers refuse.
_LOOKAROUND = re.compile(r"\(\?<?[=!]")


def _compilable(schema: Any) -> Any:
    """A tool schema without the regex `pattern`s the provider cannot compile (one fails the whole
    request with a 400; the tool still validates its own input)."""
    if isinstance(schema, dict):
        return {
            key: _compilable(value)
            for key, value in schema.items()
            if not (key == "pattern" and isinstance(value, str) and _LOOKAROUND.search(value))
        }
    if isinstance(schema, list):
        return [_compilable(value) for value in schema]
    return schema


def _searchless(tool: Any) -> Any:
    """A tool as a route without server-side tool search takes it: no `defer_loading` flag."""
    if isinstance(tool, dict) and "defer_loading" in tool:
        return {key: value for key, value in tool.items() if key != "defer_loading"}
    return tool


def _is_search_tool(tool: Any) -> bool:
    return isinstance(tool, dict) and "tool_search" in str(tool.get("type", ""))


def _is_image(part: object) -> bool:
    return isinstance(part, dict) and part.get("type") == "image_url"


def _hoist_tool_images(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Move every image out of a tool message into a user message after that turn's results."""
    out: list[dict[str, Any]] = []
    held: list[dict[str, Any]] = []
    for message in messages:
        is_tool = message.get("role") == "tool"
        if held and not is_tool:
            out.append({"role": "user", "content": held})
            held = []
        content = message.get("content")
        if is_tool and isinstance(content, list) and any(_is_image(part) for part in content):
            images = [part for part in content if _is_image(part)]
            said = [
                str(part.get("text", "")) if isinstance(part, dict) else str(part)
                for part in content
                if not _is_image(part)
            ]
            said.append(f"[{len(images)} image(s) from this result are in the next message]")
            message = {**message, "content": "\n".join(text for text in said if text)}
            held += [{"type": "text", "text": "Image(s) a tool returned:"}, *images]
        out.append(message)
    if held:
        out.append({"role": "user", "content": held})
    return out


def _billed_usage(usage: UsageMetadata) -> UsageMetadata:
    """Usage with thinking the response left out of `output_tokens` counted as output."""
    hidden = usage["total_tokens"] - usage["input_tokens"] - usage["output_tokens"]
    if hidden <= 0:
        return usage
    details: dict[str, Any] = dict(usage.get("output_token_details") or {})
    details["reasoning"] = max(int(details.get("reasoning") or 0), hidden)
    billed = dict(usage) | {
        "output_tokens": usage["output_tokens"] + hidden,
        "output_token_details": details,
    }
    return UsageMetadata(**billed)  # type: ignore[typeddict-item,no-any-return]


def _as_added(chunk: ChatGenerationChunk, running: UsageMetadata | None) -> UsageMetadata | None:
    """Rewrite a chunk's running usage total to what it adds; returns the new running total."""
    message = chunk.message
    usage = message.usage_metadata if isinstance(message, AIMessage) else None
    if not usage or not isinstance(message, AIMessage):
        return running
    billed = _billed_usage(usage)
    message.usage_metadata = subtract_usage(billed, running) if running else billed
    return billed


class CompatChatOpenAI(ChatOpenAI):
    """ChatOpenAI with the repairs its route needs."""

    #: Whether the route searches deferred tools server-side (OpenAI's own Responses API).
    tool_search: bool = True
    #: Whether usage comes from Gemini, which reports streamed usage as a running total and
    #: leaves its thinking out of `output_tokens` on OpenAI-compatible routes.
    gemini_usage: bool = False

    def _get_request_payload(
        self, input_: LanguageModelInput, *, stop: list[str] | None = None, **kwargs: Any
    ) -> dict[str, Any]:
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)
        tools = payload.get("tools")
        if isinstance(tools, list):
            tools = [_compilable(tool) for tool in tools]
            if not self.tool_search:
                # A route without tool search refuses its search tool and the `defer_loading` flag.
                tools = [_searchless(tool) for tool in tools if not _is_search_tool(tool)]
            if tools:
                payload["tools"] = tools
            else:
                payload.pop("tools")
                payload.pop("tool_choice", None)
        if isinstance(payload.get("messages"), list):
            # Chat Completions takes no image part in a tool message: it follows as a user turn.
            payload["messages"] = _hoist_tool_images(payload["messages"])
        return payload

    def _generate(self, *args: Any, **kwargs: Any) -> ChatResult:
        return self._billed(super()._generate(*args, **kwargs))

    async def _agenerate(self, *args: Any, **kwargs: Any) -> ChatResult:
        return self._billed(await super()._agenerate(*args, **kwargs))

    def _stream(self, *args: Any, **kwargs: Any) -> Iterator[ChatGenerationChunk]:
        running: UsageMetadata | None = None
        for chunk in super()._stream(*args, **kwargs):
            if self.gemini_usage:
                running = _as_added(chunk, running)
            yield chunk

    async def _astream(self, *args: Any, **kwargs: Any) -> AsyncIterator[ChatGenerationChunk]:
        running: UsageMetadata | None = None
        async for chunk in super()._astream(*args, **kwargs):
            if self.gemini_usage:
                running = _as_added(chunk, running)
            yield chunk

    def _billed(self, result: ChatResult) -> ChatResult:
        if self.gemini_usage:
            for generation in result.generations:
                message = generation.message
                if isinstance(message, AIMessage) and message.usage_metadata:
                    message.usage_metadata = _billed_usage(message.usage_metadata)
        return result
