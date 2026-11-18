import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/internal/session";
import { displayName, istNow } from "@/lib/internal/team/shared";
import { owesReports } from "@/lib/internal/tasks/access";
import { findReport } from "@/lib/internal/tasks/data";
import { liveSnapshot } from "@/lib/internal/tasks/load";
import { isSent, reportHref, shortDayLabel } from "@/lib/internal/tasks/report-status";
import {
  TASKS_MIGRATION_HINT,
  dueOn,
  isPastDue,
  isPeriodStart,
  periodLabel,
  periodStart,
  readyOn,
  type ReportPeriod,
} from "@/lib/internal/tasks/shared";
import { Notice, PageHeader } from "@/components/internal/ui";
import { ReportForm } from "@/components/internal/tasks/report-form";
import { ReportSnapshotView, ReportStatePill } from "@/components/internal/tasks/report-view";

export const metadata: Metadata = { title: "Write a report" };

const LIST = "/tasks/reports";

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * The owner's form for one week's or month's report: the numbers as they
 * stand (they keep updating until it's submitted), then the three answers.
 */
export default async function WriteReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireMember(), searchParams]);
  if (!staff.person || !owesReports(staff.email)) redirect(LIST);

  const period = one(params.period);
  const start = one(params.start);
  if ((period !== "week" && period !== "month") || !isPeriodStart(period, start)) redirect(LIST);
  const which: ReportPeriod = period;
  const now = istNow();
  // No report for a week or month that hasn't started.
  if (start > periodStart(which, now.date)) redirect(LIST);

  const [existing, live] = await Promise.all([findReport(staff.email, which, start), liveSnapshot(staff.email, which, start)]);
  if (existing && existing !== "error" && isSent(existing.status)) redirect(reportHref(existing.id));

  const report = existing === "error" ? null : existing;
  const ready = now.date >= readyOn(which, start);
  const late = isPastDue(which, start, now);
  const state = report?.status ?? "none";
  const missing = !live.ok && live.message === TASKS_MIGRATION_HINT;

  return (
    <>
      <PageHeader
        eyebrow={<Link href={LIST}>Reports</Link>}
        title={`${which === "week" ? "Weekly" : "Monthly"} report · ${periodLabel(which, start)}`}
        description={`Due ${shortDayLabel(dueOn(which, start))} at 12:00. The numbers below come from your tasks, client work, community tasks and My day, and keep updating until you submit.`}
        actions={<ReportStatePill state={state} late={late} />}
      />

      <div className="space-y-6">
        {existing === "error" && !missing ? <Notice tone="error">Couldn&apos;t load your report just now. Reload before you write.</Notice> : null}
        {report?.status === "returned" ? (
          <Notice tone="warning">
            <span className="font-medium">
              Sent back by {displayName({ email: report.reviewed_by ?? "a founder" })}:
            </span>{" "}
            <span className="whitespace-pre-wrap">{report.founder_note || "No note."}</span>
          </Notice>
        ) : null}

        {live.ok ? (
          <ReportSnapshotView snapshot={live.snapshot} />
        ) : (
          <Notice tone={missing ? "warning" : "error"}>{live.message}</Notice>
        )}

        <section aria-labelledby="report-words">
          <h2 id="report-words" className="mb-3 text-[15px] font-medium">
            In your words
          </h2>
          <ReportForm
            period={which}
            start={start}
            initial={{
              highlights: report?.highlights ?? "",
              blockers: report?.blockers ?? "",
              next_plan: report?.next_plan ?? "",
            }}
            ready={ready && !missing}
            readyLabel={shortDayLabel(readyOn(which, start))}
            resubmit={report?.status === "returned"}
          />
        </section>
      </div>
    </>
  );
}
