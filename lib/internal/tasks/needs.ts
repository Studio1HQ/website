import "server-only";
import { cache } from "react";
import type { Staff } from "@/lib/internal/session";
import { istNow } from "@/lib/internal/team/shared";
import { isFounder, owesReports } from "@/lib/internal/tasks/access";
import { dueTaskCounts, listReports } from "@/lib/internal/tasks/data";
import { owedReports, reportsDue, reportsSince, type ReportState } from "@/lib/internal/tasks/report-status";
import type { ReportPeriod } from "@/lib/internal/tasks/shared";

/**
 * What Tasks needs from someone, for the Overview's "Needs you" and the
 * sidebar badge: their own reports that are due (or late), and for the
 * founders, reports waiting to be read; and their own open tasks that are
 * due today or late. Zeros when it can't be read (the
 * migration not run included).
 */

export type TaskNeeds = {
  /** Their own reports to send: ready, not submitted. Founders have none. */
  reportsDue: { period: ReportPeriod; start: string; late: boolean; status: ReportState }[];
  /** Founders: submitted reports nobody has marked seen. */
  reportsToRead: number;
  /** Their own open tasks due today, and due before today. */
  tasksToday: number;
  tasksLate: number;
};

const NONE: TaskNeeds = { reportsDue: [], reportsToRead: 0, tasksToday: 0, tasksLate: 0 };

const needsFor = cache(
  async (email: string, founder: boolean, onList: boolean, joinedOn: string | null): Promise<TaskNeeds> => {
    const now = istNow();
    const [mine, waiting, dueTasks] = await Promise.all([
      onList && owesReports(email) ? listReports({ emails: [email], limit: 20 }) : Promise.resolve(null),
      founder ? listReports({ statuses: ["submitted"], limit: 200 }) : Promise.resolve(null),
      onList ? dueTaskCounts(email, now.date) : Promise.resolve(null),
    ]);
    const due =
      mine && mine.ok
        ? reportsDue(owedReports({ reports: mine.rows, now, since: reportsSince(joinedOn) })).map((item) => ({
            period: item.period,
            start: item.start,
            late: item.late,
            status: item.state,
          }))
        : [];
    return {
      reportsDue: due,
      reportsToRead: waiting && waiting.ok ? waiting.rows.length : 0,
      tasksToday: dueTasks?.today ?? 0,
      tasksLate: dueTasks?.late ?? 0,
    };
  },
);

export async function taskNeeds(staff: Staff): Promise<TaskNeeds> {
  try {
    return await needsFor(staff.email, isFounder(staff), staff.person !== null, staff.person?.joined_on ?? null);
  } catch (error) {
    console.error("[tasks] reading what Tasks needs failed", error);
    return NONE;
  }
}
