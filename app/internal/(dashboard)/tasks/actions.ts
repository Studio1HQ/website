"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { dashboardUrl } from "@/lib/internal/host";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { notify } from "@/lib/internal/notifications/data";
import { OWNERS } from "@/lib/internal/roles";
import { requireMember, staffName } from "@/lib/internal/session";
import { findPerson, getPerson, listPeople } from "@/lib/internal/team/people";
import { dayLabel, displayName, istNow, isDateKey } from "@/lib/internal/team/shared";
import { isOwnedBy } from "@/lib/internal/clients/schema";
import { saveDeliverable } from "@/app/internal/(dashboard)/clients/actions";
import type { Deliverable } from "@/lib/internal/clients/schema";
import type { ClientScope } from "@/lib/internal/clients/scope";
import {
  canChangeTask,
  canGiveTask,
  canShareTask,
  canReadReports,
  isFounder,
  owesReports,
} from "@/lib/internal/tasks/access";
import {
  choicesFor,
  deleteTask,
  engagementLabels,
  findReport,
  getDeliverableRow,
  getReport,
  getTask,
  guardedEmails,
  insertReport,
  insertTask,
  insertTasks,
  updateReport,
  updateTask,
} from "@/lib/internal/tasks/data";
import { daysApart, finishedDay } from "@/lib/internal/tasks/calendar";
import { liveSnapshot, taskViewer } from "@/lib/internal/tasks/load";
import { reportEmailHtml, reportText } from "@/lib/internal/tasks/report";
import { reportsSince } from "@/lib/internal/tasks/report-status";
import {
  MAX_RANGE_DAYS,
  MAX_WITH,
  STUDIO_LINK,
  isOnTask,
  isPeriodStart,
  isStudioArea,
  isTaskPriority,
  parseLink,
  isTaskStatus,
  isUuid,
  periodEnd,
  periodLabel,
  periodStart,
  readyOn,
  tasksHref,
  type ReportPeriod,
  type Task,
  type TaskArea,
  type TaskPriority,
  type TaskResult,
  type TaskStatus,
} from "@/lib/internal/tasks/shared";

/**
 * Tasks writes. Server actions are public endpoints, so every one checks
 * the session and lib/internal/tasks/access.ts here.
 *
 * Client deliverables and community tasks are never copied into Tasks:
 * moving one, or logging time on it, goes through that area's own action
 * (moveDeliverable, setQuickField), so its rules, history and Slack lines
 * are the same as on its own board.
 */

const UNKNOWN: TaskResult = { ok: false, message: "That isn't there any more. Reload the page." };
const TRY_AGAIN: TaskResult = { ok: false, message: "Couldn't check that just now. Try again in a minute." };
const NOT_ON_LIST: TaskResult = { ok: false, message: "You're not on the team list yet. Ask Arindam or Amitesh to add you." };

function refresh() {
  revalidatePath("/internal/tasks", "layout");
  revalidatePath("/internal/me");
}

function input(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function line(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function block(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "";
}

/**
 * A priority to write: Top or Low as picked. Medium (the column's default) is
 * left out, so tasks still save before the priority migration has run.
 */
function priorityField(value: unknown): { priority?: TaskPriority } {
  return isTaskPriority(value) && value !== "medium" ? { priority: value } : {};
}

/**
 * The people a task is shared with: emails of people active on the team
 * list, not its own person. Checked against the list, so a stray address
 * can't put a task anywhere.
 */
async function cleanWith(value: unknown, owner: string): Promise<{ ok: true; emails: string[] } | { ok: false; message: string }> {
  const wanted = [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item && item !== owner.toLowerCase()),
    ),
  ];
  if (!wanted.length) return { ok: true, emails: [] };
  if (wanted.length > MAX_WITH) return { ok: false, message: `Share it with ${MAX_WITH} people at most.` };
  const found = await listPeople({ emails: wanted, activeOnly: true });
  if (!found.ok) return { ok: false, message: "Couldn't check the team list just now. Try again in a minute." };
  const active = new Set(found.people.map((person) => person.email.toLowerCase()));
  if (wanted.some((email) => !active.has(email))) return { ok: false, message: "Someone you picked isn't on the active team list." };
  return { ok: true, emails: wanted.sort() };
}

const sameList = (a: readonly string[], b: readonly string[]) => [...a].sort().join() === [...b].sort().join();

const NOT_SHARER: TaskResult = {
  ok: false,
  message: "Only the person whose task it is can change who it's shared with. You can take yourself off it.",
};

