import type { Metadata } from "next";
import Link from "next/link";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadEvents,
  loadExpenses,
  loadGuestCounts,
  loadHackathonCounts,
  loadSponsors,
  loadSponsorships,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  EXPENSE_CATEGORIES,
  formatEventDate,
  formatTotals,
  inCurrency,
  sumMoney,
  todayKey,
  type Expense,
  type Sponsorship,
} from "@/lib/internal/community/schema";
import {
  addMoney,
  costPerHead,
  eventStarts,
  moneyByEvent,
  moneyYear,
  one,
  subtractMoney,
  turnouts,
} from "@/lib/internal/community/stats";
import { Card, CardTitle, PageHeader } from "@/components/internal/ui";
import {
  ExpenseList,
  SponsorshipList,
} from "@/components/internal/community/lists";
import {
  DueDate,
  LinkTabs,
  LoadNotice,
  Meter,
  MigrationNotice,
  Muted,
  RowLink,
  Stat,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireCommunity(), searchParams]);
  const canEdit = staff.community === "manager";
  const [
    events,
    expenses,
    sponsorships,
    sponsors,
    guestCounts,
    hackathonCounts,
    refs,
    owners,
  ] = await Promise.all([
    loadEvents(),
    loadExpenses(),
    loadSponsorships(),
    loadSponsors(),
    loadGuestCounts(),
    loadHackathonCounts(),
    refOptions(["event", "sponsor"]),
    canEdit ? ownerChoices() : Promise.resolve([]),
  ]);
  const today = todayKey();

  const header = (
    <PageHeader
      eyebrow="Community"
      title="Budget"
      description="What events cost against their budgets, what's still to pay, and sponsorship money coming in."
    />
  );
  if (!events.ok || !expenses.ok || !sponsorships.ok) {
    const failed = [events, expenses, sponsorships].find(
      (result) => !result.ok,
    );
    return (
      <>
        {header}
        <MigrationNotice
          message={failed && !failed.ok ? failed.message : undefined}
        />
      </>
    );
  }

  const starts = eventStarts(events.rows);
  const yearOf = (line: Expense | Sponsorship) => moneyYear(line, starts);
  const years = [
    ...new Set([
      today.slice(0, 4),
      ...expenses.rows.map(yearOf),
      ...sponsorships.rows.map(yearOf),
    ]),
  ]
    .sort()
    .reverse();
  const year = years.includes(one(params.year) ?? "")
    ? one(params.year)!
    : one(params.year) === "all"
      ? "all"
      : today.slice(0, 4);
  const inYear = <T extends Expense | Sponsorship>(line: T) =>
    year === "all" || yearOf(line) === year;
  const costs = expenses.rows.filter(inYear);
  const deals = sponsorships.rows.filter(inYear);
  const periodEvents = events.rows.filter(
    (event) =>
      event.status !== "cancelled" &&
      (year === "all" || (event.starts_on ?? today).slice(0, 4) === year),
  );

  const byEvent = moneyByEvent(costs, deals);
  const turnout = turnouts(
    periodEvents,
    guestCounts.ok ? guestCounts.rows : [],
    hackathonCounts.ok ? hackathonCounts.rows : [],
    today,
  );
  const budgeted = sumMoney(
    periodEvents.map((event) => ({
      amount: event.budget,
      currency: event.currency,
    })),
  );
  const spent = sumMoney(
    costs.filter((line) => line.status === "to_pay" || line.status === "paid"),
  );
  const planned = sumMoney(costs.filter((line) => line.status === "planned"));
  const toPay = costs
    .filter((line) => line.status === "to_pay")
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
  const income = sumMoney(deals.filter((line) => line.status !== "cancelled"));
  const received = sumMoney(deals.filter((line) => line.status === "paid"));
  const toCollect = deals
    .filter((line) => line.status === "pledged" || line.status === "invoiced")
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
  const net = subtractMoney(income, spent);
  const sponsorNames = Object.fromEntries(
    (sponsors.ok ? sponsors.rows : []).map((sponsor) => [
      sponsor.id,
      sponsor.name,
    ]),
  );
  const eventNames = Object.fromEntries(
    events.rows.map((event) => [event.id, event.name]),
  );

  // Spend per category, in rupees for the bars.
  const categories = EXPENSE_CATEGORIES.map((category) => ({
    ...category,
    total: sumMoney(
      costs.filter(
        (line) =>
          line.category === category.value && line.status !== "cancelled",
      ),
    ),
  }))
    .filter((category) => Object.keys(category.total).length)
    .sort((a, b) => inCurrency(b.total) - inCurrency(a.total));
  const topCategory = Math.max(
    1,
    ...categories.map((category) => inCurrency(category.total)),
  );

  const eventRows = periodEvents
    .map((event) => ({
      event,
      money: byEvent.get(event.id),
      numbers: turnout.get(event.id)!,
    }))
    .filter(({ event, money }) => event.budget !== null || money)
    .sort((a, b) =>
      (b.event.starts_on ?? "9999").localeCompare(a.event.starts_on ?? "9999"),
    );
  const general = byEvent.get("general");

  return (
    <>
      {header}
      <LoadNotice
        show={incomplete(
          events,
          expenses,
          sponsorships,
          sponsors,
          guestCounts,
          hackathonCounts,
        )}
      />
      <LinkTabs
        active={year}
        items={[
          ...years.map((item) => ({
            key: item,
            label: item === today.slice(0, 4) ? `This year (${item})` : item,
            href: `/internal/community/budget?year=${item}`,
          })),
          {
            key: "all",
            label: "All time",
            href: "/internal/community/budget?year=all",
          },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Spent"
          value={formatTotals(spent)}
          note={`${formatTotals(budgeted)} budgeted · ${formatTotals(planned)} more planned`}
        />
        <Stat
          label="To pay"
          value={formatTotals(sumMoney(toPay))}
          note={`${toPay.length} ${toPay.length === 1 ? "bill" : "bills"} owed`}
          accent={toPay.length > 0}
        />
        <Stat
          label="Sponsorship"
          value={formatTotals(income)}
          note={`${formatTotals(received)} received`}
        />
        <Stat
          label="Net"
          value={formatTotals(net)}
          note={
            inCurrency(net) >= 0
              ? "Sponsorship covers the spend"
              : "Spend beyond sponsorship"
          }
        />
      </div>

      <Card className="mb-5">
        <CardTitle>Events</CardTitle>
        {eventRows.length || general ? (
          <Table
            head={
              <>
                <th>Event</th>
                <th>Budget</th>
                <th>Spent</th>
                <th className="w-40">Used, with plans</th>
                <th>Sponsorship</th>
                <th>Net</th>
                <th>Per attendee</th>
              </>
            }
          >
            {eventRows.map(({ event, money, numbers }) => {
              const used = inCurrency(
                addMoney(money?.spent ?? {}, money?.planned ?? {}),
                event.currency,
              );
              const perHead = money
                ? costPerHead(money.spent, numbers.attended, event.currency)
                : null;
              const eventNet = subtractMoney(
                money?.income ?? {},
                money?.spent ?? {},
              );
              return (
                <tr key={event.id} className={rowClass}>
                  <td className="max-w-[18rem]">
                    <RowLink
                      href={`/internal/community/events/${event.id}`}
                      sub={formatEventDate(
                        event.starts_on,
                        event.ends_on,
                        today,
                      )}
                    >
                      {event.name}
                    </RowLink>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {event.budget !== null ? (
                      formatTotals({ [event.currency]: event.budget })
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {formatTotals(money?.spent ?? {})}
                  </td>
                  <td>
                    {event.budget ? (
                      <span className="flex items-center gap-2">
                        <span className="w-20">
                          <Meter value={used} max={event.budget} />
                        </span>
                        <span
                          className={cn(
                            "text-[12px] tabular-nums",
                            used > event.budget
                              ? "text-rose-600 dark:text-rose-300"
                              : "text-[var(--i-muted)]",
                          )}
                        >
                          {Math.round((used / event.budget) * 100)}%
                        </span>
                      </span>
                    ) : (
                      <Muted>No budget</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {formatTotals(money?.income ?? {}, "—")}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap tabular-nums",
                      inCurrency(eventNet, event.currency) < 0 &&
                        "text-[var(--i-muted)]",
                    )}
                  >
                    {formatTotals(eventNet)}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {perHead ? (
                      formatTotals({ [event.currency]: perHead })
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                </tr>
              );
            })}
            {general ? (
              <tr className={rowClass}>
                <td>
                  <span className="font-medium">General</span>
                  <span className="block text-[12px] text-[var(--i-muted)]">
                    Not for one event
                  </span>
                </td>
                <td>
                  <Muted>—</Muted>
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatTotals(general.spent)}
                </td>
                <td>
                  <Muted>
                    {Object.keys(general.planned).length
                      ? `${formatTotals(general.planned)} planned`
                      : "—"}
                  </Muted>
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatTotals(general.income, "—")}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatTotals(subtractMoney(general.income, general.spent))}
                </td>
                <td>
                  <Muted>—</Muted>
                </td>
              </tr>
            ) : null}
          </Table>
        ) : (
          <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
            No budgets or costs {year === "all" ? "yet" : `in ${year}`}. Set a
            budget on an event and add its expenses to track them here.
          </p>
        )}
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle>To pay</CardTitle>
          {toPay.length ? (
            <ul className="divide-y divide-[var(--i-line)]">
              {toPay.slice(0, 8).map((line) => (
                <li
                  key={line.id}
                  className="flex items-center gap-3 px-5 py-2.5 text-[13px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{line.description}</span>
                    <span className="block truncate text-[12px] text-[var(--i-muted)]">
                      {[
                        line.vendor,
                        line.event_id ? eventNames[line.event_id] : "General",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block tabular-nums">
                      {formatTotals({ [line.currency]: line.amount ?? 0 })}
                    </span>
                    <DueDate day={line.due_on} today={today} quiet />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
              Nothing owed.
            </p>
          )}
        </Card>
        <Card>
          <CardTitle>To collect</CardTitle>
          {toCollect.length ? (
            <ul className="divide-y divide-[var(--i-line)]">
              {toCollect.slice(0, 8).map((line) => (
                <li key={line.id}>
                  <Link
                    href={`/internal/community/sponsors/${line.sponsor_id}`}
                    className="flex items-center gap-3 px-5 py-2.5 text-[13px] hover:bg-[var(--i-hover)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {sponsorNames[line.sponsor_id] ?? "Sponsor"}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--i-muted)]">
                        {[
                          line.status === "invoiced"
                            ? `Invoiced${line.invoice_ref ? ` ${line.invoice_ref}` : ""}`
                            : "Committed",
                          line.event_id ? eventNames[line.event_id] : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block tabular-nums">
                        {line.amount !== null
                          ? formatTotals({ [line.currency]: line.amount })
                          : "In kind"}
                      </span>
                      <DueDate day={line.due_on} today={today} quiet />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
              Nothing waiting to come in.
            </p>
          )}
        </Card>
        <Card>
          <CardTitle>Spend by category</CardTitle>
          {categories.length ? (
            <ul className="space-y-2.5 px-5 py-4">
              {categories.map((category) => (
                <li key={category.value} className="text-[13px]">
                  <span className="flex justify-between gap-3">
                    <span>{category.label}</span>
                    <span className="tabular-nums text-[var(--i-muted)]">
                      {formatTotals(category.total)}
                    </span>
                  </span>
                  <span className="mt-1 block">
                    <Meter
                      value={inCurrency(category.total)}
                      max={topCategory}
                      label={`${category.label}: ${formatTotals(category.total)}`}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
              No expenses yet.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ExpenseList
          expenses={costs}
          eventNames={eventNames}
          canEdit={canEdit}
          refs={refs}
          owners={owners}
          title={`All expenses (${costs.length})`}
        />
        <SponsorshipList
          sponsorships={deals}
          sponsorNames={sponsorNames}
          eventNames={eventNames}
          canEdit={canEdit}
          refs={refs}
          title={`All sponsorships (${deals.length})`}
        />
      </div>
    </>
  );
}
