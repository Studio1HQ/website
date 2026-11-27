import Link from "next/link";
import { shortError } from "@/lib/internal/inbound/wording";
import type { LeadCard } from "@/lib/internal/inbound/schema";
import { cn } from "@/lib/utils";

/**
 * One thin line over the board: is the agent working, how many events wait
 * for it, and the last thing that failed (with a link to that lead).
 */
export function AgentStatus({
  activity,
  failure,
}: {
  /** Null when the counts couldn't be read. */
  activity: { queued: number; running: number; failed: number } | null;
  failure: LeadCard | null;
}) {
  const running = activity ? activity.running > 0 : false;
  return (
    <p className="mb-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[var(--i-muted)]">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            running ? "bg-[var(--i-accent)]" : "bg-[var(--i-faint)]",
          )}
        />
        {activity === null
          ? "Agent status unavailable"
          : running
            ? "Agent is working"
            : "Agent is idle"}
      </span>
      {activity ? (
        <span>
          {activity.queued === 0
            ? "Nothing waiting"
            : `${activity.queued} waiting in the queue`}
        </span>
      ) : null}
      {failure ? (
        <span className="min-w-0 truncate">
          Last failure:{" "}
          <Link
            href={`/inbound/${failure.org.id}`}
            className="text-rose-700 hover:underline dark:text-rose-300"
          >
            {failure.org.name}
          </Link>
          {failure.latest?.error
            ? ` (${shortError(failure.latest.error, 60)})`
            : ""}
        </span>
      ) : null}
    </p>
  );
}
