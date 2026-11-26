import "server-only";
import { inList, selectRows } from "@/lib/supabase-server";
import { addDays, firstDay, lastDay } from "@/lib/internal/clients/schema";
import { isOwner } from "@/lib/internal/roles";
import { owesReports } from "@/lib/internal/tasks/access";
import { engagementLabels, istMidnight, listReports, listTasks } from "@/lib/internal/tasks/data";
import { isSent, reportsSince } from "@/lib/internal/tasks/report-status";
import { isPastDue } from "@/lib/internal/tasks/shared";
import { listDays } from "@/lib/internal/team/attendance";
import { listAudit } from "@/lib/internal/team/audit";
import { listPeople } from "@/lib/internal/team/people";
import { istHour, reviewTeam, type PersonReview, type ReviewPiece } from "@/lib/internal/team/review";
import { displayName, istNow, isMissingTable, type TeamPerson } from "@/lib/internal/team/shared";

/**
 * Everything the monthly review shows (lib/internal/team/review.ts does the
 * judging). Each source is read on its own: one that fails is named in
 * `failed` and the review goes on without it. The founders aren't
 * reviewed. Server only.
 */

export type FollowUp = { at: string; by: string; subject: string };

export type MonthReview = {
  month: string;
  today: string;
  reviews: PersonReview[];
  people: Map<string, TeamPerson>;
  /** Follow-up emails sent about this month, newest first, by email. */
  followUps: Map<string, FollowUp[]>;
  failed: string[];
};

/**
 * Where "who did something, when" lives. Each row is one thing someone did
 * on the dashboard: a task added or changed, a day logged, a client piece
 * moved, a blog step, an outreach or community note, a report sent, a call
 * set up.
 */
const ACTIONS: readonly { table: string; at: string; by: string }[] = [
  { table: "team_tasks", at: "created_at", by: "created_by" },
  { table: "team_tasks", at: "updated_at", by: "updated_by" },
  { table: "team_attendance", at: "created_at", by: "logged_by" },
  { table: "team_attendance", at: "updated_at", by: "logged_by" },
  { table: "client_status_events", at: "at", by: "by" },
  { table: "blog_events", at: "created_at", by: "actor" },
  { table: "community_activity", at: "created_at", by: "created_by" },
  { table: "outreach_activity", at: "created_at", by: "created_by" },
  { table: "team_reports", at: "submitted_at", by: "email" },
  { table: "team_calls", at: "created_at", by: "created_by" },
];

async function dashboardActions(emails: readonly string[], since: string, until: string) {
  const results = await Promise.all(
    ACTIONS.map(async (source) => {
      const result = await selectRows(
        source.table,
        new URLSearchParams({
          select: `${source.by},${source.at}`,
          [source.by]: inList([...emails]),
          and: `(${source.at}.gte.${since},${source.at}.lt.${until})`,
          limit: "5000",
        }),
      );
      if (!result.ok) {
        // A table that isn't there yet just has nothing to add.
        if (!isMissingTable(result.message)) console.error(`[review] reading ${source.table} failed: ${result.message}`);
        return { ok: isMissingTable(result.message), rows: [] as { email: string; at: string }[] };
      }
      return {
        ok: true,
        rows: result.rows.flatMap((row) => {
          const email = row[source.by];
          const at = row[source.at];
          return typeof email === "string" && typeof at === "string" ? [{ email: email.toLowerCase(), at }] : [];
        }),
      };
    }),
  );
  return { ok: results.every((result) => result.ok), rows: results.flatMap((result) => result.rows) };
}

