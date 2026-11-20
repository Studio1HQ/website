"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/*
 * Detailed line drawings of each city's landmark, on a 120 x 80 grid, drawn
 * from the monument's real structure. Stroke-only so they take the text
 * colour; the ground line is shared so every card sits on the same horizon.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const DRAWINGS: Record<string, ReactNode> = {
  // Howrah Bridge: two steel cantilever towers, the suspended span, the Hooghly
  Kolkata: (
    <>
      <path d="M6 58h108" />
      {/* towers */}
      <path d="M34 58V18M42 58V18M78 58V18M86 58V18M33 18h10M77 18h10" />
      {range(5).map((i) => (
        <path key={`t${i}`} d={`M34 ${22 + i * 7}l8 7M42 ${22 + i * 7}l-8 7M78 ${22 + i * 7}l8 7M86 ${22 + i * 7}l-8 7`} />
      ))}
      {/* cantilever arms and the suspended span */}
      <path d="M42 18 Q60 34 78 18M42 24 Q60 40 78 24" />
      <path d="M34 18 Q20 34 6 46M86 18 Q100 34 114 46" />
      {range(7).map((i) => (
        <path key={`h${i}`} d={`M${46 + i * 4.7} ${22 + Math.sin((i + 1) / 8 * Math.PI) * 9}V50`} />
      ))}
      {range(5).map((i) => (
        <path key={`l${i}`} d={`M${12 + i * 4.5} ${42 - i * 3.2}V50M${108 - i * 4.5} ${42 - i * 3.2}V50`} />
      ))}
      <path d="M6 50h108M6 53h108" />
      {/* water */}
      <path d="M10 64c6-2 10 2 16 0s10 2 16 0 10 2 16 0 10 2 16 0 10 2 16 0 10 2 16 0" />
      <path d="M24 70c6-2 10 2 16 0s10 2 16 0 10 2 16 0 10 2 16 0" />
    </>
  ),
  // Vidhana Soudha: wide colonnaded front, steps, central dome and corner domes
  Bengaluru: (
    <>
      <path d="M6 70h108M10 70V44h100v26M8 44h104" />
      <path d="M46 70v-4h28v4M44 66h32M42 62h36" />
      {range(12).map((i) => (
        <path key={`c${i}`} d={`M${15 + i * 8.2} 70V48`} />
      ))}
      <path d="M10 48h100" />
      <path d="M42 44l18-9 18 9" />
      <path d="M48 35V28h24v7M46 28h28" />
      <path d="M50 28c0-14 20-14 20 0M58 14V9M60 14V8M62 14V9M60 8V5" />
      <path d="M12 44v-6h12v6M96 44v-6h12v6M12 38c0-6 12-6 12 0M96 38c0-6 12-6 12 0M18 32v-3M102 32v-3" />
      {range(6).map((i) => (
        <path key={`w${i}`} d={`M${30 + i * 2} 41h0M${84 + i * 2} 41h0`} />
      ))}
    </>
  ),
  // Taipei 101: eight flared segments on a stepped podium, the pinnacle
  Taipei: (
    <>
      <path d="M6 76h108" />
      <path d="M40 76V66h40v10M44 66v-5h32v5" />
      {range(8).map((i) => {
        const top = 61 - (i + 1) * 6;
        return <path key={`s${i}`} d={`M48 ${top + 6}l-3-6h30l-3 6M50 ${top + 3}h20`} />;
      })}
      <path d="M48 13v-3h24v3M52 10V6h16v4M56 6V3h8v3M60 3V0" />
      <path d="M46 61V13M74 61V13" opacity=".35" />
      {/* lower city */}
      <path d="M10 76V62h10v14M22 76V56h8v14M88 76V60h10v16M100 76V66h12v10" />
    </>
  ),
  // Castle of Santa Bárbara on Mount Benacantil above the bay
  Alicante: (
    <>
      <path d="M6 64c8-3 14 3 22 0s14 3 22 0 14 3 22 0 14 3 22 0 14 3 20 0" />
      <path d="M6 70c8-3 14 3 22 0s14 3 22 0 14 3 22 0 14 3 22 0 14 3 20 0" />
      <path d="M8 60l18-14 10 4 12-14 14 6 12-10 16 12 22 16" />
      <path d="M36 50l4 4M52 42l6 6M86 40l8 8" opacity=".5" />
      <path d="M50 36V22h30v14M50 22v-4h4v4h4v-4h4v4h4v-4h4v4h4v-4h4v4h2" />
      <path d="M62 22V10h8v12M62 10V7h2v3h4V7h2v3" />
      <path d="M56 36v-6a3 3 0 0 1 6 0v6M72 30h4M54 26h2M74 26h2" />
    </>
  ),
  // The Parthenon: three steps, eight Doric columns, frieze and pediment
  Athens: (
    <>
      <path d="M6 72h108M10 68h100v4M14 64h92v4M18 60h84v4" />
      {range(8).map((i) => (
        <path key={`c${i}`} d={`M${23 + i * 10.6} 60V32M${27 + i * 10.6} 60V32M${22 + i * 10.6} 32h6`} />
      ))}
      <path d="M18 32h84M18 28h84v4M18 24h84v4" />
      {range(14).map((i) => (
        <path key={`f${i}`} d={`M${21 + i * 6} 24v4`} />
      ))}
      <path d="M16 24l44-14 44 14" />
      <path d="M26 21l34-9.5 34 9.5" opacity=".45" />
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
  // Blue Mosque: cascade of domes over the prayer hall, six slim minarets
  Istanbul: (
    <>
      <path d="M6 74h108M24 74V52h72v22" />
      <path d="M34 52c0-12 52-12 52 0" />
      <path d="M42 46c0-18 36-18 36 0M60 28v-5M58 23h4" />
      <path d="M26 52c0-6 10-6 10 0M84 52c0-6 10-6 10 0M38 46c0-5 8-5 8 0M74 46c0-5 8-5 8 0" />
      {range(7).map((i) => (
        <path key={`a${i}`} d={`M${30 + i * 9} 74v-8a3 3 0 0 1 6 0v8`} />
      ))}
      {[10, 18, 102, 110].map((x) => (
        <path key={`m${x}`} d={`M${x - 1.5} 74V26h3v48M${x - 1.5} 26l1.5-12 1.5 12M${x - 3} 40h6M${x - 3} 54h6`} />
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
  // Sigiriya: the lion rock rising from the forest, the lion's paw gate
  "Sri Lanka": (
    <>
      <path d="M6 72h108" />
      {/* the rock: a flat-topped column of stone with steep, bulging sides */}
      <path d="M24 72C28 62 30 52 31 40C32 30 34 22 39 16H81C86 22 88 30 89 40C90 52 92 62 96 72" />
      {/* the stone's layers */}
      <path d="M33 28c10 2 18-1 28 1s16 1 26-1M31 42c12 2 22-1 32 1s16 1 26-1M30 56c12 2 24-1 34 1s18 1 26-1" opacity=".45" />
      {/* palace ruins on the summit */}
      <path d="M41 16v-3h9v3M54 16v-5h12v5M70 16v-3h9v3M57 11v-2h6v2" />
      {/* the path climbing the face */}
      <path d="M60 60l-7-6 7-6-7-6 7-6" opacity=".45" />
      {/* the lion's paws and the stair between them */}
      <path d="M46 72v-7c0-3 2-5 5-5h3v12M74 72v-7c0-3-2-5-5-5h-3v12" />
      <path d="M46 72h2v-2M50 72v-2M70 72v-2M74 72h-2v-2" />
      <path d="M56 72h8M57 69h6M58 66h4M59 63h2" />
      {/* forest at the foot of the rock */}
      {[12, 22, 98, 108].map((x, i) => (
        <g key={`tr${i}`}>
          <path d={`M${x} 72v-6`} />
          <path d={`M${x - 6} 66a4 4 0 0 1 2-7a5 5 0 0 1 8-2a4 4 0 0 1 2 9z`} />
        </g>
      ))}
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
