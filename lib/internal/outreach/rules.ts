import { cleanUrl } from "@/lib/internal/community/clean";
import { parseCsv } from "@/lib/internal/community/csv";
import {
  OPEN_STAGES,
  ORG_KINDS,
  ORG_PRIORITIES,
  ORG_SOURCES,
  ORG_STAGES,
  isOrgStage,
  priorityRank,
  type ActivityKind,
  type Direction,
  type Org,
  type OrgKind,
  type OrgPriority,
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

/**
 * What an edit means for the stage's own fields. An edit sends only the
 * fields that were changed (`sent`), so a stage or a lost reason that came
 * alone is checked against the other one as saved. The closed day follows
 * the stage: it only moves when the stage itself was sent, so saving a new
 * name from a form that sat open never restamps it.
 */
export function stageEdit(
  before: Pick<Org, "stage" | "lost_reason">,
  sent: { stage?: unknown; lost_reason?: unknown },
  today: string,
):
  | { ok: true; patch: Partial<Pick<Org, "closed_on" | "follow_up_on" | "lost_reason">> }
  | { ok: false; message: string } {
  const stageSent = isOrgStage(sent.stage);
  const reasonSent = typeof sent.lost_reason === "string";
  if (!stageSent && !reasonSent) return { ok: true, patch: {} };
  const stage = isOrgStage(sent.stage) ? sent.stage : before.stage;
  const reason = typeof sent.lost_reason === "string" ? sent.lost_reason : before.lost_reason;
  const problem = stageProblem(stage, reason);
  if (problem) return { ok: false, message: problem };
  return {
    ok: true,
    patch: {
      ...(stageSent ? stageStamps(before.stage, stage, today) : {}),
      // The reason belongs to Lost; anywhere else it would be stale.
      ...(stage === "lost" ? {} : { lost_reason: "" }),
    },
  };
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
  priority: OrgPriority | "";
  about: string;
  funding: string;
  why_fit: string;
  warm_path: string;
  signal_url: string;
  conflict: string;
  contact: { name: string; email: string; title: string; linkedin: string; x_handle: string } | null;
};

export type OrgImport =
  | { ok: true; orgs: ImportedOrg[]; skipped: number }
  | { ok: false; message: string };

/**
 * Header names as people write them, squeezed to letters and digits. The
 * export's own column names are among them, so an export reads back in.
 */
const HEADERS = {
  name: ["name", "company", "companyname", "organisation", "organization", "org", "account", "brand", "creator"],
  website: ["website", "url", "site", "domain", "link", "companywebsite", "web"],
  kind: ["kind", "type"],
  stage: ["stage", "status", "pipeline", "outreachstatus"],
  source: ["source", "from", "channel", "leadsource"],
  owner: ["owner", "assignee", "assignedto", "rep", "accountowner"],
  contactName: ["contactname", "contact", "person", "fullname", "pointofcontact", "poc", "firstname"],
  contactEmail: ["contactemail", "email", "emailaddress", "mail"],
  title: ["title", "contacttitle", "role", "jobtitle", "designation", "position"],
  linkedin: ["linkedin", "contactlinkedin", "linkedinurl"],
  x: ["x", "contactx", "twitter", "xhandle", "twitterhandle"],
  notes: ["notes", "note", "comments", "comment", "description"],
  priority: ["priority"],
  about: ["about", "category", "whattheydo", "industry", "sector"],
  funding: ["funding", "stagefunding", "fundingstage", "round", "lastround"],
  whyFit: ["whyfit", "whytheyfit", "whynow", "signal", "reason"],
  warmPath: ["warmpath", "wayin", "route", "intro"],
  signalUrl: ["signalurl", "sourcelink", "sourceurl", "signallink", "proof", "evidence"],
  conflict: ["conflict", "clientconflict", "conflicts"],
} as const;

/** Status words prospect sheets use that aren't the stage names here. */
const STAGE_WORDS: Record<string, OrgStage> = {
  notcontacted: "lead",
  new: "lead",
  intalks: "replied",
  talking: "replied",
  meeting: "call_booked",
};

/** "Med" and friends, squeezed. */
const PRIORITY_WORDS: Record<string, OrgPriority> = {
  med: "medium",
  mid: "medium",
  hi: "high",
  lo: "low",
  p1: "high",
  p2: "medium",
  p3: "low",
};

/** A web link as the forms keep it (https:// added when missing); "" when it isn't one. */
function linkFrom(text: string) {
  return /\s/.test(text) ? "" : (cleanUrl(text) ?? "");
}

/** "@handle" from "@handle", "handle" or an x.com / twitter.com profile link; "" otherwise. */
export function xHandleFrom(text: string) {
  const value = text.trim();
  const fromLink = value.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i);
  const handle = fromLink ? fromLink[1] : value.replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) && !/^(home|intent|share|search|i)$/i.test(handle) ? `@${handle}` : "";
}

