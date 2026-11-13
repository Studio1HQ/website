import { createHash } from "node:crypto";
import { inList, insertRows, selectRows, updateRows, upsertRows } from "@/lib/supabase-server";

/**
 * What happened to each email after Resend accepted it, from Resend's
 * webhook (app/api/resend/webhook), kept in `email_delivery`. The senders
 * record "sent" or "scheduled" themselves; the webhook moves it on.
 *
 * Addresses that bounced, marked an email as spam, or sit on Resend's
 * suppression list are blocked: the forms and the dashboard skip them, so a
 * dead address can't keep hurting the sending domains' reputation.
 *
 * Every read fails open: if the table is missing (migration
 * 20261112150000_email_delivery.sql not run yet), sending works as before.
 */

export type DeliveryStatus =
  | "scheduled"
  | "sent"
  | "delayed"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed"
  | "canceled";

export type Delivery = { status: DeliveryStatus; detail: string | null; updated_at: string };

export const BLOCKING_STATUSES: DeliveryStatus[] = ["bounced", "complained", "suppressed"];

/**
 * Webhooks can arrive out of order (delivered before sent), so a status only
 * replaces one of a lower rank. Final states share the top rank, so a spam
 * complaint still lands after "delivered".
 */
const RANK: Record<DeliveryStatus, number> = {
  scheduled: 0,
  sent: 1,
  delayed: 2,
  delivered: 3,
  bounced: 4,
  complained: 4,
  failed: 4,
  suppressed: 4,
  canceled: 4,
};

/** Notes emails Resend just accepted. Never overwrites a webhook's update. */
export async function recordAccepted(
  emails: { resendId: string | null; to: string }[],
  status: "sent" | "scheduled",
) {
  const rows = emails
    .filter((email): email is { resendId: string; to: string } => Boolean(email.resendId))
    .map((email) => ({ resend_id: email.resendId, to_email: email.to.toLowerCase(), status }));
  const result = await upsertRows("email_delivery", rows, { onConflict: "resend_id", keepExisting: true });
  if (!result.ok) console.error(`[email-delivery] recording sent emails failed: ${result.message}`);
}

/**
 * Applies one delivery event, unless the email already has a later state.
 * The rank check happens inside the UPDATE's own filter, not in a read
 * beforehand, so two events arriving together can't put an earlier state
 * back over a later one.
 */
export async function recordDelivery(event: {
  resendId: string;
  to: string;
  status: DeliveryStatus;
  detail?: string | null;
}): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const row = {
    resend_id: event.resendId,
    to_email: event.to.toLowerCase(),
    status: event.status,
    detail: event.detail ?? null,
    updated_at: new Date().toISOString(),
  };
  // Only a row whose state this event may replace matches.
  const replaceable = (Object.keys(RANK) as DeliveryStatus[]).filter((status) => RANK[status] <= RANK[event.status]);
  const update = () =>
    updateRows(
      "email_delivery",
      new URLSearchParams({ resend_id: `eq.${event.resendId}`, status: inList(replaceable) }),
      row,
      "resend_id",
    );

  const first = await update();
  if (!first.ok) return first;
  if (first.count > 0) return { ok: true, changed: true };

  // No match: the email has no row yet, or it has a later state. Add the
  // row if it's missing (an existing one is left alone), then try once
  // more, in case another event added an earlier state in between.
  const added = await upsertRows("email_delivery", [row], { onConflict: "resend_id", keepExisting: true });
  if (!added.ok) return added;
  const second = await update();
  if (!second.ok) return second;
  return { ok: true, changed: second.count > 0 };
}

/** The blocked addresses among `emails` (lowercased), with why. */
export async function blockedAddresses(emails: string[]): Promise<Map<string, Delivery>> {
  const blocked = new Map<string, Delivery>();
  const addresses = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!addresses.length) return blocked;
  const found = await selectRows<Delivery & { to_email: string }>(
    "email_delivery",
    new URLSearchParams({
      select: "to_email,status,detail,updated_at",
      to_email: inList(addresses),
      status: inList(BLOCKING_STATUSES),
      order: "updated_at.desc",
    }),
  );
  if (!found.ok) {
    console.error(`[email-delivery] checking blocked addresses failed: ${found.message}`);
    return blocked;
  }
  for (const row of found.rows) {
    if (!blocked.has(row.to_email)) {
      blocked.set(row.to_email, { status: row.status, detail: row.detail, updated_at: row.updated_at });
    }
  }
  return blocked;
}

