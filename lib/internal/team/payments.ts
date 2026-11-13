import { deleteRows, insertRow, selectRows, updateRows } from "@/lib/supabase-server";
import { firstName } from "@/lib/first-name";
import { renderEmail, withoutLinks } from "@/lib/internal/email-templates";
import { emailAddress } from "@/lib/internal/token";
import { audit } from "@/lib/internal/team/audit";
import { deleteTeamFiles } from "@/lib/internal/team/files";
import {
  PAYEE_KINDS,
  TEAM_MIGRATION_HINT,
  formatMoney,
  isCurrency,
  isDateKey,
  isMissingTable,
  isMonthKey,
  isUuid,
  istNow,
  monthLabel,
  monthOf,
  monthStart,
  parseAmount,
  shortText,
  type Payee,
  type PayeeKind,
  type Payment,
  type PaymentDirection,
  type PaymentStatus,
  type TeamResult,
} from "@/lib/internal/team/shared";
import { isMailerConfigured, sendMail } from "@/lib/mailer";

/**
 * Payments to writers, hackathon partners and others, and money sponsors owe
 * Studio1 (`payees` and `payments`). Invoices come in by email
 * (lib/internal/team/inbound.ts) or an admin adds them by hand; marking one
 * paid can email the payee. No session checks here: the Payments page and
 * its actions do that. Server only.
 */

const PAYEES = "payees";
const PAYMENTS = "payments";

export const PAYEE_CODE = /^[A-Za-z0-9][A-Za-z0-9-]{1,15}$/;

const KINDS = Object.keys(PAYEE_KINDS) as PayeeKind[];
const STATUSES: PaymentStatus[] = ["due", "paid", "cancelled"];

function isKind(value: unknown): value is PayeeKind {
  return typeof value === "string" && (KINDS as string[]).includes(value);
}

