import { baseUrl } from "@/lib/site";
import { withoutLinks } from "@/lib/internal/email-templates";
import { slackEscape } from "@/lib/internal/slack";
import { emailAddress } from "@/lib/internal/token";
import { audit } from "@/lib/internal/team/audit";
import { MAX_FILE_BYTES, deleteTeamFiles, saveTeamFile } from "@/lib/internal/team/files";
import { getPerson } from "@/lib/internal/team/people";
import { hasInboundPayment, inboundCountSince, insertInboundPayment, listPayees } from "@/lib/internal/team/payments";
import { addReimbursement } from "@/lib/internal/team/reimbursements";
import {
  formatMoney,
  istNow,
  monthLabel,
  monthOf,
  monthStart,
  type Currency,
  type Payee,
  type TeamPerson,
} from "@/lib/internal/team/shared";
import { selectRows } from "@/lib/supabase-server";

/**
 * The email intake: invoices from writers, hackathon partners and sponsors,
 * and expense claims from employees, sent to the intake address and passed
 * on by Resend Inbound as an `email.received` webhook
 * (app/api/resend/webhook/route.ts).
 *
 * The subject says what it is (lib/internal/team/shared.ts):
 *   Invoice | Priya Sharma | WR-07 | Nov 2026
 *   Reimbursement | Priya Sharma | S1-012 | Nov 2026
 * Anything else is ignored. The first PDF (else image) attached is kept;
 * "Amount: ₹12,500" in the body fills the amount.
 *
 * The webhook only carries the subject, sender and attachment names, so this
 * reads the email and its attachments from Resend's Receiving API. That needs
 * a full-access key: the site's sending key (RESEND_API_KEY in production) is
 * send-only and gets a 401/403 there. Set RESEND_INBOUND_KEY to a full-access
 * key; without one, invoices still land, flagged, with no amount or PDF.
 *
 * An invoice or claim that's turned away (a claim whose sender can't be
 * verified, a flood from one address) isn't dropped silently: it goes in the
 * audit trail (shown on the Payments page) and, for claims, to Slack.
 *
 * Env: RESEND_INBOUND_KEY (else RESEND_API_KEY), INBOUND_EMAIL_ADDRESS (shown
 * on the Payments page), SLACK_WEBHOOK_URL_PAYMENTS or SLACK_WEBHOOK_URL.
 */

/* ------------------------------------------------------------- subjects */

export type IntakeKind = "invoice" | "reimbursement";

export type ParsedSubject = {
  kind: IntakeKind;
  /** The part that reads like a name, or null. */
  name: string | null;
  /** The part that reads like a code (has a digit, or caps with a dash), or null. */
  code: string | null;
  /** "2026-11"; the current IST month when the subject has none. */
  month: string;
  monthGuessed: boolean;
  /** Every part after the keyword, in order, trimmed. */
  parts: string[];
  /** Parts that are neither the name, the code nor the month. */
  extra: string[];
};

