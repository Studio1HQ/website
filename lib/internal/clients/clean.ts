import { cleanEmail, isUuid } from "@/lib/internal/community/clean";
import {
  CADENCES,
  CLIENT_STATUSES,
  CONTENT_TYPES,
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
  DUE_RULES,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
  INVOICE_STATES,
  PARTNER_STATUSES,
  PARTNER_TYPES,
  PERSON_ROLES,
  SIZES,
  WAITS_ON,
  isDateKey,
  isMonthKey,
  isWeekKey,
  weekStart,
  type Option,
  type TemplateLine,
} from "@/lib/internal/clients/schema";

export { isUuid };

/**
 * Checks what someone typed into a client-work form and turns it into a row
 * for Supabase. Pure, so it's easy to test; every server action calls it
 * before writing. Links are http(s) only and may not carry a login or a
 * key; notes are plain text and are refused when they look like a pasted
 * password or API key.
 */

type Input = Record<string, unknown>;
export type CleanResult =
  { ok: true; row: Record<string, unknown> } | { ok: false; message: string };
type FieldResult =
  { ok: true; value: unknown } | { ok: false; message: string };

function raw(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return typeof value === "string" ? value : "";
}

function oneLine(value: unknown, max: number) {
  return raw(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function multiLine(value: unknown, max: number) {
  return raw(value).replace(/\r\n?/g, "\n").trim().slice(0, max);
}

/* ---------------------------------------------------------------- secrets */

/**
 * True when text looks like a credential someone pasted: API keys and
 * tokens with well-known shapes, private keys, or "password: …" lines.
 */
export function looksLikeSecret(text: string) {
  return [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\b(sk|pk|rk)[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9]{16,}/,
    // Keys with dashes or underscores inside (sk-ant-api03-…, sk-proj-…_…).
    /\b(sk|pk|rk)[-_](live|test|proj|ant)[-_][A-Za-z0-9_-]{20,}/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/,
    /\bxox[abposr]-[A-Za-z0-9-]{10,}/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bAIza[0-9A-Za-z_-]{30,}/,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    /\b(password|passwd|pwd|api[_ -]?key|secret|token)\s*[:=]\s*\S{6,}/i,
  ].some((pattern) => pattern.test(text));
}

const SECRET_MESSAGE =
  "That looks like a password or a key. Don't store those here: share them in a password manager.";

/**
 * Query or fragment parameters that carry a key or a signature: the name
 * itself, or one ending in it (access_token, client_secret, x-amz-signature).
 */
const SECRET_PARAMS =
  /(^|[_.-])(token|api[_-]?key|apikey|key|secret|password|passwd|pwd|sig|signature|credential|auth|jwt)$/i;

function decoded(text: string) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * An http(s) link, tidied; null for blank; undefined when it isn't a web
 * link or carries a login or a key (user:pass@, ?token=…).
 */
export function cleanUrl(value: unknown): string | null | undefined {
  const text = raw(value).trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    if (url.username || url.password) return undefined;
    // "#access_token=…" is how sign-in redirects hand over a token.
    const fragment = new URLSearchParams(url.hash.replace(/^#\/?\??/, ""));
    for (const key of [...url.searchParams.keys(), ...fragment.keys()])
      if (SECRET_PARAMS.test(key)) return undefined;
    const clean = url.toString();
    if (looksLikeSecret(clean) || looksLikeSecret(decoded(clean)))
      return undefined;
    return clean.length <= 1000 ? clean : undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ slugs */

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG.test(value);
}

/** "Acme Corp." → "acme-corp". "" when nothing usable is left. */
export function slugify(value: unknown) {
  return raw(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** The slug, with "-2", "-3"… when it's taken. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>) {
  const root = base || "client";
  if (!taken.has(root)) return root;
  for (let n = 2; n < 1000; n++) {
    const next = `${root}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/* ----------------------------------------------------------------- fields */

type Spec = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "date"
    | "week"
    | "month"
    | "int"
    | "url"
    | "email"
    | "person"
    | "uuid"
    | "bool"
    | "slug"
    | "count"
    | "urls";
  required?: boolean;
  max?: number;
  options?: readonly Option[];
  /** A select whose blank means "none" (saved as null). */
  nullable?: boolean;
  min?: number;
  /** Largest whole number. */
  top?: number;
};

/** "7,000" → 7000, "7k" → 7000, "1.2M" → 1200000; null when it isn't a count. */
export function parseCount(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*([km])?$/i.exec(
    text.replace(/[,_\s](?=\d)/g, "").trim(),
  );
  if (!match) return null;
  const scale =
    match[2]?.toLowerCase() === "m"
      ? 1_000_000
      : match[2]?.toLowerCase() === "k"
        ? 1000
        : 1;
  if (scale === 1 && match[1].includes(".")) return null;
  const number = Math.round(Number(match[1]) * scale);
  return Number.isSafeInteger(number) ? number : null;
}

function cleanField(spec: Spec, value: unknown): FieldResult {
  const bad = (message: string): FieldResult => ({ ok: false, message });
  switch (spec.type) {
    case "text": {
      const text = oneLine(value, spec.max ?? 200);
      return looksLikeSecret(text)
        ? bad(SECRET_MESSAGE)
        : { ok: true, value: text };
    }
    case "textarea": {
      const text = multiLine(value, spec.max ?? 5000);
      return looksLikeSecret(text)
        ? bad(SECRET_MESSAGE)
        : { ok: true, value: text };
    }
    case "select": {
      const text = raw(value).trim();
      // Blank: null for the columns that can be empty, else left as it is
      // (the table's default on a new row).
      if (!text) return { ok: true, value: spec.nullable ? null : undefined };
      return spec.options?.some((option) => option.value === text)
        ? { ok: true, value: text }
        : bad(`Pick a valid ${spec.label.toLowerCase()}.`);
    }
    case "date": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      return isDateKey(text)
        ? { ok: true, value: text }
        : bad(`${spec.label} isn't a valid date.`);
    }
    case "week": {
      // Any day of the week is taken and saved as its Monday.
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      return isDateKey(text)
        ? { ok: true, value: weekStart(text) }
        : bad(`${spec.label} isn't a valid date.`);
    }
    case "month": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      return isMonthKey(text)
        ? { ok: true, value: text }
        : bad(`${spec.label} isn't a valid month.`);
    }
    case "int": {
      const text = raw(value).replace(/[,\s]/g, "");
      if (!text) return { ok: true, value: null };
      const number = /^\d{1,6}$/.test(text) ? Number(text) : Number.NaN;
      const min = spec.min ?? 0;
      const top = spec.top ?? 999;
      return Number.isInteger(number) && number >= min && number <= top
        ? { ok: true, value: number }
        : bad(`${spec.label} needs a whole number from ${min} to ${top}.`);
    }
    case "url": {
      const url = cleanUrl(value);
      return url === undefined
        ? bad(
            `${spec.label} needs a web link (https://…) without a login or key in it.`,
          )
        : { ok: true, value: url };
    }
    case "email": {
      const email = cleanEmail(value);
      return email === undefined
        ? bad(`${spec.label} isn't a valid email address.`)
        : { ok: true, value: email };
    }
    case "person": {
      // Owners and reviewers are dashboard people, by email.
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      const email = cleanEmail(text);
      return email
        ? { ok: true, value: email }
        : bad(`Pick a person for ${spec.label.toLowerCase()}.`);
    }
    case "uuid": {
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      return isUuid(text)
        ? { ok: true, value: text.toLowerCase() }
        : bad(`Pick a valid ${spec.label.toLowerCase()}.`);
    }
    case "bool":
      return {
        ok: true,
        value:
          value === true || value === "true" || value === "on" || value === "1",
      };
    case "count": {
      // Views and the like: "7000", "7,000", "7k", "1.2M".
      const text = raw(value).trim();
      if (!text) return { ok: true, value: null };
      const number = parseCount(text);
      const top = spec.top ?? 1_000_000_000;
      return number !== null && number <= top
        ? { ok: true, value: number }
        : bad(`${spec.label} needs a number, like 7000 or 7k.`);
    }
    case "urls": {
      // A list (or one per line), each a clean web link; blanks dropped.
      const list = (
        Array.isArray(value) ? value : raw(value).split(/[\s,]+/)
      ).filter((entry) => !blank(entry));
      const max = spec.max ?? 10;
      if (list.length > max) return bad(`${spec.label}: at most ${max} links.`);
      const urls: string[] = [];
      for (const entry of list) {
        const url = cleanUrl(entry);
        if (!url)
          return bad(
            `${spec.label} needs web links (https://…) without a login or key in them.`,
          );
        if (!urls.includes(url)) urls.push(url);
      }
      return { ok: true, value: urls };
    }
    case "slug": {
      const text = raw(value).trim().toLowerCase();
      if (!text) return { ok: true, value: null };
      return isSlug(text)
        ? { ok: true, value: text }
        : bad(
            "The short name can only have lowercase letters, numbers and dashes.",
          );
    }
  }
}

function blank(value: unknown) {
  return value === null || value === undefined || value === "";
}

/**
 * The row to write. "create" needs the required fields; "update" changes
 * only the fields it's given.
 */
function cleanWith(
  specs: readonly Spec[],
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const row: Record<string, unknown> = {};
  for (const spec of specs) {
    const given = Object.prototype.hasOwnProperty.call(input, spec.key);
    if (!given) {
      if (mode === "create" && spec.required)
        return { ok: false, message: `${spec.label} is needed.` };
      continue;
    }
    const result = cleanField(spec, input[spec.key]);
    if (!result.ok) return result;
    if (spec.required && blank(result.value))
      return { ok: false, message: `${spec.label} is needed.` };
    if (result.value === undefined) continue;
    row[spec.key] = result.value;
  }
  return { ok: true, row };
}

/** Text columns that are "not null default ''": a blank saves as "". */
function noNullText(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) if (key in row && row[key] === null) row[key] = "";
  return row;
}

/* ---------------------------------------------------------------- clients */

const CLIENT_SPECS: Spec[] = [
  { key: "name", label: "Name", type: "text", required: true, max: 120 },
  { key: "slug", label: "Short name", type: "slug" },
  { key: "status", label: "Status", type: "select", options: CLIENT_STATUSES },
  { key: "contact_name", label: "Primary contact", type: "text", max: 120 },
  { key: "contact_email", label: "Contact email", type: "email" },
  { key: "slack_channel_id", label: "Slack channel", type: "text", max: 80 },
  { key: "website", label: "Website", type: "url" },
  { key: "started_on", label: "Start date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", max: 5000 },
];

export function cleanClient(
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const result = cleanWith(CLIENT_SPECS, input, mode);
  if (!result.ok) return result;
  const row = noNullText(result.row, [
    "contact_name",
    "slack_channel_id",
    "notes",
  ]);
  if (mode === "create" && !row.slug) {
    const slug = slugify(row.name);
    if (!slug)
      return {
        ok: false,
        message: "Give the client a short name with letters or numbers.",
      };
    row.slug = slug;
  }
  if (mode === "update" && "slug" in row && !row.slug) delete row.slug;
  return { ok: true, row };
}

/* ------------------------------------------------------------ engagements */

const ENGAGEMENT_SPECS: Spec[] = [
  { key: "client_id", label: "Client", type: "uuid", required: true },
  { key: "name", label: "Name", type: "text", required: true, max: 120 },
  {
    key: "type",
    label: "Type",
    type: "select",
    options: ENGAGEMENT_TYPES,
    required: true,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ENGAGEMENT_STATUSES,
  },
  { key: "owner", label: "Account owner", type: "person" },
  { key: "starts_on", label: "Start date", type: "date" },
  { key: "ends_on", label: "End date", type: "date" },
  { key: "cadence", label: "Cadence", type: "select", options: CADENCES },
  { key: "client_tracker_url", label: "Client tracker link", type: "url" },
  { key: "contract_url", label: "Contract link", type: "url" },
  { key: "notes", label: "Notes", type: "textarea", max: 5000 },
];

export function cleanEngagement(
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const specs =
    mode === "update"
      ? ENGAGEMENT_SPECS.filter((spec) => spec.key !== "client_id")
      : ENGAGEMENT_SPECS;
  const result = cleanWith(specs, input, mode);
  if (!result.ok) return result;
  const row = noNullText(result.row, ["notes"]);
  if (
    isDateKey(row.starts_on) &&
    isDateKey(row.ends_on) &&
    row.ends_on < row.starts_on
  )
    return { ok: false, message: "It can't end before it starts." };
  return { ok: true, row };
}

/* ----------------------------------------------------------------- cycles */

/** The agreed scope and the retro note. */
export function cleanCycleNotes(input: Input): CleanResult {
  const result = cleanWith(
    [
      { key: "scope_note", label: "Agreed scope", type: "textarea", max: 5000 },
      { key: "retro_note", label: "Retro", type: "textarea", max: 5000 },
    ],
    input,
    "update",
  );
  if (!result.ok) return result;
  return {
    ok: true,
    row: noNullText(result.row, ["scope_note", "retro_note"]),
  };
}

/** The invoice flag and the link to the invoice tool. No amounts. */
export function cleanInvoice(input: Input): CleanResult {
  return cleanWith(
    [
      {
        key: "invoice_state",
        label: "Invoice",
        type: "select",
        options: INVOICE_STATES,
        required: true,
      },
      { key: "invoice_url", label: "Invoice link", type: "url" },
    ],
    input,
    "update",
  );
}

/* ------------------------------------------------------------ scope lines */

const SCOPE_LINE_SPECS: Spec[] = [
  { key: "cycle_id", label: "Month", type: "uuid", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    options: DELIVERABLE_KINDS,
    required: true,
  },
  { key: "label", label: "Name", type: "text", max: 80 },
  { key: "planned", label: "Planned", type: "int", required: true, top: 999 },
  {
    key: "owner_role",
    label: "Usual owner",
    type: "select",
    options: PERSON_ROLES,
    nullable: true,
  },
  {
    key: "due_rule",
    label: "When due",
    type: "select",
    options: DUE_RULES,
    nullable: true,
  },
  { key: "position", label: "Order", type: "int", top: 999 },
  { key: "notes", label: "Notes", type: "textarea", max: 2000 },
];

export function cleanScopeLine(
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const specs =
    mode === "update"
      ? SCOPE_LINE_SPECS.filter((spec) => spec.key !== "cycle_id")
      : SCOPE_LINE_SPECS;
  const result = cleanWith(specs, input, mode);
  if (!result.ok) return result;
  const row = noNullText(result.row, ["label", "notes"]);
  if ("position" in row && row.position === null) row.position = 0;
  return { ok: true, row };
}

/* ----------------------------------------------------------- deliverables */

const DELIVERABLE_SPECS: Spec[] = [
  { key: "cycle_id", label: "Month", type: "uuid", required: true },
  { key: "scope_line_id", label: "Scope line", type: "uuid" },
  { key: "title", label: "Title", type: "text", required: true, max: 200 },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    options: DELIVERABLE_KINDS,
    required: true,
  },
  { key: "owner", label: "Owner", type: "person" },
  { key: "reviewer", label: "Reviewer", type: "person" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: DELIVERABLE_STATUSES,
  },
  { key: "week", label: "Week", type: "week" },
  { key: "due_on", label: "Due date", type: "date" },
  { key: "client_due_on", label: "Client reply by", type: "date" },
  { key: "size", label: "Size", type: "select", options: SIZES },
  { key: "draft_url", label: "Draft link", type: "url" },
  { key: "review_url", label: "Review link", type: "url" },
  { key: "pr_url", label: "Pull request link", type: "url" },
  { key: "published_url", label: "Published link", type: "url" },
  { key: "notes", label: "Notes", type: "textarea", max: 5000 },
  // From the DevRel tracker migration (saveDeliverable drops them until then).
  {
    key: "content_type",
    label: "Type",
    type: "select",
    options: CONTENT_TYPES,
    nullable: true,
  },
  { key: "views", label: "Views", type: "count" },
  { key: "extra_urls", label: "More live links", type: "urls", max: 10 },
  // Not a column: the day it went live, for work logged after the fact.
  { key: "published_on", label: "Went live on", type: "date" },
];

/** Deliverable fields that need the DevRel tracker migration. */
export const DEVREL_FIELDS = ["content_type", "views", "extra_urls"] as const;

/**
 * A deliverable's fields. The status only ever comes in on create (it
 * starts as Planned unless said otherwise); later changes go through
 * moveDeliverable so they're checked and logged. Blocking goes through
 * setBlocked.
 */
export function cleanDeliverable(
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const specs =
    mode === "update"
      ? DELIVERABLE_SPECS.filter(
          (spec) => spec.key !== "cycle_id" && spec.key !== "status",
        )
      : DELIVERABLE_SPECS;
  const result = cleanWith(specs, input, mode);
  if (!result.ok) return result;
  const row = noNullText(result.row, ["notes"]);
  if (mode === "create") {
    if (!row.status) row.status = "planned";
    if (!row.size) row.size = "M";
    if (row.status === "published" && !row.published_url)
      return {
        ok: false,
        message: "Add the published link, or start it at an earlier status.",
      };
    if (row.status === "client_review" && !row.client_due_on)
      return { ok: false, message: "Set the date the client should reply by." };
  }
  if ("size" in row && row.size === null) delete row.size;
  return { ok: true, row };
}

/** A status move: where to, plus what the move may need. */
export function cleanMove(input: Input):
  | {
      ok: true;
      to: (typeof DELIVERABLE_STATUSES)[number]["value"];
      published_url?: string | null;
      client_due_on?: string | null;
      /** Published: the day it went live, when that wasn't today. */
      published_on?: string | null;
      comment: string;
    }
  | { ok: false; message: string } {
  const to = raw(input.to).trim();
  const status = DELIVERABLE_STATUSES.find((option) => option.value === to);
  if (!status) return { ok: false, message: "Pick a valid status." };
  const result = cleanWith(
    [
      { key: "published_url", label: "Published link", type: "url" },
      { key: "client_due_on", label: "Client reply by", type: "date" },
      { key: "published_on", label: "Went live on", type: "date" },
      { key: "comment", label: "Comment", type: "textarea", max: 1000 },
    ],
    input,
    "update",
  );
  if (!result.ok) return result;
  const row = result.row;
  return {
    ok: true,
    to: status.value,
    ...(typeof row.published_url === "string"
      ? { published_url: row.published_url }
      : {}),
    ...(typeof row.client_due_on === "string"
      ? { client_due_on: row.client_due_on }
      : {}),
    ...(typeof row.published_on === "string"
      ? { published_on: row.published_on }
      : {}),
    comment: typeof row.comment === "string" ? row.comment : "",
  };
}

/** Blocking: the reason and who it waits on, both needed. */
export function cleanBlock(
  input: Input,
):
  | { ok: true; reason: string; waits_on: (typeof WAITS_ON)[number]["value"] }
  | { ok: false; message: string } {
  const reason = oneLine(input.reason, 300);
  if (!reason) return { ok: false, message: "Say what it's waiting for." };
  if (looksLikeSecret(reason)) return { ok: false, message: SECRET_MESSAGE };
  const waits = WAITS_ON.find(
    (option) => option.value === raw(input.waits_on).trim(),
  );
  if (!waits) return { ok: false, message: "Pick who it's waiting on." };
  return { ok: true, reason, waits_on: waits.value };
}

/* -------------------------------------------------------------- templates */

/** A template's lines: up to 20, each with a known kind. */
export function cleanTemplateLines(
  value: unknown,
): { ok: true; lines: TemplateLine[] } | { ok: false; message: string } {
  if (!Array.isArray(value))
    return { ok: false, message: "The template needs a list of lines." };
  if (value.length > 20)
    return { ok: false, message: "A template can have up to 20 lines." };
  const lines: TemplateLine[] = [];
  for (const item of value) {
    const input =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Input)
        : {};
    const result = cleanWith(
      [
        {
          key: "kind",
          label: "Kind",
          type: "select",
          options: DELIVERABLE_KINDS,
          required: true,
        },
        { key: "label", label: "Name", type: "text", max: 80 },
        { key: "quantity", label: "Quantity", type: "int", top: 999 },
        {
          key: "owner_role",
          label: "Usual owner",
          type: "select",
          options: PERSON_ROLES,
          nullable: true,
        },
        {
          key: "due_rule",
          label: "When due",
          type: "select",
          options: DUE_RULES,
          nullable: true,
        },
      ],
      input,
      "create",
    );
    if (!result.ok) return result;
    const row = result.row;
    lines.push({
      kind: row.kind as TemplateLine["kind"],
      label: typeof row.label === "string" ? row.label : "",
      quantity: typeof row.quantity === "number" ? row.quantity : 0,
      owner_role: (row.owner_role as TemplateLine["owner_role"]) ?? null,
      due_rule: (row.due_rule as TemplateLine["due_rule"]) ?? "none",
    });
  }
  return { ok: true, lines };
}

