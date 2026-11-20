"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";
import { cn } from "@/lib/utils";

/*
 * DevRel, drawn in pencil: talk notes, a stage screen, a microphone, a
 * camera, a conference badge, a terminal, docs, a pull request, GitHub
 * stars, a laptop and questions from the room, joined by circuit traces. Every line is drawn twice, a
 * little apart, and run through a slight wobble so it reads as a sketch.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Desk() {
  return (
    <>
      {/* spiral notebook: talk notes */}
      <rect x="120" y="90" width="290" height="370" rx="10" />
      <rect x="146" y="108" width="246" height="334" rx="4" />
      {range(8).map((i) => (
        <g key={`r${i}`}>
          <circle cx="120" cy={130 + i * 42} r="13" />
          <path d={`M120 ${130 + i * 42} h-24`} />
        </g>
      ))}
      <rect x="182" y="140" width="170" height="38" />
      {range(7).map((i) => (
        <path key={`h${i}`} d={`M${190 + i * 22} 174 l18 -30`} />
      ))}
      {range(6).map((i) => (
        <path key={`l${i}`} d={`M176 ${222 + i * 34} h ${i % 2 ? 150 : 190}`} />
      ))}

      {/* stage screen with slides */}
      <rect x="520" y="30" width="480" height="290" rx="10" />
      <rect x="544" y="52" width="432" height="246" rx="4" />
      <path d="M760 320 v40 M700 372 h120" />
      <path d="M580 96 h220 M580 132 h150" />
      <path d="M590 270 l70 -60 50 34 80 -86 60 54" />
      <circle cx="900" cy="120" r="34" />
      <path d="M900 86 v34 h34" />

      {/* microphone on a stand */}
      <rect x="1110" y="40" width="64" height="104" rx="32" />
      {range(4).map((i) => (
        <path key={`m${i}`} d={`M1114 ${66 + i * 18} h56`} />
      ))}
      <path d="M1090 110 a52 52 0 0 0 104 0 M1142 162 v130 M1096 292 h92" />

      {/* camera */}
      <rect x="1250" y="200" width="230" height="150" rx="16" />
      <circle cx="1365" cy="275" r="52" />
      <circle cx="1365" cy="275" r="30" />
      <rect x="1290" y="180" width="70" height="22" rx="6" />
      <circle cx="1450" cy="226" r="8" />

      {/* conference badge on a lanyard */}
      <path d="M190 520 L260 600 M330 520 L260 600" />
      <rect x="196" y="600" width="128" height="170" rx="12" />
      <rect x="232" y="612" width="56" height="10" rx="5" />
      <circle cx="260" cy="670" r="26" />
      <path d="M220 724 h80 M232 746 h56" />

      {/* terminal */}
      <rect x="430" y="440" width="420" height="250" rx="12" />
      <path d="M430 482 h420" />
      {[456, 478, 500].map((x) => (
        <circle key={x} cx={x} cy="461" r="7" />
      ))}
      <path d="M462 520 l20 16 -20 16 M500 552 h70" />
      <path d="M462 590 l20 16 -20 16 M500 622 h150" />
      <rect x="664" y="608" width="14" height="28" />

      {/* docs page */}
      <path d="M900 420 h200 l50 50 v250 h-250 z M1100 420 v50 h50" />
      <path d="M930 470 h120 M930 512 h180 M930 544 h160 M930 576 h180" />
      <rect x="930" y="606" width="180" height="80" rx="6" />
      <path d="M950 632 h90 M950 658 h120" />

      {/* pull request */}
      <circle cx="1270" cy="470" r="18" />
      <circle cx="1270" cy="640" r="18" />
      <circle cx="1400" cy="640" r="18" />
      <path d="M1270 488 v134 M1400 622 v-90 a40 40 0 0 0 -40 -40 h-50 M1330 470 l-20 22 20 22" />

      {/* github stars */}
      {[[1490, 470, 30], [1540, 560, 20], [1470, 700, 24]].map(([x, y, r]) => (
        <path
          key={`s${x}`}
          d={`M${x} ${y - r} l${r * 0.29} ${r * 0.6} ${r * 0.66} ${r * 0.09} -${r * 0.48} ${r * 0.46} ${r * 0.12} ${r * 0.66} -${r * 0.59} -${r * 0.31} -${r * 0.59} ${r * 0.31} ${r * 0.12} -${r * 0.66} -${r * 0.48} -${r * 0.46} ${r * 0.66} -${r * 0.09} z`}
        />
      ))}

      {/* laptop, lower middle */}
      <rect x="560" y="760" width="380" height="200" rx="12" />
      <rect x="582" y="780" width="336" height="160" rx="4" />
      <path d="M530 970 h440" />
      <path d="M700 830 l-24 24 24 24 M800 830 l24 24 -24 24 M766 822 l-32 64" />

      {/* speech bubbles: questions from the room */}
      <path d="M1030 790 h170 a20 20 0 0 1 20 20 v60 a20 20 0 0 1 -20 20 h-120 l-30 30 v-30 h-20 a20 20 0 0 1 -20 -20 v-60 a20 20 0 0 1 20 -20 z" />
      <path d="M1050 830 h120 M1050 856 h80" />
      <path d="M1290 780 h120 a18 18 0 0 1 18 18 v44 a18 18 0 0 1 -18 18 h-16 v24 l-24 -24 h-80 a18 18 0 0 1 -18 -18 v-44 a18 18 0 0 1 18 -18 z" />
      <path d="M1330 812 h50" />

      {/* hackathon trophy */}
      <path d="M0 820 h100 v30 a50 50 0 0 1 -100 0 z M0 836 h-22 a22 22 0 0 0 22 30 M100 836 h22 a22 22 0 0 1 -22 30 M50 900 v30 M20 930 h60 v20 h-60 z" />

      {/* headphones */}
      <path d="M1500 120 v-30 a70 70 0 0 1 140 0 v30" />
      <rect x="1486" y="104" width="30" height="56" rx="10" />
      <rect x="1624" y="104" width="30" height="56" rx="10" />

      {/* coffee, from above */}
      <circle cx="460" cy="850" r="44" />
      <circle cx="460" cy="850" r="32" />
      <path d="M504 840 h20 a16 16 0 0 1 0 32 h-20" />
      <path d="M440 846 c6 -8 16 -8 22 0 s16 8 22 0" />

      {/* a </> sticker */}
      <circle cx="465" cy="385" r="42" />
      <path d="M448 370 l-14 15 14 15 M482 370 l14 15 -14 15 M470 364 l-10 42" />

      {/* pizza slice: hackathon night */}
      <path d="M1500 860 l120 -30 -40 120 z M1520 868 a90 90 0 0 0 76 -24" />
      <circle cx="1556" cy="880" r="8" />
      <circle cx="1580" cy="908" r="6" />

      {/* a video player */}
      <rect x="-190" y="250" width="240" height="150" rx="10" />
      <path d="M-90 300 l40 25 -40 25 z M-170 380 h200" />
      <circle cx="-110" cy="380" r="6" />

      {/* a chat window */}
      <rect x="1560" y="440" width="220" height="230" rx="12" />
      <path d="M1560 476 h220" />
      {[0, 1, 2].map((i) => (
        <g key={`ch${i}`}>
          <circle cx="1592" cy={512 + i * 52} r="12" />
          <path d={`M1614 ${506 + i * 52} h${100 - i * 20} M1614 ${522 + i * 52} h${60 + i * 10}`} />
        </g>
      ))}

      {/* circuit traces between things */}
      <path d="M410 280 h60 v-150 h50" />
      <path d="M1000 180 h60 v-60 h50" />
      <path d="M1142 292 v60 h108" />
      <path d="M324 690 h106" />
      <path d="M850 560 h50" />
      <path d="M1150 600 h70 v40 h32" />
      <path d="M940 860 h90" />
      {[[470, 280], [1060, 180], [1142, 352], [380, 690], [875, 560], [1220, 600], [985, 860]].map(([x, y]) => (
        <circle key={`n${x}`} cx={x} cy={y} r="6" />
      ))}
    </>
  );
}

