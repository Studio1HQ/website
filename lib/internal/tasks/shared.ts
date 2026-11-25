/**
 * Tasks: types, option lists and small helpers both the server and client
 * components use. No server imports here.
 *
 * Tables: supabase/migrations/20261116100000_team_tasks.sql.
 *
 * One rule runs through all of it: a piece of work lives in one place.
 * A person's own tasks live in team_tasks; client deliverables stay in
 * client work and community tasks in the community area. The board, the
 * day, week and month views and the reports read all three, so nothing is
 * entered twice, and moving a client card moves the deliverable itself.
 *
 * Days are "YYYY-MM-DD" in IST, weeks start on Monday (the Monday's day
 * key), months are "YYYY-MM".
 */

import {
  DELIVERABLE_STATUSES,
  addDays,
  labelOf,
  monthOf,
  shiftMonth,
  weekStart,
  type DeliverableStatus,
} from "@/lib/internal/clients/schema";

/* --------------------------------------------------------------- options */

export type Tone = "stone" | "sky" | "violet" | "emerald" | "amber" | "rose";

export const TASK_STATUSES = [
  { value: "todo", label: "Not started", tone: "stone" },
  { value: "doing", label: "In progress", tone: "sky" },
  { value: "review", label: "In review", tone: "violet" },
  { value: "done", label: "Done", tone: "emerald" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];
export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];
/** The board's columns are the task statuses. */
export type Column = TaskStatus;

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.some((option) => option.value === value);
}

export function statusLabel(status: TaskStatus) {
  return TASK_STATUSES.find((option) => option.value === status)?.label ?? status;
}

/**
 * Whether the person still owes it: Not started or In progress. In review
 * is handed in (it waits on the reviewer), so like Done it is never late
 * and isn't "due today".
 */
export function isOwed(status: TaskStatus) {
  return status === "todo" || status === "doing";
}

/** Late: still owed and its due day has gone by. */
export function isTaskLate(task: { status: TaskStatus; due_on: string | null }, today: string) {
  return isOwed(task.status) && task.due_on !== null && task.due_on < today;
}

/**
 * How much a task matters today. Medium is the default and stays quiet on
 * cards; Top and Low show. Lists put Top first.
 */
export const TASK_PRIORITIES = [
  { value: "top", label: "Top" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];
export const DEFAULT_PRIORITY: TaskPriority = "medium";

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.some((option) => option.value === value);
}

/** 0 for Top, 1 for Medium, 2 for Low: for sorting. */
export function priorityRank(priority: TaskPriority | undefined) {
  return priority === "top" ? 0 : priority === "low" ? 2 : 1;
}

/** Saving Top or Low before 20261121120000_task_priority_and_people.sql has run. */
export const PRIORITY_MIGRATION_HINT =
  "Top and Low need the latest database update (supabase/migrations/20261121120000_task_priority_and_people.sql). Medium saves now.";

/** The most people a task is shared with, besides its own person. */
export const MAX_WITH = 10;

/** Adding people to a task before that same update has run. */
export const PEOPLE_MIGRATION_HINT =
  "Sharing a task needs the latest database update (supabase/migrations/20261121120000_task_priority_and_people.sql).";

/** Giving a task several days before 20261125120000_task_date_range.sql has run. */
export const RANGE_MIGRATION_HINT =
  "Several days needs the latest database update (supabase/migrations/20261125120000_task_date_range.sql). One day saves now.";

/** The longest run of days one task can cover, first and last day included. */
export const MAX_RANGE_DAYS = 62;

/** Someone a task can be shared with: active on the team list. */
export type Teammate = { email: string; name: string };

/** Everyone a task is on: its person, then the people it's shared with (lowercase). */
export function peopleOn(task: Pick<Task, "email" | "with_emails">) {
  return [...new Set([task.email, ...(task.with_emails ?? [])].map((email) => email.toLowerCase()))];
}

/** Whether a task is on this person's list: theirs, or shared with them. */
export function isOnTask(task: Pick<Task, "email" | "with_emails">, email: string) {
  return peopleOn(task).includes(email.toLowerCase());
}

