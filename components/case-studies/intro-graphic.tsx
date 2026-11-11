"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Developers waiting to be found, on a 360 x 240 board. */
const PEOPLE = [
  { x: 292, y: 40, photo: "/assets/people/Dylan.webp" },
  { x: 292, y: 84, photo: "/assets/people/Gabriel.webp" },
  { x: 292, y: 128, photo: "/assets/people/Julia.webp" },
  { x: 292, y: 172, photo: "/assets/people/krish-dholakia.webp" },
  { x: 292, y: 216, photo: "/assets/people/sakshi-sen.webp" },
];
const R = 16;

/** The line from the product to one developer, stopping at the portrait. */
const route = (to: { x: number; y: number }) =>
  `M 120 128 C 190 128, 200 ${to.y}, ${to.x - R - 3} ${to.y}`;

/** One round: every line draws out together, lands, holds, and fades. */
const ROUND = 3.6;
/** The first round waits for the guides to finish drawing. */
const START = 1.6;

/**
 * The intro's idea, drawn quietly: a product on the left, the developers it
 * should reach on the right, and lines that reach them all at once.
 */
export function IntroGraphic() {
  const reduceMotion = useReducedMotion();
  const loop = {
    dur: `${ROUND}s`,
    begin: `${START}s`,
    repeatCount: "indefinite" as const,
  };

  return (
    <svg
      viewBox="0 0 360 256"
      role="img"
      aria-label="A product reaching the developers who had not found it yet"
      className="h-auto w-full overflow-visible"
    >
      <defs>
        {PEOPLE.map((person, i) => (
          <clipPath key={i} id={`intro-face-${i}`}>
            <circle cx={person.x} cy={person.y} r={R} />
          </clipPath>
        ))}
        <filter id="intro-lift" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="#141414"
            floodOpacity="0.18"
          />
        </filter>
      </defs>

      {/* Guides: hairline grey, drawn once */}
      {PEOPLE.map((person, i) => (
        <motion.path
          key={i}
          d={route(person)}
          fill="none"
          stroke="#141414"
          strokeOpacity="0.12"
          strokeWidth="1"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.08 }}
        />
      ))}

      {/* Reach: all lines draw out together, hold, then flow on into the portraits */}
      {reduceMotion
        ? null
        : PEOPLE.map((person, i) => (
            <path
              key={i}
              d={route(person)}
              pathLength={100}
              fill="none"
              stroke="#f97316"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeDasharray="100 100"
              strokeDashoffset="100"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="100;0;0;-100"
                keyTimes="0;0.35;0.62;0.92"
                calcMode="spline"
                keySplines="0.45 0 0.25 1;0 0 1 1;0.45 0 0.25 1"
                {...loop}
              />
            </path>
          ))}

      {/* The product */}
      <motion.g
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: EASE }}
        style={{ transformOrigin: "92px 128px" }}
      >
        <rect
          x="64"
          y="100"
          width="56"
          height="56"
          rx="6"
          fill="#141414"
          filter="url(#intro-lift)"
        />
        <path
          d="M 85 119 L 77 128 L 85 137 M 99 119 L 107 128 L 99 137 M 95 115 L 89 141"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Developers: portraits, ringed in orange as the lines land */}
      {PEOPLE.map((person, i) => (
        <motion.g
          key={i}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 + i * 0.08 }}
          style={{ transformOrigin: `${person.x}px ${person.y}px` }}
        >
          <circle
            cx={person.x}
            cy={person.y}
            r={R + 2}
            fill="#ffffff"
            filter="url(#intro-lift)"
          />
          <image
            href={person.photo}
            x={person.x - R}
            y={person.y - R}
            width={R * 2}
            height={R * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#intro-face-${i})`}
          />
          {reduceMotion ? null : (
            <circle
              cx={person.x}
              cy={person.y}
              r={R + 2}
              fill="none"
              stroke="#f97316"
              strokeWidth="1.75"
              opacity="0"
            >
              <animate
                attributeName="opacity"
                values="0;0;1;0.8;0"
                keyTimes="0;0.33;0.38;0.7;0.92"
                {...loop}
              />
              <animate
                attributeName="r"
                values={`${R + 2};${R + 2};${R + 2};${R + 7};${R + 7}`}
                keyTimes="0;0.33;0.6;0.92;1"
                calcMode="spline"
                keySplines="0 0 1 1;0 0 1 1;0.22 1 0.36 1;0 0 1 1"
                {...loop}
              />
            </circle>
          )}
        </motion.g>
      ))}
    </svg>
  );
}
