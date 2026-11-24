import Link from "next/link";
import { ArrowRight } from "@/components/internal/icons";
import { Card, CardTitle } from "@/components/internal/ui";
import { DayList } from "@/components/internal/tasks/week-calendar";
import type { CalendarCard } from "@/lib/internal/tasks/calendar";
import type { LinkOption, Teammate } from "@/lib/internal/tasks/shared";
import { dayLabel } from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";

/**
 * My day's "Today's tasks": a box to add what you did, and today's cards from
 * the week calendar under it. Once the day has ended with nothing there, it asks.
 * Picking another day in the box shows that day's cards instead (`day`).
 */
export function TodayWork({
  cards,
  day,
  today,
  ended,
  options,
  who,
  team,
  className,
}: {
  /** The cards of `day`. */
  cards: CalendarCard[];
  /** The day shown: today, or one picked in the box. */
  day: string;
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
          <Link href={day === today ? "/tasks" : `/tasks?week=${day}`} className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
            Your week <ArrowRight size={12} />
          </Link>
        }
      >
        {day === today ? "Today's tasks" : `Tasks on ${dayLabel(day)}`}
        <span className="ml-2 font-normal tabular-nums text-[var(--i-muted)]">
          {done} done{cards.length > done ? ` · ${cards.length - done} open` : ""}
        </span>
      </CardTitle>
      {day === today && ended && !done ? (
        <p className="shrink-0 border-b border-[var(--i-line)] bg-amber-50 px-5 py-2 text-[12.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          You&apos;ve ended your day. Add what you worked on, so it counts in your week and your report.
        </p>
      ) : null}
      <DayList day={day} today={today} cards={cards} options={options} who={who} team={team} followDay />
    </Card>
  );
}