/**
 * What kind of Studio1 work a task is. "client" isn't picked: it's set when
 * a task is for a client engagement.
 */
export const TASK_AREAS = [
  { value: "content", label: "Content" },
  { value: "community", label: "Community" },
  { value: "sales", label: "Sales & partners" },
  { value: "hiring", label: "Hiring" },
  { value: "ops", label: "Ops & admin" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" },
] as const;
export type StudioArea = (typeof TASK_AREAS)[number]["value"];
export type TaskArea = StudioArea | "client";

export function isStudioArea(value: unknown): value is StudioArea {
  return TASK_AREAS.some((option) => option.value === value);
}

export function isTaskArea(value: unknown): value is TaskArea {
  return value === "client" || isStudioArea(value);
}

export function areaLabel(area: TaskArea) {
  if (area === "client") return "Client work";
  return TASK_AREAS.find((option) => option.value === area)?.label ?? "Other";
}

/** The quick picks for "how long": rough is fine, it's for the big picture. */
export const TIME_CHOICES = [15, 30, 60, 90, 120, 180, 240, 360] as const;

export const MIN_LOG_MINUTES = 5;
export const MAX_LOG_MINUTES = 960;

/* ----------------------------------------------------------------- types */

export type Task = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  email: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Others it's shared with (lowercase emails): it's on their lists too. */
  with_emails: string[];
  area: TaskArea;
  engagement_id: string | null;
  deliverable_id: string | null;
  /** The first day of a task that runs over several days (due_on is its last); null for a one-day task. */
  start_on: string | null;
  due_on: string | null;
  done_on: string | null;
  blocked: boolean;
  block_reason: string;
};

export type WorkLog = {
  id: string;
  created_at: string;
  created_by: string;
  email: string;
  day: string;
  minutes: number;
  note: string;
  task_id: string | null;
  deliverable_id: string | null;
  community_task_id: string | null;
  title: string;
  area: TaskArea;
  engagement_id: string | null;
};

/** A community task as the board needs it (community_tasks). */
export type CommunityCard = {
  id: string;
  title: string;
  details: string;
  owner: string | null;
  due_on: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
};

export type ReportPeriod = "week" | "month";
export type ReportStatus = "draft" | "submitted" | "returned" | "seen";

export const REPORT_STATUSES: readonly { value: ReportStatus; label: string; tone: Tone }[] = [
  { value: "draft", label: "Draft", tone: "stone" },
  { value: "submitted", label: "Submitted", tone: "sky" },
  { value: "returned", label: "Sent back", tone: "amber" },
  { value: "seen", label: "Seen", tone: "emerald" },
];

export function reportStatusLabel(status: ReportStatus) {
  return REPORT_STATUSES.find((option) => option.value === status)?.label ?? status;
}

export type Report = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  period: ReportPeriod;
  starts_on: string;
  ends_on: string;
  status: ReportStatus;
  highlights: string;
  blockers: string;
  next_plan: string;
  snapshot: ReportSnapshot | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  founder_note: string;
};

/** One line in a report's lists. */
export type SnapshotItem = {
  title: string;
  /** "Studio1 · Content", "Acme · DevRel retainer". */
  for: string;
  source: "task" | "deliverable" | "community";
  url?: string | null;
  /** Where it stands (open lists): the board column. */
  column?: Column;
  /** The client status, for deliverables. */
  status?: string;
  due_on?: string | null;
  blocked?: boolean;
  reason?: string;
  /** Done lists: the day it was finished. */
  day?: string | null;
};

/** One "for" (a client, or Studio1 and an area) and the lines listed under it. */
export type WorkGroup = {
  key: string;
  label: string;
  client: boolean;
  minutes: number;
  items: { title: string; day: string; minutes: number }[];
};