function failure(message: string, what: string): TeamResult {
  if (isMissingTable(message)) return { ok: false, message: TEAM_MIGRATION_HINT };
  console.error(`[payments] ${what} failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/* ---------------------------------------------------------------- payees */

function toPayee(row: Record<string, unknown>): Payee | null {
  if (typeof row.id !== "string" || typeof row.code !== "string") return null;
  return {
    id: row.id,
    code: row.code,
    name: typeof row.name === "string" ? row.name : "",
    email: typeof row.email === "string" && row.email ? row.email : null,
    kind: isKind(row.kind) ? row.kind : "other",
    notes: typeof row.notes === "string" ? row.notes : "",
    active: row.active !== false,
  };
}

export type PayeesResult = { ok: true; payees: Payee[] } | { ok: false; message: string; missing: boolean };

/** Every payee, active first, then by name. */
export async function listPayees(): Promise<PayeesResult> {
  const result = await selectRows(
    PAYEES,
    new URLSearchParams({ select: "*", order: "active.desc,name.asc", limit: "1000" }),
  );
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing) console.error(`[payments] listing payees failed: ${result.message}`);
    return { ok: false, missing, message: missing ? TEAM_MIGRATION_HINT : "Couldn't load the payees." };
  }
  return { ok: true, payees: result.rows.map(toPayee).filter((payee): payee is Payee => payee !== null) };
}

export async function getPayee(id: string): Promise<Payee | null> {
  if (!isUuid(id)) return null;
  const result = await selectRows(PAYEES, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  return result.ok && result.rows[0] ? toPayee(result.rows[0]) : null;
}

export type PayeeInput = {
  code: string;
  name: string;
  email: string | null;
  kind: PayeeKind;
  notes: string;
  active: boolean;
};

/** Checks what an admin typed for a payee. */
export function cleanPayee(input: Record<string, unknown>): { ok: true; payee: PayeeInput } | { ok: false; message: string } {
  const code = shortText(input.code, 16).toUpperCase();
  if (!PAYEE_CODE.test(code)) {
    return { ok: false, message: "Codes are 2–16 letters, digits or dashes, like WR-07." };
  }
  const name = shortText(input.name, 80);
  if (name.length < 2) return { ok: false, message: "Add their name." };
  const rawEmail = shortText(input.email, 254);
  const email = rawEmail ? emailAddress(rawEmail) : null;
  if (rawEmail && !email) return { ok: false, message: "That email address isn't valid." };
  return {
    ok: true,
    payee: {
      code,
      name,
      email,
      kind: isKind(input.kind) ? input.kind : "writer",
      notes: shortText(input.notes, 300),
      active: input.active !== false,
    },
  };
}

function payeeError(message: string, what: string): TeamResult {
  if (message.includes("payees_code") || (message.includes("23505") && message.toLowerCase().includes("code"))) {
    return { ok: false, message: "Another payee already has that code." };
  }
  return failure(message, what);
}

export async function addPayee(payee: PayeeInput): Promise<TeamResult> {
  const result = await insertRow(PAYEES, { ...payee });
  return result.ok ? { ok: true } : payeeError(result.message, "adding a payee");
}

export async function updatePayee(id: string, payee: PayeeInput): Promise<TeamResult> {
  if (!isUuid(id)) return { ok: false, message: "That payee isn't there any more." };
  const result = await updateRows(PAYEES, new URLSearchParams({ id: `eq.${id}` }), { ...payee });
  if (!result.ok) return payeeError(result.message, "updating a payee");
  return result.count ? { ok: true } : { ok: false, message: "That payee isn't there any more." };
}

/* -------------------------------------------------------------- payments */

function toPayment(row: Record<string, unknown>): Payment | null {
  if (typeof row.id !== "string") return null;
  const amount = row.amount === null || row.amount === undefined || row.amount === "" ? null : Number(row.amount);
  const text = (value: unknown) => (typeof value === "string" && value ? value : null);
  return {
    id: row.id,
    created_at: String(row.created_at ?? ""),
    created_by: String(row.created_by ?? ""),
    payee_id: text(row.payee_id),
    name: typeof row.name === "string" ? row.name : "",
    email: text(row.email),
    code: text(row.code),
    kind: isKind(row.kind) ? row.kind : "other",
    direction: row.direction === "in" ? "in" : "out",
    month: typeof row.month === "string" ? row.month.slice(0, 7) : "",
    description: typeof row.description === "string" ? row.description : "",
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: typeof row.currency === "string" ? row.currency : "INR",
    status: STATUSES.includes(row.status as PaymentStatus) ? (row.status as PaymentStatus) : "due",
    source: row.source === "email" ? "email" : "dashboard",
    email_subject: text(row.email_subject),
    flagged: text(row.flagged),
    invoice_path: text(row.invoice_path),
    invoice_name: text(row.invoice_name),
    paid_on: text(row.paid_on),
    paid_by: text(row.paid_by),
    paid_reference: text(row.paid_reference),
    note: typeof row.note === "string" ? row.note : "",
  };
}

export type PaymentsResult = { ok: true; payments: Payment[] } | { ok: false; message: string; missing: boolean };

/** Payments, newest month first; filter by status, month ("YYYY-MM") or kind. */
export async function listPayments(
  filter: { status?: PaymentStatus; month?: string; kind?: PayeeKind } = {},
): Promise<PaymentsResult> {
  const query = new URLSearchParams({ select: "*", order: "month.desc,created_at.desc", limit: "2000" });
  if (filter.status && STATUSES.includes(filter.status)) query.set("status", `eq.${filter.status}`);
  if (filter.month && isMonthKey(filter.month)) query.set("month", `eq.${monthStart(filter.month)}`);
  if (filter.kind && isKind(filter.kind)) query.set("kind", `eq.${filter.kind}`);
  const result = await selectRows(PAYMENTS, query);
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing) console.error(`[payments] listing payments failed: ${result.message}`);
    return { ok: false, missing, message: missing ? TEAM_MIGRATION_HINT : "Couldn't load the payments." };
  }
  return { ok: true, payments: result.rows.map(toPayment).filter((payment): payment is Payment => payment !== null) };
}

export async function getPayment(id: string): Promise<Payment | null> {
  if (!isUuid(id)) return null;
  const result = await selectRows(PAYMENTS, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  return result.ok && result.rows[0] ? toPayment(result.rows[0]) : null;
}

/** True when a payment already came in from this Resend email. */
export async function hasInboundPayment(inboundId: string) {
  const result = await selectRows(
    PAYMENTS,
    new URLSearchParams({ select: "id", inbound_id: `eq.${inboundId}`, limit: "1" }),
  );
  return result.ok && result.rows.length > 0;
}

/**
 * How many emailed invoices came in since `since`: from one address, or from
 * anyone. The intake uses it to turn a flood away. Null when it can't tell.
 */
export async function inboundCountSince(since: string, email?: string): Promise<number | null> {
  const query = new URLSearchParams({ select: "id", source: "eq.email", created_at: `gte.${since}`, limit: "1" });
  if (email) query.set("email", `eq.${email}`);
  const result = await selectRows(PAYMENTS, query, { count: true });
  return result.ok ? (result.total ?? result.rows.length) : null;
}

/** Saves a payment that came in by email. A retried webhook is a no-op. */
export async function insertInboundPayment(row: Record<string, unknown> & { id: string; inbound_id: string }) {
  const result = await insertRow(PAYMENTS, { ...row, created_by: "email", source: "email" });
  if (result.ok) return { ok: true as const, duplicate: false };
  if (result.duplicate) return { ok: true as const, duplicate: true };
  return { ok: false as const, missing: isMissingTable(result.message), message: result.message };
}

export type PaymentInput = {
  payee_id: string | null;
  name: string;
  email: string | null;
  code: string | null;
  kind: PayeeKind;
  direction: PaymentDirection;
  month: string;
  description: string;
  amount: number | null;
  currency: string;
  note: string;
};

/**
 * Checks a payment an admin typed. With a payee picked, their name, email,
 * code and kind fill in; otherwise a name is enough. Sponsors default to
 * money coming in.
 */
export function cleanPayment(
  input: Record<string, unknown>,
  payee: Payee | null,
): { ok: true; payment: PaymentInput } | { ok: false; message: string } {
  if (input.payee_id && !payee) return { ok: false, message: "That payee isn't there any more." };
  const name = payee?.name ?? shortText(input.name, 80);
  if (name.length < 2) return { ok: false, message: "Pick a payee or type a name." };
  const rawEmail = payee ? (payee.email ?? "") : shortText(input.email, 254);
  const email = rawEmail ? emailAddress(rawEmail) : null;
  if (rawEmail && !email) return { ok: false, message: "That email address isn't valid." };
  const rawCode = payee ? payee.code : shortText(input.code, 16).toUpperCase();
  if (rawCode && !PAYEE_CODE.test(rawCode)) return { ok: false, message: "Codes are 2–16 letters, digits or dashes." };
  const kind = payee?.kind ?? (isKind(input.kind) ? input.kind : "writer");
  const direction: PaymentDirection =
    input.direction === "in" || input.direction === "out" ? input.direction : kind === "sponsor" ? "in" : "out";
  if (!isMonthKey(input.month)) return { ok: false, message: "Pick the month it's for." };
  const amount = parseAmount(input.amount);
  if (amount !== null && Number.isNaN(amount)) return { ok: false, message: "The amount should be a number, like 12500 or 12,500.50." };
  return {
    ok: true,
    payment: {
      payee_id: payee?.id ?? null,
      name,
      email,
      code: rawCode || null,
      kind,
      direction,
      month: input.month,
      description: shortText(input.description, 200),
      amount,
      currency: isCurrency(input.currency) ? input.currency : "INR",
      note: shortText(input.note, 500),
    },
  };
}

export async function addPayment(payment: PaymentInput, by: string): Promise<TeamResult> {
  const result = await insertRow(PAYMENTS, {
    ...payment,
    month: monthStart(payment.month),
    created_by: by,
    source: "dashboard",
  });
  if (!result.ok) return failure(result.message, "adding a payment");
  await audit({
    actor: by,
    area: "payments",
    action: "added",
    subject: payment.name,
    detail: { amount: payment.amount, currency: payment.currency, month: payment.month, direction: payment.direction },
  });
  return { ok: true };
}

const PAID_LOCKED = "It's marked paid. Undo that first, then change it.";

/** The parts of a payment worth keeping when it changes or goes. */
function auditShape(payment: Payment) {
  return {
    name: payment.name,
    email: payment.email,
    code: payment.code,
    month: payment.month,
    amount: payment.amount,
    currency: payment.currency,
    direction: payment.direction,
    status: payment.status,
    source: payment.source,
    paid_on: payment.paid_on,
    paid_by: payment.paid_by,
    paid_reference: payment.paid_reference,
  };
}

/**
 * Changes a payment's details. `clearFlag` drops the "needs a look" note. A
 * paid one stays as it was paid: undo it first.
 */
export async function updatePayment(
  id: string,
  payment: PaymentInput,
  by: string,
  options: { clearFlag?: boolean } = {},
): Promise<TeamResult> {
  const before = await getPayment(id);
  if (!before) return { ok: false, message: "That payment isn't there any more." };
  if (before.status === "paid") return { ok: false, message: PAID_LOCKED };
  const result = await updateRows(PAYMENTS, new URLSearchParams({ id: `eq.${id}`, status: "neq.paid" }), {
    ...payment,
    month: monthStart(payment.month),
    updated_at: new Date().toISOString(),
    ...(options.clearFlag ? { flagged: null } : {}),
  });
  if (!result.ok) return failure(result.message, "updating a payment");
  if (!result.count) return { ok: false, message: PAID_LOCKED };
  await audit({
    actor: by,
    area: "payments",
    action: "edited",
    subject: id,
    detail: {
      before: auditShape(before),
      after: { name: payment.name, email: payment.email, month: payment.month, amount: payment.amount, currency: payment.currency },
      flag_cleared: options.clearFlag ? before.flagged : null,
    },
  });
  return { ok: true };
}

/**
 * Cancels a due payment, or puts a paid or cancelled one back to due
 * ("Undo"). A paid one can't be cancelled in one step. Undoing keeps a line
 * in the payment's note saying when and by whom it had been paid, so that
 * isn't lost with the paid fields.
 */
export async function setPaymentStatus(id: string, status: "due" | "cancelled", by: string): Promise<TeamResult> {
  const before = await getPayment(id);
  if (!before) return { ok: false, message: "That payment isn't there any more." };
  if (before.status === status) return { ok: true };
  if (status === "cancelled" && before.status === "paid") return { ok: false, message: PAID_LOCKED };

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "due" && before.status === "paid") {
    const was = [
      `Was marked paid${before.paid_on ? ` on ${before.paid_on}` : ""}${before.paid_by ? ` by ${before.paid_by}` : ""}`,
      before.paid_reference ? `ref ${before.paid_reference}` : "",
      `undone by ${by} on ${istNow().date}`,
    ]
      .filter(Boolean)
      .join(", ");
    Object.assign(patch, {
      paid_on: null,
      paid_by: null,
      paid_reference: null,
      note: [was, before.note].filter(Boolean).join(" · ").slice(0, 500),
    });
  }
  // Only from the status it was read in, so two people can't cross over.
  const result = await updateRows(PAYMENTS, new URLSearchParams({ id: `eq.${id}`, status: `eq.${before.status}` }), patch);
  if (!result.ok) return failure(result.message, "changing a payment's status");
  if (!result.count) return { ok: false, message: "Someone else just changed it. Reload and check." };
  await audit({
    actor: by,
    area: "payments",
    action: before.status === "paid" ? "undone" : status === "cancelled" ? "cancelled" : "restored",
    subject: id,
    detail: { before: auditShape(before) },
  });
  return { ok: true };
}

/** Deletes a payment that isn't paid, with its invoice file. */
export async function deletePayment(id: string, by: string): Promise<TeamResult> {
  const payment = await getPayment(id);
  if (!payment) return { ok: false, message: "That payment isn't there any more." };
  if (payment.status === "paid") return { ok: false, message: "It's marked paid, so it stays on the record. Undo that first." };
  const result = await deleteRows(PAYMENTS, new URLSearchParams({ id: `eq.${id}`, status: "neq.paid" }));
  if (!result.ok) return failure(result.message, "deleting a payment");
  if (!result.count) return { ok: false, message: "Someone else just changed it. Reload and check." };
  await deleteTeamFiles([payment.invoice_path]);
  await audit({
    actor: by,
    area: "payments",
    action: "deleted",
    subject: id,
    detail: { ...auditShape(payment), description: payment.description, email_subject: payment.email_subject, flagged: payment.flagged },
  });
  return { ok: true };
}

/* ------------------------------------------------------------- mark paid */

/** "arindam.m@studio1hq.com" → "Arindam". */
function senderName(email: string) {
  const part = email.split("@")[0].split(/[._+-]/)[0] ?? "";
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : "Studio1";
}

/** The "we've paid you" email; plain words, no buttons. */
export function paidEmail(payment: Payment, paid: { amount: number; reference: string; by: string }) {
  const month = isMonthKey(payment.month) ? monthLabel(payment.month) : "";
  // The name and description may have come from an emailed invoice's subject:
  // nothing a sender typed there becomes a link in Studio1's email.
  const description = withoutLinks(payment.description);
  const what = description ? ` (${description})` : "";
  const reference = paid.reference ? ` The payment reference is ${withoutLinks(paid.reference)}.` : "";
  const body = [
    `Hi ${firstName(withoutLinks(payment.name))},`,
    `We've paid your invoice${month ? ` for ${month}` : ""}${what}: ${formatMoney(paid.amount, payment.currency)}.${reference}`,
    "It can take a day or two to show in your account, depending on your bank. If anything looks off, just reply to this email.",
    `Thanks,\n${senderName(paid.by)}\nStudio1`,
  ].join("\n\n");
  const subject = `Payment sent${month ? ` for ${month}` : ""}`;
  const { html, text } = renderEmail({
    body,
    reason: "You're getting this because you sent Studio1 an invoice.",
    section: "Payments",
    hideBanner: true,
    program: month || undefined,
  });
  return { subject, html, text };
}

