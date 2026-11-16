import { parseCsv } from "@/lib/internal/community/csv";
import {
  OPEN_STAGES,
  ORG_KINDS,
  ORG_SOURCES,
  ORG_STAGES,
  type ActivityKind,
  type Direction,
  type Org,
  type OrgKind,
  type OrgStage,
} from "@/lib/internal/outreach/schema";

/**
 * Outreach rules with no database in them: what counts as open or due, what
 * a stage move needs, what logging an entry changes on the organisation,
 * and how a spreadsheet's rows become organisations. Pure, so they're
 * tested (rules.test.ts) and the pages and actions agree.
 */

/* --------------------------------------------------------------- domains */

/**
 * A website's host, lowercased, without "www.": "https://www.Acme.dev/x" →
 * "acme.dev". Null when there's no usable host. Two organisations with the
 * same domain are the same company.
 */
export function domainOf(website: string | null | undefined) {
  const text = (website ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- stages */

export function isOpen(stage: string) {
  return (OPEN_STAGES as readonly string[]).includes(stage);
}

/** Still in play, with a follow-up date of today or earlier. */
export function followUpDue(org: Pick<Org, "stage" | "follow_up_on">, today: string) {
  return isOpen(org.stage) && Boolean(org.follow_up_on && org.follow_up_on <= today);
}

/** What stops a move to this stage, or null. Lost needs a reason, so the next person learns from it. */
export function stageProblem(to: OrgStage, lostReason: string | null | undefined) {
  if (to === "lost" && !(lostReason ?? "").trim()) return "Say why it was lost, in a few words.";
  return null;
}

/**
 * What a stage change stamps: the day it closed (won, lost or parked), and
 * nothing to chase once it has. Reopening clears the day. Empty when the
 * stage didn't change.
 */
export function stageStamps(from: string | null, to: string, today: string): Partial<Pick<Org, "closed_on" | "follow_up_on">> {
  if (from === to) return {};
  if (isOpen(to)) return { closed_on: null };
  // Parked for now keeps its follow-up date: that's when to try again.
  return to === "not_now" ? { closed_on: today } : { closed_on: today, follow_up_on: null };
}

/* -------------------------------------------------------------- activity */

export type ActivityEntry = {
  kind: ActivityKind;
  direction: Direction;
  happened_on: string;
  /** A new follow-up date, "" to leave it, null to clear it. */
  follow_up_on?: string | null;
  /** A new next step; blank leaves the one there. */
  next_step?: string;
};

/**
 * What logging an entry changes on the organisation. A note is the team
 * talking to itself, so it doesn't count as contact. The last contact only
 * moves forward (logging an old call doesn't hide a newer one). The first
 * time we reach out to a lead it becomes Contacted; a reply from someone
 * we'd only contacted becomes Replied.
 */
export function activityEffect(
  org: Pick<Org, "stage" | "last_contact_on">,
  entry: ActivityEntry,
): Partial<Pick<Org, "stage" | "last_contact_on" | "follow_up_on" | "next_step">> {
  const patch: Partial<Pick<Org, "stage" | "last_contact_on" | "follow_up_on" | "next_step">> = {};
  const contact = entry.kind !== "note";
  if (contact && (!org.last_contact_on || org.last_contact_on < entry.happened_on)) {
    patch.last_contact_on = entry.happened_on;
  }
  if (contact && entry.direction === "out" && org.stage === "lead") patch.stage = "contacted";
  if (contact && entry.direction === "in" && (org.stage === "lead" || org.stage === "contacted")) patch.stage = "replied";
  if (entry.follow_up_on === null) patch.follow_up_on = null;
  else if (entry.follow_up_on) patch.follow_up_on = entry.follow_up_on;
  const next = (entry.next_step ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (next) patch.next_step = next;
  return patch;
}

/* ------------------------------------------------------------ CSV import */

export type ImportedOrg = {
  name: string;
  website: string;
  domain: string | null;
  kind: OrgKind;
  stage: OrgStage;
  source: string;
  owner: string;
  notes: string;
  contact: { name: string; email: string; title: string } | null;
};

export type OrgImport =
  | { ok: true; orgs: ImportedOrg[]; skipped: number }
  | { ok: false; message: string };

/** Header names as people write them, squeezed to letters and digits. */
const HEADERS = {
  name: ["name", "company", "companyname", "organisation", "organization", "org", "account", "brand", "creator"],
  website: ["website", "url", "site", "domain", "link", "companywebsite", "web"],
  kind: ["kind", "type", "category"],
  stage: ["stage", "status", "pipeline"],
  source: ["source", "from", "channel", "leadsource"],
  owner: ["owner", "assignee", "assignedto", "rep", "accountowner"],
  contactName: ["contactname", "contact", "person", "fullname", "pointofcontact", "poc", "firstname"],
  contactEmail: ["contactemail", "email", "emailaddress", "mail"],
  title: ["title", "contacttitle", "role", "jobtitle", "designation", "position"],
  notes: ["notes", "note", "comments", "comment", "description"],
} as const;

function squeeze(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function find(headers: string[], names: readonly string[]) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

/** A cell's value as one of a list's options: by value or label, loosely. */
function optionFrom<T extends string>(
  list: readonly { value: T; label: string }[],
  text: string,
  fallback: T,
): T {
  const wanted = squeeze(text);
  if (!wanted) return fallback;
  const hit = list.find((option) => squeeze(option.value) === wanted || squeeze(option.label) === wanted);
  return hit ? hit.value : fallback;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Organisations from a spreadsheet export: a header row, then one company
 * per row with, at most, one person. Only a name column is needed. Rows
 * without a name are skipped, and so is a second row for a domain (or, with
 * no website, a name) already seen in the file.
 */
export function orgsFromCsv(text: string, limit = 2000): OrgImport {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, message: "The file needs a header row and at least one organisation." };
  const headers = rows[0].map(squeeze);
  const at = {
    name: find(headers, HEADERS.name),
    website: find(headers, HEADERS.website),
    kind: find(headers, HEADERS.kind),
    stage: find(headers, HEADERS.stage),
    source: find(headers, HEADERS.source),
    owner: find(headers, HEADERS.owner),
    contactName: find(headers, HEADERS.contactName),
    contactEmail: find(headers, HEADERS.contactEmail),
    title: find(headers, HEADERS.title),
    notes: find(headers, HEADERS.notes),
  };
  if (at.name === -1) return { ok: false, message: 'Couldn\'t find a name column. Name its header "name" or "company".' };
  if (rows.length - 1 > limit) {
    return { ok: false, message: `That's more than ${limit.toLocaleString("en-IN")} rows. Split the file.` };
  }

  const cell = (row: string[], index: number, max: number) =>
    index === -1 ? "" : (row[index] ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const seen = new Set<string>();
  const orgs: ImportedOrg[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const name = cell(row, at.name, 140);
    if (!name) {
      // A blank line at the end isn't a skipped organisation.
      if (row.some((value) => value.trim())) skipped++;
      continue;
    }
    const website = cell(row, at.website, 300);
    const domain = domainOf(website);
    const key = domain ?? `name:${name.toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    const contactName = cell(row, at.contactName, 120);
    const email = cell(row, at.contactEmail, 200).toLowerCase();
    const contactEmail = EMAIL.test(email) ? email : "";
    const owner = cell(row, at.owner, 120).toLowerCase();
    orgs.push({
      name,
      website: domain ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : "",
      domain,
      kind: optionFrom(ORG_KINDS, cell(row, at.kind, 40), "client"),
      stage: optionFrom(ORG_STAGES, cell(row, at.stage, 40), "lead"),
      source: optionFrom(ORG_SOURCES, cell(row, at.source, 40), "outbound"),
      owner: EMAIL.test(owner) ? owner : "",
      notes: cell(row, at.notes, 5000),
      contact:
        contactName || contactEmail
          ? { name: contactName || contactEmail.split("@")[0], email: contactEmail, title: cell(row, at.title, 120) }
          : null,
    });
  }
  if (!orgs.length) return { ok: false, message: "No rows with a name were found." };
  return { ok: true, orgs, skipped };
}

/* ----------------------------------------------------------------- lists */

/** Follow-ups first (oldest date on top), then by name. */
export function byFollowUp(a: Pick<Org, "follow_up_on" | "name">, b: Pick<Org, "follow_up_on" | "name">) {
  return (a.follow_up_on ?? "9999").localeCompare(b.follow_up_on ?? "9999") || a.name.localeCompare(b.name);
}
