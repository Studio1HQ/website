# Models

Design Agent talks to models through LangChain, so any chat model with tool calling runs any role.
Set one in `.env` (or `uv run design-agent config set …`):

```bash
DESIGN_AGENT_MODEL=anthropic:claude-opus-5-5     # provider:model
ANTHROPIC_API_KEY=…
```

`provider:model` is LangChain's `init_chat_model` form. Anthropic and OpenAI are installed by
default; Google, Groq and Mistral are extras (`uv sync --extra google`), and any other LangChain
integration package works once installed. The LangSmith Gateway is an optional preset
(`langsmith:anthropic/claude-opus-5-5` with `LANGSMITH_GATEWAY_API_KEY`, else `LANGSMITH_API_KEY`),
never required. Anthropic and OpenAI models go through the gateway's native routes and keep every
feature in the table below; other providers use its shared route.

## Roles

| Role | Setting | Default | What it does |
| --- | --- | --- | --- |
| Lead | `DESIGN_AGENT_MODEL`, `DESIGN_AGENT_MODEL_EFFORT` | `anthropic:claude-opus-5-5` at `high` | the conversation, plans, creative calls |
| Helpers | `DESIGN_AGENT_HELPER_MODEL`, `DESIGN_AGENT_HELPER_EFFORT_CAP` | the lead's model | background builders, critics, renders |
| `look` | `DESIGN_AGENT_LOOK_MODEL` | the lead's model at `low` | looks at renders (up to 8 images per call) |
| Tool selector | `DESIGN_AGENT_TOOL_SELECTOR_MODEL` | the lead's model | picks MCP tools, only for models without native tool search |
| Learning | `DESIGN_AGENT_LEARNING_MODEL` | a low-effort helper | the post-job review that proposes observations |

The lead, helpers and `look` look at images. `uv run design-agent doctor` says what is known about
each role's model.

### Each role's model settings

`DESIGN_AGENT_MODEL_*` are the lead's and `DESIGN_AGENT_<ROLE>_MODEL_*` a role's (`HELPER`, `LOOK`,
`TOOL_SELECTOR`, `LEARNING`):

| Setting | What it does |
| --- | --- |
| `…_BASE_URL`, `…_API_KEY_ENV` | an OpenAI-compatible endpoint, and the name of the variable that holds its key |
| `…_MAX_OUTPUT_TOKENS` | the output budget; default the registry's or the model profile's limit |
| `…_KWARGS` | a JSON object for the model's constructor (`{"temperature": 0.2}`); never an endpoint or a key |
| `…_VISION` | `1` or `0`: whether the model takes images, when its capability data is missing or wrong (lead, helpers, `look`) |

They travel with that role's model: a helper on the lead's model reaches the lead's endpoint, and a
helper the lead starts on the `look` model reaches it the way `look` does.

## What the harness knows about a model

From first to last: the role's settings above; the capability registry's exact entry; the profile
LangChain publishes for the model (image input, output limit, effort levels); else nothing.

- `src/design_agent/models/registry.py` records, per exact model id, what the agent may rely on:
  vision, effort levels, context and output limits, prompt-cache lifetimes, server-side context
  editing, and how tools are disclosed. Only its entries claim provider features.
- A model without an entry runs on the portable path (every feature that does not depend on the
  provider), described by its LangChain profile.
- A model with neither runs too. A role that looks at images is refused only when capability data
  says the model takes none; without data it runs with a warning, and `doctor` shows it as
  unverified until you set `…_VISION`.

| Model | Tool disclosure | Notes |
| --- | --- | --- |
| `anthropic:claude-opus-5-5`, `claude-fable-5-1`, `claude-sonnet-5-5` | provider tool search | efforts `low`…`max`; adaptive thinking; 5 m / 1 h cache |
| `anthropic:claude-haiku-5-5` | provider tool search | no effort parameter; good for `look` and the selector |
| `openai:gpt-6.1-sol`, `gpt-6-sol`, `gpt-5.6-sol` | provider tool search | Responses API; reasoning effort |
| `google_genai:gemini-3.6-flash` | bounded selector | no provider-side tool search |
| anything else, the gateway's shared route, or a base URL | bounded selector | no provider-feature claims |

Adding a model: add an entry with the facts from the provider's current documentation, a test in
`tests/unit/test_config_and_registry.py`, and run the eval set (`docs/evals.md`) before relying on it.

### Effort

An effort goes to each provider as its own parameter: `effort` for Anthropic, `reasoning` on
OpenAI's Responses API, `reasoning_effort` on any OpenAI-compatible Chat Completions endpoint,
Gemini's thinking level (a thinking budget before Gemini 3). A level the model does not take runs
at the most it takes under it; a model with no effort setting runs without one. Both are logged,
never refused.

### OpenAI-compatible routes

OpenAI models, compatible endpoints and the gateway's routes are built with a few repairs
(`src/design_agent/models/compat.py`): tool-schema regexes the provider cannot compile are dropped,
an image a tool returns follows as a user turn on Chat Completions, a route without tool search
gets no search tool, a streamed tool call's arguments always arrive, and Gemini's usage is counted
the way it is billed.

## Images

Each `generate_image` call goes to the provider its model names: `openai:<id>`, `google:<id>`, or a
plain id by family (`gpt-image-…`, `dall-e-…` to OpenAI; `gemini-…`, `imagen-…` to Google). The
default is `DESIGN_AGENT_IMAGE_MODEL`, else `gpt-image-2.5-flare` when OpenAI is reachable and
`gemini-nano-banana-2.1` when only Google is (or the lead model is Google's).

| Provider | Reached through, first that is set |
| --- | --- |
| OpenAI-compatible images | `DESIGN_AGENT_IMAGE_BASE_URL` with the key `DESIGN_AGENT_IMAGE_API_KEY_ENV` names (then any plain id goes there); `OPENAI_API_KEY`; the gateway's OpenAI path |
| Google (Gemini image models) | `GOOGLE_API_KEY`; the gateway's Google path |

The gateway is used by a deployment that uses it (a `langsmith:` model or
`LANGSMITH_GATEWAY_API_KEY`), with the provider key stored in that gateway workspace. A key only
goes to its own provider or the gateway, and a model id that reaches a URL must be URL-safe. A model
nothing reachable serves is an error that says what to set, never another model. Google's image
models make no transparent backgrounds and make one image per request (`n` up to 4).

## Cost and limits

- Each call is bounded by `DESIGN_AGENT_MODEL_TIMEOUT_SECONDS` (600 by default); provider SDK
  retries are off and the agent's own retry handles transient failures
  ([failure boundaries](architecture/context-and-failures.md#failure-boundaries)).
- The lead's prompt cache lives an hour (`DESIGN_AGENT_CACHE_TTL`), helpers' five minutes.
- Spend is estimated per job from `config/prices.toml`; `DESIGN_AGENT_JOB_BUDGET_USD` makes the
  agent ask before going past a budget. A model with no price there still runs, but its calls count
  as $0 and `doctor` says so: add a `[<provider>.models.<model>]` entry with the provider's prices,
  the date you checked them and the page you read them on.
