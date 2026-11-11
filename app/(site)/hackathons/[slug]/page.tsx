import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  HackathonDetailPage,
  type HackathonView,
} from "@/components/hackathons/hackathon-detail-page";
import { HACKATHONS, WINNERS_MILESTONE, getHackathon } from "@/data/hackathons";
import {
  HACKATHON_ROBOTS,
  eventWindow,
  formatDate,
  formatDateRange,
  formatShortDate,
  formatUsd,
  isRegistrationOpen,
  itineraryPosition,
  milestoneState,
  sortHackathons,
  statusOf,
  toCard,
} from "@/lib/hackathons";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
// Statuses, countdowns, and the open/closed form depend on today's date.
export const revalidate = 3600;

export function generateStaticParams() {
  return HACKATHONS.map((hackathon) => ({ slug: hackathon.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = getHackathon(slug);
  if (!hackathon) return { title: "Not found" };

  return {
    ...pageMetadata({
      title: `${hackathon.name} Hackathon`,
      description: `${hackathon.tagline} ${hackathon.summary}. ${formatDateRange(
        hackathon.startDate,
        hackathon.endDate,
      )}, ${hackathon.location}.`,
      path: `/hackathons/${hackathon.slug}`,
      locale: DEFAULT_LOCALE,
    }),
    robots: HACKATHON_ROBOTS,
  };
}

export default async function HackathonPage({ params }: Props) {
  const { slug } = await params;
  const hackathon = getHackathon(slug);
  if (!hackathon) notFound();

  const now = Date.now();
  const winners = hackathon.timeline.find(
    (milestone) => milestone.label === WINNERS_MILESTONE,
  );
  const status = statusOf(hackathon, now);
  const { start, end } = eventWindow(hackathon);
  const view: HackathonView = {
    status,
    registrationOpen: isRegistrationOpen(hackathon, now),
    dateRange: formatDateRange(hackathon.startDate, hackathon.endDate),
    prizePool: formatUsd(hackathon.prizePoolUsd),
    registrationCloses: formatDate(hackathon.registrationCloses),
    registrationClosesShort: formatShortDate(hackathon.registrationCloses),
    endDate: formatDate(hackathon.endDate),
    winners: winners
      ? {
          date: formatDate(winners.date),
          done: milestoneState(winners.date, now) === "done",
        }
      : null,
    milestones: hackathon.timeline.map((milestone) =>
      milestoneState(milestone.date, now),
    ),
    // The hero clock counts to kickoff, then to the submission deadline.
    clock: {
      mode:
        status === "upcoming" ? "starts" : status === "live" ? "ends" : "ended",
      target: status === "upcoming" ? start : end,
      start,
      end,
      serverNow: now,
    },
    itinerary: {
      ...itineraryPosition(
        hackathon.timeline.map((milestone) => milestone.date),
        now,
      ),
      today: formatShortDate(now),
    },
  };

  // Other events, live and upcoming first.
  const more = sortHackathons(
    HACKATHONS.filter((other) => other.slug !== hackathon.slug),
    now,
  )
    .slice(0, 4)
    .map((other) => toCard(other, now));

  return <HackathonDetailPage hackathon={hackathon} view={view} more={more} />;
}
