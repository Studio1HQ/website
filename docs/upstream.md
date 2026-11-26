# Upstream asks

Seams this project works around today, each with what it does instead. Partner questions for
HyperFrames and Paper are in [docs/partners/](partners/).

## Managed Deep Agents (0.10.5)

| Ask | Why | Today |
| --- | --- | --- |
| A public "start a run on this thread now" API | waking the lead after background work lands in 60–120 s through one-time schedules, which round to the next minute | `runtime.schedules.create(at=now+61s, new_thread=False)` ([orchestration](architecture/orchestration.md)) |
| A model chosen per async subagent task | MDA builds each async subagent's graph from a static spec, so its model is fixed at deploy | one `worker` graph; `start_async_task` takes `model` and `effort`, stamped on the task's run context and swapped in per call (`middleware/async_helpers.py`) |
| A way to turn off the automatic async general-purpose subagent | 0.10 builds it as its own graph with no opt-out | the lead's `start_async_task` always runs `worker`, so nothing starts it |
| Schedules creatable for a thread from outside a run | after a restart, a thread has no route for wake-ups until a run happens on it | a sentinel schedule per busy thread, pushed forward while the process lives |
| Streaming and message updates on a thread's channel (`runtime.thread.origin.channel`) | live progress and the footer need updates to one message | the Slack Web API with the reserved `mda/slack-bot-token` connection |
| Native steering for every person in the thread, and a way to turn it off | 0.10's `SteeringMiddleware` works in only the same person's queued messages and is always on | on MDA the platform steers; self-hosted, `LeadSteeringMiddleware` reads the thread |
| Route direct-message follow-ups to the thread already working | a new top-level DM is its own thread and runs in parallel | not handled |
| Expose a schedule run's Slack conversation and thread | after a restart, wake-up turns cannot find their Slack thread until a message run happens | progress reuses the thread's last known target |
| Dedupe Slack's duplicate deliveries at ingress; react when a message is queued | duplicate events and a silent queue | not handled on MDA (the self-hosted adapter dedupes) |
| An ignore list for `mda deploy` | it archives Git-ignored files (except `.env` and virtualenvs), so renders in `workspace/out/` count toward the 200 MB limit | `doctor` warns past 150 MB; clear old renders |
| Same-thread wake-ups for service-key callers, or agent-owned schedules without a channel | personal access tokens count as people since 0.10.2, but a thread started with a service key still can't be woken | the sentinel and in-process wake-ups cover it while the process lives |

## LangChain (1.4.6)

| Ask | Why | Today |
| --- | --- | --- |
| `jump_to: "end"` from an `after_agent` hook should reach the graph's end | it routes back to the first `after_agent` hook, so a hook that jumps loops until the recursion limit | no `after_agent` jumps; a quiet reply is settled in place |

## Deep Agents (0.7.28)

| Ask | Why | Today |
| --- | --- | --- |
| A TTL option for the prompt caching it installs | it always appends Anthropic caching with a 5-minute TTL; a lead read again an hour later pays to rewrite its prefix | `CachedChatAnthropic` sets every breakpoint to the role's TTL |
| A way to shorten skill descriptions in the resident list | vendored skills carry long upstream descriptions | `SkillListMiddleware` swaps them per request from `config/vendored-skills.toml` |
