import "server-only";
import { revalidatePath } from "next/cache";
import type { Staff } from "@/lib/internal/session";
import { cantLog } from "@/lib/internal/team/access";
import { changeProblem, cleanDay, listDays, saveDay } from "@/lib/internal/team/attendance";
import {
  MAX_SLOTS,
  istNow,
  minutesBetween,
  openSlot,
  slotMinutes,
  type TeamPerson,
  type TeamResult,
} from "@/lib/internal/team/shared";

/*
 * Starting and ending a stretch of work on today ("Start my day" / "End my
 * day"), for one person. Shared by My day's actions and the browser
 * extension (app/api/extension), so both follow the same rules: which dates
 * can be logged (cantLog), nothing over a leave day or a month whose
 * payslip is made (changeProblem), one slot running at a time. Callers
 * check who's asking first and pass that person's own row.
 */

function done(result: TeamResult, message?: string): TeamResult {
  if (result.ok) revalidatePath("/internal/me");
  return result.ok && message ? { ok: true, message } : result;
}

/** A new slot on today, starting now ("Start my day" or "Start another slot"). */
export async function startDayFor(staff: Staff, person: TeamPerson): Promise<TeamResult> {
  const { date, time } = istNow();
  const blocked = cantLog(staff, person, date, "work");
  if (blocked) return { ok: false, message: blocked };
  const existing = await listDays({ from: date, to: date, emails: [person.email] });
  if (!existing.ok) return { ok: false, message: existing.message };
  const today = existing.days[0] ?? null;
  if (today?.kind === "leave") return { ok: false, message: "Today is logged as leave. Edit the day instead." };
  const running = today ? openSlot(today.slots) : null;
  if (running) return { ok: false, message: `You're already working, since ${running.start}. End that slot first.` };
  if (today && today.slots.length >= MAX_SLOTS) {
    return { ok: false, message: `A day takes ${MAX_SLOTS} slots at most. Edit the day instead.` };
  }
  const locked = await changeProblem(staff, person.email, [date]);
  if (locked) return { ok: false, message: locked };
  const clean = cleanDay(person.email, {
    day: date,
    kind: today?.kind ?? "work",
    leave_type: today?.leave_type,
    slots: [...(today?.slots ?? []), { start: time, end: null }],
    // What the earlier slots came to, breaks taken off included.
    active_hours: today && today.active_minutes !== null ? String(today.active_minutes / 60) : "",
    note: today?.note,
  });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, staff.email), today?.slots.length ? `Started again at ${time}` : `Started at ${time}`);
}

/** Ends the slot that's running: its end time, now, and active hours from the slots. */
export async function endDayFor(staff: Staff, person: TeamPerson): Promise<TeamResult> {
  const { date, time } = istNow();
  const blocked = cantLog(staff, person, date, "work") ?? (await changeProblem(staff, person.email, [date]));
  if (blocked) return { ok: false, message: blocked };
  const existing = await listDays({ from: date, to: date, emails: [person.email] });
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
  const clean = cleanDay(person.email, {
    day: date,
    kind: today.kind,
    leave_type: today.leave_type,
    slots: [...today.slots.slice(0, -1), { start: running.start, end: time }],
    active_hours: String(active / 60),
    note: today.note,
  });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, staff.email), `Ended at ${time}`);
}

/** Today for one person: whether a slot is running (and since when), and minutes so far. */
export async function dayStatusFor(person: TeamPerson): Promise<
  { ok: true; running: string | null; minutes: number; leave: boolean } | { ok: false }
> {
  const { date, time } = istNow();
  const existing = await listDays({ from: date, to: date, emails: [person.email] });
  if (!existing.ok) return { ok: false };
  const today = existing.days[0];
  if (!today) return { ok: true, running: null, minutes: 0, leave: false };
  const running = openSlot(today.slots);
  const minutes = slotMinutes(today.slots) + (running ? minutesBetween(running.start, time) ?? 0 : 0);
  return { ok: true, running: running?.start ?? null, minutes, leave: today.kind === "leave" };
}
