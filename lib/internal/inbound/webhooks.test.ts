import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseCalWebhook,
  verifyCalSignature,
} from "@/lib/internal/inbound/webhooks";

const SECRET = "cal-test-secret";
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

describe("verifyCalSignature", () => {
  const body = JSON.stringify({ triggerEvent: "BOOKING_CREATED" });

  it("accepts the HMAC-SHA256 of the raw body", () => {
    expect(verifyCalSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyCalSignature(body, sign(body).toUpperCase(), SECRET)).toBe(
      true,
    );
  });

  it("refuses another secret, another body and malformed headers", () => {
    expect(verifyCalSignature(body, sign(body, "other"), SECRET)).toBe(false);
    expect(verifyCalSignature(body + " ", sign(body), SECRET)).toBe(false);
    expect(verifyCalSignature(body, "", SECRET)).toBe(false);
    expect(verifyCalSignature(body, null, SECRET)).toBe(false);
    expect(verifyCalSignature(body, "abc", SECRET)).toBe(false);
    expect(verifyCalSignature(body, "z".repeat(64), SECRET)).toBe(false);
  });

  it("refuses everything without a secret", () => {
    expect(verifyCalSignature(body, sign(body, ""), "")).toBe(false);
    expect(verifyCalSignature(body, sign(body), undefined)).toBe(false);
  });
});

const created = {
  triggerEvent: "BOOKING_CREATED",
  createdAt: "2026-11-26T08:00:00.000Z",
  payload: {
    type: "30min",
    title: "30 min between Arindam and Priya Sharma",
    additionalNotes: "We launch in January.",
    startTime: "2026-11-30T10:00:00Z",
    endTime: "2026-11-30T10:30:00Z",
    organizer: {
      name: "Arindam",
      email: "arindam@studio1hq.com",
      timeZone: "Asia/Kolkata",
    },
    responses: {
      name: { label: "your_name", value: "Priya Sharma", isHidden: false },
      email: {
        label: "email_address",
        value: "Priya@Acme.dev",
        isHidden: false,
      },
      company: { label: "Company name", value: "Acme Cloud", isHidden: false },
      what_do_you_need: {
        label: "what_do_you_need",
        value: "Launch content for our SDK",
      },
      budget_known: { label: "Do you have a budget?", value: true },
      location: { value: { value: "integrations:daily", optionValue: "" } },
      guests: { label: "additional_guests", value: [] },
      secret_field: { label: "hidden", value: "do not show", isHidden: true },
    },
    attendees: [
      {
        email: "priya@acme.dev",
        name: "Priya Sharma",
        timeZone: "Asia/Kolkata",
        language: { locale: "en" },
      },
    ],
    uid: "booking-abc123",
    bookingId: 4821,
  },
};

describe("parseCalWebhook", () => {
  it("reads a new booking", () => {
    const result = parseCalWebhook(created);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.booking).toMatchObject({
      trigger: "BOOKING_CREATED",
      bookingUid: "booking-abc123",
      startTime: "2026-11-30T10:00:00Z",
      endTime: "2026-11-30T10:30:00Z",
      attendeeName: "Priya Sharma",
      attendeeEmail: "priya@acme.dev",
      companyName: "Acme Cloud",
    });
    expect(result.booking.answers).toBe(
      [
        "Company name: Acme Cloud",
        "What do you need: Launch content for our SDK",
        "Do you have a budget?: Yes",
        "Additional notes: We launch in January.",
      ].join("\n"),
    );
    expect(result.booking.answers).not.toContain("do not show");
  });

  it("reads a reschedule and a cancellation", () => {
    for (const trigger of [
      "BOOKING_RESCHEDULED",
      "BOOKING_CANCELLED",
    ] as const) {
      const result = parseCalWebhook({ ...created, triggerEvent: trigger });
      expect(result.ok && result.booking.trigger).toBe(trigger);
    }
  });

  it("reads a flat MEETING_ENDED payload", () => {
    const result = parseCalWebhook({
      triggerEvent: "MEETING_ENDED",
      uid: "booking-abc123",
      startTime: "2026-11-30T10:00:00Z",
      endTime: "2026-11-30T10:30:00Z",
      attendees: [{ email: "priya@acme.dev", name: "Priya Sharma" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.booking.trigger).toBe("MEETING_ENDED");
      expect(result.booking.attendeeEmail).toBe("priya@acme.dev");
    }
  });

  it("reads a nested MEETING_ENDED payload with no attendee", () => {
    const result = parseCalWebhook({
      triggerEvent: "MEETING_ENDED",
      payload: { uid: "u1" },
    });
    expect(result.ok).toBe(true);
  });

  it("ignores triggers it doesn't use", () => {
    expect(
      parseCalWebhook({
        triggerEvent: "FORM_SUBMITTED",
        payload: { uid: "x" },
      }),
    ).toEqual({ ok: false, reason: "ignored" });
    expect(parseCalWebhook({ triggerEvent: "PING_TEST" })).toEqual({
      ok: false,
      reason: "ignored",
    });
    expect(parseCalWebhook(null)).toEqual({ ok: false, reason: "ignored" });
    expect(parseCalWebhook("text")).toEqual({ ok: false, reason: "ignored" });
  });

  it("calls a booking without a uid or an attendee invalid", () => {
    expect(
      parseCalWebhook({
        triggerEvent: "BOOKING_CREATED",
        payload: { attendees: [{ email: "a@b.co", name: "A" }] },
      }),
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      parseCalWebhook({
        triggerEvent: "BOOKING_CREATED",
        payload: { uid: "u", attendees: [{ email: "nope", name: "A" }] },
      }),
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("keeps outside text plain and capped", () => {
    const result = parseCalWebhook({
      ...created,
      payload: {
        ...created.payload,
        attendees: [
          { email: "p@acme.dev", name: "<b>Priya</b>\u0000" + "x".repeat(500) },
        ],
        responses: { company: { label: "Company", value: "A".repeat(5000) } },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.booking.attendeeName.length).toBeLessThanOrEqual(120);
    expect(result.booking.attendeeName).not.toContain("\u0000");
    expect(result.booking.companyName.length).toBeLessThanOrEqual(140);
    expect(result.booking.answers.length).toBeLessThanOrEqual(4000);
  });
});
