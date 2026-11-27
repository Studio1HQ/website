/**
 * The founders' monthly review of each person: what they finished, what
 * slipped past its day, the working days with no sign of work, and when
 * they usually work. Flags turn that into "Follow up" / "Watch" / "On
 * track", and a follow-up email can be drafted from them.
 *
 * Pure: lib/internal/team/review-data.ts reads attendance, tasks, client
 * pieces and dashboard activity; the Monthly review page
 * (app/internal/(dashboard)/tasks/reports/review) and the monthly founders'
 * email show the result.
 */

import type { AttendanceDay, WorkSlot } from "@/lib/internal/team/shared";
import { datesOfMonth, isWeekend, monthLabel, shiftDay } from "@/lib/internal/team/shared";
import { forKey, forLabel, isOnTask, type EngagementLabel, type Task } from "@/lib/internal/tasks/shared";

/* ----------------------------------------------------------------- rules */

/** When the review starts looking: the day Tasks went live for the team. */
export const REVIEW_START = "2026-11-16";

export const REVIEW_RULES = {
  /** Working days with no sign of work: watch from 2, follow up from 4 (or 40% of the working days). */
  quietWatch: 2,
  quietFollowUp: 4,
  quietShare: 0.4,
  /** Tasks and client pieces that slipped past their day. */
  slipWatch: 3,
  slipFollowUp: 6,
  /** An employee's average logged day under this is worth a look (minutes). */
  shortDay: 6 * 60,
  /** Fewer working days than this and the rules about days wait. */
  minDays: 3,
  /** Days worked without logging hours before it's worth a note. */
  unlogged: 3,
  /** Minutes in an hour that count as working in it. */
  hourMinutes: 15,
  /** Slots that start before this (05:00) belong to the night before. */
  dayStartsAt: 5 * 60,
} as const;

/* ----------------------------------------------------------------- types */

export type ReviewStatus = "follow_up" | "watch" | "on_track";
export type FlagLevel = ReviewStatus | "note";
export type Flag = { level: Exclude<FlagLevel, "on_track">; text: string };

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  follow_up: "Follow up",
  watch: "Watch",
  on_track: "On track",
};

/**
 * worked: hours logged · active: did something, no hours logged · half:
 * half day · leave · quiet: a working day with no sign of work · weekend:
 * nothing on a weekend · today: nothing yet today · before: before the
 * review started or they joined · ahead: still to come.
 */
export type DayState = "worked" | "active" | "half" | "leave" | "quiet" | "weekend" | "today" | "before" | "ahead";

export type ReviewDay = { date: string; state: DayState; minutes: number | null };

export type DoneItem = {
  kind: "task" | "piece";
  title: string;
  /** What it was for: a client engagement or a Studio1 area. */
  label: string;
  on: string;
  /** Days after its day it was finished; 0 on time. */
  late: number;
};

export type SlipItem = {
  kind: "task" | "piece";
  title: string;
  label: string;
  /** The first day it was due. */
  due: string;
  /** When it was finished; null while still open. */
  done: string | null;
  /** Days it ran past its day (to when it was done, or to today). */
  days: number;
  /** Times its day was pushed later after it came. */
  moves: number;
};

export type Timing = {
  /** Days with at least 15 minutes logged in each hour of the day (IST). */
  worked: number[];
  /** Days with something done on the dashboard in each hour (IST). */
  actions: number[];
  /** Usual start and end ("10:05", "01:30"), the middle of the days logged. */
  start: string | null;
  end: string | null;
  /** The usual end is past midnight. */
  endsNextDay: boolean;
  /** Average minutes logged on a day with hours. */
  perDay: number | null;
  loggedDays: number;
  /** The three hours with the most dashboard activity, e.g. { from: 18, to: 21 }. */
  busiest: { from: number; to: number } | null;
};

export type PersonReview = {
  email: string;
  name: string;
  status: ReviewStatus;
  flags: Flag[];
  highlights: string[];
  /** Weekdays from the start to yesterday (or the month's end), less leave. */
  workingDays: number;
  /** Working days with hours or any sign of work. */
  activeDays: number;
  weekendDays: number;
  leaveDays: number;
  quietDays: string[];
  /** Days with work done but no hours logged. */
  unloggedDays: number;
  days: ReviewDay[];
  done: DoneItem[];
  slipped: SlipItem[];
  timing: Timing;
};

