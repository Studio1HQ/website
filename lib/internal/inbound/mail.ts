import "server-only";
import { recordInboundMail } from "@/lib/internal/inbound/data";
import { headerValue } from "@/lib/internal/inbound/rules";
import {
  addressedToIntake,
  dmarcPassed,
  htmlToText,
  parseFrom,
  readReceivedEmail,
} from "@/lib/internal/team/inbound";

/**
 * Mail sent to the leads address (INBOUND_LEADS_ADDRESS, an address that
 * forwards contact@ here) arrives through the same Resend `email.received`
 * webhook as invoices (app/api/resend/webhook/route.ts). It is only stored
 * (lib/internal/inbound/data.ts, recordInboundMail): the worker sorts it
 * later, so nothing else happens here.
 */

/** As much of an HTML body as is read when a mail has no text part. */
const MAX_HTML_CHARS = 200_000;

/**
 * Whether the webhook's mail was sent to the leads address. False when no
 * address is set (INBOUND_EMAIL_ADDRESS, the invoice intake's, must never
 * stand in for it) or when the webhook lists no recipients.
 */
export function addressedToLeads(meta: Record<string, unknown>): boolean {
  const address = process.env.INBOUND_LEADS_ADDRESS?.trim();
  if (!address) return false;
  return addressedToIntake(meta, address) === true;
}

export type LeadsMailResult =
  | { ok: true; skipped?: string }
  | { ok: false; message: string; retry: boolean };

/** Reads the received mail from Resend and stores it. `retry` asks the webhook to answer 500, so Resend tries again. */
export async function handleLeadsEmail(
  data: unknown,
): Promise<LeadsMailResult> {
  const meta = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const emailId = typeof meta.email_id === "string" ? meta.email_id : null;
  if (!emailId) return { ok: true, skipped: "No email id in the webhook" };

  const full = await readReceivedEmail(emailId);
  if (!full.ok && full.retry)
    return {
      ok: false,
      retry: true,
      message: `Resend returned ${full.status} for the email`,
    };
  // Without a key or access, the webhook's own fields (sender, subject) are still stored.
  const email = full.ok ? full.email : {};

  const from = parseFrom(email.from ?? meta.from);
  const html = typeof email.html === "string" ? email.html : "";
  const body =
    typeof email.text === "string" && email.text.trim()
      ? email.text
      : html
        ? htmlToText(html.slice(0, MAX_HTML_CHARS))
        : "";
  const messageId =
    headerValue(email.headers, "message-id").trim() ||
    (typeof email.message_id === "string" ? email.message_id : "") ||
    (typeof meta.message_id === "string" ? meta.message_id : "") ||
    `resend:${emailId}`;

  const saved = await recordInboundMail({
    messageId,
    fromAddress: from.address,
    fromName: from.name,
    subject: typeof email.subject === "string" ? email.subject : meta.subject,
    headers: email.headers,
    bodyText: body,
    // Only Resend's own DMARC verdict counts. Without the full email (no key,
    // no access) there is no verdict, so this is false.
    senderVerified: dmarcPassed(email.authentication),
  });
  if (!saved.ok) return { ok: false, retry: true, message: saved.message };
  return saved.skipped ? { ok: true, skipped: saved.skipped } : { ok: true };
}
