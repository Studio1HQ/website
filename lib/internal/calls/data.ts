import "server-only";
import { deleteRows, insertRow, selectRows, updateRows, upsertRows } from "@/lib/supabase-server";
import { listMembers } from "@/lib/internal/members";
import { OWNERS } from "@/lib/internal/roles";
import { listActivePeople } from "@/lib/internal/team/people";
import { displayName } from "@/lib/internal/team/shared";
import { CALLS_MIGRATION_HINT, type Call, type CallChange, type CallInput } from "@/lib/internal/calls/shared";

/**
 * Reads and writes for Calls. No session checks here: the page and actions
 * check lib/internal/calls/access.ts first. Server only (service-role key).
 */

const CALLS = "team_calls";
const CHANGES = "team_call_changes";

export type Loaded<T> = { ok: true; rows: T[] } | { ok: false; missing: boolean; message: string };

const MISSING = /PGRST205|PGRST204|42P01|42703|does not exist|Could not find the table/i;

function failed<T>(table: string, message: string): Loaded<T> {
  const missing = MISSING.test(message);
  if (!missing) console.error(`[calls] reading ${table} failed: ${message}`);
  return { ok: false, missing, message: missing ? CALLS_MIGRATION_HINT : "Couldn't load the calls just now. Reload in a minute." };
}

const text = (value: unknown) => (typeof value === "string" ? value : "");
const textOrNull = (value: unknown) => (typeof value === "string" && value ? value : null);
const day = (value: unknown) => (typeof value === "string" && value ? value.slice(0, 10) : null);

function toCall(row: Record<string, unknown>): Call | null {
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  const startsOn = day(row.starts_on);
  if (!startsOn) return null;
  return {
    id: row.id,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    created_by: text(row.created_by),
    updated_by: textOrNull(row.updated_by),
    title: row.title,
    about: text(row.about),
    link: text(row.link),
    host: textOrNull(row.host),
    people: Array.isArray(row.people) ? row.people.filter((email): email is string => typeof email === "string") : [],
    whole_team: row.whole_team === true,
    repeat: row.repeat === "once" ? "once" : "weekly",
    days: Array.isArray(row.days) ? row.days.map(Number).filter((value) => value >= 1 && value <= 7) : [],
    every_weeks: Number(row.every_weeks) || 1,
    starts_on: startsOn,
    ends_on: day(row.ends_on),
    start_time: text(row.start_time).slice(0, 5),
    minutes: Number(row.minutes) || 30,
  };
}

function toChange(row: Record<string, unknown>): CallChange | null {
  if (typeof row.id !== "string" || typeof row.call_id !== "string") return null;
  const onDay = day(row.on_day);
  if (!onDay) return null;
  return {
    id: row.id,
    call_id: row.call_id,
    on_day: onDay,
    cancelled: row.cancelled === true,
    moved_day: day(row.moved_day),
    moved_time: textOrNull(row.moved_time)?.slice(0, 5) ?? null,
    note: text(row.note),
    created_by: text(row.created_by),
  };
}

/** Every call that hasn't ended before `from` (all of them without it). */
export async function listCalls(options: { from?: string } = {}): Promise<Loaded<Call>> {
  const query = new URLSearchParams({ select: "*", order: "start_time.asc,title.asc", limit: "500" });
  // One-off calls before `from` are over; so are series that ended before it.
  if (options.from) query.set("or", `(and(repeat.eq.weekly,or(ends_on.is.null,ends_on.gte.${options.from})),starts_on.gte.${options.from})`);
  const result = await selectRows(CALLS, query);
  if (!result.ok) return failed(CALLS, result.message);
  return { ok: true, rows: result.rows.map(toCall).filter((call): call is Call => call !== null) };
}

export async function getCall(id: string): Promise<Call | null | "error"> {
  const result = await selectRows(CALLS, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!result.ok) return "error";
  return result.rows[0] ? toCall(result.rows[0]) : null;
}

/**
 * One-off changes touching these days: ones due in the range, and ones
 * moved into it from elsewhere.
 */
export async function listChanges(from: string, to: string): Promise<Loaded<CallChange>> {
  const query = new URLSearchParams({
    select: "*",
    or: `(and(on_day.gte.${from},on_day.lte.${to}),and(moved_day.gte.${from},moved_day.lte.${to}))`,
    limit: "1000",
  });
  const result = await selectRows(CHANGES, query);
  if (!result.ok) return failed(CHANGES, result.message);
  return { ok: true, rows: result.rows.map(toChange).filter((change): change is CallChange => change !== null) };
}

