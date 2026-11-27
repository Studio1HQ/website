/**
 * Inbound: leads that book a call or email Studio1, and the design agent
 * that works on them. Types, constant lists and row mappers. Plain data,
 * safe for client components.
 *
 * Tables: supabase/migrations/20261127100000_agent_inbound.sql. A lead is a
 * row of outreach_orgs whose source is inbound_call or inbound_email; the
 * agent's work is queued as agent_events and its files are agent_files.
 *
 * Money (est_value, currency) is never part of these types: the founders
 * see deal values on Outreach, and nothing here reads them.
 */

export const INBOUND_SOURCES = ["inbound_call", "inbound_email"] as const;
export type InboundSource = (typeof INBOUND_SOURCES)[number];

/** The stages an inbound lead moves through, in order (the Outreach stages). */
export const INBOUND_STAGES = [
  "lead",
  "replied",
  "call_booked",
  "proposal",
  "won",
  "lost",
] as const;
export type InboundStage = (typeof INBOUND_STAGES)[number];

/** What a person (or the webhook, or the sorter) can ask the agent to do. */
export const EVENT_KINDS = [
  "lead_created",
  "call_notes_added",
  "founder_answers",
  "proposal_sent",
  "reply_received",
  "won",
  "lost",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_STATUSES = [
  "queued",
  "running",
  "done",
  "failed",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** The keys an event's payload may carry. */
export const PAYLOAD_KEYS = [
  "message",
  "notes",
  "answers",
  "contact_name",
  "contact_role",
  "call_at",
  "reason",
  "source",
] as const;
export type PayloadKey = (typeof PAYLOAD_KEYS)[number];
export type EventPayload = Partial<Record<PayloadKey, string>>;

export const FILE_KINDS = [
  "brief",
  "deck_pdf",
  "deck_pptx",
  "outline",
  "other",
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const MAIL_STATUSES = ["new", "sorting", "sorted", "failed"] as const;
export type MailStatus = (typeof MAIL_STATUSES)[number];

/**
 * The labels the sorter puts on mail. The column accepts any text, so a new
 * label from the worker shows as it is; these are the ones the pages name.
 */
export const MAIL_LABELS = [
  { value: "lead", label: "Lead" },
  { value: "not_sure", label: "Not sure" },
  { value: "existing_lead", label: "Reply from a lead" },
  { value: "selling_to_us", label: "Selling to us" },
  { value: "job_ask", label: "Job or freelance ask" },
  { value: "partner_ask", label: "Partner or sponsor ask" },
  { value: "noise", label: "Notice or junk" },
  { value: "newsletter", label: "Newsletter" },
  { value: "auto_reply", label: "Auto-reply or bounce" },
  { value: "internal", label: "From Studio1" },
] as const;

/** Who decided a mail's label. */
export const MAIL_DECIDERS = ["rules", "model", "person"] as const;

/** The only headers kept from a received mail (lowercased keys). */
export const KEPT_HEADERS = [
  "auto-submitted",
  "precedence",
  "list-unsubscribe",
  "list-id",
  "return-path",
  "x-autoreply",
  "x-auto-response-suppress",
  "reply-to",
] as const;

/** The board's columns, in order. Lost is hidden unless asked for. */
export const BOARD_COLUMNS = [
  { key: "new", label: "New" },
  { key: "brief_ready", label: "Brief ready" },
  { key: "call_done", label: "Call done" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number]["key"];

/** The settings keys and what each holds. */
export type AgentSettings = {
  /** apply false: the sorter only labels mail and never creates a lead. */
  sorter: { apply: boolean };
  auto_start: { booking: boolean; mail: boolean };
  house_rules: { rules: string[] };
};
export type SettingKey = keyof AgentSettings;
export const SETTING_KEYS: readonly SettingKey[] = [
  "sorter",
  "auto_start",
  "house_rules",
];

export const DEFAULT_SETTINGS: AgentSettings = {
  sorter: { apply: false },
  auto_start: { booking: true, mail: false },
  house_rules: { rules: [] },
};

/* ------------------------------------------------------------------ rows */

/** A lead: an inbound organisation, with no money fields. */
export type LeadOrg = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  website: string | null;
  domain: string | null;
  stage: string;
  source: string;
  owner: string | null;
  next_step: string;
  interest: string;
  about: string;
  funding: string;
  why_fit: string;
  conflict: string;
  client_id: string | null;
};

/** The columns read for a lead: never est_value, currency or notes. */
export const LEAD_COLUMNS =
  "id,created_at,updated_at,name,website,domain,stage,source,owner,next_step,interest,about,funding,why_fit,conflict,client_id";

export type LeadContact = {
  id: string;
  org_id: string;
  name: string;
  title: string;
  email: string | null;
  is_primary: boolean;
};

export const CONTACT_COLUMNS = "id,org_id,name,title,email,is_primary";

export type AgentEvent = {
  id: string;
  created_at: string;
  created_by: string | null;
  org_id: string;
  kind: EventKind;
  payload: EventPayload;
  status: EventStatus;
  attempts: number;
  claimed_at: string | null;
  finished_at: string | null;
  error: string;
  report: string;
  done_items: string[];
  waiting_items: string[];
  next_items: string[];
};

export type AgentFile = {
  id: string;
  created_at: string;
  org_id: string;
  event_id: string | null;
  name: string;
  storage_path: string;
  content_type: string;
  bytes: number;
  kind: FileKind;
  /** The editable copy in Google Slides, when the worker uploaded one. */
  open_url: string | null;
  approved_to_send: boolean;
  approved_by: string | null;
  approved_at: string | null;
};

export type InboundMail = {
  id: string;
  received_at: string;
  message_id: string | null;
  from_address: string;
  from_name: string;
  subject: string;
  headers: Record<string, string>;
  /** Null once the worker has sorted the mail. */
  body_text: string | null;
  excerpt: string;
  status: MailStatus;
  label: string;
  decided_by: string;
  reason: string;
  confidence: number | null;
  held: boolean;
  org_id: string | null;
  correction: "" | "lead" | "not_lead";
  resolved_by: string | null;
  resolved_at: string | null;
};

/** One card on the board. */
export type LeadCard = {
  org: LeadOrg;
  column: BoardColumn;
  primaryContact: { name: string; email: string | null } | null;
  /** The newest event, for a status line; null when none. */
  latest: {
    kind: EventKind;
    status: EventStatus;
    created_at: string;
    /** What went wrong, for a failed event; empty otherwise. */
    error: string;
    /** How many things the agent says it is waiting on a person for. */
    waiting: number;
  } | null;
};

export type LeadDetail = {
  org: LeadOrg;
  column: BoardColumn;
  /** The stable thread id the agent keeps this lead's work under. */
  threadId: string;
  contacts: LeadContact[];
  /** Newest first. */
  events: AgentEvent[];
  files: AgentFile[];
};

/* --------------------------------------------------------------- mappers */

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function oneOf<T extends string>(
  options: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback;
}

export function toLeadOrg(row: Record<string, unknown>): LeadOrg {
  return {
    id: text(row.id),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    name: text(row.name),
    website: textOrNull(row.website),
    domain: textOrNull(row.domain),
    stage: text(row.stage),
    source: text(row.source),
    owner: textOrNull(row.owner),
    next_step: text(row.next_step),
    interest: text(row.interest),
    about: text(row.about),
    funding: text(row.funding),
    why_fit: text(row.why_fit),
    conflict: text(row.conflict),
    client_id: textOrNull(row.client_id),
  };
}

export function toLeadContact(row: Record<string, unknown>): LeadContact {
  return {
    id: text(row.id),
    org_id: text(row.org_id),
    name: text(row.name),
    title: text(row.title),
    email: textOrNull(row.email),
    is_primary: row.is_primary === true,
  };
}

export function toAgentEvent(row: Record<string, unknown>): AgentEvent {
  const payload: EventPayload = {};
  if (
    row.payload &&
    typeof row.payload === "object" &&
    !Array.isArray(row.payload)
  ) {
    for (const key of PAYLOAD_KEYS) {
      const value = (row.payload as Record<string, unknown>)[key];
      if (typeof value === "string") payload[key] = value;
    }
  }
  return {
    id: text(row.id),
    created_at: text(row.created_at),
    created_by: textOrNull(row.created_by),
    org_id: text(row.org_id),
    kind: oneOf(EVENT_KINDS, row.kind, "lead_created"),
    payload,
    status: oneOf(EVENT_STATUSES, row.status, "queued"),
    attempts: Number(row.attempts) || 0,
    claimed_at: textOrNull(row.claimed_at),
    finished_at: textOrNull(row.finished_at),
    error: text(row.error),
    report: text(row.report),
    done_items: list(row.done_items),
    waiting_items: list(row.waiting_items),
    next_items: list(row.next_items),
  };
}

/**
 * A link to one Google Slides deck, in the one shape the worker builds
 * (https://docs.google.com/presentation/d/<file id>/edit), and nothing else.
 * docs.google.com also serves forms and published pages anyone can make, so
 * the host alone is not enough. The column is written by the worker, so the
 * page checks it again before making it a link. Null before the column
 * exists, too.
 */
const SLIDES_URL =
  /^https:\/\/docs\.google\.com\/presentation\/d\/[A-Za-z0-9_-]{10,100}\/edit$/;

export function slidesUrl(value: unknown): string | null {
  return typeof value === "string" && SLIDES_URL.test(value) ? value : null;
}

export function toAgentFile(row: Record<string, unknown>): AgentFile {
  return {
    id: text(row.id),
    created_at: text(row.created_at),
    org_id: text(row.org_id),
    event_id: textOrNull(row.event_id),
    name: text(row.name),
    storage_path: text(row.storage_path),
    content_type: text(row.content_type),
    // Postgres sends bigint as a number or text, by size.
    bytes: Number(row.bytes) || 0,
    kind: oneOf(FILE_KINDS, row.kind, "other"),
    open_url: slidesUrl(row.open_url),
    approved_to_send: row.approved_to_send === true,
    approved_by: textOrNull(row.approved_by),
    approved_at: textOrNull(row.approved_at),
  };
}

export function toInboundMail(row: Record<string, unknown>): InboundMail {
  const headers: Record<string, string> = {};
  if (
    row.headers &&
    typeof row.headers === "object" &&
    !Array.isArray(row.headers)
  ) {
    for (const [key, value] of Object.entries(
      row.headers as Record<string, unknown>,
    )) {
      if (typeof value === "string") headers[key] = value;
    }
  }
  const confidence =
    row.confidence === null || row.confidence === undefined
      ? null
      : Number(row.confidence);
  return {
    id: text(row.id),
    received_at: text(row.received_at),
    message_id: textOrNull(row.message_id),
    from_address: text(row.from_address),
    from_name: text(row.from_name),
    subject: text(row.subject),
    headers,
    body_text: textOrNull(row.body_text),
    excerpt: text(row.excerpt),
    status: oneOf(MAIL_STATUSES, row.status, "new"),
    label: text(row.label),
    decided_by: text(row.decided_by),
    reason: text(row.reason),
    confidence:
      confidence !== null && Number.isFinite(confidence) ? confidence : null,
    held: row.held === true,
    org_id: textOrNull(row.org_id),
    correction:
      row.correction === "lead" || row.correction === "not_lead"
        ? row.correction
        : "",
    resolved_by: textOrNull(row.resolved_by),
    resolved_at: textOrNull(row.resolved_at),
  };
}

/** Settings rows (key, value) into one object; missing or odd values keep their defaults. */
export function toAgentSettings(
  rows: readonly Record<string, unknown>[],
): AgentSettings {
  const settings: AgentSettings = structuredClone(DEFAULT_SETTINGS);
  for (const row of rows) {
    const value = row.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const given = value as Record<string, unknown>;
    if (row.key === "sorter" && typeof given.apply === "boolean")
      settings.sorter.apply = given.apply;
    if (row.key === "auto_start") {
      if (typeof given.booking === "boolean")
        settings.auto_start.booking = given.booking;
      if (typeof given.mail === "boolean")
        settings.auto_start.mail = given.mail;
    }
    if (row.key === "house_rules")
      settings.house_rules.rules = list(given.rules);
  }
  return settings;
}

/** Shown when a page reads a table that isn't there yet. */
export const INBOUND_MIGRATION_HINT =
  "Inbound needs its tables first: run supabase/migrations/20261127100000_agent_inbound.sql in the Supabase SQL editor, then reload.";

/** What a write answers: the new row's id, or a message safe to show. */
export type InboundResult =
  { ok: true; id?: string; message?: string } | { ok: false; message: string };

/** What a read answers. */
export type InboundLoad<T> =
  { ok: true; value: T } | { ok: false; missing: boolean; message: string };
