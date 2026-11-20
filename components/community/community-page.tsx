"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Broadcast,
  Code,
  MicrophoneStage,
  UsersThree,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { DotArt } from "@/components/community/dot-art";
import { Landmark, Skyline } from "@/components/community/landmarks";
import { CommunityBento, TogetherSpread, TogetherWeBuild } from "@/components/community/community-sections";
import { RegistrationBar, UpcomingEvents } from "@/components/community/upcoming";
import { PartnerWall } from "@/components/community/partner-wall";
import { DISCORD_URL, JoinCommunity } from "@/components/community/join";
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
  const { upcoming, past, cities, totals } = data;
  const all = [...upcoming, ...past];
  const byId = new Map(all.map((e) => [e.id, e]));
  // The soonest event taking registrations, for the pill along the bottom
  const registering = upcoming.find((e) => e.cta === "Register" && e.href) ?? upcoming.find((e) => e.href) ?? null;
  const stats: [number, string, string][] = [
    [totals.events, "Events", "Run, spoken at or joined"],
    [totals.cities, "Cities", "Where we've shown up in person"],
    [totals.meetups, "Meetups", "Evening talks and demos"],
    [totals.hackathons, "Hackathons", "Build weekends with tool teams"],
  ];
  const hackathons = upcoming.filter((e) => e.kind === "hackathon").slice(0, 4);
  const meetups = upcoming.filter((e) => e.kind !== "hackathon").slice(0, 4);

  return (
    <div style={PAPER_SCOPE}>
      {/* Hero: the community, in dots */}
      <PaperPageHeader className="pb-12 pt-28 md:pb-16 md:pt-36">
        <Container>
          <DotArt src="/assets/community/hand-in-hand.png" alt="Five people walking hand in hand" className="mx-auto max-w-[1100px]" />

          <div className="mt-12 flex flex-col items-center text-center md:mt-14">
            <motion.h1
              className="max-w-[760px] text-balance text-[36px] font-medium leading-[1.05] tracking-[-0.045em] sm:text-[48px] lg:text-[56px]"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
            >
              Developers who show up, together
            </motion.h1>
            <motion.div
              className="mt-5 flex flex-col items-center"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
            >
              <p className="max-w-[500px] text-balance text-[16px] leading-[1.6] text-[#141414]/60 md:text-[18px]">
                Meetups, hackathons and the people who build at them. Find one near you, or bring one to your city.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2">
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#141414] px-6 text-[14.5px] font-medium text-white transition-colors hover:bg-[#f97316]">
                  <DiscordIcon className="size-4" /> Join the Discord
                </a>
                <a href="#up-next" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/70 px-6 text-[14.5px] font-medium ring-1 ring-inset ring-[#141414]/15 transition-colors hover:bg-white">
                  See what&apos;s next
                </a>
              </div>
            </motion.div>
          </div>

        </Container>
      </PaperPageHeader>

      {/* 01 Impact: the numbers */}
      <PaperSection tone="paper">
        <Container>
          <IndexBar index={1} name="Impact" />
          <motion.h2 {...rise(reduce)} className="mt-6 max-w-[680px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
            Where ideas meet <span style={{ color: PRINT }}>the people who build them</span>
          </motion.h2>
          <dl className="mt-10 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {stats.map(([value, label, line], i) => (
              <motion.div
                key={label}
                {...rise(reduce, 0.06 + i * 0.08)}
                className="flex min-w-0 flex-col justify-between gap-10 rounded-[6px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10 transition-[background-color,box-shadow] duration-500 hover:bg-white hover:shadow-[0_18px_34px_-26px_rgba(20,20,20,0.45)] md:p-7"
              >
                <dt className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#141414]/45">{label}</dt>
                <dd>
                  <span className="block text-[48px] font-medium leading-none tracking-[-0.06em] md:text-[64px]">
                    <Count to={value} />
                    <span style={{ color: PRINT }}>+</span>
                  </span>
                  <span className="mt-3 block text-[14px] leading-[1.5] text-[#141414]/55">{line}</span>
                </dd>
              </motion.div>
            ))}
          </dl>
        </Container>
      </PaperSection>

      {/* 02 Hackathons */}
      <PaperSection id="up-next" tone="paper" className="scroll-mt-24">
        <Container>
          <IndexBar index={2} name="Hackathons" />
          <div className="mt-6">
            <UpcomingEvents
              items={hackathons}
              href="/hackathons"
              label="Check out all hackathons"
              heading={
                <motion.h2 {...rise(reduce)} className="max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
                  Explore upcoming <span style={{ color: PRINT }}>hackathons</span>
                </motion.h2>
              }
              empty={
                <>
                  <p className="text-[16px] text-[#141414]/60">No hackathon is open right now. Get an email the day the next one opens.</p>
                  <a href="#join" className={pill}>Get notified</a>
                </>
              }
            />
          </div>
        </Container>
      </PaperSection>

      {/* 03 Meetups */}
      <PaperSection tone="paper">
        <Container>
          <IndexBar index={3} name="Meetups" />
          <div className="mt-6">
            <UpcomingEvents
              items={meetups}
              href="/events"
              label="Check out all events"
              heading={
                <motion.h2 {...rise(reduce)} className="max-w-[640px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
                  Find a <span style={{ color: PRINT }}>local meetup</span>
                </motion.h2>
              }
              empty={
                <>
                  <p className="text-[16px] text-[#141414]/60">Nothing on the calendar this week. Want one in your city?</p>
                  <a href={HOST} className={pill}>Host a meetup</a>
                </>
              }
            />
          </div>
        </Container>
      </PaperSection>

      <TogetherSpread byId={byId} index={4} />

      {/* 04 On the map */}
      {cities.length ? (
        <PaperSection tone="paper">
          <Container>
            <IndexBar index={5} name="On the map" aside={`${cities.length} cities`} />
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

      <CommunityBento data={data} index={cities.length ? 6 : 5} />

      <PartnerWall index={cities.length ? 7 : 6} />

      <JoinCommunity index={cities.length ? 8 : 7} />

      <YourCity cities={cities.map((c) => c.city)} />

      <RegistrationBar item={registering} />
    </div>
  );
}
