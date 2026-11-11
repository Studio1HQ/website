"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { ArrowUpRight, CalendarDots, MapPin } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { EventMark } from "@/components/events/events-page";
import {
  isUpcomingEvent,
  type EventKind,
  type StudioEvent,
} from "@/data/events";
import { GRAIN, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** The grain tile's data URI, for use inside SVG. */
const GRAIN_SRC = GRAIN.slice(5, -2);

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

/** Day of the month to sort by; "Early" and "Late" dates sit near the ends. */
function sortDay(e: StudioEvent) {
  if (e.day) return e.day;
  if (e.approx?.startsWith("Early")) return 5;
  if (e.approx?.startsWith("Late")) return 25;
  return 15;
}
const sortKey = (e: StudioEvent) => e.year * 10000 + e.month * 100 + sortDay(e);

/**
 * A plain line for events without their own write-up yet. It only says what
 * the record holds (the kind, the place, the role if known) and never claims
 * a talk or mentoring the record does not show.
 */
const ROLE_LINE = {
  Talk: "A talk for the builders in the room.",
  Poster: "Presenting a poster at the conference.",
  "Sponsor visit":
    "A visit to a sponsored hackathon to meet the teams building there.",
} as const;
const KIND_LINES: Record<EventKind, string[]> = {
  Conference: [
    "At the conference with the developer community.",
    "Part of the conference, meeting the people building in the space.",
  ],
  Hackathon: [
    "At the hackathon with the teams building there.",
    "Time on the hackathon floor, meeting the builders.",
    "Out with the builders, seeing what the teams put together.",
    "Meeting the teams building at the hackathon.",
  ],
  Meetup: [
    "In the room with the local developer community.",
    "A meetup with the local developer community.",
  ],
  Community: [
    "Alongside the developer community at the event.",
    "Part of the event with the local developer community.",
  ],
  Podcast: ["In conversation on the podcast."],
  Livestream: ["A live session, streamed online."],
  Webinar: ["A live online session for developers."],
};
/** A stable pick, so a caption never changes between renders. */
const pick = (lines: string[], seed: string) =>
  lines[
    [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7) %
      lines.length
  ];
function fallback(e: StudioEvent) {
  if (e.role) return ROLE_LINE[e.role];
  if (e.place === "Online") {
    if (e.kind === "Meetup") return "An online meetup with the community.";
    if (e.kind === "Conference") return "At the conference, online.";
  } else if (e.place && e.kind !== "Podcast") {
    if (e.kind === "Conference")
      return `With the developer community at the conference in ${e.place}.`;
    if (e.kind === "Meetup")
      return `With the local developer community in ${e.place}.`;
    if (e.kind === "Hackathon" || e.kind === "Community")
      return `At ${e.place}, with the builders in the room.`;
  }
  return pick(KIND_LINES[e.kind], e.slug);
}
const story = (e: StudioEvent) => e.summary ?? fallback(e);

/** A line that writes itself in, word by word, as it comes into view. */
function WriteIn({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.8 }}
      transition={{ staggerChildren: 0.06 }}
    >
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 12 },
            shown: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {w}
          {" "}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** The write-up, with quoted titles (the point of it) underlined. */
