import type { ReactNode } from "react";

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
      <path d="M6 74h108M30 74h60v-3H30z" />
      <path d="M36 71V22h48v49" />
      <path d="M48 71V44a12 12 0 0 1 24 0v27" />
      <path d="M44 71V40M76 71V40M44 40a16 16 0 0 1 32 0" opacity=".45" />
      <path d="M36 32h48M36 28h48M38 30h44" />
      <path d="M33 22h54M34 19h52v3H34z" />
      <path d="M40 19v-5h40v5M44 14V9h32v5M48 9V6h24v3" />
      <path d="M53 6c0-6 14-6 14 0M60 0v1" />
      <path d="M40 60h4M76 60h4M40 50h4M76 50h4" />
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
      <path d="M6 74h108" />
      <path d="M26 74c2-14 6-24 10-34 4-10 6-22 16-24 10-2 18 0 22 8 4 10 6 20 10 30 3 8 6 14 8 20" />
      <path d="M38 40h44M34 50h52M30 60h60" opacity=".45" />
      <path d="M50 74V64h20v10M54 64c0-8 12-8 12 0" />
      <path d="M46 74c0-4 2-6 4-6M74 74c0-4-2-6-4-6" />
      {[8, 16, 98, 106, 112].map((x, i) => (
        <path key={`tr${i}`} d={`M${x} 74c-4 0-6-4-4-8 0-4 4-6 6-4 2-4 8-2 8 2 4 0 4 6 0 8-2 2-6 2-10 2z`} />
      ))}
    </>
  ),
};

export function Landmark({ city, className }: { city: string; className?: string }) {
  const drawing = DRAWINGS[city];
  if (!drawing) return null;
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {drawing}
    </svg>
  );
}

export const hasLandmark = (city: string) => city in DRAWINGS;
