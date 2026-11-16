"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, PencilSimple, VideoCamera } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Card, CardTitle, buttonClass } from "@/components/internal/ui";
import { CallCard, PeopleStack } from "@/components/internal/calls/call-parts";
import { CallForm } from "@/components/internal/calls/call-form";
import { useCalls, useNow } from "@/components/internal/calls/context";
import {
  WEEKDAYS,
  attendees,
  callState,
  clock,
  hasEnded,
  hourRange,
  isIn,
  layoutDay,
  repeatLabel,
  shortDay,
  timeRange,
  toMinutes,
  type Call,
  type Occurrence,
} from "@/lib/internal/calls/shared";

/* The calendar: a month grid, a time grid for a week or a day, a list of
   every call, and My day's card. Each shows only the calls the page was
   given (the viewer's own, or all of them for the founders and the
   associate); a call opens its dialog through useCalls().open. */

const weekdayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const fullFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const at = (day: string) => new Date(`${day}T00:00:00Z`);
const dateNumber = (day: string) => Number(day.slice(8));

function byDay(items: readonly Occurrence[]) {
  const map = new Map<string, Occurrence[]>();
  for (const item of items) map.set(item.day, [...(map.get(item.day) ?? []), item]);
  return map;
}

/** "3 PM Eng Sync" in a month cell. */
function Chip({ item }: { item: Occurrence }) {
  const { calls, me, open, tone: toneOf } = useCalls();
  const call = calls[item.call_id];
  if (!call) return null;
  const tone = toneOf(call.id);
  return (
    <button
      type="button"
      onClick={() => open(item)}
      title={`${call.title}, ${timeRange(item.start, item.minutes)}${item.cancelled ? " (off)" : ""}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[12px] leading-5 hover:bg-[var(--i-hover)]",
        item.cancelled && "text-[var(--i-faint)] line-through",
        !isIn(call, me) && "opacity-70",
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", item.cancelled ? "bg-[var(--i-line-strong)]" : tone.dot)} />
      <span className="shrink-0 tabular-nums text-[var(--i-muted)]">{clock(item.start)}</span>
      <span className="min-w-0 truncate font-medium">{call.title}</span>
    </button>
  );
}

/**
 * The month: whole weeks, a cell per day with its calls (three, then
 * "+2 more" for the day view). On a phone the cells hold dots and the
 * day you tap lists its calls underneath.
 */
export function MonthCalendar({
  month,
  days,
  items,
  dayHref,
}: {
  month: string;
  days: string[];
  items: Occurrence[];
  /** The day view's link, with "{date}" where the day goes. */
  dayHref: string;
}) {
  const { now: serverNow, tone } = useCalls();
  const now = useNow(serverNow);
  const grouped = byDay(items);
  const [picked, setPicked] = useState(() => (now.date.startsWith(month) ? now.date : `${month}-01`));
  const pickedItems = grouped.get(picked) ?? [];
  const MAX = 3;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
        <div className="grid grid-cols-7 border-b border-[var(--i-line)] bg-[var(--i-sunken)]">
          {WEEKDAYS.map((day) => (
            <div key={day.value} className="px-2 py-1.5 text-center text-[11.5px] font-medium text-[var(--i-muted)] md:text-left">
              <span className="md:hidden">{day.letter}</span>
              <span className="hidden md:inline">{day.short}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const list = grouped.get(day) ?? [];
            const inMonth = day.startsWith(month);
            const isToday = day === now.date;
            const live = list.filter((item) => !item.cancelled);
            return (
              <div
                key={day}
                role="group"
                aria-label={`${fullFormat.format(at(day))}: ${live.length ? `${live.length} ${live.length === 1 ? "call" : "calls"}` : "no calls"}`}
                className={cn(
                  "relative min-w-0 border-[var(--i-line)] p-1 md:min-h-[7.5rem] md:p-1.5",
                  index % 7 !== 6 && "border-r",
                  index < days.length - 7 && "border-b",
                  !inMonth && "bg-[var(--i-sunken)]",
                  picked === day && "max-md:bg-[var(--i-accent-soft)]",
                )}
              >
                {/* Phones: the whole cell picks the day. */}
                <button
                  type="button"
                  onClick={() => setPicked(day)}
                  aria-label={`Show ${fullFormat.format(at(day))}`}
                  aria-pressed={picked === day}
                  className="absolute inset-0 md:hidden"
                />
                <div className="flex items-center justify-center md:justify-between">
                  <Link
                    href={dayHref.replace("{date}", day)}
                    aria-label={`Open ${fullFormat.format(at(day))}`}
                    className={cn(
                      "pointer-events-none flex size-6 items-center justify-center rounded-full text-[12.5px] tabular-nums md:pointer-events-auto md:hover:bg-[var(--i-hover)]",
                      inMonth ? "text-[var(--i-ink)]" : "text-[var(--i-faint)]",
                      isToday && "bg-[var(--i-accent)] font-medium text-white md:hover:bg-[var(--i-accent)]",
                    )}
                  >
                    {dateNumber(day)}
                  </Link>
                </div>
                {/* Phones: a dot per call. */}
                {list.length ? (
                  <div aria-hidden className="mt-1 flex justify-center gap-0.5 md:hidden">
                    {list.slice(0, 3).map((item) => (
                      <span
                        key={item.key}
                        className={cn("size-1.5 rounded-full", item.cancelled ? "bg-[var(--i-line-strong)]" : tone(item.call_id).dot)}
                      />
                    ))}
                  </div>
                ) : null}
                {/* Wider screens: the calls themselves. */}
                {list.length ? (
                  <ul className="mt-1 hidden space-y-px md:block">
                    {list.slice(0, MAX).map((item) => (
                      <li key={item.key}>
                        <Chip item={item} />
                      </li>
                    ))}
                    {list.length > MAX ? (
                      <li>
                        <Link
                          href={dayHref.replace("{date}", day)}
                          className="block rounded-md px-1.5 text-[11.5px] font-medium text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                        >
                          +{list.length - MAX} more
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones: the picked day's calls. */}
      <section aria-label={fullFormat.format(at(picked))} className="mt-4 md:hidden">
        <h2 className="mb-2 text-[13px] font-medium">
          {fullFormat.format(at(picked))}
          {picked === now.date ? <span className="ml-1.5 text-[var(--i-accent-text)]">Today</span> : null}
        </h2>
        {pickedItems.length ? (
          <ul className="space-y-1.5">
            {pickedItems.map((item) => (
              <li key={item.key}>
                <CallCard item={item} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[var(--i-muted)]">No calls.</p>
        )}
      </section>
    </>
  );
}

/** Pixels per hour: a 30-minute call has room for two lines of its name. */
const HOUR = 64;
/** One line of a block's text (11px type). */
const LINE = 13;

/**
 * A week or a day as a time grid: hours down the side, a column per day,
 * each call a block from its start to its end, overlapping calls side by
 * side, and a line at the time now. On a phone a week reads as a list of
 * days instead (seven columns don't fit); a single day keeps the grid.
 */
export function TimeGrid({ days, items, dayHref }: { days: string[]; items: Occurrence[]; dayHref: string }) {
  const { calls, me, open, tone: toneOf, now: serverNow } = useCalls();
  const now = useNow(serverNow);
  const grouped = byDay(items);
  const { from, to } = hourRange(items);
  const height = (to - from) * HOUR;
  const hours = Array.from({ length: to - from }, (_, index) => from + index);
  const columns = `3.25rem repeat(${days.length}, minmax(0, 1fr))`;
  const week = days.length > 1;
  const nowTop = (toMinutes(now.time) - from * 60) * (HOUR / 60);

  return (
    <>
      <div className={cn(week && "hidden md:block", "-mx-1 overflow-x-auto px-1 pb-2")}>
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]",
            week && "min-w-[44rem]",
          )}
        >
          {/* Day heads */}
          <div className="grid border-b border-[var(--i-line)]" style={{ gridTemplateColumns: columns }}>
            <div className="flex items-end justify-end px-2 pb-1.5 text-[10.5px] text-[var(--i-faint)]">IST</div>
            {days.map((day) => {
              const isToday = day === now.date;
              return (
                <Link
                  key={day}
                  href={dayHref.replace("{date}", day)}
                  aria-label={`Open ${fullFormat.format(at(day))}`}
                  className={cn(
                    "flex flex-col items-center gap-0.5 border-l border-[var(--i-line)] py-2 hover:bg-[var(--i-hover)]",
                    !week && "pointer-events-none",
                  )}
                >
                  <span className={cn("text-[11.5px]", isToday ? "font-medium text-[var(--i-accent-text)]" : "text-[var(--i-muted)]")}>
                    {weekdayFormat.format(at(day))}
                  </span>
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[15px] font-medium tabular-nums",
                      isToday && "bg-[var(--i-accent)] text-white",
                    )}
                  >
                    {dateNumber(day)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Hours and calls */}
          <div className="grid" style={{ gridTemplateColumns: columns, height }}>
            <div className="relative">
              {hours.map((hour, index) => (
                <span
                  key={hour}
                  className={cn(
                    "absolute right-2 text-[10.5px] tabular-nums text-[var(--i-faint)]",
                    index === 0 ? "top-1" : "-translate-y-1/2",
                  )}
                  style={index === 0 ? undefined : { top: index * HOUR }}
                >
                  {clock(`${String(hour).padStart(2, "0")}:00`)}
                </span>
              ))}
            </div>
            {days.map((day) => {
              const list = grouped.get(day) ?? [];
              const placed = layoutDay(list);
              const isToday = day === now.date;
              return (
                <div
                  key={day}
                  role="group"
                  aria-label={fullFormat.format(at(day))}
                  className="relative border-l border-[var(--i-line)]"
                  style={{
                    backgroundImage: "linear-gradient(to bottom, var(--i-line) 1px, transparent 1px)",
                    backgroundSize: `100% ${HOUR}px`,
                  }}
                >
                  {list.map((item) => {
                    const call = calls[item.call_id];
                    if (!call) return null;
                    const start = toMinutes(item.start) - from * 60;
                    const top = start * (HOUR / 60);
                    const blockHeight = Math.max(18, Math.min(item.minutes, to * 60 - toMinutes(item.start)) * (HOUR / 60) - 2);
                    const slot = placed[item.key] ?? { col: 0, cols: 1, width: "full" };
                    const tone = toneOf(call.id);
                    // Where it starts across the column, and how far it runs (see Placed).
                    const left = (slot.col / slot.cols) * 100;
                    const width =
                      slot.width === "split" ? 100 / slot.cols : slot.width === "under" ? (100 - left) * 0.85 : 100 - left;
                    // As many lines as the block holds: on one line, the name and
                    // then the time (so the time goes first when it's tight); on
                    // more, the name's lines and the time underneath.
                    const lines = Math.max(1, Math.floor((blockHeight - 4) / LINE));
                    const state = callState(item, now);
                    const label = `${call.title}, ${timeRange(item.start, item.minutes)}${item.cancelled ? ", off" : ""}`;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => open(item)}
                        aria-label={label}
                        title={label}
                        className={cn(
                          "absolute overflow-hidden rounded-[5px] border-l-[3px] px-1.5 py-[2px] text-left text-[11px] leading-[13px] transition-colors",
                          // Calls on top of others get a gap in the panel's colour around them.
                          slot.col > 0 ? "ring-2 ring-[var(--i-panel)]" : "ring-1 ring-[var(--i-panel)]",
                          item.cancelled
                            ? "border-[var(--i-line-strong)] bg-[var(--i-sunken)] text-[var(--i-faint)] line-through"
                            : tone.block,
                          !item.cancelled && (state === "past" ? "opacity-70" : !isIn(call, me) && "opacity-80"),
                        )}
                        style={{
                          top: top + 1,
                          height: blockHeight,
                          left: `calc(${left}% + 1px)`,
                          width: `calc(${width}% - 3px)`,
                          zIndex: slot.col + 1,
                        }}
                      >
                        {lines === 1 ? (
                          <span className="block truncate">
                            <span className="font-medium">{call.title}</span>
                            <span className="opacity-75">, {clock(item.start)}</span>
                          </span>
                        ) : (
                          <>
                            <span
                              className="block break-words font-medium"
                              style={{ display: "-webkit-box", WebkitLineClamp: lines - 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {call.title}
                            </span>
                            <span className="block truncate tabular-nums opacity-75">{timeRange(item.start, item.minutes)}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                  {/* The time now: a thin line over the calls, on today only. */}
                  {isToday && nowTop >= 0 && nowTop <= height ? (
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                      <div className="relative h-px bg-[var(--i-accent)]">
                        <span className="absolute -left-[3px] -top-[2.5px] size-1.5 rounded-full bg-[var(--i-accent)]" />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phones, in the week: a list per day. */}
      {week ? (
        <div className="space-y-2 md:hidden">
          {days.map((day) => {
            const list = grouped.get(day) ?? [];
            const isToday = day === now.date;
            return (
              <section
                key={day}
                aria-label={fullFormat.format(at(day))}
                className={cn(
                  "rounded-xl p-1.5 ring-1",
                  isToday
                    ? "bg-orange-50/70 ring-orange-300 dark:bg-orange-500/[0.07] dark:ring-orange-400/50"
                    : "bg-[var(--i-sunken)] ring-[var(--i-line)]",
                )}
              >
                <h3 className="flex items-center justify-between px-1.5 pb-1.5 pt-1 text-[12px] text-[var(--i-muted)]">
                  <span>
                    {weekdayFormat.format(at(day))}
                    {isToday ? <span className="ml-1.5 font-medium text-[var(--i-accent-text)]">Today</span> : null}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-[var(--i-ink)]">{dateNumber(day)}</span>
                </h3>
                {list.length ? (
                  <ul className="space-y-1.5">
                    {list.map((item) => (
                      <li key={item.key}>
                        <CallCard item={item} now={now} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1.5 pb-1.5 text-[12px] text-[var(--i-faint)]">No calls.</p>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

/**
 * Every call the viewer may see: for the founders and the associate, the
 * plan to decide on; for everyone else, the calls they're in. Repeating
 * ones first, then one-offs to come, then the ones that are over.
 */
export function CallList({ ids, next }: { ids: readonly string[]; next: Readonly<Record<string, Occurrence | null>> }) {
  const { calls, today, canPlan, me } = useCalls();
  const list = ids.map((id) => calls[id]).filter((call): call is Call => Boolean(call));
  const ongoing = list.filter((call) => !hasEnded(call, today));
  const ended = list.filter((call) => hasEnded(call, today));
  const order = (a: Call, b: Call) =>
    Number(a.repeat === "once") - Number(b.repeat === "once") || a.start_time.localeCompare(b.start_time) || a.title.localeCompare(b.title);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>
          {canPlan && list.some((call) => !isIn(call, me)) ? "Calls we have" : "Your calls"}{" "}
          <span className="ml-1 font-normal tabular-nums text-[var(--i-muted)]">{ongoing.length}</span>
        </CardTitle>
        {ongoing.length ? (
          <ul className="divide-y divide-[var(--i-line)]">
            {ongoing.sort(order).map((call) => (
              <CallRow key={call.id} call={call} next={next[call.id] ?? null} />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">{canPlan ? "No calls planned yet." : "You're not in any calls yet."}</p>
        )}
      </Card>
      {ended.length ? (
        <details className="group rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)]">
          <summary className="cursor-pointer list-none px-5 py-3 text-[13px] font-medium text-[var(--i-muted)] hover:text-[var(--i-ink)]">
            Over <span className="font-normal tabular-nums">{ended.length}</span>
          </summary>
          <ul className="divide-y divide-[var(--i-line)] border-t border-[var(--i-line)]">
            {ended.sort(order).map((call) => (
              <CallRow key={call.id} call={call} next={null} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function CallRow({ call, next }: { call: Call; next: Occurrence | null }) {
  const { team, me, canPlan, names, tone } = useCalls();
  const [editing, setEditing] = useState(false);
  const people = attendees(call, team);
  const mine = isIn(call, me);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <div className="min-w-0 flex-1 basis-64">
        <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] font-medium">
          <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", tone(call.id).dot)} />
          {call.title}
          {canPlan && mine ? <span className="text-[11.5px] font-normal text-[var(--i-accent-text)]">You&apos;re in</span> : null}
        </p>
        <p className="mt-0.5 text-[12.5px] text-[var(--i-muted)]">
          {repeatLabel(call)}
          {call.repeat === "weekly" && call.ends_on ? ` · until ${shortDay(call.ends_on)}` : ""}
        </p>
        {call.about ? <p className="mt-1 line-clamp-1 text-[12.5px] text-[var(--i-faint)]">{call.about}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {call.whole_team ? (
          <span className="text-[12px] text-[var(--i-muted)]">Whole team</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <PeopleStack emails={people} max={5} size={24} />
            {call.host ? (
              <span className="hidden text-[11.5px] text-[var(--i-faint)] lg:inline">
                Host: {names[call.host] || call.host.split("@")[0]}
              </span>
            ) : null}
          </span>
        )}
        <span className="w-28 text-right text-[12px] tabular-nums text-[var(--i-muted)]">
          {next ? `Next: ${shortDay(next.day)}` : ""}
        </span>
        {call.link ? (
          <a href={call.link} target="_blank" rel="noreferrer" aria-label={`Open the link for ${call.title}`} className={buttonClass("secondary", "sm")}>
            <VideoCamera size={13} />
          </a>
        ) : null}
        {canPlan ? (
          <>
            <button type="button" aria-label={`Edit ${call.title}`} className={buttonClass("ghost", "sm")} onClick={() => setEditing(true)}>
              <PencilSimple size={13} />
            </button>
            <CallForm open={editing} onOpenChange={setEditing} call={call} />
          </>
        ) : null}
      </div>
    </li>
  );
}

/** My day's "Your calls today": today's calls you're in, with Join. */
export function TodayCalls({ items }: { items: Occurrence[] }) {
  const { calls, now: serverNow } = useCalls();
  const now = useNow(serverNow);
  const left = items.filter((item) => !item.cancelled && callState(item, now) !== "past").length;
  const next = items.find((item) => !item.cancelled && callState(item, now) !== "past");
  return (
    <Card>
      <CardTitle
        action={
          <Link href="/internal/calls" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
            Your calendar <ArrowRight size={12} />
          </Link>
        }
      >
        Your calls today
        <span className="ml-2 font-normal tabular-nums text-[var(--i-muted)]">
          {items.length ? (left ? `${left} to go` : "all done") : "none"}
        </span>
      </CardTitle>
      {items.length ? (
        <div className="p-3">
          {next && calls[next.call_id] ? (
            <p className="mb-2 px-1 text-[12.5px] text-[var(--i-muted)]">
              {callState(next, now) === "live" ? "On now: " : "Next: "}
              <span className="font-medium text-[var(--i-ink)]">{calls[next.call_id].title}</span> at {timeRange(next.start, next.minutes)}
            </p>
          ) : null}
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.key}>
                <CallCard item={item} now={now} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="px-5 py-4 text-[13px] text-[var(--i-muted)]">No calls for you today.</p>
      )}
    </Card>
  );
}