export type ReviewPiece = {
  owner: string | null;
  title: string;
  engagement_id: string | null;
  due_on: string | null;
  /** The IST day it was approved or went live; null while open. */
  done_on: string | null;
  /** Waiting on the client (Client review): never late on Studio1's side. */
  waiting: boolean;
};

export type ReviewInput = {
  month: string;
  /** Today in IST. */
  today: string;
  people: readonly { email: string; name: string; kind: "employee" | "intern"; joined_on: string | null }[];
  /** Null when attendance couldn't be read. */
  attendance: readonly Pick<AttendanceDay, "email" | "day" | "kind" | "slots" | "active_minutes">[] | null;
  tasks: readonly Pick<
    Task,
    "email" | "with_emails" | "title" | "status" | "due_on" | "done_on" | "area" | "engagement_id" | "slips" | "missed_on"
  >[];
  pieces: readonly ReviewPiece[];
  /** Things people did on the dashboard: who and when (an ISO time). */
  actions: readonly { email: string; at: string }[];
  engagements: ReadonlyMap<string, EngagementLabel>;
  /** People whose monthly report is past due and not in. */
  reportsMissing?: ReadonlySet<string>;
  /** Where the review starts (REVIEW_START unless a test says otherwise). */
  start?: string;
};

/* ----------------------------------------------------------------- helpers */

const pad = (value: number) => String(value).padStart(2, "0");
const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** Whole days from one date to a later one. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "HH:MM" from minutes after midnight, wrapping past 24h. */
export function clock(minutes: number) {
  const value = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}

/** The IST date and hour of an ISO time. */
export function istHour(iso: string): { date: string; hour: number } | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const shifted = new Date(time + 330 * 60_000).toISOString();
  return { date: shifted.slice(0, 10), hour: Number(shifted.slice(11, 13)) };
}

/** Minutes worked in each hour of the day across a day's finished slots (past midnight wraps round). */
export function hourMinutes(slots: readonly WorkSlot[]) {
  const hours = Array<number>(24).fill(0);
  for (const slot of slots) {
    if (!slot.end) continue;
    const start = toMinutes(slot.start);
    let length = toMinutes(slot.end) - start;
    if (length < 0) length += 1440;
    let at = start;
    while (at < start + length) {
      const step = Math.min((Math.floor(at / 60) + 1) * 60, start + length) - at;
      hours[Math.floor((at % 1440) / 60)] += step;
      at += step;
    }
  }
  return hours;
}

/**
 * When a day's work began and ended, in minutes from its midnight. Slots
 * starting before 05:00 belong to the night before when the day has later
 * ones; an end past midnight runs on (26:30).
 */
export function dayBounds(slots: readonly WorkSlot[]): { start: number; end: number } | null {
  if (!slots.length) return null;
  const daytime = slots.filter((slot) => toMinutes(slot.start) >= REVIEW_RULES.dayStartsAt);
  const counted = daytime.length ? daytime : slots;
  const start = Math.min(...counted.map((slot) => toMinutes(slot.start)));
  const ends = counted
    .filter((slot) => slot.end)
    .map((slot) => {
      const from = toMinutes(slot.start);
      const length = toMinutes(slot.end as string) - from;
      return from + (length < 0 ? length + 1440 : length);
    });
  return ends.length ? { start, end: Math.max(...ends) } : null;
}

