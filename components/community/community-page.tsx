"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Broadcast,
  CalendarDots,
  Code,
  MapPin,
  MicrophoneStage,
  UsersThree,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { HandInHand } from "@/components/community/hands";
import { Landmark, Skyline } from "@/components/community/landmarks";
import { CommunityBento, TogetherSpread, TogetherWeBuild } from "@/components/community/community-sections";
import { RegistrationBar, UpcomingEvents } from "@/components/community/upcoming";
import { PartnerWall } from "@/components/community/partner-wall";
import { DISCORD_URL, JoinCommunity } from "@/components/community/join";
import { DitherField } from "@/components/home/dither-field";
import type { CommunityData, CommunityKind } from "@/lib/community";
import { GRAIN, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { DiscordIcon } from "@/components/community/discord-icon";

const KIND: Record<CommunityKind, { label: string; icon: Icon }> = {
  meetup: { label: "Meetup", icon: UsersThree },
  hackathon: { label: "Hackathon", icon: Code },
  workshop: { label: "Workshop", icon: Wrench },
  conference: { label: "Talk", icon: MicrophoneStage },
  online: { label: "Online", icon: Broadcast },
};

const CONTACT = "mailto:contact@studio1hq.com";
const HOST = `${CONTACT}?subject=${encodeURIComponent("Host a Studio1 meetup")}`;
const PARTNER = `${CONTACT}?subject=${encodeURIComponent("Partner on a Studio1 hackathon")}`;

const COUNTRY: Record<string, string> = {
  Kolkata: "India", Bengaluru: "India", "Delhi NCR": "India", Mumbai: "India", Pune: "India",
  Hyderabad: "India", Chennai: "India", Taipei: "Taiwan", Alicante: "Spain", Athens: "Greece",
  Istanbul: "Türkiye", Singapore: "Singapore", "Sri Lanka": "Sri Lanka",
};

/** Scroll-in used across the page: a slow rise and fade, once. */
function rise(reduce: boolean, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 36 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 1.1, ease: EASE, delay },
  } as const;
}

/**
 * Counts up to a number when it scrolls into view. The real number is in
 * the server HTML; it is set to 0 before the first paint and counted up.
 */
function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  const reduce = !!useReducedMotion();
  useLayoutEffect(() => {
    if (!reduce && ref.current) ref.current.textContent = "0";
  }, [reduce]);
  useEffect(() => {
    if (!seen || reduce) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [seen, reduce, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {to}
    </span>
  );
}

/** A way in, cut like the landing hero cards: ink icon tile, dither, the count. */
function WayCard({
  icon: Glyph,
  count,
  title,
  line,
  foot,
  actions,
  index,
}: {
  icon: Icon;
  count: number;
  title: string;
  line: string;
  foot: string;
  actions: ReactNode;
  index: number;
}) {
  const reduce = !!useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE, delay: index * 0.08 }}
      className="group relative isolate flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[6px] bg-white/80 p-6 ring-1 ring-inset ring-[#141414]/10 transition-colors duration-300 hover:bg-white md:p-7 [&>*:not(canvas)]:relative"
    >
      <DitherField still strength={1.8} seed={1.7 + index} className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-80 [mask-image:linear-gradient(to_left,black_30%,transparent)]" />
      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center bg-[#141414] text-[#f4efe7]">
          <Glyph weight="regular" className="size-5" />
        </span>
        <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#141414]/45">{foot}</span>
      </div>
      <div>
        <p className="flex items-baseline gap-2">
          <span className="text-[64px] font-medium leading-none tracking-[-0.06em] tabular-nums">{count}</span>
          <span className="text-[15px] text-[#141414]/50">{title.toLowerCase()} so far</span>
        </p>
        <h3 className="mt-5 text-[22px] font-medium tracking-[-0.03em]">{title}</h3>
        <p className="mt-1.5 max-w-[340px] text-[15px] leading-[1.5] text-[#141414]/60">{line}</p>
        <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
      </div>
    </motion.div>
  );
}

const pill =
  "inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-medium ring-1 ring-inset ring-[#141414]/15 transition-colors hover:bg-[#141414] hover:text-white";

