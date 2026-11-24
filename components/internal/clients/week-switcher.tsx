import Link from "next/link";
import { CaretLeft, CaretRight } from "@/components/internal/icons";
import {
  isDateKey,
  shiftWeek,
  weekLabel,
  weekStart,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/internal/ui";

/*
 * The week picker for the board and the load page: previous, the week's
 * dates, next, and "This week" when looking at another one. Plain links
 * (no hooks), so it works in server components.
 */

/** The ?week= search param as a Monday key: any day snaps to its Monday; else this week. */
export function weekFromParam(value: unknown, today: string) {
  const day = Array.isArray(value) ? value[0] : value;
  return isDateKey(day) ? weekStart(day) : weekStart(today);
}

/** "This week", "Next week", "Last week", or "Week of 9–15 Nov". */
export function weekName(week: string, current: string) {
  if (week === current) return "This week";
  if (week === shiftWeek(current, 1)) return "Next week";
  if (week === shiftWeek(current, -1)) return "Last week";
  return `Week of ${weekLabel(week)}`;
}

/** "this week", "next week", "last week", "the week of 9–15 Nov": for sentences. */
export function weekPhrase(week: string, current: string) {
  if (week === current) return "this week";
  if (week === shiftWeek(current, 1)) return "next week";
  if (week === shiftWeek(current, -1)) return "last week";
  return `the week of ${weekLabel(week)}`;
}

export function WeekSwitcher({
  week,
  current,
  hrefFor,
}: {
  /** The Monday being shown. */
  week: string;
  /** This week's Monday. */
  current: string;
  /** The page's link for another week, keeping its other filters. */
  hrefFor: Record<"previous" | "next" | "current", string>;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={hrefFor.previous}
        aria-label="Previous week"
        className={buttonClass("secondary", "sm")}
      >
        <CaretLeft size={13} />
      </Link>
      <span className="min-w-[8.5rem] text-center text-[13px] leading-tight">
        <span className="block font-medium tabular-nums">
          {weekLabel(week)}
        </span>
        <span className="block text-[11.5px] text-[var(--i-muted)]">
          {weekName(week, current)}
        </span>
      </span>
      <Link
        href={hrefFor.next}
        aria-label="Next week"
        className={buttonClass("secondary", "sm")}
      >
        <CaretRight size={13} />
      </Link>
      {week !== current ? (
        <Link
          href={hrefFor.current}
          className={cn(buttonClass("ghost", "sm"), "ml-1")}
        >
          This week
        </Link>
      ) : null}
    </div>
  );
}
