"use server";

import { revalidatePath } from "next/cache";
import { requireCommunity } from "@/lib/internal/session";
import { markHackathonNoShows } from "@/lib/internal/data";
import { cleanField, isUuid } from "@/lib/internal/community/clean";
import {
  MAX_CSV_BYTES,
  byteLength,
  guestsFromCsv,
} from "@/lib/internal/community/csv";
import {
  createRecord,
  deleteRecord,
  getRecord,
  importGuests,
  markNoShows,
  saveMetrics,
  touchFollowUp,
  updateRecord,
} from "@/lib/internal/community/data";
import {
  ENTITIES,
  channelKey,
  isDateKey,
  isEntityKey,
  isOwnedBy,
  quickField,
  todayKey,
  type ActionResult,
  type CommunityEvent,
  type Task,
} from "@/lib/internal/community/schema";

/**
 * Community area writes. Server actions are public endpoints, so each one
 * checks the session: managers (and admins) change anything; viewers can
 * only move their own tasks along.
 */

const DENIED: ActionResult = {
  ok: false,
  message: "You can read the community pages but not change them.",
};

function refresh() {
  revalidatePath("/internal/community", "layout");
}

async function manager() {
  const staff = await requireCommunity();
  return staff.community === "manager" ? staff : null;
}

function asInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Adds a record (no id) or changes one. */
export async function saveRecord(
  entity: unknown,
  id: unknown,
  values: unknown,
): Promise<ActionResult> {
  if (!isEntityKey(entity))
    return { ok: false, message: "Unknown record type." };
  const staff = await manager();
  if (!staff) return DENIED;
  const input = asInput(values);
  const result =
    typeof id === "string" && id
      ? await updateRecord(entity, id, input, staff.email)
      : await createRecord(entity, input, staff.email);
  if (result.ok) {
    refresh();
    const noun = ENTITIES[entity].noun;
    return {
      ...result,
      message: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${id ? "saved" : "added"}`,
    };
  }
  return result;
}

export async function removeRecord(
  entity: unknown,
  id: unknown,
): Promise<ActionResult> {
  if (!isEntityKey(entity) || typeof id !== "string")
    return { ok: false, message: "Unknown record." };
  const staff = await manager();
  if (!staff) return DENIED;
  const result = await deleteRecord(entity, id);
  if (result.ok) refresh();
  return result.ok ? { ok: true, message: "Deleted" } : result;
}

/**
 * The quick menus: an event's status, a sponsor's stage, a task's column…
 * Viewers may move tasks they own.
 */
export async function setQuickField(
  entity: unknown,
  id: unknown,
  value: unknown,
): Promise<ActionResult> {
  if (!isEntityKey(entity) || typeof id !== "string" || !isUuid(id))
    return { ok: false, message: "Unknown record." };
  const quick = quickField(entity);
  if (!quick) return { ok: false, message: "That can't be changed here." };
  const staff = await requireCommunity();
  if (staff.community !== "manager") {
    if (entity !== "task") return DENIED;
    const task = await getRecord<Task>("task", id);
    if (!task || !isOwnedBy(task.owner, staff.email))
      return { ok: false, message: "You can only move your own tasks." };
  }
  const result = await updateRecord(
    entity,
    id,
    { [quick.key]: value },
    staff.email,
  );
  if (result.ok) refresh();
  return result.ok
    ? {
        ok: true,
        message: quick.options.find((option) => option.value === value)?.label,
      }
    : result;
}

/** Imports a guest list from CSV text (a Luma, Meetup or Forms export). */
export async function importGuestList(
  eventId: unknown,
  csv: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (typeof eventId !== "string" || !isUuid(eventId))
    return { ok: false, message: "Unknown event." };
  if (typeof csv !== "string" || !csv.trim())
    return { ok: false, message: "Pick a CSV file or paste the list first." };
  // Bytes, not characters: names in other scripts take more than one.
  if (byteLength(csv) > MAX_CSV_BYTES)
    return {
      ok: false,
      message: "That file is too big. Split it into smaller ones.",
    };
  const parsed = guestsFromCsv(csv);
  if (!parsed.ok) return parsed;
  if (!parsed.guests.length)
    return {
      ok: false,
      message: "No rows with an email address in that file.",
    };
  const result = await importGuests(eventId, parsed.guests, staff.email);
  if (!result.ok) return result;
  refresh();
  const parts = [`${result.added} added`, `${result.updated} updated`];
  if (parsed.skipped) parts.push(`${parsed.skipped} skipped without an email`);
  return {
    ok: true,
    message: `Guest list imported: ${parts.join(", ")}`,
    warning: parsed.unreadCheckIns
      ? `${parsed.unreadCheckIns} check-in ${parsed.unreadCheckIns === 1 ? "value" : "values"} couldn't be read, so those guests were left as not checked in. Use yes/no or a date like 2026-11-13 18:30.`
      : undefined,
  };
}

/**
 * Logs a note, email, call or meeting on a sponsor, partner or event. For
 * sponsors and partners it also stamps the last contact (for anything but a
 * plain note) and can set the next follow-up date.
 */
export async function logActivity(
  values: unknown,
  followUpOn: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  const input: Record<string, unknown> = {
    happened_on: todayKey(),
    ...asInput(values),
  };
  const result = await createRecord("activity", input, staff.email);
  if (!result.ok) return result;
  const followUp =
    typeof followUpOn === "string" && isDateKey(followUpOn)
      ? followUpOn
      : undefined;
  const day =
    typeof input.happened_on === "string" && isDateKey(input.happened_on)
      ? input.happened_on
      : todayKey();
  const contacted = input.kind && input.kind !== "note" ? day : null;
  // The entry is saved by now. If the dates on the sponsor or partner
  // don't save, say so rather than claim the follow-up is set.
  let missed = false;
  for (const entity of ["sponsor", "partner"] as const) {
    const parentId = input[`${entity}_id`];
    if (
      typeof parentId === "string" &&
      isUuid(parentId) &&
      (followUp !== undefined || contacted)
    ) {
      const touched = await touchFollowUp(
        entity,
        parentId,
        { followUpOn: followUp, contactedOn: contacted },
        staff.email,
      );
      if (!touched.ok) missed = true;
    }
  }
  refresh();
  if (missed) {
    return {
      ok: true,
      message: "Logged",
      warning:
        followUp !== undefined
          ? "Logged, but the follow-up date didn't save. Set it again from Edit."
          : "Logged, but the last-contact date didn't save.",
    };
  }
  return { ok: true, message: followUp ? "Logged, follow-up set" : "Logged" };
}

/** Clears a sponsor's or partner's follow-up date ("Done"). */
export async function clearFollowUp(
  entity: unknown,
  id: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (
    (entity !== "sponsor" && entity !== "partner") ||
    typeof id !== "string" ||
    !isUuid(id)
  ) {
    return { ok: false, message: "Unknown record." };
  }
  const result = await touchFollowUp(
    entity,
    id,
    { followUpOn: null },
    staff.email,
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Follow-up cleared" };
}

/** Growth numbers for a date: [{ channel: "discord", value: "1520" }, …]. */
export async function logGrowth(
  day: unknown,
  entries: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (typeof day !== "string" || !isDateKey(day))
    return { ok: false, message: "Pick a valid date." };
  if (day > todayKey())
    return { ok: false, message: "Numbers can't be from the future." };
  const list = Array.isArray(entries) ? entries.slice(0, 30) : [];
  // One number per channel: "X" and "Twitter" are the same one, and the
  // later row wins.
  const byChannel = new Map<string, number>();
  const intField = ENTITIES.metric.fields.find(
    (field) => field.key === "value",
  )!;
  for (const entry of list) {
    const item = asInput(entry);
    // A blank number means "skip this channel"; a number for a channel
    // we can't name is a mistake to fix, not something to drop quietly.
    if (item.value === "" || item.value === undefined || item.value === null)
      continue;
    const channel = channelKey(item.channel);
    if (!channel)
      return {
        ok: false,
        message: `"${String(item.channel ?? "").slice(0, 40)}" can't be a channel name. Use letters and numbers, like Discord or LinkedIn.`,
      };
    const value = cleanField(intField, item.value);
    if (!value.ok || value.value === null)
      return {
        ok: false,
        message: `The number for ${String(item.channel)} needs to be a whole number.`,
      };
    byChannel.set(channel, value.value as number);
  }
  const values = [...byChannel].map(([channel, value]) => ({ channel, value }));
  if (!values.length)
    return { ok: false, message: "Type at least one number." };
  const result = await saveMetrics(day, values, staff.email);
  if (result.ok) refresh();
  return result.ok
    ? {
        ok: true,
        message: `Saved ${values.length} ${values.length === 1 ? "number" : "numbers"}`,
      }
    : result;
}

/** After an event: marks everyone not checked in as a no-show. */
export async function markRestNoShow(eventId: unknown): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (typeof eventId !== "string")
    return { ok: false, message: "Unknown event." };
  const result = await markNoShows(eventId, staff.email);
  if (!result.ok) return result;
  // A hackathon event's site registrations are on its door list too.
  const event = await getRecord<CommunityEvent>("event", eventId);
  let fromSite = 0;
  if (event?.hackathon_slug) {
    const site = await markHackathonNoShows(event.hackathon_slug);
    if (!site.ok) {
      refresh();
      return { ok: false, message: `${result.count ?? 0} guests marked as no-show, but the site registrations weren't. ${site.message}` };
    }
    fromSite = site.count;
    revalidatePath("/internal", "layout");
  }
  refresh();
  return { ok: true, message: `${(result.count ?? 0) + fromSite} marked as no-show` };
}