/** The closing banner: every city's landmark drawn in as it scrolls into view. */
function YourCity({ cities }: { cities: string[] }) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const drawn = useInView(ref, { once: true, margin: "-120px" });
  return (
    <PaperSection tone="paper" className="!pt-4">
      <Container>
        <motion.div {...rise(reduce)} ref={ref} className="relative isolate overflow-hidden rounded-[8px] bg-[#141414] text-white">
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: GRAIN }} />
          <div className="relative flex flex-col items-center px-6 pb-10 pt-14 text-center md:pt-20">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/50">Your city, next</p>
            <h2 className="mt-4 max-w-[720px] text-[38px] font-medium leading-[1.02] tracking-[-0.045em] md:text-[60px]">
              Bring Studio1 to <span style={{ color: PRINT }}>your city</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-[16px] leading-[1.6] text-white/65">
              Run a college club, a community or a devtool company? Host a meetup with us, or partner on a hackathon.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <a href={HOST} className="inline-flex h-12 items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[14px] font-medium text-[#141414]">
                Host a meetup
                <span className="flex size-9 items-center justify-center rounded-full text-white" style={{ background: PRINT }}>
                  <ArrowUpRight weight="bold" className="size-4" />
                </span>
              </a>
              <a href={PARTNER} className="inline-flex h-12 items-center rounded-full px-5 text-[14px] font-medium ring-1 ring-inset ring-white/35 transition-colors hover:bg-white/10">
                Partner on a hackathon
              </a>
            </div>
          </div>
          {/* Skyline: every city we have been to, drawn in, standing on the bottom edge */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 [background:radial-gradient(ellipse_60%_100%_at_50%_100%,rgba(249,115,22,0.35),transparent_70%)]" />
          <div className={cn("s1-skyline relative px-3 md:px-6", (drawn || reduce) && "is-drawn")} style={{ color: "#fbd2b0" }}>
            <Skyline cities={cities.slice(0, 9)} />
          </div>
        </motion.div>
      </Container>
    </PaperSection>
  );
}