const KEYWORD =
  /^(invoices?|inv|bill|reimbursements?|reimburse|expenses?(?:\s+claim)?|claims?)(?=$|[\s:#|/.,–—-])[\s:#.,–—-]*/i;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function kindOf(keyword: string): IntakeKind {
  return /^(inv|bill)/i.test(keyword) ? "invoice" : "reimbursement";
}

/**
 * "Nov 2026", "November 2026", "Nov-26", "11/2026", "2026-11" → "2026-11".
 * A month name alone means the latest such month (not more than 2 ahead).
 */
export function parseMonth(value: string, now = new Date()): string | null {
  const text = value.trim().toLowerCase().replace(/[’']/g, " ");
  const valid = (year: number, month: number) =>
    year >= 2000 && year <= 2100 && month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}` : null;

  let match = text.match(/^(\d{4})\s*[-/.]\s*(\d{1,2})$/);
  if (match) return valid(Number(match[1]), Number(match[2]));
  match = text.match(/^(\d{1,2})\s*[-/.]\s*(\d{4})$/);
  if (match) return valid(Number(match[2]), Number(match[1]));
  match = text.match(/^([a-z]{3,9})\.?[\s,/-]*(\d{4}|\d{2})?$/);
  if (!match) return null;
  const word = match[1] === "sept" ? "sep" : match[1].slice(0, 3);
  const index = MONTHS.indexOf(word);
  if (index < 0) return null;
  // "Mayo" or "Marketing" aren't months: the word must be a month's name or its start.
  const full = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, index, 1)))
    .toLowerCase();
  if (!full.startsWith(match[1]) && match[1] !== "sept") return null;
  if (match[2]) {
    const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
    return valid(year, index + 1);
  }
  const [year, current] = istNow(now).date.split("-").map(Number);
  return valid(index + 1 > current + 2 ? year - 1 : year, index + 1);
}

/** A single word with a digit (WR-07, S1/012), or caps with a dash (ACME-CO). */
function looksLikeCode(part: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{1,23}$/.test(part)) return false;
  return /\d/.test(part) || /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(part);
}

function looksLikeName(part: string) {
  return /^[\p{L}][\p{L}\p{M} .'’-]{0,79}$/u.test(part) && /\p{L}{2}/u.test(part);
}

/**
 * Reads an intake subject. Null when it doesn't start with a keyword
 * (Invoice, Inv, Bill; Reimbursement, Expense, Claim), after any Re:/Fwd:.
 * Parts split on "|", else " - ", else " / ", else ","; they can come in any
 * order.
 */
export function parseSubject(subject: string, now = new Date()): ParsedSubject | null {
  let text = subject.replace(/\s+/g, " ").trim();
  while (/^(re|fwd?|fw|aw|wg|tr)\s*:\s*/i.test(text)) text = text.replace(/^(re|fwd?|fw|aw|wg|tr)\s*:\s*/i, "");
  const keyword = text.match(KEYWORD);
  if (!keyword) return null;
  const kind = kindOf(keyword[1]);
  const rest = text.slice(keyword[0].length).replace(/^[|/\s,–—-]+/, "");

  const splitter = rest.includes("|")
    ? /\s*\|\s*/
    : /\s[-–—]\s/.test(rest)
      ? /\s+[-–—]\s+/
      : /\s\/\s/.test(rest)
        ? /\s+\/\s+/
        : rest.includes(",")
          ? /\s*,\s*/
          : null;
  const parts = (splitter ? rest.split(splitter) : [rest]).map((part) => part.trim()).filter(Boolean);

  let month: string | null = null;
  let code: string | null = null;
  let name: string | null = null;
  const extra: string[] = [];
  for (const part of parts) {
    const asMonth: string | null = month ? null : parseMonth(part, now);
    if (asMonth) {
      month = asMonth;
      continue;
    }
    if (!code && looksLikeCode(part)) {
      code = part.toUpperCase();
      continue;
    }
    if (!name && looksLikeName(part)) {
      name = part;
      continue;
    }
    extra.push(part);
  }
  return {
    kind,
    name,
    code,
    month: month ?? monthOf(istNow(now).date),
    monthGuessed: !month,
    parts,
    extra,
  };
}

/* --------------------------------------------------------------- amounts */

const CURRENCY_MARK = String.raw`₹|rs\.?|inr|us\$|usd|\$|€|eur|£|gbp`;
const NUMBER = String.raw`\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;
const MONEY = new RegExp(
  String.raw`(?:(${CURRENCY_MARK})\s*)?(${NUMBER})(?:\s*(${CURRENCY_MARK}|\/-))?`,
  "gi",
);

function currencyOf(mark: string | undefined): Currency | null {
  if (!mark) return null;
  const value = mark.toLowerCase();
  if (value === "₹" || value.startsWith("rs") || value === "inr" || value === "/-") return "INR";
  if (value.includes("$") || value === "usd") return "USD";
  if (value === "€" || value === "eur") return "EUR";
  if (value === "£" || value === "gbp") return "GBP";
  return null;
}

/**
 * The amount an email asks for. Prefers a line with "amount", "total",
 * "payable" or "fee" (not a date line); otherwise the first sum with a
 * currency sign. Null when there's nothing that looks like one.
 */
export function findAmount(text: string): { amount: number; currency: Currency } | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 400);
  const keyed = lines.filter((line) => /\b(amount|total|payable|fee|fees|sum|invoice value)\b/i.test(line) && !/\bdate\b|%/i.test(line));

  const pick = (line: string, needMark: boolean) => {
    for (const match of line.matchAll(MONEY)) {
      const currency = currencyOf(match[1]) ?? currencyOf(match[3]);
      if (needMark && !currency) continue;
      const amount = Number(match[2].replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e9) continue;
      // A bare year or a single digit next to "Total" is rarely the sum.
      if (!currency && (amount < 10 || /^(19|20)\d{2}$/.test(match[2]))) continue;
      return { amount: Math.round(amount * 100) / 100, currency: currency ?? ("INR" as Currency) };
    }
    return null;
  };

  // A "Grand total" or "Total payable" line wins over an "Amount" line above it.
  const ordered = [...keyed].sort((a, b) => Number(/total|payable/i.test(b)) - Number(/total|payable/i.test(a)));
  for (const line of ordered) {
    const found = pick(line, false);
    if (found) return found;
  }
  for (const line of lines) {
    const found = pick(line, true);
    if (found) return found;
  }
  return null;
}

/** "Priya Sharma <priya@example.com>" → { address, name }. */
export function parseFrom(value: unknown): { address: string | null; name: string | null } {
  if (typeof value !== "string") return { address: null, name: null };
  const angle = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const address = emailAddress(angle ? angle[2] : value);
  const name = angle?.[1]?.trim() || null;
  return { address, name: name && !name.includes("@") ? name.slice(0, 80) : null };
}

/** As much of an HTML body as is read for an amount: plenty for any invoice email. */
const MAX_HTML_CHARS = 200_000;

/** Plain text from an HTML body, for when an email has no text part. */
export function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8377;|&#x20b9;/gi, "₹")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n");
}

