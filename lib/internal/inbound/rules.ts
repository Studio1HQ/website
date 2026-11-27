import {
  BOARD_COLUMNS,
  EVENT_KINDS,
  INBOUND_SOURCES,
  INBOUND_STAGES,
  KEPT_HEADERS,
  SETTING_KEYS,
  type AgentEvent,
  type AgentSettings,
  type BoardColumn,
  type EventKind,
  type EventPayload,
  type SettingKey,
} from "@/lib/internal/inbound/schema";

/**
 * Inbound rules with no database in them: which leads count as inbound,
 * where a lead sits on the board, what a person may ask the agent to do
 * from each stage, the agent's thread id for a lead, who a mail address
 * belongs to, and how text from outside is cleaned and checked. Pure, so
 * they're tested (rules.test.ts) and pages, actions and webhooks agree.
 */

/* ----------------------------------------------------------------- stages */

export function isInboundSource(source: string | null | undefined) {
  return (INBOUND_SOURCES as readonly string[]).includes(source ?? "");
}

/** The stages an inbound lead can be in (the others, such as contacted or not now, aren't on this board). */
export function isInboundStage(stage: string | null | undefined) {
  return (INBOUND_STAGES as readonly string[]).includes(stage ?? "");
}

/** An organisation that belongs on the Inbound board. */
export function isInboundLead(org: {
  source: string | null | undefined;
  stage: string | null | undefined;
}) {
  return isInboundSource(org.source) && isInboundStage(org.stage);
}

/** Stages where a booking still moves the lead on to "call booked". */
const BOOKING_MOVES_FROM = [
  "lead",
  "contacted",
  "replied",
  "call_booked",
  "not_now",
];

/** Whether a new booking should set the stage to call booked (a proposal, a win or a loss stays). */
export function bookingMovesStage(stage: string | null | undefined) {
  return BOOKING_MOVES_FROM.includes(stage ?? "");
}

/* ------------------------------------------------------------------ board */

type LatestEvent = Pick<AgentEvent, "kind" | "status" | "created_at">;

/**
 * The board column for a lead. Won, lost and proposal follow the stage.
 * Before that the agent's latest step for the lead decides: notes or
 * answers from the founders mean the call is done; a finished first brief
 * means the brief is ready; anything else (nothing queued, still running,
 * failed or cancelled) is New. Replies and other events don't move it.
 * Null when the lead isn't an inbound stage at all.
 */
export function boardColumn(
  stage: string,
  events: readonly LatestEvent[],
): BoardColumn | null {
  if (!isInboundStage(stage)) return null;
  if (stage === "won") return "won";
  if (stage === "lost") return "lost";
  if (stage === "proposal") return "proposal";
  const steps = events
    .filter((event) =>
      ["lead_created", "call_notes_added", "founder_answers"].includes(
        event.kind,
      ),
    )
    .sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
    );
  const latest = steps[0];
  if (!latest) return "new";
  if (latest.kind === "call_notes_added" || latest.kind === "founder_answers")
    return "call_done";
  return latest.status === "done" ? "brief_ready" : "new";
}

/** The columns to show: Lost only when asked for. */
export function visibleColumns(showLost: boolean) {
  return BOARD_COLUMNS.filter((column) => showLost || column.key !== "lost");
}

/* ----------------------------------------------------------------- events */

const QUEUEABLE: Record<string, readonly EventKind[]> = {
  lead: ["lead_created", "reply_received", "lost"],
  replied: ["lead_created", "reply_received", "lost"],
  call_booked: [
    "lead_created",
    "call_notes_added",
    "founder_answers",
    "reply_received",
    "proposal_sent",
    "lost",
  ],
  proposal: [
    "call_notes_added",
    "founder_answers",
    "reply_received",
    "proposal_sent",
    "won",
    "lost",
  ],
  won: [],
  lost: [],
};

/** The events a person may queue for a lead at this stage. */
export function queueableEvents(stage: string): readonly EventKind[] {
  return QUEUEABLE[stage] ?? [];
}

export function canQueue(stage: string, kind: string) {
  return (queueableEvents(stage) as readonly string[]).includes(kind);
}

export function isEventKind(value: unknown): value is EventKind {
  return (EVENT_KINDS as readonly unknown[]).includes(value);
}

