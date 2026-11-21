"use client";

import type { ReactNode } from "react";

/*
 * Detailed line drawings of each city's landmark, on a 120 x 80 grid, drawn
 * from the monument's real structure. Stroke-only so they take the text
 * colour; the ground line is shared so every card sits on the same horizon.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const DRAWINGS: Record<string, ReactNode> = {
  // Howrah Bridge: a steel cantilever truss, two towers, the deck, the Hooghly
  Kolkata: (
    <>
      {/* deck */}
      <path d="M4 56h112M4 59h112" />
      {/* the two towers, braced */}
      <path d="M34 56V14M42 56V14M78 56V14M86 56V14M32 14h12M76 14h12" />
      {range(6).map((i) => (
        <path key={`tw${i}`} d={`M34 ${16 + i * 7}l8 7M42 ${16 + i * 7}l-8 7M78 ${16 + i * 7}l8 7M86 ${16 + i * 7}l-8 7`} />
      ))}
      {/* top chord: anchor arms down to the banks, a shallow sag between the towers */}
      <path d={`M4 52L34 16M42 16${range(19).map((i) => `L${42 + i * 2} ${(16 + 14 * Math.sin((Math.PI * i * 2) / 36)).toFixed(1)}`).join("")}M86 16L116 52`} />
      {/* truss web */}
      <path
        d={[
          ...range(4).map((i) => {
            const x = 10 + i * 6;
            const y = 52 - ((x - 4) / 30) * 36;
            return `M${x} ${y.toFixed(1)}L${x + 3} 56L${x + 6} ${(52 - ((x + 6 - 4) / 30) * 36).toFixed(1)}`;
          }),
          ...range(6).map((i) => {
            const x = 42 + i * 6;
            const top = (v: number) => (16 + 14 * Math.sin((Math.PI * (v - 42)) / 36)).toFixed(1);
            return `M${x} ${top(x)}L${x + 3} 56L${x + 6} ${top(x + 6)}`;
          }),
          ...range(4).map((i) => {
            const x = 110 - i * 6;
            const y = 52 - ((116 - x) / 30) * 36;
            return `M${x} ${y.toFixed(1)}L${x - 3} 56L${x - 6} ${(52 - ((116 - (x - 6)) / 30) * 36).toFixed(1)}`;
          }),
        ].join("")}
        opacity=".55"
      />
      {/* the river */}
      <path d="M8 66c5-2 9 2 14 0s9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0" />
      <path d="M22 71c5-2 9 2 14 0s9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0" opacity=".55" />
    </>
  ),
  // Vidhana Soudha: long wings, a pillared portico under a pediment, the central dome
  Bengaluru: (
    <>
      <path d="M4 72h112" />
      {/* grand steps */}
      <path d="M34 72v-2h52v2M38 70v-2h44v2M42 68v-2h36v2" />
      {/* wings */}
      <path d="M8 66V44h104v22M8 44h104M8 41h104v3" />
      {range(4).map((i) => (
        <path key={`wl${i}`} d={`M${13 + i * 6} 50h3v10h-3zM${89 + i * 6} 50h3v10h-3z`} />
      ))}
      {/* corner domes */}
      <path d="M12 41v-4h10v4M13 37a4 4 0 0 1 8 0M17 33v-3M98 41v-4h10v4M99 37a4 4 0 0 1 8 0M103 33v-3" />
      {/* portico: pediment, entablature, twelve columns */}
      <path d="M38 41l22-9 22 9M38 41h44" />
      {range(12).map((i) => (
        <path key={`pc${i}`} d={`M${40 + i * 3.6} 44v22`} />
      ))}
      {/* the central dome on its drum, lantern and finial */}
      <path d="M46 32v-5h28v5M47 27h26" />
      <path d="M48 27a12 11 0 0 1 24 0" />
      <path d="M57 16h6v-4h-6zM60 12V8" />
    </>
  ),
  // Taipei 101: eight flared segments on a stepped podium, the pinnacle
  Taipei: (
    <>
      <path d="M4 72h112" />
      {/* neighbours */}
      <path d="M12 72V58h12v14M24 72V52h9v20M88 72V55h9v17M97 72V60h11v12" opacity=".55" />
      {/* podium */}
      <path d="M40 72V62h40v10M44 62v-3h32v3" />
      {/* eight segments, each flaring outward as it rises */}
      {range(8).map((i) => {
        const yb = 59 - i * 5.6;
        const yt = yb - 5.6;
        return <path key={`sg${i}`} d={`M51 ${yb.toFixed(1)}L49 ${yt.toFixed(1)}H71L69 ${yb.toFixed(1)}M52 ${(yb - 2.8).toFixed(1)}h16`} />;
      })}
      {/* top and pinnacle */}
      <path d="M53 14.2V10h14v4.2M56 10V7h8v3M60 7V1" />
    </>
  ),
  // Castle of Santa Bárbara on Mount Benacantil above the bay, palms on the shore
  Alicante: (
    <>
      {/* the hill */}
      <path d="M6 66L24 54L32 56L46 38L54 33L60 34L70 40L86 54L114 66" />
      <path d="M30 58l6-2M74 46l6 4M44 44l4-4" opacity=".45" />
      {/* castle walls and keep */}
      <path d="M44 38v-8h26v10" />
      <path d={`M44 30${range(6).map((i) => `h2v-2h2v2`).join("")}h2`} />
      <path d="M53 30V18h10v12M53 18v-2h2v2h2v-2h2v2h2v-2h2v2" />
      <path d="M57 30v-4a2 2 0 0 1 2 0v4M47 34h3M64 34h3" />
      {/* shore and sea */}
      <path d="M4 66h112" />
      <path d="M6 71c5-2 9 2 14 0s9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0 9 2 14 0" opacity=".55" />
      {/* palms */}
      <path d="M14 66c1-5 0-10 2-15M16 51c-3-2-7-1-9 2M16 51c-2-3-6-4-9-2M16 51c2-3 6-4 9-2M16 51c3 0 6 2 7 5" />
      <path d="M104 66c-1-5 0-10-2-15M102 51c3-2 7-1 9 2M102 51c2-3 6-4 9-2M102 51c-2-3-6-4-9-2M102 51c-3 0-6 2-7 5" />
    </>
  ),
  // The Parthenon: three steps, eight columns, architrave, frieze, pediment
  Athens: (
    <>
      <path d="M8 72h104" />
      <path d="M16 72v-3h88v3M20 69v-3h80v3M24 66v-3h72v3" />
      {range(8).map((i) => (
        <path key={`c${i}`} d={`M${30 + i * 8.6} 63V37M${28 + i * 8.6} 37h4`} />
      ))}
      <path d="M24 37h72M24 33h72v4M24 33v-5h72v5" />
      <path d="M22 28L60 14L98 28Z" />
    </>
  ),
  // India Gate: the great arch, inscribed attic, stepped crown and dome
  "Delhi NCR": (
    <>
      <path d="M6 72h108" />
      {/* platform and steps */}
      <path d="M22 72v-3h76v3M26 69v-3h68v3" />
      {/* the gate's body */}
      <path d="M30 66V24h60v42" />
      {/* the great arch, with its inner moulding and imposts */}
      <path d="M46 66V40a14 14 0 0 1 28 0v26" />
      <path d="M50 66V41a10 10 0 0 1 20 0v25" opacity=".45" />
      <path d="M43 40h3M74 40h3" />
      {/* pier panels and niches */}
      <path d="M34 62V46h8v16M78 62V46h8v16M34 42h8M78 42h8" />
      <path d="M38 46v16M82 46v16" opacity=".45" />
      {/* cornice and the inscribed attic */}
      <path d="M28 33h64M28 30h64v3" />
      <path d="M28 24h64v6" />
      {range(9).map((i) => (
        <path key={`ig${i}`} d={`M${38 + i * 5} 27h3`} opacity=".45" />
      ))}
      {/* stepped crown and the shallow dome */}
      <path d="M34 24v-4h52v4M40 20v-4h40v4M46 16v-3h28v3" />
      <path d="M50 13a10 6 0 0 1 20 0M60 7v-2" />
      {/* lamp posts either side */}
      <path d="M14 72V58M11 58h6M12 55h4l-2-3zM106 72V58M103 58h6M104 55h4l-2-3z" />
    </>
  ),
  // Blue Mosque: a cascade of domes over the prayer hall, slender minarets
  Istanbul: (
    <>
      <path d="M4 72h112" />
      {/* prayer hall and its arcade */}
      <path d="M26 72V56h68v16" />
      {range(7).map((i) => (
        <path key={`ar${i}`} d={`M${30 + i * 9} 72v-7a3 3 0 0 1 6 0v7`} />
      ))}
      {/* corner domes, semi-domes, then the main dome on its drum */}
      <path d="M28 56a5 5 0 0 1 10 0M82 56a5 5 0 0 1 10 0" />
      <path d="M36 56v-4h48v4M38 52a7 5 0 0 1 14 0M68 52a7 5 0 0 1 14 0" />
      <path d="M44 48h32v4M44 48a16 14 0 0 1 32 0" />
      <path d="M60 34v-5M58.5 27a2 2 0 1 0 3 0" />
      {/* minarets with balconies and pointed caps */}
      {[12, 20, 100, 108].map((x) => (
        <path key={`mn${x}`} d={`M${x - 1.5} 72V22h3v50M${x - 3} 36h6M${x - 3} 50h6M${x - 1.5} 22l1.5-12 1.5 12`} />
      ))}
    </>
  ),
  // Marina Bay Sands: three leaning towers carrying the skypark
  Singapore: (
    <>
      <path d="M6 74h108" />
      {[24, 54, 84].map((x) => (
        <g key={`t${x}`}>
          <path d={`M${x} 74V22l12 2v50M${x + 6} 74V23`} />
          {range(9).map((i) => (
            <path key={i} d={`M${x} ${30 + i * 5}l12 1`} />
          ))}
        </g>
      ))}
      <path d="M14 20c22-4 70-4 94 1l-1 4c-24-4-70-5-92-1z" />
      <path d="M100 21c6 1 10 3 12 6" />
      <path d="M8 78c8-2 14 2 22 0s14 2 22 0 14 2 22 0 14 2 22 0 14 2 16 0" />
    </>
  ),
  // Sigiriya: the lion rock, sheer on one side, the lion terrace on its shoulder, jungle at its foot
  "Sri Lanka": (
    <>
      <path d="M4 72h112" />
      {/* the rock: sheer west face, flat crown, a sloping shoulder to the north */}
      <path d="M32 72C33 60 34 46 36 34C37 26 40 20 46 17L70 15C76 15 80 17 82 22C84 28 84 36 86 44C91 50 99 58 104 72" />
      <path d="M44 24c10-2 22-3 34-2" opacity=".45" />
      {/* the lion terrace on the shoulder, two paws and the stair between */}
      <path d="M72 58h16M74 58v-4h3v4M83 58v-4h3v4" />
      <path d="M80 54l-3-6 3-6-3-6 3-6" opacity=".6" />
      {/* jungle clumps */}
      <path d="M6 72a6 6 0 0 1 2-9a6 6 0 0 1 10-2a5 5 0 0 1 6 11z" />
      <path d="M38 72a5 5 0 0 1 2-8a5 5 0 0 1 9-1a4 4 0 0 1 5 9z" />
      <path d="M104 72a4 4 0 0 1 1-7a4 4 0 0 1 8-1a4 4 0 0 1 4 8z" />
    </>
  ),
};