/* ----------------------------------------------------------------- slack */

/** The Slack post for a new invoice or claim: one line and a button. */
export function intakeSlackMessage(item: { title: string; points: string[]; path: string }, site = baseUrl) {
  const points = item.points.map((point) => slackEscape(point.replace(/\s+/g, " ").trim().slice(0, 100))).filter(Boolean);
  const title = slackEscape(item.title.replace(/\s+/g, " ").trim().slice(0, 120));
  return {
    text: [title, ...points].join(" · "),
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `:receipt: *${title}*${points.length ? `\n${points.join(" · ")}` : ""}` } },
      {
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "Open in dashboard" }, url: `${site}${item.path}`, style: "primary" },
        ],
      },
    ],
    unfurl_links: false,
  };
}

export function intakeWebhook(env: Record<string, string | undefined> = process.env) {
  const url = (env.SLACK_WEBHOOK_URL_PAYMENTS || env.SLACK_WEBHOOK_URL || "").trim();
  return url.startsWith("https://hooks.slack.com/") ? url : null;
}

async function postToSlack(message: ReturnType<typeof intakeSlackMessage>) {
  const url = intakeWebhook();
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error(`[intake] Slack alert failed: ${response.status}`);
  } catch (error) {
    console.error("[intake] Slack alert failed", error);
  }
}

/* ---------------------------------------------------------------- resend */

type ReceivedEmail = {
  from?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  authentication?: Record<string, unknown> | null;
};

type ReceivedAttachment = {
  id?: unknown;
  filename?: unknown;
  content_type?: unknown;
  size?: unknown;
  download_url?: unknown;
};

/** What Resend answered: the JSON, or why not (and whether a retry could help). */
type ApiResult<T> = { ok: true; json: T } | { ok: false; status: number; retry: boolean };

function inboundKey() {
  return process.env.RESEND_INBOUND_KEY || process.env.RESEND_API_KEY || "";
}

