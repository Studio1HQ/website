import "server-only";
import { selectRows } from "@/lib/supabase-server";
import { addDays, type Size } from "@/lib/internal/clients/schema";
import {
  engagementLabels,
  istMidnight,
  listLogs,
  listReports,
  listTasks,
} from "@/lib/internal/tasks/data";
import {
  periodEnd,
  type Report,
  type ReportPeriod,
} from "@/lib/internal/tasks/shared";
import {
  teamRows,
  type PublishedPiece,
  type TeamRow,
} from "@/lib/internal/tasks/team-report";
import { listDays } from "@/lib/internal/team/attendance";
import { listPeople } from "@/lib/internal/team/people";
import {
  displayName,
  istNow,
  type TeamPerson,
} from "@/lib/internal/team/shared";

/**
 * Everything the team report shows for one week or month. Each part is read
 * on its own: one that fails is named in `failed` and its columns stay
 * blank or zero, instead of the whole page failing.
 */
export type TeamReport = {
  from: string;
  to: string;
  rows: TeamRow[];
  people: TeamPerson[];
  /** The reports people sent for this period, by email. */
  reports: Map<string, Report>;
  /** What couldn't be read: "attendance", "tasks"… */
  failed: string[];
};

/** Client pieces published between two IST days, with their owner and size. */
async function publishedPieces(
  from: string,
  to: string,
): Promise<PublishedPiece[] | null> {
  const result = await selectRows(
    "client_deliverables",
    new URLSearchParams({
      select: "owner,size",
      status: "eq.published",
      and: `(published_at.gte.${istMidnight(from)},published_at.lt.${istMidnight(addDays(to, 1))})`,
      limit: "5000",
    }),
  );
  if (!result.ok) return null;
  return result.rows.map((row) => ({
    owner: typeof row.owner === "string" ? row.owner : null,
    size: (["S", "M", "L"].includes(String(row.size)) ? row.size : "M") as Size,
  }));
}

export async function loadTeamReport(
  period: ReportPeriod,
  start: string,
): Promise<TeamReport | { error: string }> {
  const from = start;
  const to = periodEnd(period, start);
  const team = await listPeople({ activeOnly: true });
  if (!team.ok) return { error: team.message };
  const emails = team.people.map((person) => person.email);

  const [days, logs, tasks, pieces, reports, engagements] = await Promise.all([
    listDays({ from, to, emails }),
    listLogs({ emails, from, to }),
    listTasks({ emails, from, to }),
    publishedPieces(from, to),
    listReports({ starts: [start], limit: 1000 }),
    engagementLabels(),
  ]);

  const failed = [
    days.ok ? "" : "attendance",
    logs.ok ? "" : "logged time",
    tasks.ok ? "" : "tasks",
    pieces ? "" : "client pieces",
    reports.ok ? "" : "reports",
  ].filter(Boolean);

  return {
    from,
    to,
    people: team.people,
    rows: teamRows({
      people: team.people.map((person) => ({
        email: person.email,
        name: displayName(person),
      })),
      from,
      to,
      today: istNow().date,
      days: days.ok ? days.days : null,
      logs: logs.ok ? logs.rows : [],
      tasks: tasks.ok ? tasks.rows : [],
      pieces: pieces ?? [],
      engagements,
    }),
    reports: new Map(
      (reports.ok ? reports.rows : [])
        .filter((report) => report.period === period)
        .map((report) => [report.email.toLowerCase(), report]),
    ),
    failed,
  };
}