/** The numbers and lists a report is built from, frozen when it's submitted. */
export type ReportSnapshot = {
  version: 1;
  period: ReportPeriod;
  starts_on: string;
  ends_on: string;
  attendance: { worked: number; half: number; leave: number; active_minutes: number } | null;
  logged_minutes: number;
  /** Days with at least one log. */
  logged_days: number;
  /** Time per "for" (a Studio1 area or a client engagement), most first. */
  by_for: { key: string; label: string; client: boolean; minutes: number }[];
  /**
   * The lines they listed, grouped by what they were for (most time, then
   * most lines, first). Older snapshots don't have it.
   */
  work?: WorkGroup[];
  done: SnapshotItem[];
  /** Client deliverables they moved, oldest first. */
  moved: { title: string; for: string; from: string; to: string; day: string }[];
  open: SnapshotItem[];
};

export type TaskResult = { ok: true; message?: string; id?: string } | { ok: false; message: string };

export const TASKS_MIGRATION_HINT =
  "Run the tasks migration (supabase/migrations/20261116100000_team_tasks.sql) in Supabase first.";

/* ---------------------------------------------------------- the board */

/**
 * Where a client deliverable sits on its owner's board. Its real status
 * stays in client work; this is only the column it shows in.
 */
export function deliverableColumn(status: DeliverableStatus): Column {
  switch (status) {
    case "planned":
      return "todo";
    case "in_progress":
    case "changes_requested":
      return "doing";
    case "internal_review":
    case "client_review":
    case "approved":
      return "review";
    case "published":
      return "done";
    default:
      return "todo";
  }
}

export function deliverableStatusLabel(status: string) {
  return labelOf(DELIVERABLE_STATUSES, status);
}

/** Where a community task sits: its "blocked" status shows as Doing, flagged. */
export function communityColumn(status: string): Column {
  if (status === "done") return "done";
  if (status === "doing" || status === "blocked") return "doing";
  return "todo";
}

/** The community status a board column means, for moving one. */
export function communityStatusFor(column: Column): "todo" | "doing" | "done" | null {
  if (column === "todo") return "todo";
  if (column === "doing") return "doing";
  if (column === "done") return "done";
  return null;
}

/* ----------------------------------------------------------- "for" keys */

/**
 * What a log or task counts toward: a client engagement ("e:<id>") or a
 * Studio1 area ("s:<area>").
 */
export function forKey(item: { engagement_id: string | null; area: TaskArea }) {
  return item.engagement_id ? `e:${item.engagement_id}` : `s:${item.area === "client" ? "other" : item.area}`;
}

/** Names for engagements, so "for" keys read as words. */
export type EngagementLabel = {
  id: string;
  /** "Acme", or "Studio1" for an internal engagement. */
  client: string;
  name: string;
  /** Internal (Studio1's own) engagement: counted as Studio1 work. */
  internal: boolean;
  /** The client's slug, for links to its workspace. */
  clientSlug?: string;
  /** The client's id, for people who may open only some clients. */
  clientId?: string;
};

/**
 * An engagement as words, without saying the client twice: "Nebius Token
 * Factory DevRel" for Nebius Token Factory reads "Nebius Token Factory ·
 * DevRel", "Trina-Launch" reads "Trina · Launch", and one named just like
 * its client is the client alone. Studio1's own: "Studio1 · Blog & socials".
 */
export function engagementLabel(engagement: Pick<EngagementLabel, "client" | "name" | "internal">) {
  const client = engagement.internal ? "Studio1" : engagement.client.trim();
  const name = engagement.name.trim();
  const rest = name.toLowerCase().startsWith(client.toLowerCase())
    ? name.slice(client.length).replace(/^[\s\-–—:·|/]+/, "").trim()
    : name;
  return rest ? `${client} · ${rest}` : client;
}

export function forLabel(key: string, engagements: ReadonlyMap<string, EngagementLabel>) {
  if (key.startsWith("e:")) {
    const engagement = engagements.get(key.slice(2));
    if (!engagement) return "A client";
    return engagementLabel(engagement);
  }
  const area = key.slice(2);
  // Studio1 work with no particular area is just "Studio1".
  if (!isTaskArea(area) || area === "other" || area === "client") return "Studio1";
  return `Studio1 · ${areaLabel(area)}`;
}

/** Whether a "for" key is client work (an engagement that isn't Studio1's own). */
export function isClientKey(key: string, engagements: ReadonlyMap<string, EngagementLabel>) {
  return key.startsWith("e:") && !engagements.get(key.slice(2))?.internal;
}

