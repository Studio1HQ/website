import Link from "next/link";
import { cn } from "@/lib/utils";
import { dayLabel, isWeekend } from "@/lib/internal/team/shared";
import { weekLabel } from "@/lib/internal/clients/schema";
import type { SnapshotItem } from "@/lib/internal/tasks/shared";
import { groupByWeek, heatLevel, type DayMark } from "@/lib/internal/tasks/views";
import { Card, CardTitle, ExternalLink } from "@/components/internal/ui";

/*
 * The Month view's pieces: the calendar heatmap of things done and the done
 * list grouped by week. Server-rendered links, no hooks.
 */

const HEAT = [
  "bg-[var(--i-sunken)]",
  "bg-orange-100 dark:bg-orange-500/15",
  "bg-orange-200 dark:bg-orange-500/30",
  "bg-orange-300 dark:bg-orange-500/50",
  "bg-orange-500 text-white dark:bg-orange-500/80",
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A Monday-first month grid, each day shaded by how much got done. */
export function MonthHeatmap({
  rows,
  counts,
  marks,
  today,
  hrefFor,
}: {
  rows: (string | null)[][];
  /** Things done per day. */
  counts: Readonly<Record<string, number>>;
  /** Attendance per day (leave, half day). */
  marks: Readonly<Record<string, DayMark>>;
  today: string;
  /** The day view's link for a day. */
  hrefFor: Readonly<Record<string, string>>;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((name) => (
          <span key={name} aria-hidden className="pb-1 text-center text-[11px] text-[var(--i-faint)]">
            <span className="sm:hidden">{name[0]}</span>
            <span className="hidden sm:inline">{name}</span>
          </span>
        ))}
        {rows.flat().map((day, index) => {
          if (!day) return <span key={`pad-${index}`} aria-hidden className="aspect-square sm:aspect-[5/4]" />;
          const logged = counts[day] ?? 0;
          const level = heatLevel(logged);
          const mark = marks[day];
          const ahead = day > today;
          const label = `${dayLabel(day, true)}: ${logged || "nothing"} done${
            mark?.kind === "leave" ? ", on leave" : mark?.kind === "half_day" ? ", half day" : ""
          }`;
          const body = (
            <>
              <span className={cn("text-[11px] tabular-nums", level === 4 ? "text-white/90" : "text-[var(--i-muted)]")}>
                {Number(day.slice(8))}
              </span>
              <span className="mt-auto flex items-end justify-between gap-0.5">
                <span className={cn("hidden text-[11px] font-medium tabular-nums sm:block", level === 4 ? "text-white" : "text-[var(--i-ink)]")}>
                  {logged || ""}
                </span>
                {mark?.kind === "leave" || mark?.kind === "half_day" ? (
                  <span
                    aria-hidden
                    title={mark.kind === "leave" ? "Leave" : "Half day"}
                    className={cn("ml-auto size-1.5 shrink-0 rounded-full", mark.kind === "leave" ? "bg-amber-500" : "bg-sky-500")}
                  />
                ) : null}
              </span>
            </>
          );
          const cell = cn(
            "flex aspect-square flex-col rounded-md p-1 ring-1 ring-inset ring-[var(--i-line)] sm:aspect-[5/4] sm:p-1.5",
            HEAT[level],
            isWeekend(day) && !logged && "opacity-60",
            day === today && "ring-2 ring-[var(--i-accent)]",
          );
          return ahead ? (
            <span key={day} aria-hidden className={cn(cell, "opacity-40")}>
              {body}
            </span>
          ) : (
            <Link
              key={day}
              href={hrefFor[day] ?? "#"}
              aria-label={label}
              title={label}
              className={cn(cell, "transition-shadow hover:ring-[var(--i-line-strong)]")}
            >
              {body}
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-[var(--i-faint)]">
        <span className="flex items-center gap-1">
          Less
          {HEAT.map((tone, index) => (
            <span key={index} aria-hidden className={cn("size-3 rounded-sm ring-1 ring-inset ring-[var(--i-line)]", tone)} />
          ))}
          More
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-amber-500" /> Leave
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-sky-500" /> Half day
        </span>
      </div>
    </div>
  );
}

/** What got done in the month, one block per week. */
export function DoneByWeek({ items }: { items: readonly SnapshotItem[] }) {
  const groups = groupByWeek(items);
  return (
    <Card>
      <CardTitle action={<span className="text-[12px] tabular-nums text-[var(--i-faint)]">{items.length}</span>}>Done</CardTitle>
      {groups.length ? (
        <div className="divide-y divide-[var(--i-line)]">
          {groups.map(([week, list]) => (
            <section key={week} className="px-5 py-3">
              <h3 className="mb-1.5 text-[12px] font-medium text-[var(--i-muted)]">
                Week of {weekLabel(week)} <span className="font-normal text-[var(--i-faint)]">· {list.length}</span>
              </h3>
              <ul className="space-y-1.5">
                {list.map((item, index) => (
                  <li key={`${item.source}-${item.title}-${index}`} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0">
                      {item.url ? <ExternalLink href={item.url}>{item.title}</ExternalLink> : <span>{item.title}</span>}
                      <span className="block truncate text-[12px] text-[var(--i-muted)]">{item.for}</span>
                    </span>
                    {item.day ? <span className="shrink-0 tabular-nums text-[var(--i-muted)]">{dayLabel(item.day)}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-[12.5px] text-[var(--i-faint)]">Nothing finished this month yet.</p>
      )}
    </Card>
  );
}
