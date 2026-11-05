"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Broadcast,
  Code,
  Headphones,
  MapPin,
  MicrophoneStage,
  Monitor,
  Sparkle,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { PaperCta } from "@/components/paper/paper-sections";
import type { EventKind, StudioEvent } from "@/data/events";
import { PAPER_SCOPE } from "@/lib/paper";
import { cn } from "@/lib/utils";

export const KIND_ICON: Record<EventKind, Icon> = {
  Conference: MicrophoneStage,
  Hackathon: Code,
  Meetup: UsersThree,
  Podcast: Headphones,
  Livestream: Broadcast,
  Webinar: Monitor,
  Community: Sparkle,
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
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

const pad = (n: number) => String(n).padStart(2, "0");

/** Sort key: exact days first within a month, then month-only entries. */
const sortKey = (e: StudioEvent) =>
  e.year * 10000 + e.month * 100 + (e.day ?? 0);

/** The last moment the event could still be running. */
function endsAt(e: StudioEvent) {
  if (e.day)
    return new Date(e.year, e.month - 1, e.endDay ?? e.day, 23, 59).getTime();
  return new Date(e.year, e.month, 0, 23, 59).getTime();
}

/** The big date: "22.10", "30–31.05", or "Nov" when only the month is known. */
function bigDate(e: StudioEvent) {
  if (!e.day) return MONTHS[e.month - 1];
  const days = e.endDay ? `${e.day}–${e.endDay}` : pad(e.day);
  return `${days}.${pad(e.month)}`;
}

/** The date in words, kept as loose as the source when it is approximate. */
function dateLine(e: StudioEvent) {
  if (e.approx) return `${e.approx}, ${e.year}`;
  if (!e.day) return `${MONTHS_LONG[e.month - 1]} ${e.year}`;
  const days = e.endDay ? `${e.day}–${e.endDay}` : `${e.day}`;
  return `${MONTHS_LONG[e.month - 1]} ${days}, ${e.year}`;
}

function KindTag({ kind, dark = false }: { kind: EventKind; dark?: boolean }) {
  const KindIcon = KIND_ICON[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        dark
          ? "border-[#141414] bg-[#141414] text-white"
          : "border-[#141414]/20 text-[#141414]/70",
      )}
    >
      <KindIcon weight="bold" className="size-3" />
      {kind}
    </span>
  );
}

/** The event's logo, small, beside its name; the type icon when there is none. */
export function EventMark({
  event,
  className,
}: {
  event: StudioEvent;
  className?: string;
}) {
  const KindIcon = KIND_ICON[event.kind];
  return (
    <span
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white shadow-[0_1px_2px_rgba(20,20,20,0.08)] ring-1 ring-[#141414]/[0.08]",
        className,
      )}
    >
      {event.logo?.endsWith(".svg") ? (
        <span
          aria-hidden
          className="block size-[56%]"
          style={{
            backgroundColor: event.brand ?? "#141414",
            WebkitMask: `url(${event.logo}) center / contain no-repeat`,
            mask: `url(${event.logo}) center / contain no-repeat`,
          }}
        />
      ) : event.logo ? (
        <Image
          src={event.logo}
          alt=""
          fill
          sizes="36px"
          className={event.logoFill ? "object-cover" : "object-contain p-[16%]"}
        />
      ) : (
        <KindIcon weight="regular" className="size-1/2 text-[#141414]/55" />
      )}
    </span>
  );
}

