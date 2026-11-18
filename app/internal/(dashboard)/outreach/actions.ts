"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { clientLogo } from "@/lib/internal/clients/logo";
import { saveClient } from "@/app/internal/(dashboard)/clients/actions";
import { isUuid } from "@/lib/internal/community/clean";
import { isDateKey, todayKey } from "@/lib/internal/community/schema";
import {
  SECRET_MESSAGE,
  block,
  cleanFields,
  looksLikeSecret,
  oneLine,
} from "@/lib/internal/outreach/clean";
import {
  TABLES,
  clearOtherPrimaries,
  deleteRecord,
  getContact,
  getOrg,
  insertRecord,
  insertRecords,
  loadContacts,
  orgsByDomain,
  ownerChoices,
  updateRecord,
} from "@/lib/internal/outreach/data";
import {
  activityEffect,
  domainOf,
  orgsFromCsv,
  stageProblem,
  stageStamps,
} from "@/lib/internal/outreach/rules";
import {
  ACTIVITY_KINDS,
  CONTACT_FIELDS,
  DIRECTIONS,
  ORG_FIELDS,
  ORG_STAGES,
  isOrgStage,
  type ActivityKind,
  type Direction,
  type OutreachResult,
} from "@/lib/internal/outreach/schema";
import { canSeeOutreach, requireMember } from "@/lib/internal/session";

/**
 * Outreach writes. Server actions are public endpoints, so every one checks
 * the session here: people given Outreach (the founders always are; Admin
 * alone isn't enough).
 */

const DENIED: OutreachResult = { ok: false, message: "You don't have access to Outreach." };
const UNKNOWN: OutreachResult = { ok: false, message: "That isn't there any more. Reload the page." };
const TRY_AGAIN: OutreachResult = { ok: false, message: "Couldn't check that just now. Try again in a minute." };

/** The signed-in person, if they may use this area; null otherwise. */
async function allowed() {
  const staff = await requireMember();
  return canSeeOutreach(staff) ? staff : null;
}

function refresh() {
  // The layout too: the sidebar badge counts follow-ups due.
  revalidatePath("/internal", "layout");
}

/**
 * Fetches the websites' logos after the response, a few at a time, so a
 * new organisation shows its icon on first open (they're kept a month; see
 * lib/internal/clients/logo.ts).
 */
function warmLogos(websites: readonly unknown[]) {
  const list = [...new Set(websites.filter((site): site is string => typeof site === "string" && Boolean(site)))];
  if (!list.length) return;
  after(async () => {
    for (let index = 0; index < list.length; index += 4) {
      await Promise.all(list.slice(index, index + 4).map((site) => clientLogo(site)));
    }
  });
}

function asInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** The owner has to be someone who can open Outreach, so a follow-up always reaches a person. */
async function ownerProblem(owner: unknown) {
  if (owner === null || owner === undefined || owner === "") return null;
  const choices = await ownerChoices();
  return typeof owner === "string" && choices.includes(owner) ? null : "Pick an owner from the list.";
}

/* --------------------------------------------------------- organisations */

/** Adds an organisation (no id) or changes one. */
export async function saveOrg(id: unknown, values: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const key = typeof id === "string" && isUuid(id) ? id.toLowerCase() : null;
  if (id && !key) return UNKNOWN;
  const clean = cleanFields(ORG_FIELDS, asInput(values), key ? "update" : "create");
  if (!clean.ok) return clean;
  const row = clean.row;
  // The domain follows the website, so the same company can't be added twice.
  if ("website" in row) row.domain = domainOf(typeof row.website === "string" ? row.website : null);
  const today = todayKey();

  if (!key) {
    const owner = await ownerProblem(row.owner);
    if (owner) return { ok: false, message: owner };
    const stage = isOrgStage(row.stage) ? row.stage : "lead";
    const problem = stageProblem(stage, typeof row.lost_reason === "string" ? row.lost_reason : "");
    if (problem) return { ok: false, message: problem };
    const result = await insertRecord(
      TABLES.orgs,
      "an organisation",
      { ...row, stage, ...stageStamps(null, stage, today), ...(stage === "lost" ? {} : { lost_reason: "" }) },
      staff.email,
    );
    if (!result.ok) return result;
    warmLogos([row.website]);
    refresh();
    return { ...result, message: "Organisation added" };
  }

  const before = await getOrg(key);
  if (before === "error") return TRY_AGAIN;
  if (!before) return UNKNOWN;
  // An owner who has since lost access can stay; only a new pick is checked.
  if ("owner" in row && row.owner !== before.owner) {
    const owner = await ownerProblem(row.owner);
    if (owner) return { ok: false, message: owner };
  }
  if (isOrgStage(row.stage)) {
    const reason = typeof row.lost_reason === "string" ? row.lost_reason : before.lost_reason;
    const problem = stageProblem(row.stage, reason);
    if (problem) return { ok: false, message: problem };
    Object.assign(row, stageStamps(before.stage, row.stage, today));
    // The reason belongs to Lost; anywhere else it would be stale.
    if (row.stage !== "lost") row.lost_reason = "";
  }
  const result = await updateRecord(TABLES.orgs, "an organisation", key, row, staff.email);
  if (!result.ok) return result;
  if (row.website !== before.website) warmLogos([row.website]);
  refresh();
  return { ...result, message: "Saved" };
}

