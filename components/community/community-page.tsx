"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
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
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { Landmark, Skyline } from "@/components/community/landmarks";
import { CommunityBento, TogetherSpread, TogetherWeBuild } from "@/components/community/community-sections";
import { RegistrationBar, UpcomingEvents } from "@/components/community/upcoming";
import { JoinCommunity } from "@/components/community/join";
import { BeenHere } from "@/components/community/been-here";
import { CommunityHero } from "@/components/community/hero";
import { WaysIn } from "@/components/community/ways-in";
import type { CommunityData, CommunityKind } from "@/lib/community";
import { GRAIN, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

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


const pill =
  "inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-medium ring-1 ring-inset ring-[#141414]/15 transition-colors hover:bg-[#141414] hover:text-white";

/** The closing banner: every city's landmark drawn in as it scrolls into view. */
function YourCity({ cities }: { cities: string[] }) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const drawn = useInView(ref, { once: true, margin: "-120px" });
  return (
    <PaperSection tone="paper">
      <Container>
        <motion.div {...rise(reduce)} ref={ref} className="relative isolate overflow-hidden rounded-[8px] bg-white/80 ring-1 ring-inset ring-[#141414]/10">
          {/* an orange print texture: a warm glow from below, orange halftone dots at the edges, paper grain */}
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_70%_60%_at_50%_110%,rgba(249,115,22,0.26),transparent_70%),radial-gradient(ellipse_40%_40%_at_0%_0%,rgba(249,115,22,0.14),transparent_70%),radial-gradient(ellipse_40%_40%_at_100%_0%,rgba(249,115,22,0.14),transparent_70%)]" />
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(rgba(249,115,22,0.5)_1.1px,transparent_1.4px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_55%_65%_at_50%_40%,transparent_35%,black_95%)]" />
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
          <div className="relative flex flex-col items-center px-6 pb-12 pt-14 text-center md:pb-14 md:pt-20">
            <h2 className="max-w-[720px] text-balance text-[36px] font-medium leading-[1.04] tracking-[-0.045em] md:text-[56px]">
              Bring Studio1 to <span style={{ color: PRINT }}>your city</span>
            </h2>
            <p className="mt-5 max-w-[500px] text-[16px] leading-[1.6] text-[#141414]/60 md:text-[17px]">
              Run a college club, a community or a devtool company? Host a meetup with us, or partner on a hackathon.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <a href={HOST} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#141414] px-6 text-[14.5px] font-medium text-white transition-colors hover:bg-[#f97316]">
                Host a meetup <ArrowUpRight weight="bold" className="size-4" />
              </a>
              <a href={PARTNER} className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[14.5px] font-medium ring-1 ring-inset ring-[#141414]/15 transition-colors hover:bg-[#f4efe7]">
                Partner on a hackathon
              </a>
            </div>
          </div>
          {/* the cities we've been to, in ink, standing on the bottom edge */}
          <div className={cn("s1-skyline relative px-4 md:px-10", (drawn || reduce) && "is-drawn")} style={{ color: "rgba(20,20,20,0.55)" }}>
            <Skyline cities={cities.slice(0, 9)} />
          </div>
          <span aria-hidden className="block h-px bg-[#141414]/20" />
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
  const hackathons = upcoming.filter((e) => e.kind === "hackathon").slice(0, 8);
  const meetups = upcoming.filter((e) => e.kind !== "hackathon").slice(0, 8);

  return (
    <div style={PAPER_SCOPE}>
      <CommunityHero totals={totals} next={upcoming} />

      <WaysIn data={data} index={1} />

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

      <BeenHere items={past} />

      <JoinCommunity />


      <YourCity cities={cities.map((c) => c.city)} />

      <RegistrationBar item={registering} />
    </div>
  );
}