/**
 * Marks a payment paid (or, for money coming in, received). For money going
 * out, `notify` emails the payee from studio1hq.com, with replies to the
 * admin. The payment stays paid even if the email fails; the result says so.
 */
export async function markPaid(
  id: string,
  input: { amount: unknown; paidOn: unknown; reference: unknown; notify: unknown },
  by: string,
): Promise<TeamResult & { emailed?: boolean }> {
  const payment = await getPayment(id);
  if (!payment) return { ok: false, message: "That payment isn't there any more." };
  if (payment.status === "paid") return { ok: false, message: "It's already marked paid." };
  if (payment.status === "cancelled") return { ok: false, message: "It's cancelled. Put it back to due first." };
  const amount = parseAmount(input.amount);
  if (amount === null || Number.isNaN(amount) || amount <= 0) return { ok: false, message: "Add the amount paid." };
  const today = istNow().date;
  const paidOn = isDateKey(input.paidOn) ? input.paidOn : today;
  if (paidOn > today) return { ok: false, message: "The paid date can't be in the future." };
  const reference = shortText(input.reference, 80);

  const result = await updateRows(
    PAYMENTS,
    new URLSearchParams({ id: `eq.${id}`, status: "eq.due" }),
    {
      status: "paid",
      amount,
      paid_on: paidOn,
      paid_by: by,
      paid_reference: reference || null,
      updated_at: new Date().toISOString(),
    },
  );
  if (!result.ok) return failure(result.message, "marking a payment paid");
  if (!result.count) return { ok: false, message: "Someone else just changed it. Reload and check." };
  await audit({
    actor: by,
    area: "payments",
    action: payment.direction === "in" ? "received" : "paid",
    subject: id,
    detail: { name: payment.name, amount, currency: payment.currency, billed: payment.amount, paid_on: paidOn, reference: reference || null },
  });

  const word = payment.direction === "in" ? "received" : "paid";
  if (input.notify !== true || payment.direction !== "out" || !payment.email) {
    return { ok: true, message: `Marked ${word}.` };
  }
  if (!isMailerConfigured()) {
    return { ok: true, emailed: false, message: `Marked ${word}. No email went out: RESEND_API_KEY isn't set.` };
  }
  try {
    const email = paidEmail(payment, { amount, reference, by });
    const sent = await sendMail({ to: payment.email, replyTo: by, ...email });
    if (sent.id) {
      await updateRows(PAYMENTS, new URLSearchParams({ id: `eq.${id}` }), { paid_email_id: sent.id });
    }
    return { ok: true, emailed: true, message: `Marked paid and emailed ${payment.email}.` };
  } catch (error) {
    console.error(`[payments] the paid email to ${payment.email} failed`, error);
    return { ok: true, emailed: false, message: `Marked paid, but the email to ${payment.email} didn't send.` };
  }
}

