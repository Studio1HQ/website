"use client";

import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";
import { cn } from "@/lib/utils";

/*
 * DevRel in pencil: a set of small drawings (talk notes, slides, mics,
 * cameras, badges, terminals, docs, pull requests, stars, laptops, coffee,
 * trophies and more) scattered across the area. Each spot on a loose grid
 * gets its own drawing, angle and size, so nothing reads as a repeat. Every
 * line is drawn twice, a hair apart, and given a slight wobble. It stays
 * still.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Each drawing sits in a 100 x 100 box. */
const ICONS: ReactNode[] = [
  // spiral notebook
  <>
    <rect x="22" y="10" width="62" height="80" rx="4" />
    {range(5).map((i) => <circle key={i} cx="22" cy={22 + i * 14} r="4" />)}
    <path d="M34 26 h38 M34 40 h30 M34 54 h38 M34 68 h22" />
  </>,
  // stage screen with slides
  <>
    <rect x="8" y="14" width="84" height="54" rx="3" />
    <path d="M50 68 v12 M34 84 h32 M18 56 l18 -16 12 9 18 -20 14 13 M18 28 h30" />
  </>,
  // microphone on a stand
  <>
    <rect x="38" y="8" width="24" height="40" rx="12" />
    <path d="M42 20 h16 M42 30 h16 M42 40 h16 M28 34 a22 22 0 0 0 44 0 M50 56 v28 M34 88 h32" />
  </>,
  // camera
  <>
    <rect x="10" y="28" width="80" height="54" rx="7" />
    <circle cx="50" cy="55" r="17" />
    <circle cx="50" cy="55" r="8" />
    <rect x="22" y="20" width="24" height="9" rx="3" />
    <circle cx="80" cy="38" r="3" />
  </>,
  // conference badge
  <>
    <path d="M30 6 L50 30 M70 6 L50 30" />
    <rect x="28" y="30" width="44" height="62" rx="5" />
    <circle cx="50" cy="52" r="9" />
    <path d="M38 72 h24 M42 82 h16" />
  </>,
  // terminal
  <>
    <rect x="8" y="18" width="84" height="64" rx="5" />
    <path d="M8 30 h84 M20 44 l8 7 -8 7 M34 58 h22" />
    <circle cx="16" cy="24" r="2" />
    <circle cx="23" cy="24" r="2" />
  </>,
  // docs page
  <>
    <path d="M22 8 h40 l16 16 v68 h-56 z M62 8 v16 h16" />
    <path d="M32 36 h36 M32 48 h36 M32 60 h28 M32 72 h36" />
  </>,
  // pull request
  <>
    <circle cx="28" cy="20" r="7" />
    <circle cx="28" cy="80" r="7" />
    <circle cx="74" cy="80" r="7" />
    <path d="M28 27 v46 M74 73 v-30 a14 14 0 0 0 -14 -14 h-16 M50 20 l-8 9 8 9" />
  </>,
  // star
  <path d="M50 12 l11 23 25 4 -18 18 4 25 -22 -12 -22 12 4 -25 -18 -18 25 -4 z" />,
  // laptop
  <>
    <rect x="18" y="20" width="64" height="44" rx="4" />
    <path d="M8 72 h84 l-6 10 h-72 z M42 36 l-8 8 8 8 M58 36 l8 8 -8 8" />
  </>,
  // coffee, from above
  <>
    <circle cx="46" cy="50" r="26" />
    <circle cx="46" cy="50" r="18" />
    <path d="M72 44 h8 a8 8 0 0 1 0 16 h-8 M36 48 c4 -5 10 -5 14 0 s10 5 14 0" />
  </>,
  // trophy
  <path d="M30 14 h40 v18 a20 20 0 0 1 -40 0 z M30 20 h-10 a10 10 0 0 0 10 14 M70 20 h10 a10 10 0 0 1 -10 14 M50 52 v16 M36 68 h28 v12 h-28 z" />,
  // headphones
  <>
    <path d="M18 60 v-12 a32 32 0 0 1 64 0 v12" />
    <rect x="10" y="54" width="16" height="30" rx="5" />
    <rect x="74" y="54" width="16" height="30" rx="5" />
  </>,
  // </> sticker
  <>
    <circle cx="50" cy="50" r="34" />
    <path d="M38 38 l-12 12 12 12 M62 38 l12 12 -12 12 M55 32 l-10 36" />
  </>,
  // chat bubbles
  <>
    <path d="M10 18 h56 a8 8 0 0 1 8 8 v24 a8 8 0 0 1 -8 8 h-34 l-12 12 v-12 h-10 a8 8 0 0 1 -8 -8 v-24 a8 8 0 0 1 8 -8 z" />
    <path d="M20 32 h40 M20 44 h26 M80 50 h6 a6 6 0 0 1 6 6 v18 a6 6 0 0 1 -6 6 h-4 v8 l-8 -8 h-22" />
  </>,
  // pizza slice
  <>
    <path d="M18 22 l66 -6 -30 72 z M24 30 a50 50 0 0 0 56 -6" />
    <circle cx="50" cy="40" r="5" />
    <circle cx="56" cy="58" r="4" />
  </>,
  // video player
  <>
    <rect x="8" y="18" width="84" height="58" rx="5" />
    <path d="M42 34 l20 13 -20 13 z M16 68 h68" />
    <circle cx="36" cy="68" r="3" />
  </>,
  // keyboard
  <>
    <rect x="6" y="32" width="88" height="40" rx="5" />
    {range(2).map((r) => range(7).map((c) => <rect key={`${r}${c}`} x={12 + c * 11.5} y={38 + r * 12} width="8" height="8" rx="1.5" />))}
    <path d="M26 64 h48" />
  </>,
  // phone
  <>
    <rect x="30" y="8" width="40" height="80" rx="8" />
    <path d="M44 16 h12 M44 80 h12" />
  </>,
  // rocket: launch day
  <>
    <path d="M50 8 c16 12 20 34 14 56 h-28 c-6 -22 -2 -44 14 -56 z M36 50 l-12 14 v14 l14 -10 M64 50 l12 14 v14 l-14 -10 M44 72 l6 16 6 -16" />
    <circle cx="50" cy="34" r="7" />
  </>,
  // light bulb: an idea
  <path d="M50 10 a24 24 0 0 0 -14 44 v12 h28 v-12 a24 24 0 0 0 -14 -44 z M38 74 h24 M42 84 h16 M44 40 l6 8 6 -8" />,
  // github mark, as an outline
  <>
    <circle cx="50" cy="50" r="36" />
    <path d="M40 84 v-12 c-10 2 -14 -4 -16 -8 M60 84 v-12 c0 -4 -2 -6 -4 -8 c10 -2 18 -6 18 -20 c0 -4 -2 -8 -4 -10 c1 -4 0 -8 -1 -10 c-4 0 -8 2 -10 4 a32 32 0 0 0 -14 0 c-2 -2 -6 -4 -10 -4 c-1 2 -2 6 -1 10 c-2 2 -4 6 -4 10 c0 14 8 18 18 20 c-2 2 -4 4 -4 8" />
  </>,
];

