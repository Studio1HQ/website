"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";
import { useCountdown } from "@/components/hackathons/flap-countdown";
import { InkPill } from "@/components/hackathons/hackathon-ui";
import { FORMAT_LABEL, type HackathonCard } from "@/lib/hackathons";
import { GRAIN, PRINT } from "@/lib/paper";
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

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/**
 * A desk calendar for the event's month: spiral binding, the whole month on
 * a grid, the event's days highlighted from kickoff to the deadline.
 */
function MonthCalendar({
  departs,
  year,
  until,
  live,
}: {
  /** Start date as "OCT 26". */
  departs: string;
  year: number;
  /** Last highlighted day, epoch ms (the deadline while live). */
  until?: number;
  live: boolean;
}) {
  const [mon, dayText] = departs.split(/\s+/);
  const month = Math.max(0, MONTHS.indexOf(mon.toUpperCase()));
  const startDay = Number(dayText);
  const end = until ? new Date(until) : null;
  // The range ends within this month, or runs to its last day
  const lastDay =
    end && end.getUTCFullYear() === year && end.getUTCMonth() === month
      ? end.getUTCDate()
      : end && end.getTime() > Date.UTC(year, month + 1, 0)
        ? 31
        : startDay;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first offset for the 1st of the month
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const coils = Array.from({ length: 9 }, (_, i) => 18 + i * 25);
  const monthName = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div aria-hidden className="relative w-[248px] shrink-0 pt-2">
      {/* A second page peeking out behind, for depth */}
      <span className="absolute inset-x-2 bottom-[-6px] top-5 rounded-[6px] bg-[#f3f0ea] shadow-[0_10px_20px_-14px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/[0.06]" />

      <div className="relative overflow-hidden rounded-[6px] bg-white shadow-[0_22px_40px_-24px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/[0.08]">
        <div
          className="relative isolate flex items-end justify-between px-4 pb-2 pt-5 text-white"
          style={{ background: PRINT }}
        >
          <span
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            {monthName}
          </span>
          <span className="font-mono text-[11px] text-white/80">{year}</span>
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <div className="grid grid-cols-7 text-center font-mono text-[9.5px] font-semibold text-[#141414]/40">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-[11.5px] tabular-nums">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const inRange = day >= startDay && day <= lastDay;
              const isStart = day === startDay;
              const isEnd = day === lastDay;
              return (
                <span
                  key={i}
                  className={cn(
                    "relative flex h-6 items-center justify-center",
                    inRange && "bg-[#f97316]/15 text-[#c2410c]",
                    inRange && isStart && "rounded-l-[6px]",
                    inRange && isEnd && "rounded-r-[6px]",
                    !inRange && "text-[#141414]/70",
                  )}
                >
                  {isStart ? (
                    <span
                      className="absolute inset-0.5 rounded-[5px]"
                      style={{ background: PRINT }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative",
                      isStart && "font-semibold text-white",
                    )}
                  >
                    {day}
                  </span>
                  {isStart && live ? (
                    <span className="absolute right-1 top-1 size-1 animate-pulse rounded-full bg-white" />
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spiral binding: wire coils looping through punched holes */}
      <svg
        viewBox="0 0 248 22"
        className="pointer-events-none absolute inset-x-0 top-0 h-[22px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="s1-coil" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b6b6b" />
            <stop offset="0.45" stopColor="#e5e5e5" />
            <stop offset="1" stopColor="#4a4a4a" />
          </linearGradient>
        </defs>
        {coils.map((x) => (
          <g key={x}>
            <circle cx={x} cy={15} r={2.4} fill="#7c2d12" fillOpacity={0.55} />
            <path
              d={`M ${x - 2} 15 C ${x - 2.5} 4, ${x + 3.5} 4, ${x + 2} 15`}
              fill="none"
              stroke="url(#s1-coil)"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * The hub's "happening now" spot as a wide calendar card: the date on a
 * tear-off page, the event and its key facts, and a live flap clock with
 * the register button.
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
      className="relative isolate grid gap-8 rounded-[6px] bg-[#fbf9f5] p-5 shadow-[0_40px_80px_-56px_rgba(20,20,20,0.55)] ring-1 ring-inset ring-[#141414]/[0.07] [--cw:26px] sm:p-7 sm:[--cw:32px] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-10 xl:[--cw:36px]"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
    >
      <style>{`@keyframes s1-tick{from{transform:translateY(-60%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes s1-halo{0%,100%{box-shadow:0 0 0 1px rgba(249,115,22,.25)}50%{box-shadow:0 0 0 1px rgba(249,115,22,.7)}}@keyframes s1-meter{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}`}</style>

      {live ? (
        // The Live ribbon, folded over the card's top edge
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[7px] right-8 z-10 sm:right-10"
        >
          <svg
            viewBox="0 0 64 92"
            className="h-[92px] w-16 drop-shadow-[0_8px_10px_rgba(20,20,20,0.2)]"
          >
            {/* The fold where it tucks over the edge */}
            <path d="M0 7 L6 0 V7 Z" fill="#9a3412" />
            <path d="M64 7 L58 0 V7 Z" fill="#9a3412" />
            {/* The ribbon */}
            <path d="M6 0 H58 V90 L32 76 L6 90 Z" fill={PRINT} />
            {/* A fine inset line */}
            <path
              d="M11 0 V80 L32 69 L53 80 V0"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <circle cx="32" cy="28" r="3" fill="#fff">
              <animate
                attributeName="opacity"
                values="1;0.3;1"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
            <text
              x="32"
              y="52"
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              letterSpacing="2.5"
              fill="#fff"
            >
              LIVE
            </text>
          </svg>
        </div>
      ) : null}

      <MonthCalendar
        departs={card.departs}
        year={card.year}
        until={live ? target : undefined}
        live={live}
      />

      {/* The event */}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.18em]",
              live
                ? "bg-[#f4efe7] text-[#c2410c] ring-1 ring-inset ring-[#141414]/[0.08]"
                : "bg-[#141414]/[0.05] text-[#141414]/70 ring-1 ring-inset ring-[#141414]/10",
            )}
            style={
              live && !reduceMotion
                ? { animation: "s1-halo 2.4s ease-in-out infinite" }
                : undefined
            }
          >
            {/* A live signal meter: three bars rising and falling */}
            <span aria-hidden className="flex h-3 items-end gap-[2px]">
              {[0, 0.25, 0.5].map((delay) => (
                <span
                  key={delay}
                  className="w-[3px] rounded-[1px]"
                  style={{
                    height: "100%",
                    background: live ? PRINT : "#141414",
                    opacity: live ? 1 : 0.5,
                    transformOrigin: "bottom",
                    animation:
                      live && !reduceMotion
                        ? `s1-meter 0.9s ease-in-out ${delay}s infinite`
                        : undefined,
                    transform: live ? undefined : "scaleY(0.5)",
                  }}
                />
              ))}
            </span>
            {live ? "Happening now" : "Up next"}
          </span>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[#141414]/50">
            {FORMAT_LABEL[card.format]}
          </span>
        </p>
        <Link href={page} className="group mt-3 block">
          <span className="block text-[34px] font-medium leading-[1.02] tracking-[-0.05em] transition-colors group-hover:text-[#f97316] sm:text-[42px]">
            {card.name}
          </span>
          <span className="mt-2 block text-[15.5px] leading-[1.5] text-[#141414]/65">
            {card.tagline}
          </span>
        </Link>
        <dl className="mt-5 grid max-w-[460px] grid-cols-3 gap-2">
          {[
            ["Prize pool", card.prizePool],
            ["Team size", spotlight.teamSize],
            ["Register by", spotlight.registerBy],
          ].map(([term, value]) => (
            <div
              key={term}
              className="flex min-w-0 flex-col-reverse rounded-[6px] bg-[#fbf9f5] ring-1 ring-inset ring-[#141414]/[0.07] shadow-[0_1px_0_rgba(20,20,20,0.04),0_22px_44px_-32px_rgba(20,20,20,0.35)] px-3.5 py-3"
            >
              <dd className="mt-0.5 text-[15px] font-medium">{value}</dd>
              <dt className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#141414]/50">
                {term}
              </dt>
            </div>
          ))}
        </dl>
      </div>

      {/* The clock and the way in */}
      <div className="flex flex-col items-start gap-5 lg:items-end lg:pt-14">
        {/* The clock: each unit on its own flat tile */}
        <div
          role="timer"
          aria-label={`${label} ${units.map(([value, unit]) => `${Number(value)} ${unit.toLowerCase()}`).join(", ")}`}
          className="w-fit max-w-full"
        >
          <p className="mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-[#141414]/50">
            {label}
          </p>
          <div aria-hidden className="grid grid-cols-4 gap-2">
            {units.map(([value, unit]) => (
              <div
                key={unit}
                className="flex w-[84px] flex-col items-center rounded-[6px] bg-[#fbf9f5] ring-1 ring-inset ring-[#141414]/[0.07] shadow-[0_1px_0_rgba(20,20,20,0.04),0_22px_44px_-32px_rgba(20,20,20,0.35)] pb-3 pt-3.5 sm:w-[96px]"
              >
                <span className="relative h-[44px] overflow-hidden text-[42px] font-medium leading-[44px] tracking-[-0.04em] tabular-nums sm:h-[52px] sm:text-[48px] sm:leading-[52px]">
                  <span
                    key={value}
                    className="block [animation:s1-tick_420ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:[animation:none]"
                    style={{ color: live ? PRINT : "#141414" }}
                  >
                    {value}
                  </span>
                </span>
                <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#141414]/45">
                  {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
      </div>
    </motion.article>
  );
}
