import Link from "next/link";
import { ArrowRight, UsersFour } from "@/components/internal/icons";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadEvents,
  loadPartners,
  loadSponsors,
  loadSponsorships,
  loadTasks,
} from "@/lib/internal/community/data";
import {
  addDays,
  formatTotals,
  sumMoney,
  todayKey,
} from "@/lib/internal/community/schema";
import {
  partnerFollowUpDue,
  phaseOf,
  sponsorFollowUpDue,
  sponsorshipsIn,
} from "@/lib/internal/community/stats";
import { seesMoney } from "@/lib/internal/community/visibility";
import { Card } from "@/components/internal/ui";
import { Facts } from "@/components/internal/facts";

/**
 * Community at a glance for the main dashboard overview: events coming up,
 * follow-ups due, late tasks and this year's sponsorship. Loads its own
 * data; renders nothing until the community migration has run. It checks
 * the session itself: an intern gets their own late tasks and no money.
 */
export async function CommunitySummaryCard() {
  const staff = await requireCommunity();
  const money = seesMoney(staff.community);
  const [events, tasks, sponsors, partners, deals] = await Promise.all([
    loadEvents(staff.community),
    loadTasks(staff),
    loadSponsors(staff.community),
    loadPartners(),
    loadSponsorships(staff.community),
  ]);
  if (!events.ok) return null;

  const today = todayKey();
  const year = today.slice(0, 4);
  const upcoming = events.rows.filter(
    (event) => phaseOf(event, today) === "upcoming",
  );
  const soon = upcoming.filter(
    (event) => event.starts_on && event.starts_on <= addDays(today, 30),
  );
  const followUps =
    (sponsors.ok ? sponsors.rows : []).filter((sponsor) =>
      sponsorFollowUpDue(sponsor, today),
    ).length +
    (partners.ok ? partners.rows : []).filter((partner) =>
      partnerFollowUpDue(partner, today),
    ).length;
  const late = (tasks.ok ? tasks.rows : []).filter(
    (task) => task.status !== "done" && task.due_on && task.due_on < today,
  ).length;
  const sponsorship = sumMoney(
    sponsorshipsIn(year, deals.ok ? deals.rows : [], events.rows),
  );
  const partial = incomplete(events, tasks, sponsors, partners, deals);

  const notes = [
    followUps
      ? `${followUps} ${followUps === 1 ? "follow-up" : "follow-ups"} due`
      : null,
    late ? `${late} ${late === 1 ? "task" : "tasks"} late` : null,
    money && deals.ok
      ? `${formatTotals(sponsorship)} sponsorship in ${year}`
      : null,
    // A read that failed counts as nothing above; don't let it pass as zero.
    partial ? "some numbers didn't load" : null,
  ].filter(Boolean);

  return (
    <Link href="/community" className="group block">
      <Card className="flex h-full flex-col px-5 py-4 transition-colors group-hover:bg-[var(--i-hover)]">
        <div className="flex items-center gap-2">
          <UsersFour size={15} className="shrink-0 text-[var(--i-muted)]" />
          <h2 className="flex-1 text-[14.5px] font-medium">Community</h2>
          <ArrowRight size={14} className="text-[var(--i-faint)] transition-colors group-hover:text-[var(--i-ink)]" />
        </div>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[28px] font-medium leading-none tracking-[-0.02em]">{soon.length}</span>
          <span className="text-[13.5px] text-[var(--i-muted)]">
            {soon.length === 1 ? "event" : "events"} in 30 days
          </span>
        </p>
        <Facts notes={notes} />
      </Card>
    </Link>
  );
}
