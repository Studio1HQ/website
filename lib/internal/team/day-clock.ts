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
  runningDay,
  shiftDay,
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
 *
 * A slot started late can still be running after midnight: it stays on the
 * day it started (runningDay), so ending it then changes yesterday's row,
 * and nothing new starts on today until it has ended.
 */

function done(result: TeamResult, message?: string): TeamResult {
  if (result.ok) revalidatePath("/internal/me");
  return result.ok && message ? { ok: true, message } : result;
}

/** Today's and yesterday's rows for one person, in one read. */
async function recentDays(email: string, date: string) {
  const before = shiftDay(date, -1);
  const result = await listDays({ from: before, to: date, emails: [email] });
  if (!result.ok) return result;
  const on = (day: string) => result.days.find((row) => row.day === day) ?? null;
  return { ok: true as const, today: on(date), yesterday: on(before) };
}

/** A new slot on today, starting now ("Start my day" or "Start another slot"). */
export async function startDayFor(staff: Staff, person: TeamPerson): Promise<TeamResult> {
  const { date, time } = istNow();
  const blocked = cantLog(staff, person, date, "work");
  if (blocked) return { ok: false, message: blocked };
  const recent = await recentDays(person.email, date);
  if (!recent.ok) return { ok: false, message: recent.message };
  const today = recent.today;
  if (today?.kind === "leave") return { ok: false, message: "Today is logged as leave. Edit the day instead." };
  // Running on today, or since yesterday evening and not ended yet.
  const working = runningDay(today, recent.yesterday, time);
  const running = working ? openSlot(working.slots) : null;
  if (working && running) {
    const since = working === today ? running.start : `${running.start} yesterday`;
    return { ok: false, message: `You're already working, since ${since}. End that slot first.` };
  }
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

/**
 * Ends the slot that's running: its end time, now, and active hours from the
 * slots. After midnight that can be yesterday's last slot, which ends on
 * yesterday's row (a day's last slot may run past midnight).
 */
export async function endDayFor(staff: Staff, person: TeamPerson): Promise<TeamResult> {
  const { date, time } = istNow();
  const refused = cantLog(staff, person, date, "work");
  if (refused) return { ok: false, message: refused };
  const recent = await recentDays(person.email, date);
  if (!recent.ok) return { ok: false, message: recent.message };
  // The day being changed: the one with the running slot, else today.
  const day = runningDay(recent.today, recent.yesterday, time) ?? recent.today;
  const target = day?.day ?? date;
  const blocked = cantLog(staff, person, target, "work") ?? (await changeProblem(staff, person.email, [target]));
  if (blocked) return { ok: false, message: blocked };
  const running = day ? openSlot(day.slots) : null;
  if (!day || !running) {
    return { ok: false, message: day?.slots.length ? "Nothing's running. Start another slot first." : "Start your day first." };
  }
  const earlier = slotMinutes(day.slots);
  const total = earlier + (minutesBetween(running.start, time) ?? 0);
  // Keep active hours someone already typed, unless they'd now be too long.
  // With earlier slots, a figure no longer than them is theirs alone (their
  // breaks taken off), so this slot is added on top.
  const typed = day.active_minutes;
  const active =
    typed === null ? total : day.slots.length > 1 && typed <= earlier ? typed + (total - earlier) : typed <= total ? typed : total;
  const clean = cleanDay(person.email, {
    day: day.day,
    kind: day.kind,
    leave_type: day.leave_type,
    slots: [...day.slots.slice(0, -1), { start: running.start, end: time }],
    active_hours: String(active / 60),
    note: day.note,
  });
  if (!clean.ok) return clean;
  return done(await saveDay(clean.day, staff.email), `Ended at ${time}`);
}

/**
 * Today for one person: whether a slot is running (and since when), and
 * minutes so far. A slot still going from yesterday evening counts as
 * running, with that day's minutes.
 */
export async function dayStatusFor(person: TeamPerson): Promise<
  { ok: true; running: string | null; minutes: number; leave: boolean } | { ok: false }
> {
  const { date, time } = istNow();
  const recent = await recentDays(person.email, date);
  if (!recent.ok) return { ok: false };
  const day = runningDay(recent.today, recent.yesterday, time) ?? recent.today;
  if (!day) return { ok: true, running: null, minutes: 0, leave: false };
  const running = openSlot(day.slots);
  const minutes = slotMinutes(day.slots) + (running ? minutesBetween(running.start, time) ?? 0 : 0);
  return { ok: true, running: running?.start ?? null, minutes, leave: day.kind === "leave" };
}
