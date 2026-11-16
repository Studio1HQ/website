import "server-only";
import { inScope, type ClientScope } from "@/lib/internal/clients/scope";
import { cache } from "react";
import { deleteRows, inList, insertRow, selectRows, updateRows } from "@/lib/supabase-server";
import { listMembers } from "@/lib/internal/members";
import { OWNERS } from "@/lib/internal/roles";
import { thisMonth, type Deliverable, type DeliverableStatus } from "@/lib/internal/clients/schema";
import { readSnapshot, type ReportDeliverable, type ReportMove } from "@/lib/internal/tasks/report";
import {
  TASKS_MIGRATION_HINT,
  isTaskArea,
  isTaskStatus,
  isUuid,
  type CommunityCard,
  type EngagementLabel,
  type Report,
  type ReportPeriod,
  type ReportSnapshot,
  type ReportStatus,
  type Task,
  type TaskResult,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

/**
 * Reads and writes for Tasks. No session checks here: pages and actions
 * check lib/internal/tasks/access.ts first. Server only (service-role key).
 *
 * Client deliverables and community tasks are read where they live
 * (client_deliverables, community_tasks); this file never copies them.
 */

export const TABLES = {
  tasks: "team_tasks",
  logs: "team_work_logs",
  reports: "team_reports",
} as const;

export type Loaded<T> = { ok: true; rows: T[] } | { ok: false; missing: boolean; message: string };

const MISSING = /PGRST205|PGRST204|42P01|42703|does not exist|Could not find the table/i;

function failed<T>(table: string, message: string, what: string): Loaded<T> {
  const missing = MISSING.test(message);
  if (!missing) console.error(`[tasks] reading ${table} failed: ${message}`);
  return { ok: false, missing, message: missing ? TASKS_MIGRATION_HINT : `Couldn't load ${what}.` };
}

const EMAIL = /^[^\s@(),"]+@[^\s@(),"]+$/;

function emailsOk(emails: readonly string[]) {
  return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter((email) => EMAIL.test(email)))].sort();
}

