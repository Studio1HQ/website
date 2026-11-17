"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notify } from "@/lib/internal/notifications/data";
import { requireMember, staffName } from "@/lib/internal/session";
import { listPeople } from "@/lib/internal/team/people";
import { addDays } from "@/lib/internal/clients/schema";
import { istNow } from "@/lib/internal/team/shared";
import { canPlanCalls } from "@/lib/internal/calls/access";
import {
  changesOf,
  deleteCall,
  dropChanges,
  getCall,
  insertCall,
  removeChange,
  saveChange,
  updateCall,
} from "@/lib/internal/calls/data";
import {
  attendees,
  cleanCall,
  clock,
  isTime,
  occursOn,
  repeatLabel,
  shortDay,
  type Call,
  type CallResult,
} from "@/lib/internal/calls/shared";

/**
 * Calls writes. Server actions are public endpoints, so every one checks
 * the session and canPlanCalls (the founders and the founder's associate)
 * here.
 */

const NOT_ALLOWED: CallResult = { ok: false, message: "Only the founders and the founder's associate can change calls." };
const GONE: CallResult = { ok: false, message: "That call isn't there any more. Reload the page." };
const TRY_AGAIN: CallResult = { ok: false, message: "Couldn't check that just now. Try again in a minute." };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function refresh() {
  revalidatePath("/internal/calls");
  revalidatePath("/internal/me");
}

/**
 * Puts a call's news (added, moved, cancelled) on the bell of everyone in
 * it, never the person who did it. Runs after the response; a whole-team
 * call reads the active team list.
 */
function tellCall(call: Pick<Call, "host" | "people" | "whole_team">, by: string, title: string, body: string) {
  after(async () => {
    const team = call.whole_team ? await listPeople({ activeOnly: true }) : null;
    const everyone = team?.ok ? team.people.map((person) => person.email) : [];
    await notify(attendees(call, everyone), by, { kind: "call", title, body, href: "/internal/calls" });
  });
}

async function planner() {
  const staff = await requireMember();
  return canPlanCalls(staff) ? staff : null;
}

/** Adds a call (no id) or changes one. */
export async function saveCall(id: string | null, values: unknown): Promise<CallResult> {
  const staff = await planner();
  if (!staff) return NOT_ALLOWED;
  const clean = cleanCall(values);
  if (!clean.ok) return clean;
  const call = clean.call;

  if (!id) {
    const result = await insertCall({ ...call, id: crypto.randomUUID() }, staff.email);
    if (!result.ok) return result;
    tellCall(call, staff.email, `${staffName(staff)} added you to a call`, `${call.title} · ${repeatLabel(call)}`);
    refresh();
    return { ok: true, message: "Call added." };
  }

  if (!UUID.test(id)) return GONE;
  const existing = await getCall(id);
  if (existing === "error") return TRY_AGAIN;
  if (!existing) return GONE;
  const result = await updateCall(id, call, staff.email);
  if (!result.ok) return result;

  // Days moved or cancelled one at a time that the new schedule no longer
  // has go, so they don't hang about as ghosts.
  const changes = await changesOf([id], addDays(istNow().date, -60));
  if (changes.ok) {
    const stale = changes.rows.filter((change) => !occursOn(call, change.on_day)).map((change) => change.on_day);
    await dropChanges(id, stale);
  }
  // People already in it hear only when the schedule or the link changed;
  // people newly added always do. (A whole-team call tells everyone once.)
  const name = staffName(staff);
  const was = new Set(attendees(existing, []));
  const added = existing.whole_team ? [] : attendees(call, []).filter((email) => !was.has(email));
  const moved =
    existing.start_time !== call.start_time ||
    existing.link !== call.link ||
    repeatLabel(existing) !== repeatLabel(call) ||
    existing.starts_on !== call.starts_on;
  if (moved) {
    tellCall(
      { ...call, people: call.people.filter((email) => !added.includes(email)) },
      staff.email,
      `${name} changed a call`,
      `${call.title} · ${repeatLabel(call)}`,
    );
  }
  if (added.length) {
    after(() =>
      notify(added, staff.email, {
        kind: "call",
        title: `${name} added you to a call`,
        body: `${call.title} · ${repeatLabel(call)}`,
        href: "/internal/calls",
      }),
    );
  }
  refresh();
  return { ok: true, message: "Call saved." };
}

