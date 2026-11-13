"use server";

import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/internal/roles";
import { requirePeople } from "@/lib/internal/session";
import { cantLog } from "@/lib/internal/team/access";
import { changeProblem, cleanDay, deleteDay, saveDay, saveLeave } from "@/lib/internal/team/attendance";
import { addPerson, cleanPerson, getPerson, reviewerProblem, updatePerson } from "@/lib/internal/team/people";
import { isDateKey, type TeamResult } from "@/lib/internal/team/shared";
import { emailAddress } from "@/lib/internal/token";

/**
 * The People page: admins log anyone's days and keep the team list;
 * reviewers log their interns' days. Every action checks both.
 *
 * Being on the team list, or being named an intern's reviewer, is a way into
 * the dashboard. So adding someone, bringing someone back, and naming a
 * reviewer are the owners' call, like every other way in
 * (app/internal/(dashboard)/team/actions.ts). Other admins can still fix
 * names, IDs, designations and dates, and mark someone as having left.
 */

const OWNERS_ONLY = "Only Arindam and Amitesh can add people, bring someone back or set a reviewer: it lets them into the dashboard.";

/** One answer for "not on the list" and "not yours", so the list can't be probed. */
const NOT_YOURS = "You can't log days for that person.";

function done(result: TeamResult, message: string): TeamResult {
  if (result.ok) revalidatePath("/internal/people");
  return result.ok ? { ok: true, message } : result;
}

async function target(email: unknown) {
  const staff = await requirePeople();
  const address = emailAddress(email);
  const person = address ? await getPerson(address) : null;
  return { staff, person };
}

export async function saveDayFor(email: unknown, input: Record<string, unknown>): Promise<TeamResult> {
  const { staff, person } = await target(email);
  if (!person) return { ok: false, message: NOT_YOURS };
  const clean = cleanDay(person.email, input ?? {});
  if (!clean.ok) return clean;
  const blocked =
    cantLog(staff, person, clean.day.day, clean.day.kind === "leave" ? "leave" : "work") ??
    (await changeProblem(staff, person.email, [clean.day.day]));
  if (blocked) return { ok: false, message: blocked };
  return done(await saveDay(clean.day, staff.email), "Saved");
}

export async function deleteDayFor(email: unknown, day: unknown): Promise<TeamResult> {
  const { staff, person } = await target(email);
  if (!person) return { ok: false, message: NOT_YOURS };
  if (!isDateKey(day)) return { ok: false, message: "Pick a valid date." };
  const blocked = cantLog(staff, person, day, "leave") ?? (await changeProblem(staff, person.email, [day]));
  if (blocked) return { ok: false, message: blocked };
  return done(await deleteDay(person.email, day, staff.email), "Removed");
}

export async function addLeaveFor(input: Record<string, unknown>): Promise<TeamResult> {
  const { staff, person } = await target(input?.email);
  if (!person) return { ok: false, message: NOT_YOURS };
  const from = typeof input.from === "string" ? input.from : "";
  const to = typeof input.to === "string" && input.to ? input.to : from;
  for (const date of [from, to]) {
    const blocked = isDateKey(date) ? cantLog(staff, person, date, "leave") : "Pick valid dates.";
    if (blocked) return { ok: false, message: blocked };
  }
  const result = await saveLeave(person.email, { from, to, leave_type: input.leave_type, note: input.note }, staff.email, staff);
  return done(result, result.ok ? `Leave added for ${result.days} ${result.days === 1 ? "day" : "days"}` : "");
}

/**
 * Adds someone to the team list, or changes their details. Admins only; the
 * changes that let someone in (see the top of this file) need an owner.
 */
export async function savePerson(input: Record<string, unknown>, isNew: unknown): Promise<TeamResult> {
  const staff = await requirePeople();
  if (!staff.admin) return { ok: false, message: "Only admins can change the team list." };
  const clean = cleanPerson(input ?? {});
  if (!clean.ok) return clean;
  const owner = isOwner(staff.email);
  const before = await getPerson(clean.person.email);

  if (isNew === true) {
    if (!owner) return { ok: false, message: OWNERS_ONLY };
    if (before) return { ok: false, message: "That person is already on the team list." };
  } else {
    if (!before) return { ok: false, message: "That person isn't on the team list." };
    const comingBack = clean.person.active && !before.active;
    const newReviewer = clean.person.reviewer !== null && clean.person.reviewer !== before.reviewer;
    if ((comingBack || newReviewer) && !owner) return { ok: false, message: OWNERS_ONLY };
  }
  // A reviewer that's being set or changed has to be someone at Studio1 who's still around.
  if (clean.person.reviewer && clean.person.reviewer !== before?.reviewer) {
    const problem = await reviewerProblem(clean.person.reviewer);
    if (problem) return { ok: false, message: problem };
  }

  const result = isNew === true ? await addPerson(clean.person, staff.email) : await updatePerson(clean.person, staff.email, before);
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: isNew === true ? "Added to the team" : "Saved" } : result;
}