function median(values: readonly number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** "12, 18 and 19 Nov": days of one month, at most five named. */
export function datesLabel(dates: readonly string[]) {
  if (!dates.length) return "";
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(
    new Date(`${dates[0]}T00:00:00Z`),
  );
  const days = dates.map((date) => String(Number(date.slice(8, 10))));
  const shown = days.length > 5 ? [...days.slice(0, 5), `${days.length - 5} more`] : days;
  const list = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
  return `${list} ${month}`;
}

/** "6h 10m" / "45m". */
export function hoursText(minutes: number) {
  const whole = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return whole ? (rest ? `${whole}h ${rest}m` : `${whole}h`) : `${rest}m`;
}

/* ----------------------------------------------------------------- timing */

export function timingOf(
  days: readonly Pick<AttendanceDay, "kind" | "slots" | "active_minutes">[],
  actions: readonly { date: string; hour: number }[],
): Timing {
  const worked = Array<number>(24).fill(0);
  const starts: number[] = [];
  const ends: number[] = [];
  const lengths: number[] = [];
  for (const day of days) {
    if (day.kind === "leave") continue;
    const hours = hourMinutes(day.slots);
    hours.forEach((minutes, hour) => {
      if (minutes >= REVIEW_RULES.hourMinutes) worked[hour] += 1;
    });
    const bounds = dayBounds(day.slots);
    if (bounds) {
      starts.push(bounds.start);
      ends.push(bounds.end);
    }
    const minutes = day.active_minutes ?? hours.reduce((sum, value) => sum + value, 0);
    if (minutes > 0) lengths.push(minutes);
  }

  const seen = new Set<string>();
  const acted = Array<number>(24).fill(0);
  for (const action of actions) {
    const key = `${action.date}|${action.hour}`;
    if (seen.has(key)) continue;
    seen.add(key);
    acted[action.hour] += 1;
  }

  let busiest: Timing["busiest"] = null;
  if (seen.size >= 5) {
    let best = -1;
    for (let hour = 0; hour < 24; hour += 1) {
      const sum = acted[hour] + acted[(hour + 1) % 24] + acted[(hour + 2) % 24];
      if (sum > best) {
        best = sum;
        busiest = { from: hour, to: (hour + 3) % 24 };
      }
    }
  }

  const start = median(starts);
  const end = median(ends);
  return {
    worked,
    actions: acted,
    start: start === null ? null : clock(start),
    end: end === null ? null : clock(end),
    endsNextDay: end !== null && end > 1440,
    perDay: lengths.length ? Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length) : null,
    loggedDays: lengths.length,
    busiest,
  };
}

/* ----------------------------------------------------------------- review */

const STATUS_RANK: Record<ReviewStatus, number> = { follow_up: 0, watch: 1, on_track: 2 };

/** One review per person, the ones to follow up first. */
export function reviewTeam(input: ReviewInput): PersonReview[] {
  return input.people
    .map((person) => reviewPerson(input, person))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        b.slipped.length + b.quietDays.length - (a.slipped.length + a.quietDays.length) ||
        a.name.localeCompare(b.name),
    );
}