/** Midnight IST of a day, as an ISO time (for timestamp filters). */
export function istMidnight(day: string) {
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

/* ------------------------------------------------------------- mapping */

const text = (value: unknown) => (typeof value === "string" ? value : "");
const textOrNull = (value: unknown) => (typeof value === "string" && value ? value : null);
const day = (value: unknown) => (typeof value === "string" && value ? value.slice(0, 10) : null);

function toTask(row: Record<string, unknown>): Task | null {
  if (typeof row.id !== "string" || typeof row.email !== "string") return null;
  return {
    id: row.id,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    created_by: text(row.created_by),
    updated_by: textOrNull(row.updated_by),
    email: row.email,
    title: text(row.title),
    notes: text(row.notes),
    status: isTaskStatus(row.status) ? row.status : "todo",
    area: isTaskArea(row.area) ? row.area : "other",
    engagement_id: textOrNull(row.engagement_id),
    deliverable_id: textOrNull(row.deliverable_id),
    due_on: day(row.due_on),
    done_on: day(row.done_on),
    blocked: row.blocked === true,
    block_reason: text(row.block_reason),
  };
}

function toLog(row: Record<string, unknown>): WorkLog | null {
  if (typeof row.id !== "string" || typeof row.email !== "string" || typeof row.day !== "string") return null;
  return {
    id: row.id,
    created_at: text(row.created_at),
    created_by: text(row.created_by),
    email: row.email,
    day: row.day.slice(0, 10),
    minutes: typeof row.minutes === "number" ? row.minutes : 0,
    note: text(row.note),
    task_id: textOrNull(row.task_id),
    deliverable_id: textOrNull(row.deliverable_id),
    community_task_id: textOrNull(row.community_task_id),
    title: text(row.title),
    area: isTaskArea(row.area) ? row.area : "other",
    engagement_id: textOrNull(row.engagement_id),
  };
}

const REPORT_STATUSES: readonly ReportStatus[] = ["draft", "submitted", "returned", "seen"];

function toReport(row: Record<string, unknown>): Report | null {
  if (typeof row.id !== "string" || typeof row.email !== "string") return null;
  return {
    id: row.id,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    email: row.email,
    period: row.period === "month" ? "month" : "week",
    starts_on: day(row.starts_on) ?? "",
    ends_on: day(row.ends_on) ?? "",
    status: REPORT_STATUSES.includes(row.status as ReportStatus) ? (row.status as ReportStatus) : "draft",
    highlights: text(row.highlights),
    blockers: text(row.blockers),
    next_plan: text(row.next_plan),
    snapshot: readSnapshot(row.snapshot),
    submitted_at: textOrNull(row.submitted_at),
    reviewed_by: textOrNull(row.reviewed_by),
    reviewed_at: textOrNull(row.reviewed_at),
    founder_note: text(row.founder_note),
  };
}

function mapRows<T>(rows: Record<string, unknown>[], fn: (row: Record<string, unknown>) => T | null) {
  return rows.map(fn).filter((row): row is T => row !== null);
}

/* --------------------------------------------------------------- tasks */

/**
 * These people's tasks: every open one, plus the ones done between `from`
 * and `to` (both days included; leave both out for every done one).
 */
export async function listTasks(options: { emails: readonly string[]; from?: string; to?: string }): Promise<Loaded<Task>> {
  const emails = emailsOk(options.emails);
  if (!emails.length) return { ok: true, rows: [] };
  const query = new URLSearchParams({ select: "*", email: inList(emails), order: "due_on.asc.nullslast,created_at.asc", limit: "3000" });
  if (options.from && options.to) query.set("or", `(status.neq.done,and(done_on.gte.${options.from},done_on.lte.${options.to}))`);
  const result = await selectRows(TABLES.tasks, query);
  if (!result.ok) return failed(TABLES.tasks, result.message, "tasks");
  return { ok: true, rows: mapRows(result.rows, toTask) };
}

/** Tasks that are steps of these deliverables (anyone's). */
export async function tasksForDeliverables(ids: readonly string[]): Promise<Loaded<Task>> {
  const valid = [...new Set(ids.filter(isUuid))];
  if (!valid.length) return { ok: true, rows: [] };
  const result = await selectRows(
    TABLES.tasks,
    new URLSearchParams({ select: "*", deliverable_id: `in.(${valid.slice(0, 200).join(",")})`, limit: "2000" }),
  );
  if (!result.ok) return failed(TABLES.tasks, result.message, "tasks");
  return { ok: true, rows: mapRows(result.rows, toTask) };
}

/** Tasks on these client engagements (anyone's): open ones, and the ones done between two days. */
export async function tasksForEngagements(ids: readonly string[], from: string, to: string): Promise<Loaded<Task>> {
  const valid = [...new Set(ids.filter(isUuid))].sort();
  if (!valid.length) return { ok: true, rows: [] };
  const result = await selectRows(
    TABLES.tasks,
    new URLSearchParams({
      select: "*",
      engagement_id: `in.(${valid.slice(0, 200).join(",")})`,
      or: `(status.neq.done,and(done_on.gte.${from},done_on.lte.${to}))`,
      order: "done_on.desc.nullsfirst,created_at.asc",
      limit: "3000",
    }),
  );
  if (!result.ok) return failed(TABLES.tasks, result.message, "tasks");
  return { ok: true, rows: mapRows(result.rows, toTask) };
}

export async function getTask(id: string): Promise<Task | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows(TABLES.tasks, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!result.ok) return "error";
  return result.rows[0] ? toTask(result.rows[0]) : null;
}

function writeFailed(table: string, message: string): TaskResult {
  if (MISSING.test(message)) return { ok: false, message: TASKS_MIGRATION_HINT };
  // Before 20261116120000_tasks_optional_time.sql runs, every line needs a time.
  if (/null value in column \\?"minutes\\?"/.test(message))
    return { ok: false, message: "Pick a time for now: lines without one work once the optional-time update has run." };
  console.error(`[tasks] writing ${table} failed: ${message}`);
  return { ok: false, message: "Couldn't save that. Try again in a minute." };
}

/** Inserts a row with a new id; returns the id. */
async function insertWithId(table: string, row: Record<string, unknown>): Promise<TaskResult> {
  const id = crypto.randomUUID();
  const result = await insertRow(table, { id, ...row });
  if (!result.ok) return writeFailed(table, result.message);
  return { ok: true, id };
}

export function insertTask(row: Record<string, unknown>) {
  return insertWithId(TABLES.tasks, row);
}

/**
 * Changes a task. `unless` holds the write to an earlier read (e.g. the
 * status it had), so two people moving one card can't both win.
 */