/** A small seeded random, so the scatter is the same on every render. */
function rand(n: number) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const COLS = 13;
const ROWS = 8;
const CELL_W = 1600 / COLS;
const CELL_H = 1000 / ROWS;

/** One drawing per cell, nudged off the grid, turned and sized a little differently each time. */
const SPOTS = range(COLS * ROWS).map((k) => {
  const c = k % COLS;
  const r = Math.floor(k / COLS);
  // every other row shifted half a cell; neighbours always get different drawings
  const icon = (c * 7 + r * 11 + Math.floor(rand(k) * 5)) % ICONS.length;
  const x = c * CELL_W + (r % 2 ? CELL_W / 2 : 0) + (rand(k + 1) - 0.5) * 34;
  const y = r * CELL_H + (rand(k + 2) - 0.5) * 30;
  const turn = (rand(k + 3) - 0.5) * 40;
  const size = 0.62 + rand(k + 4) * 0.3;
  return { k, icon, x, y, turn, size };
});

function Scatter() {
  return (
    <>
      {SPOTS.map((s) => (
        <g key={s.k} transform={`translate(${s.x} ${s.y}) rotate(${s.turn} 50 50) scale(${s.size})`}>
          {ICONS[s.icon]}
        </g>
      ))}
    </>
  );
}

export function SketchDesk({ className }: { className?: string }) {
  const reduce = !!useReducedMotion();
  const id = useId().replace(/:/g, "");
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", className)}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.6, ease: EASE }}
    >
      <defs>
        <filter id={`pencil-${id}`} x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
      </defs>
      <g filter={`url(#pencil-${id})`} fill="none" stroke="#ef5a2c" strokeLinecap="round" strokeLinejoin="round">
        <g strokeWidth="2.6" strokeOpacity="0.6">
          <Scatter />
        </g>
        {/* the second, lighter pass, a hair off: the sketch's double line */}
        <g strokeWidth="1.3" strokeOpacity="0.32" transform="translate(2 1.5)">
          <Scatter />
        </g>
      </g>
    </motion.svg>
  );
}
