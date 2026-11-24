"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { clientLogo } from "@/lib/internal/clients/logo";
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
  NEWSLETTER_CHANNEL_KEYS,
  NEWSLETTER_FIELDS,
  POST_FIELDS,
  RATE_FIELDS,
  formatInfo,
  formatName,
  isNiche,
  platformLabel,
  type InfluencerResult,
} from "@/lib/internal/influencers/schema";
import { cleanFields } from "@/lib/internal/outreach/clean";
import { canSeeInfluencers, requireMember, type Staff } from "@/lib/internal/session";
import { audit } from "@/lib/internal/team/audit";

/**
 * Influencer writes. Server actions are public endpoints, so every one
 * checks the session here: people given Influencers (the founders always
 * are; Admin alone isn't enough). Every
 * change leaves a row in the audit trail.
 */

const DENIED: InfluencerResult = {
  ok: false,
  message: "You don't have access to Influencers.",
};
const UNKNOWN: InfluencerResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};
const TRY_AGAIN: InfluencerResult = {
  ok: false,
  message: "Couldn't check that just now. Try again in a minute.",
};

/** The signed-in person, if they may use this area; null otherwise. */
async function allowed() {
  const staff = await requireMember();
  return canSeeInfluencers(staff) ? staff : null;
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

/**
 * The row to write from a form: "120k" read as a number, then the usual
 * field checks. A change ("update") carries only the fields the form
 * changed, and only those are written.
 */
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
  const staff = await allowed();
  if (!staff) return DENIED;
  const key = uuid(id);
  if (id && !key) return UNKNOWN;
  const cleaned = clean(INFLUENCER_FIELDS, values, key ? "update" : "create");
  if (!cleaned.ok) return cleaned;
  const row = cleaned.row;
  // Niches come from the list, so the roster's niche filter finds them.
  if (Array.isArray(row.niches)) row.niches = row.niches.filter(isNiche);

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

/**
 * Adds a newsletter: the publication (an influencer row) and its newsletter
 * channel in one go. If the channel can't be saved, the publication is
 * taken out again, so there's never one without the other.
 */
export async function saveNewsletter(values: unknown): Promise<InfluencerResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const cleaned = clean(NEWSLETTER_FIELDS, values, "create");
  if (!cleaned.ok) return cleaned;
  const channelKeys: readonly string[] = NEWSLETTER_CHANNEL_KEYS;
  const publication: Record<string, unknown> = {};
  const channel: Record<string, unknown> = { platform: "newsletter", handle: cleaned.row.name };
  for (const [key, value] of Object.entries(cleaned.row)) {
    if (channelKeys.includes(key)) channel[key] = value;
    else publication[key] = value;
  }
  if (Array.isArray(publication.niches)) publication.niches = publication.niches.filter(isNiche);
  if (publication.owner) {
    const owners = await ownerChoices();
    if (typeof publication.owner !== "string" || !owners.includes(publication.owner)) {
      return { ok: false, message: "Pick an owner from the list." };
    }
  }

  const added = await insertRecord("influencers", "a newsletter", publication, staff.email);
  if (!added.ok || !added.id) return added.ok ? TRY_AGAIN : added;
  const linked = await insertRecord(
    "channels",
    "a newsletter",
    { ...channel, influencer_id: added.id },
    staff.email,
  );
  if (!linked.ok) {
    await deleteRecord("influencers", "a newsletter", added.id);
    return linked;
  }
  await audit({
    actor: staff.email,
    area: "influencers",
    action: "added",
    subject: `${String(publication.name)} (newsletter)`,
    detail: { id: added.id, channel_id: linked.id, ...publication, channel },
  });
  warmNewsletterLogo("channel", channel);
  refresh();
  return { ok: true, id: added.id, message: "Newsletter added" };
}

/** Deletes a creator with their channels, rate card and posts. */
export async function removeInfluencer(id: unknown): Promise<InfluencerResult> {
  const staff = await allowed();
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
  // A rate's or a post's platform follows its format, so the two can't
  // disagree. A change that left the format alone doesn't send it.
  if (kind !== "channel" && (!key || "format" in row)) {
    const format = formatInfo(row.format);
    if (!format) return { ok: false, message: "Pick what it's for." };
    row.platform = format.platform;
  }

  const influencer = await getInfluencer(owner);
  if (influencer === "error") return TRY_AGAIN;
  if (!influencer) return UNKNOWN;

  if (!key) {
    const subject = `${influencer.name}: ${child.name(row)}`;
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
    warmNewsletterLogo(kind, row);
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
  // The record as it is now: the fields sent, over the ones left alone.
  const after = { ...before, ...row };
  const diff = changed(before, row);
  if (Object.keys(diff).length) {
    await audit({
      actor: staff.email,
      area: "influencers",
      action: "edited",
      subject: `${influencer.name}: ${child.name(after)}`,
      detail: { id: key, influencer_id: owner, changed: diff },
    });
  }
  if ("url" in diff || "platform" in diff) warmNewsletterLogo(kind, after);
  refresh();
  return { ...result, message: "Saved" };
}

/** A newsletter's icon is fetched after the save, so the Newsletters tab has it on first open. */
function warmNewsletterLogo(kind: keyof typeof CHILDREN, row: Record<string, unknown>) {
  const site = row.url;
  if (kind !== "channel" || row.platform !== "newsletter" || typeof site !== "string" || !site) return;
  after(() => clientLogo(site).then(() => undefined));
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
  const staff = await allowed();
  if (!staff) return DENIED;
  return saveChild(staff, "channel", influencerId, id, values);
}

export async function removeChannel(
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  return removeChild(staff, "channel", influencerId, id);
}

/** Adds a price to a creator's rate card (no id) or changes one. */
export async function saveRate(
  influencerId: unknown,
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  return saveChild(staff, "rate", influencerId, id, values);
}

export async function removeRate(
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  return removeChild(staff, "rate", influencerId, id);
}

/** Logs something a creator posted for us (no id) or changes it. */
export async function savePost(
  influencerId: unknown,
  id: unknown,
  values: unknown,
): Promise<InfluencerResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  return saveChild(staff, "post", influencerId, id, values);
}

export async function removePost(
  influencerId: unknown,
  id: unknown,
): Promise<InfluencerResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  return removeChild(staff, "post", influencerId, id);
}
