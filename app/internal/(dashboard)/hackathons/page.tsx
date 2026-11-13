import type { Metadata } from "next";
import { hackathonBreakdown } from "@/lib/internal/data";
import { loadEvents } from "@/lib/internal/community/data";
import { SECTIONS, parseFilters } from "@/lib/internal/sections";
import { requireSection } from "@/lib/internal/session";
import { HackathonTabs } from "@/components/internal/hackathon-tabs";
import { SectionListPage } from "@/components/internal/section-views";

export const metadata: Metadata = { title: SECTIONS["hackathons"].title };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Every hackathon registration, with a tab per hackathon above the list. */
export default async function HackathonsPage({ searchParams }: Props) {
  const section = SECTIONS.hackathons;
  // The session first: nothing is read for someone who can't open this.
  await requireSection(section);
  const [breakdown, events, params] = await Promise.all([hackathonBreakdown(), loadEvents(), searchParams]);
  const filters = parseFilters(section, params);
  // Community events that collect this hackathon's site registrations.
  const eventPages: Record<string, string> = {};
  for (const event of events.ok ? events.rows : []) {
    if (event.hackathon_slug && !eventPages[event.hackathon_slug]) eventPages[event.hackathon_slug] = event.id;
  }
  return (
    <SectionListPage
      sectionKey="hackathons"
      searchParams={searchParams}
      before={
        breakdown.ok ? (
          <HackathonTabs events={breakdown.events} selected={filters.facets.event ?? []} eventPages={eventPages} />
        ) : null
      }
    />
  );
}
