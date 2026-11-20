"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
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
import { DitherField } from "@/components/home/dither-field";
import { DotWord } from "@/components/team/dot-word";
import { CityIcon } from "@/components/hackathons/city-icons";
import { CommunityBento, TogetherSpread, TogetherWeBuild } from "@/components/community/community-sections";
import type { CommunityData, CommunityItem, CommunityKind } from "@/lib/community";
import { GRAIN, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const KIND: Record<CommunityKind, { label: string; icon: Icon }> = {
  meetup: { label: "Meetup", icon: UsersThree },
  hackathon: { label: "Hackathon", icon: Code },
  workshop: { label: "Workshop", icon: Wrench },
  conference: { label: "Talk", icon: MicrophoneStage },
  online: { label: "Online", icon: Broadcast },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: MONTHS[m - 1], d };
};

const CONTACT = "mailto:contact@studio1hq.com";

function rise(reduce: boolean, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.8, ease: EASE, delay },
  } as const;
}

/** An event as a tear-off ticket: the date on a print-orange stub. */
function Ticket({ item, index }: { item: CommunityItem; index: number }) {
  const reduce = !!useReducedMotion();
  const { y, m, d } = parts(item.date);
  const end = item.endDate ? parts(item.endDate).d : null;
  const kind = KIND[item.kind];
  const body = (
    <div className="group relative flex h-full overflow-hidden rounded-[6px] bg-white ring-1 ring-inset ring-[#141414]/10 transition-shadow duration-300 hover:shadow-[0_20px_40px_-28px_rgba(20,20,20,0.5)]">
      <div className="relative isolate flex w-[112px] shrink-0 flex-col items-center justify-center text-white sm:w-[132px]" style={{ background: PRINT }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
        <span className="text-[13px] font-medium uppercase tracking-[0.16em] text-white/80">{m}</span>
        <span className="mt-1 text-[44px] font-medium leading-none tracking-[-0.05em] tabular-nums">
          {item.approx ? "—" : end ? `${d}–${end}` : d}
        </span>
        <span className="mt-1 text-[12px] text-white/75 tabular-nums">{y}</span>
      </div>
      {/* Perforation between the stub and the ticket */}
      <span aria-hidden className="relative w-0 border-l-2 border-dashed border-[#141414]/15">
        <span className="absolute -left-[9px] -top-[9px] size-4 rounded-full bg-[#f4efe7]" />
        <span className="absolute -bottom-[9px] -left-[9px] size-4 rounded-full bg-[#f4efe7]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4efe7] px-2.5 py-1 text-[12px] font-medium text-[#141414]/70">
            <kind.icon weight="bold" className="size-3.5" style={{ color: PRINT }} />
            {kind.label}
            {item.ours ? <span className="text-[#141414]/40">· by Studio1</span> : null}
          </span>
          <h3 className="mt-3 text-[19px] font-medium leading-[1.25] tracking-[-0.02em]">{item.name}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-[14px] text-[#141414]/55">
            <MapPin weight="fill" className="size-3.5 shrink-0" style={{ color: PRINT }} />
            <span className="truncate">
              {[item.venue, item.city].filter(Boolean).join(", ") || "To be announced"}
              {item.approx ? ` · ${item.approx}` : ""}
            </span>
          </p>
        </div>
        {item.href ? (
          <span className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium">
            {item.cta}
            <span className="flex size-7 items-center justify-center rounded-full bg-[#141414] text-white transition-[transform,background-color] duration-300 group-hover:rotate-45 group-hover:bg-[#f97316]">
              <ArrowUpRight weight="bold" className="size-3.5" />
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
  return (
    <motion.li {...rise(reduce, index * 0.06)} className="min-w-0">
      {item.href ? (
        item.external ? (
          <a href={item.href} target="_blank" rel="noopener noreferrer" className="block h-full">{body}</a>
        ) : (
          <Link href={item.href} className="block h-full">{body}</Link>
        )
      ) : (
        body
      )}
    </motion.li>
  );
}

/** A short list of events inside a track panel. */
function MiniList({ items, dark }: { items: CommunityItem[]; dark?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className={cn("mt-6 divide-y", dark ? "divide-white/10" : "divide-[#141414]/10")}>
      {items.map((item) => {
        const { m, y } = parts(item.date);
        return (
          <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
            <span className={cn("min-w-0 truncate text-[15px]", dark ? "text-white/85" : "text-[#141414]/80")}>{item.name}</span>
            <span className={cn("shrink-0 text-[13px] tabular-nums", dark ? "text-white/45" : "text-[#141414]/45")}>
              {item.city ? `${item.city} · ` : ""}{m} {y}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function CommunityPage({ data }: { data: CommunityData }) {
  const reduce = !!useReducedMotion();
  const { upcoming, past, cities, totals, hackathonsOpen } = data;
  const meetups = [...upcoming, ...past].filter((e) => e.kind === "meetup").slice(0, 4);
  const hackathons = [...upcoming, ...past].filter((e) => e.kind === "hackathon").slice(0, 4);
  const byId = new Map([...upcoming, ...past].map((e) => [e.id, e]));
  const marquee = [...cities.map((c) => c.city), "Online"];
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
          <DotWord text="Studio1" />
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
                <a href="#up-next" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#2a2522]">
                  See what&apos;s next
                </a>
                <a href={`${CONTACT}?subject=${encodeURIComponent("Host a Studio1 meetup")}`} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium ring-1 ring-inset ring-[#141414] transition-colors hover:bg-[#141414] hover:text-white">
                  Host a meetup <ArrowUpRight weight="bold" className="size-4" />
                </a>
              </div>
            </motion.div>
          </div>

          <dl className="mt-10 grid grid-cols-2 overflow-hidden rounded-[6px] bg-[#ebe6de] shadow-[inset_0_2px_6px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_rgba(255,255,255,0.85)] md:mt-14 md:grid-cols-4">
            {stats.map(([value, label, StatIcon], i) => (
              <div
                key={label}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 px-3.5 py-4 sm:gap-4 sm:px-5 sm:py-5 md:px-6 md:py-6",
                  i % 2 === 1 && "border-l border-[#141414]/[0.08]",
                  i > 1 && "max-md:border-t max-md:border-[#141414]/[0.08]",
                  i === 2 && "md:border-l md:border-[#141414]/[0.08]",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4efe7] text-[#f97316] sm:size-10">
                  <StatIcon weight="bold" className="size-[18px]" />
                </span>
                <dd className="text-[26px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#141414]/85 sm:text-[32px] md:text-[40px]">{value}</dd>
                <dt className="min-w-0 text-[12px] leading-tight text-[#141414]/55 sm:text-[13px]">{label}</dt>
              </div>
            ))}
          </dl>
        </Container>
      </PaperPageHeader>

      {/* Every city we have been to, scrolling past */}
      <div className="overflow-hidden bg-[#141414] py-4 text-white" aria-hidden>
        <motion.div
          className="flex w-max gap-8 whitespace-nowrap text-[15px] font-medium uppercase tracking-[0.16em]"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        >
          {[...marquee, ...marquee, ...marquee, ...marquee].map((city, i) => (
            <span key={i} className="flex items-center gap-8">
              {city}
              <span className="size-2 bg-[#f97316]" />
            </span>
          ))}
        </motion.div>
      </div>

      {/* 01 Up next */}
      <PaperSection id="up-next" tone="paper" className="scroll-mt-24">
        <Container>
          <IndexBar index={1} name="Up next" aside={<Link href="/calendar" className="underline decoration-[#141414]/25 underline-offset-4 hover:decoration-[#f97316]">Open the calendar</Link>} />
          <h2 className="mt-6 max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
            Where to find us <span style={{ color: PRINT }}>next</span>
          </h2>
          {upcoming.length ? (
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {upcoming.slice(0, 6).map((item, i) => (
                <Ticket key={item.id} item={item} index={i} />
              ))}
            </ul>
          ) : (
            <p className="mt-10 rounded-[6px] bg-white p-8 text-[16px] text-[#141414]/60 ring-1 ring-inset ring-[#141414]/10">
              New dates go up here first. Meanwhile, see everything we have done on the{" "}
              <Link href="/events" className="underline underline-offset-4">events page</Link>.
            </p>
          )}
        </Container>
      </PaperSection>

      <TogetherSpread byId={byId} index={2} />

      {/* 03 Two ways in */}
      <PaperSection tone="paper">
        <Container>
          <IndexBar index={3} name="Two ways in" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <motion.div {...rise(reduce)} className="relative isolate overflow-hidden rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10 md:p-9 [&>*:not(canvas)]:relative">
              <DitherField still strength={1.8} seed={1.3} className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-80 [mask-image:linear-gradient(to_left,black_30%,transparent)]" />
              <span className="flex size-12 items-center justify-center bg-[#141414] text-[#f4efe7]"><UsersThree weight="regular" className="size-6" /></span>
              <h3 className="mt-6 text-[30px] font-medium leading-[1.05] tracking-[-0.04em]">Meetups</h3>
              <p className="mt-3 max-w-[420px] text-[16px] leading-[1.55] text-[#141414]/60">
                Evening talks and demos in a city near you: real projects, honest questions, pizza after.
              </p>
              <MiniList items={meetups} />
              <a href={`${CONTACT}?subject=${encodeURIComponent("Host a Studio1 meetup")}`} className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium">
                Host one with us
                <span className="flex size-7 items-center justify-center rounded-full bg-[#141414] text-white"><ArrowUpRight weight="bold" className="size-3.5" /></span>
              </a>
            </motion.div>

            <motion.div {...rise(reduce, 0.08)} className="relative isolate overflow-hidden rounded-[6px] p-7 text-white md:p-9" style={{ background: PRINT }}>
              <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
              <DitherField still strength={1.8} seed={3.1} colors={["#fdba74", "#ffedd5"]} className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-70 [mask-image:linear-gradient(to_left,black_30%,transparent)]" />
              <span className="flex size-12 items-center justify-center bg-white text-[#f97316]"><Code weight="regular" className="size-6" /></span>
              <h3 className="mt-6 text-[30px] font-medium leading-[1.05] tracking-[-0.04em]">Hackathons</h3>
              <p className="mt-3 max-w-[420px] text-[16px] leading-[1.55] text-white/85">
                Build weekends with the teams behind the tools. Ship something, demo it, win prizes.
              </p>
              <MiniList items={hackathons} dark />
              {hackathonsOpen ? (
                <Link href="/hackathons" className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium">
                  See all hackathons
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#141414] text-white"><ArrowUpRight weight="bold" className="size-3.5" /></span>
                </Link>
              ) : (
                <p className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-medium">
                  Studio1 hackathons open soon
                </p>
              )}
            </motion.div>
          </div>
        </Container>
      </PaperSection>

      {/* 03 Cities */}
      {cities.length ? (
        <PaperSection tone="paper">
          <Container>
            <IndexBar index={4} name="On the map" aside={`${cities.length} cities`} />
            <h2 className="mt-6 max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
              City by city, <span style={{ color: PRINT }}>in person</span>
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {cities.map((c, i) => (
                <motion.li key={c.city} {...rise(reduce, Math.min(i, 8) * 0.04)} className="flex flex-col justify-between gap-6 rounded-[6px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10">
                  <CityIcon city={c.city} className="size-10 text-[#141414]/70" />
                  <div>
                    <p className="text-[18px] font-medium tracking-[-0.02em]">{c.city}</p>
                    <p className="mt-1 text-[13px] text-[#141414]/50">
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

      {/* Bring Studio1 to your city */}
      <PaperSection tone="paper" className="!pt-4">
        <Container>
          <div className="relative isolate overflow-hidden rounded-[6px] bg-[#141414] p-8 text-white md:p-12">
            <DitherField still strength={1.8} seed={5.2} className="absolute inset-y-0 right-0 -z-10 h-full w-[50%] opacity-60 [mask-image:linear-gradient(to_left,black_30%,transparent)]" />
            <h2 className="max-w-[560px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
              Bring Studio1 to <span style={{ color: PRINT }}>your city</span>
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6] text-white/70">
              Run a college club, a community or a devtool company? Host a meetup with us or partner on a hackathon.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <a href={`${CONTACT}?subject=${encodeURIComponent("Host a Studio1 meetup")}`} className="inline-flex h-12 items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[14px] font-medium text-[#141414]">
                Host a meetup
                <span className="flex size-9 items-center justify-center rounded-full text-white" style={{ background: PRINT }}><ArrowUpRight weight="bold" className="size-4" /></span>
              </a>
              <a href={`${CONTACT}?subject=${encodeURIComponent("Partner on a Studio1 hackathon")}`} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[14px] font-medium ring-1 ring-inset ring-white/40 hover:bg-white/10">
                Partner on a hackathon
              </a>
            </div>
          </div>
        </Container>
      </PaperSection>
    </div>
  );
}
