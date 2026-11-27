import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TonePill } from "@/components/internal/tasks/status-pill";
import { dayLabel, isWeekend } from "@/lib/internal/team/shared";
import {
  REVIEW_STATUS_LABEL,
  hoursText,
  type DayState,
  type DoneItem,
  type Flag,
  type ReviewDay,
  type ReviewStatus,
  type SlipItem,
  type Timing,
} from "@/lib/internal/team/review";

/* The monthly review's pieces: status pill, hour strips, month of days, lists. */

const STATUS_TONE = { follow_up: "rose", watch: "amber", on_track: "emerald" } as const;

export function ReviewPill({ status, small = false }: { status: ReviewStatus; small?: boolean }) {
  return <TonePill tone={STATUS_TONE[status]} label={REVIEW_STATUS_LABEL[status]} small={small} />;
}

const FLAG_DOT: Record<Flag["level"], string> = {
  follow_up: "bg-rose-500",
  watch: "bg-amber-500",
  note: "bg-stone-400",
};

export function FlagList({ flags }: { flags: readonly Flag[] }) {
  return (
    <ul className="space-y-1.5">
      {flags.map((flag) => (
        <li key={flag.text} className="flex gap-2.5 text-[13px] leading-snug">
          <span aria-hidden className={cn("mt-[0.45em] size-1.5 shrink-0 rounded-full", FLAG_DOT[flag.level])} />
          <span className={flag.level === "note" ? "text-[var(--i-muted)]" : undefined}>{flag.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** "6a", "12p": hours on the strip's axis. */
function hourName(hour: number) {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

/**
 * Twenty-four cells, midnight to midnight IST, darker the more days had
 * work (or dashboard activity) in that hour.
 */
export function HourStrip({
  values,
  tone = "accent",
  label,
  compact = false,
}: {
  values: readonly number[];
  tone?: "accent" | "ink";
  label: string;
  compact?: boolean;
}) {
  const most = Math.max(...values, 0);
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]", compact ? "h-2.5" : "h-4")}
    >
      {values.map((value, hour) => {
        const share = most ? value / most : 0;
        return (
          <span
            key={hour}
            title={`${hourName(hour)}–${hourName((hour + 1) % 24)}: ${value} day${value === 1 ? "" : "s"}`}
            className={cn(
              "rounded-[2px]",
              share === 0 ? "bg-[var(--i-track)]" : tone === "accent" ? "bg-[var(--i-accent)]" : "bg-[var(--i-ink)]",
            )}
            style={share ? { opacity: 0.25 + share * 0.75 } : undefined}
          />
        );
      })}
    </div>
  );
}

export function HourAxis() {
  return (
    <div aria-hidden className="mt-1 grid grid-cols-4 text-[10.5px] text-[var(--i-faint)]">
      {[0, 6, 12, 18].map((hour) => (
        <span key={hour}>{hourName(hour)}</span>
      ))}
    </div>
  );
}

/** "Usually 10:05 – 19:40 · 7h 50m a day", or what's known. */
export function usualHours(timing: Timing) {
  const parts: string[] = [];
  if (timing.start && timing.end) parts.push(`${timing.start}–${timing.end}${timing.endsNextDay ? " (next day)" : ""}`);
  if (timing.perDay !== null) parts.push(`${hoursText(timing.perDay)} a day`);
  return parts.join(" · ");
}

const DAY_LOOK: Record<DayState, string> = {
  worked: "bg-[var(--i-accent)] text-white font-medium",
  half: "bg-[var(--i-accent-soft)] text-[var(--i-accent-text)] font-medium",
  active: "text-[var(--i-accent-text)] ring-1 ring-inset ring-[var(--i-accent)]",
  leave: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/25 dark:text-sky-100",
  quiet:
    "bg-rose-500/10 text-rose-700 ring-1 ring-inset ring-rose-500/70 font-medium dark:bg-rose-500/20 dark:text-rose-200",
  weekend: "text-[var(--i-faint)]",
  today: "text-[var(--i-ink)] ring-1 ring-inset ring-[var(--i-line-strong)]",
  before: "text-[var(--i-faint)] opacity-50",
  ahead: "text-[var(--i-faint)] opacity-50",
};

const DAY_WORDS: Record<DayState, string> = {
  worked: "hours logged",
  half: "half day",
  active: "did work, no hours logged",
  leave: "on leave",
  quiet: "no sign of work",
  weekend: "weekend",
  today: "today",
  before: "before the review starts",
  ahead: "still to come",
};

/** The month as a small Monday-first calendar, each day coloured by what it shows. */
export function MonthDays({ days }: { days: readonly ReviewDay[] }) {
  if (!days.length) return null;
  // Monday-first: Sunday (0) sits last.
  const offset = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <div>
      <div aria-hidden className="mb-1 grid grid-cols-7 gap-1 text-center text-[10.5px] text-[var(--i-faint)]">
        {["M", "T", "W", "T", "F", "S", "S"].map((name, index) => (
          <span key={index}>{name}</span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }, (_, index) => (
          <li key={`gap-${index}`} aria-hidden />
        ))}
        {days.map((day) => {
          const words = `${dayLabel(day.date)}: ${DAY_WORDS[day.state]}${day.minutes ? `, ${hoursText(day.minutes)}` : ""}`;
          return (
            <li
              key={day.date}
              title={words}
              aria-label={words}
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-[11.5px] tabular-nums",
                DAY_LOOK[day.state],
                day.state === "worked" && isWeekend(day.date) && "opacity-80",
              )}
            >
              {Number(day.date.slice(8, 10))}
            </li>
          );
        })}
      </ol>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--i-muted)]">
        <Key look={DAY_LOOK.worked}>Hours logged</Key>
        <Key look={DAY_LOOK.half}>Half day</Key>
        <Key look={DAY_LOOK.active}>Work, no hours</Key>
        <Key look={DAY_LOOK.leave}>Leave</Key>
        <Key look={DAY_LOOK.quiet}>No sign of work</Key>
      </div>
    </div>
  );
}

