import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Saving delivery states and unsubscribing talk to Supabase; these tests stop before that.
vi.mock("@/lib/email-delivery", () => ({ recordDelivery: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/unsubscribe", () => ({ unsubscribe: vi.fn(async () => ({ ok: true })) }));

const { POST } = await import("@/app/api/resend/webhook/route");
const { recordDelivery } = await import("@/lib/email-delivery");

const SECRET = `whsec_${Buffer.from("test-signing-key").toString("base64")}`;

function signed(body: string, options: { secret?: string; timestamp?: number } = {}) {
  const id = "msg_1";
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
});
