"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/internal/community/clean";
import type { FieldDef } from "@/lib/internal/community/schema";
import {
  deleteRecord,
  getInfluencer,
  getRecord,
  insertRecord,
  ownerChoices,
  updateRecord,
  type TableKey,
} from "@/lib/internal/influencers/data";
import { changed, countsToNumbers } from "@/lib/internal/influencers/rules";
import {
  CHANNEL_FIELDS,
  INFLUENCER_FIELDS,
  POST_FIELDS,
  RATE_FIELDS,
  formatInfo,
  formatName,
  platformLabel,
  type InfluencerResult,
} from "@/lib/internal/influencers/schema";
import { cleanFields } from "@/lib/internal/outreach/clean";
import { isAdmin, requireMember, type Staff } from "@/lib/internal/session";
import { audit } from "@/lib/internal/team/audit";

/**
 * Influencer writes. Server actions are public endpoints, so every one
 * checks the session here: admins only (the founders are admins). Every
 * change leaves a row in the audit trail.
 */

const DENIED: InfluencerResult = {
  ok: false,
  message: "Only admins can change influencers.",
};
const UNKNOWN: InfluencerResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};
const TRY_AGAIN: InfluencerResult = {
  ok: false,
  message: "Couldn't check that just now. Try again in a minute.",
};

async function admin() {
  const staff = await requireMember();
  return isAdmin(staff) ? staff : null;
}

function refresh() {
  revalidatePath("/internal/influencers", "layout");
}

function asInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function uuid(value: unknown) {
  return typeof value === "string" && isUuid(value)
    ? value.toLowerCase()
    : null;
}

/** The row to write from a form: "120k" read as a number, then the usual field checks. */
function clean(
  fields: readonly FieldDef[],
  values: unknown,
  mode: "create" | "update",
) {
  const counts = countsToNumbers(
    asInput(values),
    Object.fromEntries(fields.map((field) => [field.key, field.label])),
  );
  return counts.ok ? cleanFields(fields, counts.values, mode) : counts;
}

/* ------------------------------------------------------------ influencers */

/** Adds a creator (no id) or changes one. */
export async function saveInfluencer(
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  const key = uuid(id);
  if (id && !key) return UNKNOWN;
  const cleaned = clean(INFLUENCER_FIELDS, values, key ? "update" : "create");
  if (!cleaned.ok) return cleaned;
  const row = cleaned.row;

  const before = key ? await getInfluencer(key) : null;
  if (before === "error") return TRY_AGAIN;
  if (key && !before) return UNKNOWN;
  // The owner has to be someone who can open this page. One who has since
  // lost access can stay; only a new pick is checked.
  if (row.owner && row.owner !== before?.owner) {
    const owners = await ownerChoices();
    if (typeof row.owner !== "string" || !owners.includes(row.owner)) {
      return { ok: false, message: "Pick an owner from the list." };
    }
  }

  if (!key) {
    const result = await insertRecord(
      "influencers",
      "an influencer",
      row,
      staff.email,
    );
    if (!result.ok) return result;
    await audit({
      actor: staff.email,
      area: "influencers",
      action: "added",
      subject: String(row.name),
      detail: { id: result.id, ...row },
    });
    refresh();
    return { ...result, message: "Influencer added" };
  }
  const result = await updateRecord(
    "influencers",
    "an influencer",
    key,
    row,
    staff.email,
  );
  if (!result.ok) return result;
  const diff = changed(before as unknown as Record<string, unknown>, row);
  if (Object.keys(diff).length) {
    await audit({
      actor: staff.email,
      area: "influencers",
      action: "edited",
      subject: before!.name,
      detail: { id: key, changed: diff },
    });
  }
  refresh();
  return { ...result, message: "Saved" };
}

/** Deletes a creator with their channels, rate card and posts. */
export async function removeInfluencer(id: unknown): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  const key = uuid(id);
  if (!key) return UNKNOWN;
  const before = await getInfluencer(key);
  if (before === "error") return TRY_AGAIN;
  if (!before) return UNKNOWN;
  const result = await deleteRecord("influencers", "an influencer", key);
  if (!result.ok) return result;
  await audit({
    actor: staff.email,
    area: "influencers",
    action: "deleted",
    subject: before.name,
    detail: { deleted: before },
  });
  refresh();
  return { ok: true, message: "Influencer deleted" };
}

/* ------------------------------------------- channels, rates and posts */