/** Shrubs at the foot of a landmark: a clump of rounded leaves, shaded. */
function Shrub({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 72) scale(${s})`}>
      <path
        d="M-9 0a4 4 0 0 1 1-6a4.5 4.5 0 0 1 7-3a5 5 0 0 1 8 1a4 4 0 0 1 3 8z"
        fill="#d9d6d1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M-4-4a2 2 0 0 1 3-1M3-5a2 2 0 0 1 3 1" strokeWidth="1" opacity=".6" />
    </g>
  );
}

/**
 * A city's landmark, drawn like the skyline illustration: bold ink outline,
 * soft grey shading behind it, shrubs at its foot and a double ground line.
 */
export function Landmark({ city, className }: { city: string; className?: string }) {
  const drawing = DRAWINGS[city];
  if (!drawing) return null;
  return (
    <svg aria-hidden viewBox="0 6 120 74" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* soft grey wash behind the building */}
      <ellipse cx="60" cy="66" rx="46" ry="9" fill="#141414" opacity=".05" stroke="none" />
      {drawing}
      <Shrub x={14} s={0.9} />
      <Shrub x={106} s={1} />
      {/* double ground line */}
      <path d="M2 72.5h116" strokeWidth="2" />
      <path d="M14 77h34M66 77h40" strokeWidth="1.2" opacity=".55" />
    </svg>
  );
}

export const hasLandmark = (city: string) => city in DRAWINGS;
