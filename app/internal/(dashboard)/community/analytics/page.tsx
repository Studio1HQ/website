import type { Metadata } from "next";
import Link from "next/link";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadEvents,
  loadExpenses,
  loadGuestCounts,
  loadHackathonCounts,
  loadMetrics,
  loadPartners,
  loadSponsors,
  loadSponsorships,
  peopleByMonth,
  peopleTotals,
  subscribersByMonth,
} from "@/lib/internal/community/data";
import {
  EVENT_KINDS,
  SPONSOR_STAGES,
  addDays,
  channelLabel,
  formatDay,
  formatEventDate,
  formatMonth,
  formatTotals,
  inCurrency,
  lastMonths,
  percent,
  sumMoney,
  todayKey,
} from "@/lib/internal/community/schema";
import {
  addMoney,
  costPerHead,
  moneyByEvent,
  one,
  phaseOf,
  turnouts,
} from "@/lib/internal/community/stats";
import { Card, CardTitle, PageHeader } from "@/components/internal/ui";
import {
  BarList,
  ColumnChart,
  Legend,
  Sparkline,
  TableView,
  type Point,
} from "@/components/internal/community/charts";
import { GrowthForm } from "@/components/internal/community/growth-form";
import {
  LoadNotice,
  MigrationNotice,
  Muted,
  Stat,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Community analytics" };

const RANGES = [
  { key: "6", label: "6 months" },
  { key: "12", label: "12 months" },
  { key: "24", label: "24 months" },
] as const;

function Delta({
  now,
  before,
  label,
}: {
  now: number;
  before: number | undefined;
  label: string;
}) {
  if (before === undefined)
    return <span className="text-[var(--i-faint)]">First number</span>;
  const diff = now - before;
  const share = before > 0 ? diff / before : null;
  return (
    <span
      className={cn(
        "tabular-nums",
        diff > 0 && "text-emerald-700 dark:text-emerald-300",
        diff < 0 && "text-rose-700 dark:text-rose-300",
        diff === 0 && "text-[var(--i-muted)]",
      )}
    >
      {diff > 0 ? "▲" : diff < 0 ? "▼" : "–"}{" "}
      {Math.abs(diff).toLocaleString("en-IN")}
      {share !== null && diff !== 0
        ? ` (${Math.abs(Math.round(share * 1000) / 10)}%)`
        : ""}
      <span className="text-[var(--i-muted)]"> {label}</span>
    </span>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireCommunity(), searchParams]);
  const canEdit = staff.community === "manager";
  const [
    events,
    guestCounts,
    hackathonCounts,
    metrics,
    people,
    newPeople,
    subscribers,
    sponsors,
    sponsorships,
    expenses,
    partners,
  ] = await Promise.all([
    loadEvents(),
    loadGuestCounts(),
    loadHackathonCounts(),
    loadMetrics(),
    peopleTotals(),
    peopleByMonth(),
    subscribersByMonth(),
    loadSponsors(),
    loadSponsorships(),
    loadExpenses(),
    loadPartners(),
  ]);

  const today = todayKey();
  const range =
    RANGES.find((item) => item.key === one(params.range))?.key ?? "12";
  const months = lastMonths(Number(range), today);
  const from = `${months[0]}-01`;

  const header = (
    <PageHeader
      eyebrow="Community"
      title="Analytics"
      description="How the community is growing, how events perform, and where the money and partners come from."
      actions={
        canEdit && metrics.ok ? (
          <GrowthForm
            channels={[...new Set(metrics.rows.map((row) => row.channel))]}
            latest={Object.fromEntries(
              metrics.rows.map((row) => [row.channel, row.value]),
            )}
          />
        ) : null
      }
    />
  );
  if (!events.ok) {
    return (
      <>
        {header}
        <MigrationNotice message={events.message} />
      </>
    );
  }

  const turnout = turnouts(
    events.rows,
    guestCounts.ok ? guestCounts.rows : [],
    hackathonCounts.ok ? hackathonCounts.rows : [],
    today,
  );
  const past = events.rows.filter(
    (event) =>
      phaseOf(event, today) === "past" &&
      event.starts_on &&
      event.starts_on >= from,
  );
  const money = moneyByEvent(
    expenses.ok ? expenses.rows : [],
    sponsorships.ok ? sponsorships.rows : [],
  );

  // Turnout per month.
  const monthly = months.map((month) => {
    const inMonth = past.filter((event) => event.starts_on!.startsWith(month));
    return {
      key: month,
      label: formatMonth(month),
      values: [
        inMonth.reduce(
          (sum, event) => sum + turnout.get(event.id)!.signedUp,
          0,
        ),
        inMonth.reduce(
          (sum, event) => sum + turnout.get(event.id)!.attended,
          0,
        ),
      ],
      events: inMonth.length,
    };
  });
  const signedUp = monthly.reduce((sum, month) => sum + month.values[0], 0);
  const attended = monthly.reduce((sum, month) => sum + month.values[1], 0);
  const showUps = past
    .map((event) => turnout.get(event.id)!.showUp)
    .filter((value): value is number => value !== null);
  const averageShowUp = showUps.length
    ? showUps.reduce((sum, value) => sum + value, 0) / showUps.length
    : null;
  const spentInRange = addMoney(
    ...past.map((event) => money.get(event.id)?.spent ?? {}),
  );
  const perHead = costPerHead(spentInRange, attended);

  // New people per month, and running totals.
  const newByMonth = new Map((newPeople ?? []).map((row) => [row.month, row]));
  const reachGroups = months.map((month) => ({
    key: month,
    label: formatMonth(month),
    values: [newByMonth.get(month)?.people ?? 0],
  }));
  const newInRange = reachGroups.reduce(
    (sum, group) => sum + group.values[0],
    0,
  );

  // Growth: each channel's numbers, plus email subscribers counted from the forms.
  const channels = new Map<string, { recorded_on: string; value: number }[]>();
  for (const row of metrics.ok ? metrics.rows : []) {
    channels.set(row.channel, [...(channels.get(row.channel) ?? []), row]);
  }
  const subscriberCounts = subscribers ?? {};
  const subscriberMonths = Object.keys(subscriberCounts).sort();
  let runningSubscribers = 0;
  const subscriberTotals = new Map<string, number>();
  for (const month of subscriberMonths) {
    runningSubscribers += subscriberCounts[month];
    subscriberTotals.set(month, runningSubscribers);
  }
  const subscribersAt = (month: string) => {
    let total = 0;
    for (const key of subscriberMonths)
      if (key <= month) total = subscriberTotals.get(key)!;
    return total;
  };
  const monthAgo = addDays(today, -30);
  const growth: {
    key: string;
    label: string;
    points: Point[];
    now: number;
    before: number | undefined;
    since: string;
    note: string;
  }[] = [];
  for (const [channel, rows] of channels) {
    const inRange = rows.filter((row) => row.recorded_on >= from);
    const shown = inRange.length ? inRange : rows.slice(-1);
    const latest = rows[rows.length - 1];
    const earlier = [...rows]
      .reverse()
      .find((row) => row.recorded_on <= monthAgo);
    growth.push({
      key: channel,
      label: channelLabel(channel),
      points: shown.map((row) => ({
        label: formatDay(row.recorded_on, today),
        value: row.value,
      })),
      now: latest.value,
      before: earlier?.value,
      since: "in 30 days",
      note: `as of ${formatDay(latest.recorded_on, today)}`,
    });
  }
  if (runningSubscribers > 0) {
    growth.push({
      key: "email_subscribers",
      label: "Email subscribers",
      points: months.map((month) => ({
        label: formatMonth(month),
        value: subscribersAt(month),
      })),
      now: runningSubscribers,
      before: subscribersAt(lastMonths(2, today)[0]),
      since: "this month",
      note: "opted in on the site's forms",
    });
  }
  growth.sort((a, b) => b.now - a.now);

  // Sponsors by stage, in pipeline order.
  const sponsorRows = sponsors.ok ? sponsors.rows : [];
  // What the won sponsors have committed, as on the Sponsors page.
  const wonIds = new Set(
    sponsorRows
      .filter((sponsor) => sponsor.stage === "won")
      .map((sponsor) => sponsor.id),
  );
  const dealRows = (sponsorships.ok ? sponsorships.rows : []).filter(
    (deal) => deal.status !== "cancelled" && wonIds.has(deal.sponsor_id),
  );
  const funnel = SPONSOR_STAGES.map((stage) => {
    const inStage = sponsorRows.filter(
      (sponsor) => sponsor.stage === stage.value,
    );
    return {
      stage,
      count: inStage.length,
      ask: sumMoney(
        inStage.map((sponsor) => ({
          amount: sponsor.ask_amount,
          currency: sponsor.currency,
        })),
      ),
    };
  }).filter((row) => row.count > 0);
  const won = sponsorRows.filter((sponsor) => sponsor.stage === "won").length;
  const decided =
    won + sponsorRows.filter((sponsor) => sponsor.stage === "lost").length;

  // Event types and hosts, by attendance in the range.
  const byKind = EVENT_KINDS.map((kind) => {
    const list = past.filter((event) => event.kind === kind.value);
    return {
      kind,
      count: list.length,
      attended: list.reduce(
        (sum, event) => sum + turnout.get(event.id)!.attended,
        0,
      ),
    };
  })
    .filter((row) => row.count)
    .sort((a, b) => b.attended - a.attended || b.count - a.count);
  const partnerNames = new Map(
    (partners.ok ? partners.rows : []).map((partner) => [
      partner.id,
      partner.name,
    ]),
  );
  const hosts = new Map<string, { events: number; attended: number }>();
  for (const event of past) {
    if (!event.partner_id) continue;
    const current = hosts.get(event.partner_id) ?? { events: 0, attended: 0 };
    current.events++;
    current.attended += turnout.get(event.id)!.attended;
    hosts.set(event.partner_id, current);
  }
  const topHosts = [...hosts.entries()]
    .sort((a, b) => b[1].attended - a[1].attended || b[1].events - a[1].events)
    .slice(0, 8);

  const performance = [...past].sort((a, b) =>
    b.starts_on!.localeCompare(a.starts_on!),
  );

  return (
    <>
      {header}
      <LoadNotice
        show={
          people === null ||
          newPeople === null ||
          subscribers === null ||
          incomplete(
            events,
            guestCounts,
            hackathonCounts,
            metrics,
            sponsors,
            sponsorships,
            expenses,
            partners,
          )
        }
      />
      <nav aria-label="Time range" className="mb-5 flex gap-1">
        {RANGES.map((item) => (
          <Link
            key={item.key}
            href={`/internal/community/analytics${item.key === "12" ? "" : `?range=${item.key}`}`}
            aria-current={range === item.key ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-lg px-3 text-[13px]",
              range === item.key
                ? "bg-[var(--i-panel)] font-medium shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
                : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
            )}
          >
            Last {item.label}
          </Link>
        ))}
      </nav>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="People reached"
          value={people ? people.people.toLocaleString("en-IN") : "—"}
          note="All time, unique emails"
        />
        <Stat
          label="Repeat sign-ups"
          value={
            people && people.people
              ? percent(people.returning / people.people)
              : "—"
          }
          note={
            people
              ? `${people.returning.toLocaleString("en-IN")} signed up for 2+ events`
              : undefined
          }
        />
        <Stat
          label="Events run"
          value={past.length}
          note={`${attended.toLocaleString("en-IN")} attended`}
        />
        <Stat
          label="Average show-up"
          value={percent(averageShowUp)}
          note={`${signedUp.toLocaleString("en-IN")} signed up`}
        />
        <Stat
          label="Cost per attendee"
          value={perHead ? formatTotals({ INR: perHead }) : "—"}
          note={`${formatTotals(spentInRange)} spent`}
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle
            action={
              <Legend
                items={[
                  { label: "Signed up", tone: "context" },
                  { label: "Attended", tone: "accent" },
                ]}
              />
            }
          >
            Turnout by month
          </CardTitle>
          <div className="px-5 py-4">
            <ColumnChart groups={monthly} series={["Signed up", "Attended"]} />
            <TableView
              head={["Month", "Events", "Signed up", "Attended"]}
              rows={monthly.map((month) => [
                month.label,
                month.events,
                month.values[0],
                month.values[1],
              ])}
            />
          </div>
        </Card>
        <Card>
          <CardTitle
            action={
              <span className="text-[12.5px] text-[var(--i-muted)]">
                {newInRange.toLocaleString("en-IN")} in {range} months
              </span>
            }
          >
            New people each month
          </CardTitle>
          <div className="px-5 py-4">
            <ColumnChart groups={reachGroups} series={["New people"]} />
            <TableView
              head={["Month", "New people", "Signed up again later"]}
              rows={months.map((month) => [
                formatMonth(month),
                newByMonth.get(month)?.people ?? 0,
                newByMonth.get(month)?.came_back ?? 0,
              ])}
            />
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <CardTitle>Community growth</CardTitle>
        {growth.length ? (
          <div className="grid overflow-hidden rounded-b-xl sm:grid-cols-2 lg:grid-cols-3">
            {growth.map((channel) => (
              <div
                key={channel.key}
                className="-mb-px -mr-px border-b border-r border-[var(--i-line)] px-5 py-4"
              >
                <p className="text-[12.5px] text-[var(--i-muted)]">
                  {channel.label}
                </p>
                <p className="mt-1 text-[24px] font-medium leading-none tracking-[-0.02em]">
                  {channel.now.toLocaleString("en-IN")}
                </p>
                <p className="mt-1.5 text-[12px]">
                  <Delta
                    now={channel.now}
                    before={channel.before}
                    label={channel.since}
                  />
                </p>
                <div className="mt-3">
                  <Sparkline points={channel.points} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-[var(--i-faint)]">
                  {channel.note}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            {canEdit
              ? "Log your Discord, X, LinkedIn and other numbers once a week with “Log numbers” and the growth shows up here."
              : "No growth numbers logged yet."}
          </p>
        )}
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle
            action={
              decided ? (
                <span className="text-[12.5px] text-[var(--i-muted)]">
                  {percent(won / decided)} won
                </span>
              ) : null
            }
          >
            Sponsor pipeline
          </CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty="No sponsors yet."
              rows={funnel.map(({ stage, count, ask }) => ({
                key: stage.value,
                label: stage.label,
                value: count,
                figure: count,
                note:
                  stage.value === "won"
                    ? formatTotals(sumMoney(dealRows))
                    : formatTotals(ask, ""),
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Attendance by event type</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty="No past events in this range."
              rows={byKind.map((row) => ({
                key: row.kind.value,
                label: row.kind.label,
                value: row.attended,
                figure: row.attended.toLocaleString("en-IN"),
                note: `${row.count} ${row.count === 1 ? "event" : "events"}`,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Top hosts</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty="Pick a host college, club or venue on events to see who brings people in."
              rows={topHosts.map(([id, row]) => ({
                key: id,
                label: (
                  <Link
                    href={`/internal/community/campus/${id}`}
                    className="hover:text-[var(--i-accent-text)]"
                  >
                    {partnerNames.get(id) ?? "Partner"}
                  </Link>
                ),
                value: row.attended,
                figure: row.attended.toLocaleString("en-IN"),
                note: `${row.events} ${row.events === 1 ? "event" : "events"}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Event performance</CardTitle>
        {performance.length ? (
          <Table
            head={
              <>
                <th>Event</th>
                <th className="text-right">Signed up</th>
                <th className="text-right">Attended</th>
                <th className="text-right">Show-up</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Per attendee</th>
                <th className="text-right">Sponsorship</th>
              </>
            }
          >
            {performance.map((event) => {
              const numbers = turnout.get(event.id)!;
              const eventMoney = money.get(event.id);
              const head = eventMoney
                ? costPerHead(
                    eventMoney.spent,
                    numbers.attended,
                    event.currency,
                  )
                : null;
              return (
                <tr key={event.id} className={rowClass}>
                  <td className="max-w-[20rem]">
                    <Link
                      href={`/internal/community/events/${event.id}`}
                      className="block truncate font-medium hover:text-[var(--i-accent-text)]"
                    >
                      {event.name}
                    </Link>
                    <span className="block text-[12px] text-[var(--i-muted)]">
                      {formatEventDate(event.starts_on, event.ends_on, today)}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">
                    {numbers.source === "none" ? (
                      <Muted>—</Muted>
                    ) : (
                      numbers.signedUp.toLocaleString("en-IN")
                    )}
                  </td>
                  <td className="text-right tabular-nums">
                    {numbers.attended ? (
                      numbers.attended.toLocaleString("en-IN")
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="text-right tabular-nums">
                    {percent(numbers.showUp)}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {formatTotals(eventMoney?.spent ?? {}, "—")}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {head ? (
                      formatTotals({ [event.currency]: head })
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {formatTotals(eventMoney?.income ?? {}, "—")}
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            No events finished in the last {range} months.
          </p>
        )}
      </Card>
      {inCurrency(spentInRange) !==
      Object.values(spentInRange).reduce((sum, value) => sum + value, 0) ? (
        <p className="mt-3 text-[12px] text-[var(--i-faint)]">
          Cost per attendee counts rupee spend only.
        </p>
      ) : null}
    </>
  );
}
