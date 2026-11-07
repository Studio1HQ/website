"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { ArrowUpRight, MapPin } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { EventMark } from "@/components/events/events-page";
import type { EventKind, StudioEvent } from "@/data/events";
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
const pad = (n: number) => String(n).padStart(2, "0");

function stamp(e: StudioEvent) {
  if (e.approx) return `${e.approx} ${e.year}`;
  if (!e.day) return `${MONTHS[e.month - 1]} ${e.year}`;
  const days = e.endDay ? `${e.day}–${e.endDay}` : `${e.day}`;
  return `${MONTHS[e.month - 1]} ${days}, ${e.year}`;
}

function bigDate(e: StudioEvent) {
  if (!e.day) return MONTHS[e.month - 1].slice(0, 3);
  const days = e.endDay ? `${e.day}–${e.endDay}` : pad(e.day);
  return `${days}.${pad(e.month)}`;
}

const sortKey = (e: StudioEvent) =>
  e.year * 10000 + e.month * 100 + (e.day ?? 15);

/** A plain line for events without their own write-up yet. */
const FALLBACK: Record<EventKind, (e: StudioEvent) => string> = {
  Conference: (e) =>
    `On stage at ${e.name}, sharing what we learn building and growing developer tools.`,
  Hackathon: (e) =>
    `With the builders at ${e.name}, from first idea to final demo.`,
  Meetup: (e) =>
    `In the room at the ${e.name}, with the local developer community.`,
  Community: (e) =>
    `Part of ${e.name}, alongside the student developer community.`,
  Podcast: (e) => `In conversation on the ${e.name}.`,
  Livestream: (e) => `Live on the ${e.name}, building and answering questions.`,
  Webinar: (e) => `A live session for developers: ${e.name}.`,
};
const story = (e: StudioEvent) => e.summary ?? FALLBACK[e.kind](e);