/** Moves an organisation to another stage. Lost needs `reason`. */
export async function setStage(id: unknown, to: unknown, reason?: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id) || !isOrgStage(to)) return UNKNOWN;
  const org = await getOrg(id);
  if (org === "error") return TRY_AGAIN;
  if (!org) return UNKNOWN;
  if (org.stage === to) return { ok: true, id: org.id, message: "Already there" };
  const why = oneLine(reason, 300);
  if (looksLikeSecret(why)) return { ok: false, message: SECRET_MESSAGE };
  const problem = stageProblem(to, why);
  if (problem) return { ok: false, message: problem };
  const result = await updateRecord(
    TABLES.orgs,
    "an organisation",
    org.id,
    { stage: to, lost_reason: to === "lost" ? why : "", ...stageStamps(org.stage, to, todayKey()) },
    staff.email,
    // Only if nobody moved it meanwhile.
    { stage: `eq.${org.stage}` },
  );
  if (!result.ok) {
    return result.message === UNKNOWN.message
      ? { ok: false, message: "Someone else moved it just now. Reload to see where it is." }
      : result;
  }
  refresh();
  const label = ORG_STAGES.find((stage) => stage.value === to)?.label ?? to;
  return { ok: true, id: org.id, message: `Moved to ${label}` };
}

/** Deletes an organisation with its contacts and log. */
export async function removeOrg(id: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const result = await deleteRecord(TABLES.orgs, "an organisation", id);
  if (!result.ok) return result;
  console.info(`[outreach] ${staff.email} deleted organisation ${id}`);
  refresh();
  return { ok: true, message: "Organisation deleted" };
}

/** Takes the follow-up date off: nothing to chase for now. */
export async function clearFollowUp(id: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const result = await updateRecord(TABLES.orgs, "an organisation", id, { follow_up_on: null }, staff.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Follow-up cleared" };
}

/* -------------------------------------------------------------- contacts */

/** Adds a person to an organisation (no id) or changes one. */
export async function saveContact(orgId: unknown, id: unknown, values: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof orgId !== "string" || !isUuid(orgId)) return UNKNOWN;
  const key = typeof id === "string" && isUuid(id) ? id.toLowerCase() : null;
  if (id && !key) return UNKNOWN;
  const clean = cleanFields(CONTACT_FIELDS, asInput(values), key ? "update" : "create");
  if (!clean.ok) return clean;

  let saved: OutreachResult;
  if (key) {
    const contact = await getContact(key);
    if (contact === "error") return TRY_AGAIN;
    if (!contact || contact.org_id !== orgId.toLowerCase()) return UNKNOWN;
    saved = await updateRecord(TABLES.contacts, "a contact", key, clean.row, staff.email);
  } else {
    const org = await getOrg(orgId);
    if (org === "error") return TRY_AGAIN;
    if (!org) return UNKNOWN;
    saved = await insertRecord(TABLES.contacts, "a contact", { ...clean.row, org_id: org.id }, staff.email);
  }
  if (!saved.ok) return saved;
  if (clean.row.is_primary === true && saved.id) await clearOtherPrimaries(orgId.toLowerCase(), saved.id, staff.email);
  refresh();
  return { ...saved, message: key ? "Contact saved" : "Contact added" };
}

