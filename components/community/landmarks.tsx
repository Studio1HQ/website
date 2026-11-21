"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
  // The Parthenon: three steps, eight Doric columns, architrave, frieze, pediment
  Athens: (
    <>
      <path d="M4 72h112" />
      {/* three steps */}
      <path d="M14 72v-3h92v3M18 69v-3h84v3M22 66v-3h76v3" />
      {/* eight columns, each with a capital */}
      {range(8).map((i) => {
        const x = 27 + i * 9.4;
        return <path key={`c${i}`} d={`M${x} 63V36M${x + 4} 63V36M${x - 1} 36h6`} />;
      })}
      {/* architrave and frieze */}
      <path d="M22 36h76M22 32h76v4M22 32V27h76v5" />
      {range(9).map((i) => (
        <path key={`t${i}`} d={`M${26 + i * 8.6} 27v5`} opacity=".45" />
      ))}
      {/* pediment */}
      <path d="M20 27L60 13L100 27Z" />
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
  // Sigiriya: the flat-topped lion rock, the lion's paw terrace, palms and water gardens
  "Sri Lanka": (
    <>
      <path d="M4 72h112" />
      {/* the rock: sheer sides, a flat crown */}
      <path d="M28 72C30 62 31 50 32 40C33 30 35 22 40 18L44 16H80L85 19C89 24 91 32 91 42C92 52 93 62 95 72" />
      {/* trees and ruins on the summit */}
      <path d="M46 16c1-3 5-3 6 0c1-3 5-3 6 0M66 16c1-3 5-3 6 0c1-3 5-3 6 0M58 16v-3h6v3" />
      {/* fissures and the mirror-wall gallery */}
      <path d="M40 28v12M50 22v8M76 24v14M84 32v16M36 46v8" opacity=".45" />
      <path d="M33 54L60 46L91 52M33 57L60 49L91 55" opacity=".45" />
      {/* the lion terrace: two great paws, the stair rising between them */}
      <path d="M46 72v-6h32v6" />
      <path d="M48 66v-6c0-2 1-3 3-3h5v9M76 66v-6c0-2-1-3-3-3h-5v9" />
      <path d="M50 66v-2M52 66v-2M54 66v-2M70 66v-2M72 66v-2M74 66v-2" />
      <path d="M58 66h8M59 63h6M60 60h4M61 57h2" />
      {/* water gardens */}
      <path d="M8 72v-3h14v3M98 72v-3h14v3" opacity=".55" />
      {/* palms */}
      <path d="M22 72c1-6 0-11 2-17M24 55c-3-2-7-1-9 2M24 55c-2-3-6-4-9-2M24 55c2-3 6-4 9-2M24 55c3 0 6 2 7 5" />
      <path d="M100 72c-1-6 0-11-2-17M98 55c3-2 7-1 9 2M98 55c2-3 6-4 9-2M98 55c-2-3-6-4-9-2M98 55c-3 0-6 2-7 5" />
    </>
  ),
};

export function Landmark({ city, className }: { city: string; className?: string }) {
  const drawing = DRAWINGS[city];
  if (!drawing) return null;
  return (
    <svg aria-hidden viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {drawing}
    </svg>
  );
}

type Box = { x: number; y: number; w: number; h: number };
const FULL: Box = { x: 0, y: 0, w: 120, h: 80 };

/**
 * The cities' landmarks side by side as one skyline: each drawing cropped to
 * its own outline, all at one scale, filling the width and standing on the
 * bottom edge.
 */
export function Skyline({ cities, className }: { cities: string[]; className?: string }) {
  const list = cities.filter((c) => c in DRAWINGS);
  const key = list.join("|");
  const refs = useRef<(SVGSVGElement | null)[]>([]);
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  useLayoutEffect(() => {
    setBoxes(
      refs.current.slice(0, key.split("|").length).map((el) => {
        const b = el?.getBBox();
        return b && b.width ? { x: b.x - 1, y: b.y - 1, w: b.width + 2, h: b.height + 2 } : FULL;
      }),
    );
  }, [key]);
  const total = boxes ? boxes.reduce((n, b) => n + b.w, 0) : list.length * 120;
  return (
    <div className={className} style={{ display: "flex", alignItems: "flex-end" }}>
      {list.map((city, i) => {
        const b = boxes?.[i] ?? FULL;
        return (
          <svg
            key={city}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-hidden
            viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}
            style={{ width: `${(b.w / total) * 100}%`, height: "auto", display: "block", flex: "none" }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {DRAWINGS[city]}
          </svg>
        );
      })}
    </div>
  );
}

export const hasLandmark = (city: string) => city in DRAWINGS;