/* ----------------------------------------------------------------- people */

export function cleanPerson(input: Input): CleanResult {
  const result = cleanWith(
    [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "name", label: "Name", type: "text", max: 80 },
      {
        key: "role",
        label: "Role",
        type: "select",
        options: PERSON_ROLES,
        required: true,
      },
      {
        key: "weekly_capacity",
        label: "Weekly capacity",
        type: "int",
        required: true,
        top: 100,
      },
      { key: "slack_user_id", label: "Slack user id", type: "text", max: 40 },
      { key: "active", label: "Active", type: "bool" },
    ],
    input,
    "create",
  );
  if (!result.ok) return result;
  const row = noNullText(result.row, ["name", "slack_user_id"]);
  if (
    typeof row.slack_user_id === "string" &&
    row.slack_user_id &&
    !/^[UW][A-Z0-9]{2,30}$/.test(row.slack_user_id)
  )
    return { ok: false, message: "A Slack user id looks like U012AB3CD." };
  if (!("active" in input)) row.active = true;
  return { ok: true, row };
}

/** "2026-11" for a month, or null. */
export function cleanMonth(value: unknown) {
  return isMonthKey(value) ? value : null;
}

/** A week key (the Monday) from any day in it, or null. */
export function cleanWeek(value: unknown) {
  if (!isDateKey(value)) return null;
  const week = weekStart(value);
  return isWeekKey(week) ? week : null;
}

