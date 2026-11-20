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

export function SketchDesk({ className }: { className?: string }) {
  const reduce = !!useReducedMotion();
  const id = useId().replace(/:/g, "");
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", className)}
      initial={reduce ? false : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.8, ease: EASE }}
    >
      <defs>
        <filter id={`pencil-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
      </defs>
      <motion.g
        filter={`url(#pencil-${id})`}
        fill="none"
        stroke="#ef5a2c"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-10 800 500) scale(1.1) translate(-80 -40)"
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
      >
        <g strokeWidth="2.6" strokeOpacity="0.55">
          <Desk />
        </g>
        {/* the second, lighter pass, a hair off: the sketch's double line */}
        <g strokeWidth="1.4" strokeOpacity="0.35" transform="translate(3 2)">
          <Desk />
        </g>
      </motion.g>
    </motion.svg>
  );
}