/* ---------------------------------------------------------------- totals */

export type PaymentTotals =
  | {
      ok: true;
      /** Payments still to make. */
      toPay: number;
      toPayByCurrency: Record<string, number>;
      /** Money sponsors still owe. */
      toReceive: number;
      toReceiveByCurrency: Record<string, number>;
      /** Due payments that need a look (unknown sender, no amount, …). */
      flagged: number;
      /** Marked paid with a paid date in this IST month. */
      paidThisMonth: number;
    }
  | { ok: false; missing: boolean };

/** The overview's numbers. */
export async function paymentTotals(): Promise<PaymentTotals> {
  const month = monthOf(istNow().date);
  const [due, paid] = await Promise.all([
    selectRows(
      PAYMENTS,
      new URLSearchParams({ select: "amount,currency,direction,flagged", status: "eq.due", limit: "5000" }),
    ),
    selectRows(
      PAYMENTS,
      new URLSearchParams({ select: "id", status: "eq.paid", paid_on: `gte.${monthStart(month)}`, limit: "1" }),
      { count: true },
    ),
  ]);
  if (!due.ok || !paid.ok) {
    const message = !due.ok ? due.message : !paid.ok ? paid.message : "";
    const missing = isMissingTable(message);
    if (!missing) console.error(`[payments] totals failed: ${message}`);
    return { ok: false, missing };
  }
  const totals = {
    toPay: 0,
    toPayByCurrency: {} as Record<string, number>,
    toReceive: 0,
    toReceiveByCurrency: {} as Record<string, number>,
    flagged: 0,
  };
  for (const row of due.rows) {
    const amount = row.amount === null || row.amount === undefined ? 0 : Number(row.amount);
    const currency = typeof row.currency === "string" ? row.currency : "INR";
    const bucket = row.direction === "in" ? totals.toReceiveByCurrency : totals.toPayByCurrency;
    if (row.direction === "in") totals.toReceive += 1;
    else totals.toPay += 1;
    if (Number.isFinite(amount) && amount > 0) bucket[currency] = Math.round(((bucket[currency] ?? 0) + amount) * 100) / 100;
    if (typeof row.flagged === "string" && row.flagged) totals.flagged += 1;
  }
  return { ok: true, ...totals, paidThisMonth: paid.total ?? paid.rows.length };
}
