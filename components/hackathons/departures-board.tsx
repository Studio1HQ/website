"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { FORMAT_LABEL, type HackathonCard } from "@/lib/hackathons";
import { GRAIN, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { FlapTile, type FlapTone } from "@/components/hackathons/flap";

/**
 * The hub's hero: every hackathon on a split-flap departures board. Letters
 * clatter into place on load, a row re-flips when you hover it, and each
 * row links to its event. Text lives in aria-labels; the tiles are visual.
 */

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$";
/** ms per flap: how often a scrambling tile shows a new character. */
const FLAP_MS = 55;
/** ms before the first tile settles, then per tile after that. */
const SETTLE_BASE = 260;
const SETTLE_STEP = 32;
/** ms between rows starting on load. */
const ROW_STAGGER = 130;

type Tone = FlapTone;

type Status = { text: string; tone: Tone };

function statusOf(card: HackathonCard): Status {
  if (card.status === "live") return { text: "LIVE NOW", tone: "live" };
  if (card.status === "past") return { text: "DEPARTED", tone: "muted" };
  if (card.finalCall) return { text: "FINAL CALL", tone: "call" };
  if (card.registrationOpen) return { text: "BOARDING", tone: "default" };
  return { text: "CLOSED", tone: "muted" };
}

const CONNECTORS = new Set([
  "A",
  "AN",
  "AND",
  "FOR",
  "IN",
  "OF",
  "ON",
  "THE",
  "TO",
]);

/** Fits text into n tiles, cutting at a word boundary where it can. */
function fit(text: string, n: number) {
  const upper = text.toUpperCase();
  if (upper.length <= n) return upper.padEnd(n, " ");
  let out = "";
  for (const word of upper.split(" ")) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > n) break;
    out = next;
  }
  // Don't end on a connector: "AGENTS IN" reads worse than "AGENTS".
  const words = out.split(" ");
  while (words.length > 1 && CONNECTORS.has(words[words.length - 1])) {
    words.pop();
  }
  out = words.join(" ");
  return (out || upper.slice(0, n)).padEnd(n, " ");
}

/** Matches a media query after mount (false during SSR). */
function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * Time since a row's flip started, in FLAP_MS steps. Infinity means settled
 * (also the server render, so the board reads correctly without JS).
 */