/** What queueing an event does to the organisation's stage: null leaves it. */
export function stageAfter(
  kind: EventKind,
): "proposal" | "won" | "lost" | null {
  if (kind === "proposal_sent") return "proposal";
  if (kind === "won") return "won";
  if (kind === "lost") return "lost";
  return null;
}

/* ----------------------------------------------------------------- thread */

/**
 * The agent's thread id for a lead: "lead-" and the name lowercased with
 * runs of anything but a-z and 0-9 turned into one hyphen (none at the
 * ends), cut to 40 characters, then "-" and the first 8 hex characters of
 * the organisation's id. The worker computes it the same way, so a lead is
 * renamed at the cost of a new thread: the name is part of the id.
 */
export function threadIdFor(org: { id: string; name: string }) {
  const slug = org.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  const short = org.id
    .toLowerCase()
    .replace(/[^0-9a-f]/g, "")
    .slice(0, 8);
  // The worker uses the same rule, including "lead" for a name with no letters or digits.
  return `lead-${slug || "lead"}-${short}`;
}

/* ---------------------------------------------------------------- domains */

/** Mailbox providers anyone can sign up to: an address there says nothing about a company. */
const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.in",
  "hotmail.com",
  "live.com",
  "live.in",
  "msn.com",
  "passport.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "protonmail.ch",
  "pm.me",
  "aol.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "web.de",
  "mail.com",
  "email.com",
  "zoho.com",
  "zohomail.in",
  "zohomail.com",
  "yandex.com",
  "yandex.ru",
  "ya.ru",
  "mail.ru",
  "bk.ru",
  "inbox.ru",
  "fastmail.com",
  "fastmail.fm",
  "hey.com",
  "tutanota.com",
  "tuta.io",
  "tutamail.com",
  "duck.com",
  "skiff.com",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "naver.com",
  "daum.net",
  "rediffmail.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "btinternet.com",
  "orange.fr",
  "free.fr",
  "laposte.net",
  "libero.it",
  "seznam.cz",
  "wp.pl",
  "o2.pl",
  "mailinator.com",
]);

/** Providers that sell the same mailbox under many country endings (yahoo.co.uk, hotmail.fr…). */
const FREE_MAIL_FAMILY =
  /^(yahoo|hotmail|outlook|live|gmail)\.[a-z]{2,3}(\.[a-z]{2})?$/;

export function isFreeMailDomain(domain: string) {
  const host = domain.toLowerCase();
  return FREE_MAIL.has(host) || FREE_MAIL_FAMILY.test(host);
}

/** A well-formed address, lowercased; null otherwise. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@<>(),;:"\\]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email)
    ? email
    : null;
}

/**
 * The company's domain behind an email address: "priya@acme.dev" →
 * "acme.dev". Null for a free-mail address (a gmail address never becomes
 * a company domain) or anything that isn't an address. A leading "www." is
 * dropped; other subdomains are kept.
 */
export function companyDomainFromEmail(value: unknown): string | null {
  const email = normalizeEmail(value);
  if (!email) return null;
  const host = email.slice(email.lastIndexOf("@") + 1).replace(/^www\./, "");
  return isFreeMailDomain(host) ? null : host;
}

