"""Where a Managed Deep Agents run came from.

MDA 0.10 puts the channel a thread started in at `runtime.thread.origin.channel`, on every run in
that thread; its `event` and `raw_event` are set only on the run a message started. `runtime.channel`
is the deprecated alias (gone in 0.11). Inspection runs have no thread, and Studio, API and
scheduled runs outside a channel thread have no origin.
"""

from __future__ import annotations

from typing import Any


def origin_channel(runtime: object) -> Any | None:
    """The run's thread's channel (a `RuntimeChannel`), or None (module doc)."""
    origin = getattr(getattr(runtime, "thread", None), "origin", None)
    return getattr(origin, "channel", None)