export async function removeCall(id: string): Promise<CallResult> {
  const staff = await planner();
  if (!staff) return NOT_ALLOWED;
  if (!UUID.test(id)) return GONE;
  // Read first: once it's gone there's nobody left to tell.
  const call = await getCall(id);
  const result = await deleteCall(id);
  if (!result.ok) return result;
  if (call && call !== "error") tellCall(call, staff.email, `${staffName(staff)} removed a call`, call.title);
  refresh();
  return { ok: true, message: "Call deleted." };
}

/**
 * One day of a call: cancel it, or move it to another day and/or time.
 * `onDay` is the day the series has it on.
 */
export async function changeOne(
  id: string,
  onDay: string,
  change: { cancel?: boolean; day?: string; time?: string; note?: string },
): Promise<CallResult> {
  const staff = await planner();
  if (!staff) return NOT_ALLOWED;
  if (!UUID.test(id) || !isDay(onDay)) return GONE;
  const call = await getCall(id);
  if (call === "error") return TRY_AGAIN;
  if (!call || !occursOn(call, onDay)) return GONE;

  const note = typeof change.note === "string" ? change.note.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  if (change.cancel) {
    const result = await saveChange(
      { call_id: id, on_day: onDay, cancelled: true, moved_day: null, moved_time: null, note },
      staff.email,
    );
    if (!result.ok) return result;
    tellCall(call, staff.email, `${staffName(staff)} cancelled a call on ${shortDay(onDay)}`, call.title);
    refresh();
    return { ok: true, message: "Cancelled for that day." };
  }

  const day = isDay(change.day) ? change.day : onDay;
  const time = isTime(change.time) ? change.time : call.start_time;
  if (change.day !== undefined && !isDay(change.day)) return { ok: false, message: "Pick the day to move it to." };
  if (change.time !== undefined && !isTime(change.time)) return { ok: false, message: "Pick the time to move it to." };
  // Back where the series has it: nothing to keep.
  if (day === onDay && time === call.start_time) {
    const result = await removeChange(id, onDay);
    if (!result.ok) return result;
    tellCall(call, staff.email, `${staffName(staff)} put a call back`, `${call.title} · ${shortDay(onDay)} at ${clock(call.start_time)}, as usual`);
    refresh();
    return { ok: true, message: "Back to its usual time." };
  }
  const result = await saveChange(
    {
      call_id: id,
      on_day: onDay,
      cancelled: false,
      moved_day: day === onDay ? null : day,
      moved_time: time === call.start_time ? null : time,
      note,
    },
    staff.email,
  );
  if (!result.ok) return result;
  tellCall(
    call,
    staff.email,
    `${staffName(staff)} moved a call`,
    `${call.title} · now ${shortDay(day)} at ${clock(time)} (was ${shortDay(onDay)} at ${clock(call.start_time)})`,
  );
  refresh();
  return { ok: true, message: "Moved for that day." };
}

/** Undoes a cancel or a move: the day goes back to the series' own. */
export async function restoreOne(id: string, onDay: string): Promise<CallResult> {
  const staff = await planner();
  if (!staff) return NOT_ALLOWED;
  if (!UUID.test(id) || !isDay(onDay)) return GONE;
  const call = await getCall(id);
  const result = await removeChange(id, onDay);
  if (!result.ok) return result;
  // They were told it was off or moved, so they're told it's back.
  if (call && call !== "error") {
    tellCall(call, staff.email, `${staffName(staff)} put a call back`, `${call.title} · ${shortDay(onDay)} at ${clock(call.start_time)}, as usual`);
  }
  refresh();
  return { ok: true, message: "Back on, as usual." };
}