/** A readable company name from a domain: "acme-cloud.dev" → "Acme Cloud". */
export function nameFromDomain(domain: string) {
  const label = domain.split(".")[0] ?? domain;
  return label
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------- outside text */

// Control characters except tab and newline, and the marks that reorder or hide text.
const UNSAFE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;

function cut(value: string, max: number) {
  if (value.length <= max) return value;
  const end = value.charCodeAt(max - 1);
  // Never leave half of a surrogate pair at the cut.
  return value.slice(0, end >= 0xd800 && end <= 0xdbff ? max - 1 : max);
}

/**
 * Text that came from outside (a booking form, an email), kept as plain
 * text: line breaks kept, control and direction-changing characters
 * removed, length capped. Anything that isn't text is "". It is stored and
 * shown as text only, never interpreted as markup, a link or a command.
 */
export function plainText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return cut(
    value
      .replace(/\r\n?/g, "\n")
      .replace(UNSAFE_CHARS, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    max,
  ).trim();
}

/** The same on one line: every run of white space becomes one space. */
export function oneLineText(value: unknown, max: number) {
  return cut(
    plainText(value, max * 4)
      .replace(/\s+/g, " ")
      .trim(),
    max,
  ).trim();
}

/** The first `max` characters of a mail, on one line, for lists. */
export function excerptOf(body: unknown, max = 300) {
  return oneLineText(body, max);
}

/* ----------------------------------------------------------------- headers */

/**
 * Only the header names the sorter uses (KEPT_HEADERS), lowercased, each
 * value one capped line. Authentication-Results is not kept at all: the
 * sender writes headers too, so no stored copy can prove who sent the mail
 * (sender_verified, from the receiving provider's own verdict, does). Takes a header object or the list of
 * { name, value } pairs a mail API may send.
 */
export function keptHeaders(source: unknown): Record<string, string> {
  const pairs: [string, unknown][] = [];
  if (Array.isArray(source)) {
    for (const item of source) {
      if (item && typeof item === "object") {
        const entry = item as {
          name?: unknown;
          key?: unknown;
          value?: unknown;
        };
        const name = typeof entry.name === "string" ? entry.name : entry.key;
        if (typeof name === "string") pairs.push([name, entry.value]);
      }
    }
  } else if (source && typeof source === "object") {
    pairs.push(...Object.entries(source as Record<string, unknown>));
  }
  const kept: Record<string, string> = {};
  for (const [name, raw] of pairs) {
    const key = name.trim().toLowerCase();
    if (!(KEPT_HEADERS as readonly string[]).includes(key) || key in kept)
      continue;
    // A header that comes several times keeps its first value, never a
    // join: a sender can add copies of a header, and a joined string would
    // hide which one came from where.
    const value = Array.isArray(raw)
      ? raw.find((part) => typeof part === "string")
      : raw;
    const line = oneLineText(value, 500);
    if (line) kept[key] = line;
  }
  return kept;
}

/** One header's value from a header object or a list of { name, value } pairs; case does not matter. */
export function headerValue(source: unknown, name: string): string {
  const wanted = name.toLowerCase();
  if (Array.isArray(source)) {
    for (const item of source) {
      if (item && typeof item === "object") {
        const entry = item as {
          name?: unknown;
          key?: unknown;
          value?: unknown;
        };
        const key = typeof entry.name === "string" ? entry.name : entry.key;
        if (
          typeof key === "string" &&
          key.toLowerCase() === wanted &&
          typeof entry.value === "string"
        )
          return entry.value;
      }
    }
    return "";
  }
  if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(
      source as Record<string, unknown>,
    )) {
      if (key.toLowerCase() === wanted && typeof value === "string")
        return value;
    }
  }
  return "";
}

/* ------------------------------------------------------------ received mail */

export type CleanMail = {
  messageId: string;
  fromAddress: string;
  fromName: string;
  subject: string;
  headers: Record<string, string>;
  bodyText: string;
  excerpt: string;
  /** True only for a real `true`: anything else is unverified. */
  senderVerified: boolean;
};

/** Mail bodies are kept to this many characters; the rest is cut. */
export const MAIL_BODY_MAX = 20_000;

/**
 * One received mail as it is stored. `fromAddress` has to be an address;
 * `messageId` is the Message-ID header, or a stand-in the caller makes from
 * the provider's own id, so a retried webhook lands on the same row.
 */
export function cleanMail(input: {
  messageId: unknown;
  fromAddress: unknown;
  fromName?: unknown;
  subject?: unknown;
  headers?: unknown;
  bodyText?: unknown;
  senderVerified?: unknown;
}): CleanMail | null {
  const fromAddress = normalizeEmail(input.fromAddress);
  const messageId = oneLineText(input.messageId, 300);
  if (!fromAddress || !messageId) return null;
  const bodyText = plainText(input.bodyText, MAIL_BODY_MAX);
  return {
    messageId,
    fromAddress,
    fromName: oneLineText(input.fromName, 120),
    subject: oneLineText(input.subject, 300),
    headers: keptHeaders(input.headers),
    bodyText,
    excerpt: excerptOf(bodyText),
    senderVerified: input.senderVerified === true,
  };
}

/** How long mail is kept, in days (the daily clean-up deletes older rows). */
export const MAIL_KEEP_DAYS = 15;

