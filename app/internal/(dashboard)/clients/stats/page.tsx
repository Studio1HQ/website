import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "@/components/internal/icons";
import { requireClients } from "@/lib/internal/session";
import { loadPortfolio } from "@/lib/internal/clients/portfolio-data";
import {
  addCounts,
  companyTotals,
  doneOfPlanned,
  headline,
  monthRange,
  perMonth,
  projectRows,
} from "@/lib/internal/clients/portfolio";
import { CLIENT_STATUSES, clientPath, monthLabel, percentOf, plural, thisMonth, todayKey } from "@/lib/internal/clients/schema";
import { Card, CardTitle, EmptyState, Notice, PageHeader } from "@/components/internal/ui";
import { Stat } from "@/components/internal/community/ui";
import { ColumnChart, Legend, TableView } from "@/components/internal/community/charts";
import { ClientsLoadNotice, ClientsMigrationNotice, OptionBadge } from "@/components/internal/clients/ui";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { PiecesBar, PiecesLegend } from "@/components/internal/clients/portfolio";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Client stats" };

const counts = new Intl.NumberFormat("en-US");

/** A number with a thin bar under it, against the column's biggest. */
function BarCell({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="tabular-nums">{value ? label : <span className="text-[var(--i-faint)]">—</span>}</span>
      <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <span className="block h-full rounded-full bg-[var(--i-accent)]" style={{ width: max ? `${(value / max) * 100}%` : 0 }} />
      </span>
    </span>
  );
}

/**
 * Every company together: the company page's four numbers added up, how
 * much of each month's plan went live, where all the pieces are, and each
 * company's share.
 */
