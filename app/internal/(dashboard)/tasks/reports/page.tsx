import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, Tray } from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/internal/session";
import { listPeople } from "@/lib/internal/team/people";
import { displayName, istNow, photoUrl, type TeamPerson } from "@/lib/internal/team/shared";
import { isFounder, owesReports } from "@/lib/internal/tasks/access";
import { listReports } from "@/lib/internal/tasks/data";
import {
  inboxPeriods,
  isSent,
  owedReports,
  reportHref,
  reportsSince,
  shortDayLabel,
  stateOf,
  writeHref,
  type OwedReport,
} from "@/lib/internal/tasks/report-status";
import { TASKS_MIGRATION_HINT, isPastDue, periodLabel, type Report, type ReportPeriod } from "@/lib/internal/tasks/shared";
import { Avatar, Card, CardTitle, EmptyState, Notice, PageHeader, buttonClass, relativeDate } from "@/components/internal/ui";
import { Table, rowClass } from "@/components/internal/community/ui";
import { ReportStatePill } from "@/components/internal/tasks/report-view";

export const metadata: Metadata = { title: "Reports" };

const PERIOD_WORD: Record<ReportPeriod, string> = { week: "Weekly", month: "Monthly" };

function nameOf(people: Map<string, TeamPerson>, email: string) {
  const person = people.get(email);
  return person ? displayName(person) : displayName({ email });
}

/** What the person's button says for a period, and where it goes. */
function action(item: OwedReport) {
  if (isSent(item.state) && item.report) return { label: "View", href: reportHref(item.report.id), primary: false };
  if (item.state === "returned") return { label: "Fix and resubmit", href: writeHref(item.period, item.start), primary: true };
  if (item.state === "draft") return { label: "Continue", href: writeHref(item.period, item.start), primary: item.ready };
  return { label: item.ready ? "Write" : "Start a draft", href: writeHref(item.period, item.start), primary: item.ready };
}

function OwedRow({ item }: { item: OwedReport }) {
  const next = action(item);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium">
          {PERIOD_WORD[item.period]} · {periodLabel(item.period, item.start)}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--i-muted)]">
          {isSent(item.state)
            ? `Submitted ${relativeDate(item.report?.submitted_at)}`
            : item.ready
              ? `Due ${shortDayLabel(item.dueOn)}, 12:00`
              : `Ready from ${shortDayLabel(item.readyOn)} · due ${shortDayLabel(item.dueOn)}, 12:00`}
        </p>
        {item.state === "returned" && item.report?.founder_note ? (
          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {displayName({ email: item.report.reviewed_by ?? "a founder" })}: {item.report.founder_note}
          </p>
        ) : null}
      </div>
      <ReportStatePill state={item.state} late={item.late} />
      <Link href={next.href} className={buttonClass(next.primary ? "primary" : "secondary", "sm")}>
        {next.label}
      </Link>
    </li>
  );
}

/**
 * Weekly and monthly reports. Everyone on the team list (but the founders)
 * writes theirs here and sees what they've sent; the founders get an inbox
 * of submitted reports and a grid of who has sent this period's.
 */
