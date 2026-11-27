import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The database calls are stubs; the parsing and signature rules are tested in lib/internal/inbound.
vi.mock("@/lib/internal/inbound/data", () => ({
  upsertLeadFromBooking: vi.fn(async () => ({
    ok: true,
    orgId: "o1",
    created: true,
    queued: true,
  })),
  findOrgForBooking: vi.fn(async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Acme",
    stage: "call_booked",
    source: "inbound_call",
  })),
}));
vi.mock("@/lib/internal/notifications/data", () => ({
  notify: vi.fn(async () => undefined),
}));

const { POST } = await import("@/app/api/webhooks/cal/route");
const { upsertLeadFromBooking } = await import("@/lib/internal/inbound/data");
const { notify } = await import("@/lib/internal/notifications/data");

const SECRET = "cal-route-secret";

function request(body: string, signature?: string | null) {
  const sig =
    signature === undefined
      ? createHmac("sha256", SECRET).update(body).digest("hex")
      : signature;
  return new Request("https://www.studio1hq.com/api/webhooks/cal", {
    method: "POST",
    headers: sig ? { "x-cal-signature-256": sig } : {},
    body,
  });
}

const booking = (triggerEvent: string) =>
  JSON.stringify({
    triggerEvent,
    payload: {
      uid: "u1",
      startTime: "2026-11-30T10:00:00Z",
      attendees: [{ email: "priya@acme.dev", name: "Priya" }],
    },
  });

describe("Cal.com webhook", () => {
  beforeEach(() => {
    vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
    vi.mocked(upsertLeadFromBooking).mockClear();
    vi.mocked(notify).mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("answers 401 with nothing in it for a bad or missing signature", async () => {
    for (const response of [
      await POST(request(booking("BOOKING_CREATED"), "0".repeat(64))),
      await POST(request(booking("BOOKING_CREATED"), null)),
    ]) {
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("");
    }
    expect(upsertLeadFromBooking).not.toHaveBeenCalled();
  });

  it("answers 401 when no secret is set", async () => {
    vi.stubEnv("CAL_WEBHOOK_SECRET", "");
    expect((await POST(request(booking("BOOKING_CREATED")))).status).toBe(401);
  });

  it("makes a lead of a new or moved booking", async () => {
    for (const trigger of ["BOOKING_CREATED", "BOOKING_RESCHEDULED"]) {
      expect((await POST(request(booking(trigger)))).status).toBe(200);
    }
    expect(upsertLeadFromBooking).toHaveBeenCalledTimes(2);
  });

  it("tells the founders when a booking names a company that is not inbound", async () => {
    vi.mocked(upsertLeadFromBooking).mockResolvedValueOnce({
      ok: true,
      orgId: "22222222-2222-4222-8222-222222222222",
      created: false,
      queued: false,
      needsPerson: {
        orgId: "22222222-2222-4222-8222-222222222222",
        orgName: "Acme",
      },
    });
    expect((await POST(request(booking("BOOKING_CREATED")))).status).toBe(200);
    expect(notify).toHaveBeenCalledTimes(1);
    const [to, actor, notice] = vi.mocked(notify).mock.calls[0];
    expect([...to].length).toBeGreaterThan(0);
    expect(actor).toBe("webhook:cal");
    expect(notice.kind).toBe("call");
    expect(notice.href).toBe("/outreach/22222222-2222-4222-8222-222222222222");
    expect(notice.body).toContain("Acme");
    expect(notice.body).toContain("Priya");
    expect(notice.body).toContain("priya@acme.dev");
    expect(`${notice.title} ${notice.body}`).not.toMatch(/[\u2013\u2014!]/);
  });

  it("stays quiet for a booking that was saved as a lead", async () => {
    expect((await POST(request(booking("BOOKING_CREATED")))).status).toBe(200);
    expect(notify).not.toHaveBeenCalled();
  });

  it("asks the founders for call notes when a meeting ends", async () => {
    expect((await POST(request(booking("MEETING_ENDED")))).status).toBe(200);
    expect(notify).toHaveBeenCalledTimes(1);
    const [, , notice] = vi.mocked(notify).mock.calls[0];
    expect(notice.href).toBe("/inbound/11111111-1111-4111-8111-111111111111");
  });

  it("acknowledges and ignores other triggers and cancellations", async () => {
    for (const trigger of ["PING", "BOOKING_CANCELLED"]) {
      expect((await POST(request(booking(trigger)))).status).toBe(200);
    }
    expect(upsertLeadFromBooking).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("answers 500 when saving fails, so Cal.com can see it", async () => {
    vi.mocked(upsertLeadFromBooking).mockResolvedValueOnce({
      ok: false,
      message: "db down",
    });
    const response = await POST(request(booking("BOOKING_CREATED")));
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });
});
