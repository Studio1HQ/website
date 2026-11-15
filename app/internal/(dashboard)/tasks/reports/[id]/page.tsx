import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/internal/session";
import { getPerson } from "@/lib/internal/team/people";
import { displayName, istNow } from "@/lib/internal/team/shared";
import { canReadReports, isFounder } from "@/lib/internal/tasks/access";
import { getReport } from "@/lib/internal/tasks/data";
import { liveSnapshot } from "@/lib/internal/tasks/load";
import { reportText } from "@/lib/internal/tasks/report";
import { isSent, writeHref } from "@/lib/internal/tasks/report-status";
import { isPastDue, periodLabel } from "@/lib/internal/tasks/shared";
import { Notice, PageHeader, buttonClass, formatDate } from "@/components/internal/ui";
import { ReportCopyText, ReportReview } from "@/components/internal/tasks/report-review";
import { ReportSnapshotView, ReportStatePill, ReportWordsView } from "@/components/internal/tasks/report-view";

export const metadata: Metadata = { title: "Report" };

/**
 * One report, for the person who wrote it and the founders (the email the
 * founders get links here). A submitted report shows the numbers frozen
 * when it was sent; a draft or a sent-back one shows them live.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [staff, { id }] = await Promise.all([requireMember(), params]);
  const report = await getReport(id);
  if (report === "error") {
    return (
      <>
        <PageHeader eyebrow={<Link href="/internal/tasks/reports">Reports</Link>} title="Report" />
        <Notice tone="error">Couldn&apos;t load this report just now. Try again in a minute.</Notice>
      </>
    );
  }
  if (!report || !canReadReports(staff, report.email)) notFound();

  const owner = report.email === staff.email;
  const founder = isFounder(staff);
  const sent = isSent(report.status);
  const [person, live] = await Promise.all([
    getPerson(report.email),
    sent && report.snapshot ? Promise.resolve(null) : liveSnapshot(report.email, report.period, report.starts_on),
  ]);
  const snapshot = sent && report.snapshot ? report.snapshot : live?.ok ? live.snapshot : null;
  const name = person ? displayName(person) : displayName({ email: report.email });
  const words = { highlights: report.highlights, blockers: report.blockers, next_plan: report.next_plan };
  const late = !sent && isPastDue(report.period, report.starts_on, istNow());
  const editable = owner && (report.status === "draft" || report.status === "returned");

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/internal/tasks/reports">Reports</Link>}
        title={`${owner ? "Your" : `${name}'s`} ${report.period === "week" ? "weekly" : "monthly"} report · ${periodLabel(report.period, report.starts_on)}`}
        description={
          report.submitted_at
            ? `Submitted ${formatDate(report.submitted_at)}${report.reviewed_at && report.status === "seen" ? ` · seen by ${displayName({ email: report.reviewed_by ?? "" })}` : ""}`
            : "Not submitted yet."
        }
        actions={
          <>
            <ReportStatePill state={report.status} late={late} />
            {snapshot ? <ReportCopyText text={reportText(name, words, snapshot)} /> : null}
            {editable ? (
              <Link href={writeHref(report.period, report.starts_on)} className={buttonClass("primary")}>
                {report.status === "returned" ? "Fix and resubmit" : "Continue writing"}
              </Link>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        {report.founder_note ? (
          <Notice tone={report.status === "returned" ? "warning" : "info"}>
            <span className="font-medium text-[var(--i-ink)]">
              {report.status === "returned" ? "Sent back" : "Note"} from {displayName({ email: report.reviewed_by ?? "a founder" })}:
            </span>{" "}
            <span className="whitespace-pre-wrap">{report.founder_note}</span>
          </Notice>
        ) : null}

        {!sent ? (
          <Notice>
            {report.status === "returned"
              ? "It was sent back, so the numbers below are live again: they update until it's submitted."
              : "A draft: the numbers below are live and update until it's submitted."}
          </Notice>
        ) : null}

        <ReportWordsView period={report.period} words={words} />

        {founder && !owner ? <ReportReview id={report.id} status={report.status} name={name} note={report.founder_note} /> : null}

        {snapshot ? (
          <ReportSnapshotView snapshot={snapshot} />
        ) : (
          <Notice tone="error">{live && !live.ok ? live.message : "The numbers for this report couldn't be read."}</Notice>
        )}
      </div>
    </>
  );
}