export default async function ReportsPage() {
  const staff = await requireMember();
  const founder = isFounder(staff);
  const now = istNow();

  if (!staff.person && !founder) {
    return (
      <>
        <PageHeader eyebrow={<Link href="/internal/tasks">Tasks</Link>} title="Reports" />
        <Card>
          <EmptyState icon={<CheckSquare size={20} />} title="You're not on the team list yet">
            Weekly and monthly reports are for people on the team list. Ask Arindam or Amitesh to add you.
          </EmptyState>
        </Card>
      </>
    );
  }

  const writes = Boolean(staff.person) && owesReports(staff.email);
  const periods = founder ? inboxPeriods(now.date) : [];
  const [mine, waiting, current, recent, people] = await Promise.all([
    writes ? listReports({ emails: [staff.email], limit: 200 }) : Promise.resolve(null),
    founder ? listReports({ statuses: ["submitted"], limit: 200 }) : Promise.resolve(null),
    founder && periods.length ? listReports({ starts: periods.map((item) => item.start), limit: 1000 }) : Promise.resolve(null),
    founder ? listReports({ statuses: ["seen", "returned"], limit: 30 }) : Promise.resolve(null),
    founder ? listPeople() : Promise.resolve(null),
  ]);

  const failed = [mine, waiting, current, recent].find((result) => result && !result.ok);
  const missing = Boolean(failed && !failed.ok && failed.missing);
  const byEmail = new Map((people?.ok ? people.people : []).map((person) => [person.email, person]));
  const team = (people?.ok ? people.people : []).filter((person) => person.active && owesReports(person.email));

  const own = mine?.ok ? mine.rows : [];
  const owed = writes ? owedReports({ reports: own, now, since: reportsSince(staff.person?.joined_on) }) : [];
  const owedKeys = new Set(owed.map((item) => `${item.period}:${item.start}`));
  const history = own.filter((report) => !owedKeys.has(`${report.period}:${report.starts_on}`));

  const inbox = (waiting?.ok ? waiting.rows : []).sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""));
  const reportFor = (email: string, period: ReportPeriod, start: string) =>
    (current?.ok ? current.rows : []).find((report) => report.email === email && report.period === period && report.starts_on === start) ??
    null;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/internal/tasks">Tasks</Link>}
        title="Reports"
        description={
          founder
            ? "Everyone's weekly and monthly reports. Weekly ones are due Monday at 12:00, monthly ones on the 2nd."
            : "Your weekly and monthly reports to Arindam and Amitesh. The numbers fill themselves in from your tasks, client work and days; you add a few lines."
        }
      />

      {failed && !failed.ok ? (
        <div className="mb-5">
          <Notice tone={missing ? "warning" : "error"}>{missing ? TASKS_MIGRATION_HINT : failed.message}</Notice>
        </div>
      ) : null}

      <div className="space-y-6">
        {founder ? (
          <>
            <Card>
              <CardTitle action={<span className="text-[12px] text-[var(--i-muted)] tabular-nums">{inbox.length}</span>}>
                To read
              </CardTitle>
              {inbox.length ? (
                <ul className="divide-y divide-[var(--i-line)]">
                  {inbox.map((report) => {
                    const person = byEmail.get(report.email);
                    return (
                      <li key={report.id}>
                        <Link
                          href={reportHref(report.id)}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--i-hover)]"
                        >
                          <Avatar
                            name={person ? displayName(person) : report.email}
                            email={report.email}
                            src={person ? photoUrl(person) : null}
                            size={28}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium">{nameOf(byEmail, report.email)}</span>
                            <span className="block truncate text-[12px] text-[var(--i-muted)]">
                              {PERIOD_WORD[report.period]} · {periodLabel(report.period, report.starts_on)}
                            </span>
                          </span>
                          <span className="shrink-0 text-[12px] text-[var(--i-muted)]">{relativeDate(report.submitted_at)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={<Tray size={20} />} title="Nothing to read">
                  Submitted reports show up here until you mark them seen.
                </EmptyState>
              )}
            </Card>

            {periods.length ? (
              <Card>
                <CardTitle>Who has sent theirs</CardTitle>
                <Table
                  head={
                    <>
                      <th>Person</th>
                      {periods.map((item) => (
                        <th key={item.period}>
                          {PERIOD_WORD[item.period]} · {periodLabel(item.period, item.start)}
                        </th>
                      ))}
                    </>
                  }
                >
                  {team.length ? (
                    team.map((person) => (
                      <tr key={person.email} className={rowClass}>
                        <td>
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Avatar name={displayName(person)} email={person.email} src={photoUrl(person)} size={24} />
                            <span className="min-w-0 truncate font-medium">{displayName(person)}</span>
                          </span>
                        </td>
                        {periods.map((item) => {
                          const report = reportFor(person.email, item.period, item.start);
                          const state = stateOf(report);
                          const late = !isSent(state) && isPastDue(item.period, item.start, now);
                          const pill = <ReportStatePill state={state} late={late} />;
                          return (
                            <td key={item.period}>
                              {report && state !== "draft" ? (
                                <Link href={reportHref(report.id)} className="inline-flex hover:opacity-80">
                                  {pill}
                                </Link>
                              ) : (
                                pill
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={periods.length + 1} className="text-[var(--i-faint)]">
                        Nobody on the team list owes a report yet.
                      </td>
                    </tr>
                  )}
                </Table>
              </Card>
            ) : null}

            {recent?.ok && recent.rows.length ? (
              <Card>
                <CardTitle>Recently read</CardTitle>
                <ReportList reports={recent.rows} names={byEmail} showName />
              </Card>
            ) : null}
          </>
        ) : null}

        {writes ? (
          <>
            <Card>
              <CardTitle>Your reports</CardTitle>
              {owed.length ? (
                <ul className="divide-y divide-[var(--i-line)]">
                  {owed.map((item) => (
                    <OwedRow key={`${item.period}:${item.start}`} item={item} />
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-[13px] leading-relaxed text-[var(--i-muted)]">
                  Nothing due right now. This week&apos;s report opens on Friday and is due Monday at 12:00; the month&apos;s opens
                  three days before it ends and is due on the 2nd.
                </p>
              )}
            </Card>

            {history.length ? (
              <Card>
                <CardTitle>Earlier</CardTitle>
                <ReportList reports={history} />
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

function ReportList({
  reports,
  names,
  showName = false,
}: {
  reports: readonly Report[];
  names?: Map<string, TeamPerson>;
  showName?: boolean;
}) {
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={
              !showName && (report.status === "draft" || report.status === "returned")
                ? writeHref(report.period, report.starts_on)
                : reportHref(report.id)
            }
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-[var(--i-hover)]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">
                {showName && names ? `${nameOf(names, report.email)} · ` : ""}
                {PERIOD_WORD[report.period]} · {periodLabel(report.period, report.starts_on)}
              </span>
              <span className="block truncate text-[12px] text-[var(--i-muted)]">
                {report.submitted_at ? `Submitted ${relativeDate(report.submitted_at)}` : "Not submitted"}
                {report.founder_note ? ` · note: ${report.founder_note}` : ""}
              </span>
            </span>
            <ReportStatePill state={report.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
