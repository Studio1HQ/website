import type { StaticImageData } from "next/image";
import {
  Brightdata,
  Enteligence,
  EntelligenceFull,
  Ittybit,
  IttybitFull,
  Jozu,
  JozuFull,
  LiteLLM,
  LiteLLMFull,
  Memori,
  MemoriFull,
  Nebius,
  Permit,
  PermitFull,
  ScrapeGraph,
  Webcrumbs,
  WebcrumbsFull,
} from "@/constants/image";
import Corsair from "@/public/case-studies/corsair/corsair-logo.webp";
import Tensorlake from "@/public/case-studies/tensorlake/tensorlake-logo.webp";

export type ClientLogo = {
  /** Square mark, used in cards and fact strips. */
  icon: StaticImageData;
  /** Full wordmark, used in heroes and logo rows. Falls back to icon. */
  full?: StaticImageData;
};

/** Case-study slug → local client logo assets. */
export const clientLogos: Record<string, ClientLogo> = {
  brightdata: { icon: Brightdata },
  corsair: { icon: Corsair },
  "entelligence-ai": { icon: Enteligence, full: EntelligenceFull },
  ittybit: { icon: Ittybit, full: IttybitFull },
  jozu: { icon: Jozu, full: JozuFull },
  litellm: { icon: LiteLLM, full: LiteLLMFull },
  memori: { icon: Memori, full: MemoriFull },
  permit: { icon: Permit, full: PermitFull },
  scrapegraph: { icon: ScrapeGraph },
  tensorlake: { icon: Tensorlake },
  webcrumbs: { icon: Webcrumbs, full: WebcrumbsFull },
};

export function getClientLogo(slug: string): ClientLogo | null {
  return clientLogos[slug] ?? null;
}

/** Extra trusted brands shown on the case-studies logo wall (no case study yet). */
export const trustedClientMarks: {
  name: string;
  href: string;
  icon: StaticImageData;
}[] = [
  { name: "Nebius", href: "https://nebius.com/", icon: Nebius },
];
