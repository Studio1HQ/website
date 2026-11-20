"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { Container, EASE } from "@/components/home/ui";
import { Cursor, PrintBlock, SelectionFrame } from "@/components/paper/paper-hero";
import type { CommunityItem } from "@/lib/community";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL } from "@/components/community/join";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return [MONTHS[m - 1], String(d).padStart(2, "0")] as const;
};

export function CommunityHero({ totals, next = [] }: { totals: Totals; next?: CommunityItem[] }) {
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
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[8] opacity-[0.3] [mask-image:radial-gradient(ellipse_40%_42%_at_50%_40%,rgba(0,0,0,0.35)_30%,black_90%)]">
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

        {/* Stats card, top right */}
        <motion.div {...float(0.6)} className="absolute right-[3%] top-[16%] w-[19%] max-w-[290px]">
          <SelectionFrame label="card-community" className="p-1.5">
            <div className="bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(27,23,20,0.06)]">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">Events so far</p>
                  <p className="mt-1 text-[30px] font-medium leading-none tracking-[-0.04em]">
                    {totals.events}
                    <span style={{ color: PRINT }}>+</span>
                  </p>
                </div>
                <span className="mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: PRINT }}>
                  <ArrowUpRight weight="bold" className="size-3" />
                  growing
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 border-t border-[#141414]/10 pt-3">
                {(
                  [
                    [totals.cities, "Cities"],
                    [totals.meetups, "Meetups"],
                    [totals.hackathons, "Hackathons"],
                  ] as const
                ).map(([value, label]) => (
                  <div key={label} className="min-w-0 pr-2">
                    <p className="text-[17px] font-medium leading-none tracking-[-0.03em]">{value}</p>
                    <p className="mt-1 truncate text-[10.5px] text-[#141414]/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </SelectionFrame>
          <Cursor className="absolute -bottom-7 left-[22%]" />
        </motion.div>

        {/* Up next card, lower left: the real calendar */}
        {next.length ? (
          <motion.div {...float(0.75)} className="absolute left-[2.5%] top-[42%] w-[19%] max-w-[290px]">
            <SelectionFrame label="card-up-next" className="p-1.5">
              <div className="bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(27,23,20,0.06)]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">Up next</p>
                  <span className="text-[11px] font-medium" style={{ color: PRINT }}>
                    {next.length} on the calendar
                  </span>
                </div>
                <ul className="mt-2.5 divide-y divide-[#141414]/[0.07]">
                  {next.slice(0, 3).map((e) => {
                    const [m, d] = day(e.date);
                    return (
                      <li key={e.id} className="flex items-center gap-3 py-2">
                        <span className="flex w-9 shrink-0 flex-col items-center border border-[#141414]/10 py-0.5">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: PRINT }}>{m}</span>
                          <span className="text-[14px] font-medium leading-none">{d}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium">{e.name}</span>
                          <span className="block truncate text-[11px] text-[#141414]/50">{e.online ? "Online" : e.city}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </SelectionFrame>
            <Cursor className="absolute -bottom-7 left-[30%]" />
          </motion.div>
        ) : null}

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


        <motion.div {...enter(0.55)} className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
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
