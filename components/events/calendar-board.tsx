"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { EventMark } from "@/components/events/events-page";
import type { StudioEvent } from "@/data/events";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Month = { year: number; month: number };

const key = (m: Month) => m.year * 12 + (m.month - 1);
const fromKey = (k: number): Month => ({
  year: Math.floor(k / 12),
  month: (k % 12) + 1,
});

/** No exact day, or only a rough one: shown for the month, not on a day. */
function dayless(e: StudioEvent) {
  return (
    e.day === undefined ||
    !!e.approx?.startsWith("Early") ||
    !!e.approx?.startsWith("Late")
  );
}

/** Day cells for a month, Sunday first, padded to whole weeks. */
function cells({ year, month }: Month) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const total = Math.ceil((first + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= days ? d : null;
  });
}

/** Events on a given day; multi-day ones on each of their days. */
function onDay(events: StudioEvent[], m: Month, day: number) {
  return events.filter(
    (e) =>
      e.year === m.year &&
      e.month === m.month &&
      !dayless(e) &&
      day >= e.day! &&
      day <= (e.endDay ?? e.day!),
  );
}

/** One event in the side panel, linking to its entry on the Events page. */
function EventLine({ event }: { event: StudioEvent }) {
  return (
    <li>
      <a
        href={`/events#${event.slug}`}
        className="flex items-center gap-3 border-b border-white/10 py-3.5"
      >
        <EventMark event={event} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-[1.3]">
            {event.name}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-white/50">
            {event.kind}
            {event.place ? ` · ${event.place}` : ""}
            {event.approx ? ` · ${event.approx}` : ""}
          </span>
        </span>
        <ArrowUpRight weight="bold" className="size-4 shrink-0 text-white/50" />
      </a>
    </li>
  );
}

/**
 * The whole calendar: a dark month board with each event on its day. Click a
 * date to see its events beside the grid; each one opens its entry on the
 * Events page.
 */
