/**
 * Who may see and change whose tasks, work logs and reports. Pure, so it's
 * easy to test; pages, data reads and actions all go through it.
 *
 *   everyone on the team list   their own board, logs and reports (interns
 *                               too: they list their own work)
 *   the founders                everyone's, the reports inbox, and giving
 *                               anyone a task
 *   the founder's associate     (the tasks_viewer role) everyone's tasks,
 *                               logs and weeks, the founders' included, and
 *                               giving anyone a task
 *   other admins                everyone's except the founders' and other
 *                               admins'; may give tasks to those people
 *   intern reviewers            their interns' boards (read only)
 *
 * Giving tasks is the founders', the admins' and the associate's job, not
 * client managers' or intern reviewers' (the owner, 15 Nov 2026). Reports
 * are the founders' and the person's own, nobody else's.
 */

import { can, isOwner, type RoleKey } from "@/lib/internal/roles";

export type TaskViewer = {
  email: string;
  roles: readonly RoleKey[];
  status: string;
  /** Interns whose days this person logs. */
  interns: readonly string[];
};

/** One of the two founders, signed in as themselves. */
export function isFounder(viewer: Pick<TaskViewer, "email" | "status">) {
  return viewer.status === "owner" && isOwner(viewer.email);
}

/** Holds "Team tasks: view" (the founder's associate) or Admin. */
export function seesTeam(viewer: Pick<TaskViewer, "roles">) {
  return can(viewer.roles, "tasks", "view");
}

/** The founder's associate: the tasks_viewer role itself (Admin alone isn't it). */
export function isAssociate(viewer: Pick<TaskViewer, "roles">) {
  return viewer.roles.includes("tasks_viewer");
}

/** May open anyone else's board at all (shows the person picker). */
export function canSeeOthers(viewer: TaskViewer) {
  return isFounder(viewer) || seesTeam(viewer) || viewer.interns.length > 0;
}

/**
 * May this viewer see this person's tasks and logs? `guarded` people (the
 * founders and anyone with Admin) are visible only to themselves, the
 * founders and the founder's associate.
 */
export function canSeeTasksOf(viewer: TaskViewer, target: { email: string; guarded: boolean }) {
  const email = target.email.toLowerCase();
  if (email === viewer.email.toLowerCase()) return true;
  if (isFounder(viewer) || isAssociate(viewer)) return true;
  if (target.guarded) return false;
  if (seesTeam(viewer)) return true;
  return viewer.interns.includes(email);
}

/**
 * May this viewer put a task on this person's board? Their own, always;
 * anyone's for the founders and the associate; admins, anyone's but a
 * guarded person's (founders and other admins).
 */
export function canGiveTask(viewer: TaskViewer, email: string, guarded = false) {
  const target = email.toLowerCase();
  if (target === viewer.email.toLowerCase()) return true;
  if (isFounder(viewer) || isAssociate(viewer)) return true;
  return viewer.roles.includes("admin") && !guarded;
}

/**
 * May this viewer change (edit, move, delete) this task? The person whose
 * board it's on, a founder, or whoever gave it to them while they still may.
 */
export function canChangeTask(viewer: TaskViewer, task: { email: string; created_by: string }) {
  if (task.email.toLowerCase() === viewer.email.toLowerCase()) return true;
  if (isFounder(viewer)) return true;
  return task.created_by.toLowerCase() === viewer.email.toLowerCase() && canGiveTask(viewer, task.email);
}

/**
 * Whether someone's hours on a client may show to this viewer in that
 * client's workspace, given the guarded people (the founders and admins):
 * the founders and the founder's associate (Team tasks: view as a role, not
 * through Admin) see everyone's, everyone sees their own, and nobody else
 * sees a guarded person's. The owner's rule, 15 Nov 2026; the Clients
 * week panel (lib/internal/clients/week-data.ts) follows the same one.
 */
export function canSeeWorkOf(
  viewer: Pick<TaskViewer, "email" | "status" | "roles">,
  email: string,
  guarded: ReadonlySet<string>,
) {
  const target = email.toLowerCase();
  if (isFounder(viewer) || target === viewer.email.toLowerCase()) return true;
  if (viewer.roles.includes("tasks_viewer")) return true;
  return !guarded.has(target);
}

/** Work logs are each person's own: nobody logs or changes someone else's. */
export function canChangeLog(viewer: Pick<TaskViewer, "email">, log: { email: string }) {
  return log.email.toLowerCase() === viewer.email.toLowerCase();
}

/**
 * Why a log can't be on this day, or null when it can: from the start of
 * last month (like attendance) up to today, never ahead.
 */
export function logDayProblem(day: string, today: string): string | null {
  if (day > today) return "You can't log work for a day that hasn't happened yet.";
  const [year, month] = today.split("-").map(Number);
  const earliest = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
  if (day < earliest) return "That day is too far back to change.";
  return null;
}

/** May this viewer read this person's reports? Their own, or a founder. */
export function canReadReports(viewer: Pick<TaskViewer, "email" | "status">, email: string) {
  return email.toLowerCase() === viewer.email.toLowerCase() || isFounder(viewer);
}

/** Owes reports: everyone on the team list but the founders. */
export function owesReports(email: string) {
  return !isOwner(email);
}
