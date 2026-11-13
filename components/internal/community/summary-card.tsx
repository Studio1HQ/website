import Link from "next/link";
import { ArrowRight, UsersFour } from "@phosphor-icons/react/dist/ssr";
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
import { Card } from "@/components/internal/ui";

/**
 * Community at a glance for the main dashboard overview: events coming up,
 * follow-ups due, late tasks and this year's sponsorship. Loads its own
 * data; renders nothing until the community migration has run.
 */
export async function CommunitySummaryCard() {
  const [events, tasks, sponsors, partners, deals] = await Promise.all([
    loadEvents(),
    loadTasks(),
    loadSponsors(),
    loadPartners(),
    loadSponsorships(),
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
    deals.ok ? `${formatTotals(sponsorship)} sponsorship in ${year}` : null,
    // A read that failed counts as nothing above; don't let it pass as zero.
    partial ? "some numbers didn't load" : null,
  ].filter(Boolean);

  return (
    <Link href="/internal/community" className="group block">
      <Card className="flex h-full flex-col px-5 py-4 transition-colors group-hover:bg-[var(--i-hover)]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
            <UsersFour size={15} />
          </span>
          <h2 className="flex-1 text-[13px] font-medium">Community</h2>
          <ArrowRight
            size={13}
            className="text-[var(--i-faint)] group-hover:text-[var(--i-ink)]"
          />
        </div>
        <p className="mt-3 text-[22px] font-medium leading-none tabular-nums tracking-[-0.015em]">
          {soon.length}
          <span className="text-[14px] font-normal text-[var(--i-muted)]">
            {" "}
            {soon.length === 1 ? "event" : "events"} in 30 days
          </span>
        </p>
        <div className="mt-2 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
          {notes.join(" · ")}
        </div>
      </Card>
    </Link>
  );
}