type Child = {
  table: Exclude<TableKey, "influencers">;
  /** "a rate", for errors and the audit trail. */
  what: string;
  fields: readonly FieldDef[];
  /** "X · Quote tweet rate": what the audit row says it was. */
  name: (row: Record<string, unknown>) => string;
};

const CHILDREN = {
  channel: {
    table: "channels",
    what: "a channel",
    fields: CHANNEL_FIELDS,
    name: (row) => `${platformLabel(row.platform)} channel`,
  },
  rate: {
    table: "rates",
    what: "a rate",
    fields: RATE_FIELDS,
    name: (row) => `${formatName(row.format)} rate`,
  },
  post: {
    table: "posts",
    what: "a post",
    fields: POST_FIELDS,
    name: (row) => `${formatName(row.format)} post`,
  },
} as const satisfies Record<string, Child>;

async function saveChild(
  staff: Staff,
  kind: keyof typeof CHILDREN,
  influencerId: unknown,
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const child: Child = CHILDREN[kind];
  const owner = uuid(influencerId);
  const key = uuid(id);
  if (!owner || (id && !key)) return UNKNOWN;
  const cleaned = clean(child.fields, values, key ? "update" : "create");
  if (!cleaned.ok) return cleaned;
  const row = cleaned.row;
  // A rate's or a post's platform follows its format, so the two can't disagree.
  if (kind !== "channel") {
    const format = formatInfo(row.format);
    if (!format) return { ok: false, message: "Pick what it's for." };
    row.platform = format.platform;
  }

  const influencer = await getInfluencer(owner);
  if (influencer === "error") return TRY_AGAIN;
  if (!influencer) return UNKNOWN;
  const subject = `${influencer.name}: ${child.name(row)}`;

  if (!key) {
    const result = await insertRecord(
      child.table,
      child.what,
      { ...row, influencer_id: owner },
      staff.email,
    );
    if (!result.ok) return result;
    await audit({
      actor: staff.email,
      area: "influencers",
      action: "added",
      subject,
      detail: { id: result.id, influencer_id: owner, ...row },
    });
    refresh();
    return { ...result, message: "Added" };
  }
  const before = await getRecord(child.table, key);
  if (before === "error") return TRY_AGAIN;
  if (!before || before.influencer_id !== owner) return UNKNOWN;
  const result = await updateRecord(
    child.table,
    child.what,
    key,
    row,
    staff.email,
  );
  if (!result.ok) return result;
  const diff = changed(before, row);
  if (Object.keys(diff).length) {
    await audit({
      actor: staff.email,
      area: "influencers",
      action: "edited",
      subject,
      detail: { id: key, influencer_id: owner, changed: diff },
    });
  }
  refresh();
  return { ...result, message: "Saved" };
}

async function removeChild(
  staff: Staff,
  kind: keyof typeof CHILDREN,
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const child: Child = CHILDREN[kind];
  const owner = uuid(influencerId);
  const key = uuid(id);
  if (!owner || !key) return UNKNOWN;
  const [influencer, before] = await Promise.all([
    getInfluencer(owner),
    getRecord(child.table, key),
  ]);
  if (influencer === "error" || before === "error") return TRY_AGAIN;
  if (!influencer || !before || before.influencer_id !== owner) return UNKNOWN;
  const result = await deleteRecord(child.table, child.what, key);
  if (!result.ok) return result;
  await audit({
    actor: staff.email,
    area: "influencers",
    action: "deleted",
    subject: `${influencer.name}: ${child.name(before)}`,
    detail: { deleted: before },
  });
  refresh();
  return { ok: true, message: "Deleted" };
}

/** Adds a creator's account on a platform (no id) or changes it. One per platform. */
export async function saveChannel(
  influencerId: unknown,
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  return saveChild(staff, "channel", influencerId, id, values);
}

export async function removeChannel(
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  return removeChild(staff, "channel", influencerId, id);
}

/** Adds a price to a creator's rate card (no id) or changes one. */
export async function saveRate(
  influencerId: unknown,
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  return saveChild(staff, "rate", influencerId, id, values);
}

export async function removeRate(
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  return removeChild(staff, "rate", influencerId, id);
}

/** Logs something a creator posted for us (no id) or changes it. */
export async function savePost(
  influencerId: unknown,
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  return saveChild(staff, "post", influencerId, id, values);
}

export async function removePost(
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const staff = await admin();
  if (!staff) return DENIED;
  return removeChild(staff, "post", influencerId, id);
}
