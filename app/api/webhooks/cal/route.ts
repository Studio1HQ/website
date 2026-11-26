import { NextResponse } from "next/server";
import {
  findOrgForBooking,
  upsertLeadFromBooking,
} from "@/lib/internal/inbound/data";
import {
  MAX_CAL_BODY_BYTES,
  parseCalWebhook,
  verifyCalSignature,
} from "@/lib/internal/inbound/webhooks";
import { notify } from "@/lib/internal/notifications/data";
import { readCapped } from "@/lib/internal/team/inbound";
import { OWNERS } from "@/lib/internal/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cal.com's booking webhooks (Cal.com -> Settings -> Developer -> Webhooks,
 * pointing here, with the secret in CAL_WEBHOOK_SECRET). Cal.com signs the
 * raw body with HMAC-SHA256 in X-Cal-Signature-256; without the secret set,
 * or with a wrong signature, the answer is a bare 401 and nothing is read.
 *
 *   BOOKING_CREATED, BOOKING_RESCHEDULED  the booker becomes a lead
 *     (lib/internal/inbound/data.ts, upsertLeadFromBooking)
 *   MEETING_ENDED  the founders get a bell notice asking for call notes
 *   anything else  acknowledged and ignored
 *
 * Nothing from the request is ever echoed back.
 */

const OK = () => NextResponse.json({ ok: true });

export async function POST(request: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 401 });

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_CAL_BODY_BYTES)
    return new Response(null, { status: 413 });
  const bytes = await readCapped(request, MAX_CAL_BODY_BYTES).catch(() => null);
  if (!bytes) return new Response(null, { status: 413 });
  const raw = new TextDecoder().decode(bytes);
  if (
    !verifyCalSignature(raw, request.headers.get("x-cal-signature-256"), secret)
  ) {
    return new Response(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return OK();
  }
  const parsed = parseCalWebhook(body);
  if (!parsed.ok) return OK();
  const { booking } = parsed;

  if (
    booking.trigger === "BOOKING_CREATED" ||
    booking.trigger === "BOOKING_RESCHEDULED"
  ) {
    const result = await upsertLeadFromBooking(booking);
    if (!result.ok) {
      console.error(`[cal webhook] saving a booking failed: ${result.message}`);
      return new Response(null, { status: 500 });
    }
    return OK();
  }

  if (booking.trigger === "MEETING_ENDED") {
    const org = await findOrgForBooking(booking);
    if (!org || org === "error") return OK();
    await notify([...OWNERS], "webhook:cal", {
      kind: "call",
      title: "A call just ended: add your notes",
      body: org.name,
      href: `/inbound/${org.id}`,
    });
  }
  return OK();
}
