import "server-only";
import { selectRows } from "@/lib/supabase-server";
import type { Staff } from "@/lib/internal/session";
import { listPeople } from "@/lib/internal/team/people";
import { displayName } from "@/lib/internal/team/shared";
import { isMissingTable, type Loaded } from "@/lib/internal/community/data";
import { isUuid } from "@/lib/internal/clients/clean";
import { TABLES, loadPeople } from "@/lib/internal/clients/data";
import {
  CLIENTS_MIGRATION_HINT,
  addDays,
  namesFrom,
  todayKey,
  weekEnd,
} from "@/lib/internal/clients/schema";
import {
  weekLines,
  type WeekDeliverable,
  type WeekEvent,
  type WeekLine,
  type WeekTask,
} from "@/lib/internal/clients/week";
import { canGiveTask, canSeeWorkOf } from "@/lib/internal/tasks/access";
import { taskViewer } from "@/lib/internal/tasks/load";
import { guardedEmails, logsForEngagements } from "@/lib/internal/tasks/data";

/**
 * Reads for a client's week (server only; pages call requireClients()
 * first): the client's deliverables that could matter for the week, their
 * status events in it, and the employees' tasks and time logs on the
 * client's engagements (team_tasks, team_work_logs). The grouping itself is
 * weekLines() in week.ts.
 *
 * The Team tasks tables may not exist yet: then `tasks` says so and the
 * week is built from deliverables alone. Never throws.
 *
 * Tasks and logs follow the tracker's own privacy rule: the founders' and
 * admins' work shows only to the founders and to themselves.
 */

const TASKS_TABLE = "team_tasks";
const CHUNK = 100;

/** Midnight IST of a day, as an ISO time. */
function istMidnight(day: string) {
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

function chunks(ids: readonly string[]) {
  const valid = [...new Set(ids.filter(isUuid))].sort();
  const out: string[][] = [];
  for (let start = 0; start < valid.length; start += CHUNK)
    out.push(valid.slice(start, start + CHUNK));
  return out;
}

function failed<T>(what: string, message: string, hint: string): Loaded<T> {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[clients] reading ${what} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing ? hint : `Couldn't load ${what}.`,
  };
}

const DELIVERABLE_COLUMNS =
  "id,engagement_id,title,kind,owner,status,status_changed_at,published_at,published_url,blocked,block_reason,waits_on,week,due_on,client_due_on";

/**
 * Deliverables of these engagements that can show in a week starting
 * `week`: every one not yet live, and the ones published or moved since
 * the week began.
 */
async function weekDeliverables(
  engagementIds: readonly string[],
  week: string,
): Promise<Loaded<WeekDeliverable>> {
  const since = istMidnight(week);
  const rows: WeekDeliverable[] = [];
  for (const ids of chunks(engagementIds)) {
    const result = await selectRows<WeekDeliverable>(
      TABLES.deliverables,
      new URLSearchParams({
        select: DELIVERABLE_COLUMNS,
        engagement_id: `in.(${ids.join(",")})`,
        or: `(status.neq.published,published_at.gte.${since},status_changed_at.gte.${since})`,
        order: "due_on.asc.nullslast,created_at.asc",
        limit: "3000",
      }),
    );
    if (!result.ok)
      return failed("deliverables", result.message, CLIENTS_MIGRATION_HINT);
    rows.push(...result.rows);
  }
  return { ok: true, rows };
}

/** Status events on these deliverables during the week. */
async function weekEvents(
  deliverableIds: readonly string[],
  week: string,
): Promise<Loaded<WeekEvent>> {
  const rows: WeekEvent[] = [];
  for (const ids of chunks(deliverableIds)) {
    const query = new URLSearchParams({
      select: "deliverable_id,at,kind,to_status",
      deliverable_id: `in.(${ids.join(",")})`,
      limit: "5000",
    });
    query.append("at", `gte.${istMidnight(week)}`);
    query.append("at", `lt.${istMidnight(addDays(weekEnd(week), 1))}`);
    const result = await selectRows<WeekEvent>(TABLES.events, query);
    if (!result.ok)
      return failed("status changes", result.message, CLIENTS_MIGRATION_HINT);
    rows.push(...result.rows);
  }
  return { ok: true, rows };
}