/** The write-up, with quoted titles (the point of it) underlined. */
function Story({
  event,
  className,
}: {
  event: StudioEvent;
  className?: string;
}) {
  const parts = story(event).split(/("[^"]+")/);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith('"') ? (
          <span key={i} className="font-medium text-[#141414]">
            {part.slice(1, -1)}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function WatchLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[5px] transition-colors hover:decoration-[#f97316]"
    >
      {/youtube\.com|youtu\.be/.test(href) ? "Watch the session" : "View"}
      <ArrowUpRight weight="bold" className="size-4" />
    </a>
  );
}

function Place({ event }: { event: StudioEvent }) {
  return event.place ? (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-[#141414]/[0.05] px-2.5 py-1 text-[12.5px] font-medium text-[#141414]/65">
      <MapPin weight="fill" className="size-3.5 text-[#f97316]" />
      {event.place}
    </p>
  ) : null;
}

/** One house look for every photo: a warm, slightly muted grade. */
function Photo({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover [filter:saturate(0.8)_sepia(0.1)_contrast(1.04)]"
    />
  );
}

/** Clear glass: the page and the ribbon show through, softly. */
const GLASS =
  "bg-[#fbf9f5]/[0.92] backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_30px_60px_-44px_rgba(20,20,20,0.35)] ring-1 ring-[#141414]/[0.06]";

/** Storyboard entrance: slides in from its own side, no zoom. */
const slide = (fromRight: boolean, reduceMotion: boolean, delay = 0) => ({
  initial: reduceMotion ? false : { opacity: 0, x: fromRight ? 56 : -56 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: EASE, delay },
});

/** Engraved panel for the writing, pressed into the glass. */
const ENGRAVED =
  "rounded-[10px] bg-[#141414]/[0.025] shadow-[inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06),inset_0_-1px_0_rgba(255,255,255,0.75)]";

/** The event's photos, changing on their own; thumbnails on glass inside. */
function Slideshow({ event }: { event: StudioEvent }) {
  const photos = event.gallery?.length ? event.gallery : [event.image!];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (photos.length < 2 || paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % photos.length), 3800);
    return () => clearInterval(t);
  }, [photos.length, paused]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={photos[i]}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <Image
            src={photos[i]}
            alt={event.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover [filter:saturate(0.85)_contrast(1.03)]"
          />
        </motion.div>
      </AnimatePresence>

      {photos.length > 1 ? (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-[10px] bg-[#141414]/70 p-1.5">
          {photos.map((src, k) => (
            <button
              key={src}
              type="button"
              aria-label={`Photo ${k + 1} of ${photos.length}`}
              onClick={() => setI(k)}
              className={cn(
                "relative aspect-[4/3] w-14 overflow-hidden rounded-[7px] transition-opacity md:w-16",
                k === i
                  ? "opacity-100 ring-2 ring-[#f97316]"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Photo src={src} alt="" sizes="64px" />
            </button>
          ))}
          <span className="ml-auto pr-2 text-[12px] font-medium tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
            {i + 1} / {photos.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** An event with photos: the slideshow fills one half, the story the other. */
function Feature({
  event,
  flip,
  reduceMotion,
}: {
  event: StudioEvent;
  flip: boolean;
  reduceMotion: boolean;
}) {
  return (
    <article
      id={event.slug}
      className={cn(
        "relative grid scroll-mt-28 overflow-hidden rounded-[14px] md:w-[92%] md:grid-cols-2",
        // Staggered: one leaning left, the next leaning right
        flip && "md:ml-auto",
        GLASS,
      )}
    >
      <motion.div
        className={cn(
          "relative min-h-[300px] overflow-hidden bg-[#1c1917] md:min-h-[440px]",
          flip && "md:order-2",
        )}
        {...slide(flip, reduceMotion)}
      >
        <Slideshow event={event} />
      </motion.div>

      <motion.div
        className={cn("p-3 md:p-4", flip && "md:order-1")}
        {...slide(!flip, reduceMotion, 0.12)}
      >
        <div
          className={cn(
            "flex h-full flex-col justify-center p-6 md:p-9",
            ENGRAVED,
          )}
        >
          <p className="text-[56px] font-medium leading-none tracking-[-0.05em] tabular-nums md:text-[72px]">
            {bigDate(event)}
            <span className="ml-2 text-[0.4em] tracking-[-0.02em] text-[#141414]/35">
              {event.year}
            </span>
          </p>
          <h3 className="mt-6 flex items-start gap-3 text-[26px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[30px]">
            <EventMark
              event={event}
              bare
              className="mt-[3px] size-8 rounded-[6px]"
            />
            <span className="min-w-0">{event.name}</span>
          </h3>
          <div className="mt-2">
            <Place event={event} />
          </div>
          <Story
            event={event}
            className="mt-4 max-w-[440px] text-[15px] leading-[1.65] text-[#141414]/65"
          />
          {event.link ? (
            <div className="mt-6">
              <WatchLink href={event.link} />
            </div>
          ) : null}
        </div>
      </motion.div>
    </article>
  );
}

/** An event without photos yet: a glass card with its logo. */
function Brief({
  event,
  index,
  reduceMotion,
}: {
  event: StudioEvent;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.li
      id={event.slug}
      className={cn("flex scroll-mt-28 flex-col rounded-[14px] p-6", GLASS)}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: EASE, delay: (index % 3) * 0.08 }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[30px] font-medium leading-none tracking-[-0.04em] tabular-nums">
          {bigDate(event)}
        </p>
      </div>
      <h3 className="mt-6 flex items-start gap-2.5 text-[17px] font-medium leading-[1.3] tracking-[-0.02em]">
        <EventMark event={event} bare className="mt-px size-6 rounded-[5px]" />
        <span className="min-w-0">{event.name}</span>
      </h3>
      <div className="mt-1.5">
        <Place event={event} />
      </div>
      <Story
        event={event}
        className="mt-3 text-[14px] leading-[1.6] text-[#141414]/60"
      />
      {event.link ? (
        <div className="mt-auto pt-5">
          <WatchLink href={event.link} />
        </div>
      ) : null}
    </motion.li>
  );
}

/** The year as a chapter title: the number, then what the year held. */
function YearHead({
  title,
  list,
  reduceMotion,
}: {
  title: string;
  list: StudioEvent[];
  reduceMotion: boolean;
}) {
  const tally = new Map<string, number>();
  for (const e of list) tally.set(e.kind, (tally.get(e.kind) ?? 0) + 1);
  const withPhotos = list.filter((e) => e.image).length;
  const stats: [number, string][] = [
    [list.length, "Events"],
    [tally.get("Conference") ?? 0, "Conferences"],
    [tally.get("Hackathon") ?? 0, "Hackathons"],
    [withPhotos, "With photos"],
  ];
  return (
    <motion.div
      className="grid items-end gap-6 md:grid-cols-[auto_1fr]"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <h2 className="text-[88px] font-medium leading-[0.8] tracking-[-0.07em] tabular-nums md:text-[160px]">
        {title}
      </h2>
      <div className={cn("rounded-[14px] p-5 md:mb-3 md:ml-6", GLASS)}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(([n, label]) => (
            <div key={label}>
              <dd className="text-[28px] font-medium leading-none tracking-[-0.04em] tabular-nums">
                {n}
              </dd>
              <dt className="mt-1.5 text-[12px] text-[#141414]/55">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </motion.div>
  );
}

/** What is next: one compact glass row with a live countdown. */
function NextUp({
  event,
  now,
  reduceMotion,
}: {
  event: StudioEvent;
  now: number;
  reduceMotion: boolean;
}) {
  const start = event.day
    ? new Date(event.year, event.month - 1, event.day)
    : new Date(event.year, event.month - 1, 1);
  const days = Math.ceil((start.getTime() - now) / 86400000);
  return (
    <motion.article
      id={event.slug}
      className={cn(
        "flex scroll-mt-28 flex-wrap items-center gap-x-6 gap-y-4 rounded-[14px] p-3 md:flex-nowrap",
        GLASS,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-4 px-4 py-4 md:px-5",
          ENGRAVED,
        )}
      >
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[12px] font-medium text-[#141414] shadow-[0_1px_2px_rgba(20,20,20,0.08)]">
          <span className="size-1.5 rounded-full bg-[#f97316]" />
          Coming up
        </span>
        <EventMark
          event={event}
          bare
          className="size-7 shrink-0 rounded-[6px]"
        />
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-medium tracking-[-0.02em]">
            {event.name}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-[#141414]/55">
            <span>{stamp(event)}</span>
            {event.place ? (
              <span className="flex items-center gap-1">
                <MapPin weight="fill" className="size-3.5 text-[#f97316]" />
                {event.place}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-baseline gap-2 px-4 md:px-6">
        <span className="text-[32px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#f97316]">
          {days > 0 ? days : bigDate(event)}
        </span>
        <span className="text-[13px] text-[#141414]/55">
          {days > 0 ? (days === 1 ? "day to go" : "days to go") : "this month"}
        </span>
      </div>
      <a
        href={event.link ?? "/calendar"}
        target={event.link ? "_blank" : undefined}
        rel={event.link ? "noreferrer" : undefined}
        className="mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#141414] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2a2522]"
      >
        {event.link ? "Event site" : "Open calendar"}
        <ArrowUpRight weight="bold" className="size-3.5" />
      </a>
    </motion.article>
  );
}

/**
 * The events, newest first: what is coming up, then a chapter per year,
 * photographed events as full-bleed cards and the rest as smaller ones. A
 * wide orange ribbon enters from one edge of the screen, sweeps behind the
 * glass cards and leaves by the other, drawn exactly as far as you scroll.
 */
export function EventGallery({
  events,
  now,
}: {
  events: StudioEvent[];
  now: number;
}) {
  const reduceMotion = !!useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, vw: 0, left: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () =>
      setBox({
        w: el.clientWidth,
        h: el.scrollHeight,
        vw: document.documentElement.clientWidth,
        left: el.getBoundingClientRect().left,
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [events]);

  // Tied straight to the scroll, no easing: the ribbon's head sits mid-screen
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start 85%", "end 60%"],
  });

  const startOfToday = new Date(new Date(now).toDateString()).getTime();
  const isUpcoming = (e: StudioEvent) =>
    (e.day
      ? new Date(e.year, e.month - 1, e.endDay ?? e.day).getTime()
      : new Date(e.year, e.month, 0).getTime()) >= startOfToday;
  const upcoming = events
    .filter(isUpcoming)
    .sort((a, b) => sortKey(a) - sortKey(b));
  const past = events
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => sortKey(b) - sortKey(a));
  const years = [...new Set(past.map((e) => e.year))];

  // In from off the left edge of the screen, side to side, out off the right
  const { w, h, vw, left } = box;
  const offL = -left - 160;
  const offR = vw - left + 160;
  const turns = Math.max(2, Math.round(h / 950));
  const step = h / turns;
  let d = `M ${offL} -40`;
  let x = offL;
  for (let k = 0; k < turns; k++) {
    const last = k === turns - 1;
    // Swing out past the cards into the side margins, so it shows the whole way
    const to = last ? offR : k % 2 === 0 ? w + 30 : -30;
    const y0 = k * step;
    // The last turn leaves the screen well before the section ends
    const end = last ? y0 + step * 0.7 : y0 + step;
    d += ` C ${x} ${y0 + (end - y0) * 0.45}, ${to} ${y0 + (end - y0) * 0.55}, ${to} ${end}`;
    x = to;
  }

  const block = (title: string, list: StudioEvent[]) => {
    const features = list.filter((e) => e.image);
    const briefs = list.filter((e) => !e.image);
    return (
      <section
        key={title}
        aria-label={title}
        className="space-y-8 md:space-y-10"
      >
        <YearHead title={title} list={list} reduceMotion={reduceMotion} />
        {features.map((e, i) => (
          <Feature
            key={e.slug}
            event={e}
            flip={i % 2 === 1}
            reduceMotion={reduceMotion}
          />
        ))}
        {briefs.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {briefs.map((e, i) => (
              <Brief
                key={e.slug}
                event={e}
                index={i}
                reduceMotion={reduceMotion}
              />
            ))}
          </ul>
        ) : null}
      </section>
    );
  };

  return (
    <Container>
      <div ref={wrapRef} className="relative">
        {h ? (
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={w}
            height={h}
          >
            <defs>
              <linearGradient
                id="events-ribbon"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="0"
                y2={h}
              >
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <motion.path
              d={d}
              fill="none"
              stroke="url(#events-ribbon)"
              strokeWidth={vw < 768 ? 40 : 84}
              strokeLinecap="round"
              style={{ pathLength: reduceMotion ? 1 : scrollYProgress }}
            />
          </svg>
        ) : null}

        <div className="relative space-y-20 md:space-y-28">
          {upcoming.length ? (
            <div className="space-y-8">
              {upcoming.map((e) => (
                <NextUp
                  key={e.slug}
                  event={e}
                  now={now}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          ) : null}
          {years.map((y) =>
            block(
              String(y),
              past.filter((e) => e.year === y),
            ),
          )}
        </div>
      </div>
    </Container>
  );
}
