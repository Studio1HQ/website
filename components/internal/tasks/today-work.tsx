import Link from "next/link";
import { ArrowRight } from "@/components/internal/icons";
import { Card, CardTitle } from "@/components/internal/ui";
import { DayList } from "@/components/internal/tasks/week-calendar";
import type { CalendarCard } from "@/lib/internal/tasks/calendar";
import type { LinkOption, Teammate } from "@/lib/internal/tasks/shared";
import { cn } from "@/lib/utils";

/**
 * My day's "Today's tasks": a box to add what you did, and today's cards from
 * the week calendar under it. Once the day has ended with nothing there, it asks.
 */
export function TodayWork({
  cards,
  today,
  ended,
  options,
  who,
  team,
  className,
}: {
  cards: CalendarCard[];
  today: string;
  /** The day has been started and every slot has ended. */
  ended: boolean;
  options: LinkOption[];
  /** Whose day it is (lowercase email). */
  who: string;
  /** Everyone active on the team list: who a task can be shared with. */
  team: Teammate[];
  /** Height and the like: with a set height, the cards scroll inside. */
  className?: string;
}) {
  const done = cards.filter((card) => (card.kind === "task" ? card.status === "done" : card.done)).length;
  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardTitle
        action={
          <Link href="/tasks" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
            Your week <ArrowRight size={12} />
          </Link>
        }
      >
        Today&apos;s tasks
        <span className="ml-2 font-normal tabular-nums text-[var(--i-muted)]">
          {done} done{cards.length > done ? ` · ${cards.length - done} open` : ""}
        </span>
      </CardTitle>
      {ended && !done ? (
        <p className="shrink-0 border-b border-[var(--i-line)] bg-amber-50 px-5 py-2 text-[12.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          You&apos;ve ended your day. Add what you worked on, so it counts in your week and your report.
        </p>
      ) : null}
      <DayList day={today} today={today} cards={cards} options={options} who={who} team={team} />
    </Card>
  );
}
