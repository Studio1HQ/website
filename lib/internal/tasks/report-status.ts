/**
 * Where someone's weekly and monthly reports stand: pure helpers the reports
 * pages, the Overview's "Needs you" and the sidebar badge share.
 */

import {
  TASKS_START,
  dueOn,
  isPastDue,
  owedPeriods,
  readyOn,
  type Report,
  type ReportPeriod,
  type ReportStatus,
  type Tone,
} from "@/lib/internal/tasks/shared";

/** A report's state, with "none" for one nobody has started. */
export type ReportState = ReportStatus | "none";

export const STATE_INFO: Record<ReportState, { label: string; tone: Tone }> = {
  none: { label: "Not started", tone: "stone" },
  draft: { label: "Draft", tone: "stone" },
  submitted: { label: "Submitted", tone: "sky" },
  returned: { label: "Sent back", tone: "amber" },
  seen: { label: "Seen", tone: "emerald" },
};

export function stateOf(report: Pick<Report, "status"> | null | undefined): ReportState {
  return report?.status ?? "none";
}

/** Sent in: nothing more for the person to do. */
export function isSent(state: ReportState) {
  return state === "submitted" || state === "seen";
}

/** From when reports are owed: the later of joining and Tasks starting. */
export function reportsSince(joinedOn: string | null | undefined) {
  return joinedOn && joinedOn > TASKS_START ? joinedOn : TASKS_START;
}

/** The owner's form for a period. */
export function writeHref(period: ReportPeriod, start: string) {
  return `/internal/tasks/reports/write?period=${period}&start=${start}`;
}

export function reportHref(id: string) {
  return `/internal/tasks/reports/${id}`;
}

export const PERIODS: readonly ReportPeriod[] = ["week", "month"];

/** One period someone owes (or owed) a report for, and where it stands. */
export type OwedReport = {
  period: ReportPeriod;
  start: string;
  state: ReportState;
  report: Report | null;
  /** Can be submitted today. */
  ready: boolean;
  readyOn: string;
  dueOn: string;
  /** Past 12:00 IST on the due day and not sent. */
  late: boolean;
};

/**
 * The periods someone owes a report for today (weeks first, newest first in
 * each), with the reports they've started. `reports` may hold any of theirs.
 */
export function owedReports(input: {
  reports: readonly Report[];
  now: { date: string; time: string };
  since?: string | null;
}): OwedReport[] {
  const out: OwedReport[] = [];
  for (const period of PERIODS) {
    for (const start of owedPeriods(period, input.now.date, input.since)) {
      const report = input.reports.find((item) => item.period === period && item.starts_on === start) ?? null;
      const state = stateOf(report);
      out.push({
        period,
        start,
        state,
        report,
        ready: input.now.date >= readyOn(period, start),
        readyOn: readyOn(period, start),
        dueOn: dueOn(period, start),
        late: !isSent(state) && isPastDue(period, start, input.now),
      });
    }
  }
  return out;
}

/** The ones still to send, for "Needs you". Only ready ones count as due. */
export function reportsDue(owed: readonly OwedReport[]) {
  return owed.filter((item) => item.ready && !isSent(item.state));
}

/**
 * The periods the founders' status grid shows: the latest owed week and
 * month (this one once it's ready, else the last one).
 */
export function inboxPeriods(today: string): { period: ReportPeriod; start: string }[] {
  return PERIODS.flatMap((period) => {
    const owed = owedPeriods(period, today, TASKS_START);
    return owed.length ? [{ period, start: owed[0] }] : [];
  });
}

/** "Due Mon 23 Nov, 12:00" style day labels. */
export function shortDayLabel(day: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