export function reviewPerson(input: ReviewInput, person: ReviewInput["people"][number]): PersonReview {
  const { month, today, engagements } = input;
  const email = person.email.toLowerCase();
  const dates = datesOfMonth(month);
  const from = dates[0];
  const to = dates[dates.length - 1];
  const start = [input.start ?? REVIEW_START, from, person.joined_on ?? ""].sort().at(-1) as string;
  const inMonth = (date: string | null | undefined): date is string => Boolean(date && date >= from && date <= to);
  const counted = (date: string | null | undefined): date is string => inMonth(date) && (date as string) >= start;

  // Attendance, actions and finished work by day.
  const attendance = new Map(
    (input.attendance ?? [])
      .filter((day) => day.email.toLowerCase() === email && inMonth(day.day))
      .map((day) => [day.day, day]),
  );
  const acted: { date: string; hour: number }[] = [];
  for (const action of input.actions) {
    if (action.email.toLowerCase() !== email) continue;
    const when = istHour(action.at);
    if (when && inMonth(when.date)) acted.push(when);
  }
  const actedDays = new Set(acted.map((action) => action.date));

  const tasks = input.tasks.filter((task) => isOnTask(task, email));
  const pieces = input.pieces.filter((piece) => piece.owner?.toLowerCase() === email);

  const done: DoneItem[] = [];
  const slipped: SlipItem[] = [];
  for (const task of tasks) {
    const label = forLabel(forKey(task), engagements);
    const first = task.missed_on ?? task.due_on;
    const moves = task.slips ?? 0;
    if (task.status === "done" && counted(task.done_on)) {
      done.push({
        kind: "task",
        title: task.title,
        label,
        on: task.done_on,
        late: first ? Math.max(0, daysBetween(first, task.done_on)) : 0,
      });
    }
    if (!counted(first) || first > today) continue;
    if (task.status === "done" && task.done_on && task.done_on > first)
      slipped.push({ kind: "task", title: task.title, label, due: first, done: task.done_on, days: daysBetween(first, task.done_on), moves });
    else if ((task.status === "todo" || task.status === "doing") && (first < today || moves > 0))
      slipped.push({ kind: "task", title: task.title, label, due: first, done: null, days: Math.max(0, daysBetween(first, today)), moves });
    else if (task.status === "review" && moves > 0 && task.due_on)
      slipped.push({ kind: "task", title: task.title, label, due: first, done: null, days: daysBetween(first, task.due_on), moves });
  }
  for (const piece of pieces) {
    const label = piece.engagement_id ? forLabel(`e:${piece.engagement_id}`, engagements) : "Client work";
    if (counted(piece.done_on))
      done.push({
        kind: "piece",
        title: piece.title,
        label,
        on: piece.done_on,
        late: piece.due_on ? Math.max(0, daysBetween(piece.due_on, piece.done_on)) : 0,
      });
    if (!counted(piece.due_on) || piece.due_on > today) continue;
    if (piece.done_on && piece.done_on > piece.due_on)
      slipped.push({ kind: "piece", title: piece.title, label, due: piece.due_on, done: piece.done_on, days: daysBetween(piece.due_on, piece.done_on), moves: 0 });
    else if (!piece.done_on && !piece.waiting && piece.due_on < today)
      slipped.push({ kind: "piece", title: piece.title, label, due: piece.due_on, done: null, days: daysBetween(piece.due_on, today), moves: 0 });
  }
  done.sort((a, b) => b.on.localeCompare(a.on) || a.title.localeCompare(b.title));
  slipped.sort((a, b) => Number(a.done !== null) - Number(b.done !== null) || b.days - a.days || a.due.localeCompare(b.due));
  const doneDays = new Set(done.map((item) => item.on));

  // Each day of the month.
  const days: ReviewDay[] = dates.map((date) => {
    const logged = attendance.get(date);
    const minutes = logged && logged.kind !== "leave" ? (logged.active_minutes ?? null) : null;
    if (date < start) return { date, state: "before", minutes: null };
    if (date > today) return { date, state: "ahead", minutes: null };
    if (logged?.kind === "leave") return { date, state: "leave", minutes: null };
    if (logged?.kind === "half_day") return { date, state: "half", minutes };
    if (logged && (logged.slots.length || (logged.active_minutes ?? 0) > 0)) return { date, state: "worked", minutes };
    if (logged || actedDays.has(date) || doneDays.has(date)) return { date, state: "active", minutes: null };
    if (isWeekend(date)) return { date, state: "weekend", minutes: null };
    return { date, state: date === today ? "today" : "quiet", minutes: null };
  });
  const lastCounted = today > to ? to : shiftDay(today, -1);
  const weekdays = days.filter((day) => !isWeekend(day.date) && day.date >= start && day.date <= lastCounted);
  const leaveDays = days.filter((day) => day.state === "leave").length;
  const working = weekdays.filter((day) => day.state !== "leave");
  const isActive = (day: ReviewDay) => day.state === "worked" || day.state === "active" || day.state === "half";
  const activeDays = working.filter(isActive).length;
  const quietDays = working.filter((day) => day.state === "quiet").map((day) => day.date);
  const weekendDays = days.filter((day) => isWeekend(day.date) && isActive(day)).length;
  const unloggedDays = days.filter((day) => day.state === "active").length;

  const timing = timingOf(
    [...attendance.values()].filter((day) => day.day >= start),
    acted.filter((action) => action.date >= start),
  );

  // Flags.
  const flags: Flag[] = [];
  const enoughDays = working.length >= REVIEW_RULES.minDays;
  const rules = REVIEW_RULES;
  if (enoughDays && quietDays.length >= rules.quietWatch) {
    const many = quietDays.length >= rules.quietFollowUp || quietDays.length / working.length >= rules.quietShare;
    flags.push({
      level: many ? "follow_up" : "watch",
      text: `No sign of work on ${plural(quietDays.length, "working day")} (${datesLabel(quietDays)})`,
    });
  }
  if (slipped.length >= rules.slipWatch) {
    const taskCount = slipped.filter((item) => item.kind === "task").length;
    const pieceCount = slipped.length - taskCount;
    const open = slipped.filter((item) => item.done === null).length;
    const parts = [taskCount ? plural(taskCount, "task") : "", pieceCount ? plural(pieceCount, "client piece") : ""]
      .filter(Boolean)
      .join(", ");
    flags.push({
      level: slipped.length >= rules.slipFollowUp ? "follow_up" : "watch",
      text: `${parts} slipped past their day${open ? `, ${open} still open` : ""}`,
    });
  }
  if (enoughDays && done.length === 0)
    flags.push({ level: "follow_up", text: `Nothing marked done${today <= to ? " so far" : ""}` });
  if (
    person.kind === "employee" &&
    timing.perDay !== null &&
    timing.loggedDays >= rules.minDays &&
    timing.perDay < rules.shortDay
  )
    flags.push({ level: "watch", text: `Averaging ${hoursText(timing.perDay)} a day over ${plural(timing.loggedDays, "logged day")}` });
  if (input.reportsMissing?.has(email)) flags.push({ level: "watch", text: "Monthly report not sent" });
  if (unloggedDays >= rules.unlogged) flags.push({ level: "note", text: `Worked ${plural(unloggedDays, "day")} without logging hours` });
  if (input.attendance === null) flags.push({ level: "note", text: "Attendance couldn't be read, so days are from tasks only" });

  const status: ReviewStatus = flags.some((flag) => flag.level === "follow_up")
    ? "follow_up"
    : flags.some((flag) => flag.level === "watch")
      ? "watch"
      : "on_track";

  // What went well.
  const highlights: string[] = [];
  const tasksDone = done.filter((item) => item.kind === "task").length;
  const piecesDone = done.length - tasksDone;
  if (done.length)
    highlights.push(
      [tasksDone ? `${plural(tasksDone, "task")} done` : "", piecesDone ? `${plural(piecesDone, "client piece")} delivered` : ""]
        .filter(Boolean)
        .join(", "),
    );
  if (working.length)
    highlights.push(
      activeDays === working.length
        ? `Active every working day${working.length > 1 ? ` (${working.length})` : ""}`
        : `Active ${activeDays} of ${plural(working.length, "working day")}`,
    );
  if (weekendDays) highlights.push(`${plural(weekendDays, "weekend day")} too`);
  if (done.length && !slipped.length) highlights.push("Nothing slipped");

  return {
    email,
    name: person.name,
    status,
    flags,
    highlights,
    workingDays: working.length,
    activeDays,
    weekendDays,
    leaveDays,
    quietDays,
    unloggedDays,
    days,
    done,
    slipped,
    timing,
  };
}

