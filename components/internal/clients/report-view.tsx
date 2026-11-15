import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/svgs/logo";
import { Card, CardTitle, ExternalLink } from "@/components/internal/ui";
import { Pill } from "@/components/internal/community/ui";
import { ProgressMeter } from "@/components/internal/clients/ui";
import {
  slipGroups,
  slipHeading,
  type ClientReport,
  type SlipSide,
} from "@/lib/internal/clients/report-text";
import type { ReportRow, ReportState } from "@/lib/internal/clients/rules";
import {
  formatDay,
  monthLabel,
  shiftMonth,
  thisMonth,
  type Tone,
} from "@/lib/internal/clients/schema";

/*
 * The monthly report's pieces. Everything under <ReportView> is what a
 * client sees (printed, saved as a PDF or pasted): no invoice state, no
 * internal notes, no draft/review/PR links, no sizes.
 */

/** Previous / next month links, and "This month" when elsewhere. */
export function ReportMonthSwitcher({
  month,
  hrefFor,
}: {
  month: string;
  hrefFor: (month: string) => string;
}) {
  const current = thisMonth();
  const linkClass =
    "flex size-8 items-center justify-center rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-muted)] shadow-[var(--i-shadow-sm)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]";
  return (
    <nav aria-label="Month" className="flex items-center gap-1.5">
      <Link
        href={hrefFor(shiftMonth(month, -1))}
        aria-label={`Previous month, ${monthLabel(shiftMonth(month, -1))}`}
        className={linkClass}
      >
        <CaretLeft size={14} />
      </Link>
      <span className="min-w-[8.5rem] text-center text-[13px] font-medium tabular-nums">
        {monthLabel(month)}
      </span>
      <Link
        href={hrefFor(shiftMonth(month, 1))}
        aria-label={`Next month, ${monthLabel(shiftMonth(month, 1))}`}
        className={linkClass}
      >
        <CaretRight size={14} />
      </Link>
      {month !== current ? (
        <Link
          href={hrefFor(current)}
          className="ml-1 rounded-lg px-2 py-1 text-[12.5px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
        >
          This month
        </Link>
      ) : null}
    </nav>
  );
}

const STATE_TONES: Record<ReportState, Tone> = {
  live: "emerald",
  approved: "emerald",
  with_client: "amber",
  waiting_on_client: "sky",
  in_review: "violet",
  in_progress: "sky",
  blocked: "rose",
  not_started: "stone",
};

function StatePill({ row }: { row: Pick<ReportRow, "state" | "stateLabel"> }) {
  return <Pill tone={STATE_TONES[row.state]}>{row.stateLabel}</Pill>;
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-4 text-[13px] text-[var(--i-muted)]">{children}</p>
  );
}

const SLIP_TONES: Record<SlipSide, string> = {
  client: "text-sky-800 dark:text-sky-200",
  studio1: "text-[var(--i-ink)]",
  third_party: "text-[var(--i-ink-2)]",
};

