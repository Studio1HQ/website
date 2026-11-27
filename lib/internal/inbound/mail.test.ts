import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The leads mailbox end to end: Resend's received email in, the stored row
// out. A sender can write any header, so what is stored as proof of the
// sender must come from Resend's own verdict and nothing else.
vi.mock(
  "@/lib/supabase-server",
  async () => (await import("@/lib/internal/team/test-db")).fakeSupabase,
);
vi.mock("@/lib/internal/team/audit", () => ({ audit: vi.fn(async () => {}) }));

const { db } = await import("@/lib/internal/team/test-db");
const { handleLeadsEmail } = await import("@/lib/internal/inbound/mail");

const FORGED = "mx.studio1hq.com; dmarc=pass header.from=prospect.example";

function resendAnswers(email: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(email)),
  );
}

async function receive(email: Record<string, unknown>) {
  resendAnswers({
    from: "Mallory <mallory@prospect.example>",
    subject: "Launch help",
    text: "We want help.",
    ...email,
  });
  const saved = await handleLeadsEmail({ email_id: "em_1" });
  expect(saved.ok).toBe(true);
  return db.rows("inbound_mail")[0];
}

beforeEach(() => {
  db.reset();
  vi.stubEnv("RESEND_INBOUND_KEY", "re_test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("mail kept for the sorter", () => {
  it("stores no Authentication-Results header and is not verified without Resend's pass", async () => {
    const row = await receive({
      headers: {
        "Message-ID": "<a@prospect.example>",
        "Authentication-Results": FORGED,
      },
    });
    expect(row.headers).toEqual({});
    expect(row.sender_verified).toBe(false);
  });

  it("keeps a forged header out of a pair list too, and the first of several values", async () => {
    const row = await receive({
      headers: [
        { name: "Message-ID", value: "<b@prospect.example>" },
        { name: "Authentication-Results", value: FORGED },
        { name: "Precedence", value: "bulk" },
        { name: "Precedence", value: "list" },
      ],
      authentication: { spf: "pass", dkim: "pass", dmarc: "fail" },
    });
    expect(row.headers).toEqual({ precedence: "bulk" });
    expect(row.sender_verified).toBe(false);
  });

  it("is verified only when Resend's own DMARC verdict is pass", async () => {
    const pass = await receive({
      headers: { "Message-ID": "<c@prospect.example>" },
      authentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
    });
    expect(pass.sender_verified).toBe(true);
    db.reset();
    const shaped = await receive({
      headers: { "Message-ID": "<d@prospect.example>" },
      authentication: { dmarc: { result: "pass" } },
    });
    expect(shaped.sender_verified).toBe(true);
  });

  it("is not verified for none, softfail or a missing verdict", async () => {
    for (const authentication of [
      { dmarc: "none" },
      { dmarc: "softfail" },
      { dmarc: null },
      { spf: "pass", dkim: "pass" },
      null,
    ]) {
      db.reset();
      const row = await receive({
        headers: { "Message-ID": `<e${String(authentication)}@x>` },
        authentication,
      });
      expect(row.sender_verified).toBe(false);
    }
  });

  it("is not verified when Resend's full email cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const saved = await handleLeadsEmail({
      email_id: "em_2",
      from: "mallory@prospect.example",
      subject: "Hi",
    });
    expect(saved.ok).toBe(true);
    expect(db.rows("inbound_mail")[0].sender_verified).toBe(false);
  });
});