/* --------------------------------------------------------- DevRel tracker */

const MILESTONE_SPECS: Spec[] = [
  { key: "engagement_id", label: "Engagement", type: "uuid", required: true },
  { key: "happened_on", label: "Date", type: "date", required: true },
  {
    key: "title",
    label: "What happened",
    type: "text",
    required: true,
    max: 200,
  },
  { key: "metric", label: "What's counted", type: "text", max: 60 },
  { key: "value", label: "Number", type: "count" },
  { key: "url", label: "Link", type: "url" },
  { key: "notes", label: "Notes", type: "textarea", max: 2000 },
];

/** A milestone. The engagement is fixed once it exists. */
export function cleanMilestone(
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const specs =
    mode === "update"
      ? MILESTONE_SPECS.filter((spec) => spec.key !== "engagement_id")
      : MILESTONE_SPECS;
  const result = cleanWith(specs, input, mode);
  if (!result.ok) return result;
  const row = noNullText(result.row, ["title", "metric", "notes"]);
  if ("title" in row && !row.title)
    return { ok: false, message: "Say what happened." };
  if (
    row.value !== null &&
    row.value !== undefined &&
    !row.metric &&
    mode === "create"
  )
    return {
      ok: false,
      message: "Say what the number counts, like GitHub stars.",
    };
  return { ok: true, row };
}