async function resendGet<T>(path: string): Promise<ApiResult<T>> {
  const key = inboundKey();
  if (!key) return { ok: false, status: 0, retry: false };
  try {
    const response = await fetch(`https://api.resend.com${path}`, {
      headers: { authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { ok: false, status: response.status, retry: response.status === 429 || response.status >= 500 };
    }
    return { ok: true, json: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0, retry: true };
  }
}

/** SPF or DKIM verdict as a word ("pass", "fail"…), whatever shape it comes in. */
function verdict(value: unknown): string | null {
  if (typeof value === "string") return value.toLowerCase();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const inner = record.result ?? record.status ?? record.verdict;
    return typeof inner === "string" ? inner.toLowerCase() : null;
  }
  return null;
}

function isPdf(item: ReceivedAttachment) {
  return item.content_type === "application/pdf" || (typeof item.filename === "string" && /\.pdf$/i.test(item.filename));
}

function isImage(item: ReceivedAttachment) {
  return (
    (typeof item.content_type === "string" && /^image\/(png|jpe?g|webp)$/i.test(item.content_type)) ||
    (typeof item.filename === "string" && /\.(png|jpe?g|webp)$/i.test(item.filename))
  );
}

type Downloaded = { body: Uint8Array; name: string };

/**
 * Reads a response's body, giving up as soon as it passes `max` bytes, so an
 * oversized file is never held in memory whole. Null when it's too big.
 */
export async function readCapped(
  response: Pick<Response, "headers" | "body" | "arrayBuffer">,
  max: number,
): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!response.body) {
    const whole = new Uint8Array(await response.arrayBuffer());
    return whole.byteLength > max ? null : whole;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** The first PDF attached, else the first image, up to 10 MB. */
async function firstDocument(emailId: string): Promise<{ file: Downloaded | null; problem: string | null; retry: boolean }> {
  const listed = await resendGet<{ data?: ReceivedAttachment[] }>(
    `/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`,
  );
  if (!listed.ok) return { file: null, problem: "Couldn't read the attachments", retry: listed.retry };
  const items = (listed.json.data ?? []).filter(
    (item) =>
      typeof item.download_url === "string" &&
      item.download_url.startsWith("https://") &&
      (typeof item.size !== "number" || item.size <= MAX_FILE_BYTES),
  );
  const chosen = items.find(isPdf) ?? items.find(isImage);
  if (!chosen) return { file: null, problem: null, retry: false };
  try {
    const response = await fetch(String(chosen.download_url), { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return { file: null, problem: "Couldn't download the attachment", retry: response.status >= 500 };
    const body = await readCapped(response, MAX_FILE_BYTES);
    if (!body) return { file: null, problem: "The attachment is over 10 MB", retry: false };
    return { file: { body, name: typeof chosen.filename === "string" ? chosen.filename : "invoice.pdf" }, problem: null, retry: false };
  } catch {
    return { file: null, problem: "Couldn't download the attachment", retry: true };
  }
}

export type IntakeResult =
  | { ok: true; kind: IntakeKind; id: string | null; duplicate?: boolean; flagged?: string | null }
  | { ok: true; skipped: string }
  | { ok: false; message: string; retry: boolean };

/* ---------------------------------------------------------- turned away */

/** Emailed invoices one address may send in an hour, and everyone together. */
const SENDER_HOURLY_LIMIT = 5;
const INTAKE_HOURLY_LIMIT = 40;

/** One Slack post per sender per hour for mail that was turned away. */
const lastSkipAlert = new Map<string, number>();

/**
 * Records an invoice or claim that wasn't taken in, so an admin can see it
 * (the audit trail, listed on the Payments page) instead of it vanishing
 * into the server log. `alert` also posts it to Slack: used for claims,
 * which are an employee's money.
 */
async function turnAway(
  mail: { emailId: string; from: string | null; subject: string; kind: IntakeKind },
  reason: string,
  options: { alert?: boolean } = {},
): Promise<IntakeResult> {
  await audit({
    actor: mail.from ?? "unknown sender",
    area: "intake",
    action: "skipped",
    subject: mail.subject.slice(0, 300) || "(no subject)",
    detail: { reason, kind: mail.kind, email_id: mail.emailId },
  });
  const sender = mail.from ?? "unknown";
  const now = Date.now();
  if (options.alert && now - (lastSkipAlert.get(sender) ?? 0) > 3_600_000) {
    if (lastSkipAlert.size > 500) lastSkipAlert.clear();
    lastSkipAlert.set(sender, now);
    await postToSlack(
      intakeSlackMessage({
        title: `${mail.kind === "invoice" ? "Invoice" : "Expense claim"} email not taken in`,
        points: [sender, reason],
        path: mail.kind === "invoice" ? "/internal/money/payments" : "/internal/money/payroll",
      }),
    );
  }
  return { ok: true, skipped: `${reason} (${sender})` };
}

/**
 * Whether the mail was sent to the intake address (INBOUND_EMAIL_ADDRESS),
 * going by the To, Cc and Bcc the webhook lists. Null when that can't be
 * told: no address is set, or the webhook lists no recipients.
 */
export function addressedToIntake(
  meta: Record<string, unknown>,
  intake = process.env.INBOUND_EMAIL_ADDRESS,
): boolean | null {
  const address = emailAddress(intake?.trim());
  if (!address) return null;
  const lists = [meta.to, meta.cc, meta.bcc].filter((list): list is unknown[] => Array.isArray(list));
  if (lists.length === 0) return null;
  return lists.flat().some((entry) => parseFrom(entry).address === address);
}

/**
 * Handles Resend's `email.received` webhook data. Retries from Resend are
 * safe: each email is saved once, keyed by its id. `retry: true` asks the
 * webhook to answer 500 so Resend tries again later.
 */
export async function handleReceivedEmail(data: unknown): Promise<IntakeResult> {
  const meta = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const emailId = typeof meta.email_id === "string" ? meta.email_id : null;
  if (!emailId) return { ok: true, skipped: "No email id in the webhook" };
  const subjectText = typeof meta.subject === "string" ? meta.subject : "";
  const parsed = parseSubject(subjectText);
  if (!parsed) return { ok: true, skipped: `Subject isn't an invoice or claim: "${subjectText.slice(0, 80)}"` };

  // A retried webhook: already saved.
  if (parsed.kind === "invoice" && (await hasInboundPayment(emailId))) {
    return { ok: true, kind: "invoice", id: null, duplicate: true };
  }
  if (parsed.kind === "reimbursement") {
    const seen = await selectRows(
      "team_reimbursements",
      new URLSearchParams({ select: "id", inbound_id: `eq.${emailId}`, limit: "1" }),
    );
    if (seen.ok && seen.rows.length) return { ok: true, kind: "reimbursement", id: null, duplicate: true };
  }

  // A flood of invoices is turned away before anything is fetched or stored:
  // from one address, or (forged senders) from everyone together.
  const claimed = parseFrom(meta.from).address;
  const mail = { emailId, from: claimed, subject: subjectText, kind: parsed.kind };
  if (parsed.kind === "invoice") {
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const [fromSender, fromAnyone] = await Promise.all([
      claimed ? inboundCountSince(hourAgo, claimed) : Promise.resolve(0),
      inboundCountSince(hourAgo),
    ]);
    if ((fromSender ?? 0) >= SENDER_HOURLY_LIMIT) {
      return turnAway(mail, `More than ${SENDER_HOURLY_LIMIT} invoices from this address in an hour`);
    }
    if ((fromAnyone ?? 0) >= INTAKE_HOURLY_LIMIT) {
      return turnAway(mail, `More than ${INTAKE_HOURLY_LIMIT} emailed invoices in an hour`);
    }
  }

  const flags: string[] = [];
  const full = await resendGet<ReceivedEmail>(`/emails/receiving/${encodeURIComponent(emailId)}`);
  if (!full.ok) {
    if (full.retry) return { ok: false, retry: true, message: `Resend returned ${full.status} for the email` };
    flags.push(
      full.status === 401 || full.status === 403 || full.status === 0
        ? "Couldn't open the email in Resend (needs RESEND_INBOUND_KEY, a full-access key)"
        : "Couldn't open the email in Resend",
    );
  }
  const email: ReceivedEmail = full.ok ? full.json : {};
  const from = parseFrom(email.from ?? meta.from);
  if (!from.address) return turnAway(mail, "No valid sender address");
  mail.from = from.address;

  // Mail for another mailbox on the same domain can land here too. It's
  // kept (the webhook's recipient list isn't proof enough to drop an
  // invoice) but marked, so it gets a look before anyone pays it.
  if (addressedToIntake(meta) === false) flags.push("Wasn't addressed to the intake address: it may have been meant for another mailbox");

  const body =
    typeof email.text === "string" && email.text.trim()
      ? email.text
      : typeof email.html === "string"
        ? htmlToText(email.html.slice(0, MAX_HTML_CHARS))
        : "";
  // An amount in the subject counts too ("… | Nov 2026 | ₹12,500").
  const found = findAmount([...parsed.extra, body].join("\n"));

  // The From header is easy to forge, and an SPF or DKIM pass alone only
  // proves the sender owns *some* domain. DMARC passes only when that domain
  // lines up with the From address's, so it's the one check that counts.
  // Forwarding (Zoho) keeps the sender's DKIM signature, so DMARC still
  // passes. A domain with no DMARC record (studio1hq.com, until one is
  // added) gets "none", which counts as unverified.
  const spf = verdict(email.authentication?.spf);
  const dkim = verdict(email.authentication?.dkim);
  const dmarc = verdict(email.authentication?.dmarc);
  const verified = dmarc === "pass";
  if (spf === "fail" && dkim === "fail") flags.push("Failed the sender checks (SPF and DKIM): it may not be from them");
  else if (!verified) flags.push("Couldn't verify the sender (no DMARC pass): check it's really from them");

  // Claims are checked before anything is downloaded: one that's going to be
  // turned away shouldn't cost a file fetch.
  let person: TeamPerson | null = null;
  if (parsed.kind === "reimbursement") {
    // Claims only count from the employee's own address on the team list, and
    // only when the email proves it came from there: a forged From would
    // otherwise file a claim in someone else's name. They can still claim on
    // My day, which needs them signed in.
    if (!verified) {
      return turnAway(mail, "Expense claim whose sender couldn't be verified (no DMARC pass). They can claim on My day instead", { alert: true });
    }
    person = await getPerson(from.address);
    if (!person || !person.active) return turnAway(mail, "Expense claim from someone who isn't on the team list", { alert: true });
  }

  // The webhook lists attachments; without that list, ask Resend anyway.
  const mayHaveFiles = !Array.isArray(meta.attachments) || meta.attachments.length > 0;
  const document = full.ok && mayHaveFiles ? await firstDocument(emailId) : { file: null, problem: null, retry: false };
  if (document.retry && !document.file) {
    return { ok: false, retry: true, message: document.problem ?? "Couldn't read the attachments" };
  }
  if (document.problem) flags.push(document.problem);

  return person
    ? saveClaim({ emailId, parsed, from, found, file: document.file, body, person })
    : saveInvoice({ emailId, subject: subjectText, parsed, from, found, flags, file: document.file, body });
}

async function saveInvoice(input: {
  emailId: string;
  subject: string;
  parsed: ParsedSubject;
  from: { address: string | null; name: string | null };
  found: { amount: number; currency: Currency } | null;
  flags: string[];
  file: Downloaded | null;
  body: string;
}): Promise<IntakeResult> {
  const { parsed, from, found, flags } = input;
  const payees = await listPayees();
  if (!payees.ok && payees.missing) return { ok: false, retry: false, message: "The team migration hasn't run" };
  const list = payees.ok ? payees.payees : [];

  // The code first (from the subject, any part), then the sender's address.
  const codes = [parsed.code, ...parsed.parts].filter((part): part is string => Boolean(part)).map((part) => part.toUpperCase());
  let payee: Payee | null = list.find((item) => codes.includes(item.code.toUpperCase())) ?? null;
  // A code is short and guessable: it only stands for the payee when the
  // mail also came from the address on file for them.
  if (payee && payee.email && payee.email !== from.address) {
    flags.push(`Sent from ${from.address}, not ${payee.name}'s address`);
  } else if (payee && !payee.email) {
    flags.push(`${payee.name} has no email on file, so the sender (${from.address}) can't be checked against it`);
  }
  if (!payee) {
    const byEmail = list.filter((item) => item.email === from.address);
    payee = byEmail.find((item) => item.active) ?? byEmail[0] ?? null;
  }
  if (!payee) flags.push("Unknown sender: check before paying");
  else if (!payee.active) flags.push(`${payee.name} is marked inactive`);
  if (!found) flags.push("No amount found: add it before paying");
  if (parsed.monthGuessed) flags.push(`No month in the subject: set to ${monthLabel(parsed.month)}`);
  if (!input.file) flags.push("No invoice attached");

  const id = crypto.randomUUID();
  let saved: { path: string; name: string } | null = null;
  if (input.file) {
    const stored = await saveTeamFile("invoices", id, input.file.body, input.file.name);
    if (stored.ok) saved = { path: stored.path, name: stored.name };
    else flags.push(`Attachment not kept: ${stored.message}`);
  }

  // What the sender typed can end up in Studio1's "payment sent" email:
  // brackets go, so none of it can turn into a link there.
  const name = payee?.name ?? (withoutLinks(parsed.name ?? from.name ?? "") || from.address || "Unknown");
  const description =
    withoutLinks(parsed.extra.filter((part) => !/\d/.test(part) || !findAmount(part)).join(" · ")).slice(0, 200) ||
    `Invoice for ${monthLabel(parsed.month)}`;
  const inserted = await insertInboundPayment({
    id,
    inbound_id: input.emailId,
    payee_id: payee?.id ?? null,
    name,
    email: payee?.email ?? from.address,
    code: payee?.code ?? parsed.code,
    kind: payee?.kind ?? "other",
    direction: "out",
    month: monthStart(parsed.month),
    description,
    amount: found?.amount ?? null,
    currency: found?.currency ?? "INR",
    email_subject: input.subject.slice(0, 300),
    flagged: flags.length ? flags.join(" · ").slice(0, 500) : null,
    invoice_path: saved?.path ?? null,
    invoice_name: saved?.name ?? null,
  });
  if (!inserted.ok) {
    await deleteTeamFiles([saved?.path]);
    console.error(`[intake] saving invoice ${input.emailId} failed: ${inserted.message}`);
    return { ok: false, retry: !inserted.missing, message: "Couldn't save the invoice" };
  }
  if (inserted.duplicate) {
    await deleteTeamFiles([saved?.path]);
    return { ok: true, kind: "invoice", id: null, duplicate: true };
  }

  await postToSlack(
    intakeSlackMessage({
      title: `New invoice: ${name}${payee?.code || parsed.code ? ` (${payee?.code ?? parsed.code})` : ""}`,
      points: [
        found ? formatMoney(found.amount, found.currency) : "No amount",
        monthLabel(parsed.month, true),
        flags.length ? "Needs a look" : "",
      ],
      path: "/internal/money/payments",
    }),
  );
  return { ok: true, kind: "invoice", id, flagged: flags.length ? flags.join(" · ") : null };
}

async function saveClaim(input: {
  emailId: string;
  parsed: ParsedSubject;
  from: { address: string | null; name: string | null };
  found: { amount: number; currency: Currency } | null;
  file: Downloaded | null;
  body: string;
  /** The sender, already checked: DMARC passed and they're active on the team list. */
  person: TeamPerson;
}): Promise<IntakeResult> {
  const { parsed, from, found, person } = input;

  const notes: string[] = [`For ${monthLabel(parsed.month)}${parsed.monthGuessed ? " (no month in the subject)" : ""}`];
  if (parsed.code && person.employee_code && parsed.code.toUpperCase() !== person.employee_code.toUpperCase()) {
    notes.push(`The subject's employee ID (${parsed.code}) isn't theirs (${person.employee_code})`);
  }
  if (!found) notes.push("No amount found in the email");
  const firstLine = input.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 3 && !/^(hi|hello|hey|dear)\b/i.test(line) && !findAmount(line));
  const description = (withoutLinks(parsed.extra.join(" · ") || firstLine || "") || `Expense claim for ${monthLabel(parsed.month)}`).slice(0, 200);

  const result = await addReimbursement({
    email: person.email,
    description,
    amount: found?.amount ?? null,
    currency: found?.currency ?? "INR",
    receipt: input.file ? { body: input.file.body, name: input.file.name } : null,
    source: "email",
    inbound_id: input.emailId,
    note: notes.join(" · "),
  });
  if (!result.ok) {
    console.error(`[intake] saving claim ${input.emailId} failed: ${result.message}`);
    return { ok: false, retry: !/migration/i.test(result.message), message: "Couldn't save the claim" };
  }
  if (result.duplicate) return { ok: true, kind: "reimbursement", id: null, duplicate: true };

  await postToSlack(
    intakeSlackMessage({
      title: `New expense claim: ${person.name || from.name || person.email}`,
      points: [found ? formatMoney(found.amount, found.currency) : "No amount", description.slice(0, 60)],
      path: "/internal/money/payroll",
    }),
  );
  return { ok: true, kind: "reimbursement", id: result.id ?? null };
}