/* ---------------------------------------------------------------- links */

/**
 * What a line of work is tied to, as one picker value:
 *   s:<area>   Studio1 work (s:other = Studio1, no particular area)
 *   e:<id>     a client engagement (work that isn't one deliverable)
 *   d:<id>     a client deliverable
 *   t:<id>     one of your tasks
 *   c:<id>     a community task given to you
 */
export type LinkKind = "s" | "e" | "d" | "t" | "c";

export type LinkOption = {
  value: string;
  label: string;
  group: "studio" | "deliverable" | "client" | "task" | "community";
  /** Shown under the label: the client, a status. */
  hint?: string;
  /** Client work (shows in sky). */
  client: boolean;
};

export const STUDIO_LINK = "s:other";

export function parseLink(value: unknown): { kind: LinkKind; id: string } | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^([sedtc]):(.+)$/);
  if (!match) return null;
  const kind = match[1] as LinkKind;
  if (kind === "s") return isStudioArea(match[2]) ? { kind, id: match[2] } : null;
  return isUuid(match[2]) ? { kind, id: match[2].toLowerCase() } : null;
}

/** The picker value a saved line is tied to. */
export function linkOf(log: Pick<WorkLog, "task_id" | "deliverable_id" | "community_task_id" | "engagement_id" | "area">) {
  if (log.task_id) return `t:${log.task_id}`;
  if (log.community_task_id) return `c:${log.community_task_id}`;
  if (log.deliverable_id) return `d:${log.deliverable_id}`;
  if (log.engagement_id) return `e:${log.engagement_id}`;
  return `s:${isStudioArea(log.area) ? log.area : "other"}`;
}

const STOP = new Set([
  "the", "and", "for", "our", "you", "new", "all", "got", "set", "out", "per", "via", "but", "not", "its",
  "about", "after", "again", "also", "with", "from", "into", "that", "this", "their", "them", "then", "there",
  "today", "worked", "working", "work", "done", "doing", "made", "some", "more", "call", "calls", "post", "posts",
  "blog", "blogs", "draft", "wrote", "write", "review", "reviewed", "fixed", "update", "updated", "team", "studio1",
]);

function words(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOP.has(word)),
  );
}

/**
 * The option a line most likely belongs to, from its words, or null: a
 * deliverable or task sharing two words with it (or its whole title), else
 * a client whose name it mentions. Never guesses Studio1 areas.
 */
export function suggestLink(text: string, options: readonly LinkOption[]): LinkOption | null {
  const said = words(text);
  if (!said.size) return null;
  const lower = text.toLowerCase();
  let best: { option: LinkOption; score: number } | null = null;
  for (const option of options) {
    if (option.group === "studio") continue;
    const title = option.label.toLowerCase();
    const shared = [...words(option.label)].filter((word) => said.has(word)).length;
    let score = 0;
    if (option.group === "client") {
      const client = (option.hint ?? option.label).toLowerCase().split(" · ")[0];
      if (client.length >= 3 && lower.includes(client)) score = 1.5;
    } else if (title.length >= 6 && lower.includes(title)) score = 4;
    else if (shared >= 2) score = shared;
    else if (shared === 1 && option.hint && lower.includes(option.hint.toLowerCase().split(" · ")[0])) score = 2;
    if (score && (!best || score > best.score)) best = { option, score };
  }
  return best?.option ?? null;
}

/* --------------------------------------------------------------- totals */

export function sumMinutes(logs: readonly Pick<WorkLog, "minutes">[]) {
  return logs.reduce((sum, log) => sum + (Number.isFinite(log.minutes) ? log.minutes : 0), 0);
}

/** Minutes per day: { "2026-11-16": 300, … }. */
export function minutesByDay(logs: readonly Pick<WorkLog, "day" | "minutes">[]) {
  const totals: Record<string, number> = {};
  for (const log of logs) totals[log.day] = (totals[log.day] ?? 0) + log.minutes;
  return totals;
}

