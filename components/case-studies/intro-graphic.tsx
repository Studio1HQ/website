"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Developers waiting to be found, on a 360 x 240 board. */
const PEOPLE = [
  { x: 270, y: 50 },
  { x: 322, y: 96 },
  { x: 258, y: 132 },
  { x: 314, y: 176 },
  { x: 246, y: 208 },
];
const R = 19;

/** The line from the product to one developer, ending at its rim. */
const route = (to: { x: number; y: number }) =>
  `M 106 128 C 170 128, 172 ${to.y}, ${to.x - R - 3} ${to.y}`;

/** One full send: the lines draw out, land, hold and fade. */
const CYCLE = 3.6;
/** The first send waits for the guides to finish drawing. */
const START = 1.8;
const STAGGER = 0.14;

/** Head and shoulders, centred on 0,0. */
const FIGURE =
  "M 0 -9 a 4.4 4.4 0 1 1 0 8.8 a 4.4 4.4 0 1 1 0 -8.8 Z M -8 9.5 a 8 7 0 0 1 16 0 Z";

/**
 * The intro's idea, drawn: a product on the left, developers who haven't
 * found it on the right, and lines that reach them one after another.
 */
export function IntroGraphic() {
  const reduceMotion = useReducedMotion();
  const loop = (i: number) => ({
    dur: `${CYCLE}s`,
    begin: `${(START + i * STAGGER).toFixed(2)}s`,
    repeatCount: "indefinite" as const,
  });

  return (
    <svg
      viewBox="0 0 360 240"
      role="img"
      aria-label="A product reaching the developers who had not found it yet"
      className="h-auto w-full overflow-visible"
    >
      <defs>
        <radialGradient id="intro-rim" cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece6dc" />
        </radialGradient>
        <filter id="intro-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="6"
            floodColor="#141414"
            floodOpacity="0.14"
          />
        </filter>
      </defs>

      {/* Guides: quiet grey lines, drawn once */}
      {PEOPLE.map((person, i) => (
        <motion.path
          key={i}
          d={route(person)}
          fill="none"
          stroke="#141414"
          strokeOpacity="0.14"
          strokeWidth="1.25"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: EASE, delay: 0.25 + i * 0.1 }}
        />
      ))}

      {/* Reach: each line draws out in orange, holds, then fades, on a loop */}
      {reduceMotion
        ? null
        : PEOPLE.map((person, i) => (
            <path
              key={i}
              d={route(person)}
              pathLength={100}
              fill="none"
              stroke="#f97316"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="100 100"
              strokeDashoffset="100"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="100;0;0;0"
                keyTimes="0;0.35;0.8;1"
                calcMode="spline"
                keySplines="0.45 0 0.25 1;0 0 1 1;0 0 1 1"
                {...loop(i)}
              />
              <animate
                attributeName="opacity"
                values="1;1;1;0"
                keyTimes="0;0.35;0.7;0.95"
                {...loop(i)}
              />
            </path>
          ))}

      {/* The product */}
      <motion.g
        initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: EASE }}
        style={{ transformOrigin: "70px 128px" }}
      >
        <rect
          x="34"
          y="92"
          width="72"
          height="72"
          rx="6"
          fill="#141414"
          filter="url(#intro-shadow)"
        />
        {/* </> */}
        <path
          d="M 60 117 L 49 128 L 60 139 M 80 117 L 91 128 L 80 139 M 74 113 L 66 143"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="96" cy="102" r="3" fill="#f97316" />
      </motion.g>

      {/* Developers: white glass, briefly orange as a line reaches them */}
      {PEOPLE.map((person, i) => (
        <motion.g
          key={i}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 + i * 0.1 }}
          style={{ transformOrigin: `${person.x}px ${person.y}px` }}
        >
          <g transform={`translate(${person.x} ${person.y})`}>
            <circle r={R} fill="url(#intro-rim)" filter="url(#intro-shadow)" />
            <circle r={R} fill="none" stroke="#141414" strokeOpacity="0.08" />
            <path d={FIGURE} fill="#141414" fillOpacity="0.3" />

            {reduceMotion ? null : (
              <g opacity="0">
                <animate
                  attributeName="opacity"
                  values="0;0;1;1;0"
                  keyTimes="0;0.33;0.38;0.72;0.9"
                  {...loop(i)}
                />
                <circle r={R} fill="#f97316" />
                <path d={FIGURE} fill="#ffffff" />
              </g>
            )}
            {reduceMotion ? null : (
              // A ripple as the line lands
              <circle
                r={R}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.25"
                opacity="0"
              >
                <animate
                  attributeName="r"
                  values={`${R};${R};${R};${R + 10};${R + 10}`}
                  keyTimes="0;0.34;0.36;0.6;1"
                  {...loop(i)}
                />
                <animate
                  attributeName="opacity"
                  values="0;0;0.6;0;0"
                  keyTimes="0;0.34;0.36;0.6;1"
                  {...loop(i)}
                />
              </circle>
            )}
          </g>
        </motion.g>
      ))}
    </svg>
  );
}