export async function updateTask(id: string, patch: Record<string, unknown>, by: string, unless: Record<string, string> = {}): Promise<TaskResult> {
  const query = new URLSearchParams({ id: `eq.${id}` });
  for (const [key, value] of Object.entries(unless)) query.set(key, value);
  const result = await updateRows(TABLES.tasks, query, { ...patch, updated_by: by });
  if (!result.ok) return writeFailed(TABLES.tasks, result.message);
  if (result.count === 0) return { ok: false, message: "It changed just now. Reload to see where it is." };
  return { ok: true, id };
}

export async function deleteTask(id: string): Promise<TaskResult> {
  const result = await deleteRows(TABLES.tasks, new URLSearchParams({ id: `eq.${id}` }));
  if (!result.ok) return writeFailed(TABLES.tasks, result.message);
  return { ok: true };
}

/* ---------------------------------------------------------------- logs */

/** These people's (or everyone's, with no emails) logs between two days. */
export async function listLogs(options: { emails?: readonly string[]; from: string; to: string }): Promise<Loaded<WorkLog>> {
  const query = new URLSearchParams({ select: "*", order: "day.asc,created_at.asc", limit: "10000" });
  if (options.emails) {
    const emails = emailsOk(options.emails);
    if (!emails.length) return { ok: true, rows: [] };
    query.set("email", inList(emails));
  }
  query.append("day", `gte.${options.from}`);
  query.append("day", `lte.${options.to}`);
  const result = await selectRows(TABLES.logs, query);
  if (!result.ok) return failed(TABLES.logs, result.message, "work logs");
  return { ok: true, rows: mapRows(result.rows, toLog) };
}

/** Logs on these deliverables (anyone's), for the client side's hours. */
export async function logsForDeliverables(ids: readonly string[]): Promise<Loaded<WorkLog>> {
  const valid = [...new Set(ids.filter(isUuid))].sort();
  if (!valid.length) return { ok: true, rows: [] };
  const rows: WorkLog[] = [];
  for (let start = 0; start < valid.length; start += 100) {
    const result = await selectRows(
      TABLES.logs,
      new URLSearchParams({ select: "*", deliverable_id: `in.(${valid.slice(start, start + 100).join(",")})`, limit: "10000" }),
    );
    if (!result.ok) return failed(TABLES.logs, result.message, "work logs");
    rows.push(...mapRows(result.rows, toLog));
  }
  return { ok: true, rows };
}

/** Logs for these engagements (anyone's) between two days. */
export async function logsForEngagements(ids: readonly string[], from: string, to: string): Promise<Loaded<WorkLog>> {
  const valid = [...new Set(ids.filter(isUuid))].sort();
  if (!valid.length) return { ok: true, rows: [] };
  const query = new URLSearchParams({ select: "*", engagement_id: `in.(${valid.slice(0, 200).join(",")})`, limit: "10000" });
  query.append("day", `gte.${from}`);
  query.append("day", `lte.${to}`);
  const result = await selectRows(TABLES.logs, query);
  if (!result.ok) return failed(TABLES.logs, result.message, "work logs");
  return { ok: true, rows: mapRows(result.rows, toLog) };
}

export async function getLog(id: string): Promise<WorkLog | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows(TABLES.logs, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!result.ok) return "error";
  return result.rows[0] ? toLog(result.rows[0]) : null;
}

export function insertLog(row: Record<string, unknown>) {
  return insertWithId(TABLES.logs, row);
}

export async function updateLog(id: string, patch: Record<string, unknown>): Promise<TaskResult> {
  const result = await updateRows(TABLES.logs, new URLSearchParams({ id: `eq.${id}` }), patch);
  if (!result.ok) return writeFailed(TABLES.logs, result.message);
  if (result.count === 0) return { ok: false, message: "That entry isn't there any more. Reload the page." };
  return { ok: true, id };
}

export async function deleteLog(id: string): Promise<TaskResult> {
  const result = await deleteRows(TABLES.logs, new URLSearchParams({ id: `eq.${id}` }));
  if (!result.ok) return writeFailed(TABLES.logs, result.message);
  return { ok: true };
}

/* ------------------------------------------------------------- reports */