export async function removeContact(id: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const result = await deleteRecord(TABLES.contacts, "a contact", id);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Contact deleted" };
}

/* -------------------------------------------------------------- activity */

/**
 * Logs an email, DM, call, meeting, proposal or note. values: { kind,
 * direction, summary, happened_on, contact_id?, follow_up_on?, next_step? }.
 * Also stamps the last contact, moves the follow-up and next step when
 * given, and moves a lead along (see activityEffect).
 */
export async function logActivity(orgId: unknown, values: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof orgId !== "string" || !isUuid(orgId)) return UNKNOWN;
  const input = asInput(values);
  const kind = ACTIVITY_KINDS.find((option) => option.value === input.kind)?.value as ActivityKind | undefined;
  const direction = (DIRECTIONS.find((option) => option.value === input.direction)?.value ?? "out") as Direction;
  if (!kind) return { ok: false, message: "Pick what kind of entry it is." };
  const summary = block(input.summary, 5000);
  if (!summary) return { ok: false, message: "Say what happened." };
  const nextStep = oneLine(input.next_step, 200);
  if (looksLikeSecret(summary) || looksLikeSecret(nextStep)) return { ok: false, message: SECRET_MESSAGE };
  const today = todayKey();
  const day = typeof input.happened_on === "string" && input.happened_on ? input.happened_on : today;
  if (!isDateKey(day) || day > today) return { ok: false, message: "Pick the day it happened, today or earlier." };
  const followUp = typeof input.follow_up_on === "string" && input.follow_up_on ? input.follow_up_on : "";
  if (followUp && !isDateKey(followUp)) return { ok: false, message: "Pick a valid follow-up date." };

  const org = await getOrg(orgId);
  if (org === "error") return TRY_AGAIN;
  if (!org) return UNKNOWN;
  let contactId: string | null = null;
  if (typeof input.contact_id === "string" && input.contact_id) {
    const contact = await getContact(input.contact_id);
    if (contact === "error") return TRY_AGAIN;
    if (!contact || contact.org_id !== org.id) return { ok: false, message: "Pick one of this organisation's contacts." };
    contactId = contact.id;
  }

  const result = await insertRecord(
    TABLES.activity,
    "the log entry",
    { org_id: org.id, contact_id: contactId, kind, direction, summary, happened_on: day },
    staff.email,
  );
  if (!result.ok) return result;

  // The entry is saved; what it changes on the organisation comes second.
  const patch = activityEffect(org, { kind, direction, happened_on: day, follow_up_on: followUp, next_step: nextStep });
  let warning: string | undefined;
  if (Object.keys(patch).length) {
    const updated = await updateRecord(
      TABLES.orgs,
      "an organisation",
      org.id,
      { ...patch, ...(patch.stage ? stageStamps(org.stage, patch.stage, today) : {}) },
      staff.email,
    );
    if (!updated.ok) warning = "Logged, but the follow-up and last contact weren't updated. Set them in Edit.";
  }
  refresh();
  return { ok: true, id: result.id, message: "Logged", warning };
}

export async function removeActivity(id: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const result = await deleteRecord(TABLES.activity, "the log entry", id);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Entry deleted" };
}

/* ------------------------------------------------------- convert, import */

/**
 * Turns a won organisation into a client: the same save as Clients' own
 * "New client" (its checks, its short name, its logo), filled from the
 * organisation and its main contact, then remembered here so it's only
 * done once.
 */
export async function convertToClient(id: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  const org = await getOrg(id);
  if (org === "error") return TRY_AGAIN;
  if (!org) return UNKNOWN;
  if (org.client_id) return { ok: false, message: "It's already a client. Open it from Clients." };
  if (org.stage !== "won") return { ok: false, message: "Move it to Won first." };
  const contacts = await loadContacts(org.id);
  if (!contacts.ok) return TRY_AGAIN;
  const main = contacts.rows[0];
  const client = await saveClient(null, {
    name: org.name,
    status: "active",
    website: org.website ?? "",
    contact_name: main?.name ?? "",
    contact_email: main?.email ?? "",
    started_on: todayKey(),
    notes: org.notes,
  });
  if (!client.ok) return client;
  const linked = client.id
    ? await updateRecord(TABLES.orgs, "an organisation", org.id, { client_id: client.id }, staff.email)
    : null;
  refresh();
  return {
    ok: true,
    id: org.id,
    slug: client.slug,
    message: `${org.name} is now a client`,
    warning: linked?.ok ? undefined : "The client was added, but the link back to it here wasn't saved.",
  };
}