export function CommunityPage({ data }: { data: CommunityData }) {
  const reduce = !!useReducedMotion();
  const { upcoming, past, cities, totals, hackathonsOpen } = data;
  const all = [...upcoming, ...past];
  const byId = new Map(all.map((e) => [e.id, e]));
  // The soonest event taking registrations, for the pill along the bottom
  const registering = upcoming.find((e) => e.cta === "Register" && e.href) ?? upcoming.find((e) => e.href) ?? null;
  const stats: [number, string, Icon][] = [
    [totals.events, "Events", CalendarDots],
    [totals.cities, "Cities", MapPin],
    [totals.meetups, "Meetups", UsersThree],
    [totals.hackathons, "Hackathons", Code],
  ];

  return (
    <div style={PAPER_SCOPE}>
      {/* Hero */}
      <PaperPageHeader className="pb-10 pt-32 md:pb-14 md:pt-40">
        <Container>
          <h1 className="sr-only">Studio1 Community</h1>
          <HandInHand className="mx-auto block h-auto w-full max-w-[860px]" />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 md:mt-8">
            <motion.p
              aria-hidden
              className="text-[52px] font-medium leading-[0.9] tracking-[-0.06em] sm:text-[96px] lg:text-[128px]"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
            >
              Community
            </motion.p>
            <motion.div
              className="max-w-[400px] pb-2"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1 }}
            >
              <p className="text-[17px] leading-[1.55] text-[#141414]/65">
                Meetups, hackathons and the developers who show up. Find one near you, or bring one to your city.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#2a2522]">
                  <DiscordIcon className="size-4" /> Join the Discord
                </a>
                <a href="#up-next" className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium ring-1 ring-inset ring-[#141414] transition-colors hover:bg-[#141414] hover:text-white">
                  See what&apos;s next
                </a>
              </div>
            </motion.div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4 md:gap-4">
            {stats.map(([value, label, StatIcon], i) => (
              <motion.div
                key={label}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE, delay: 1.1 + i * 0.1 }}
                className="group flex min-w-0 flex-col gap-5 rounded-[6px] bg-white/80 p-4 ring-1 ring-inset ring-[#141414]/10 transition-[background-color,box-shadow,transform] duration-500 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_34px_-26px_rgba(20,20,20,0.45)] sm:p-5 md:p-6"
              >
                <div className="flex items-center justify-between">
                  <dt className="text-[12.5px] font-medium uppercase tracking-[0.14em] text-[#141414]/50">{label}</dt>
                  <span className="flex size-9 shrink-0 items-center justify-center bg-[#141414] text-[#f4efe7] transition-colors duration-500 group-hover:bg-[#f97316] sm:size-10">
                    <StatIcon weight="regular" className="size-[18px]" />
                  </span>
                </div>
                <dd className="text-[36px] font-medium leading-none tracking-[-0.05em] sm:text-[44px] md:text-[52px]">
                  <Count to={value} />
                </dd>
              </motion.div>
            ))}
          </dl>
        </Container>
      </PaperPageHeader>

      {/* 01 Up next */}
      <PaperSection id="up-next" tone="paper" className="scroll-mt-24">
        <Container>
          <IndexBar index={1} name="Up next" aside={<Link href="/calendar" className="underline decoration-[#141414]/25 underline-offset-4 hover:decoration-[#f97316]">Open the calendar</Link>} />
          {upcoming.length ? (
            <div className="mt-6">
              <UpcomingEvents
                items={upcoming.slice(0, 6)}
                heading={
                  <motion.h2 {...rise(reduce)} className="max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
                    Where to find us <span style={{ color: PRINT }}>next</span>
                  </motion.h2>
                }
              />
            </div>
          ) : (
            <>
              <motion.h2 {...rise(reduce)} className="mt-6 max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
                Where to find us <span style={{ color: PRINT }}>next</span>
              </motion.h2>
              <p className="mt-10 rounded-[6px] bg-white p-8 text-[16px] text-[#141414]/60 ring-1 ring-inset ring-[#141414]/10">
                New dates go up here first. Meanwhile, see everything we have done on the{" "}
                <Link href="/events" className="underline underline-offset-4">events page</Link>.
              </p>
            </>
          )}
        </Container>
      </PaperSection>

      <TogetherSpread byId={byId} index={2} />

      {/* 03 Two ways in */}
      <PaperSection tone="paper">
        <Container>
          <IndexBar index={3} name="Two ways in" />
          <motion.h2 {...rise(reduce)} className="mt-6 max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
            Come for a talk, <span style={{ color: PRINT }}>stay to build</span>
          </motion.h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <WayCard
              index={0}
              icon={UsersThree}
              count={totals.meetups}
              title="Meetups"
              line="Evening talks and demos in a city near you: real projects, honest questions."
              foot={`${cities.length} cities`}
              actions={
                <a href={HOST} className={pill}>
                  Host a meetup <ArrowUpRight weight="bold" className="size-3.5" />
                </a>
              }
            />
            {/* Middle: a room full of builders */}
            <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9, ease: EASE, delay: 0.08 }} className="group relative min-h-[360px] overflow-hidden rounded-[6px]">
              <Image src="/assets/events/aki-hacks/03.webp" alt="Developers at a Studio1 hackathon" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.05]" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-7">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-medium backdrop-blur-sm">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: PRINT }} />
                  {totals.events}+ events so far
                </span>
                <p className="mt-3 text-[56px] font-medium leading-none tracking-[-0.06em]">
                  {totals.cities}
                </p>
                <p className="mt-1 text-[14px] text-white/80">Cities where we&apos;ve shown up</p>
              </div>
            </motion.div>
            <WayCard
              index={2}
              icon={Code}
              count={totals.hackathons}
              title="Hackathons"
              line="Build weekends with the teams behind the tools. Ship something, demo it, win."
              foot="Build weekends"
              actions={
                <>
                  {hackathonsOpen ? (
                    <Link href="/hackathons" className={pill}>See hackathons</Link>
                  ) : (
                    <span className={cn(pill, "pointer-events-none text-[#141414]/60")}>Opening soon</span>
                  )}
                  <a href={PARTNER} className={pill}>Partner with us</a>
                </>
              }
            />
          </div>
        </Container>
      </PaperSection>

      {/* 04 On the map */}
      {cities.length ? (
        <PaperSection tone="paper">
          <Container>
            <IndexBar index={4} name="On the map" aside={`${cities.length} cities`} />
            <motion.h2 {...rise(reduce)} className="mt-6 max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
              City by city, <span style={{ color: PRINT }}>in person</span>
            </motion.h2>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cities.map((c, i) => (
                <motion.li key={c.city} {...rise(reduce, Math.min(i, 8) * 0.07)} className="group flex flex-col justify-between gap-5 rounded-[6px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10 transition-shadow duration-300 hover:shadow-[0_18px_34px_-24px_rgba(20,20,20,0.45)] md:p-6">
                  <div className="flex h-[56px] w-[84px] items-end md:h-[64px] md:w-[96px]">
                    <Landmark city={c.city} className="h-full w-full text-[#141414]/75 transition-colors duration-300 group-hover:text-[#f97316]" />
                  </div>
                  <div>
                    <p className="text-[18px] font-medium tracking-[-0.02em] md:text-[20px]">{c.city}</p>
                    <p className="mt-1 text-[13px] text-[#141414]/50">
                      {COUNTRY[c.city] ? `${COUNTRY[c.city]} · ` : ""}
                      {c.count} {c.count === 1 ? "event" : "events"} · {c.kinds.map((k) => KIND[k].label).join(", ")}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </Container>
        </PaperSection>
      ) : null}

      <TogetherWeBuild />

      <CommunityBento data={data} index={cities.length ? 5 : 4} />

      <PartnerWall index={cities.length ? 6 : 5} />

      <JoinCommunity index={cities.length ? 7 : 6} />

      <YourCity cities={cities.map((c) => c.city)} />

      <RegistrationBar item={registering} />
    </div>
  );
}
