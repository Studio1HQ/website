/**
 * Calls: types and small pure helpers the server and client components
 * share. No server imports here.
 *
 * Tables: supabase/migrations/20261116140000_team_calls.sql.
 *
 * Only Studio1's internal calls live here (syncs, stand-ups, 1:1s);
 * prospect, hiring and client calls stay in Google Calendar. Times are
 * "HH:MM" in IST, days "YYYY-MM-DD" in IST, weekdays ISO (1 = Monday).
 */

import { addDays, isoWeekday, weekStart } from "@/lib/internal/clients/schema";

export type CallRepeat = "once" | "weekly";

export type Call = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  title: string;
  about: string;
  link: string;
  host: string | null;
  people: string[];
  whole_team: boolean;
  repeat: CallRepeat;
  /** ISO weekdays, 1 = Monday; weekly calls only. */
  days: number[];
  every_weeks: number;
  starts_on: string;
  ends_on: string | null;
  start_time: string;
  minutes: number;
};

/** One day of a call cancelled or moved. */
export type CallChange = {
  id: string;
  call_id: string;
  on_day: string;
  cancelled: boolean;
  moved_day: string | null;
  moved_time: string | null;
  note: string;
  created_by: string;
};

/** A call on one day, as the week shows it. */
export type Occurrence = {
  /** `${call_id}:${on_day}`: the same however it's moved. */
  key: string;
  call_id: string;
  /** The day the series has it on. */
  on_day: string;
  /** Where it is now (moved or not). */
  day: string;
  start: string;
  minutes: number;
  cancelled: boolean;
  /** Moved off its usual day or time: where it was. */
  moved_from: { day: string; start: string } | null;
  note: string;
};

export type CallResult = { ok: true; message?: string } | { ok: false; message: string };

export const CALLS_MIGRATION_HINT =
  "Calls needs its database tables. Run supabase/migrations/20261116140000_team_calls.sql in the Supabase SQL editor.";

/* ------------------------------------------------------------- weekdays */

export const WEEKDAYS = [
  { value: 1, short: "Mon", letter: "M" },
  { value: 2, short: "Tue", letter: "T" },
  { value: 3, short: "Wed", letter: "W" },
  { value: 4, short: "Thu", letter: "T" },
  { value: 5, short: "Fri", letter: "F" },
  { value: 6, short: "Sat", letter: "S" },
  { value: 7, short: "Sun", letter: "S" },
] as const;

/** Quick picks for the day toggles. */
export const DAY_PRESETS = [
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Mon–Sat", days: [1, 2, 3, 4, 5, 6] },
  { label: "Every day", days: [1, 2, 3, 4, 5, 6, 7] },
] as const;

/** How long a call runs: the picks in the form. */
export const LENGTHS = [15, 20, 30, 45, 60, 90, 120] as const;

function sameDays(a: readonly number[], b: readonly number[]) {
  return a.length === b.length && a.every((day, index) => day === b[index]);
}

/** "Mon, Wed, Fri", "Mon–Sat", "Weekdays", "Every day". */
export function daysLabel(days: readonly number[]) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sameDays(sorted, [1, 2, 3, 4, 5, 6, 7])) return "Every day";
  if (sameDays(sorted, [1, 2, 3, 4, 5])) return "Weekdays";
  // A run of three or more days in a row reads as a range.
  const runs: number[][] = [];
  for (const day of sorted) {
    const last = runs.at(-1);
    if (last && last.at(-1) === day - 1) last.push(day);
    else runs.push([day]);
  }
  const short = (day: number) => WEEKDAYS[day - 1]?.short ?? "";
  return runs
    .map((run) => (run.length >= 3 ? `${short(run[0])}–${short(run.at(-1) as number)}` : run.map(short).join(", ")))
    .join(", ");
}

/* ---------------------------------------------------------------- times */

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME.test(value);
}

