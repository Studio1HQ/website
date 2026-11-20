"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";

/*
 * Five people walking hand in hand: flat colour silhouettes with a loose
 * scribble of a second colour inside, like a screen print. Each figure is a
 * set of filled shapes; the same shapes in white mask the scribble so it
 * stays inside the body. Every figure strides a little differently.
 */

const PEOPLE = [
  { fill: "#ef5a2c", ink: "#ff9b72", stride: 0, lean: 1 },
  { fill: "#2451d6", ink: "#5fc0f7", stride: 4, lean: -1 },
  { fill: "#f4a3c4", ink: "#ffe3ee", stride: -2, lean: 2 },
  { fill: "#17a55b", ink: "#93e07f", stride: 3, lean: 0 },
  { fill: "#f6bf1d", ink: "#ec7a12", stride: 1, lean: 2 },
];

/** Hands meet exactly at the gap between two figures. */
const GAP = 124;
const W = GAP * PEOPLE.length + 12;
const H = 262;

/** One person, walking right, arms down to the hands at x 0 and 124. */
function Figure({ stride: k, lean: l }: { stride: number; lean: number }) {
  return (
    <>
      <circle cx={65 + l} cy="29" r="20" />
      <path d={`M${56 + l / 2} 45h15v14H${56 + l / 2}z`} />
      {/* torso: broad rounded shoulders, tapering to the hips */}
      <path d="M33 64 Q62 51 93 62 Q101 66 98 79 L86 150 L39 150 L29 79 Q27 68 33 64Z" />
      {/* arms, angled down to the neighbours' hands */}
      <path d="M33 64 L50 85 L12 157 Q6 165 -1 159 Q-5 153 -1 147Z" />
      <path d="M93 63 L76 85 L113 157 Q119 165 126 159 Q130 153 126 147Z" />
      {/* legs in a wide stride */}
      <path d={`M40 144 L65 144 L${32 - k} 246 L${9 - k} 246Z`} />
      <path d={`M${6 - k} 240 L${31 - k} 240 Q${40 - k} 242 ${40 - k} 249 L${40 - k} 254 L${6 - k} 254Z`} />
      <path d={`M60 144 L86 144 L${117 + k} 246 L${94 + k} 246Z`} />
      <path d={`M${92 + k} 240 L${117 + k} 240 Q${127 + k} 242 ${127 + k} 249 L${127 + k} 254 L${92 + k} 254Z`} />
    </>
  );
}

/** A loose, hand-drawn scribble inside the figure, the same on every render. */
function scribble(seed: number) {
  const rnd = (n: number) => {
    const v = Math.sin(seed * 78.233 + n * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  const paths: string[] = [];
  for (let k = 0; k < 3; k++) {
    const pts: [number, number][] = [];
    let y = 56 + k * 66 + rnd(k) * 12;
    for (let j = 0; j < 9; j++) {
      const x = 18 + rnd(k * 31 + j) * 90;
      y += 4 + rnd(k * 17 + j * 3) * 9;
      pts.push([x, y]);
    }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let j = 1; j < pts.length; j++) {
      const [x0, y0] = pts[j - 1];
      const [x1, y1] = pts[j];
      d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths;
}

export function HandInHand({ className }: { className?: string }) {
  const reduce = !!useReducedMotion();
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox={`-6 0 ${W} ${H}`} className={className} role="img" aria-label="Five people walking hand in hand">
      <defs>
        {PEOPLE.map((p, i) => (
          <mask key={p.fill} id={`body-${id}-${i}`} maskUnits="userSpaceOnUse" x="-10" y="0" width="150" height={H}>
            <g fill="white">
              <Figure stride={p.stride} lean={p.lean} />
            </g>
          </mask>
        ))}
      </defs>
      {PEOPLE.map((p, i) => (
        <motion.g
          key={p.fill}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.1 }}
        >
          <g transform={`translate(${i * GAP} 0)`}>
            <g fill={p.fill}>
              <Figure stride={p.stride} lean={p.lean} />
            </g>
            <g mask={`url(#body-${id}-${i})`} stroke={p.ink} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {scribble(i + 1).map((d, k) => (
                <path key={k} d={d} />
              ))}
            </g>
          </g>
        </motion.g>
      ))}
    </svg>
  );
}