function Key({ look, children }: { look: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2.5 rounded-[3px]", look)} />
      {children}
    </span>
  );
}

const short = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

function ItemRow({ title, meta, warn }: { title: string; meta: ReactNode; warn?: ReactNode }) {
  return (
    <li className="min-w-0 py-2">
      <p className="truncate text-[13px]" title={title}>
        {title}
      </p>
      <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11.5px] text-[var(--i-muted)]">
        {meta}
        {warn ? <span className="text-amber-700 dark:text-amber-300">{warn}</span> : null}
      </p>
    </li>
  );
}

export function DoneList({ items }: { items: readonly DoneItem[] }) {
  if (!items.length) return <p className="py-2 text-[12.5px] text-[var(--i-muted)]">Nothing marked done.</p>;
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {items.map((item, index) => (
        <ItemRow
          key={`${item.kind}-${item.on}-${index}`}
          title={item.title}
          meta={
            <>
              <span className="truncate">{item.kind === "piece" ? `${item.label} · went live` : item.label}</span>
              <span>· {short(item.on)}</span>
            </>
          }
          warn={item.late ? `· ${days(item.late)} late` : null}
        />
      ))}
    </ul>
  );
}

export function SlipList({ items }: { items: readonly SlipItem[] }) {
  if (!items.length) return <p className="py-2 text-[12.5px] text-[var(--i-muted)]">Nothing slipped past its day.</p>;
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {items.map((item, index) => (
        <ItemRow
          key={`${item.kind}-${item.due}-${index}`}
          title={item.title}
          meta={
            <>
              <span className="truncate">{item.kind === "piece" ? `${item.label} · client piece` : item.label}</span>
              <span>· due {short(item.due)}</span>
              {item.moves ? <span>· pushed {item.moves}×</span> : null}
            </>
          }
          warn={
            item.done
              ? `· done ${short(item.done)}, ${days(item.days)} late`
              : `· still open${item.days ? `, ${days(item.days)} over` : ""}`
          }
        />
      ))}
    </ul>
  );
}
