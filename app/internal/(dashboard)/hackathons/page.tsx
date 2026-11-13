import type { Metadata } from "next";
import { hackathonBreakdown, hackathonEmailPlan } from "@/lib/internal/data";
import { loadEvents } from "@/lib/internal/community/data";
import { todayKey } from "@/lib/internal/community/schema";
import { senderName } from "@/lib/internal/email-templates";
import { SECTIONS, parseFilters } from "@/lib/internal/sections";
import { requireSection } from "@/lib/internal/session";
import { isMailerConfigured } from "@/lib/mailer";
import { HackathonEmailPlan } from "@/components/internal/hackathon-email-plan";
import { HackathonTabs } from "@/components/internal/hackathon-tabs";
import { SectionListPage } from "@/components/internal/section-views";
import { Notice } from "@/components/internal/ui";

export const metadata: Metadata = { title: SECTIONS["hackathons"].title };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Every hackathon registration, with a tab per hackathon above the list.
 * A hackathon's tab also shows its email plan.
 */
export default async function HackathonsPage({ searchParams }: Props) {
  const section = SECTIONS.hackathons;
  // The session first: nothing is read for someone who can't open this.
  const staff = await requireSection(section);
  const params = await searchParams;
  const filters = parseFilters(section, params);
  const selected = filters.facets.event ?? [];
  const slug = selected.length === 1 ? selected[0] : null;
  const [breakdown, events, plan] = await Promise.all([
    hackathonBreakdown(),
    loadEvents(),
    slug ? hackathonEmailPlan(slug) : Promise.resolve(null),
  ]);
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
        <>
          {breakdown.ok ? (
            <HackathonTabs events={breakdown.events} selected={selected} eventPages={eventPages} />
          ) : null}
          {plan && !plan.ok ? (
            <div className="mb-5">
              <Notice tone="error">{plan.message}</Notice>
            </div>
          ) : plan?.ok ? (
            <div className="mb-5">
              <HackathonEmailPlan
                steps={plan.steps}
                today={todayKey()}
                canEdit={staff.access === "edit"}
                sender={senderName(staff.email)}
                mailerReady={isMailerConfigured()}
              />
            </div>
          ) : null}
        </>
      }
    />
  );
}