export function CalendarBoard({
  events,
  now,
}: {
  events: StudioEvent[];
  now: number;
}) {
  const today = new Date(now);
  const here = key({ year: today.getFullYear(), month: today.getMonth() + 1 });

  // Always open on the real month, with today selected
  const [current, setCurrent] = useState(here);
  const m = fromKey(current);

  const firstEventDay = (mm: Month) =>
    cells(mm).find((d) => d && onDay(events, mm, d).length) ?? null;
  const [selected, setSelected] = useState<number | null>(today.getDate());

  const go = (delta: number) => {
    const next = current + delta;
    setCurrent(next);
    setSelected(next === here ? today.getDate() : firstEventDay(fromKey(next)));
  };
  const backToToday = () => {
    setCurrent(here);
    setSelected(today.getDate());
  };

  // What is next from today: dated events after today, then month-only ones
  // from this month on
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const upcoming = events
    .filter((e) =>
      dayless(e)
        ? key(e) >= here
        : new Date(e.year, e.month - 1, e.endDay ?? e.day!).getTime() >=
          startOfToday,
    )
    .sort((a, b) => key(a) * 40 + (a.day ?? 32) - (key(b) * 40 + (b.day ?? 32)))
    .slice(0, 4);

  const loose = events.filter(
    (e) => e.year === m.year && e.month === m.month && dayless(e),
  );
  // Events known only roughly ("Early October", "October") get a nearby
  // day on the grid, marked as approximate
  const placed = new Map<number, StudioEvent[]>();
  const taken = new Set(
    cells(m).filter((d): d is number => !!d && onDay(events, m, d).length > 0),
  );
  const daysIn = new Date(m.year, m.month, 0).getDate();
  for (const e of loose) {
    let d = e.approx?.startsWith("Early")
      ? 3
      : e.approx?.startsWith("Late")
        ? 24
        : (e.day ?? 12);
    while (taken.has(d) && d < daysIn) d += 1;
    taken.add(d);
    placed.set(d, [...(placed.get(d) ?? []), e]);
  }
  const listFor = (d: number) => [
    ...onDay(events, m, d),
    ...(placed.get(d) ?? []),
  ];
  const picked = selected ? listFor(selected) : [];
  /** A day that has already happened. */
  const isPast = (d: number) =>
    new Date(m.year, m.month - 1, d).getTime() < startOfToday;
  const isToday = (d: number) => current === here && d === today.getDate();
  const weekday = selected
    ? DAYS_LONG[new Date(m.year, m.month - 1, selected).getDay()]
    : "";

  return (
    <div className="flex flex-1 flex-col rounded-[6px] bg-[#141414] p-5 text-white shadow-[0_40px_80px_-50px_rgba(20,20,20,0.8)] md:p-8 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      {/* Margin: the month number, then the chosen day's events */}
      <aside className="flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[88px] font-medium leading-[0.85] tracking-[-0.06em] tabular-nums md:text-[128px]">
              {String(m.month).padStart(2, "0")}
            </p>
            <p className="mt-3 text-[20px] font-medium tracking-[-0.02em]">
              {MONTHS[m.month - 1]}{" "}
              <span className="text-white/45">{m.year}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <MonthButtons
              go={go}
              onToday={backToToday}
              atToday={current === here}
            />
          </div>
        </div>

        <div className="mt-8 hidden flex-1 flex-col lg:flex">
          {selected ? (
            <>
              <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-white/45">
                {isToday(selected) ? (
                  <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-white">
                    Today
                  </span>
                ) : null}
                {weekday}, {MONTHS[m.month - 1]} {selected}
              </p>
              {picked.length ? (
                <ul className="mt-2">
                  {picked.map((e) => (
                    <EventLine key={e.slug} event={e} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-white/50">
                  No events on this day.
                </p>
              )}
            </>
          ) : (
            <p className="text-[14px] text-white/50">
              Pick a date to see its events.
            </p>
          )}

          {loose.length ? (
            <div className="mt-8">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/45">
                Dates to be confirmed
              </p>
              <ul className="mt-2">
                {loose.map((e) => (
                  <EventLine key={e.slug} event={e} />
                ))}
              </ul>
            </div>
          ) : null}

          {upcoming.length ? (
            <div className="mt-8">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/45">
                Coming up
              </p>
              <ul className="mt-2">
                {upcoming.map((e) => (
                  <EventLine key={e.slug} event={e} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="mt-8 flex flex-1 flex-col lg:mt-0">
        <div className="hidden items-center justify-end gap-2 lg:flex">
          <MonthButtons
            go={go}
            onToday={backToToday}
            atToday={current === here}
          />
        </div>

        <div className="mt-4 grid grid-cols-7 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/55 md:text-[13px]">
          {DAYS.map((d) => (
            <span key={d}>
              <span className="md:hidden">{d[0]}</span>
              <span className="hidden md:inline">{d}</span>
            </span>
          ))}
        </div>

        <div className="grid flex-1 auto-rows-fr grid-cols-7 border-l border-t border-white/15">
          {cells(m).map((d, i) => {
            const list = d ? listFor(d) : [];
            const photo = list.find((e) => e.image);
            const active = d !== null && d === selected;
            return (
              <button
                key={i}
                type="button"
                disabled={!d}
                onClick={() => d && setSelected(d)}
                aria-pressed={active}
                aria-label={
                  d
                    ? `${MONTHS[m.month - 1]} ${d}, ${list.length} event${list.length === 1 ? "" : "s"}`
                    : undefined
                }
                className={cn(
                  "relative flex min-h-[52px] flex-col items-start overflow-hidden border-b border-r border-white/15 p-1.5 text-left md:min-h-[104px] md:p-2",
                  !d && "bg-white/[0.02]",
                  active && "ring-2 ring-inset ring-[#f97316]",
                )}
              >
                {photo && !(d && isPast(d)) ? (
                  <>
                    <Image
                      src={photo.image!}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover object-[center_30%] opacity-60"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
                  </>
                ) : null}
                {d ? (
                  <span
                    className={cn(
                      "relative flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums md:text-[13px]",
                      isToday(d)
                        ? "bg-[#f97316] text-white"
                        : list.length
                          ? "text-white"
                          : "text-white/40",
                    )}
                  >
                    {d}
                  </span>
                ) : null}
                {/* Phones: a dot per event; larger screens: logo and name */}
                {list.length ? (
                  <span className="relative mt-1 flex gap-1 md:hidden">
                    {list.map((e) => (
                      <span
                        key={e.slug}
                        className="size-1.5 rounded-full bg-[#f97316]"
                      />
                    ))}
                  </span>
                ) : null}
                {d && isPast(d) && list.length ? (
                  // Done: the event's photo and logo, stacked like stickers
                  <span className="relative mt-1 hidden w-full flex-1 md:block">
                    <span className="relative block h-[84px]">
                      {photo ? (
                        <span className="absolute left-0.5 top-0 block w-[78%] max-w-[118px] -rotate-[4deg] rounded-[3px] bg-white p-1 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.8)]">
                          <span className="relative block aspect-[4/3] overflow-hidden rounded-[2px]">
                            <Image
                              src={photo.image!}
                              alt=""
                              fill
                              sizes="120px"
                              className="object-cover object-[center_30%]"
                            />
                          </span>
                        </span>
                      ) : null}
                      {list.map((e, j) => (
                        <EventMark
                          key={e.slug}
                          event={e}
                          className={cn(
                            "absolute size-10 rounded-[6px] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.8)]",
                            photo ? "right-1 top-9 size-9" : "left-1 top-1",
                            j > 0 && "translate-x-6 translate-y-2",
                            ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6"][
                              (d + j) % 4
                            ],
                          )}
                        />
                      ))}
                    </span>
                    <span className="mt-1.5 line-clamp-1 text-[11px] font-medium leading-[1.25] text-white/80">
                      {dayless(list[0]) ? "≈ " : ""}
                      {list[0].name}
                      {list.length > 1 ? ` +${list.length - 1}` : ""}
                    </span>
                  </span>
                ) : null}
                <span
                  className={cn(
                    "relative mt-1.5 hidden w-full space-y-1.5",
                    !(d && isPast(d)) && "md:block",
                  )}
                >
                  {list.map((e) => (
                    <span
                      key={e.slug}
                      className="flex items-start gap-1.5 text-[11.5px] font-medium leading-[1.25]"
                    >
                      <EventMark event={e} className="size-5 rounded-[5px]" />
                      <span className="line-clamp-2">
                        {dayless(e) ? "≈ " : ""}
                        {e.name}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Phones and tablets: the chosen day under the grid */}
        <div className="mt-6 lg:hidden">
          {selected ? (
            <>
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/45">
                {weekday}, {MONTHS[m.month - 1]} {selected}
              </p>
              {picked.length ? (
                <ul className="mt-1">
                  {picked.map((e) => (
                    <EventLine key={e.slug} event={e} />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[14px] text-white/50">
                  No events on this day.
                </p>
              )}
            </>
          ) : null}
          {upcoming.length ? (
            <div className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/45">
                Coming up
              </p>
              <ul className="mt-1">
                {upcoming.map((e) => (
                  <EventLine key={e.slug} event={e} />
                ))}
              </ul>
            </div>
          ) : null}
          {loose.length ? (
            <div className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/45">
                Also in {MONTHS[m.month - 1]}
              </p>
              <ul className="mt-1">
                {loose.map((e) => (
                  <EventLine key={e.slug} event={e} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MonthButtons({
  go,
  onToday,
  atToday,
}: {
  go: (delta: number) => void;
  onToday: () => void;
  atToday: boolean;
}) {
  return (
    <>
      {atToday ? null : (
        <button
          type="button"
          onClick={onToday}
          className="h-10 rounded-full bg-[#f97316] px-4 text-[13px] font-medium text-white"
        >
          Today
        </button>
      )}
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => go(-1)}
        className="flex size-10 items-center justify-center rounded-full bg-white/10"
      >
        <ArrowLeft weight="bold" className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => go(1)}
        className="flex size-10 items-center justify-center rounded-full bg-white/10"
      >
        <ArrowRight weight="bold" className="size-4" />
      </button>
    </>
  );
}
