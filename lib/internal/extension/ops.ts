import "server-only";
import { revalidatePath } from "next/cache";
import { bellFor, markRead } from "@/lib/internal/notifications/data";
import { fromInternalPath } from "@/lib/internal/host";
import { homeFor, staffName, type Staff } from "@/lib/internal/session";
import { canChangeTask } from "@/lib/internal/tasks/access";
import { getTask, insertTasks, listTasks, updateTask } from "@/lib/internal/tasks/data";
import { taskViewer } from "@/lib/internal/tasks/load";
import { isTaskStatus, TASK_STATUSES, type TaskStatus } from "@/lib/internal/tasks/shared";
import { dayStatusFor, endDayFor, startDayFor } from "@/lib/internal/team/day-clock";
import { isDateKey, istNow, isUuid } from "@/lib/internal/team/shared";

/*
 * What the browser extension can read and do, for the person signed in to
 * it (lib/internal/extension/http.ts finds them). Every function
 * takes that person and applies the dashboard's own rules: their own tasks
 * only (canChangeTask), the same day clock as My day, their own
 * notifications. Nothing here is a server action: only the API routes in
 * app/api/extension call it, after checking the session.
 */

export type ExtensionTask = {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  due_on: string | null;
  late: boolean;
  blocked: boolean;
};

/** The panel's whole view: who, today's clock, a day's tasks, notifications. */
export async function summaryFor(staff: Staff, dashboard: string, askedDay?: string | null) {
  const today = istNow().date;
  // The day being looked at: today unless the panel asked for another (a month either way).
  const shown = askedDay && isDateKey(askedDay) && Math.abs(Date.parse(askedDay) - Date.parse(today)) <= 31 * 864e5 ? askedDay : today;
  const [tasks, bell, day] = await Promise.all([
    listTasks({ emails: [staff.email] }),
    bellFor(staff.email),
    staff.person ? dayStatusFor(staff.person) : Promise.resolve(null),
  ]);

  const open: ExtensionTask[] = tasks.ok
    ? tasks.rows
        .filter((task) => task.status !== "done" && task.email.toLowerCase() === staff.email.toLowerCase())
        // Today: due by today (late ones too) and undated. Another day: what's on that day.
        .filter((task) => (shown === today ? !task.due_on || task.due_on <= today : task.due_on === shown))
        .slice(0, 20)
        .map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          statusLabel: TASK_STATUSES.find((option) => option.value === task.status)?.label ?? task.status,
          due_on: task.due_on,
          late: Boolean(task.due_on && task.due_on < today),
          blocked: task.blocked,
        }))
    : [];

  return {
    // Links open in the dashboard: its address, and paths on it.
    dashboard,
    me: {
      email: staff.email,
      name: staffName(staff),
      home: homeFor(staff),
      // For the welcome header: what they do, and whether there's a photo to fetch (api/extension/photo).
      role: staff.person ? [staff.person.designation, staff.person.kind === "intern" ? "Intern" : ""].filter(Boolean).join(" · ") : "",
      hasPhoto: Boolean(staff.person?.photo_path),
    },
    today,
    shown,
    // Null when they aren't on the team list (no My day, so no clock).
    day: day && day.ok ? { running: day.running, minutes: day.minutes, leave: day.leave } : null,
    tasks: open,
    tasksOk: tasks.ok,
    notifications: {
      unread: bell.unread,
      items: bell.items.slice(0, 15).map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        href: fromInternalPath(item.href),
        kind: item.kind,
        created_at: item.created_at,
        read: Boolean(item.read_at),
      })),
    },
  };
}

export type Result = { ok: true; message?: string } | { ok: false; message: string };

/** Start or end the clock on today, as on My day. */
export async function clockFor(staff: Staff, action: unknown): Promise<Result> {
  if (!staff.person) return { ok: false, message: "You're not on the team list yet, so there's no day to log." };
  if (action === "start") return startDayFor(staff, staff.person);
  if (action === "stop") return endDayFor(staff, staff.person);
  return { ok: false, message: "That isn't something the clock does." };
}

/** Moves one of the person's own tasks to another status (as on the board). */
export async function moveTaskFor(staff: Staff, id: unknown, to: unknown): Promise<Result> {
  if (typeof id !== "string" || !isUuid(id) || !isTaskStatus(to)) return { ok: false, message: "That task isn't there any more." };
  const task = await getTask(id);
  if (task === "error") return { ok: false, message: "Couldn't check that just now. Try again in a minute." };
  if (!task) return { ok: false, message: "That task isn't there any more." };
  if (!canChangeTask(taskViewer(staff), task)) return { ok: false, message: "You can only move your own tasks." };
  if (task.status === to) return { ok: true };
  const result = await updateTask(
    task.id,
    { status: to, done_on: to === "done" ? istNow().date : null, ...(to === "done" ? { blocked: false, block_reason: "" } : {}) },
    staff.email,
    { status: `eq.${task.status}` },
  );
  if (!result.ok) return { ok: false, message: result.message ?? "Couldn't save that. Try again." };
  revalidatePath("/internal/tasks", "layout");
  revalidatePath("/internal/me");
  return { ok: true, message: to === "done" ? "Done" : undefined };
}

/** Marks one notification read, or all of them (no id). */
export async function readFor(staff: Staff, id: unknown): Promise<Result> {
  if (id !== undefined && (typeof id !== "string" || !isUuid(id))) return { ok: false, message: "That notification isn't there." };
  await markRead(staff.email, typeof id === "string" ? id : undefined);
  return { ok: true };
}

/** Adds a task to the person's own list, on a day from today on (a month ahead at most). */
export async function addTaskFor(staff: Staff, title: unknown, day: unknown): Promise<Result> {
  const today = istNow().date;
  const clean = typeof title === "string" ? title.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  if (!clean) return { ok: false, message: "Write what it is." };
  if (/\b(password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*\S{6,}/i.test(clean)) {
    return { ok: false, message: "That looks like a password or a key. Leave it out." };
  }
  const date = typeof day === "string" && isDateKey(day) ? day : today;
  if (date < today || Date.parse(date) - Date.parse(today) > 31 * 864e5) return { ok: false, message: "Pick today or a day this month." };
  const saved = await insertTasks([
    {
      email: staff.email,
      title: clean,
      notes: "",
      status: "todo",
      due_on: date,
      done_on: null,
      area: "other",
      created_by: staff.email,
      updated_by: staff.email,
    },
  ]);
  if (!saved.ok) return { ok: false, message: saved.message ?? "Couldn't save that. Try again." };
  revalidatePath("/internal/tasks", "layout");
  revalidatePath("/internal/me");
  return { ok: true, message: "Added" };
}