/** Client pieces these people own that were due, or went live, in the month. */
async function clientPieces(emails: readonly string[], from: string, to: string): Promise<ReviewPiece[] | null> {
  const since = istMidnight(from);
  const until = istMidnight(addDays(to, 1));
  const result = await selectRows(
    "client_deliverables",
    new URLSearchParams({
      select: "owner,title,engagement_id,due_on,status,published_at,status_changed_at",
      owner: inList([...emails]),
      or: `(and(due_on.gte.${from},due_on.lte.${to}),and(published_at.gte.${since},published_at.lt.${until}))`,
      limit: "3000",
    }),
  );
  if (!result.ok) {
    if (!isMissingTable(result.message)) console.error(`[review] reading client pieces failed: ${result.message}`);
    return null;
  }
  return result.rows.map((row) => {
    const live = row.status === "published";
    const when = live ? String(row.published_at ?? row.status_changed_at ?? "") : "";
    return {
      owner: typeof row.owner === "string" ? row.owner : null,
      title: String(row.title ?? ""),
      engagement_id: typeof row.engagement_id === "string" ? row.engagement_id : null,
      due_on: typeof row.due_on === "string" ? row.due_on.slice(0, 10) : null,
      done_on: live ? (istHour(when)?.date ?? null) : null,
      waiting: row.status === "client_review",
    };
  });
}

async function followUpsFor(month: string) {
  const rows = await listAudit("people", { action: "followed_up", limit: 500 });
  const byEmail = new Map<string, FollowUp[]>();
  for (const row of rows) {
    if (row.detail?.month !== month) continue;
    const email = row.subject.toLowerCase();
    const list = byEmail.get(email) ?? [];
    list.push({ at: row.created_at, by: row.actor, subject: String(row.detail?.subject ?? "") });
    byEmail.set(email, list);
  }
  return byEmail;
}

export async function loadReview(month: string, now = istNow()): Promise<MonthReview | { error: string }> {
  const today = now.date;
  const from = firstDay(month);
  const to = lastDay(month);
  const team = await listPeople({ activeOnly: true });
  if (!team.ok) return { error: team.message };
  const people = team.people.filter((person) => !isOwner(person.email));
  const emails = people.map((person) => person.email.toLowerCase());
  if (!emails.length)
    return { month, today, reviews: [], people: new Map(), followUps: new Map(), failed: [] };

  const [days, tasks, pieces, actions, reports, engagements, followUps] = await Promise.all([
    listDays({ from, to, emails }),
    // Done ones from the 1st to today: a task due this month and finished later still shows how late it was.
    listTasks({ emails, from, to: today > to ? today : to }),
    clientPieces(emails, from, to),
    dashboardActions(emails, istMidnight(from), istMidnight(addDays(to, 1))),
    listReports({ emails, period: "month", starts: [from] }),
    engagementLabels(),
    followUpsFor(month),
  ]);

  // Monthly reports past due and not in.
  const reportsMissing = new Set<string>();
  if (reports.ok && isPastDue("month", from, now)) {
    const sent = new Set(reports.rows.filter((report) => isSent(report.status)).map((report) => report.email.toLowerCase()));
    for (const person of people)
      if (owesReports(person.email) && to >= reportsSince(person.joined_on) && !sent.has(person.email.toLowerCase()))
        reportsMissing.add(person.email.toLowerCase());
  }

  const failed = [
    days.ok ? "" : "attendance",
    tasks.ok ? "" : "tasks",
    pieces ? "" : "client pieces",
    actions.ok ? "" : "some dashboard activity",
    reports.ok ? "" : "monthly reports",
  ].filter(Boolean);

  return {
    month,
    today,
    reviews: reviewTeam({
      month,
      today,
      people: people.map((person) => ({
        email: person.email.toLowerCase(),
        name: displayName(person),
        kind: person.kind,
        // No joining date on People: the day they were put on the team list.
        joined_on: person.joined_on ?? (person.created_at ? (istHour(person.created_at)?.date ?? null) : null),
      })),
      attendance: days.ok ? days.days : null,
      tasks: tasks.ok ? tasks.rows : [],
      pieces: pieces ?? [],
      actions: actions.rows,
      engagements,
      reportsMissing,
    }),
    people: new Map(people.map((person) => [person.email.toLowerCase(), person])),
    followUps,
    failed,
  };
}