/** Deliverable titles by id (for tasks that are steps of older deliverables). */
async function deliverableTitles(ids: readonly string[]) {
  const titles = new Map<string, string>();
  for (const chunk of chunks(ids)) {
    const result = await selectRows<{ id: string; title: string }>(
      TABLES.deliverables,
      new URLSearchParams({
        select: "id,title",
        id: `in.(${chunk.join(",")})`,
        limit: String(CHUNK),
      }),
    );
    if (result.ok)
      for (const row of result.rows) titles.set(row.id, row.title);
  }
  return titles;
}

const TASK_STATUSES = new Set(["todo", "doing", "review", "done"]);

function toTask(row: Record<string, unknown>): WeekTask | null {
  if (typeof row.id !== "string" || typeof row.email !== "string") return null;
  const day = (value: unknown) =>
    typeof value === "string" && value ? value.slice(0, 10) : null;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    id: row.id,
    email: row.email.toLowerCase(),
    title: text(row.title),
    status: TASK_STATUSES.has(row.status as string)
      ? (row.status as WeekTask["status"])
      : "todo",
    engagement_id: typeof row.engagement_id === "string" ? row.engagement_id : null,
    deliverable_id:
      typeof row.deliverable_id === "string" ? row.deliverable_id : null,
    due_on: day(row.due_on),
    done_on: day(row.done_on),
    blocked: row.blocked === true,
    block_reason: text(row.block_reason),
  };
}

const TASKS_HINT =
  "Tasks show here once the Team tasks area is switched on (supabase/migrations/20261116100000_team_tasks.sql).";

/** Tasks on these engagements: every open one, and the ones done in the week. */
async function weekTasks(
  engagementIds: readonly string[],
  week: string,
): Promise<Loaded<WeekTask>> {
  const rows: WeekTask[] = [];
  for (const ids of chunks(engagementIds)) {
    const result = await selectRows(
      TASKS_TABLE,
      new URLSearchParams({
        select:
          "id,email,title,status,engagement_id,deliverable_id,due_on,done_on,blocked,block_reason",
        engagement_id: `in.(${ids.join(",")})`,
        or: `(status.neq.done,and(done_on.gte.${week},done_on.lte.${weekEnd(week)}))`,
        order: "due_on.asc.nullslast,created_at.asc",
        limit: "3000",
      }),
    );
    if (!result.ok) return failed("tasks", result.message, TASKS_HINT);
    for (const row of result.rows) {
      const task = toTask(row);
      if (task) rows.push(task);
    }
  }
  return { ok: true, rows };
}

export type ClientWeekData =
  | {
      ok: true;
      week: string;
      lines: WeekLine[];
      /**
       * "ready", "missing" (the Team tasks tables aren't there yet: the
       * week is deliverables only) or "failed" (couldn't read them).
       */
      tasks: "ready" | "missing" | "failed";
      /** Minutes logged on these engagements in the week, per person; null when logs can't be read. */
      time: { email: string; name: string; minutes: number }[] | null;
      /** email → name, for the people on the lines. */
      names: Record<string, string>;
      /** Deliverables not yet live, for "Part of" when adding a task. */
      open: { id: string; title: string; engagementId: string }[];
    }
  | { ok: false; missing: boolean; message: string };

/**
 * A week of work on some engagements (one client's, or every active
 * client's for the index). `time` reads the work logs as well.
 */
