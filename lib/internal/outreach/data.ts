import "server-only";
import { cache } from "react";
import {
  deleteRows,
  inList,
  insertRow,
  insertRows,
  selectRows,
  updateRows,
} from "@/lib/supabase-server";
import { isUuid } from "@/lib/internal/community/clean";
import { isMissingTable } from "@/lib/internal/community/data";
import { todayKey } from "@/lib/internal/community/schema";
import { membersWith } from "@/lib/internal/members";
import {
  OPEN_STAGES,
  OUTREACH_MIGRATION_HINT,
  type Org,
  type OrgActivity,
  type OrgContact,
  type OutreachResult,
} from "@/lib/internal/outreach/schema";

/**
 * Outreach reads and writes. Server only, and every caller has already
 * checked the person is an admin (pages with requireOutreach, actions on
 * their own): nothing here checks who's asking.
 */

export const TABLES = {
  orgs: "outreach_orgs",
  contacts: "outreach_contacts",
  activity: "outreach_activity",
} as const;

export type Loaded<T> =
  | { ok: true; rows: T[]; truncated: boolean }
  | { ok: false; missing: boolean; message: string };

function failed<T>(table: string, message: string): Loaded<T> {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[outreach] reading ${table} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing ? OUTREACH_MIGRATION_HINT : "Couldn't load outreach just now. Reload in a minute.",
  };
}

const PAGE = 1000;

/**
 * Every matching row, a page at a time (Supabase caps a read at 1,000),
 * up to `cap`. The id settles rows the order leaves equal, so pages never
 * overlap.
 */
async function selectAll<T>(table: string, params: Record<string, string>, cap = 10_000): Promise<Loaded<T>> {
  const rows: T[] = [];
  const order = [params.order, "id.asc"].filter(Boolean).join(",");
  for (let offset = 0; offset < cap; offset += PAGE) {
    const result = await selectRows<T>(
      table,
      new URLSearchParams({ select: "*", ...params, order, limit: String(PAGE), offset: String(offset) }),
    );
    if (!result.ok) return failed(table, result.message);
    rows.push(...result.rows);
    if (result.rows.length < PAGE) return { ok: true, rows, truncated: false };
  }
  return { ok: true, rows, truncated: true };
}

/* Postgres sends numerics as text; the pages want numbers. */
function toOrg(row: Org): Org {
  const value = row.est_value === null || row.est_value === undefined ? null : Number(row.est_value);
  return { ...row, est_value: value !== null && Number.isFinite(value) ? value : null, tags: row.tags ?? [] };
}

/* ----------------------------------------------------------------- reads */

/** Every organisation, by name. Cached for the request (page and badge). */
export const loadOrgs = cache(async (): Promise<Loaded<Org>> => {
  const result = await selectAll<Org>(TABLES.orgs, { order: "name.asc" });
  return result.ok ? { ...result, rows: result.rows.map(toOrg) } : result;
});

export async function getOrg(id: string): Promise<Org | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows<Org>(TABLES.orgs, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!result.ok) {
    if (!isMissingTable(result.message)) console.error(`[outreach] reading an organisation failed: ${result.message}`);
    return "error";
  }
  return result.rows[0] ? toOrg(result.rows[0]) : null;
}

/** One organisation's people, main contact first. */
export function loadContacts(orgId: string): Promise<Loaded<OrgContact>> {
  return selectAll<OrgContact>(TABLES.contacts, { org_id: `eq.${orgId}`, order: "is_primary.desc,name.asc" });
}

/** Every organisation's main (or only) contact, by organisation id: for the export and search. */
export async function loadMainContacts(): Promise<Loaded<OrgContact>> {
  const result = await selectAll<OrgContact>(TABLES.contacts, { order: "org_id.asc,is_primary.desc,created_at.asc" }, 20_000);
  if (!result.ok) return result;
  const first = new Map<string, OrgContact>();
  for (const contact of result.rows) if (!first.has(contact.org_id)) first.set(contact.org_id, contact);
  return { ...result, rows: [...first.values()] };
}

/** One organisation's log, newest first. */
export function loadActivity(orgId: string): Promise<Loaded<OrgActivity>> {
  return selectAll<OrgActivity>(TABLES.activity, { org_id: `eq.${orgId}`, order: "happened_on.desc,created_at.desc" }, 2000);
}

export async function getContact(id: string): Promise<OrgContact | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows<OrgContact>(TABLES.contacts, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!result.ok) return "error";
  return result.rows[0] ?? null;
}