/** A call's changes from a day on (for its next time). */
export async function changesOf(callIds: string[], from: string): Promise<Loaded<CallChange>> {
  if (!callIds.length) return { ok: true, rows: [] };
  const query = new URLSearchParams({
    select: "*",
    call_id: `in.(${callIds.join(",")})`,
    or: `(on_day.gte.${from},moved_day.gte.${from})`,
    limit: "2000",
  });
  const result = await selectRows(CHANGES, query);
  if (!result.ok) return failed(CHANGES, result.message);
  return { ok: true, rows: result.rows.map(toChange).filter((change): change is CallChange => change !== null) };
}

type Write = { ok: true } | { ok: false; message: string };

function writeFailed(what: string, message: string): Write {
  console.error(`[calls] ${what} failed: ${message}`);
  return { ok: false, message: MISSING.test(message) ? CALLS_MIGRATION_HINT : "Couldn't save that just now. Try again in a minute." };
}

export async function insertCall(call: CallInput & { id: string }, by: string): Promise<Write> {
  const result = await insertRow(CALLS, { ...call, created_by: by, updated_by: by });
  return result.ok ? result : writeFailed("adding a call", result.message);
}

export async function updateCall(id: string, call: CallInput, by: string): Promise<Write> {
  const result = await updateRows(CALLS, new URLSearchParams({ id: `eq.${id}` }), { ...call, updated_by: by });
  if (!result.ok) return writeFailed("updating a call", result.message);
  return result.count ? { ok: true } : { ok: false, message: "That call isn't there any more. Reload the page." };
}

export async function deleteCall(id: string): Promise<Write> {
  const result = await deleteRows(CALLS, new URLSearchParams({ id: `eq.${id}` }));
  if (!result.ok) return writeFailed("deleting a call", result.message);
  return { ok: true };
}

/** Drops one-off changes the series no longer has a day for (after an edit). */
export async function dropChanges(callId: string, onDays: string[]): Promise<Write> {
  if (!onDays.length) return { ok: true };
  const result = await deleteRows(
    CHANGES,
    new URLSearchParams({ call_id: `eq.${callId}`, on_day: `in.(${onDays.join(",")})` }),
  );
  return result.ok ? { ok: true } : writeFailed("tidying a call's changes", result.message);
}

export async function saveChange(
  change: Pick<CallChange, "call_id" | "on_day" | "cancelled" | "moved_day" | "moved_time" | "note">,
  by: string,
): Promise<Write> {
  const result = await upsertRows(CHANGES, [{ ...change, created_by: by, updated_by: by }], { onConflict: "call_id,on_day" });
  return result.ok ? result : writeFailed("changing a day of a call", result.message);
}

export async function removeChange(callId: string, onDay: string): Promise<Write> {
  const result = await deleteRows(CHANGES, new URLSearchParams({ call_id: `eq.${callId}`, on_day: `eq.${onDay}` }));
  return result.ok ? { ok: true } : writeFailed("restoring a day of a call", result.message);
}

/* ---------------------------------------------------------------- people */

export type CallPerson = { email: string; name: string };

/**
 * The people calls can name: the active team list, the dashboard's active
 * Studio1 members and the founders, by email, with the best name known.
 * `team` is who "the whole team" means: the active team list.
 */
export async function callPeople(): Promise<{ people: CallPerson[]; team: string[] }> {
  const [list, members] = await Promise.all([listActivePeople(), listMembers()]);
  const names = new Map<string, string>();
  for (const email of OWNERS) names.set(email, "");
  for (const member of members ?? []) {
    if (member.status === "active" && member.email.toLowerCase().endsWith("@studio1hq.com"))
      names.set(member.email.toLowerCase(), member.name ?? "");
  }
  const team: string[] = [];
  for (const person of list.ok ? list.people : []) {
    const email = person.email.toLowerCase();
    team.push(email);
    names.set(email, person.name || names.get(email) || "");
  }
  const people = [...names].map(([email, name]) => ({ email, name: displayName({ email, name }) }));
  people.sort((a, b) => a.name.localeCompare(b.name));
  return { people, team };
}
