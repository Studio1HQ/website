"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";
import { FLAP_KEYFRAMES } from "@/components/hackathons/flap";
import {
  FlapClock,
  useCountdown,
} from "@/components/hackathons/flap-countdown";
import { InkPill } from "@/components/hackathons/hackathon-ui";
import { FORMAT_LABEL, type HackathonCard } from "@/lib/hackathons";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** The event the hub puts in the spotlight: live now, else the next one. */
export type Spotlight = {
  card: HackathonCard;
  teamSize: string;
  /** "Nov 8" */
  registerBy: string;
  /** Epoch ms: the deadline for a live event, kickoff for an upcoming one. */
  target: number;
  serverNow: number;
};

/** Thin orange rings, "on air", radiating from behind the top-right of the block. */
function OnAir({ live }: { live: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-[92%] top-[56px] -z-10"
    >
      <svg
        viewBox="-300 -300 600 600"
        className="absolute left-0 top-0 size-[600px] -translate-x-1/2 -translate-y-1/2"
      >
        {[46, 92, 138, 184, 230, 276].map((radius, i) => (
          <circle
            key={radius}
            r={radius}
            fill="none"
            stroke={PRINT}
            strokeOpacity={0.22 - i * 0.03}
            strokeWidth={1}
          />
        ))}
      </svg>
      {live ? (
        <span className="absolute left-0 top-0 size-[92px] -translate-x-1/2 -translate-y-1/2 animate-[s1-air_2.8s_ease-out_infinite] rounded-full border border-[#f97316]/50 motion-reduce:hidden" />
      ) : null}
    </span>
  );
}

/**
 * The hub's "happening now" spot: the live hackathon (or the next one) set
 * straight on the paper, no card. Orange label and rings for attention, a
 * live flap clock, the key facts on a ruled line, and the register button.
 */
export function LiveSpotlight({ spotlight }: { spotlight: Spotlight }) {
  const reduceMotion = useReducedMotion();
  const { card, target, serverNow } = spotlight;
  const live = card.status === "live";
  const { units } = useCountdown(target, serverNow);
  const label = live ? "until submissions close" : "until kickoff";
  const page = `/hackathons/${card.slug}`;

  return (
    <motion.article
      aria-label={`${live ? "Happening now" : "Up next"}: ${card.name}`}
      className="relative isolate [--cw:30px] sm:[--cw:40px] lg:[--cw:34px] xl:[--cw:42px]"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
    >
      <style>
        {`${FLAP_KEYFRAMES}@keyframes s1-air{from{transform:translate(-50%,-50%) scale(.4);opacity:.9}to{transform:translate(-50%,-50%) scale(3);opacity:0}}`}
      </style>
      <OnAir live={live} />

      <p
        className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: PRINT }}
      >
        <span className="relative flex size-2.5">
          {live ? (
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:hidden"
              style={{ background: PRINT }}
            />
          ) : null}
          <span
            className="relative size-2.5 rounded-full"
            style={{ background: PRINT }}
          />
        </span>
        {live ? "Happening now" : "Up next"}
        <span className="text-[#141414]/35">·</span>
        <span className="text-[#141414]/55">{FORMAT_LABEL[card.format]}</span>
      </p>

      <Link href={page} className="group mt-6 block">
        <span className="block text-[44px] font-medium leading-[0.98] tracking-[-0.055em] transition-colors group-hover:text-[#f97316] sm:text-[56px]">
          {card.name}
        </span>
        <span className="mt-3 block text-[17px] leading-[1.5] text-[#141414]/65">
          {card.tagline}
        </span>
      </Link>

      <div className="mt-8 flex flex-wrap items-end gap-x-5 gap-y-3">
        <FlapClock
          units={units}
          label={live ? "Submissions close in" : "Kickoff in"}
          unitClassName="text-[#141414]/45"
          dotClassName="bg-[#141414]/30"
        />
        <span className="text-[13px] font-medium text-[#141414]/55 sm:pb-7">
          {label}
        </span>
      </div>

      <dl className="mt-7 grid grid-cols-3 border-y border-[#141414]/[0.14]">
        {[
          ["Prize pool", card.prizePool],
          ["Team size", spotlight.teamSize],
          ["Register by", spotlight.registerBy],
        ].map(([term, value], i) => (
          <div
            key={term}
            className={cn(
              "flex flex-col-reverse justify-end py-4",
              i > 0 && "border-l border-[#141414]/[0.14] pl-4",
            )}
          >
            <dd className="mt-1 text-[16px] font-medium tracking-[-0.01em]">
              {value}
            </dd>
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/50">
              {term}
            </dt>
          </div>
        ))}
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        <InkPill href={card.registrationOpen ? `${page}#register` : page}>
          {card.registrationOpen ? "Register now" : "View hackathon"}
        </InkPill>
        {card.registrationOpen ? (
          <Link
            href={page}
            className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
          >
            Event details
            <ArrowUpRight
              weight="bold"
              className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        ) : null}
      </div>
    </motion.article>
  );
}
