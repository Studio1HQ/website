import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretLeft, CaretRight } from "@/components/internal/icons";
import { requireMember } from "@/lib/internal/session";
import { isFounder, owesReports } from "@/lib/internal/tasks/access";
import {
  isSent,
  reportHref,
  stateOf,
} from "@/lib/internal/tasks/report-status";
import {
  hoursLabel,
  isPastDue,
  isPeriodStart,
  periodLabel,
  periodStart,
  shiftPeriod,
  tasksHref,
  type ReportPeriod,
} from "@/lib/internal/tasks/shared";
import { piecesLabel, teamTotals } from "@/lib/internal/tasks/team-report";
import { loadTeamReport } from "@/lib/internal/tasks/team-report-data";
import { istNow, photoUrl } from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Card,
  CardTitle,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { Table, rowClass } from "@/components/internal/community/ui";
import { ReportStatePill } from "@/components/internal/tasks/report-view";
import { StatTile, StatsRow } from "@/components/internal/tasks/week-parts";

export const metadata: Metadata = { title: "Team report" };

const LIST = "/tasks/reports";
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function href(period: ReportPeriod, start: string) {
  return `${LIST}/team?period=${period}&start=${start}`;
}

/** "6.5" days; whole numbers stay whole. */
function daysLabel(days: number | null) {
  if (days === null) return "—";
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

const dim = "text-[var(--i-faint)]";

/**
 * The founders' view of how the team's week or month went: per person, the
 * days and hours worked, the average working day, tasks done and still
 * open, client pieces published by size, and whether their report is in.
 * Built live from attendance, Tasks and client work; nothing is stored.
 */
export default async function TeamReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireMember(), searchParams]);
  if (!isFounder(staff)) redirect(LIST);

  const now = istNow();
  const period: ReportPeriod =
    one(params.period) === "month" ? "month" : "week";
  const current = periodStart(period, now.date);
  const asked = one(params.start);
  const start =
    isPeriodStart(period, asked) && asked <= current ? asked : current;
  const report = await loadTeamReport(period, start);

  const header = (
    <PageHeader
      eyebrow={
        <>
          <Link href="/tasks">Tasks</Link> ·{" "}
          <Link href={LIST}>Reports</Link>
        </>
      }
      title="Team report"
      description="How everyone's week or month went, from attendance, Tasks and client work. Only the founders see this."
      actions={
        <>
          <span
            role="tablist"
            aria-label="Period"
            className="flex rounded-lg border border-[var(--i-line)] p-0.5"
          >
            {(["week", "month"] as const).map((item) => (
              <Link
                key={item}
                role="tab"
                aria-selected={period === item}
                href={href(item, periodStart(item, start))}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12.5px]",
                  period === item
                    ? "bg-[var(--i-hover)] font-medium text-[var(--i-ink)]"
                    : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                )}
              >
                {item === "week" ? "Week" : "Month"}
              </Link>
            ))}
          </span>
          <span className="flex items-center gap-1">
            <Link
              href={href(period, shiftPeriod(period, start, -1))}
              aria-label={`The ${period} before`}
              className={buttonClass("secondary")}
            >
              <CaretLeft size={13} />
            </Link>
            <span className="min-w-[8.5rem] text-center text-[13px] font-medium">
              {periodLabel(period, start)}
            </span>
            {start < current ? (
              <Link
                href={href(period, shiftPeriod(period, start, 1))}
                aria-label={`The ${period} after`}
                className={buttonClass("secondary")}
              >
                <CaretRight size={13} />
              </Link>
            ) : (
              <span
                aria-hidden
                className={cn(buttonClass("secondary"), "opacity-40")}
              >
                <CaretRight size={13} />
              </span>
            )}
          </span>
        </>
      }
    />
  );

  if ("error" in report)
    return (
      <>
        {header}
        <Notice tone="error">{report.error}</Notice>
      </>
    );

  const totals = teamTotals(report.rows);
  const byEmail = new Map(
    report.people.map((person) => [person.email.toLowerCase(), person]),
  );
  const live = start === current;
  // Hours clocked when anyone clocked any, else what was logged on tasks.
  const hours = totals.clocked || totals.logged;

  return (
    <>
      {header}
      {report.failed.length ? (
        <div className="mb-4">
          <Notice tone="warning">
            Couldn&apos;t load {report.failed.join(", ")} just now, so those
            columns are blank.
          </Notice>
        </div>
      ) : null}

      <StatsRow>
        <StatTile
          label="Hours worked"
          value={hoursLabel(hours)}
          note={
            totals.clocked
              ? `${hoursLabel(totals.logged)} logged on tasks`
              : "from time logged on tasks"
          }
        />
        <StatTile
          label="Average day"
          value={hoursLabel(totals.perDay)}
          note="per person, per working day"
        />
        <StatTile
          label="Tasks done"
          value={String(totals.tasksDone)}
          note={totals.tasksLate ? `${totals.tasksLate} late now` : "none late"}
        />
        <StatTile
          label="Client pieces live"
          value={String(totals.published)}
          note={`${totals.points} points by size`}
        />
        <StatTile
          label="Time on clients"
          value={
            totals.logged
              ? `${Math.round((totals.clientMinutes / totals.logged) * 100)}%`
              : "—"
          }
          note="of the time logged"
        />
      </StatsRow>

      <Card>
        <CardTitle
          action={
            <span className="text-[12px] text-[var(--i-muted)]">
              {live ? "So far" : "Final"} · {report.rows.length} people
            </span>
          }
        >
          {periodLabel(period, start)}
        </CardTitle>
        <Table
          head={
            <>
              <th>Person</th>
              <th>Days worked</th>
              <th>Hours</th>
              <th>Average day</th>
              <th>Logged on tasks</th>
              <th>Tasks done</th>
              <th>Open now</th>
              <th>Client pieces</th>
              <th>Report</th>
            </>
          }
        >
          {report.rows.map((row) => {
            const person = byEmail.get(row.email);
            const sent = report.reports.get(row.email) ?? null;
            const state = stateOf(sent);
            const owes = owesReports(row.email);
            const pill = (
              <ReportStatePill
                state={state}
                late={!isSent(state) && isPastDue(period, start, now)}
              />
            );
            const quiet =
              !row.clocked && !row.logged && !row.tasksDone && !row.published;
            return (
              <tr key={row.email} className={rowClass}>
                <td>
                  <Link
                    href={tasksHref({ person: row.email })}
                    className="flex min-w-0 items-center gap-2.5 hover:text-[var(--i-accent-text)]"
                  >
                    <Avatar
                      name={row.name}
                      email={row.email}
                      src={person ? photoUrl(person) : null}
                      size={24}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {row.name}
                      </span>
                      {person?.designation ? (
                        <span className={cn("block truncate text-[12px]", dim)}>
                          {person.designation}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="tabular-nums">
                  {daysLabel(row.daysWorked)}
                  {row.leave ? (
                    <span className={cn("ml-1.5 text-[12px]", dim)}>
                      {row.leave} leave
                    </span>
                  ) : null}
                </td>
                <td className="tabular-nums">{hoursLabel(row.clocked)}</td>
                <td className="tabular-nums font-medium">
                  {hoursLabel(row.perDay)}
                </td>
                <td className="tabular-nums">
                  {hoursLabel(row.logged)}
                  {row.logged ? (
                    <span className={cn("ml-1.5 text-[12px]", dim)}>
                      {Math.round((row.clientMinutes / row.logged) * 100)}%
                      client
                    </span>
                  ) : null}
                </td>
                <td className="tabular-nums">
                  {row.tasksDone || <span className={dim}>0</span>}
                </td>
                <td className="tabular-nums">
                  {row.tasksOpen}
                  {row.tasksLate || row.tasksBlocked ? (
                    <span className="ml-1.5 text-[12px] text-amber-700 dark:text-amber-300">
                      {[
                        row.tasksLate ? `${row.tasksLate} late` : "",
                        row.tasksBlocked ? `${row.tasksBlocked} blocked` : "",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : null}
                </td>
                <td className="tabular-nums">
                  {row.published ? (
                    <>
                      {row.published}
                      <span className={cn("ml-1.5 text-[12px]", dim)}>
                        {piecesLabel(row.pieces)}
                      </span>
                    </>
                  ) : (
                    <span className={dim}>0</span>
                  )}
                </td>
                <td>
                  {!owes ? (
                    <span className={dim}>—</span>
                  ) : sent && state !== "draft" ? (
                    <Link
                      href={reportHref(sent.id)}
                      className="inline-flex hover:opacity-80"
                    >
                      {pill}
                    </Link>
                  ) : quiet && live ? (
                    <span className={dim}>Not yet</span>
                  ) : (
                    pill
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="border-t border-[var(--i-line)] px-5 py-3 text-[12px] leading-relaxed text-[var(--i-muted)]">
          Hours are what people clocked on My day; the average day is those
          hours over the days they worked (a half day counts as half). When
          nothing was clocked, it uses the time logged on tasks. Open, late and
          blocked tasks are as of today. Client pieces are the ones that went
          live in this {period}, with their sizes (S, M, L).
        </p>
      </Card>
    </>
  );
}
