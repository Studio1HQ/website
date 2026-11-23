"use client";

import { DotArt } from "@/components/community/dot-art";

/*
 * Small flat drawings for the Impact numbers, in the hero figures' colours:
 * a calendar, a pin, three people and a laptop. They are drawn as SVG, then
 * printed in dots like the hero, and move away from the cursor the same way.
 */

const ORANGE = "#ef5a2c";
const BLUE = "#2451d6";
const PINK = "#f4a3c4";
const GREEN = "#17a55b";
const YELLOW = "#f6bf1d";

export type ImpactKind = "events" | "cities" | "meetups" | "hackathons";

const ART: Record<ImpactKind, string> = {
  events: `<rect x="10" y="16" width="60" height="54" rx="8" fill="${ORANGE}"/><path d="M10 30h60V24a8 8 0 0 0-8-8H18a8 8 0 0 0-8 8z" fill="#c9411b"/><rect x="24" y="9" width="7" height="15" rx="3.5" fill="${YELLOW}"/><rect x="49" y="9" width="7" height="15" rx="3.5" fill="${YELLOW}"/><path d="M27 50l9 9 18-19" fill="none" stroke="${PINK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
  cities: `<ellipse cx="40" cy="71" rx="20" ry="5" fill="${PINK}"/><path d="M40 70C28 55 18 44 18 31a22 22 0 0 1 44 0c0 13-10 24-22 39z" fill="${BLUE}"/><circle cx="40" cy="31" r="10" fill="${YELLOW}"/>`,
  meetups: `<circle cx="20" cy="30" r="8.5" fill="${GREEN}"/><path d="M6 68c0-15 6-25 14-25s14 10 14 25z" fill="${GREEN}"/><circle cx="60" cy="30" r="8.5" fill="${YELLOW}"/><path d="M46 68c0-15 6-25 14-25s14 10 14 25z" fill="${YELLOW}"/><circle cx="40" cy="23" r="11" fill="${PINK}"/><path d="M23 70c0-18 7-30 17-30s17 12 17 30z" fill="${PINK}"/>`,
  hackathons: `<rect x="13" y="13" width="54" height="40" rx="5" fill="${GREEN}"/><path d="M30 26l-7 7 7 7M50 26l7 7-7 7M44 23l-8 20" fill="none" stroke="#a7ea92" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 59h70l-6 10H11z" fill="${YELLOW}"/>`,
};

const src = (kind: ImpactKind) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="320" height="320">${ART[kind]}</svg>`,
  )}`;

export function ImpactArt({ kind, className }: { kind: ImpactKind; className?: string }) {
  return <DotArt src={src(kind)} alt="" ratio="1 / 1" pitch={2.6} radius={56} push={12} className={className} />;
}
