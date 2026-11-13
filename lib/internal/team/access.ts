import type { Staff } from "@/lib/internal/session";
import { istNow, shiftMonth, monthOf, type AttendanceDay, type TeamPerson } from "@/lib/internal/team/shared";

/**
 * Who may log whose days, and how far back:
 *   admins            anyone's, any date
 *   intern reviewers  their interns' days, from three months back
 *   employees         their own, from the start of last month (so payroll
 *                     isn't changed after the fact); leave up to four
 *                     months ahead
 * Interns don't log their own days: their reviewer does.
 *
 * On top of that (cantChange), only an admin changes a day someone else
 * logged, an unpaid leave, or any day in a month whose payslip is already
 * made: those are what loss of pay is worked out from.
 */

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Why this person can't log this date, or null when they can. */
export function cantLog(
  staff: Pick<Staff, "email" | "roles" | "interns">,
  person: Pick<TeamPerson, "email" | "kind" | "reviewer" | "active">,
  date: string,
  purpose: "work" | "leave",
): string | null {
  if (staff.roles.includes("admin")) return null;
  const today = istNow().date;
  const reviewer = person.kind === "intern" && person.reviewer === staff.email && staff.interns.includes(person.email);
  const self = person.email === staff.email;
  if (!reviewer && !self) return "You can't log days for that person.";
  if (!person.active) return "That person is no longer on the active team list.";
  if (self && !reviewer && person.kind === "intern") return "Your reviewer logs your days.";

  const earliest = `${shiftMonth(monthOf(today), reviewer ? -3 : -1)}-01`;
  if (date < earliest) return "That date is too far back to change. Ask an admin.";
  const latest = purpose === "leave" ? addDays(today, 120) : today;
  if (date > latest) {
    return purpose === "leave" ? "Leave can be added up to four months ahead." : "You can't log a day that hasn't happened yet.";
  }
  return null;
}

/**
 * Why this person can't change (overwrite or remove) what's already there
 * for a day, or null when they can. `existing` is the day's row, if any;
 * `slipSaved` says the person's payslip for that month has been made.
 */
export function cantChange(
  staff: Pick<Staff, "email" | "roles">,
  existing: Pick<AttendanceDay, "logged_by" | "leave_type"> | null,
  slipSaved: boolean,
): string | null {
  if (staff.roles.includes("admin")) return null;
  if (slipSaved) return "That month's payslip is already made, so its days are locked. Ask an admin.";
  if (!existing) return null;
  if (existing.logged_by !== staff.email) return "Someone else logged that day. Ask an admin to change it.";
  if (existing.leave_type === "unpaid") return "Unpaid leave can only be changed by an admin.";
  return null;
}
