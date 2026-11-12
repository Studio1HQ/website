import { createHmac, timingSafeEqual } from "node:crypto";
import { recordDelivery, type DeliveryStatus } from "@/lib/email-delivery";
import { unsubscribe } from "@/lib/unsubscribe";

/**
 * Resend's delivery events (set up in Resend → Webhooks, pointing here):
 * each one updates `email_delivery`, which the dashboard shows on the entry
 * and the senders check before emailing an address again. A spam complaint
 * also turns off that person's email updates.
 *
 * Resend signs with Svix: HMAC-SHA256 over "id.timestamp.body", keyed with
 * the base64 part of the whsec_ signing secret (RESEND_WEBHOOK_SECRET).
 * Any non-2xx answer makes Resend retry later.
 */

const STATUS_BY_EVENT: Record<string, DeliveryStatus> = {
  "email.scheduled": "scheduled",
  "email.sent": "sent",
  "email.delivery_delayed": "delayed",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
};

/** How old a signed request may be before it's refused as a replay. */
const TOLERANCE_SECONDS = 5 * 60;

function signatureMatches(secret: string, id: string, timestamp: string, header: string, body: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return header.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type ResendEvent = {
  type?: unknown;
  data?: {
    email_id?: unknown;
    to?: unknown;
    bounce?: { type?: unknown; subType?: unknown; message?: unknown };
    failed?: { reason?: unknown };
  };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("RESEND_WEBHOOK_SECRET isn't set", { status: 503 });

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  const body = await request.text();
  if (!id || !timestamp || !signature || body.length > 200_000) {
    return new Response("Bad request", { status: 400 });
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
    return new Response("Stale request", { status: 400 });
  }
  if (!signatureMatches(secret, id, timestamp, signature, body)) {
    return new Response("Bad signature", { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  let status = typeof event.type === "string" ? STATUS_BY_EVENT[event.type] : undefined;
  const resendId = event.data?.email_id;
  const to = Array.isArray(event.data?.to) ? event.data.to[0] : undefined;
  // Opens, clicks and anything else we don't track: acknowledge and move on.
  if (!status || typeof resendId !== "string" || typeof to !== "string") {
    return new Response(null, { status: 204 });
  }

  let detail: string | null = null;
  if (status === "bounced") {
    const bounce = event.data?.bounce;
    // A temporary bounce (full mailbox, greylisting) isn't a dead address.
    if (bounce?.type === "Transient") status = "delayed";
    detail = [bounce?.type, bounce?.subType, bounce?.message]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" · ")
      .slice(0, 500) || null;
  } else if (status === "failed" && typeof event.data?.failed?.reason === "string") {
    detail = event.data.failed.reason.slice(0, 500);
  }

  const result = await recordDelivery({ resendId, to, status, detail });
  if (!result.ok) {
    console.error(`[resend webhook] saving ${event.type} for ${resendId} failed: ${result.message}`);
    return new Response("Couldn't save the event", { status: 500 });
  }
  if (status === "complained") {
    const unsubscribed = await unsubscribe(to);
    if (!unsubscribed.ok) console.error(`[resend webhook] unsubscribing a complaint failed: ${unsubscribed.message}`);
  }
  return new Response(null, { status: 204 });
}