const PARTNER_SPECS: Spec[] = [
  { key: "engagement_id", label: "Engagement", type: "uuid", required: true },
  { key: "name", label: "Company", type: "text", required: true, max: 120 },
  { key: "website", label: "Website", type: "url" },
  { key: "type", label: "Type", type: "select", options: PARTNER_TYPES },
  { key: "status", label: "Status", type: "select", options: PARTNER_STATUSES },
  { key: "owner", label: "Who runs it", type: "person" },
  { key: "notes", label: "Why them", type: "textarea", max: 2000 },
  { key: "pitch", label: "The pitch", type: "textarea", max: 3000 },
  { key: "latest", label: "Latest step", type: "textarea", max: 1000 },
  { key: "client_input", label: "Client's input", type: "textarea", max: 2000 },
  { key: "follow_up_on", label: "Follow up on", type: "date" },
];

/** A partner (Co-GTM outreach). The engagement is fixed once it exists. */
export function cleanPartner(
  input: Input,
  mode: "create" | "update",
): CleanResult {
  const specs =
    mode === "update"
      ? PARTNER_SPECS.filter((spec) => spec.key !== "engagement_id")
      : PARTNER_SPECS;
  const result = cleanWith(specs, input, mode);
  if (!result.ok) return result;
  const row = noNullText(result.row, [
    "notes",
    "pitch",
    "latest",
    "client_input",
  ]);
  if ("name" in row && !row.name)
    return { ok: false, message: "Add the company's name." };
  return { ok: true, row };
}

/**
 * When something went live: the day given (noon IST, so it stays that day
 * in India and the US), or now. A day in the future isn't allowed.
 */
export function liveAt(day: unknown, today: string, now = new Date()) {
  if (typeof day !== "string" || !day)
    return { ok: true as const, at: now.toISOString() };
  if (day > today)
    return {
      ok: false as const,
      message: "It can't have gone live after today.",
    };
  return { ok: true as const, at: `${day}T06:30:00.000Z` };
}