/** The client-ready report: header, planned vs delivered, live links, status, slipped, notes. */
export function ReportView({ report }: { report: ClientReport }) {
  const groups = slipGroups(report);
  return (
    <>
      <header className="mb-6 border-b border-[var(--i-line)] pb-5">
        <p className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--i-muted)]">
          <Logo className="size-5" /> Studio1 · Monthly report
        </p>
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.015em] sm:text-[26px]">
          {report.client || "Client"}
          <span className="text-[var(--i-muted)]"> · {report.engagement}</span>
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--i-muted)]">
          {[
            report.monthName,
            report.owner ? `Account owner: ${report.owner}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 text-[12.5px] text-[var(--i-faint)]">
          As of {formatDay(report.asOf, "")}
        </p>
      </header>

      <Card className="mb-5 break-inside-avoid">
        <CardTitle
          action={
            report.totals.planned > 0 ? (
              <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                {report.totals.done} of {report.totals.planned} delivered
              </span>
            ) : null
          }
        >
          Planned against delivered
        </CardTitle>
        {report.planned.length ? (
          <ul className="divide-y divide-[var(--i-line)]">
            {report.planned.map((row) => (
              <li
                key={`${row.kind}-${row.label}`}
                className="grid items-center gap-x-6 gap-y-2 px-5 py-3 text-[13px] sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] print:grid-cols-[minmax(0,1fr)_16rem]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {row.label}
                  </span>
                  {row.planned === 0 && row.done > 0 ? (
                    <span className="text-[12px] text-[var(--i-muted)]">
                      Extra, beyond the plan
                    </span>
                  ) : null}
                </span>
                <ProgressMeter
                  done={row.done}
                  planned={row.planned}
                  approved={row.approved}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing was planned for this month.</Empty>
        )}
      </Card>

      <Card className="mb-5 break-inside-avoid">
        <CardTitle>Published this month</CardTitle>
        {report.published.length ? (
          <ul className="divide-y divide-[var(--i-line)] text-[13px]">
            {report.published.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5"
              >
                <span className="min-w-0 flex-1 basis-64">
                  <span className="block font-medium">{row.title}</span>
                  {row.url ? (
                    <ExternalLink
                      href={row.url}
                      className="text-[12.5px] text-[var(--i-muted)]"
                    />
                  ) : null}
                </span>
                <span className="shrink-0 text-[12.5px] text-[var(--i-muted)]">
                  {row.kind}
                  {row.date ? ` · ${formatDay(row.date, report.asOf)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing has gone live yet this month.</Empty>
        )}
      </Card>

      {report.reach > 0 || report.milestones.length ? (
        <Card className="mb-5 break-inside-avoid">
          <CardTitle>Reach and milestones</CardTitle>
          <div className="space-y-3 px-5 py-3.5 text-[13px]">
            {report.reach > 0 ? (
              <p>
                <span className="font-medium tabular-nums">
                  {report.reach.toLocaleString("en-US")}
                </span>{" "}
                <span className="text-[var(--i-muted)]">
                  views on what went live this month
                </span>
              </p>
            ) : null}
            {report.milestones.length ? (
              <ul className="space-y-1.5">
                {report.milestones.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="w-14 shrink-0 tabular-nums text-[12.5px] text-[var(--i-muted)]">
                      {formatDay(item.day, report.asOf)}
                    </span>
                    <span className="min-w-0">
                      {item.url ? (
                        <ExternalLink href={item.url}>
                          {item.title}
                        </ExternalLink>
                      ) : (
                        item.title
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="mb-5">
        <CardTitle>Status of everything else</CardTitle>
        {report.open.length ? (
          <>
            {/* Phones and tablets: a card per item. Printing always uses the table. */}
            <ul className="divide-y divide-[var(--i-line)] text-[13px] lg:hidden print:hidden">
              {report.open.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium">{row.title}</span>
                    <StatePill row={row} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-[var(--i-muted)]">
                    {[row.kind, row.owner, row.dateLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {row.note ? (
                    <p className="mt-1 text-[12.5px] text-[var(--i-ink-2)]">
                      {row.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="hidden lg:block print:block">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
                    <th scope="col">Item</th>
                    <th scope="col">Status</th>
                    <th scope="col">Owner</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-2.5 [&>tr>td]:align-top first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
                  {report.open.map((row) => (
                    <tr key={row.id} className="break-inside-avoid">
                      <td className="min-w-0">
                        <span className="block font-medium">{row.title}</span>
                        <span className="text-[12px] text-[var(--i-muted)]">
                          {row.kind}
                        </span>
                        {row.note ? (
                          <span className="mt-0.5 block text-[12px] text-[var(--i-ink-2)]">
                            {row.note}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap">
                        <StatePill row={row} />
                      </td>
                      <td className="whitespace-nowrap">
                        {row.owner || (
                          <span className="text-[var(--i-faint)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[var(--i-muted)]">
                        {row.dateLabel || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty>Everything planned is live.</Empty>
        )}
      </Card>

      {groups.length ? (
        <Card className="mb-5 break-inside-avoid">
          <CardTitle>Slipped</CardTitle>
          <div className="divide-y divide-[var(--i-line)]">
            {groups.map((group) => (
              <section key={group.side} className="px-5 py-3.5">
                <h3
                  className={cn(
                    "mb-1.5 text-[12.5px] font-medium",
                    SLIP_TONES[group.side],
                  )}
                >
                  {slipHeading(group.side, report.client)}
                </h3>
                <ul className="space-y-1.5 text-[13px]">
                  {group.items.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-[var(--i-muted)]">
                        {" "}
                        · {item.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      ) : null}

      {report.scopeNote || report.retroNote ? (
        <div className="mb-5 grid gap-5 md:grid-cols-2 print:grid-cols-2">
          {report.scopeNote ? (
            <Card className="break-inside-avoid">
              <CardTitle>Agreed scope</CardTitle>
              <p className="whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-[var(--i-ink-2)]">
                {report.scopeNote}
              </p>
            </Card>
          ) : null}
          {report.retroNote ? (
            <Card className="break-inside-avoid">
              <CardTitle>Looking back on the month</CardTitle>
              <p className="whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-[var(--i-ink-2)]">
                {report.retroNote}
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}

      <p className="text-[12px] leading-relaxed text-[var(--i-faint)]">
        Delivered means live. &ldquo;Waiting on {report.client || "the client"}
        &rdquo; starts the day after a review was due back.
      </p>
    </>
  );
}
