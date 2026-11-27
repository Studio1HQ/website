import "server-only";
import { selectRows } from "@/lib/supabase-server";
import { loadClientWork } from "@/lib/internal/clients/data";
import { firstDay, lastDay, monthLabel, shiftMonth } from "@/lib/internal/clients/schema";
import type { MonthlyReport } from "@/lib/internal/monthly-report";
import { istMidnight, listLogs, listTasks } from "@/lib/internal/tasks/data";
import { teamRows } from "@/lib/internal/tasks/team-report";
import { listDays } from "@/lib/internal/team/attendance";
import { listPeople } from "@/lib/internal/team/people";
import { displayName } from "@/lib/internal/team/shared";
import { peopleOn } from "@/lib/internal/tasks/shared";
import { reviewLine } from "@/lib/internal/team/review";
import { loadReview } from "@/lib/internal/team/review-data";

/**
 * The numbers for one month's report (lib/internal/monthly-report.ts).
 * Every part is read on its own: one that fails, or whose tables aren't
 * there yet, comes back null and the email leaves that line out instead of
 * the whole report failing.
 */

/** Rows in `table` matching `filters`, or null when it can't be read. */
async function count(table: string, filters: Record<string, string>) {
  const result = await selectRows(table, new URLSearchParams({ select: "*", limit: "1", ...filters }), { count: true });
  return result.ok ? (result.total ?? result.rows.length) : null;
}

export async function loadMonthlyReport(month: string): Promise<MonthlyReport> {
  const from = firstDay(month);
  const to = lastDay(month);
  // Timestamps: from midnight IST on the 1st to midnight IST on the next 1st.
  const since = istMidnight(from);
  const until = istMidnight(firstDay(shiftMonth(month, 1)));
  const within = (column: string) => ({ and: `(${column}.gte.${since},${column}.lt.${until})` });

  const [work, team, blogPublished, jobs, cohort, hackathons, added, won, review] = await Promise.all([
    loadClientWork(month),
    listPeople({ activeOnly: true }),
    count("blog_posts", { status: "eq.published", ...within("published_at") }),
    count("job_applications", within("created_at")),
    count("devrel_cohort_applications", within("created_at")),
    count("hackathon_registrations", within("created_at")),
    count("outreach_orgs", within("created_at")),
    count("outreach_orgs", { stage: "eq.won", and: `(closed_on.gte.${from},closed_on.lte.${to})` }),
    loadReview(month).catch((error: unknown) => ({ error: String(error) })),
  ]);

  const clients = work.ok
    ? work.rows
        .filter((row) => row.cycle && row.client)
        .map((row) => ({
          name: row.client?.name ?? "",
          engagement: row.engagement.name,
          planned: row.progress.planned,
          done: row.progress.done,
          late: row.late,
        }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.engagement.localeCompare(b.engagement))
    : null;

  let people: MonthlyReport["people"] = null;
  if (team.ok) {
    const tasks = await listTasks({ emails: team.people.map((person) => person.email), from, to });
    if (tasks.ok) {
      const done = new Map<string, number>();
      for (const task of tasks.rows) {
        // A shared task counts for everyone on it.
        if (task.status === "done") for (const email of peopleOn(task)) done.set(email, (done.get(email) ?? 0) + 1);
      }
      // Hours: clocked on My day, or logged on tasks when nothing was clocked.
      const [days, logs] = await Promise.all([
        listDays({ from, to, emails: team.people.map((person) => person.email) }),
        listLogs({ emails: team.people.map((person) => person.email), from, to }),
      ]);
      const hours = new Map(
        teamRows({
          people: team.people.map((person) => ({ email: person.email, name: displayName(person) })),
          from,
          to,
          today: to,
          days: days.ok ? days.days : null,
          logs: logs.ok ? logs.rows : [],
          tasks: [],
          pieces: [],
          engagements: new Map(),
        }).map((row) => [row.email, row]),
      );
      const published = new Map<string, number>();
      for (const item of work.ok ? work.deliverables : []) {
        if (item.status !== "published" || !item.owner) continue;
        const owner = item.owner.toLowerCase();
        published.set(owner, (published.get(owner) ?? 0) + 1);
      }
      people = team.people
        .map((person) => ({
          name: displayName(person),
          tasksDone: done.get(person.email.toLowerCase()) ?? 0,
          published: published.get(person.email.toLowerCase()) ?? 0,
          minutes: hours.get(person.email.toLowerCase())?.clocked || hours.get(person.email.toLowerCase())?.logged || 0,
          perDay: hours.get(person.email.toLowerCase())?.perDay ?? null,
        }))
        .filter((person) => person.tasksDone || person.published)
        .sort((a, b) => b.tasksDone + b.published - (a.tasksDone + a.published) || a.name.localeCompare(b.name));
    }
  }

  return {
    month,
    label: monthLabel(month),
    clients,
    people,
    blogPublished,
    applications: { jobs, cohort, hackathons },
    outreach: added !== null && won !== null ? { added, won } : null,
    review:
      "error" in review
        ? null
        : review.reviews
            .filter((item) => item.status !== "on_track")
            .map((item) => ({ name: item.name, status: item.status as "follow_up" | "watch", reasons: reviewLine(item) })),
  };
}