/** The whole desk, repeated small across the area as one tilted pattern. */
export function SketchDesk({ className }: { className?: string }) {
  const reduce = !!useReducedMotion();
  const id = useId().replace(/:/g, "");
  return (
    <motion.svg
      aria-hidden
      className={cn("pointer-events-none", className)}
      initial={reduce ? false : { opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.8, ease: EASE }}
    >
      <defs>
        <pattern
          id={`desk-${id}`}
          patternUnits="userSpaceOnUse"
          x="-200"
          y="-60"
          width="2000"
          height="1080"
          patternTransform="rotate(-10) scale(0.36)"
        >
          <g fill="none" stroke="#ef5a2c" strokeLinecap="round" strokeLinejoin="round">
            <g strokeWidth="4.6" strokeOpacity="0.6">
              <Desk />
            </g>
            {/* the second, lighter pass, a hair off: the sketch's double line */}
            <g strokeWidth="2.4" strokeOpacity="0.35" transform="translate(5 4)">
              <Desk />
            </g>
          </g>
        </pattern>
        <filter id={`pencil-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </defs>
      <motion.rect
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
        fill={`url(#desk-${id})`}
        filter={`url(#pencil-${id})`}
        animate={reduce ? undefined : { y: ["-5%", "-3%", "-5%"] }}
        transition={{ duration: 16, ease: "easeInOut", repeat: Infinity }}
      />
    </motion.svg>
  );
}