/** The instant before which mail is deleted. */
export function mailCutoff(now = new Date()) {
  return new Date(
    now.getTime() - MAIL_KEEP_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

/* ---------------------------------------------------------- payload checks */

export type PayloadResult =
  { ok: true; payload: EventPayload } | { ok: false; message: string };

const LIMITS = {
  message: 10_000,
  notes: 10_000,
  answers: 10_000,
  reason: 500,
  name: 120,
  source: 40,
} as const;

/** An ISO date or date and time; kept as written, or null. */
function isoWhen(value: unknown) {
  const text = oneLineText(value, 40);
  return /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(text) &&
    !Number.isNaN(Date.parse(text))
    ? text
    : null;
}

/**
 * Checks and cleans the payload for an event. Only the contract's keys are
 * kept, each as capped plain text; what the kind needs must be there.
 *   call_notes_added  notes
 *   founder_answers   answers
 *   reply_received    message
 *   lost              reason
 * The others need nothing, but keep what they are given.
 */
export function validatePayload(kind: unknown, input: unknown): PayloadResult {
  if (!isEventKind(kind))
    return {
      ok: false,
      message: "That isn't something the agent can be asked to do.",
    };
  const given =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const payload: EventPayload = {};
  const message = plainText(given.message, LIMITS.message);
  const notes = plainText(given.notes, LIMITS.notes);
  const answers = plainText(given.answers, LIMITS.answers);
  const reason = oneLineText(given.reason, LIMITS.reason);
  const contactName = oneLineText(given.contact_name, LIMITS.name);
  const contactRole = oneLineText(given.contact_role, LIMITS.name);
  const source = oneLineText(given.source, LIMITS.source);
  if (message) payload.message = message;
  if (notes) payload.notes = notes;
  if (answers) payload.answers = answers;
  if (reason) payload.reason = reason;
  if (contactName) payload.contact_name = contactName;
  if (contactRole) payload.contact_role = contactRole;
  if (source) payload.source = source;
  if (
    given.call_at !== undefined &&
    given.call_at !== null &&
    given.call_at !== ""
  ) {
    const when = isoWhen(given.call_at);
    if (!when) return { ok: false, message: "The call time isn't a date." };
    payload.call_at = when;
  }
  if (kind === "call_notes_added" && !payload.notes)
    return { ok: false, message: "Add the call notes first." };
  if (kind === "founder_answers" && !payload.answers)
    return { ok: false, message: "Write the answers first." };
  if (kind === "reply_received" && !payload.message)
    return { ok: false, message: "Paste the reply first." };
  if (kind === "lost" && !payload.reason)
    return { ok: false, message: "Say why it was lost, in a few words." };
  return { ok: true, payload };
}

/* ---------------------------------------------------------------- settings */

export function isSettingKey(value: unknown): value is SettingKey {
  return (SETTING_KEYS as readonly unknown[]).includes(value);
}

export type SettingResult<K extends SettingKey = SettingKey> =
  { ok: true; value: AgentSettings[K] } | { ok: false; message: string };

/** Checks a settings value against the shape its key has. */
export function validateSetting(key: unknown, input: unknown): SettingResult {
  if (!isSettingKey(key))
    return { ok: false, message: "That setting doesn't exist." };
  const given =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  if (!given) return { ok: false, message: "That value isn't right." };
  if (key === "sorter") {
    if (typeof given.apply !== "boolean")
      return { ok: false, message: "Choose on or off." };
    return { ok: true, value: { apply: given.apply } };
  }
  if (key === "auto_start") {
    if (typeof given.booking !== "boolean" || typeof given.mail !== "boolean") {
      return { ok: false, message: "Choose on or off for each." };
    }
    return { ok: true, value: { booking: given.booking, mail: given.mail } };
  }
  if (
    !Array.isArray(given.rules) ||
    given.rules.some((rule) => typeof rule !== "string")
  ) {
    return { ok: false, message: "The rules have to be a list of lines." };
  }
  const rules = given.rules
    .map((rule) => oneLineText(rule, 300))
    .filter(Boolean);
  if (rules.length > 30) return { ok: false, message: "Keep it to 30 rules." };
  return { ok: true, value: { rules } };
}
