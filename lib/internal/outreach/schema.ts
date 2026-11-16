import type { FieldDef, Option, Tone } from "@/lib/internal/community/schema";

/**
 * Outreach: the companies and people Studio1 is talking to about working
 * together, before they are clients. Record types, their fields and option
 * lists. Plain data, safe for client components; the server checks input
 * against the same field lists.
 *
 * Tables: supabase/migrations/20261117100000_outreach.sql.
 * Dates are "YYYY-MM-DD" strings in IST, where the team works.
 *
 * Sponsors and campus partners stay in Community: they hang off events,
 * sponsorships and the budget. This is for client prospects, influencers
 * and other partners.
 */

function options<T extends string>(
  list: readonly (readonly [T, string, Tone?])[],
): readonly (Option & { value: T })[] {
  return list.map(([value, label, tone]) => ({ value, label, tone }));
}

export const ORG_KINDS = options([
  ["client", "Client prospect", "orange"],
  ["influencer", "Influencer", "violet"],
  ["partner", "Partner", "sky"],
  ["other", "Other", "stone"],
] as const);
export type OrgKind = (typeof ORG_KINDS)[number]["value"];

/** The pipeline, in board order; the last three are where it ends. */
export const ORG_STAGES = options([
  ["lead", "Lead", "stone"],
  ["contacted", "Contacted", "sky"],
  ["replied", "Replied", "violet"],
  ["call_booked", "Call booked", "orange"],
  ["proposal", "Proposal sent", "amber"],
  ["won", "Won", "emerald"],
  ["lost", "Lost", "rose"],
  ["not_now", "Not now", "stone"],
] as const);
export type OrgStage = (typeof ORG_STAGES)[number]["value"];

/** Still in play: these are the board's columns and count as "open". */
export const OPEN_STAGES: readonly OrgStage[] = [
  "lead",
  "contacted",
  "replied",
  "call_booked",
  "proposal",
];

export const ORG_SOURCES = options([
  ["outbound", "We reached out"],
  ["inbound_call", "They booked a call"],
  ["inbound_email", "They emailed us"],
  ["referral", "Referral"],
  ["event", "Met at an event"],
  ["social", "X or LinkedIn"],
  ["other", "Other"],
] as const);

export const ACTIVITY_KINDS = options([
  ["email", "Email"],
  ["dm", "DM"],
  ["call", "Call"],
  ["meeting", "Meeting"],
  ["proposal", "Proposal"],
  ["note", "Note"],
] as const);
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]["value"];

export const DIRECTIONS = options([
  ["out", "From us"],
  ["in", "From them"],
] as const);
export type Direction = (typeof DIRECTIONS)[number]["value"];

/* ---------------------------------------------------------------- fields */

/** The organisation form. `owner` is a select of admins (see the dialog). */
export const ORG_FIELDS: readonly FieldDef[] = [
  {
    key: "name",
    label: "Name",
    type: "text",
    required: true,
    max: 140,
    wide: true,
    placeholder: "Acme Cloud",
  },
  { key: "website", label: "Website", type: "url", placeholder: "https://acme.dev" },
  { key: "kind", label: "Kind", type: "select", options: ORG_KINDS },
  { key: "stage", label: "Stage", type: "select", options: ORG_STAGES },
  { key: "source", label: "How it started", type: "select", options: ORG_SOURCES },
  { key: "owner", label: "Owner", type: "owner" },
  {
    key: "interest",
    label: "Interested in",
    type: "text",
    max: 200,
    placeholder: "Blogs, a launch, DevRel",
    suggestions: ["Blog as a service", "DevRel as a service", "Launch", "Video", "Docs audit", "Influencer campaign"],
  },
  {
    key: "next_step",
    label: "Next step",
    type: "text",
    max: 200,
    wide: true,
    placeholder: "Send the proposal after Thursday's call",
  },
  { key: "follow_up_on", label: "Follow up on", type: "date" },
  { key: "est_value", label: "Rough value a month", type: "money", placeholder: "3000" },
  { key: "currency", label: "Currency", type: "currency" },
  {
    key: "lost_reason",
    label: "Why it was lost",
    type: "text",
    max: 300,
    wide: true,
    showIf: { key: "stage", values: ["lost"] },
    placeholder: "Went with an in-house hire",
  },
  { key: "tags", label: "Tags", type: "tags", placeholder: "Comma separated", wide: true },
  { key: "notes", label: "Notes", type: "textarea", max: 5000, wide: true },
];

export const CONTACT_FIELDS: readonly FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true, max: 120 },
  { key: "title", label: "Role", type: "text", max: 120, placeholder: "Head of DevRel" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "text", max: 40 },
  { key: "linkedin", label: "LinkedIn", type: "url", placeholder: "https://linkedin.com/in/…" },
  { key: "x_handle", label: "X handle", type: "text", max: 40, placeholder: "@handle" },
  { key: "is_primary", label: "Main contact", type: "bool" },
  {
    key: "do_not_contact",
    label: "Asked not to be contacted",
    type: "bool",
    help: "Hides the email link and flags them on the page.",
  },
  { key: "notes", label: "Notes", type: "textarea", max: 2000, wide: true },
];

/* ----------------------------------------------------------------- types */

type Stamps = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type Org = Stamps & {
  name: string;
  website: string | null;
  domain: string | null;
  kind: OrgKind;
  stage: OrgStage;
  source: string;
  owner: string | null;
  next_step: string;
  follow_up_on: string | null;
  last_contact_on: string | null;
  interest: string;
  est_value: number | null;
  currency: string;
  lost_reason: string;
  /** The day it was won, lost or parked; null while it's in play. */
  closed_on: string | null;
  tags: string[];
  notes: string;
  client_id: string | null;
};

export type OrgContact = Stamps & {
  org_id: string;
  name: string;
  title: string;
  email: string | null;
  linkedin: string | null;
  x_handle: string;
  phone: string | null;
  is_primary: boolean;
  do_not_contact: boolean;
  notes: string;
};

export type OrgActivity = Stamps & {
  org_id: string;
  contact_id: string | null;
  kind: ActivityKind;
  direction: Direction;
  summary: string;
  happened_on: string;
};

export type OutreachResult =
  | {
      ok: true;
      message?: string;
      id?: string;
      /** A new client's short name, for opening its page. */
      slug?: string;
      /** The main change was saved, but a follow-on step wasn't. */
      warning?: string;
    }
  | { ok: false; message: string };

export const OUTREACH_MIGRATION_HINT =
  "Outreach needs its tables first: run supabase/migrations/20261117100000_outreach.sql in the Supabase SQL editor, then reload.";

export function isOrgStage(value: unknown): value is OrgStage {
  return ORG_STAGES.some((stage) => stage.value === value);
}

export function isOrgKind(value: unknown): value is OrgKind {
  return ORG_KINDS.some((kind) => kind.value === value);
}