export async function loadClientWeek(input: {
  engagementIds: readonly string[];
  week: string;
  staff: Pick<Staff, "email" | "status" | "roles">;
  time?: boolean;
}): Promise<ClientWeekData> {
  const { week } = input;
  const today = todayKey();
  const ids = input.engagementIds.filter(isUuid);
  if (!ids.length)
    return {
      ok: true,
      week,
      lines: [],
      tasks: "ready",
      time: input.time ? [] : null,
      names: {},
      open: [],
    };

  const [deliverables, tasks, logs, guarded, people] = await Promise.all([
    weekDeliverables(ids, week),
    weekTasks(ids, week),
    input.time
      ? logsForEngagements(ids, week, weekEnd(week)).catch(() => null)
      : Promise.resolve(null),
    guardedEmails().catch(() => null),
    loadPeople(),
  ]);
  if (!deliverables.ok) return deliverables;

  // The owner's rule (15 Nov 2026): a task for this client shows to everyone
  // who can open the client, the founders' included, since it is the client's
  // work. Hours are more private: a founder's or an admin's hours show only
  // to the founders, the founder's associate (Team tasks: view) and
  // themselves.
  // If the founders-and-admins list can't be read, everyone counts as on it.
  const everyone = { has: () => true } as unknown as ReadonlySet<string>;
  const seesHours = (email: string) =>
    canSeeWorkOf(input.staff, email, guarded ?? everyone);

  const taskRows = tasks.ok ? tasks.rows : [];
  const [events, titles] = await Promise.all([
    weekEvents(
      deliverables.rows.map((row) => row.id),
      week,
    ),
    deliverableTitles(
      taskRows
        .map((task) => task.deliverable_id)
        .filter(
          (id): id is string =>
            Boolean(id) && !deliverables.rows.some((row) => row.id === id),
        ),
    ),
  ]);

  const lines = weekLines({
    week,
    today,
    tasks: taskRows,
    deliverables: deliverables.rows,
    events: events.ok ? events.rows : [],
    titles,
  });

  // Minutes per person.
  let time: { email: string; minutes: number }[] | null = null;
  if (logs && logs.ok) {
    const totals = new Map<string, number>();
    for (const log of logs.rows) {
      if (!seesHours(log.email)) continue;
      const email = log.email.toLowerCase();
      totals.set(email, (totals.get(email) ?? 0) + (log.minutes || 0));
    }
    time = [...totals.entries()]
      .filter(([, minutes]) => minutes > 0)
      .map(([email, minutes]) => ({ email, minutes }))
      .sort((a, b) => b.minutes - a.minutes || a.email.localeCompare(b.email));
  }

  // Names: the client capacity list, then the team list.
  const names: Record<string, string> = people.ok ? namesFrom(people.rows) : {};
  const emails = new Set<string>();
  for (const line of lines) if (line.who) emails.add(line.who.toLowerCase());
  for (const row of time ?? []) emails.add(row.email);
  const unnamed = [...emails].filter((email) => !names[email]);
  if (unnamed.length) {
    const team = await listPeople({ emails: unnamed });
    if (team.ok)
      for (const person of team.people)
        names[person.email.toLowerCase()] = displayName(person);
  }

  return {
    ok: true,
    week,
    lines,
    tasks: tasks.ok ? "ready" : tasks.missing ? "missing" : "failed",
    time: time
      ? time.map((row) => ({
          ...row,
          name: names[row.email] || displayName({ email: row.email }),
        }))
      : null,
    names,
    open: deliverables.rows
      .filter((row) => row.status !== "published")
      .map((row) => ({
        id: row.id,
        title: row.title,
        engagementId: row.engagement_id,
      })),
  };
}

/**
 * Who this person may give a task to from a client's workspace: the
 * tracker's own rule (canGiveTask): themselves always; anyone active on the
 * team list for a founder or the founder's associate; anyone except the
 * founders and other admins for an admin. Empty when the team list can't be
 * read. If the guarded list can't be read, everyone else counts as guarded.
 */
export async function taskAssignees(
  staff: Staff,
): Promise<{ email: string; name: string; me: boolean }[]> {
  const [people, guarded] = await Promise.all([
    listPeople({ activeOnly: true }),
    guardedEmails().catch(() => null),
  ]);
  if (!people.ok) return [];
  const viewer = taskViewer(staff);
  const me = staff.email.toLowerCase();
  return people.people
    .filter((person) =>
      canGiveTask(
        viewer,
        person.email,
        guarded ? guarded.has(person.email.toLowerCase()) : true,
      ),
    )
    .map((person) => ({
      email: person.email.toLowerCase(),
      name: displayName(person),
      me: person.email.toLowerCase() === me,
    }))
    .sort(
      (a, b) => Number(b.me) - Number(a.me) || a.name.localeCompare(b.name),
    );
}
