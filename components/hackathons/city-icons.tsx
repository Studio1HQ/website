import type { ReactNode } from "react";

/*
 * Line drawings of each city's best-known landmark, on a 32 x 32 grid,
 * the way ticketing apps mark a city. Stroke-only, so they take the
 * text colour around them.
 */
const LANDMARKS: Record<string, ReactNode> = {
  // Vidhana Soudha: domed centre over a colonnade
  Bengaluru: (
    <>
      <path d="M3 28h26M5 28V18h22v10" />
      <path d="M8 22v6M12 22v6M16 22v6M20 22v6M24 22v6M5 22h22" />
      <path d="M11 18v-3h10v3M12 15a4 4 0 0 1 8 0M16 11V8.5" />
    </>
  ),
  // India Gate: the arch, cornice and crown
  "Delhi NCR": (
    <>
      <path d="M3 28h26M8 28V11h16v17" />
      <path d="M12.5 28v-9a3.5 3.5 0 0 1 7 0v9" />
      <path d="M6 11h20M9 8h14M13.5 8V5.5h5V8" />
    </>
  ),
  // Gateway of India: central arch, side bays and four turrets
  Mumbai: (
    <>
      <path d="M3 28h26M5 28V14h22v14" />
      <path d="M13 28v-7a3 3 0 0 1 6 0v7M7.5 28v-4a1.5 1.5 0 0 1 3 0v4M21.5 28v-4a1.5 1.5 0 0 1 3 0v4" />
      <path d="M6 14v-3M26 14v-3M11 14v-2M21 14v-2M13 14a3 3 0 0 1 6 0" />
    </>
  ),
  // Shaniwar Wada: crenellated fort wall and gate
  Pune: (
    <>
      <path d="M3 28h26" />
      <path d="M5 28V13h3v2h3v-2h3v2h4v-2h3v2h3v-2h3v15" />
      <path d="M13 28v-6a3 3 0 0 1 6 0v6M5 18h22" />
    </>
  ),
  // Charminar: four minarets, arch and dome
  Hyderabad: (
    <>
      <path d="M3 28h26M7 28V9M25 28V9M7 9V6M25 9V6M6 9h2M24 9h2" />
      <path d="M7 16h18M7 28h18M12 28v-6a4 4 0 0 1 8 0v6" />
      <path d="M13 16a3 3 0 0 1 6 0" />
    </>
  ),
  // A temple gopuram: stepped tower, tier on tier
  Chennai: (
    <>
      <path d="M4 28h24M8 28v-5h16v5" />
      <path d="M9 23l1-4h12l1 4M11 19l1-4h8l1 4M13 15l1-4h4l1 4M14.5 11l.5-3h2l.5 3" />
      <path d="M16 8V5.5" />
    </>
  ),
  // Howrah Bridge: twin towers and cantilever trusses over the river
  Kolkata: (
    <>
      <path d="M2 22h28M7 22V8M25 22V8" />
      <path d="M2 14l5-6 9 10 9-10 5 6M7 14h18" />
      <path d="M4 26q3-1.5 6 0t6 0 6 0 6 0" />
    </>
  ),
  // Hawa Mahal: the stepped honeycomb facade
  Jaipur: (
    <>
      <path d="M3 28h26" />
      <path d="M5 28V20l3-2v-3l3-2v-3l3-2V6h4v2l3 2v3l3 2v3l3 2v8" />
      <path d="M9 24h2M15 24h2M21 24h2M12 20h2M18 20h2M15 15h2M15 10.5h2" />
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
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {LANDMARKS[city] ?? (
        <path d="M16 28s-8-7.5-8-14a8 8 0 0 1 16 0c0 6.5-8 14-8 14ZM16 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      )}
    </svg>
  );
}