/** Minutes per "for", most first, with labels. */
export function totalsByFor(
  logs: readonly Pick<WorkLog, "engagement_id" | "area" | "minutes">[],
  engagements: ReadonlyMap<string, EngagementLabel>,
) {
  const totals = new Map<string, number>();
  for (const log of logs) totals.set(forKey(log), (totals.get(forKey(log)) ?? 0) + log.minutes);
  return [...totals.entries()]
    .map(([key, minutes]) => ({ key, label: forLabel(key, engagements), client: isClientKey(key, engagements), minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label));
}

/** Studio1 vs client minutes. */
export function splitStudioClient(
  logs: readonly Pick<WorkLog, "engagement_id" | "area" | "minutes">[],
  engagements: ReadonlyMap<string, EngagementLabel>,
) {
  let studio = 0;
  let client = 0;
  for (const log of logs) {
    if (isClientKey(forKey(log), engagements)) client += log.minutes;
    else studio += log.minutes;
  }
  return { studio, client };
}

/** "1h 30m", "45m"; "—" for nothing. */
export function hoursLabel(minutes: number | null | undefined) {
  if (!minutes || !Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/* -------------------------------------------------------------- periods */

/** The Monday of the week, or the 1st of the month, that holds this day. */
export function periodStart(period: ReportPeriod, day: string) {
  return period === "week" ? weekStart(day) : `${monthOf(day)}-01`;
}

/** The last day of the week or month that starts on `start`. */
export function periodEnd(period: ReportPeriod, start: string) {
  if (period === "week") return addDays(start, 6);
  return addDays(`${shiftMonth(monthOf(start), 1)}-01`, -1);
}

export function isPeriodStart(period: ReportPeriod, value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return periodStart(period, value) === value;
}

/** The week or month before (n = -1) or after. */
export function shiftPeriod(period: ReportPeriod, start: string, n: number) {
  return period === "week" ? addDays(start, 7 * n) : `${shiftMonth(monthOf(start), n)}-01`;
}

/**
 * When a report can be submitted: a week's from its Friday, a month's from
 * three days before it ends.
 */
export function readyOn(period: ReportPeriod, start: string) {
  return period === "week" ? addDays(start, 4) : addDays(periodEnd("month", start), -2);
}

/**
 * When it's due, 12:00 IST: a week's on the Monday after, a month's on the
 * 2nd of the next month.
 */
export function dueOn(period: ReportPeriod, start: string) {
  return period === "week" ? addDays(start, 7) : addDays(periodEnd("month", start), 2);
}

export const DUE_TIME = "12:00";

/** Past the due time (IST date and "HH:MM"). */
export function isPastDue(period: ReportPeriod, start: string, now: { date: string; time: string }) {
  const due = dueOn(period, start);
  return now.date > due || (now.date === due && now.time >= DUE_TIME);
}

/**
 * The periods someone may owe a report for today, newest first: this one
 * once it's ready, and the one before it until it's well past due (a week
 * after its due day), so a missed report doesn't nag forever. `since`
 * (their joining date, or when Tasks started) leaves out periods that ended
 * before it.
 */
export function owedPeriods(period: ReportPeriod, today: string, since?: string | null) {
  const current = periodStart(period, today);
  const previous = shiftPeriod(period, current, -1);
  const owed: string[] = [];
  if (today >= readyOn(period, current)) owed.push(current);
  if (today <= addDays(dueOn(period, previous), 7)) owed.push(previous);
  return owed.filter((start) => !since || periodEnd(period, start) >= since);
}

/** "Week of 16 Nov" / "November 2026". */
export function periodLabel(period: ReportPeriod, start: string) {
  if (period === "month") {
    const [year, month] = start.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, month - 1, 1)),
    );
  }
  const label = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${start}T00:00:00Z`),
  );
  return `Week of ${label}`;
}

/** "next week" / "next month", for the plan field. */
export function nextPeriodLabel(period: ReportPeriod) {
  return period === "week" ? "next week" : "next month";
}

/** When Tasks started: no report is owed for a period that ended before. */
export const TASKS_START = "2026-11-16";

/* ----------------------------------------------------------------- misc */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** "/tasks?view=week&person=…" with only the values given. */
export function tasksHref(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `/tasks?${text}` : "/tasks";
}