/** A recording or post about the event. */
function WatchLink({ href }: { href: string }) {
  const video = /youtube\.com|youtu\.be/.test(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[5px] transition-colors hover:decoration-[#f97316]"
    >
      {video ? "Watch the session" : "View"}
      <ArrowUpRight weight="bold" className="size-3.5" />
    </a>
  );
}

/** One event as a ruled row: date, name with its logo, details, and the photo if there is one. */
function EventRow({
  event,
  upcoming = false,
}: {
  event: StudioEvent;
  upcoming?: boolean;
}) {
  return (
    <li
      id={event.slug}
      className="group grid scroll-mt-28 grid-cols-[minmax(0,1fr)_auto] transition-colors target:bg-[#f97316]/[0.06] gap-x-6 gap-y-3 border-b border-[#141414]/12 py-6 md:grid-cols-[200px_minmax(0,1fr)_220px_auto] md:items-center md:gap-x-8"
    >
      <p
        className={cn(
          "col-span-2 whitespace-nowrap text-[26px] font-medium leading-none tracking-[-0.04em] tabular-nums md:col-span-1 md:text-[30px]",
          upcoming ? "text-[#f97316]" : "text-[#141414]",
        )}
      >
        {bigDate(event)}
        <span className="ml-1.5 text-[#141414]/30">
          ’{String(event.year).slice(2)}
        </span>
      </p>

      <div className="flex min-w-0 items-center gap-4">
        <EventMark event={event} />
        <div className="min-w-0">
          <p className="text-[17px] font-medium leading-[1.3] tracking-[-0.02em] md:text-[19px]">
            {event.name}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#141414]/55">
            <KindTag kind={event.kind} />
            {event.place ? (
              <span className="flex items-center gap-1">
                <MapPin weight="bold" className="size-3.5" />
                {event.place}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="col-start-1 flex flex-col gap-2 pl-[52px] text-[13.5px] text-[#141414]/60 md:col-start-3 md:pl-0">
        <span>{dateLine(event)}</span>
        {event.link ? <WatchLink href={event.link} /> : null}
      </div>

      {event.image ? (
        <div className="relative col-start-2 row-span-2 row-start-2 aspect-[4/3] w-24 overflow-hidden rounded-[6px] md:col-start-4 md:row-span-1 md:row-start-1 md:w-36">
          <Image
            src={event.image}
            alt={event.name}
            fill
            sizes="144px"
            className={cn(
              "object-cover object-[center_30%] transition-[filter] duration-500",
              !upcoming && "grayscale group-hover:grayscale-0",
            )}
          />
        </div>
      ) : (
        <span className="hidden md:block md:w-36" />
      )}
    </li>
  );
}

/** Small label on the left, a big figure on the right, over a rule. */
function SectionHead({
  label,
  figure,
  faded = false,
}: {
  label: string;
  figure: string;
  faded?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-[#141414] pb-3">
      <p className="flex items-center gap-2 pb-1 text-[13px] font-medium">
        <span className="size-2 rounded-full bg-[#f97316]" />
        {label}
      </p>
      <p
        className={cn(
          "text-[44px] font-medium leading-[0.9] tracking-[-0.05em] tabular-nums sm:text-[72px] lg:text-[88px]",
          faded && "text-[#141414]/30",
        )}
      >
        {figure}
      </p>
    </div>
  );
}

export function EventsPage({
  events,
  now,
}: {
  events: StudioEvent[];
  now: number;
}) {
  const reduceMotion = useReducedMotion();
  const [kind, setKind] = useState<EventKind | "All">("All");

  const kinds = useMemo(() => {
    const counts = new Map<EventKind, number>();
    for (const e of events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const shown = events.filter((e) => kind === "All" || e.kind === kind);
  const upcoming = shown
    .filter((e) => endsAt(e) >= now)
    .sort((a, b) => sortKey(a) - sortKey(b));
  const past = shown
    .filter((e) => endsAt(e) < now)
    .sort((a, b) => sortKey(b) - sortKey(a));
  const years = [...new Set(past.map((e) => e.year))];

  const count = (k: EventKind) => events.filter((e) => e.kind === k).length;
  const stats: [number, string][] = [
    [events.length, "Events"],
    [count("Conference"), "Conferences"],
    [count("Hackathon"), "Hackathons"],
    [
      count("Podcast") + count("Livestream") + count("Webinar"),
      "Online sessions",
    ],
  ];

  const first = upcoming[0];
  const photos = events.filter((e) => e.image);

  return (
    <div style={PAPER_SCOPE}>
      <PaperPageHeader className="pb-12 pt-32 md:pb-16 md:pt-40">
        <Container>
          <p className="flex items-center gap-3 text-[13px] font-medium">
            <span className="size-2 rounded-full bg-[#f97316]" />
            Studio1 Events
            <span aria-hidden className="text-[#141414]/30">
              —
            </span>
            <span className="text-[#141414]/60">
              Talks · Hackathons · Meetups
            </span>
          </p>
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16">
            <motion.h1
              className="text-[64px] font-medium leading-[0.9] tracking-[-0.06em] sm:text-[112px] lg:text-[144px]"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              Events
            </motion.h1>
            <motion.p
              className="max-w-[440px] text-[17px] leading-[1.6] text-[#141414]/65 lg:pb-3"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            >
              Conferences, hackathons, meetups and livestreams the Studio1 team
              has spoken at, run or joined, from KubeCon to campus hackathons.
            </motion.p>
          </div>

          {/* The record, as a single ruled line */}
          <dl className="mt-10 grid grid-cols-2 border-y border-[#141414]/15 md:mt-14 md:grid-cols-4">
            {stats.map(([value, label], i) => (
              <div
                key={label}
                className={cn(
                  "flex items-baseline gap-3 py-5",
                  i % 2 === 1 &&
                    "pl-5 max-md:border-l max-md:border-[#141414]/15",
                  i > 0 && "md:border-l md:border-[#141414]/15 md:pl-6",
                  i > 1 && "max-md:border-t max-md:border-[#141414]/15",
                )}
              >
                <dd className="text-[32px] font-medium leading-none tracking-[-0.05em] tabular-nums md:text-[40px]">
                  {value}
                </dd>
                <dt className="text-[13px] text-[#141414]/55">{label}</dt>
              </div>
            ))}
          </dl>
          {/* Filter by type */}
          <div
            role="tablist"
            aria-label="Filter events by type"
            className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {[["All", events.length] as const, ...kinds].map(([k, n]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k as EventKind | "All")}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                  kind === k
                    ? "bg-[#141414] text-white"
                    : "bg-[#ebe6de] text-[#141414]/70 shadow-[inset_0_1px_3px_rgba(20,20,20,0.1),inset_0_-1px_0_rgba(255,255,255,0.8)] hover:text-[#141414]",
                )}
              >
                {k}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    kind === k ? "text-white/55" : "text-[#141414]/40",
                  )}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
        </Container>
      </PaperPageHeader>

      <section className="pb-24 pt-8 md:pb-32 md:pt-12">
        <Container>
          {photos.length && kind === "All" ? (
            <div className="mb-16 md:mb-24">
              <SectionHead label="From the events" figure="Photos" faded />
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((e) => (
                  <li key={e.slug}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[6px]">
                      <Image
                        src={e.image!}
                        alt={e.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover object-[center_30%]"
                      />
                    </div>
                    <p className="mt-3 flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="font-medium">{e.name}</span>
                      <span className="shrink-0 text-[#141414]/50">
                        {dateLine(e)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {first ? (
            <div>
              <SectionHead
                label="Upcoming"
                figure={`${MONTHS[first.month - 1]} ${first.year}`}
              />
              <ul>
                {upcoming.map((e) => (
                  <EventRow key={e.slug} event={e} upcoming />
                ))}
              </ul>
            </div>
          ) : null}

          {years.map((year, i) => (
            <div
              key={year}
              className={cn((first || i > 0) && "mt-16 md:mt-24")}
            >
              <SectionHead
                label={i === 0 ? "Past events" : "Archive"}
                figure={String(year)}
                faded
              />
              <ul>
                {past
                  .filter((e) => e.year === year)
                  .map((e) => (
                    <EventRow key={e.slug} event={e} />
                  ))}
              </ul>
            </div>
          ))}

          {shown.length === 0 ? (
            <p className="mt-12 text-[15px] text-[#141414]/55">
              No events of this type yet.
            </p>
          ) : null}
        </Container>
      </section>

      <PaperCta />
    </div>
  );
}