/** Tells people a task is now shared with them: on their bell, never an email. */
function tellShared(emails: readonly string[], staff: Staffish, titles: readonly string[], day: string | null) {
  const to = emails.filter((email) => email !== staff.email.toLowerCase());
  if (!to.length) return;
  const by = staffName(staff);
  after(() =>
    notify(to, staff.email, {
      kind: "task",
      title: titles.length === 1 ? `${by} shared a task with you` : `${by} shared ${titles.length} tasks with you`,
      body: `${titles.slice(0, 3).join(" · ")}${titles.length > 3 ? " …" : ""}${day ? ` · ${dayLabel(day)}` : ""}`,
      href: day ? tasksHref({ week: day }) : "/tasks",
    }),
  );
}

/** Same check as client work: no passwords or keys in notes. */
function looksLikeSecret(value: string) {
  return (
    /\b(password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*\S{6,}/i.test(value) ||
    /\b(sk|pk|rk)[-_](live|test)?[-_]?[A-Za-z0-9]{16,}\b/.test(value) ||
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/.test(value) ||
    /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

const SECRET: TaskResult = { ok: false, message: "That looks like a password or a key. Leave it out." };
const NO_CLIENTS = { ok: false as const, message: "Only people who can open client work can tag a client." };

async function viewer() {
  const staff = await requireMember();
  return { staff, viewer: taskViewer(staff) };
}

/**
 * Where a task counts: Studio1 (an area) or a client engagement, and maybe a
 * deliverable of it. Checks the engagement and deliverable exist and match.
 */
async function cleanFor(staff: { clients: unknown; clientScope: ClientScope }, values: Record<string, unknown>): Promise<
  | { ok: true; area: TaskArea; engagement_id: string | null; deliverable_id: string | null }
  | { ok: false; message: string }
> {
  const engagementId = typeof values.engagement_id === "string" && isUuid(values.engagement_id) ? values.engagement_id.toLowerCase() : null;
  const deliverableId = typeof values.deliverable_id === "string" && isUuid(values.deliverable_id) ? values.deliverable_id.toLowerCase() : null;
  const area = isStudioArea(values.area) ? values.area : "other";
  if (!engagementId) {
    if (deliverableId) return { ok: false, message: "Pick the client first." };
    return { ok: true, area, engagement_id: null, deliverable_id: null };
  }
  // Client tags are for people who can open client work.
  if (!staff.clients) return NO_CLIENTS;
  const engagements = await engagementLabels();
  const engagement = engagements.get(engagementId);
  // A client this person wasn't given (People) answers as if it weren't there.
  if (!engagement || choicesFor(staff.clientScope, [engagement]).length === 0)
    return { ok: false, message: "That client work isn't there any more. Pick another." };
  if (deliverableId) {
    const deliverable = await getDeliverableRow(deliverableId);
    if (deliverable === "error") return { ok: false, message: "Couldn't check that just now. Try again in a minute." };
    if (!deliverable || deliverable.engagement_id !== engagementId)
      return { ok: false, message: "Pick a deliverable of that client." };
  }
  return {
    ok: true,
    // Studio1's own engagement keeps its area; a client's is client work.
    area: engagement.internal ? area : "client",
    engagement_id: engagementId,
    deliverable_id: deliverableId,
  };
}

/**
 * Whether values name the client, deliverable and (for Studio1 work) area
 * the task has now. A client's task has no area of its own ("client").
 */
function sameFor(task: Task, values: Record<string, unknown>) {
  const id = (value: unknown) => (typeof value === "string" && isUuid(value) ? value.toLowerCase() : null);
  if (id(values.engagement_id) !== task.engagement_id || id(values.deliverable_id) !== task.deliverable_id) return false;
  return task.area === "client" || values.area === task.area;
}

/* ---------------------------------------------------------------- tasks */

/**
 * Adds a task (no id) or changes one. values: { email? (whose board; a
 * founder or intern reviewer may give someone a task), title, notes, area,
 * engagement_id?, deliverable_id?, due_on?, status?, priority?, with? (emails
 * it's shared with) }.
 *
 * Changing one writes only the fields sent: the dialog sends what was
 * changed in it, so a save from a form that's been open a while doesn't put
 * back what someone else changed meanwhile. Adding one takes them all.
 */
export async function saveTask(id: unknown, values: unknown): Promise<TaskResult> {
  const { staff, viewer: me } = await viewer();
  const data = input(values);
  const adding = !id;
  const title = line(data.title, 200);
  const notes = block(data.notes, 4000);
  if ((adding || "title" in data) && !title) return { ok: false, message: "Give it a title." };
  if (looksLikeSecret(title) || looksLikeSecret(notes)) return SECRET;
  const due = typeof data.due_on === "string" && data.due_on ? data.due_on : null;
  if (due && !isDateKey(due)) return { ok: false, message: "Pick a valid due date." };

  if (!id) {
    const found = await cleanFor(staff, data);
    if (!found.ok) return found;
    const where = { area: found.area, engagement_id: found.engagement_id, deliverable_id: found.deliverable_id };
    const email = (typeof data.email === "string" && data.email ? data.email : staff.email).trim().toLowerCase();
    // If who's an admin can't be read, treat them as guarded (fails closed).
    const guarded = email === staff.email ? false : ((await guardedEmails().catch(() => null))?.has(email) ?? true);
    if (!canGiveTask(me, email, guarded)) return { ok: false, message: "You can't add tasks to that person's board." };
    const person = await getPerson(email);
    if (!person || !person.active) return email === staff.email ? NOT_ON_LIST : { ok: false, message: "They're not on the active team list." };
    const status: TaskStatus = isTaskStatus(data.status) ? data.status : "todo";
    const shared = await cleanWith(data.with, email);
    if (!shared.ok) return shared;
    const result = await insertTask({
      email,
      title,
      notes,
      status,
      done_on: status === "done" ? istNow().date : null,
      due_on: due,
      created_by: staff.email,
      updated_by: staff.email,
      ...priorityField(data.priority),
      // Left out when nobody's picked, so tasks still save before the sharing migration.
      ...(shared.emails.length ? { with_emails: shared.emails } : {}),
      ...where,
    });
    if (!result.ok) return result;
    tellShared(shared.emails, staff, [title], due);
    // A task from someone else is news: it shows on their bell.
    if (email !== staff.email) {
      const by = staffName(staff);
      after(() =>
        notify([email], staff.email, {
          kind: "task",
          title: `${by} gave you a task`,
          body: due ? `${title} · due ${due}` : title,
          href: "/tasks",
        }),
      );
    }
    refresh();
    return { ok: true, id: result.id, message: email === staff.email ? "Task added" : `Added to ${displayName(person)}'s board` };
  }

  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const task = await getTask(id);
  if (task === "error") return TRY_AGAIN;
  if (!task) return UNKNOWN;
  if (!canChangeTask(me, task)) return { ok: false, message: "You can only change your own tasks." };
  // Priority and people only when they changed, so tasks still save before their migration.
  const priority = isTaskPriority(data.priority) && data.priority !== task.priority ? { priority: data.priority } : {};
  const shared = "with" in data ? await cleanWith(data.with, task.email) : { ok: true as const, emails: task.with_emails };
  if (!shared.ok) return shared;
  if (!sameList(shared.emails, task.with_emails) && !canShareTask(me, task)) return NOT_SHARER;
  const added = shared.emails.filter((email) => !task.with_emails.includes(email));
  const people = added.length || shared.emails.length !== task.with_emails.length ? { with_emails: shared.emails } : {};
  // The same client (or Studio1 area) as before is left as it is, unchecked:
  // a client whose work has ended, or one the editor can't pick, isn't
  // dropped by fixing the title. Whatever of the three wasn't sent is the
  // task's own.
  let where = {};
  if ("engagement_id" in data || "deliverable_id" in data || "area" in data) {
    const wanted = { engagement_id: task.engagement_id, deliverable_id: task.deliverable_id, area: task.area, ...data };
    if (!sameFor(task, wanted)) {
      const found = await cleanFor(staff, wanted);
      if (!found.ok) return found;
      where = { area: found.area, engagement_id: found.engagement_id, deliverable_id: found.deliverable_id };
    }
  }
  // The day a Done task was finished ("Finished on"): Done stamps the day
  // it was marked, and this sets the real one, even once its week is over.
  let finished = {};
  if (task.status === "done" && "done_on" in data && data.done_on !== task.done_on) {
    const today = istNow().date;
    if (typeof data.done_on !== "string" || !isDateKey(data.done_on)) return { ok: false, message: "Pick the day you finished it." };
    if (data.done_on > today) return { ok: false, message: "It can't be finished on a day that's still ahead." };
    const problem = dayProblem(data.done_on, today);
    if (problem) return { ok: false, message: problem };
    finished = { done_on: data.done_on };
  }
  const words = {
    ...("title" in data ? { title } : {}),
    ...("notes" in data ? { notes } : {}),
    ...("due_on" in data ? { due_on: due } : {}),
  };
  // A task over several days whose due day moves to (or before) its first, or
  // loses it: a one-day task again.
  const span = "due_on" in data && task.start_on && (!due || task.start_on >= due) ? { start_on: null } : {};
  const patch = { ...words, ...span, ...priority, ...people, ...where, ...finished };
  if (!Object.keys(patch).length) return { ok: true, id: task.id, message: "Saved" };
  const result = await updateTask(task.id, patch, staff.email);
  if (!result.ok) return result;
  tellShared(added, staff, ["title" in data ? title : task.title], "due_on" in data ? due : task.due_on);
  refresh();
  return { ok: true, id: task.id, message: "Saved" };
}

/** Moves a task to another column. Done stamps today (IST). */
export async function moveTask(id: unknown, to: unknown): Promise<TaskResult> {
  const { staff, viewer: me } = await viewer();
  if (typeof id !== "string" || !isUuid(id) || !isTaskStatus(to)) return UNKNOWN;
  const task = await getTask(id);
  if (task === "error") return TRY_AGAIN;
  if (!task) return UNKNOWN;
  if (!canChangeTask(me, task)) return { ok: false, message: "You can only move your own tasks." };
  if (task.status === to) return { ok: true };
  const result = await updateTask(
    task.id,
    { status: to, done_on: to === "done" ? istNow().date : null, ...(to === "done" ? { blocked: false, block_reason: "" } : {}) },
    staff.email,
    { status: `eq.${task.status}` },
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: to === "done" ? "Done" : undefined };
}

/** Flags a task blocked (with a reason) or clears it (reason ""). */
export async function blockTask(id: unknown, reason: unknown): Promise<TaskResult> {
  const { staff, viewer: me } = await viewer();
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const task = await getTask(id);
  if (task === "error") return TRY_AGAIN;
  if (!task) return UNKNOWN;
  if (!canChangeTask(me, task)) return { ok: false, message: "You can only change your own tasks." };
  const why = line(reason, 300);
  if (why && looksLikeSecret(why)) return SECRET;
  if (task.status === "done" && why) return { ok: false, message: "It's done, so it can't be blocked." };
  const result = await updateTask(task.id, { blocked: Boolean(why), block_reason: why }, staff.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: why ? "Marked as blocked" : "Unblocked" };
}

export async function removeTask(id: unknown): Promise<TaskResult> {
  const { viewer: me } = await viewer();
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const task = await getTask(id);
  if (task === "error") return TRY_AGAIN;
  if (!task) return UNKNOWN;
  // Someone it's only shared with takes themselves off (leaveTask); deleting is for its own person.
  if (!canChangeTask(me, { ...task, with_emails: [] })) {
    return isOnTask(task, me.email)
      ? { ok: false, message: "It's shared with you: take yourself off it instead." }
      : { ok: false, message: "You can only delete your own tasks." };
  }
  const result = await deleteTask(task.id);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Task deleted. Time logged on it stays in your days." };
}

/** Takes the signed-in person off a task shared with them; it stays on everyone else's list. */
export async function leaveTask(id: unknown): Promise<TaskResult> {
  const { staff } = await viewer();
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const task = await getTask(id);
  if (task === "error") return TRY_AGAIN;
  if (!task) return UNKNOWN;
  const me = staff.email.toLowerCase();
  if (!task.with_emails.includes(me)) return { ok: false, message: "It isn't shared with you." };
  const result = await updateTask(task.id, { with_emails: task.with_emails.filter((email) => email !== me) }, staff.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Taken off your list" };
}

/* ---------------------------------------------------- the week calendar */

type Staffish = Awaited<ReturnType<typeof requireMember>>;

/** The earliest day a card can be added on or moved to: the 1st of last month. */
function earliestDay(today: string) {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
}

function dayProblem(day: string, today: string) {
  if (day < earliestDay(today)) return "That day is too far back to change.";
  return null;
}

/** done_on for a card on `day`: that day, or today if the day is still ahead. */
function doneDay(day: string | null, today: string) {
  return day && day <= today ? day : today;
}

/** Why a run of days from `from` to `to` won't do, or null when it's fine. */
function spanProblem(from: string, to: string) {
  if (to < from) return "The last day can't be before the first.";
  if (daysApart(from, to) + 1 > MAX_RANGE_DAYS) return `Keep it to ${MAX_RANGE_DAYS} days or fewer.`;
  return null;
}

/**
 * What a card is for (the "For" picker, lib/internal/tasks/shared.ts
 * parseLink): Studio1 and an area, a client, or one of the client
 * deliverables of whoever's week it's on (`person`, you by default).
 * Checks it's there and, for a deliverable, that it's theirs.
 */
async function resolveFor(
  staff: Staffish,
  value: unknown,
  person: string = staff.email,
): Promise<
  | { ok: true; fields: { area: TaskArea; engagement_id: string | null; deliverable_id: string | null }; deliverable: Deliverable | null }
  | { ok: false; message: string }
> {
  const link = parseLink(value ?? STUDIO_LINK);
  if (!link || link.kind === "t" || link.kind === "c") return { ok: false, message: "Pick what it was for." };
  if (link.kind === "s")
    return { ok: true, fields: { area: link.id as TaskArea, engagement_id: null, deliverable_id: null }, deliverable: null };
  // Client tags are for people who can open client work.
  if (!staff.clients) return NO_CLIENTS;
  if (link.kind === "e") {
    const engagement = (await engagementLabels()).get(link.id);
    if (!engagement || choicesFor(staff.clientScope, [engagement]).length === 0)
      return { ok: false, message: "That client work isn't there any more. Pick another." };
    return {
      ok: true,
      fields: { area: engagement.internal ? "content" : "client", engagement_id: link.id, deliverable_id: null },
      deliverable: null,
    };
  }
  const deliverable = await getDeliverableRow(link.id);
  if (deliverable === "error") return { ok: false, message: "Couldn't check that just now. Try again in a minute." };
  if (!deliverable) return { ok: false, message: "That deliverable isn't there any more." };
  if (!isOwnedBy(deliverable.owner, person) && !isOwnedBy(deliverable.reviewer, person))
    return { ok: false, message: person === staff.email ? "Pick client work you own or review." : "Pick client work they own or review." };
  const label = (await engagementLabels()).get(deliverable.engagement_id);
  if (!label || choicesFor(staff.clientScope, [label]).length === 0)
    return { ok: false, message: "That deliverable isn't there any more." };
  const internal = label.internal;
  return {
    ok: true,
    fields: { area: internal ? "content" : "client", engagement_id: deliverable.engagement_id, deliverable_id: deliverable.id },
    deliverable,
  };
}

/**
 * Adds cards on a day (the week calendar's "+ New", My day): one or several
 * (a pasted list). items: [{ title, notes?, link?, priority? }]; extra: { email?, status?, with?, until? }.
 * email: whose week (left out = your own); giving someone else a task goes
 * through canGiveTask, like the board. status: left out = Done on today or
 * a past day for your own, Not started on a day ahead or for someone else;
 * running over days that take in today, In progress.
 * with: people to share every one of them with (on their lists too).
 * until: the last day, for work that runs over several days (`day` is the first).
 */
export async function addTasks(day: unknown, items: unknown, extra?: unknown): Promise<TaskResult> {
  const { staff, viewer: me } = await viewer();
  const options = input(extra);
  const email = (typeof options.email === "string" && options.email.trim() ? options.email : staff.email).trim().toLowerCase();
  const other = email !== staff.email.toLowerCase();
  let name = "";
  if (!other) {
    if (!staff.person) return NOT_ON_LIST;
  } else {
    // If who's an admin can't be read, treat them as guarded (fails closed).
    const guarded = (await guardedEmails().catch(() => null))?.has(email) ?? true;
    if (!canGiveTask(me, email, guarded)) return { ok: false, message: "You can't add tasks to that person's week." };
    const found = await findPerson(email);
    if (!found.ok) return TRY_AGAIN;
    if (!found.person || !found.person.active) return { ok: false, message: "They're not on the active team list." };
    name = displayName(found.person);
  }
  const today = istNow().date;
  const date = typeof day === "string" && isDateKey(day) ? day : today;
  const problem = dayProblem(date, today);
  if (problem) return { ok: false, message: problem };
  // Several days: `date` is the first, `last` the last (the due day).
  let last = date;
  if (options.until !== undefined && options.until !== null && options.until !== "") {
    if (typeof options.until !== "string" || !isDateKey(options.until)) return { ok: false, message: "Pick a valid last day." };
    const spanned = spanProblem(date, options.until);
    if (spanned) return { ok: false, message: spanned };
    last = options.until;
  }
  const ranged = last > date;
  const state: TaskStatus = isTaskStatus(options.status)
    ? options.status
    : other || date > today
      ? "todo"
      : last >= today && ranged
        ? "doing"
        : "done";
  const list = (Array.isArray(items) ? items : [items]).map(input).slice(0, 30);
  const clean = list
    .map((item) => ({ title: line(item.title, 200), notes: block(item.notes, 4000), link: item.link, priority: item.priority }))
    .filter((item) => item.title);
  if (!clean.length) return { ok: false, message: "Write what it is." };
  if (clean.some((item) => looksLikeSecret(item.title) || looksLikeSecret(item.notes))) return SECRET;
  const shared = await cleanWith(options.with, email);
  if (!shared.ok) return shared;

  // Check every line first, then save them in one write: all or none, so a
  // failed save can be retried without adding the first ones twice.
  const rows: Record<string, unknown>[] = [];
  for (const item of clean) {
    const tied = await resolveFor(staff, item.link, email);
    if (!tied.ok) return tied;
    rows.push({
      email,
      title: item.title,
      notes: item.notes,
      status: state,
      due_on: last,
      // Left out for one day, so tasks still save before the date-range migration.
      ...(ranged ? { start_on: date } : {}),
      done_on: state === "done" ? doneDay(last, today) : null,
      created_by: staff.email,
      updated_by: staff.email,
      ...priorityField(item.priority),
      ...(shared.emails.length ? { with_emails: shared.emails } : {}),
      ...tied.fields,
    });
  }
  const saved = await insertTasks(rows);
  if (!saved.ok) return saved;
  const added = rows.length;
  // The client tag is a label only (the owner's rule, 19 Nov 2026): a task
  // never moves a client's piece. The client's manager keeps that list.
  // A task from someone else is news: it shows on their bell (never an email),
  // and opens the week it's on.
  if (other) {
    const by = staffName(staff);
    const titles = clean.map((item) => item.title);
    after(() =>
      notify([email], staff.email, {
        kind: "task",
        title: added === 1 ? `${by} gave you a task` : `${by} gave you ${added} tasks`,
        body: `${titles.slice(0, 3).join(" · ")}${titles.length > 3 ? " …" : ""} · ${ranged ? `${dayLabel(date)} to ${dayLabel(last)}` : dayLabel(date)}`,
        href: tasksHref({ week: date }),
      }),
    );
  }
  tellShared(shared.emails, staff, clean.map((item) => item.title), last);
  refresh();
  // Say the day when it isn't today, so a task put on another day isn't "lost".
  const where = ranged ? `, ${dayLabel(date)} to ${dayLabel(last)}` : date === today ? "" : ` on ${dayLabel(date)}`;
  const what = `${added === 1 ? "Added" : `Added ${added}`}${other ? ` to ${name}'s week` : ""}${where}`;
  return { ok: true, message: what };
}

/**
 * Changes a card: { title?, notes?, link?, status?, priority?, with?, day?, from? }. Done stamps the card's
 * day when that's in this week (else today: finishedDay); moving a done card to a day moves its
 * done day and leaves its due day. from: the first day of a task that runs over several (`day`
 * is the last: due, or finished once done); null or "" makes it a one-day task again.
 */
export async function editTask(id: unknown, values: unknown): Promise<TaskResult> {
  const { staff, viewer: me } = await viewer();
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const task = await getTask(id);
  if (task === "error") return TRY_AGAIN;
  if (!task) return UNKNOWN;
  if (!canChangeTask(me, task)) return { ok: false, message: "You can only change your own tasks." };
  const today = istNow().date;
  const data = input(values);
  const patch: Record<string, unknown> = {};

  if ("title" in data) {
    const title = line(data.title, 200);
    if (!title) return { ok: false, message: "Give it a title." };
    if (looksLikeSecret(title)) return SECRET;
    patch.title = title;
  }
  if ("notes" in data) {
    const notes = block(data.notes, 4000);
    if (looksLikeSecret(notes)) return SECRET;
    patch.notes = notes;
  }
  if ("link" in data) {
    const tied = await resolveFor(staff, data.link, task.email);
    if (!tied.ok) return tied;
    Object.assign(patch, tied.fields);
  }
  if ("priority" in data) {
    if (!isTaskPriority(data.priority)) return { ok: false, message: "Pick Top, Medium or Low." };
    if (data.priority !== task.priority) patch.priority = data.priority;
  }
  let added: string[] = [];
  if ("with" in data) {
    const shared = await cleanWith(data.with, task.email);
    if (!shared.ok) return shared;
    if (!sameList(shared.emails, task.with_emails) && !canShareTask(me, task)) return NOT_SHARER;
    added = shared.emails.filter((email) => !task.with_emails.includes(email));
    if (added.length || shared.emails.length !== task.with_emails.length) patch.with_emails = shared.emails;
  }
  const status: TaskStatus = isTaskStatus(data.status) ? data.status : task.status;
  let day = task.due_on;
  if ("day" in data) {
    if (typeof data.day !== "string" || !isDateKey(data.day)) return { ok: false, message: "Pick a valid day." };
    const problem = dayProblem(data.day, today);
    if (problem) return { ok: false, message: problem };
    day = data.day;
    // A done card's day is the day it was finished: its due day stays, so
    // moving when it was finished doesn't rewrite when it was due.
    if (status !== "done") patch.due_on = day;
  }
  if (status !== task.status) {
    patch.status = status;
    if (status === "done") Object.assign(patch, { blocked: false, block_reason: "" });
  }
  // Only when the status or the day changes: fixing a typo in a finished
  // task mustn't move the day it was finished on.
  if (status !== task.status || "day" in data) {
    // Put on a day: that day. Just marked Done: its own day this week, else today.
    patch.done_on = status !== "done" ? null : "day" in data ? doneDay(day, today) : finishedDay(day, today);
  }
  // The first day of a run of days. It has to come before the last (the due
  // day, or the day it was finished once done): one that doesn't is dropped,
  // and the task is a one-day task again.
  let start = task.start_on;
  if ("from" in data) {
    if (data.from === null || data.from === "") start = null;
    else if (typeof data.from !== "string" || !isDateKey(data.from)) return { ok: false, message: "Pick a valid first day." };
    else {
      const problem = dayProblem(data.from, today);
      if (problem) return { ok: false, message: problem };
      start = data.from;
    }
  }
  if (start) {
    const last = status === "done" ? ((patch.done_on as string | null | undefined) ?? task.done_on) : day;
    if (!last || start >= last) start = null;
    else {
      const spanned = spanProblem(start, last);
      if (spanned) return { ok: false, message: spanned };
    }
  }
  // Written only when it changes, so tasks still save before the date-range migration.
  if (start !== task.start_on && (start || task.start_on)) {
    // A done task's run ends on the day it was finished; marking it done early doesn't drop its first day.
    if (start || "from" in data || status !== "done") patch.start_on = start;
  }
  const result = await updateTask(task.id, patch, staff.email, { status: `eq.${task.status}` });
  if (!result.ok) return result;
  tellShared(added, staff, [typeof patch.title === "string" ? patch.title : task.title], day);
  refresh();
  return { ok: true };
}

/**
 * Drops one of the person's client deliverables on a day of the Week view:
 * sets its due date through the clients area's own save (the same access
 * check, and it stops if someone changed the date since: `was`), then
 * refreshes Tasks as well as Clients.
 */
export async function setDeliverableDay(id: unknown, day: unknown, was: unknown): Promise<TaskResult> {
  const { staff } = await viewer();
  if (!staff.clients) return { ok: false, message: "You can't change client work." };
  if (typeof day !== "string" || !isDateKey(day)) return { ok: false, message: "Pick a valid day." };
  const result = await saveDeliverable(id, { due_on: day }, { due_on: typeof was === "string" ? was : "" });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------- reports */

function cleanWords(values: unknown) {
  const data = input(values);
  return {
    highlights: block(data.highlights, 4000),
    blockers: block(data.blockers, 4000),
    next_plan: block(data.next_plan, 4000),
  };
}

/** A week or month that has started (no reports for ones still ahead). */
function cleanPeriod(
  period: unknown,
  start: unknown,
  joinedOn?: string | null,
): { period: ReportPeriod; start: string } | null {
  if (period !== "week" && period !== "month") return null;
  if (!isPeriodStart(period, start)) return null;
  if (start > periodStart(period, istNow().date)) return null;
  // Nor for ones that ended before Tasks began or before they joined:
  // otherwise one person could file (and email) a report for every week
  // there has ever been.
  if (periodEnd(period, start) < reportsSince(joinedOn)) return null;
  return { period, start };
}

/**
 * Saves what you've written so far (a draft, or a report sent back to you).
 */
export async function saveReportDraft(period: unknown, start: unknown, values: unknown): Promise<TaskResult> {
  const { staff } = await viewer();
  if (!staff.person) return NOT_ON_LIST;
  const which = cleanPeriod(period, start, staff.person.joined_on);
  if (!which) return UNKNOWN;
  const words = cleanWords(values);
  if (Object.values(words).some(looksLikeSecret)) return SECRET;
  const existing = await findReport(staff.email, which.period, which.start);
  if (existing === "error") return TRY_AGAIN;
  if (existing && (existing.status === "submitted" || existing.status === "seen"))
    return { ok: false, message: "It's already submitted." };
  const result = existing
    ? await updateReport(existing.id, words, ["draft", "returned"])
    : await insertReport({
        email: staff.email,
        period: which.period,
        starts_on: which.start,
        ends_on: periodEnd(which.period, which.start),
        status: "draft",
        ...words,
      });
  if (!result.ok) return result;
  refresh();
  return { ok: true, id: result.id ?? existing?.id, message: "Draft saved" };
}

/**
 * Submits your report for a week or month: freezes the numbers as they are
 * now and emails both founders.
 */
export async function submitReport(period: unknown, start: unknown, values: unknown): Promise<TaskResult> {
  const { staff } = await viewer();
  if (!staff.person) return NOT_ON_LIST;
  if (!owesReports(staff.email)) return { ok: false, message: "Founders don't send reports to themselves." };
  const which = cleanPeriod(period, start, staff.person.joined_on);
  if (!which) return UNKNOWN;
  const today = istNow().date;
  if (today < readyOn(which.period, which.start))
    return { ok: false, message: `You can submit it from ${readyOn(which.period, which.start)}.` };
  const words = cleanWords(values);
  if (Object.values(words).some(looksLikeSecret)) return SECRET;
  if (!words.highlights && !words.next_plan)
    return { ok: false, message: "Write at least what went well and your plan before you submit." };
  const live = await liveSnapshot(staff.email, which.period, which.start);
  if (!live.ok) return { ok: false, message: live.message };
  const existing = await findReport(staff.email, which.period, which.start);
  if (existing === "error") return TRY_AGAIN;
  if (existing && (existing.status === "submitted" || existing.status === "seen"))
    return { ok: false, message: "It's already submitted." };
  const fields = {
    ...words,
    status: "submitted",
    snapshot: live.snapshot,
    submitted_at: new Date().toISOString(),
  };
  const result = existing
    ? await updateReport(existing.id, fields, ["draft", "returned"])
    : await insertReport({
        email: staff.email,
        period: which.period,
        starts_on: which.start,
        ends_on: periodEnd(which.period, which.start),
        ...fields,
      });
  if (!result.ok) return result;
  const id = result.id ?? existing?.id ?? "";
  const name = staffName(staff);
  after(() =>
    notify(OWNERS, staff.email, {
      kind: "task",
      title: `${name} sent their report`,
      body: periodLabel(which.period, which.start),
      href: `/tasks/reports/${id}`,
    }),
  );
  after(async () => {
    if (!isMailerConfigured()) return;
    const link = `${dashboardUrl}/tasks/reports/${id}`;
    const label = periodLabel(which.period, which.start);
    for (const to of OWNERS) {
      try {
        await sendMail(
          {
            to,
            subject: `${name}: ${label} report`,
            html: reportEmailHtml(name, words, live.snapshot, link),
            text: `${reportText(name, words, live.snapshot)}\n\nOpen it: ${link}`,
            replyTo: staff.email,
          },
          undefined,
          { idempotencyKey: `report-${id}-${existing?.status === "returned" ? existing.updated_at : "first"}-${to}` },
        );
      } catch (error) {
        console.error(`[tasks] emailing the report to ${to} failed`, error);
      }
    }
  });
  refresh();
  return { ok: true, id, message: "Submitted to Arindam and Amitesh" };
}

/** A founder marks a report seen, or sends it back with a note. */
export async function reviewReport(id: unknown, decision: unknown, note: unknown): Promise<TaskResult> {
  const { staff } = await viewer();
  if (!isFounder(staff)) return { ok: false, message: "Only Arindam or Amitesh can do that." };
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  if (decision !== "seen" && decision !== "returned") return UNKNOWN;
  const report = await getReport(id);
  if (report === "error") return TRY_AGAIN;
  if (!report || !canReadReports(staff, report.email)) return UNKNOWN;
  const text = block(note, 2000);
  if (decision === "returned" && !text) return { ok: false, message: "Say what to change, so they know." };
  // "Seen" without a note keeps any note already there.
  const result = await updateReport(
    report.id,
    {
      status: decision,
      ...(text || decision === "returned" ? { founder_note: text } : {}),
      reviewed_by: staff.email,
      reviewed_at: new Date().toISOString(),
    },
    ["submitted", "seen"],
  );
  if (!result.ok) return result;
  if (decision === "returned") {
    const person = await getPerson(report.email);
    const name = staffName(staff);
    after(async () => {
      if (!isMailerConfigured()) return;
      const link = `${dashboardUrl}/tasks/reports/${report.id}`;
      await sendMail(
        {
          to: report.email,
          subject: `Your ${periodLabel(report.period, report.starts_on)} report needs a change`,
          html: `<p>Hi ${person ? displayName(person).split(" ")[0] : "there"},</p><p>${name} sent your report back:</p><blockquote style="border-left:3px solid #e7e2da;margin:0;padding:4px 12px;color:#44403c">${text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\n/g, "<br>")}</blockquote><p><a href="${link}">Open your report</a>, change it and submit it again.</p>`,
          text: `${name} sent your report back:\n\n${text}\n\nOpen it: ${link}`,
          replyTo: staff.email,
        },
        undefined,
        { idempotencyKey: `report-returned-${report.id}-${Date.now()}` },
      ).catch(() => null);
    });
    after(() =>
      notify([report.email], staff.email, {
        kind: "task",
        title: `${name} sent your report back`,
        body: periodLabel(report.period, report.starts_on),
        href: `/tasks/reports/${report.id}`,
      }),
    );
  }
  refresh();
  return { ok: true, message: decision === "seen" ? "Marked as seen" : "Sent back" };
}
