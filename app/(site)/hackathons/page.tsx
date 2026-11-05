import type { Metadata } from "next";
import { HackathonsPage } from "@/components/hackathons/hackathons-page";
import type { Spotlight } from "@/components/hackathons/spotlight";
import { HACKATHONS, PAST_PARTNERSHIPS } from "@/data/hackathons";
import {
  HACKATHON_ROBOTS,
  eventWindow,
  formatShortDate,
  formatUsd,
  sortHackathons,
  statusOf,
  toCard,
} from "@/lib/hackathons";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { indiaMap } from "@/lib/india-map";
import { pageMetadata } from "@/lib/seo";

// Statuses and countdowns depend on today's date.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...pageMetadata({
      title: "Hackathons for Developer Tools",
      description:
        "Hackathons with devtool, AI, and open-source teams. Register, finish the pre-hack tasks, and build with the people who make the tools.",
      path: "/hackathons",
      locale: DEFAULT_LOCALE,
    }),
    robots: HACKATHON_ROBOTS,
  };
}

export default function HackathonsIndexPage() {
  const now = Date.now();
  const sorted = sortHackathons(HACKATHONS, now);
  const cards = sorted.map((hackathon) => toCard(hackathon, now));

  // Spotlight the live event, else the next one to start.
  const featured =
    sorted.find((hackathon) => statusOf(hackathon, now) === "live") ??
    sorted.find((hackathon) => statusOf(hackathon, now) === "upcoming");
  let spotlight: Spotlight | null = null;
  if (featured) {
    const { start, end } = eventWindow(featured);
    spotlight = {
      card: toCard(featured, now),
      teamSize: featured.teamSize,
      registerBy: formatShortDate(featured.registrationCloses),
      target: statusOf(featured, now) === "live" ? end : start,
      serverNow: now,
    };
  }
  const openPrizes = HACKATHONS.filter(
    (hackathon) => statusOf(hackathon, now) !== "past",
  ).reduce((total, hackathon) => total + hackathon.prizePoolUsd, 0);

  return (
    <HackathonsPage
      cards={cards}
      spotlight={spotlight}
      track={{
        partnerships: PAST_PARTNERSHIPS,
        // Pins are keyed by each partnership's position in the list.
        map: indiaMap(
          PAST_PARTNERSHIPS.map((item, index) => ({
            id: `${index}`,
            lat: item.lat,
            lng: item.lng,
          })),
        ),
      }}
      openPrizes={formatUsd(openPrizes, true)}
    />
  );
}