export default async function ClientStatsPage() {
  const staff = await requireClients();
  const data = await loadPortfolio(staff.clientScope);
  const today = todayKey();
  const current = thisMonth();

  const header = (
    <PageHeader title="Stats" description="All companies together: what went live, its reach, and where the rest of the work is." />
  );

  if (!data.ok) {
    return (
      <>
        {header}
        {data.missing ? <ClientsMigrationNotice message={data.message} /> : <Notice tone="error">{data.message}</Notice>}
      </>
    );
  }

  const rows = projectRows({ ...data, today });
  if (!rows.length) {
    return (
      <>
        {header}
        <ClientsLoadNotice show={data.truncated} />
        <Card>
          <EmptyState icon={<Briefcase size={20} />} title="Nothing to add up yet">
            Numbers show up once a{" "}
            <Link href="/clients" className="underline underline-offset-[3px]">
              company
            </Link>{" "}
            has a project with pieces in it.
          </EmptyState>
        </Card>
      </>
    );
  }

  const numbers = headline(data.deliverables, data.cycles, today);
  const months = monthRange(numbers.firstMonth, current, 6);
  const series = perMonth(rows, months);
  const companies = companyTotals(rows);
  const total = addCounts(rows.map((row) => row.counts));
  const thisMonthRows = rows.filter((row) => row.cycle.month === current);
  const now = doneOfPlanned(thisMonthRows);
  const open = data.clients.filter((client) => !client.archived_at);
  const statusLine = CLIENT_STATUSES.map((option) => ({ label: option.label, count: open.filter((client) => client.status === option.value).length }))
    .filter((item) => item.count)
    .map((item) => `${item.count} ${item.label.toLowerCase()}`)
    .join(" · ");
  const maxLive = Math.max(0, ...companies.map((row) => row.counts.live));
  const maxReach = Math.max(0, ...companies.map((row) => row.views));

  return (
    <>
      {header}
      <ClientsLoadNotice show={data.truncated} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live so far" value={numbers.live} note={numbers.firstMonth ? `since ${monthLabel(numbers.firstMonth, true)}` : undefined} />
        <Stat
          label="Reach"
          value={numbers.reach ? counts.format(numbers.reach) : "—"}
          note={numbers.reach ? `views on ${plural(numbers.withViews, "piece")}` : "No views logged yet"}
        />
        <Stat
          label="With the client"
          value={numbers.withClient}
          accent={numbers.overdue > 0}
          note={numbers.overdue ? `${numbers.overdue} past their reply date` : "for approval"}
        />
        <Stat
          label="In the works"
          value={numbers.working + numbers.approved}
          note={numbers.approved ? `${numbers.approved} ready to go live` : "not live yet"}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle action={<Legend items={[{ label: "Planned", tone: "context" }, { label: "Live", tone: "accent" }]} />}>
            Planned and live, by month
          </CardTitle>
          <div className="px-5 pb-4 pt-3">
            <ColumnChart
              series={["Planned", "Live"]}
              groups={series.map((item) => ({ key: item.month, label: monthLabel(item.month), values: [item.planned, item.live] }))}
            />
            <TableView
              head={["Month", "Projects", "Planned", "Live", "Views"]}
              rows={series.map((item) => [monthLabel(item.month), item.projects, item.planned, item.live, item.views])}
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Where the pieces are</CardTitle>
          <div className="space-y-4 px-5 pb-5 pt-3">
            <div>
              <PiecesBar counts={total} className="h-3" />
              <PiecesLegend counts={total} className="mt-3" />
            </div>
            <dl className="space-y-2.5 border-t border-[var(--i-line)] pt-4 text-[13px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[var(--i-muted)]">{monthLabel(current)}</dt>
                <dd className="text-right tabular-nums">
                  {thisMonthRows.length ? (
                    <>
                      <span className="font-medium">{now.done}</span>
                      <span className="text-[var(--i-muted)]">
                        {" "}
                        of {now.planned} live · {plural(thisMonthRows.length, "project")}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--i-faint)]">No projects yet</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[var(--i-muted)]">Companies</dt>
                <dd className="text-right">{statusLine || "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[var(--i-muted)]">Projects so far</dt>
                <dd className="text-right tabular-nums">{rows.length}</dd>
              </div>
            </dl>
            <Link href="/clients/projects" className="inline-block text-[12.5px] text-[var(--i-muted)] underline underline-offset-[3px] hover:text-[var(--i-ink)]">
              See every project
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>By company</CardTitle>
        <ul className="divide-y divide-[var(--i-line)] lg:hidden">
          {companies.map((row) => (
            <li key={row.client.id} className="space-y-1.5 px-4 py-2.5">
              <Link href={clientPath(row.client.slug)} className="flex items-center gap-2.5">
                <ClientLogo slug={row.client.slug} name={row.client.name} website={row.client.website} size={20} />
                <span className="min-w-0 flex-1 truncate font-medium">{row.client.name}</span>
                <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                  {row.counts.live} live{row.views ? ` · ${counts.format(row.views)} views` : ""}
                </span>
              </Link>
              <PiecesBar counts={row.counts} />
            </li>
          ))}
        </ul>
        <div className="hidden lg:block">
          <table className="w-full table-fixed border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:px-3 [&>th]:py-2 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
                <th scope="col" className="w-[24%]">Company</th>
                <th scope="col" className="w-[9%]">Projects</th>
                <th scope="col" className="w-[23%]">Pieces</th>
                <th scope="col" className="w-[12%]">Live</th>
                <th scope="col" className="w-[14%]">Reach</th>
                <th scope="col" className="w-[18%]">Newest month</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-3 [&>tr>td]:py-2 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
              {companies.map((row) => (
                <tr key={row.client.id} className="transition-colors hover:bg-[var(--i-hover)]">
                  <td>
                    <span className="flex min-w-0 items-center gap-2">
                      <Link href={clientPath(row.client.slug)} className="group flex min-w-0 items-center gap-2.5">
                        <ClientLogo slug={row.client.slug} name={row.client.name} website={row.client.website} size={20} />
                        <span className="truncate font-medium group-hover:text-[var(--i-accent-text)]">{row.client.name}</span>
                      </Link>
                      {row.client.archived_at ? (
                        <span className="shrink-0 text-[12px] text-[var(--i-faint)]">Archived</span>
                      ) : row.client.status !== "active" ? (
                        <span className="shrink-0">
                          <OptionBadge list={CLIENT_STATUSES} value={row.client.status} />
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="tabular-nums text-[var(--i-ink-2)]">{row.projects}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <PiecesBar counts={row.counts} className="min-w-0 flex-1" />
                      <span
                        aria-label={row.heldUp ? `${row.heldUp} held up` : undefined}
                        title={row.heldUp ? `${row.heldUp} held up` : undefined}
                        className={cn("w-12 shrink-0 text-right text-[12px] tabular-nums", row.heldUp ? "text-rose-700 dark:text-rose-300" : "text-transparent")}
                      >
                        {row.heldUp ? `${row.heldUp} stuck` : "·"}
                      </span>
                    </span>
                  </td>
                  <td>
                    <BarCell value={row.counts.live} max={maxLive} label={String(row.counts.live)} />
                  </td>
                  <td>
                    <BarCell value={row.views} max={maxReach} label={counts.format(row.views)} />
                  </td>
                  <td className="text-[12.5px]">
                    {row.latest ? (
                      <span className="tabular-nums">
                        <span className="text-[var(--i-ink-2)]">{monthLabel(row.latest.month, true)}</span>
                        <span className="text-[var(--i-muted)]">
                          {" "}
                          · {row.latest.done} of {row.latest.planned || "—"}
                          {row.latest.planned ? ` (${percentOf(row.latest.done, row.latest.planned)}%)` : ""}
                        </span>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12px] text-[var(--i-faint)]">Archived companies still count for the months they had.</p>
    </>
  );
}
