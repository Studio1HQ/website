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
import { OverviewStat } from "@/components/internal/overview-stat";

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

  // One line under the number: what needs doing first, else the money.
  const flags = [
    followUps
      ? `${followUps} ${followUps === 1 ? "follow-up" : "follow-ups"} due`
      : null,
    late ? `${late} ${late === 1 ? "task" : "tasks"} late` : null,
    // A read that failed counts as nothing above; don't let it pass as zero.
    partial ? "some numbers didn't load" : null,
  ].filter(Boolean);
  const note = flags.length
    ? flags.join(" · ")
    : money && deals.ok
      ? `${formatTotals(sponsorship)} sponsorship in ${year}`
      : null;

  return (
    <OverviewStat
      area="community"
      href="/community"
      value={soon.length}
      unit={`${soon.length === 1 ? "event" : "events"} in 30 days`}
      note={note}
      flag={flags.length > 0}
    />
  );
}
