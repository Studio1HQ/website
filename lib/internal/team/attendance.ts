import { deleteRows, inList, selectRows, upsertRows } from "@/lib/supabase-server";
import type { Staff } from "@/lib/internal/session";
import { cantChange } from "@/lib/internal/team/access";
import { audit } from "@/lib/internal/team/audit";
import {
  TEAM_MIGRATION_HINT,
  cleanTime,
  dateRange,
  isDateKey,
  isMissingTable,
  isWeekend,
  minutesBetween,
  monthOf,
  monthStart,
  parseHours,
  type AttendanceDay,
  type AttendanceKind,
  type LeaveType,
  type TeamResult,
} from "@/lib/internal/team/shared";

/**
 * Attendance (team_attendance): one row per person per day. No session
 * checks here; lib/internal/team/access.ts decides who may log whose days.
 * Server only.
 */

const TABLE = "team_attendance";

function toDay(row: Record<string, unknown>): AttendanceDay | null {
  if (typeof row.id !== "string" || typeof row.email !== "string" || typeof row.day !== "string") return null;
  const kind: AttendanceKind = row.kind === "leave" || row.kind === "half_day" ? row.kind : "work";
  const leave = row.leave_type === "paid" || row.leave_type === "sick" || row.leave_type === "unpaid" ? row.leave_type : null;
  return {
    id: row.id,
    email: row.email,
    day: row.day,
    kind,
    leave_type: kind === "work" ? null : leave,
    start_time: cleanTime(row.start_time),
    end_time: cleanTime(row.end_time),
    active_minutes: typeof row.active_minutes === "number" ? row.active_minutes : null,
    note: typeof row.note === "string" ? row.note : "",
    logged_by: String(row.logged_by ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export type DaysResult = { ok: true; days: AttendanceDay[] } | { ok: false; message: string; missing: boolean };

/** Logged days between two dates (both included), for some people or all. */
export async function listDays(options: { from: string; to: string; emails?: string[] }): Promise<DaysResult> {
  if (options.emails && options.emails.length === 0) return { ok: true, days: [] };
  // Asked for newest first, so if the server caps the rows it's the oldest
  // days that go missing, not the latest; handed back oldest first.
  const query = new URLSearchParams({ select: "*", order: "day.desc", limit: "5000" });
  query.append("day", `gte.${options.from}`);
  query.append("day", `lte.${options.to}`);
  if (options.emails) query.set("email", inList(options.emails));
  const result = await selectRows(TABLE, query);
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing) console.error(`[team] reading ${TABLE} failed: ${result.message}`);
    return { ok: false, missing, message: missing ? TEAM_MIGRATION_HINT : "Couldn't load attendance." };
  }
  return { ok: true, days: result.rows.map(toDay).filter((day): day is AttendanceDay => day !== null).reverse() };
}

/**
 * Why someone who isn't an admin can't change these dates for this person
 * (lib/internal/team/access.ts, cantChange), or null when they can. Reads
 * what's logged and which months have a payslip; if either read fails the
 * answer is no, so a hiccup can't open the lock.
 */
export async function changeProblem(staff: Pick<Staff, "email" | "roles">, email: string, dates: string[]): Promise<string | null> {
  if (staff.roles.includes("admin") || dates.length === 0) return null;
  const sorted = [...dates].sort();
  const months = [...new Set(sorted.map((date) => monthStart(monthOf(date))))];
  const [days, slips] = await Promise.all([
    listDays({ from: sorted[0], to: sorted[sorted.length - 1], emails: [email] }),
    selectRows("team_payslips", new URLSearchParams({ select: "month", email: `eq.${email}`, month: inList(months), limit: "100" })),
  ]);
  if (!days.ok || !slips.ok) return "Couldn't check that day just now. Try again in a minute.";
  const locked = new Set(slips.rows.map((row) => String(row.month ?? "").slice(0, 7)));
  const logged = new Map(days.days.map((day) => [day.day, day]));
  for (const date of sorted) {
    const problem = cantChange(staff, logged.get(date) ?? null, locked.has(monthOf(date)));
    if (problem) return problem;
  }
  return null;
}

/** Notes, in the audit trail, the days a save or delete is about to replace. */
async function auditReplaced(email: string, dates: string[], by: string, action: "overwritten" | "deleted") {
  if (dates.length === 0) return;
  const sorted = [...dates].sort();
  const before = await listDays({ from: sorted[0], to: sorted[sorted.length - 1], emails: [email] });
  if (!before.ok) return;
  const wanted = new Set(dates);
  for (const day of before.days) {
    if (!wanted.has(day.day)) continue;
    // Someone fixing their own entry isn't worth a row; removing a day or changing another person's is.
    if (action === "overwritten" && day.logged_by === by) continue;
    await audit({
      actor: by,
      area: "attendance",
      action,
      subject: `${email} ${day.day}`,
      detail: {
        kind: day.kind,
        leave_type: day.leave_type,
        start_time: day.start_time,
        end_time: day.end_time,
        active_minutes: day.active_minutes,
        note: day.note,
        logged_by: day.logged_by,
      },
    });
  }
}

export type DayInput = {
  email: string;
  day: string;
  kind: AttendanceKind;
  leave_type: LeaveType | null;
  start_time: string | null;
  end_time: string | null;
  active_minutes: number | null;
  note: string;
};

/**
 * Checks a day someone typed. Worked days need a start time; active hours
 * default to end minus start. Leave needs a type, and a half day the type of
 * its other half.
 */
export function cleanDay(email: string, input: Record<string, unknown>): { ok: true; day: DayInput } | { ok: false; message: string } {
  if (!isDateKey(input.day)) return { ok: false, message: "Pick a valid date." };
  const kind: AttendanceKind = input.kind === "leave" || input.kind === "half_day" ? input.kind : "work";
  const leaveType =
    input.leave_type === "paid" || input.leave_type === "sick" || input.leave_type === "unpaid" ? input.leave_type : null;
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 300) : "";

  if (kind === "leave") {
    if (!leaveType) return { ok: false, message: "Pick the kind of leave." };
    return {
      ok: true,
      day: { email, day: input.day, kind, leave_type: leaveType, start_time: null, end_time: null, active_minutes: null, note },
    };
  }

  const start = cleanTime(input.start_time);
  const end = cleanTime(input.end_time);
  if (input.start_time && !start) return { ok: false, message: "The start time isn't valid." };
  if (input.end_time && !end) return { ok: false, message: "The end time isn't valid." };
  if (kind === "work" && !start) return { ok: false, message: "Add the time you started." };
  if (end && !start) return { ok: false, message: "Add the start time too." };
  if (kind === "half_day" && !leaveType) return { ok: false, message: "Pick the leave type for the other half." };

  const typed = parseHours(input.active_hours);
  if (typed !== null && Number.isNaN(typed)) return { ok: false, message: "Active hours should look like 7.5 or 7:30." };
  const span = minutesBetween(start, end);
  const active = typed ?? span;
  if (active !== null && span !== null && active > span) {
    return { ok: false, message: "Active hours can't be more than the time between start and end." };
  }
  if (active !== null && active > 16 * 60) return { ok: false, message: "That's more than 16 active hours. Check the times." };

  return {
    ok: true,
    day: {
      email,
      day: input.day,
      kind,
      leave_type: kind === "half_day" ? leaveType : null,
      start_time: start,
      end_time: end,
      active_minutes: active,
      note,
    },
  };
}