/** The organisations already using these domains: domain → id. */
export async function orgsByDomain(domains: readonly string[]): Promise<Map<string, string> | null> {
  const found = new Map<string, string>();
  const wanted = [...new Set(domains)];
  for (let index = 0; index < wanted.length; index += 100) {
    const result = await selectRows<{ id: string; domain: string }>(
      TABLES.orgs,
      new URLSearchParams({ select: "id,domain", domain: inList(wanted.slice(index, index + 100)), limit: "1000" }),
    );
    if (!result.ok) return null;
    for (const row of result.rows) found.set(row.domain, row.id);
  }
  return found;
}

/** People who can own outreach: the admins (the founders included). */
export async function ownerChoices(): Promise<string[]> {
  return (await membersWith(["admin"])).sort();
}

/**
 * The sidebar badge and the Overview's to-do: this person's follow-ups due
 * today or earlier on organisations still in play. Zero when it can't be
 * read (the migration not run included).
 */
export const outreachDue = cache(async (email: string): Promise<number> => {
  const result = await selectRows(
    TABLES.orgs,
    new URLSearchParams({
      select: "id",
      owner: `eq.${email.trim().toLowerCase()}`,
      stage: `in.(${OPEN_STAGES.join(",")})`,
      follow_up_on: `lte.${todayKey()}`,
      limit: "1",
    }),
    { count: true },
  );
  return result.ok ? (result.total ?? result.rows.length) : 0;
});

/* ---------------------------------------------------------------- writes */

const GONE: OutreachResult = { ok: false, message: "That isn't there any more. Reload the page." };

function writeError(what: string, message: string): OutreachResult {
  if (isMissingTable(message)) return { ok: false, message: OUTREACH_MIGRATION_HINT };
  if (message.includes("23505")) {
    return { ok: false, message: "Another organisation already has that website. Open that one instead." };
  }
  if (message.includes("23503")) return { ok: false, message: "The linked record isn't there any more. Reload the page." };
  console.error(`[outreach] saving ${what} failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** Adds a row with its stamps; returns the new id. */
export async function insertRecord(
  table: (typeof TABLES)[keyof typeof TABLES],
  what: string,
  row: Record<string, unknown>,
  by: string,
): Promise<OutreachResult> {
  const id = crypto.randomUUID();
  const result = await insertRow(table, { ...row, id, created_by: by, updated_by: by });
  return result.ok ? { ok: true, id } : writeError(what, result.message);
}

/** Adds several rows (each with its own id already) in one request. */
export async function insertRecords(
  table: (typeof TABLES)[keyof typeof TABLES],
  what: string,
  rows: Record<string, unknown>[],
  by: string,
): Promise<OutreachResult> {
  const result = await insertRows(
    table,
    rows.map((row) => ({ ...row, created_by: by, updated_by: by })),
  );
  return result.ok ? { ok: true } : writeError(what, result.message);
}

/** Changes the fields given; `unless` adds filters, so a stale change saves nothing. */
export async function updateRecord(
  table: (typeof TABLES)[keyof typeof TABLES],
  what: string,
  id: string,
  patch: Record<string, unknown>,
  by: string,
  unless: Record<string, string> = {},
): Promise<OutreachResult> {
  if (!isUuid(id)) return GONE;
  const result = await updateRows(table, new URLSearchParams({ id: `eq.${id}`, ...unless }), {
    ...patch,
    updated_by: by,
    updated_at: new Date().toISOString(),
  });
  if (!result.ok) return writeError(what, result.message);
  return result.count ? { ok: true, id } : GONE;
}

export async function deleteRecord(
  table: (typeof TABLES)[keyof typeof TABLES],
  what: string,
  id: string,
): Promise<OutreachResult> {
  if (!isUuid(id)) return GONE;
  const result = await deleteRows(table, new URLSearchParams({ id: `eq.${id}` }));
  if (!result.ok) return writeError(what, result.message);
  return { ok: true };
}

/** Only one main contact per organisation: the others lose the star. */
export async function clearOtherPrimaries(orgId: string, keepId: string, by: string) {
  await updateRows(
    TABLES.contacts,
    new URLSearchParams({ org_id: `eq.${orgId}`, id: `neq.${keepId}`, is_primary: "is.true" }),
    { is_primary: false, updated_by: by, updated_at: new Date().toISOString() },
  );
}
