import { inList, insertRows, selectRows, upsertRows } from "@/lib/supabase-server";

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

/** Applies one delivery event, unless the email already has a later state. */
export async function recordDelivery(event: {
  resendId: string;
  to: string;
  status: DeliveryStatus;
  detail?: string | null;
}): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const current = await selectRows<{ status: DeliveryStatus }>(
    "email_delivery",
    new URLSearchParams({ select: "status", resend_id: `eq.${event.resendId}`, limit: "1" }),
  );
  if (!current.ok) return { ok: false, message: current.message };
  const previous = current.rows[0]?.status;
  if (previous && RANK[previous] > RANK[event.status]) return { ok: true, changed: false };
  const result = await upsertRows(
    "email_delivery",
    [
      {
        resend_id: event.resendId,
        to_email: event.to.toLowerCase(),
        status: event.status,
        detail: event.detail ?? null,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "resend_id" },
  );
  return result.ok ? { ok: true, changed: true } : result;
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
 * (no resend_id or scheduled_for column), it logs them without those.
 */
export async function logEmails(rows: Record<string, unknown>[]) {
  const first = await insertRows("internal_email_log", rows);
  if (first.ok || !/resend_id|scheduled_for/.test(first.message)) return first;
  return insertRows(
    "internal_email_log",
    rows.map(({ resend_id: _id, scheduled_for: _when, ...row }) => row),
  );
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