export function toMinutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** "HH:MM" plus some minutes; may pass midnight ("24:30" is 00:30 the next day). */
export function endOf(start: string, minutes: number) {
  const total = toMinutes(start) + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "15:00" → "3 PM", "15:30" → "3:30 PM", "24:00" → "12 AM". */
export function clock(time: string, withPeriod = true) {
  const total = toMinutes(time) % (24 * 60);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? "AM" : "PM";
  return `${twelve}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${withPeriod ? ` ${period}` : ""}`;
}

/** "3–3:30 PM", "11 PM–12 AM": the period once when both ends share it. */
export function timeRange(start: string, minutes: number) {
  const end = endOf(start, minutes);
  const half = (time: string) => (toMinutes(time) % (24 * 60) < 12 * 60 ? "AM" : "PM");
  return half(start) === half(end) ? `${clock(start, false)}–${clock(end)}` : `${clock(start)}–${clock(end)}`;
}

/** "30 min", "1 hr", "1 hr 30 min". */
export function lengthLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/* ------------------------------------------------------------ repeating */

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "Mon 16 Nov". */
export function shortDay(day: string) {
  return dayFormat.format(new Date(`${day}T00:00:00Z`)).replace(",", "");
}

/** "Every Mon–Sat · 3–3:30 PM", "Every other Tue", "Once, Mon 16 Nov". */
export function repeatLabel(call: Pick<Call, "repeat" | "days" | "every_weeks" | "starts_on" | "start_time" | "minutes">, withTime = true) {
  const time = withTime ? ` · ${timeRange(call.start_time, call.minutes)}` : "";
  if (call.repeat === "once") return `Once, ${shortDay(call.starts_on)}${time}`;
  const days = daysLabel(call.days);
  const every = call.every_weeks === 2 ? "Every other week, " : call.every_weeks > 2 ? `Every ${call.every_weeks} weeks, ` : "";
  const lead = every ? `${every}${days}` : days === "Every day" || days === "Weekdays" ? days : `Every ${days}`;
  return `${lead}${time}`;
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Does the series have this call on this day (before any one-off change)? */
export function occursOn(call: Pick<Call, "repeat" | "days" | "every_weeks" | "starts_on" | "ends_on">, day: string) {
  if (call.repeat === "once") return day === call.starts_on;
  if (day < call.starts_on || (call.ends_on && day > call.ends_on)) return false;
  if (!call.days.includes(isoWeekday(day))) return false;
  const weeks = daysBetween(weekStart(call.starts_on), weekStart(day)) / 7;
  return weeks % Math.max(1, call.every_weeks) === 0;
}

function dates(from: string, to: string) {
  const out: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) out.push(day);
  return out;
}

/**
 * Every call between two days (inclusive), with one-off changes applied:
 * cancelled days stay (marked) so people see the call is off, moved days
 * show where they went, including ones moved in from outside the range.
 * Sorted by day, then time.
 */
export function occurrences(calls: readonly Call[], changes: readonly CallChange[], from: string, to: string): Occurrence[] {
  const changeOf = new Map(changes.map((change) => [`${change.call_id}:${change.on_day}`, change]));
  const out: Occurrence[] = [];
  const inRange = (day: string) => day >= from && day <= to;

  const place = (call: Call, onDay: string) => {
    const change = changeOf.get(`${call.id}:${onDay}`);
    const day = change?.moved_day ?? onDay;
    const start = change?.moved_time ?? call.start_time;
    if (!inRange(day)) return;
    const moved = Boolean(change && !change.cancelled && (day !== onDay || start !== call.start_time));
    out.push({
      key: `${call.id}:${onDay}`,
      call_id: call.id,
      on_day: onDay,
      day,
      start,
      minutes: call.minutes,
      cancelled: Boolean(change?.cancelled),
      moved_from: moved ? { day: onDay, start: call.start_time } : null,
      note: change?.note ?? "",
    });
  };

  const byId = new Map(calls.map((call) => [call.id, call]));
  for (const call of calls) {
    for (const day of dates(from, to)) if (occursOn(call, day)) place(call, day);
  }
  // Moved in from a day outside the range.
  for (const change of changes) {
    const call = byId.get(change.call_id);
    if (!call || inRange(change.on_day) || !change.moved_day || !inRange(change.moved_day)) continue;
    if (occursOn(call, change.on_day)) place(call, change.on_day);
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
}

/* ------------------------------------------------------------- calendar */

/**
 * The days a month calendar shows: whole weeks, Monday first, from the
 * week of the 1st to the week of the last day ("2026-11" → 30 Oct–6 Dec).
 */
export function monthGridDays(month: string) {
  const [year, index] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, index, 0)).toISOString().slice(0, 10);
  return dates(weekStart(`${month}-01`), addDays(weekStart(last), 6));
}