function useFlip(delay: number, tiles: number, enabled: boolean) {
  const [elapsed, setElapsed] = useState(Number.POSITIVE_INFINITY);
  const frame = useRef(0);
  const duration = SETTLE_BASE + tiles * SETTLE_STEP + FLAP_MS;

  const run = useCallback(
    (wait: number) => {
      cancelAnimationFrame(frame.current);
      const start = performance.now() + wait;
      let lastStep = Number.NaN;
      const tick = (now: number) => {
        const time = now - start;
        if (time >= duration) {
          setElapsed(Number.POSITIVE_INFINITY);
          return;
        }
        const step = Math.floor(time / FLAP_MS);
        if (step !== lastStep) {
          lastStep = step;
          setElapsed(time);
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [duration],
  );

  useEffect(() => {
    if (enabled) run(delay);
    return () => cancelAnimationFrame(frame.current);
  }, [enabled, delay, run]);

  const replay = () => {
    if (enabled && elapsed === Number.POSITIVE_INFINITY) run(0);
  };

  return { elapsed, replay };
}

/** What tile `index` shows `elapsed` ms into its row's flip. */
function charAt(target: string, index: number, elapsed: number, seed: number) {
  if (elapsed === Number.POSITIVE_INFINITY) return target;
  if (elapsed < 0) return " ";
  if (elapsed >= SETTLE_BASE + index * SETTLE_STEP) return target;
  return CHARSET[scramble(index, Math.floor(elapsed / FLAP_MS), seed)];
}

/** Integer hash (murmur-style mix) so neighbouring tiles don't run in order. */
function scramble(index: number, step: number, seed: number) {
  let hash =
    Math.imul(index + 1, 0x9e3779b1) ^
    Math.imul(step + 1, 0x85ebca6b) ^
    Math.imul(seed + 1, 0xc2b2ae35);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  return (hash >>> 0) % CHARSET.length;
}

type Column = {
  key: string;
  label: string;
  width: number;
  /** Hidden below this breakpoint. */
  className?: string;
};

function columnsFor(compact: boolean): Column[] {
  return [
    { key: "departs", label: "Starts", width: 6, className: "hidden sm:flex" },
    { key: "name", label: "Hackathon", width: compact ? 12 : 20 },
    { key: "format", label: "Format", width: 9, className: "hidden lg:flex" },
    { key: "prize", label: "Prizes", width: 5, className: "hidden lg:flex" },
    { key: "status", label: "Status", width: 10 },
  ];
}

function Row({
  card,
  index,
  columns,
  animate,
}: {
  card: HackathonCard;
  index: number;
  columns: Column[];
  animate: boolean;
}) {
  const status = statusOf(card);
  const values: Record<string, { text: string; tone: Tone }> = {
    departs: { text: card.departs, tone: "default" },
    name: { text: card.name, tone: "default" },
    format: { text: FORMAT_LABEL[card.format], tone: "default" },
    prize: { text: card.prizeShort, tone: "default" },
    status,
  };
  const tiles = columns.reduce((sum, column) => sum + column.width, 0);
  const { elapsed, replay } = useFlip(index * ROW_STAGGER, tiles, animate);
  const past = card.status === "past";
  const live = card.status === "live";

  let offset = 0;
  return (
    <li>
      <Link
        href={`/hackathons/${card.slug}`}
        onMouseEnter={replay}
        onFocus={replay}
        aria-label={`${card.name}, ${FORMAT_LABEL[card.format]}, ${card.dateRange}, ${card.prizePool} in prizes. ${status.text.toLowerCase()}.`}
        className={cn(
          "group flex items-center gap-[calc(var(--cw)*0.8)] rounded-[4px] px-[calc(var(--cw)*0.5)] py-[calc(var(--cw)*0.35)] transition-colors hover:bg-white/[0.045] focus-visible:bg-white/[0.045] focus-visible:outline-none",
          past && "opacity-60 hover:opacity-100",
          // The live row is lit, like a gate that's boarding now
          live &&
            "bg-[#f97316]/[0.16] shadow-[inset_0_0_0_1px_rgba(249,115,22,0.55)] hover:bg-[#f97316]/[0.22] focus-visible:bg-[#f97316]/[0.22]",
        )}
      >
        {/* Live marker */}
        <span
          aria-hidden
          className="h-[calc(var(--cw)*1.2)] w-[3px] shrink-0 rounded-full"
          style={{
            background: live ? PRINT : "rgba(244,239,231,0.08)",
          }}
        />
        {columns.map((column) => {
          const value = values[column.key];
          const text = fit(value.text, column.width);
          const start = offset;
          offset += column.width;
          return (
            <span
              key={column.key}
              aria-hidden
              className={cn("flex gap-[2px]", column.className ?? "flex")}
            >
              {Array.from(text).map((char, i) => (
                <FlapTile
                  key={i}
                  char={charAt(char, start + i, elapsed, index)}
                  tone={value.tone}
                />
              ))}
            </span>
          );
        })}
        <ArrowUpRight
          aria-hidden
          weight="bold"
          className={cn(
            "ml-auto hidden size-4 shrink-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f97316] sm:block",
            live ? "text-[#f97316]" : "text-[#f4efe7]/30",
          )}
        />
      </Link>
    </li>
  );
}

/** UTC wall clock; blank until mounted so server and client agree. */
function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setTime(new Date().toISOString().slice(11, 19));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="tabular-nums">{time ?? "--:--:--"} UTC</span>;
}

/** A screw head in each corner of the board's faceplate. */
function Screw({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute flex size-2.5 items-center justify-center rounded-full bg-[#2a2a2a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_1px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <span className="h-px w-1.5 rotate-45 bg-black/70" />
    </span>
  );
}

export function DeparturesBoard({
  cards,
  openPrizes,
  label = "Studio1 hackathons, live and upcoming first",
  className,
}: {
  cards: HackathonCard[];
  /** Totals footer; omitted on short boards. */
  openPrizes?: string;
  label?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const compact = useMedia("(max-width: 639px)");
  const columns = columnsFor(compact);
  const live = cards.filter((card) => card.status === "live").length;
  const upcoming = cards.filter((card) => card.status === "upcoming").length;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[10px] bg-[#0d0d0d] px-3 pb-4 pt-5 text-[#f4efe7] shadow-[0_60px_100px_-50px_rgba(20,20,20,0.75)] ring-1 ring-inset ring-white/10 [--cw:13px] sm:px-6 sm:pb-5 sm:pt-6 sm:[--cw:15px] lg:[--cw:17px] xl:[--cw:21px]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-screen"
        style={{ backgroundImage: GRAIN }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/3 bg-gradient-to-b from-white/[0.05] to-transparent"
      />
      <Screw className="left-2.5 top-2.5" />
      <Screw className="right-2.5 top-2.5" />
      <Screw className="bottom-2.5 left-2.5" />
      <Screw className="bottom-2.5 right-2.5" />

      {/* Header: name plate, title, clock */}
      <div className="flex items-center justify-between gap-4 px-2 text-[11px] font-medium uppercase tracking-[0.18em] sm:px-3">
        <span className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:hidden"
              style={{ background: PRINT }}
            />
            <span
              className="relative size-2 rounded-full"
              style={{ background: PRINT }}
            />
          </span>
          Departures
        </span>
        <span className="hidden text-[#f4efe7]/45 sm:inline">
          Studio1 Hackathons
        </span>
        <span aria-hidden className="text-[#f4efe7]/70">
          <Clock />
        </span>
      </div>

      {/* Column labels, sized to the tiles below */}
      <div
        aria-hidden
        className="mt-5 flex items-center gap-[calc(var(--cw)*0.8)] px-[calc(var(--cw)*0.5)] text-[10px] font-medium uppercase tracking-[0.16em] text-[#f4efe7]/40"
      >
        <span className="w-[3px] shrink-0" />
        {columns.map((column) => (
          <span
            key={column.key}
            className={cn("shrink-0", column.className ?? "block")}
            style={{ width: `calc(${column.width} * var(--cw))` }}
          >
            {column.label}
          </span>
        ))}
      </div>

      <ol aria-label={label} className="mt-2 space-y-[calc(var(--cw)*0.15)]">
        {cards.map((card, index) => (
          <Row
            key={card.slug}
            card={card}
            index={index}
            columns={columns}
            animate={reduceMotion === false}
          />
        ))}
      </ol>

      {openPrizes ? (
        /* Footer: legend and totals */
        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 px-2 pt-4 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#f4efe7]/45 sm:px-3 md:flex-row md:items-center md:justify-between">
          <span>
            <span className="text-[#f4efe7]/80">Boarding</span>
            {" = registration open · "}
            <span className="text-[#fbbf24]">Final call</span>
            {" = closes within 3 days"}
          </span>
          <span>
            <span className="text-[#f97316]">{live} live</span>
            {` · ${upcoming} upcoming · ${openPrizes} in open prizes`}
          </span>
        </div>
      ) : null}
    </div>
  );
}