export async function listReports(options: {
  emails?: readonly string[];
  period?: ReportPeriod;
  starts?: readonly string[];
  statuses?: readonly ReportStatus[];
  limit?: number;
}): Promise<Loaded<Report>> {
  const query = new URLSearchParams({ select: "*", order: "starts_on.desc,submitted_at.desc.nullslast", limit: String(options.limit ?? 500) });
  if (options.emails) {
    const emails = emailsOk(options.emails);
    if (!emails.length) return { ok: true, rows: [] };
    query.set("email", inList(emails));
  }
  if (options.period) query.set("period", `eq.${options.period}`);
  if (options.starts) {
    if (!options.starts.length) return { ok: true, rows: [] };
    query.set("starts_on", inList([...options.starts]));
  }
  if (options.statuses) {
    if (!options.statuses.length) return { ok: true, rows: [] };
    query.set("status", `in.(${options.statuses.join(",")})`);
  }
  const result = await selectRows(TABLES.reports, query);
  if (!result.ok) return failed(TABLES.reports, result.message, "reports");
  return { ok: true, rows: mapRows(result.rows, toReport) };
}

export async function getReport(id: string): Promise<Report | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows(TABLES.reports, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!result.ok) return "error";
  return result.rows[0] ? toReport(result.rows[0]) : null;
}

export async function findReport(email: string, period: ReportPeriod, start: string): Promise<Report | null | "error"> {
  const result = await selectRows(
    TABLES.reports,
    new URLSearchParams({ select: "*", email: `eq.${email}`, period: `eq.${period}`, starts_on: `eq.${start}`, limit: "1" }),
  );
  if (!result.ok) return "error";
  return result.rows[0] ? toReport(result.rows[0]) : null;
}

export function insertReport(row: Record<string, unknown>) {
  return insertWithId(TABLES.reports, row);
}

/** Changes a report while it's still in one of `from` (statuses). */
export async function updateReport(id: string, patch: Record<string, unknown>, from: readonly ReportStatus[]): Promise<TaskResult> {
  const result = await updateRows(
    TABLES.reports,
    new URLSearchParams({ id: `eq.${id}`, status: `in.(${from.join(",")})` }),
    patch,
  );
  if (!result.ok) return writeFailed(TABLES.reports, result.message);
  if (result.count === 0) return { ok: false, message: "That report changed just now. Reload the page." };
  return { ok: true, id };
}

export type { ReportSnapshot };

/* ------------------------------------------------- client work, read only */

const DELIVERABLE_COLUMNS =
  "id,engagement_id,cycle_id,title,kind,owner,reviewer,status,status_changed_at,published_at,blocked,block_reason,waits_on,blocked_at,week,due_on,client_due_on,size,draft_url,review_url,pr_url,published_url,notes,created_at,updated_at,created_by,updated_by,scope_line_id";

function clientsFailed<T>(message: string): Loaded<T> {
  const missing = MISSING.test(message);
  if (!missing) console.error(`[tasks] reading client work failed: ${message}`);
  return { ok: false, missing, message: missing ? "Client work isn't set up yet." : "Couldn't load client work." };
}

/**
 * The deliverables on someone's board: the ones they own that aren't
 * published, plus the ones published since `since` (a day).
 */
export async function ownedDeliverables(email: string, since: string): Promise<Loaded<Deliverable>> {
  if (!EMAIL.test(email)) return { ok: true, rows: [] };
  const result = await selectRows<Deliverable>(
    "client_deliverables",
    new URLSearchParams({
      select: DELIVERABLE_COLUMNS,
      owner: `eq.${email}`,
      or: `(status.neq.published,published_at.gte.${istMidnight(since)})`,
      order: "due_on.asc.nullslast,created_at.asc",
      limit: "500",
    }),
  );
  return result.ok ? { ok: true, rows: result.rows } : clientsFailed(result.message);
}

/** Deliverables waiting on this person's internal review. */
export async function reviewingDeliverables(email: string): Promise<Loaded<Deliverable>> {
  if (!EMAIL.test(email)) return { ok: true, rows: [] };
  const result = await selectRows<Deliverable>(
    "client_deliverables",
    new URLSearchParams({
      select: DELIVERABLE_COLUMNS,
      reviewer: `eq.${email}`,
      status: "eq.internal_review",
      order: "due_on.asc.nullslast",
      limit: "200",
    }),
  );
  return result.ok ? { ok: true, rows: result.rows } : clientsFailed(result.message);
}

