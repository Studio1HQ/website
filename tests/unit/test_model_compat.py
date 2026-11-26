"""The repairs OpenAI-style routes need (`models/compat.py`), on payloads and streams built offline."""

from __future__ import annotations

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolMessage
from langchain_core.outputs import ChatGenerationChunk

from design_agent.models.compat import CompatChatOpenAI, _as_added, _with_done_arguments

LOOKAHEAD_TOOL = {
    "type": "function",
    "function": {
        "name": "send",
        "description": "Send it.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "pattern": "^(?=.*@).+$"},
                "pattern": {"type": "string", "pattern": "^[a-z]+$"},
            },
        },
    },
}
PNG = "data:image/png;base64,iVBORw0KGgo="


def chat_model(**values: Any) -> CompatChatOpenAI:
    return CompatChatOpenAI(
        model="local-model",
        api_key="sk-test",
        base_url="https://llm.example/v1",
        use_responses_api=False,
        **values,
    )


def payload(model: CompatChatOpenAI, messages: list[Any], tools: list[Any]) -> dict[str, Any]:
    bound = model.bind_tools(tools)
    return model._get_request_payload(messages, **bound.kwargs)  # type: ignore[attr-defined]


def test_schemas_lose_only_the_patterns_a_provider_cannot_compile() -> None:
    sent = payload(chat_model(), [HumanMessage("hi")], [LOOKAHEAD_TOOL])
    properties = sent["tools"][0]["function"]["parameters"]["properties"]
    assert "pattern" not in properties["to"], "look-ahead fails the whole request"
    assert properties["pattern"] == {"type": "string", "pattern": "^[a-z]+$"}


def test_a_route_without_tool_search_gets_no_search_tool_or_deferral() -> None:
    deferred = {**LOOKAHEAD_TOOL, "defer_loading": True}
    tools = [deferred, {"type": "tool_search"}]
    without = payload(chat_model(tool_search=False), [HumanMessage("hi")], tools)
    assert [tool.get("type") for tool in without["tools"]] == ["function"]
    assert "defer_loading" not in without["tools"][0]
    only_search = payload(chat_model(tool_search=False), [HumanMessage("hi")], [tools[1]])
    assert "tools" not in only_search and "tool_choice" not in only_search


def test_chat_completions_moves_a_tools_images_into_the_next_user_turn() -> None:
    call = AIMessage("", tool_calls=[{"name": "read_file", "args": {}, "id": "c1"}])
    result = ToolMessage(
        [{"type": "text", "text": "frame 12"}, {"type": "image_url", "image_url": {"url": PNG}}],
        tool_call_id="c1",
    )
    sent = payload(chat_model(), [HumanMessage("look"), call, result], [])
    roles = [m["role"] for m in sent["messages"]]
    assert roles == ["user", "assistant", "tool", "user"]
    assert "frame 12" in sent["messages"][2]["content"]
    assert "image(s) from this result are in the next message" in sent["messages"][2]["content"]
    assert sent["messages"][3]["content"][1]["image_url"]["url"] == PNG


def test_gemini_usage_counts_its_thinking_and_each_chunk_once() -> None:
    running = None
    added = []
    for total, output in ((110, 0), (140, 10), (180, 30)):
        chunk = ChatGenerationChunk(
            message=AIMessageChunk(
                "",
                usage_metadata={
                    "input_tokens": 100,
                    "output_tokens": output,
                    "total_tokens": total,
                },
            )
        )
        running = _as_added(chunk, running)
        added.append(chunk.message.usage_metadata)
    assert sum(u["input_tokens"] for u in added) == 100, "a running total is counted once"  # type: ignore[index]
    assert sum(u["output_tokens"] for u in added) == 80, "thinking left out is billed as output"  # type: ignore[index]


async def test_arguments_sent_only_in_the_closing_event_arrive_as_a_delta() -> None:
    def event(**fields: Any) -> Any:
        return SimpleNamespace(output_index=0, sequence_number=1, **fields)

    async def stream() -> AsyncIterator[Any]:
        yield event(type="response.output_item.added", item=SimpleNamespace(type="function_call"))
        yield event(type="response.function_call_arguments.done", item_id="i1", arguments='{"a":1}')
        yield event(type="response.function_call_arguments.delta", item_id="i2", delta='{"b":')
        yield event(type="response.function_call_arguments.done", item_id="i2", arguments='{"b":2}')

    seen = [e async for e in _with_done_arguments(stream())]
    kinds = [(e.type.rsplit(".", 1)[1], getattr(e, "item_id", "")) for e in seen[1:]]
    assert kinds == [("delta", "i1"), ("done", "i1"), ("delta", "i2"), ("done", "i2")]
    assert seen[1].delta == '{"a":1}'
