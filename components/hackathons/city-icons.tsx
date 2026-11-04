import type { ReactNode } from "react";

/*
 * Line drawings of each city's landmark on a 48 x 48 grid, drawn from the
 * monument's real structure. Stroke-only, so they take the text colour
 * around them.
 */

/** A row of small arched windows, for facades like Hawa Mahal's. */
function windows(x0: number, x1: number, y: number, count: number) {
  const step = (x1 - x0) / count;
  return Array.from({ length: count }, (_, i) => {
    const x = x0 + step * i + step / 2 - 1;
    return <path key={`${y}-${i}`} d={`M${x} ${y}v-2.2a1 1 0 0 1 2 0V${y}`} />;
  });
}

const LANDMARKS: Record<string, ReactNode> = {
  // Vidhana Soudha: colonnaded front, central drum and dome, corner domes
  Bengaluru: (
    <>
      <path d="M3 44h42M5 44V28h38v16M4 28h40" />
      <path d="M9 44V31M14 44V31M19 44V31M29 44V31M34 44V31M39 44V31M5 31h38" />
      <path d="M19 44v-6h10v6" />
      <path d="M17 28l7-4.5 7 4.5" />
      <path d="M18.5 23.5V20h11v3.5M18.5 20c0-7.5 11-7.5 11 0M24 12.5V9" />
      <path d="M6 28c0-3.6 5-3.6 5 0M37 28c0-3.6 5-3.6 5 0" />
    </>
  ),
  // India Gate: the great arch, stepped attic and the bowl on top
  "Delhi NCR": (
    <>
      <path d="M5 44h38M12 44V16h24v28" />
      <path d="M19 44V29a5 5 0 0 1 10 0v15" />
      <path d="M12 21h7M29 21h7M10 16h28M11 13h26" />
      <path d="M14 13v-3h20v3M17 10V7.5h14V10" />
      <path d="M20.5 7.5c0-2.4 7-2.4 7 0M24 5V3.5" />
    </>
  ),
  // Gateway of India: great central arch, side bays and four turrets
  Mumbai: (
    <>
      <path d="M3 44h42M5 44V20h38v24M4 20h40" />
      <path d="M18 44V31a6 6 0 0 1 12 0v13" />
      <path d="M8 44v-7a3 3 0 0 1 6 0v7M34 44v-7a3 3 0 0 1 6 0v7" />
      <path d="M8 27h6M34 27h6" />
      <path d="M13 20v-7h4v7M31 20v-7h4v7M19.5 20v-5h3v5M25.5 20v-5h3v5" />
      <path d="M13 13c0-2.8 4-2.8 4 0M31 13c0-2.8 4-2.8 4 0M15 10.2V9M33 10.2V9" />
    </>
  ),
  // Shaniwar Wada: Dilli Darwaza between two bastions, pointed arch gate
  Pune: (
    <>
      <path d="M3 44h42" />
      <path d="M5 44V18h8v26M35 44V18h8v26" />
      <path d="M5 18v-3h2v2h2v-2h2v2h2v-2" />
      <path d="M35 18v-3h2v2h2v-2h2v2h2v-2" />
      <path d="M13 44V22h22v22M13 22v-2.5h2v1.5h3v-1.5h2v1.5h3v-1.5h2v1.5h3v-1.5h2v1.5h3v-1.5h2V22" />
      <path d="M19 44V32l5-6 5 6v12M24 44V32" />
      <path d="M5 30h8M35 30h8" />
    </>
  ),
  // Charminar: four minarets with domed tops, arched front, two galleries
  Hyderabad: (
    <>
      <path d="M3 44h42" />
      <path d="M6 44V12h4v32M38 44V12h4v32" />
      <path d="M6 24h4M6 18h4M38 24h4M38 18h4" />
      <path d="M6 12c0-3 4-3 4 0M38 12c0-3 4-3 4 0M8 9V6.5M40 9V6.5" />
      <path d="M10 27h28M10 30h28" />
      <path d="M15 44V37a9 9 0 0 1 18 0v7" />
      <path d="M13 27v-3a2 2 0 0 1 4 0v3M19 27v-3a2 2 0 0 1 4 0v3M25 27v-3a2 2 0 0 1 4 0v3M31 27v-3a2 2 0 0 1 4 0v3" />
    </>
  ),
  // Kapaleeshwarar gopuram: stepped tiers, barrel vault, kalasams
  Chennai: (
    <>
      <path d="M6 44h36M9 44V38h30v6" />
      <path d="M9 38l2-6h26l2 6M11 32l2-5.5h22l2 5.5M13 26.5l2-5h18l2 5M15 21.5l2-4.5h14l2 4.5" />
      <path d="M17 17c0-4.5 14-4.5 14 0" />
      <path d="M20 13.4V11M24 12.7V9.5M28 13.4V11" />
      <path d="M21 44v-3.5a3 3 0 0 1 6 0V44" />
      <path d="M16 35.5v-1M20 35.5v-1M24 35.5v-1M28 35.5v-1M32 35.5v-1M18 30v-1M24 30v-1M30 30v-1" />
    </>
  ),
  // Howrah Bridge: two towers, cantilever trusses and the river below
  Kolkata: (
    <>
      <path d="M2 31h44" />
      <path d="M13 31V8M35 31V8" />
      <path d="M2 24 13 8l11 11L35 8l11 16" />
      <path d="M2 24h44" />
      <path d="M5 31l3-7 3 7M16 31l3-12 3 12M26 31l3-12 3 12M37 31l3-7 3 7" />
      <path d="M3 37q3.5-2 7 0t7 0 7 0 7 0 7 0 7 0M7 41q3.5-2 7 0t7 0 7 0 7 0 7 0" />
    </>
  ),
  // Hawa Mahal: the stepped honeycomb facade of small windows
  Jaipur: (
    <>
      <path d="M3 44h42" />
      <path d="M5 44V35h38v9M8 35v-7h32v7M12 28v-6.5h24V28M16 21.5V15h16v6.5M20 15V9.5h8V15" />
      <path d="M21 9.5c0-3.2 6-3.2 6 0M24 6.3V4.5" />
      <g strokeWidth="1">
        {windows(5, 43, 42, 9)}
        {windows(8, 40, 33.5, 8)}
        {windows(12, 36, 26.5, 6)}
        {windows(16, 32, 20, 4)}
        {windows(20, 28, 13.5, 2)}
      </g>
    </>
  ),
};

/** The landmark for a city, or a simple pin when there isn't one. */
export function CityIcon({
  city,
  className,
}: {
  city: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {LANDMARKS[city] ?? (
        <path d="M24 42s-12-11-12-21a12 12 0 0 1 24 0c0 10-12 21-12 21ZM24 25.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
      )}
    </svg>
  );
}