/** Delivery state per Resend id, for the entry page's email list. */
export async function deliveriesFor(resendIds: string[]): Promise<Map<string, Delivery>> {
  const deliveries = new Map<string, Delivery>();
  const ids = [...new Set(resendIds.filter(Boolean))];
  if (!ids.length) return deliveries;
  const found = await selectRows<Delivery & { resend_id: string }>(
    "email_delivery",
    new URLSearchParams({ select: "resend_id,status,detail,updated_at", resend_id: inList(ids) }),
  );
  if (!found.ok) return deliveries;
  for (const row of found.rows) {
    deliveries.set(row.resend_id, { status: row.status, detail: row.detail, updated_at: row.updated_at });
  }
  return deliveries;
}

/**
 * Adds rows to internal_email_log. If the delivery migration hasn't run yet
 * (no resend_id or scheduled_for column), it logs them without those. An
 * email that's already in the log (same Resend id) isn't added again: a
 * retried send that Resend answered from its idempotency key went out once,
 * so it's listed once.
 */
export async function logEmails(rows: Record<string, unknown>[]) {
  const ids = rows.map((row) => row.resend_id).filter((id): id is string => typeof id === "string" && id !== "");
  let fresh = rows;
  if (ids.length) {
    const logged = await selectRows<{ resend_id: string }>(
      "internal_email_log",
      new URLSearchParams({ select: "resend_id", resend_id: inList(ids) }),
    );
    if (logged.ok && logged.rows.length) {
      const seen = new Set(logged.rows.map((row) => row.resend_id));
      fresh = rows.filter((row) => typeof row.resend_id !== "string" || !seen.has(row.resend_id));
    }
  }
  const first = await insertRows("internal_email_log", fresh);
  if (first.ok || !/resend_id|scheduled_for/.test(first.message)) return first;
  return insertRows(
    "internal_email_log",
    fresh.map(({ resend_id: _id, scheduled_for: _when, ...row }) => row),
  );
}

/** The most one teammate can send from the dashboard in an hour. */
export const HOURLY_SEND_CAP = 300;

/**
 * How many more emails this teammate can send this hour, from the email
 * log. A brake on a runaway script or a stolen session, far above a normal
 * day's sending. If the log can't be read, sending carries on.
 */
export async function sendsLeftThisHour(sentBy: string, now = Date.now()) {
  const counted = await selectRows(
    "internal_email_log",
    new URLSearchParams({
      select: "id",
      sent_by: `eq.${sentBy}`,
      created_at: `gte.${new Date(now - 60 * 60 * 1000).toISOString()}`,
      limit: "1",
    }),
    { count: true },
  );
  if (!counted.ok) {
    console.error(`[email-delivery] counting this hour's emails failed: ${counted.message}`);
    return HOURLY_SEND_CAP;
  }
  return Math.max(0, HOURLY_SEND_CAP - (counted.total ?? 0));
}

/**
 * Resend's idempotency key for a send from the dashboard: the same sender,
 * recipients, text and send time always give the same key, so a retry after
 * a timeout, or a double click, can't send the email twice (Resend keeps
 * keys for 24 hours). `nonce` comes from the open composer: closing it and
 * starting again gives a new one, so sending the same reminder twice on
 * purpose still works.
 */
export function sendKey(parts: {
  sender: string;
  table: string;
  ids: string[];
  subject: string;
  body: string;
  extra?: (string | null | undefined)[];
  nonce?: string;
}) {
  const payload = JSON.stringify([
    parts.sender.toLowerCase(),
    parts.table,
    [...new Set(parts.ids.map((id) => id.toLowerCase()))].sort(),
    parts.subject,
    parts.body,
    (parts.extra ?? []).map((item) => item ?? ""),
    parts.nonce ?? "",
  ]);
  return `dash-${createHash("sha256").update(payload).digest("hex").slice(0, 48)}`;
}

/** A composer's nonce: a short token, or nothing. */
export function cleanNonce(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : undefined;
}

/** Resend holds scheduled email for up to 30 days. */
const MAX_SCHEDULE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A "send later" time from the composer: undefined means now. Returns an
 * error for times in the past, under two minutes away, or past 30 days.
 */
export function parseSendAt(value: unknown): { ok: true; at?: string } | { ok: false; message: string } {
  if (value === undefined || value === null || value === "") return { ok: true };
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(time)) return { ok: false, message: "Pick a valid time to send it." };
  const ahead = time - Date.now();
  if (ahead < 2 * 60 * 1000) return { ok: false, message: "Pick a time at least a few minutes from now." };
  if (ahead > MAX_SCHEDULE_MS - 60 * 60 * 1000) return { ok: false, message: "Emails can be scheduled up to 30 days ahead." };
  return { ok: true, at: new Date(time).toISOString() };
}

/** Short words for a delivery state, shown on the entry page. */
export function blockedReason(delivery: Delivery) {
  if (delivery.status === "complained") return "marked one of our emails as spam";
  if (delivery.status === "bounced") return "bounced";
  return "is on Resend's suppression list";
}