/**
 * Where a call sits among the ones it overlaps on its day: column `col` of
 * `cols`, and how wide it runs.
 *
 *   full     nothing overlaps it from a later column: it runs to the
 *            column's right edge
 *   under    every call over it starts 15+ minutes later: it runs most of
 *            the width underneath, and theirs sit on top (so its name,
 *            at the top, has the room)
 *   split    a call over it starts within 15 minutes: they share the width
 */
export type Placed = { col: number; cols: number; width: "full" | "under" | "split" };

/** How much later a call has to start for the earlier one to run under it. */
const CASCADE_MINUTES = 15;

/**
 * Columns for calls that overlap on one day, the way calendar apps lay them
 * out: each run of overlapping calls gets columns, a call takes the first
 * one free at its start, and a later call over an earlier one cascades on
 * top of it (see Placed).
 */
export function layoutDay(items: readonly Pick<Occurrence, "key" | "start" | "minutes">[]): Record<string, Placed> {
  const sorted = [...items]
    .map((item) => ({ key: item.key, start: toMinutes(item.start), end: toMinutes(item.start) + Math.max(item.minutes, 1) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const col: Record<string, number> = {};
  const cols: Record<string, number> = {};
  let run: string[] = [];
  let columns: number[] = []; // the minute each column is free again
  let runEnd = -1;
  const close = () => {
    for (const key of run) cols[key] = columns.length;
    run = [];
    columns = [];
  };
  for (const item of sorted) {
    if (item.start >= runEnd) {
      close();
      runEnd = -1;
    }
    let at = columns.findIndex((free) => free <= item.start);
    if (at === -1) {
      at = columns.length;
      columns.push(item.end);
    } else {
      columns[at] = item.end;
    }
    col[item.key] = at;
    run.push(item.key);
    runEnd = Math.max(runEnd, item.end);
  }
  close();

  const out: Record<string, Placed> = {};
  for (const item of sorted) {
    const over = sorted.filter((other) => col[other.key] > col[item.key] && other.start < item.end && other.end > item.start);
    const width: Placed["width"] = !over.length
      ? "full"
      : over.every((other) => other.start - item.start >= CASCADE_MINUTES)
        ? "under"
        : "split";
    out[item.key] = { col: col[item.key], cols: cols[item.key], width };
  }
  return out;
}

/** The hours a day grid shows: at least 9 AM to 7 PM, stretched to fit every call. */
export function hourRange(items: readonly Pick<Occurrence, "start" | "minutes">[]) {
  let from = 9;
  let to = 19;
  for (const item of items) {
    const start = toMinutes(item.start);
    from = Math.min(from, Math.floor(start / 60));
    to = Math.max(to, Math.ceil((start + item.minutes) / 60));
  }
  return { from: Math.max(0, from), to: Math.min(24, to) };
}

/** The next time this call happens from a day on (changes applied), within a year. */
export function nextOccurrence(call: Call, changes: readonly CallChange[], from: string): Occurrence | null {
  // Look a few weeks at a time, so a weekly call costs one short pass.
  for (let start = from, n = 0; n < 13; n++, start = addDays(start, 28)) {
    const found = occurrences([call], changes, start, addDays(start, 27)).find((item) => !item.cancelled);
    if (found) return found;
    if (call.repeat === "once" || (call.ends_on && call.ends_on < start)) break;
  }
  return null;
}

/** Over: a one-off call that's been, or a series that's ended. */
export function hasEnded(call: Pick<Call, "repeat" | "starts_on" | "ends_on">, today: string) {
  return call.repeat === "once" ? call.starts_on < today : Boolean(call.ends_on && call.ends_on < today);
}

/* ------------------------------------------------------------------ who */

/** Is this person in the call (whole team, invited, or hosting)? */
export function isIn(call: Pick<Call, "whole_team" | "people" | "host">, email: string) {
  const me = email.toLowerCase();
  return call.whole_team || call.host === me || call.people.includes(me);
}

/** Everyone in a call, host first (the whole team when it's for everyone). */
export function attendees(call: Pick<Call, "whole_team" | "people" | "host">, team: readonly string[]) {
  const list = call.whole_team ? [...team, ...call.people] : [...call.people];
  if (call.host) list.unshift(call.host);
  return [...new Set(list.map((email) => email.toLowerCase()))];
}

/** Live now, or starting within this many minutes ("soon"), for today's calls. */
export function callState(item: Pick<Occurrence, "day" | "start" | "minutes" | "cancelled">, now: { date: string; time: string }, soon = 15) {
  if (item.cancelled || item.day !== now.date) return item.day < now.date ? "past" : "later";
  const at = toMinutes(now.time);
  const start = toMinutes(item.start);
  if (at >= start + item.minutes) return "past";
  if (at >= start) return "live";
  if (start - at <= soon) return "soon";
  return "later";
}

/* --------------------------------------------------------------- checks */

const EMAIL = /^[^\s@(),"<>]+@[^\s@(),"<>]+\.[^\s@(),"<>]+$/;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && EMAIL.test(value.trim());
}

/** Same check as Tasks and client work: no passwords or keys in notes. */
function looksLikeSecret(value: string) {
  return (
    /\b(password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*\S{6,}/i.test(value) ||
    /\b(sk|pk|rk)[-_](live|test)?[-_]?[A-Za-z0-9]{16,}\b/.test(value) ||
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** A call's link: http(s) only, no user:password in it. "" for none. */
export function cleanLink(value: unknown): { ok: true; link: string } | { ok: false; message: string } {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { ok: true, link: "" };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, message: "That link doesn't look right. Paste the Meet or Zoom link." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, message: "Use an https:// link." };
  if (url.username || url.password) return { ok: false, message: "Leave logins out of the link." };
  const link = url.toString();
  if (link.length > 500) return { ok: false, message: "That link is too long." };
  return { ok: true, link };
}

export type CallInput = Omit<Call, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">;

/**
 * Checks a call as typed in the form; returns the clean row or why not.
 * Times and days are IST.
 */
export function cleanCall(raw: unknown): { ok: true; call: CallInput } | { ok: false; message: string } {
  const values = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const title = typeof values.title === "string" ? values.title.replace(/\s+/g, " ").trim() : "";
  if (!title) return { ok: false, message: "Give the call a name." };
  if (title.length > 120) return { ok: false, message: "Keep the name under 120 characters." };

  const about = typeof values.about === "string" ? values.about.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
  if (about.length > 2000) return { ok: false, message: "Keep what it's for under 2,000 characters." };
  if (looksLikeSecret(about)) return { ok: false, message: "That looks like a password or a key. Leave it out." };

  const link = cleanLink(values.link);
  if (!link.ok) return link;

  const repeat: CallRepeat = values.repeat === "once" ? "once" : "weekly";
  if (!isDay(values.starts_on)) return { ok: false, message: repeat === "once" ? "Pick the day." : "Pick the day it starts." };
  const startsOn = values.starts_on;
  let endsOn: string | null = null;
  if (repeat === "weekly" && values.ends_on) {
    if (!isDay(values.ends_on)) return { ok: false, message: "The end date isn't a valid date." };
    if (values.ends_on < startsOn) return { ok: false, message: "It can't end before it starts." };
    endsOn = values.ends_on;
  }
  const days =
    repeat === "weekly"
      ? [...new Set((Array.isArray(values.days) ? values.days : []).map(Number))]
          .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
          .sort((a, b) => a - b)
      : [];
  if (repeat === "weekly" && !days.length) return { ok: false, message: "Pick at least one day of the week." };
  const every = repeat === "weekly" ? Number(values.every_weeks ?? 1) : 1;
  if (!Number.isInteger(every) || every < 1 || every > 4) return { ok: false, message: "Pick how often it repeats." };

  if (!isTime(values.start_time)) return { ok: false, message: "Pick a start time." };
  const minutes = Number(values.minutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) return { ok: false, message: "Pick how long it runs (5 minutes to 8 hours)." };

  const people = [
    ...new Set(
      (Array.isArray(values.people) ? values.people : [])
        .filter((email): email is string => typeof email === "string")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const bad = people.find((email) => !isEmail(email));
  if (bad) return { ok: false, message: `"${bad}" isn't an email address.` };
  if (people.length > 60) return { ok: false, message: "That's more than 60 people. Use the whole team instead." };
  const host = typeof values.host === "string" && values.host.trim() ? values.host.trim().toLowerCase() : null;
  if (host && !isEmail(host)) return { ok: false, message: "The host isn't an email address." };
  const wholeTeam = values.whole_team === true;
  if (!wholeTeam && !people.length && !host) return { ok: false, message: "Add who's in the call." };

  return {
    ok: true,
    call: {
      title,
      about,
      link: link.link,
      host,
      // The host is kept apart from the rest, unless they're the only one
      // in it: the table needs someone on the list for a call that isn't
      // the whole team's.
      people: host && (wholeTeam || people.some((email) => email !== host)) ? people.filter((email) => email !== host) : host ? [host] : people,
      whole_team: wholeTeam,
      repeat,
      days,
      every_weeks: every,
      starts_on: startsOn,
      ends_on: endsOn,
      start_time: values.start_time,
      minutes,
    },
  };
}

/* ------------------------------------------------------ Google Calendar */

const BYDAY = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function stamp(day: string, time: string) {
  return `${day.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

/**
 * A link that opens Google Calendar with this call filled in (name, time
 * in IST, repeat, link, what it's for, and the guests), so the planner can
 * send the invites from there. Nothing is created until they save it.
 */
export function googleCalendarLink(call: CallInput, guests: readonly string[]) {
  const end = endOf(call.start_time, call.minutes);
  const endDay = toMinutes(end) >= 24 * 60 ? addDays(call.starts_on, 1) : call.starts_on;
  const endTime = toMinutes(end) >= 24 * 60 ? `${String(Math.floor((toMinutes(end) - 1440) / 60)).padStart(2, "0")}:${end.slice(3)}` : end;
  // Google starts a weekly series on its first day: start on the first day it really happens.
  let first = call.starts_on;
  if (call.repeat === "weekly") {
    for (let n = 0; n < 7 && !call.days.includes(isoWeekday(first)); n++) first = addDays(first, 1);
  }
  const shift = daysBetween(call.starts_on, first);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: call.title,
    dates: `${stamp(first, call.start_time)}/${stamp(addDays(endDay, shift), endTime)}`,
    ctz: "Asia/Kolkata",
  });
  const details = [call.about, call.link ? `Join: ${call.link}` : ""].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  if (call.link) params.set("location", call.link);
  if (call.repeat === "weekly") {
    const rule = [
      "RRULE:FREQ=WEEKLY",
      call.every_weeks > 1 ? `INTERVAL=${call.every_weeks}` : "",
      `BYDAY=${call.days.map((day) => BYDAY[day]).join(",")}`,
      call.ends_on ? `UNTIL=${call.ends_on.replaceAll("-", "")}T235959Z` : "",
    ]
      .filter(Boolean)
      .join(";");
    params.set("recur", rule);
  }
  if (guests.length) params.set("add", guests.join(","));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