export async function deliverablesByIds(ids: readonly string[]): Promise<Loaded<Deliverable>> {
  const valid = [...new Set(ids.filter(isUuid))].sort();
  if (!valid.length) return { ok: true, rows: [] };
  const rows: Deliverable[] = [];
  for (let start = 0; start < valid.length; start += 100) {
    const result = await selectRows<Deliverable>(
      "client_deliverables",
      new URLSearchParams({ select: DELIVERABLE_COLUMNS, id: `in.(${valid.slice(start, start + 100).join(",")})`, limit: "100" }),
    );
    if (!result.ok) return clientsFailed(result.message);
    rows.push(...result.rows);
  }
  return { ok: true, rows };
}

/** One deliverable, fresh. */
export async function getDeliverableRow(id: string): Promise<Deliverable | null | "error"> {
  const result = await deliverablesByIds([id]);
  if (!result.ok) return "error";
  return result.rows[0] ?? null;
}

/** As a report wants it. */
export function reportDeliverable(deliverable: Deliverable): ReportDeliverable {
  return {
    id: deliverable.id,
    title: deliverable.title,
    status: deliverable.status as DeliverableStatus,
    engagement_id: deliverable.engagement_id,
    published_url: deliverable.published_url,
    published_at: deliverable.published_at,
    due_on: deliverable.due_on,
    blocked: deliverable.blocked,
    block_reason: deliverable.block_reason,
  };
}

/** Status moves this person made on client deliverables between two days (IST). */
export async function movesBy(email: string, from: string, to: string): Promise<Loaded<ReportMove & { deliverable_id: string }>> {
  if (!EMAIL.test(email)) return { ok: true, rows: [] };
  const query = new URLSearchParams({
    select: "deliverable_id,from_status,to_status,at",
    by: `eq.${email}`,
    kind: "eq.status",
    order: "at.asc",
    limit: "1000",
  });
  query.append("at", `gte.${istMidnight(from)}`);
  query.append("at", `lt.${istMidnight(nextDay(to))}`);
  const events = await selectRows<{ deliverable_id: string; from_status: string | null; to_status: string | null; at: string }>(
    "client_status_events",
    query,
  );
  if (!events.ok) return clientsFailed(events.message);
  const deliverables = await deliverablesByIds(events.rows.map((event) => event.deliverable_id));
  if (!deliverables.ok) return deliverables;
  const byId = new Map(deliverables.rows.map((row) => [row.id, row]));
  return {
    ok: true,
    rows: events.rows
      .filter((event) => byId.has(event.deliverable_id) && event.from_status !== event.to_status)
      .map((event) => ({
        deliverable_id: event.deliverable_id,
        title: byId.get(event.deliverable_id)?.title ?? "",
        engagement_id: byId.get(event.deliverable_id)?.engagement_id ?? null,
        from_status: event.from_status,
        to_status: event.to_status,
        at: event.at,
      })),
  };
}

function nextDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Engagement id → client and name, for labels. Cached for the request. */
export const engagementLabels = cache(async (): Promise<Map<string, EngagementLabel>> => {
  const [engagements, clients] = await Promise.all([
    selectRows<{ id: string; client_id: string; name: string; type: string }>(
      "client_engagements",
      new URLSearchParams({ select: "id,client_id,name,type", limit: "2000" }),
    ),
    selectRows<{ id: string; name: string; slug: string }>(
      "client_accounts",
      new URLSearchParams({ select: "id,name,slug", limit: "2000" }),
    ),
  ]);
  const map = new Map<string, EngagementLabel>();
  if (!engagements.ok || !clients.ok) return map;
  const byId = new Map(clients.rows.map((client) => [client.id, client]));
  for (const engagement of engagements.rows) {
    const client = byId.get(engagement.client_id);
    map.set(engagement.id, {
      id: engagement.id,
      client: client?.name ?? "A client",
      name: engagement.name,
      internal: engagement.type === "internal",
      clientSlug: client?.slug,
      clientId: engagement.client_id,
    });
  }
  return map;
});

/** What the "For" picker offers: engagements still running, with this month's cycle (if there is one). */
export type EngagementChoice = EngagementLabel & {
  clientSlug: string;
  /** This month's cycle: where a new deliverable goes. Null when the month isn't started. */
  cycleId: string | null;
};

