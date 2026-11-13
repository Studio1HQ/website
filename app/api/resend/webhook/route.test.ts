import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Saving delivery states and unsubscribing talk to Supabase; these tests stop before that.
vi.mock("@/lib/email-delivery", () => ({ recordDelivery: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/unsubscribe", () => ({ unsubscribe: vi.fn(async () => ({ ok: true })) }));

// The intake itself is tested in lib/internal/team/inbound-intake.test.ts; here it's a stub.
vi.mock("@/lib/internal/team/inbound", async (original) => ({
  ...(await original<typeof import("@/lib/internal/team/inbound")>()),
  handleReceivedEmail: vi.fn(async () => ({ ok: true, kind: "invoice", id: "p1" })),
}));

const { POST } = await import("@/app/api/resend/webhook/route");
const { recordDelivery } = await import("@/lib/email-delivery");
const { handleReceivedEmail } = await import("@/lib/internal/team/inbound");

const SECRET = `whsec_${Buffer.from("test-signing-key").toString("base64")}`;

let messages = 0;

function signed(body: string, options: { secret?: string; timestamp?: number; id?: string } = {}) {
  const id = options.id ?? `msg_${++messages}`;
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const key = Buffer.from((options.secret ?? SECRET).replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("https://www.studio1hq.com/api/resend/webhook", {
    method: "POST",
    headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` },
    body,
  });
}

describe("Resend webhook", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    vi.mocked(recordDelivery).mockClear();
    vi.mocked(handleReceivedEmail).mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is off until the secret is set", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    expect((await POST(signed("{}"))).status).toBe(503);
  });

  it("refuses unsigned, stale and wrongly signed requests", async () => {
    const unsigned = new Request("https://www.studio1hq.com/api/resend/webhook", { method: "POST", body: "{}" });
    expect((await POST(unsigned)).status).toBe(400);
    expect((await POST(signed("{}", { timestamp: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(400);
    const forged = `whsec_${Buffer.from("someone-else").toString("base64")}`;
    expect((await POST(signed('{"type":"email.bounced"}', { secret: forged }))).status).toBe(401);
    expect(recordDelivery).not.toHaveBeenCalled();
  });

  it("records a signed delivery event", async () => {
    const body = JSON.stringify({ type: "email.delivered", data: { email_id: "e1", to: ["ada@example.com"] } });
    expect((await POST(signed(body))).status).toBe(204);
    expect(recordDelivery).toHaveBeenCalledWith({ resendId: "e1", to: "ada@example.com", status: "delivered", detail: null });
  });

  it("acknowledges events it doesn't track", async () => {
    const body = JSON.stringify({ type: "email.opened", data: { email_id: "e1", to: ["ada@example.com"] } });
    expect((await POST(signed(body))).status).toBe(204);
    expect(recordDelivery).not.toHaveBeenCalled();
  });

  it("refuses a body that's too big before reading it", async () => {
    const request = signed("{}");
    request.headers.set("content-length", "5000000");
    expect((await POST(request)).status).toBe(413);
    expect((await POST(signed(JSON.stringify({ type: "email.opened", pad: "x".repeat(250_000) })))).status).toBe(413);
  });

  it("hands a received email to the intake", async () => {
    const data = { email_id: "in1", from: "priya@example.com", subject: "Invoice | WR-07 | Nov 2026" };
    expect((await POST(signed(JSON.stringify({ type: "email.received", data })))).status).toBe(204);
    expect(handleReceivedEmail).toHaveBeenCalledWith(data);
    expect(recordDelivery).not.toHaveBeenCalled();
  });

  it("asks Resend to try again when the intake couldn't finish, and lets that retry through", async () => {
    const body = JSON.stringify({ type: "email.received", data: { email_id: "in2", subject: "Invoice" } });
    vi.mocked(handleReceivedEmail).mockResolvedValueOnce({ ok: false, retry: true, message: "Resend returned 503" });
    expect((await POST(signed(body, { id: "msg_retry" }))).status).toBe(500);
    // Resend retries under the same message id.
    expect((await POST(signed(body, { id: "msg_retry" }))).status).toBe(204);
    expect(handleReceivedEmail).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry an email the intake turned away or can't ever save", async () => {
    const body = JSON.stringify({ type: "email.received", data: { email_id: "in3", subject: "Hello" } });
    vi.mocked(handleReceivedEmail).mockResolvedValueOnce({ ok: true, skipped: "Subject isn't an invoice or claim" });
    expect((await POST(signed(body))).status).toBe(204);
    vi.mocked(handleReceivedEmail).mockResolvedValueOnce({ ok: false, retry: false, message: "The team migration hasn't run" });
    expect((await POST(signed(body))).status).toBe(204);
  });

  it("handles a replayed request once", async () => {
    const body = JSON.stringify({ type: "email.delivered", data: { email_id: "e9", to: ["ada@example.com"] } });
    expect((await POST(signed(body, { id: "msg_replay" }))).status).toBe(204);
    expect((await POST(signed(body, { id: "msg_replay" }))).status).toBe(204);
    expect(recordDelivery).toHaveBeenCalledTimes(1);
  });
});
