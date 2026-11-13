"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/internal/session";
import { cantLog } from "@/lib/internal/team/access";
import { changeProblem, cleanDay, deleteDay, listDays, saveDay, saveLeave } from "@/lib/internal/team/attendance";
import { removePhoto, setPhoto, updateOwnName } from "@/lib/internal/team/people";
import { addReimbursement, withdrawReimbursement } from "@/lib/internal/team/reimbursements";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  isDateKey,
  istNow,
  minutesBetween,
  type TeamResult,
} from "@/lib/internal/team/shared";

/**
 * My day: each person's own profile, attendance, leave and expense claims.
 * Server actions are public endpoints, so each one checks the session and
 * works only on the signed-in person's own rows. Days go through cantLog
 * (which dates) and changeProblem (not over someone else's entry, an unpaid
 * leave, or a month whose payslip is made).
 */

async function me() {
  const staff = await requireMember();
  return staff.person ? { staff, person: staff.person } : null;
}

const NOT_ON_LIST: TeamResult = { ok: false, message: "You're not on the team list yet. Ask an admin to add you." };

function done(result: TeamResult, message?: string): TeamResult {
  if (result.ok) revalidatePath("/internal/me");
  return result.ok && message ? { ok: true, message } : result;
}

/** "Start my day": today's start time, now. */
export async function startDay(): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const { date, time } = istNow();
  const blocked = cantLog(self.staff, self.person, date, "work");
  if (blocked) return { ok: false, message: blocked };
  const existing = await listDays({ from: date, to: date, emails: [self.person.email] });
  if (existing.ok && existing.days[0]?.start_time) return { ok: false, message: "Today already has a start time. Edit it instead." };
  const locked = await changeProblem(self.staff, self.person.email, [date]);
  if (locked) return { ok: false, message: locked };
  const clean = cleanDay(self.person.email, { day: date, kind: "work", start_time: time });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, self.staff.email), `Started at ${time}`);
}

/** "End my day": today's end time, now, and active hours from start to end. */
export async function endDay(): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const { date, time } = istNow();
  const blocked = cantLog(self.staff, self.person, date, "work") ?? (await changeProblem(self.staff, self.person.email, [date]));
  if (blocked) return { ok: false, message: blocked };
  const existing = await listDays({ from: date, to: date, emails: [self.person.email] });
  if (!existing.ok) return { ok: false, message: existing.message };
  const today = existing.days[0];
  if (!today?.start_time) return { ok: false, message: "Start your day first." };
  // Keep active hours someone already typed, unless they'd now be too long.
  const span = minutesBetween(today.start_time, time);
  const active = today.active_minutes !== null && span !== null && today.active_minutes <= span ? today.active_minutes : span;
  const clean = cleanDay(self.person.email, {
    day: date,
    kind: today.kind,
    leave_type: today.leave_type,
    start_time: today.start_time,
    end_time: time,
    active_hours: active === null ? "" : String(active / 60),
    note: today.note,
  });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, self.staff.email), `Ended at ${time}`);
}

/** Saves one of my days from the day form. */
export async function saveMyDay(input: Record<string, unknown>): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const clean = cleanDay(self.person.email, input ?? {});
  if (!clean.ok) return clean;
  const blocked =
    cantLog(self.staff, self.person, clean.day.day, clean.day.kind === "leave" ? "leave" : "work") ??
    (await changeProblem(self.staff, self.person.email, [clean.day.day]));
  if (blocked) return { ok: false, message: blocked };
  return done(await saveDay(clean.day, self.staff.email), "Saved");
}

export async function deleteMyDay(day: unknown): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  if (!isDateKey(day)) return { ok: false, message: "Pick a valid date." };
  const blocked = cantLog(self.staff, self.person, day, "leave") ?? (await changeProblem(self.staff, self.person.email, [day]));
  if (blocked) return { ok: false, message: blocked };
  return done(await deleteDay(self.person.email, day, self.staff.email), "Removed");
}

export async function addMyLeave(input: Record<string, unknown>): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const from = typeof input?.from === "string" ? input.from : "";
  const to = typeof input?.to === "string" && input.to ? input.to : from;
  for (const date of [from, to]) {
    const blocked = isDateKey(date) ? cantLog(self.staff, self.person, date, "leave") : "Pick valid dates.";
    if (blocked) return { ok: false, message: blocked };
  }
  const result = await saveLeave(
    self.person.email,
    { from, to, leave_type: input?.leave_type, note: input?.note },
    self.staff.email,
    self.staff,
  );
  return done(result, result.ok ? `Leave added for ${result.days} ${result.days === 1 ? "day" : "days"}` : undefined);
}

export async function updateMyName(name: unknown): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const result = await updateOwnName(self.person.email, name);
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: "Name saved" } : result;
}

export async function uploadMyPhoto(form: FormData): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pick a photo first." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: `Photos can be ${MAX_UPLOAD_LABEL} at most.` };
  const result = await setPhoto(self.person.email, file);
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: "Photo updated" } : result;
}

export async function removeMyPhoto(): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const result = await removePhoto(self.person.email);
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: "Photo removed" } : result;
}

/** An expense claim from the dashboard, with an optional receipt. */
export async function claimExpense(form: FormData): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const file = form.get("receipt");
  if (file instanceof File && file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `Receipts can be ${MAX_UPLOAD_LABEL} at most.` };
  }
  const receipt =
    file instanceof File && file.size > 0 ? { body: new Uint8Array(await file.arrayBuffer()), name: file.name } : null;
  const result = await addReimbursement({
    email: self.person.email,
    description: form.get("description"),
    amount: form.get("amount"),
    currency: form.get("currency"),
    spent_on: form.get("spent_on"),
    receipt,
    source: "dashboard",
  });
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: "Claim sent for approval" } : result;
}

export async function withdrawClaim(id: unknown): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  if (typeof id !== "string") return { ok: false, message: "That claim isn't there any more." };
  const result = await withdrawReimbursement(id, self.person.email);
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: "Claim withdrawn" } : result;
}