export const engagementChoices = cache(async (): Promise<EngagementChoice[]> => {
  const [engagements, clients, cycles] = await Promise.all([
    selectRows<{ id: string; client_id: string; name: string; type: string }>(
      "client_engagements",
      new URLSearchParams({ select: "id,client_id,name,type", status: "in.(active,planned)", order: "name.asc", limit: "500" }),
    ),
    selectRows<{ id: string; name: string; slug: string; archived_at: string | null }>(
      "client_accounts",
      new URLSearchParams({ select: "id,name,slug,archived_at", limit: "2000" }),
    ),
    selectRows<{ id: string; engagement_id: string; state: string }>(
      "client_cycles",
      new URLSearchParams({ select: "id,engagement_id,state", month: `eq.${thisMonth()}`, limit: "1000" }),
    ),
  ]);
  if (!engagements.ok || !clients.ok || !cycles.ok) return [];
  const byClient = new Map(clients.rows.map((client) => [client.id, client]));
  const cycleOf = new Map(cycles.rows.filter((cycle) => cycle.state !== "closed").map((cycle) => [cycle.engagement_id, cycle.id]));
  return engagements.rows
    .filter((engagement) => byClient.has(engagement.client_id) && !byClient.get(engagement.client_id)?.archived_at)
    .map((engagement) => ({
      id: engagement.id,
      client: byClient.get(engagement.client_id)?.name ?? "A client",
      clientSlug: byClient.get(engagement.client_id)?.slug ?? "",
      clientId: engagement.client_id,
      name: engagement.name,
      internal: engagement.type === "internal",
      cycleId: cycleOf.get(engagement.id) ?? null,
    }))
    .sort((a, b) => Number(b.internal) - Number(a.internal) || a.client.localeCompare(b.client) || a.name.localeCompare(b.name));
});

/**
 * The engagements this person may tag work with: their clients (all of
 * them unless an admin picked some on People) and Studio1's own work.
 */
export function choicesFor<T extends Pick<EngagementLabel, "clientId" | "internal">>(
  scope: ClientScope,
  choices: readonly T[],
): T[] {
  return choices.filter((choice) => choice.internal || inScope(scope, choice.clientId));
}

/* ---------------------------------------------- community tasks, read only */

const COMMUNITY_COLUMNS = "id,title,details,owner,due_on,priority,status,completed_at";

/** Community tasks someone owns: open ones, and the ones done since `since`. */
export async function ownedCommunityTasks(email: string, since: string): Promise<Loaded<CommunityCard>> {
  if (!EMAIL.test(email)) return { ok: true, rows: [] };
  const result = await selectRows<CommunityCard>(
    "community_tasks",
    new URLSearchParams({
      select: COMMUNITY_COLUMNS,
      owner: `ilike.${email}`,
      or: `(status.neq.done,completed_at.gte.${istMidnight(since)})`,
      order: "due_on.asc.nullslast,created_at.asc",
      limit: "500",
    }),
  );
  if (!result.ok) {
    const missing = MISSING.test(result.message);
    if (!missing) console.error(`[tasks] reading community tasks failed: ${result.message}`);
    return { ok: false, missing, message: "Couldn't load community tasks." };
  }
  return { ok: true, rows: result.rows };
}

export async function getCommunityTask(id: string): Promise<CommunityCard | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows<CommunityCard>(
    "community_tasks",
    new URLSearchParams({ select: COMMUNITY_COLUMNS, id: `eq.${id}`, limit: "1" }),
  );
  if (!result.ok) return "error";
  return result.rows[0] ?? null;
}

/* -------------------------------------------------------------- people */

/**
 * The "guarded" people: the founders and anyone with Admin. Only they, the
 * founders and the founder's associate see their tasks.
 *
 * Fails closed: if the member list can't be read this throws, rather than
 * answering "just the founders" and letting other admins' work show.
 * Callers treat a throw as "everyone else is guarded".
 */
export const guardedEmails = cache(async (): Promise<Set<string>> => {
  const members = await listMembers();
  if (!members) throw new Error("Couldn't read the member list to tell who is an admin.");
  const admins = members
    .filter((member) => member.status === "active" && member.roles.includes("admin"))
    .map((member) => member.email);
  return new Set([...OWNERS, ...admins].map((email) => email.toLowerCase()));
});
