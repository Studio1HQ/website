"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, requireMember } from "@/lib/internal/session";
import { cantLog } from "@/lib/internal/team/access";
import { changeProblem, cleanDay, deleteDay, listDays, saveDay, saveLeave } from "@/lib/internal/team/attendance";
import { cleanPerson, removePhoto, setEmployeeCode, setPhoto, updateOwnName } from "@/lib/internal/team/people";
import { startReceiptUpload } from "@/lib/internal/team/files";
import { addReimbursement, withdrawReimbursement } from "@/lib/internal/team/reimbursements";
import {
  MAX_SLOTS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  dayLabel,
  isDateKey,
  isUuid,
  istNow,
  minutesBetween,
  openSlot,
  slotMinutes,
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

/**
 * "Start my day", or "Start another slot" once the last one has ended: a
 * new slot on today, starting now.
 */
export async function startDay(): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const { date, time } = istNow();
  const blocked = cantLog(self.staff, self.person, date, "work");
  if (blocked) return { ok: false, message: blocked };
  const existing = await listDays({ from: date, to: date, emails: [self.person.email] });
  if (!existing.ok) return { ok: false, message: existing.message };
  const today = existing.days[0] ?? null;
  if (today?.kind === "leave") return { ok: false, message: "Today is logged as leave. Edit the day instead." };
  const running = today ? openSlot(today.slots) : null;
  if (running) return { ok: false, message: `You're already working, since ${running.start}. End that slot first.` };
  if (today && today.slots.length >= MAX_SLOTS) {
    return { ok: false, message: `A day takes ${MAX_SLOTS} slots at most. Edit the day instead.` };
  }
  const locked = await changeProblem(self.staff, self.person.email, [date]);
  if (locked) return { ok: false, message: locked };
  const clean = cleanDay(self.person.email, {
    day: date,
    kind: today?.kind ?? "work",
    leave_type: today?.leave_type,
    slots: [...(today?.slots ?? []), { start: time, end: null }],
    // What the earlier slots came to, breaks taken off included.
    active_hours: today && today.active_minutes !== null ? String(today.active_minutes / 60) : "",
    note: today?.note,
  });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, self.staff.email), today?.slots.length ? `Started again at ${time}` : `Started at ${time}`);
}

/**
 * "End my day" (or the slot that's running): its end time, now, and active
 * hours from the slots.
 */
export async function endDay(): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const { date, time } = istNow();
  const blocked = cantLog(self.staff, self.person, date, "work") ?? (await changeProblem(self.staff, self.person.email, [date]));
  if (blocked) return { ok: false, message: blocked };
  const existing = await listDays({ from: date, to: date, emails: [self.person.email] });
  if (!existing.ok) return { ok: false, message: existing.message };
  const today = existing.days[0];
  const running = today ? openSlot(today.slots) : null;
  if (!today || !running) {
    return { ok: false, message: today?.slots.length ? "Nothing's running. Start another slot first." : "Start your day first." };
  }
  const earlier = slotMinutes(today.slots);
  const total = earlier + (minutesBetween(running.start, time) ?? 0);
  // Keep active hours someone already typed, unless they'd now be too long.
  // With earlier slots, a figure no longer than them is theirs alone (their
  // breaks taken off), so this slot is added on top.
  const typed = today.active_minutes;
  const active =
    typed === null ? total : today.slots.length > 1 && typed <= earlier ? typed + (total - earlier) : typed <= total ? typed : total;
  const clean = cleanDay(self.person.email, {
    day: date,
    kind: today.kind,
    leave_type: today.leave_type,
    slots: [...today.slots.slice(0, -1), { start: running.start, end: time }],
    active_hours: String(active / 60),
    note: today.note,
  });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, self.staff.email), `Ended at ${time}`);
}

/**
 * Saves one of my days from the day form. `from` is the date the entry was on
 * when the form opened: a different date moves it there (logged on the wrong
 * day, like after midnight), as long as nothing's on that date already.
 */
export async function saveMyDay(input: Record<string, unknown>): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const clean = cleanDay(self.person.email, input ?? {});
  if (!clean.ok) return clean;
  const to = clean.day.day;
  const from = isDateKey(input?.from) && input.from !== to ? input.from : null;
  const blocked =
    cantLog(self.staff, self.person, to, clean.day.kind === "leave" ? "leave" : "work") ??
    (from ? cantLog(self.staff, self.person, from, "leave") : null) ??
    (await changeProblem(self.staff, self.person.email, from ? [to, from] : [to]));
  if (blocked) return { ok: false, message: blocked };
  if (!from) return done(await saveDay(clean.day, self.staff.email), "Saved");

  const taken = await listDays({ from: to, to, emails: [self.person.email] });
  if (!taken.ok) return { ok: false, message: taken.message };
  if (taken.days.length) {
    return { ok: false, message: `${dayLabel(to)} already has a day logged. Edit that one, or remove it first.` };
  }
  const saved = await saveDay(clean.day, self.staff.email);
  if (!saved.ok) return saved;
  const removed = await deleteDay(self.person.email, from, self.staff.email);
  if (!removed.ok) {
    revalidatePath("/internal/me");
    return { ok: false, message: `Saved on ${dayLabel(to)}, but ${dayLabel(from)} is still there. Remove it by hand.` };
  }
  return done(saved, `Moved to ${dayLabel(to)}`);
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

/**
 * An admin's own employee ID. Everyone else's is set for them on People, so
 * nobody picks their own unless they could already set anyone's.
 */
export async function updateMyEmployeeId(code: unknown): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  if (!isAdmin(self.staff)) return { ok: false, message: "Employee IDs are set by an admin." };
  // Only the ID is written, so a change someone else made to this person's
  // other details a moment ago isn't put back.
  const clean = cleanPerson({ ...self.person, employee_code: code });
  if (!clean.ok) return clean;
  const result = await setEmployeeCode(self.person.email, clean.person.employee_code, self.staff.email, self.person);
  if (result.ok) revalidatePath("/internal", "layout");
  return result.ok ? { ok: true, message: "Employee ID saved" } : result;
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

/**
 * A PDF receipt too big for a server action (over MAX_UPLOAD_BYTES): the
 * browser gets a one-off link, puts the file in the bucket itself, then
 * sends the claim with the id from here as `receipt_id`.
 */
export async function startReceipt(): Promise<{ ok: true; id: string; url: string } | { ok: false; message: string }> {
  const self = await me();
  if (!self) return { ok: false, message: "You're not on the team list yet. Ask an admin to add you." };
  return startReceiptUpload(self.person.email);
}

/** An expense claim from the dashboard, with an optional receipt. */
export async function claimExpense(form: FormData): Promise<TeamResult> {
  const self = await me();
  if (!self) return NOT_ON_LIST;
  const file = form.get("receipt");
  const uploadedId = form.get("receipt_id");
  const uploadedName = form.get("receipt_name");
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
    uploaded:
      !receipt && isUuid(uploadedId)
        ? { id: uploadedId, name: typeof uploadedName === "string" && uploadedName ? uploadedName : "Receipt.pdf" }
        : null,
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
