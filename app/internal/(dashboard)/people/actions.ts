"use server";

import { revalidatePath } from "next/cache";
import { renderEmail } from "@/lib/internal/email-templates";
import { isOwner, isStaffEmail, rolesLabel, type RoleKey } from "@/lib/internal/roles";
import { requirePeople } from "@/lib/internal/session";
import { cantLog } from "@/lib/internal/team/access";
import { changeProblem, cleanDay, deleteDay, saveDay, saveLeave } from "@/lib/internal/team/attendance";
import { getPerson } from "@/lib/internal/team/people";
import { displayName, isDateKey, type TeamResult } from "@/lib/internal/team/shared";
import { addTeammate, saveTeammate, setTeammateOn, type Actor } from "@/lib/internal/team/teammates";
import { emailAddress } from "@/lib/internal/token";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { baseUrl } from "@/lib/site";

/**
 * The People page: admins keep the one team list (who's on it, their
 * details and what they can open) and log anyone's days; reviewers log
 * their interns' days. Every action checks both.
 */

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

/* ------------------------------------------------------------- the team */

async function requireAdmin(): Promise<Actor | null> {
  const staff = await requirePeople();
  return staff.admin ? { email: staff.email, owner: isOwner(staff.email) } : null;
}

const ADMINS_ONLY: TeamResult = { ok: false, message: "Only admins can change the team." };

function teamChanged(result: TeamResult): TeamResult {
  if (result.ok) revalidatePath("/internal", "layout");
  return result;
}

/**
 * Adds someone from the Add person dialog: their details and what they can
 * open, then an email saying they're in. Admins only; outside writers, the
 * Admin switch and Team tasks stay with the founders (lib/internal/team/teammates.ts).
 */
export async function addTeammateAction(input: Record<string, unknown>): Promise<TeamResult> {
  const actor = await requireAdmin();
  if (!actor) return ADMINS_ONLY;
  const added = await addTeammate(actor, input);
  if (!added.ok) return added;
  revalidatePath("/internal", "layout");
  return { ok: true, message: await sendInvite(added.email, added.roles, actor.email) };
}

/** Saves someone's details and access from their row's dialog. */
export async function saveTeammateAction(input: Record<string, unknown>): Promise<TeamResult> {
  const actor = await requireAdmin();
  if (!actor) return ADMINS_ONLY;
  return teamChanged(await saveTeammate(actor, input));
}

/** Turns someone's access off, or back on. The founders only. */
export async function setTeammateAccess(email: unknown, on: unknown): Promise<TeamResult> {
  const actor = await requireAdmin();
  if (!actor) return ADMINS_ONLY;
  const target = emailAddress(email);
  if (!target || typeof on !== "boolean") return { ok: false, message: "That change isn't valid." };
  return teamChanged(await setTeammateOn(actor, target, on));
}

/**
 * Tells someone they're in. Never a sign-in link (codes only; see the login
 * page): the button opens the login page, where they ask for a code.
 */
async function sendInvite(target: string, roles: RoleKey[], by: string): Promise<string> {
  if (!isMailerConfigured()) {
    return `Added ${target}. Email isn't set up, so send them ${baseUrl}/internal/login yourself.`;
  }
  const inviter = displayName({ email: by });
  const writerOnly = roles.length === 1 && roles[0] === "blog_writer" && !isStaffEmail(target);
  const body = writerOnly
    ? `Hi,\n\n${inviter} invited you to write for the Studio1 blog.\n\nSign in with this address (${target}) and you'll land in the blog editor. Write your post there, and when it's ready, ask for a review. A Studio1 reviewer will take it from there.\n\nThe Studio1 team`
    : `Hi,\n\n${inviter} added you to the Studio1 dashboard (My day, Tasks and Calls${roles.length ? `, plus ${rolesLabel(roles)}` : ""}).\n\nSign in with this address (${target}) using the button below.\n\nThe Studio1 team`;
  const { html, text } = renderEmail({
    body,
    call: {
      label: writerOnly ? "Open the blog editor" : "Open the dashboard",
      url: `${baseUrl}/internal/login?next=${writerOnly ? "/internal/blog" : "/internal"}`,
    },
    reason: `You're getting this because a Studio1 admin invited ${target}.`,
  });
  try {
    await sendMail({
      to: target,
      subject: writerOnly ? "You're invited to write for the Studio1 blog" : "You have access to the Studio1 dashboard",
      html,
      text,
      replyTo: by,
    });
  } catch (error) {
    console.error("[internal] invite email failed", error);
    return `Added ${target}, but the invite email didn't send. Send them ${baseUrl}/internal/login.`;
  }
  return `Added ${target} and emailed them an invite.`;
}
