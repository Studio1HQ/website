"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import Logo from "@/components/ui/svgs/logo";
import { Container, EASE } from "@/components/home/ui";
import { Cursor, PrintBlock, SelectionFrame } from "@/components/paper/paper-hero";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL, Subscribe } from "@/components/community/join";
import { LumaLogo } from "@/components/community/luma-logo";
import { SketchDesk } from "@/components/community/sketch-desk";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The community hero, set like the homepage hero: a paper sheet with
 * design-file artefacts around the words (the Studio1 block print, the
 * reaching hand, a stats card, an event photo in a labelled frame), all
 * fading softly into the paper.
 */

const STRIP = [
  "aki-hacks/02", "ai-engineer-singapore/01", "claude-code-delhi/01", "hackspire-2/02", "react-alicante/01",
  "scee-hackathon/03", "cncf-taiwan/01", "synchronicity-s2/03", "coscup/02", "cityjs-athens/01",
].map((p) => "/assets/events/" + p + ".webp");

type Totals = { events: number; cities: number; meetups: number; hackathons: number };

/** A pushpin, seen a little from above. */
function Pin({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 28 28" className="absolute -top-3 left-1/2 z-10 size-7 -translate-x-1/2 drop-shadow-[0_3px_2px_rgba(20,20,20,0.35)]">
      <circle cx="14" cy="12" r="9" fill={color} />
      <circle cx="11" cy="9" r="3" fill="white" opacity="0.55" />
      <path d="M14 21 v6" stroke="#6b6b6b" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** A print pinned to the board: white border, caption underneath, a pin on top. */
function Pinned({
  src,
  caption,
  pin,
  tilt,
  className,
  delay,
  reduce,
}: {
  src: string;
  caption: string;
  pin: string;
  tilt: number;
  className: string;
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.figure
      className={`absolute bg-white p-1.5 pb-0 shadow-[0_18px_30px_-18px_rgba(20,20,20,0.55)] ring-1 ring-[#141414]/[0.05] ${className}`}
      style={{ rotate: tilt }}
      initial={reduce ? false : { opacity: 0, y: -16, rotate: tilt * 2, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, rotate: tilt, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      <Pin color={pin} />
      <div className="relative aspect-[4/3] overflow-hidden bg-[#e6e1d9]">
        <Image src={src} alt="" fill sizes="190px" className="object-cover" />
        <span className="absolute inset-0 opacity-20 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      </div>
      <figcaption className="py-1.5 text-center text-[11px] font-medium tracking-[0.02em] text-[#141414]/60">{caption}</figcaption>
    </motion.figure>
  );
}

export function CommunityHero({ totals }: { totals: Totals }) {
  const reduce = !!useReducedMotion();
  const enter = (delay: number) =>
    ({
      initial: reduce ? false : { opacity: 0, y: 18, filter: "blur(8px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      transition: { duration: 1, ease: EASE, delay },
    }) as const;
  const float = (delay: number) =>
    ({
      initial: reduce ? false : { opacity: 0, scale: 0.96, filter: "blur(10px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      transition: { duration: 1.2, ease: EASE, delay },
    }) as const;

  return (
    <section className="relative isolate overflow-hidden" style={{ background: PAPER, color: INK }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />

      {/* the sketched desk, clear behind the words and fading out at the bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[8] opacity-[0.5] [mask-image:radial-gradient(ellipse_40%_42%_at_50%_40%,rgba(0,0,0,0.6)_30%,black_90%)]">
        <SketchDesk className="absolute inset-0 size-full" />
      </div>

      {/* ----- Canvas artefacts (large screens) ----- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] hidden xl:block">
        {/* Block print: the Studio1 mark, top left */}
        <motion.div {...float(0.5)} className="absolute left-[5%] top-[24%]">
          <SelectionFrame label="studio1-community" labelPosition="top-left" className="p-1.5">
            <PrintBlock className="flex size-[120px] items-center justify-center 2xl:size-[140px]">
              <Logo className="size-[62%] brightness-0 invert" knockout />
            </PrintBlock>
          </SelectionFrame>
          <Cursor className="absolute -bottom-8 -right-6" />
        </motion.div>

        {/* Mood board, top right: prints pinned up */}
        <div className="absolute right-[2.5%] top-[12%] h-[330px] w-[340px] 2xl:right-[4%]">
          <Pinned src="/assets/events/kubecon-india-2025/01.webp" caption="KubeCon India" pin="#ef5a2c" tilt={-5} className="left-0 top-6 w-[150px]" delay={0.5} reduce={reduce} />
          <Pinned src="/assets/events/hacktropica/01.webp" caption="Hacktropica" pin="#2451d6" tilt={6} className="right-0 top-0 w-[150px]" delay={0.62} reduce={reduce} />
          <Pinned src="/assets/events/blr-tech-week/01.webp" caption="BLR Tech Week" pin="#17a55b" tilt={-2} className="left-[96px] top-[176px] w-[160px]" delay={0.74} reduce={reduce} />
        </div>

        {/* Mood board, lower left */}
        <div className="absolute left-[2.5%] top-[47%] h-[220px] w-[300px] 2xl:left-[4%]">
          <Pinned src="/assets/events/rejekts-na-2024/01.webp" caption="Rejekts NA" pin="#f6bf1d" tilt={4} className="left-0 top-0 w-[150px]" delay={0.86} reduce={reduce} />
          <Pinned src="/assets/events/agentsnexus/01.webp" caption="AgentsNexus" pin="#f4a3c4" tilt={-6} className="left-[124px] top-[44px] w-[150px]" delay={0.98} reduce={reduce} />
        </div>

        {/* Block print: the reaching hand, lower right */}
        <motion.div {...float(0.8)} className="absolute -right-[1%] top-[58%] h-[110px] w-[150px] 2xl:w-[180px]">
          <PrintBlock className="size-full">
            <Image src="/assets/site/hand-right.png" alt="" fill sizes="20vw" className="object-contain object-left p-[8%] [filter:brightness(0)_invert(96%)_sepia(8%)]" />
          </PrintBlock>
        </motion.div>
      </div>

      {/* a soft paper wash behind the words, so the artefacts blur into the sheet */}
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-[4] hidden [background:radial-gradient(ellipse_38%_55%_at_50%_52%,rgba(244,239,231,0.95),transparent_75%)] xl:block" />

      {/* ----- Copy ----- */}
      <Container className="relative flex flex-col items-center justify-center pb-14 pt-36 text-center md:pt-44">
        <motion.p {...enter(0.15)} className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#141414]/50">
          Studio1 Community
        </motion.p>
        <motion.h1 {...enter(0.25)} className="mt-5 text-[42px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] lg:text-[80px]">
          Where developers
          <br />
          <span style={{ color: PRINT }}>show up</span> and build.
        </motion.h1>
        <motion.p {...enter(0.4)} className="mt-6 max-w-[540px] text-[17px] leading-[1.55] text-[#141414]/60 md:text-[18px]">
          Meetups, hackathons and the people who build at them, in {totals.cities} cities and online.
        </motion.p>

        <motion.div {...enter(0.55)} className="mt-9 w-full max-w-[520px]">
          <Subscribe wide light />
        </motion.div>
        <motion.p {...enter(0.62)} className="mt-3 text-[13px] text-[#141414]/45">
          One email when a hackathon or meetup opens near you. Free, always.
        </motion.p>

        <motion.div {...enter(0.75)} className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium ring-1 ring-inset ring-[#141414]/[0.12] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(20,20,20,0.5)]">
            <DiscordIcon className="size-4 text-[#5865F2]" /> Join the Discord
          </a>
          <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-[14px] font-medium ring-1 ring-inset ring-[#141414]/[0.12] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(20,20,20,0.5)]">
            Follow on <LumaLogo className="h-[14px] w-auto -translate-y-px" />
          </a>
        </motion.div>
      </Container>

      {/* A strip of event photos drifting past, faded at both ends */}
      <motion.div {...enter(0.9)} className="relative pb-16 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] md:pb-20">
        <motion.ul
          className="flex w-max gap-3"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 70, ease: "linear", repeat: Infinity }}
        >
          {[...STRIP, ...STRIP].map((src, i) => (
            <li key={src + "-" + i} className={cn("relative h-[150px] shrink-0 overflow-hidden rounded-[6px] bg-[#e6e1d9] md:h-[200px]", i % 3 === 1 ? "w-[120px] md:w-[160px]" : "w-[200px] md:w-[280px]")}>
              <Image src={src} alt="" fill sizes="280px" className="object-cover" />
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}
