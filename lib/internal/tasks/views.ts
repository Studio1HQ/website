/**
 * Small pure helpers for the Week, Month and Team views of Tasks: which
 * week or month to show, the month calendar, heat steps, grouping and the
 * founders' report cell. Client-safe, no server imports.
 */

import {
  addDays,
  daysInMonth,
  isDateKey,
  isMonthKey,
  monthOf,
  weekStart,
} from "@/lib/internal/clients/schema";
import type { AttendanceKind } from "@/lib/internal/team/shared";
import {
  isPastDue,
  readyOn,
  reportStatusLabel,
  type Report,
  type Tone,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

/**
 * The week to show: ?week= as any day snapped to its Monday, never after
 * this week; this week when missing or not a date.
 */
export function weekToShow(value: string | undefined, today: string) {
  const current = weekStart(today);
  if (!isDateKey(value)) return current;
  const week = weekStart(value);
  return week > current ? current : week;
}

/** The month to show: ?month=YYYY-MM, never after this month. */
export function monthToShow(value: string | undefined, today: string) {
  const current = monthOf(today);
  if (!isMonthKey(value)) return current;
  return value > current ? current : value;
}

/**
 * A Monday-first calendar: one row per week touching the month, seven
 * cells each, null for days outside it.
 */
export function monthCalendar(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  const rows: (string | null)[][] = [];
  for (let week = weekStart(first); week <= last; week = addDays(week, 7)) {
    rows.push(Array.from({ length: 7 }, (_, index) => {
      const day = addDays(week, index);
      return day >= first && day <= last ? day : null;
    }));
  }
  return rows;
}

/** 0 for nothing done, then 1–4: one thing, two or three, four or five, six or more. */
export function heatLevel(count: number | null | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!count || count <= 0) return 0;
  if (count < 2) return 1;
  if (count < 4) return 2;
  if (count < 6) return 3;
  return 4;
}

/** Logs per day, each day's in the order they were logged. */
export function logsByDay<T extends Pick<WorkLog, "day">>(logs: readonly T[]) {
  const days: Record<string, T[]> = {};
  for (const log of logs) (days[log.day] ??= []).push(log);
  return days;
}

/** Minutes per person per day: { email: { day: minutes } }. */
export function minutesByPersonDay(logs: readonly Pick<WorkLog, "email" | "day" | "minutes">[]) {
  const out: Record<string, Record<string, number>> = {};
  for (const log of logs) {
    const email = log.email.toLowerCase();
    const person = (out[email] ??= {});
    person[log.day] = (person[log.day] ?? 0) + log.minutes;
  }
  return out;
}

export type DayMark = { kind: AttendanceKind; active_minutes: number | null };

/** Attendance per day: { day: { kind, active_minutes } }. */
export function attendanceByDay(days: readonly ({ day: string } & DayMark)[]) {
  const out: Record<string, DayMark> = {};
  for (const day of days) out[day.day] = { kind: day.kind, active_minutes: day.active_minutes };
  return out;
}

/** Attendance per person per day. */
export function attendanceByPersonDay(days: readonly ({ email: string; day: string } & DayMark)[]) {
  const out: Record<string, Record<string, DayMark>> = {};
  for (const day of days) (out[day.email.toLowerCase()] ??= {})[day.day] = { kind: day.kind, active_minutes: day.active_minutes };
  return out;
}

/** Items with a day grouped by the Monday of their week, weeks in order. */
export function groupByWeek<T extends { day?: string | null }>(items: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    if (!item.day) continue;
    const week = weekStart(item.day);
    const list = groups.get(week);
    if (list) list.push(item);
    else groups.set(week, [item]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Each value as a share of the biggest, 0–100 (rounded, at least 2 when above 0). */
export function barShares(values: readonly number[]) {
  const max = Math.max(0, ...values);
  return values.map((value) => (max > 0 && value > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0));
}

/** Percentage of a total, rounded; 0 for an empty total. */
export function share(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export type ReportCell = { label: string; tone: Tone; late: boolean };

/**
 * The founders' "Report" cell for one person and week: its status, or
 * "Not due yet" / "Not started", and whether it's late (past due and not
 * submitted).
 */
export function reportCell(
  report: Pick<Report, "status"> | null | undefined,
  week: string,
  now: { date: string; time: string },
): ReportCell {
  const pastDue = isPastDue("week", week, now);
  if (!report) {
    if (now.date < readyOn("week", week)) return { label: "Not due yet", tone: "stone", late: false };
    return { label: "Not started", tone: pastDue ? "rose" : "stone", late: pastDue };
  }
  const sent = report.status === "submitted" || report.status === "seen";
  const tone: Tone = report.status === "seen" ? "emerald" : report.status === "submitted" ? "sky" : report.status === "returned" ? "amber" : "stone";
  return { label: reportStatusLabel(report.status), tone: !sent && pastDue ? "rose" : tone, late: !sent && pastDue };
}
