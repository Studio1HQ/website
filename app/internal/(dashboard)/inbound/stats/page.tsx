import type { Metadata } from "next";
import { Card, CardTitle, Notice, PageHeader } from "@/components/internal/ui";
import { Stat } from "@/components/internal/community/ui";
import { ColumnChart, Legend } from "@/components/internal/community/charts";
import { StatsStages } from "@/components/internal/inbound/stats-stages";
import { requireInbound } from "@/lib/internal/inbound/access";
import { INBOUND_MIGRATION_HINT } from "@/lib/internal/inbound/schema";
import { loadInboundStats } from "@/lib/internal/inbound/stats";
import { percent, spanLabel } from "@/lib/internal/inbound/stats-math";

export const metadata: Metadata = { title: "Inbound stats" };

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Inbound in a few numbers. Spend per lead isn't recorded anywhere yet, so it isn't here. */
export default async function InboundStatsPage() {
  await requireInbound();
  const load = await loadInboundStats();
  const header = (
    <PageHeader
      title="Inbound stats"
      description="How many leads come in, how fast the agent gets a brief ready, and how the sorter is doing."
    />
  );
  if (!load.ok)
    return (
      <>
        {header}
        <Notice tone="error">
          {load.missing ? INBOUND_MIGRATION_HINT : load.message}
        </Notice>
      </>
    );
  const stats = load.value;
  const lastEight = stats.weeks.reduce((sum, w) => sum + w.call + w.mail, 0);
  const share = percent(stats.mailCorrected, stats.mailSorted);

  return (
    <>
      {header}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Time to a first brief"
            value={stats.medianMs === null ? "—" : spanLabel(stats.medianMs)}
            note={
              stats.medianMs === null
                ? "No lead has a finished brief yet"
                : `Middle value over ${plural(stats.timedLeads, "lead")}`
            }
          />
          <Stat
            label="Mail a person corrected"
            value={share === null ? "—" : `${share}%`}
            note={`${stats.mailCorrected} of ${stats.mailSorted} sorted in the last ${stats.mailKeepDays} days`}
          />
          <Stat
            label="Agent runs this month"
            value={stats.month.run}
            accent={stats.month.failed > 0}
            note={`${stats.month.failed} failed`}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardTitle
              action={
                <Legend
                  items={[
                    { label: "Call", tone: "context" },
                    { label: "Mail", tone: "accent" },
                  ]}
                />
              }
            >
              Leads per week
            </CardTitle>
            <div className="px-5 pb-4 pt-2">
              <ColumnChart
                series={["Call", "Mail"]}
                height={150}
                groups={stats.weeks.map((week) => ({
                  key: week.week,
                  label: day.format(new Date(`${week.week}T00:00:00Z`)),
                  values: [week.call, week.mail],
                }))}
              />
              <p className="mt-2 text-[12.5px] text-[var(--i-muted)]">
                {plural(lastEight, "new lead")} in the last 8 weeks. Weeks start
                on Monday.
              </p>
            </div>
          </Card>
          <Card>
            <CardTitle>Where leads are</CardTitle>
            <div className="px-5 pb-4 pt-1">
              <StatsStages stages={stats.stages} />
              <p className="mt-2 text-[12.5px] text-[var(--i-muted)]">
                &ldquo;Reached it&rdquo; counts leads now at that stage or
                later; lost leads aren&rsquo;t counted as having got further.
                {stats.truncated
                  ? " Only the newest 5,000 leads are counted."
                  : ""}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