/** One line on a person: what to look at, or how it went. */
export function reviewLine(review: Pick<PersonReview, "flags" | "highlights" | "workingDays">) {
  const serious = review.flags.filter((flag) => flag.level === "follow_up" || flag.level === "watch");
  if (serious.length) return serious.map((flag) => flag.text).join(" · ");
  if (!review.workingDays && !review.highlights.length) return "No working days yet";
  return review.highlights.join(" · ");
}

/* ----------------------------------------------------------------- follow-up email */

export const MAX_FOLLOW_UP = 4000;

/**
 * A first draft of the email a founder sends someone about their month:
 * what stood out, and a straight question about what's in the way. The
 * founder edits it before it goes.
 */
export function followUpDraft(
  review: Pick<PersonReview, "name" | "flags" | "highlights" | "status">,
  month: string,
  today: string,
  sender: string,
) {
  const label = monthLabel(month).split(" ")[0];
  const first = review.name.split(" ")[0] || "there";
  const over = today.slice(0, 7) > month;
  const points = review.flags.filter((flag) => flag.level !== "note").map((flag) => `- ${flag.text}`);
  const subject = `Checking in on your ${label}`;
  const lines = [`Hi ${first},`];
  if (points.length) {
    lines.push(
      `I went through ${over ? label : `${label} so far`} on the dashboard and a few things stood out:`,
      points.join("\n"),
      "Is something getting in the way? Tell me honestly what's blocking you and what would help, whether that's clearer priorities, fewer things at once, or something outside work.",
      `Let's agree on what changes ${over ? "this month" : "for the rest of the month"}. Reply here or grab 15 minutes with me.`,
    );
  } else {
    lines.push(
      `I went through ${over ? label : `${label} so far`} on the dashboard${review.highlights.length ? `: ${review.highlights.join(", ").toLowerCase()}` : ""}.`,
      "Anything getting in your way, or anything you need from me? Reply here and let me know.",
    );
  }
  lines.push(sender.split(" ")[0] || sender);
  return { subject, body: lines.join("\n\n") };
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The follow-up as a plain, personal email: paragraphs split on blank
 * lines, "- " lines as a list. No banner or buttons: it's a note from a
 * founder, not a newsletter.
 */
export function followUpHtml(body: string) {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => /^\s*[-•]\s+/.test(line)))
        return `<ul style="margin:0 0 16px;padding-left:20px">${lines
          .map((line) => `<li style="margin:0 0 6px">${escape(line.replace(/^\s*[-•]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      return `<p style="margin:0 0 16px">${lines.map(escape).join("<br>")}</p>`;
    });
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c1917;max-width:560px">${blocks.join("")}</div>`;
}