/** A conflict cell: "None", "No" and dashes mean there isn't one. */
function conflictFrom(text: string) {
  return /^(none|no|n\/a|na|-+|—)$/i.test(text.trim()) ? "" : text.trim();
}

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
    linkedin: find(headers, HEADERS.linkedin),
    x: find(headers, HEADERS.x),
    notes: find(headers, HEADERS.notes),
    priority: find(headers, HEADERS.priority),
    about: find(headers, HEADERS.about),
    funding: find(headers, HEADERS.funding),
    whyFit: find(headers, HEADERS.whyFit),
    warmPath: find(headers, HEADERS.warmPath),
    signalUrl: find(headers, HEADERS.signalUrl),
    conflict: find(headers, HEADERS.conflict),
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
    const stageText = cell(row, at.stage, 40);
    const priorityText = cell(row, at.priority, 40);
    // Research sheets put the link behind the signal in "Source"; a link
    // there isn't how it started, so it goes with the signal.
    const sourceText = cell(row, at.source, 500);
    const sourceLink = /^https?:\/\//i.test(sourceText) ? linkFrom(sourceText) : "";
    orgs.push({
      name,
      website: domain ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : "",
      domain,
      kind: optionFrom(ORG_KINDS, cell(row, at.kind, 40), "client"),
      stage: STAGE_WORDS[squeeze(stageText)] ?? optionFrom(ORG_STAGES, stageText, "lead"),
      source: sourceLink ? "outbound" : optionFrom(ORG_SOURCES, sourceText, "outbound"),
      owner: EMAIL.test(owner) ? owner : "",
      notes: cell(row, at.notes, 5000),
      priority: PRIORITY_WORDS[squeeze(priorityText)] ?? optionFrom<OrgPriority | "">(ORG_PRIORITIES, priorityText, ""),
      about: cell(row, at.about, 140),
      funding: cell(row, at.funding, 140),
      why_fit: cell(row, at.whyFit, 1000),
      warm_path: cell(row, at.warmPath, 1000),
      signal_url: linkFrom(cell(row, at.signalUrl, 500)) || sourceLink,
      conflict: conflictFrom(cell(row, at.conflict, 140)),
      contact:
        contactName || contactEmail
          ? {
              name: contactName || contactEmail.split("@")[0],
              email: contactEmail,
              title: cell(row, at.title, 120),
              linkedin: linkFrom(cell(row, at.linkedin, 500)),
              x_handle: xHandleFrom(cell(row, at.x, 300)),
            }
          : null,
    });
  }
  if (!orgs.length) return { ok: false, message: "No rows with a name were found." };
  return { ok: true, orgs, skipped };
}

/* ----------------------------------------------------------------- lists */

type Sortable = Pick<Org, "follow_up_on" | "name"> & { priority?: string | null };

/** Follow-ups first (oldest date on top), then by priority (high first), then by name. */
export function byFollowUp(a: Sortable, b: Sortable) {
  return (
    (a.follow_up_on ?? "9999").localeCompare(b.follow_up_on ?? "9999") ||
    priorityRank(a.priority) - priorityRank(b.priority) ||
    a.name.localeCompare(b.name)
  );
}