/** The most rows one import adds, so a request stays quick. */
const IMPORT_LIMIT = 2000;

/**
 * Adds organisations (each with at most one person) from CSV text. Rows
 * for a website that's already here, or repeated in the file, are skipped.
 */
export async function importOrgs(csv: unknown): Promise<OutreachResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof csv !== "string" || !csv.trim()) return { ok: false, message: "Pick a CSV file first." };
  if (csv.length > 2_000_000) return { ok: false, message: "That file is too big. Split it and import the parts." };
  if (looksLikeSecret(csv)) return { ok: false, message: SECRET_MESSAGE };
  const parsed = orgsFromCsv(csv, IMPORT_LIMIT);
  if (!parsed.ok) return parsed;

  const domains = parsed.orgs.map((org) => org.domain).filter((domain): domain is string => Boolean(domain));
  const [existing, owners] = await Promise.all([orgsByDomain(domains), ownerChoices()]);
  if (!existing) return TRY_AGAIN;
  const fresh = parsed.orgs.filter((org) => !org.domain || !existing.has(org.domain));
  const skipped = parsed.skipped + (parsed.orgs.length - fresh.length);
  if (!fresh.length) return { ok: true, message: `Nothing new: all ${skipped} rows are already here or repeat.` };

  const today = todayKey();
  const orgRows: Record<string, unknown>[] = [];
  const contactRows: Record<string, unknown>[] = [];
  for (const org of fresh) {
    const id = crypto.randomUUID();
    orgRows.push({
      id,
      name: org.name,
      website: org.website || null,
      domain: org.domain,
      kind: org.kind,
      stage: org.stage,
      source: org.source,
      // An owner who can't open Outreach would never see the follow-up.
      owner: owners.includes(org.owner) ? org.owner : staff.email,
      notes: org.notes,
      priority: org.priority,
      about: org.about,
      funding: org.funding,
      why_fit: org.why_fit,
      warm_path: org.warm_path,
      signal_url: org.signal_url || null,
      conflict: org.conflict,
      ...stageStamps(null, org.stage, today),
    });
    if (org.contact) {
      contactRows.push({
        id: crypto.randomUUID(),
        org_id: id,
        name: org.contact.name,
        email: org.contact.email || null,
        title: org.contact.title,
        linkedin: org.contact.linkedin || null,
        x_handle: org.contact.x_handle,
        is_primary: true,
      });
    }
  }
  // Every row carries the same columns, as a bulk insert needs.
  for (const row of orgRows) {
    if (!("closed_on" in row)) row.closed_on = null;
    if (!("follow_up_on" in row)) row.follow_up_on = null;
  }
  const BATCH = 500;
  for (let index = 0; index < orgRows.length; index += BATCH) {
    const result = await insertRecords(TABLES.orgs, "the import", orgRows.slice(index, index + BATCH), staff.email);
    if (!result.ok) {
      refresh();
      return index
        ? { ok: false, message: `Added the first ${index}, then stopped: ${result.message}` }
        : result;
    }
  }
  let warning: string | undefined;
  for (let index = 0; index < contactRows.length; index += BATCH) {
    const result = await insertRecords(TABLES.contacts, "the import", contactRows.slice(index, index + BATCH), staff.email);
    if (!result.ok) {
      warning = "The organisations were added, but some of their contacts weren't. Add those by hand.";
      break;
    }
  }
  console.info(`[outreach] ${staff.email} imported ${orgRows.length} organisations (${skipped} skipped)`);
  warmLogos(fresh.map((org) => org.website));
  refresh();
  return {
    ok: true,
    message: `Added ${orgRows.length}${skipped ? `, skipped ${skipped} already here or repeated` : ""}`,
    warning,
  };
}
