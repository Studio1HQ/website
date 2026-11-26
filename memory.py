"""MDA memory: a team layer every caller shares, and a personal layer per person.

`/memories/agent/` holds team rules (anyone who mentions the agent can add to it, so it is never a
place for private data). `/memories/user/` belongs to the verified person who asked; MDA mounts it
only for a run with a person behind it.

Declared here, the personal layer mounts where MDA's defaults put it: the person's Slack DM and
Studio. People ask for work in channel threads, so `agent.py` selects both layers for every Slack
run (`slack_run`) and their preferences follow them there. The cost: their hot `AGENTS.md` is in
context in a shared thread, which is why `instructions.md` says never to repeat it there.
"""

from managed_deepagents import ManagedServerRuntime, MemoryLayer, define_memory

from design_agent.runtime.origin import origin_channel

memory = define_memory(agent=MemoryLayer(), user=MemoryLayer())


def slack_run(runtime: ManagedServerRuntime) -> bool:
    """A run in a Slack thread: a mention, a DM, a reply, an approval click, or a wake-up there.

    MDA sets a thread's origin from its own routing, never from the context a caller sends;
    inspection, Studio and API runs have none. User memory still mounts only for a person.
    """
    channel = origin_channel(runtime)
    return channel is not None and channel.provider == "slack"
