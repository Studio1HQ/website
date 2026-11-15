"use client";

import { cn } from "@/lib/utils";
import { hoursLabel } from "@/lib/internal/tasks/shared";

/* Small client pieces the Tasks board, Today list and My day share. */

/** A client engagement someone can put work under (EngagementChoice, as plain data). */
export type ForOption = {
  id: string;
  client: string;
  clientSlug: string;
  name: string;
  /** Studio1's own engagement (blog and socials): Studio1 work. */
  internal: boolean;
  /** This month's cycle, where a new deliverable goes; null when the month isn't started. */
  cycleId: string | null;
};

export function forOptionLabel(option: ForOption) {
  return option.internal ? `Studio1 · ${option.name}` : `${option.client} · ${option.name}`;
}

/** A card on the board (for a task's "Part of": the person's open deliverables). */
export type LogTarget = {
  kind: "task" | "deliverable" | "community";
  id: string;
  title: string;
  /** "Studio1 · Content", "Acme · DevRel retainer". */
  for: string;
  /** Can "Finished it" close it from the log (not client deliverables: they move on with their status menu). */
  finishable: boolean;
  /** For "part of": the deliverable's engagement. */
  engagementId?: string | null;
};

/** "Studio1 · Content" or "Acme · Retainer" in a quiet chip. */
export function ForChip({ label, client = false }: { label: string; client?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[11.5px] ring-1 ring-inset",
        client
          ? "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25"
          : "bg-[var(--i-sunken)] text-[var(--i-muted)] ring-[var(--i-line)]",
      )}
      title={label}
    >
      {label}
    </span>
  );
}

/** Logged time on a card: "2h 30m this week". */
export function MinutesNote({ minutes, suffix = "this week" }: { minutes: number | undefined; suffix?: string }) {
  if (!minutes) return null;
  return (
    <span className="text-[11.5px] tabular-nums text-[var(--i-faint)]">
      {hoursLabel(minutes)} {suffix}
    </span>
  );
}