function Story({
  event,
  className,
}: {
  event: StudioEvent;
  className?: string;
}) {
  // Words, with quoted titles kept bold
  const words = story(event)
    .split(/("[^"]+")/)
    .flatMap((part) =>
      part.startsWith('"')
        ? part
            .slice(1, -1)
            .split(" ")
            .map((w) => ({ w, bold: true }))
        : part
            .split(" ")
            .filter(Boolean)
            .map((w) => ({ w, bold: false })),
    );
  return (
    <motion.p
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.6 }}
      transition={{ staggerChildren: 0.035 }}
    >
      {words.map(({ w, bold }, i) => (
        <motion.span
          key={i}
          className={cn("inline-block", bold && "font-medium text-[#141414]")}
          variants={{
            hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
            shown: { opacity: 1, y: 0, filter: "blur(0px)" },
          }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {w}
          {" "}
        </motion.span>
      ))}
    </motion.p>
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
      {/youtube\.com|youtu\.be/.test(href)
        ? "Watch the session"
        : /linkedin\.com/.test(href)
          ? "View post"
          : "Event site"}
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

/** Solid paper card with a hairline, as on the home page. */
const GLASS =
  "bg-[#fbf9f5] shadow-[0_30px_60px_-44px_rgba(20,20,20,0.35)] ring-1 ring-[#141414]/[0.06]";

/** Storyboard entrance: slides in from its own side, no zoom. */
const slide = (fromRight: boolean, reduceMotion: boolean, delay = 0) => ({
  initial: reduceMotion ? false : { opacity: 0, x: fromRight ? 56 : -56 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: EASE, delay },
});

/** Inner panel for the writing: flat white with a hairline. */
const ENGRAVED =
  "rounded-[6px] bg-white ring-1 ring-inset ring-[#141414]/[0.07]";

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
          // A soft dissolve: the next photo fades in through a light blur
          initial={{ opacity: 0, filter: "blur(10px)", scale: 1.02 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
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
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-[6px] bg-[#141414]/70 p-1.5">
          {photos.map((src, k) => (
            <button
              key={src}
              type="button"
              aria-label={`Photo ${k + 1} of ${photos.length}`}
              onClick={() => setI(k)}
              className={cn(
                "relative aspect-[4/3] w-14 overflow-hidden rounded-[6px] transition-opacity md:w-16",
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
      // The open lane beside the card, where the ribbon passes
      data-ribbon={flip ? "left" : "right"}
      className={cn(
        "relative grid scroll-mt-28 overflow-hidden rounded-[6px] md:w-[86%] md:grid-cols-2",
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
          <h3 className="mt-6 flex items-start gap-3 text-[22px] font-medium leading-[1.2] tracking-[-0.025em] md:text-[24px]">
            <EventMark
              event={event}
              bare
              className="mt-[3px] size-8 rounded-[6px]"
            />
            <WriteIn text={event.name} className="min-w-0" />
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
      className={cn("flex scroll-mt-28 flex-col rounded-[6px] p-6", GLASS)}
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
        <WriteIn text={event.name} className="min-w-0" />
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
      <div className={cn("rounded-[6px] p-5 md:mb-3 md:ml-6", GLASS)}>
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
        "flex scroll-mt-28 flex-wrap items-center gap-x-6 gap-y-4 rounded-[6px] p-3 md:flex-nowrap",
        GLASS,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 basis-full flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 md:basis-auto md:px-5",
          ENGRAVED,
        )}
      >
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-[#f4efe7] px-3 py-1 text-[12px] font-medium text-[#141414] ring-1 ring-inset ring-[#141414]/[0.08]">
          <CalendarDots weight="bold" className="size-3.5 text-[#f97316]" />
          Coming up
        </span>
        <EventMark
          event={event}
          bare
          className="size-7 shrink-0 rounded-[6px]"
        />
        <div className="min-w-0 flex-1">
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
        className="ml-auto mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#141414] md:ml-0 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2a2522]"
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
  const [box, setBox] = useState({
    w: 0,
    h: 0,
    vw: 0,
    left: 0,
    stops: [] as { x: number; y: number }[],
  });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = el.clientWidth;
      // The middle of the open lane beside each photo card
      const stops = [...el.querySelectorAll<HTMLElement>("[data-ribbon]")].map(
        (n) => {
          const c = n.getBoundingClientRect();
          const l = c.left - r.left;
          const rt = c.right - r.left;
          const x = n.dataset.ribbon === "left" ? l / 2 : rt + (w - rt) / 2;
          return { x, y: c.top - r.top + c.height / 2 };
        },
      );
      setBox({
        w,
        h: el.scrollHeight,
        vw: document.documentElement.clientWidth,
        left: r.left,
        stops,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [events]);

  // Real time: the ribbon is revealed down to just past mid-screen, read
  // straight from the scroll position on every frame, no easing
  const { scrollY } = useScroll();
  // How much of the ribbon to draw (0..1): along the path up to the point
  // level with 65% of the screen, read on every scroll frame
  const drawn = useMotionValue(0);
  const pathRef = useRef<SVGPathElement>(null);
  const table = useRef<{ total: number; ys: number[] }>({ total: 0, ys: [] });
  useEffect(() => {
    const path = pathRef.current;
    const el = wrapRef.current;
    if (!path || !el) return;
    // The ribbon's height at each step along it
    const total = path.getTotalLength();
    const ys: number[] = [];
    for (let l = 0; l <= total; l += 8) ys.push(path.getPointAtLength(l).y);
    table.current = { total, ys };
    const update = (y: number) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const target = y + window.innerHeight * 0.65 - top;
      const { ys: list } = table.current;
      let i = list.findIndex((v) => v > target);
      if (i < 0) i = list.length;
      drawn.set(Math.min(1, (i * 8) / Math.max(1, total)));
    };
    update(window.scrollY);
    return scrollY.on("change", update);
  }, [scrollY, drawn, box]);

  const isUpcoming = (e: StudioEvent) => isUpcomingEvent(e, now);
  const upcoming = events
    .filter(isUpcoming)
    .sort((a, b) => sortKey(a) - sortKey(b));
  const past = events
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => sortKey(b) - sortKey(a));
  const years = [...new Set(past.map((e) => e.year))];

  // In from off the left edge of the screen, through the lane beside each
  // photo card, out off the right; a smooth curve through those points
  const { w, h, vw, left, stops } = box;
  const offL = -left - 160;
  const offR = vw - left + 160;
  const n = Math.max(2, Math.round(h / 700));
  const zigzag = Array.from({ length: n }, (_, k) => ({
    x: k % 2 === 0 ? w * 0.85 : w * 0.15,
    y: ((k + 1) / (n + 1)) * h,
  }));
  const pts: { x: number; y: number }[] = [
    { x: offL, y: -40 },
    ...(stops.length && vw >= 768 ? stops : zigzag),
  ];
  const lastY = pts[pts.length - 1].y;
  pts.push({ x: offR, y: Math.min(h - 120, lastY + 420) });
  // Catmull-Rom through the points, as cubic Béziers
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
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
              {/* The home page's ink grain, tiled over the flat print ribbon */}
              <pattern
                id="events-ribbon-grain"
                patternUnits="userSpaceOnUse"
                width="160"
                height="160"
              >
                <image href={GRAIN_SRC} width="160" height="160" />
              </pattern>
            </defs>
            <motion.path
              ref={pathRef}
              d={d}
              style={{ pathLength: reduceMotion ? 1 : drawn }}
              fill="none"
              stroke={PRINT}
              strokeWidth={vw < 768 ? 40 : 84}
              strokeLinecap="round"
            />
            <motion.path
              d={d}
              style={{
                pathLength: reduceMotion ? 1 : drawn,
                mixBlendMode: "multiply",
              }}
              fill="none"
              stroke="url(#events-ribbon-grain)"
              strokeOpacity={0.4}
              strokeWidth={vw < 768 ? 40 : 84}
              strokeLinecap="round"
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
