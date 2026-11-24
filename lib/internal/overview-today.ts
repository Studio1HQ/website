import { isIn, occurrences, toMinutes, type Call, type CallChange } from "@/lib/internal/calls/shared";
import { followUpDue, isOpen } from "@/lib/internal/outreach/rules";
import type { Org } from "@/lib/internal/outreach/schema";
import { isOwed, type Task } from "@/lib/internal/tasks/shared";
import { rollingCounts } from "@/lib/internal/trend";

/**
 * The Overview's "today" cards and its Outreach card, worked out from rows
 * already read. No server imports, so the tests can check them.
 */

export type TodayTask = { id: string; title: string; due_on: string; late: boolean; blocked: boolean };

/** Someone's open tasks due today or earlier: the longest overdue first, then today's. */
export function todayTasks(tasks: readonly Task[], today: string, limit = 6): { items: TodayTask[]; more: number } {
  const due = tasks
    // What they still owe: one in review is handed in, so it isn't due or late.
    .filter((task) => isOwed(task.status) && task.due_on !== null && task.due_on <= today)
    .sort((a, b) => (a.due_on ?? "").localeCompare(b.due_on ?? "") || a.created_at.localeCompare(b.created_at));
  return {
    items: due.slice(0, limit).map((task) => ({
      id: task.id,
      title: task.title,
      due_on: task.due_on ?? today,
      late: (task.due_on ?? today) < today,
      blocked: task.blocked,
    })),
    more: Math.max(0, due.length - limit),
  };
}

export type TodayCall = { key: string; title: string; start: string; minutes: number; link: string; over: boolean };

/** The calls this person is in today, earliest first; cancelled ones left out. `time` is "HH:MM" now. */
export function todayCalls(
  calls: readonly Call[],
  changes: readonly CallChange[],
  email: string,
  today: string,
  time: string,
): TodayCall[] {
  const mine = calls.filter((call) => isIn(call, email));
  const byId = new Map(mine.map((call) => [call.id, call]));
  return occurrences(mine, changes, today, today)
    .filter((item) => !item.cancelled && item.day === today)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    .map((item) => {
      const call = byId.get(item.call_id);
      return {
        key: item.key,
        title: call?.title ?? "Call",
        start: item.start,
        minutes: item.minutes,
        link: call?.link ?? "",
        over: toMinutes(item.start) + item.minutes <= toMinutes(time),
      };
    });
}

/** The outreach pipeline in a few numbers: what's in play, how far along, and what was won this month. */
export function outreachSummary(orgs: readonly Org[], today: string, nowMs = Date.now()) {
  const month = today.slice(0, 7);
  const open = orgs.filter((org) => isOpen(org.stage));
  return {
    open: open.length,
    callBooked: open.filter((org) => org.stage === "call_booked").length,
    proposal: open.filter((org) => org.stage === "proposal").length,
    followUpsDue: open.filter((org) => followUpDue(org, today)).length,
    /** Organisations added in each of the last eight weeks, oldest first. */
    addedByWeek: rollingCounts(
      orgs.map((org) => org.created_at),
      nowMs,
      7 * 24 * 60 * 60 * 1000,
      8,
    ),
    wonThisMonth: orgs.filter((org) => org.stage === "won" && Boolean(org.closed_on?.startsWith(month))).length,
  };
}
