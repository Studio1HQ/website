import { createHmac, timingSafeEqual } from "node:crypto";
import {
  normalizeEmail,
  oneLineText,
  plainText,
} from "@/lib/internal/inbound/rules";

/**
 * Cal.com webhooks: checking the signature and reading the payload into one
 * small object. Pure (no database, no request), so it's tested
 * (webhooks.test.ts) and the route stays short.
 *
 * Cal.com signs the raw request body with HMAC-SHA256, keyed by the
 * webhook's secret, and sends the hex digest in X-Cal-Signature-256.
 */

/** Cal.com's own request is small; anything bigger isn't a booking. */
export const MAX_CAL_BODY_BYTES = 200_000;

/**
 * Whether the header is the HMAC-SHA256 (hex) of the raw body under the
 * secret. Compared in constant time; any malformed header is a no.
 */
export function verifyCalSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string | null | undefined,
) {
  if (!secret || !header) return false;
  const given = header
    .trim()
    .toLowerCase()
    .replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/.test(given)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(Buffer.from(given, "hex"), expected);
}

export const CAL_TRIGGERS = [
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
  "MEETING_ENDED",
] as const;
export type CalTrigger = (typeof CAL_TRIGGERS)[number];

export type CalBooking = {
  trigger: CalTrigger;
  /** Cal.com's id for the booking: the same across a reschedule's webhooks of one booking. */
  bookingUid: string;
  /** ISO times as Cal.com sent them; "" when missing. */
  startTime: string;
  endTime: string;
  attendeeName: string;
  /** Lowercased; "" when missing. */
  attendeeEmail: string;
  /** The company named in the booking form, if it has such a question; "" otherwise. */
  companyName: string;
  /** What the booker answered, as plain text: one "Question: answer" line each. */
  answers: string;
};

export type CalParse =
  | { ok: true; booking: CalBooking }
  | { ok: false; reason: "ignored" | "invalid" };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** An answer as text: strings, numbers, yes or no, and lists of those. */
function answerText(value: unknown): string {
  if (typeof value === "string") return oneLineText(value, 1000);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return oneLineText(value.map(answerText).filter(Boolean).join(", "), 1000);
  }
  const option = record(value);
  return option && "value" in option ? answerText(option.value) : "";
}

/** "what_is_this_about" → "What is this about". Real labels pass through. */
function questionLabel(key: string, label: unknown) {
  const text = typeof label === "string" && label.trim() ? label.trim() : key;
  const spaced = /^[a-z0-9_]+$/.test(text) ? text.replace(/_/g, " ") : text;
  const line = oneLineText(spaced, 120);
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** Booking form fields that are the booker's contact details or setup, not answers. */
const NOT_ANSWERS = new Set([
  "name",
  "email",
  "location",
  "guests",
  "reschedulereason",
  "smsremindernumber",
  "attendeephonenumber",
]);

const COMPANY_QUESTION =
  /compan|organi[sz]ation|startup|business|employer|\bteam\b/i;

function readAnswers(payload: Record<string, unknown>) {
  const lines: string[] = [];
  let companyName = "";
  const seen = new Set<string>();
  const fields = [
    record(payload.responses),
    record(payload.userFieldsResponses),
  ];
  for (const fieldSet of fields) {
    if (!fieldSet) continue;
    for (const [key, entry] of Object.entries(fieldSet)) {
      if (NOT_ANSWERS.has(key.toLowerCase()) || seen.has(key)) continue;
      const field = record(entry);
      if (field?.isHidden === true) continue;
      const value = answerText(field ? field.value : entry);
      if (!value) continue;
      seen.add(key);
      const label = questionLabel(key, field?.label);
      lines.push(`${label}: ${value}`);
      if (
        !companyName &&
        (COMPANY_QUESTION.test(key) || COMPANY_QUESTION.test(label))
      ) {
        companyName = oneLineText(value, 140);
      }
    }
  }
  const notes = plainText(payload.additionalNotes, 2000);
  if (notes && !seen.has("notes"))
    lines.push(`Additional notes: ${oneLineText(notes, 1000)}`);
  return { answers: plainText(lines.join("\n"), 4000), companyName };
}

/**
 * Reads a Cal.com webhook body (already parsed JSON). BOOKING_CREATED,
 * BOOKING_RESCHEDULED and BOOKING_CANCELLED carry a nested `payload`;
 * MEETING_ENDED may be flat (its fields at the top) or nested, so both are
 * read. Any other trigger is "ignored", not an error. "invalid" means a
 * known trigger without what it needs: a booking uid, and for a new or
 * moved booking an attendee with an email address.
 */
export function parseCalWebhook(body: unknown): CalParse {
  const top = record(body);
  const trigger =
    top && typeof top.triggerEvent === "string" ? top.triggerEvent : "";
  if (!(CAL_TRIGGERS as readonly string[]).includes(trigger))
    return { ok: false, reason: "ignored" };
  const payload = record(top?.payload) ?? top ?? {};

  const uid = oneLineText(
    payload.uid ??
      payload.bookingUid ??
      (typeof payload.bookingId === "number" ? String(payload.bookingId) : ""),
    120,
  );
  if (!uid) return { ok: false, reason: "invalid" };

  const attendees = Array.isArray(payload.attendees)
    ? payload.attendees.map(record).filter((item) => item !== null)
    : [];
  const responses = record(payload.responses);
  const firstAttendee = attendees[0] ?? null;
  const email =
    normalizeEmail(firstAttendee?.email ?? record(responses?.email)?.value) ??
    "";
  const name = oneLineText(
    firstAttendee?.name ?? record(responses?.name)?.value,
    120,
  );
  const needsAttendee =
    trigger === "BOOKING_CREATED" || trigger === "BOOKING_RESCHEDULED";
  if (needsAttendee && !email) return { ok: false, reason: "invalid" };

  const { answers, companyName } = readAnswers(payload);
  return {
    ok: true,
    booking: {
      trigger: trigger as CalTrigger,
      bookingUid: uid,
      startTime: oneLineText(payload.startTime, 40),
      endTime: oneLineText(payload.endTime, 40),
      attendeeName: name,
      attendeeEmail: email,
      companyName,
      answers,
    },
  };
}
