/**
 * Who may see and plan calls. Pure, so it's easy to test; the page, data
 * reads and actions all go through it.
 *
 *   everyone at Studio1        sees only the calls they're invited to
 *   (an @studio1hq.com           (in the people, the host, or a whole-team
 *   address with a way in)       call); nothing else reaches their browser
 *   the founders and the       start on their own calls too, can switch to
 *   founder's associate          everyone's, and schedule and fix calls:
 *                                add, edit, move or cancel a day, delete
 *
 * The owner, 16 Nov 2026: "Each person, apart from the founder and the
 * founder's office, should only be able to see their calendar to which
 * they are invited. Founder and founder's associate: only they can see
 * all." And: "we can also get everyone's calendar as admin, but on a
 * personal level, I can see only the things that are related to me."
 * Other admins are no exception. Outside writers (owner-invited addresses
 * outside studio1hq.com) don't see calls at all.
 */

import { isStaffEmail } from "@/lib/internal/roles";
import { isAssociate, isFounder } from "@/lib/internal/tasks/access";
import type { RoleKey } from "@/lib/internal/roles";

export type CallViewer = {
  email: string;
  roles: readonly RoleKey[];
  status: string;
  /** On the team list. */
  person: unknown;
  interns: readonly string[];
};

/** Opens the Calls page (their own calls): a Studio1 address with a role, a place on the team list, or interns to log. */
export function canSeeCalls(viewer: CallViewer) {
  if (!isStaffEmail(viewer.email)) return false;
  if (viewer.status === "disabled" || viewer.status === "uninvited" || viewer.status === "unknown") return false;
  return viewer.person != null || viewer.roles.length > 0 || viewer.interns.length > 0;
}

/** Sees every call, not just their own: the founders and the founder's associate. */
export function canSeeAllCalls(viewer: Pick<CallViewer, "email" | "status" | "roles">) {
  return isFounder(viewer) || isAssociate(viewer);
}

/** Schedules and fixes calls: the same two (the founders and the founder's associate). */
export function canPlanCalls(viewer: Pick<CallViewer, "email" | "status" | "roles">) {
  return canSeeAllCalls(viewer);
}