function saveError(message: string): TeamResult {
  console.error(`[team] saving attendance failed: ${message}`);
  if (isMissingTable(message)) return { ok: false, message: TEAM_MIGRATION_HINT };
  if (message.includes("23503")) return { ok: false, message: "That person isn't on the team list." };
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** Saves a day, replacing whatever was logged for it. */
export async function saveDay(day: DayInput, by: string): Promise<TeamResult> {
  await auditReplaced(day.email, [day.day], by, "overwritten");
  const result = await upsertRows(
    TABLE,
    [{ ...day, logged_by: by, updated_at: new Date().toISOString() }],
    { onConflict: "email,day" },
  );
  return result.ok ? { ok: true } : saveError(result.message);
}

/**
 * Leave from one date to another, one row per weekday (weekends are skipped).
 * Days already logged as worked are replaced, unless `staff` may not change
 * one of them.
 */
export async function saveLeave(
  email: string,
  input: { from: unknown; to: unknown; leave_type: unknown; note: unknown },
  by: string,
  /** Who's asking, so days they may not change (cantChange) stop the whole range. */
  staff?: Pick<Staff, "email" | "roles">,
): Promise<TeamResult & { days?: number }> {
  if (!isDateKey(input.from)) return { ok: false, message: "Pick the first day of leave." };
  const to = isDateKey(input.to) ? input.to : input.from;
  if (to < input.from) return { ok: false, message: "The last day is before the first." };
  const leaveType = input.leave_type === "paid" || input.leave_type === "sick" || input.leave_type === "unpaid" ? input.leave_type : null;
  if (!leaveType) return { ok: false, message: "Pick the kind of leave." };
  const all = dateRange(input.from, to);
  if (all.length > 45) return { ok: false, message: "Add at most 45 days at a time." };
  const days = all.length === 1 ? all : all.filter((date) => !isWeekend(date));
  if (days.length === 0) return { ok: false, message: "Those dates are all on a weekend." };
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 300) : "";
  if (staff) {
    const problem = await changeProblem(staff, email, days);
    if (problem) return { ok: false, message: days.length > 1 ? `One of those days can't be changed. ${problem}` : problem };
  }
  const now = new Date().toISOString();
  await auditReplaced(email, days, by, "overwritten");
  const result = await upsertRows(
    TABLE,
    days.map((day) => ({
      email,
      day,
      kind: "leave",
      leave_type: leaveType,
      start_time: null,
      end_time: null,
      active_minutes: null,
      note,
      logged_by: by,
      updated_at: now,
    })),
    { onConflict: "email,day" },
  );
  return result.ok ? { ok: true, days: days.length } : saveError(result.message);
}

export async function deleteDay(email: string, day: string, by: string): Promise<TeamResult> {
  if (!isDateKey(day)) return { ok: false, message: "Pick a valid date." };
  await auditReplaced(email, [day], by, "deleted");
  const result = await deleteRows(TABLE, new URLSearchParams({ email: `eq.${email}`, day: `eq.${day}` }));
  if (!result.ok) return saveError(result.message);
  return { ok: true };
}
