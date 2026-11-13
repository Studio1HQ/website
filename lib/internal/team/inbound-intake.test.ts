import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The intake end to end, with the database in memory and Resend's Receiving
// API answered by a stub: what gets saved, what gets flagged, what's turned away.
vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);

const { db } = await import("@/lib/internal/team/test-db");
const { addressedToIntake, handleReceivedEmail, readCapped } = await import("@/lib/internal/team/inbound");

type Mail = { from: string; subject: string; text?: string; dmarc?: string; to?: string[] };

let counter = 0;
const mails = new Map<string, Mail>();

/** Hands an email to the intake as Resend would: the webhook's summary, then the full email over the API. */
function receive(mail: Mail) {
  const id = `mail-${++counter}`;
  mails.set(id, mail);
  return handleReceivedEmail({ email_id: id, from: mail.from, subject: mail.subject, to: mail.to, attachments: [] });
}

beforeEach(() => {
  db.reset();
  mails.clear();
  vi.stubEnv("RESEND_INBOUND_KEY", "re_test");
  vi.stubEnv("SLACK_WEBHOOK_URL", "");
  vi.stubEnv("SLACK_WEBHOOK_URL_PAYMENTS", "");
  vi.stubEnv("INBOUND_EMAIL_ADDRESS", "bills@studio1hq.com");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const id = decodeURIComponent(String(url).split("/emails/receiving/")[1] ?? "");
      const mail = mails.get(id);
      if (!mail) return new Response("not found", { status: 404 });
      return Response.json({
        from: mail.from,
        subject: mail.subject,
        text: mail.text ?? "Amount: ₹12,500",
        authentication: { spf: "pass", dkim: "pass", dmarc: mail.dmarc ?? "pass" },
      });
    }),
  );
  db.add("payees", { code: "WR-07", name: "Priya Sharma", email: "priya@example.com", kind: "writer" });
  db.add("payees", { code: "WR-08", name: "Noor Khan", email: null, kind: "writer" });
  db.add("team_people", { email: "dev@studio1hq.com", name: "Dev Rao", employee_code: "S1-012" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const payment = () => db.rows("payments")[0];
const turnedAway = () => db.rows("team_audit").filter((row) => row.area === "intake");

describe("emailed invoices", () => {
  it("takes one from the payee's own address without a flag", async () => {
    const result = await receive({ from: "Priya <priya@example.com>", subject: "Invoice | Priya Sharma | WR-07 | Nov 2026", to: ["bills@studio1hq.com"] });
    // No PDF in this test's emails, which is the only thing it's marked for.
    expect(result).toMatchObject({ ok: true, kind: "invoice", flagged: "No invoice attached" });
    expect(payment()).toMatchObject({ name: "Priya Sharma", email: "priya@example.com", amount: 12500, source: "email" });
  });

  it("flags a payee's code used from another address", async () => {
    await receive({ from: "someone@evil.example", subject: "Invoice | Priya Sharma | WR-07 | Nov 2026" });
    expect(payment().flagged).toContain("not Priya Sharma's address");
  });

  it("flags a code whose payee has no address to check the sender against", async () => {
    // Their own domain, so DMARC passes: only the missing address gives it away.
    await receive({ from: "someone@evil.example", subject: "Invoice | Noor Khan | WR-08 | Nov 2026" });
    expect(payment()).toMatchObject({ name: "Noor Khan", email: "someone@evil.example" });
    expect(payment().flagged).toContain("no email on file");
  });

  it("flags a sender who can't be verified", async () => {
    await receive({ from: "priya@example.com", subject: "Invoice | WR-07 | Nov 2026", dmarc: "none" });
    expect(payment().flagged).toContain("no DMARC pass");
  });

  it("flags mail that wasn't sent to the intake address, and keeps it", async () => {
    await receive({ from: "priya@example.com", subject: "Invoice | WR-07 | Nov 2026", to: ["careers@studio1hq.com"] });
    expect(payment().flagged).toContain("intake address");
  });

  it("strips link markup from what the sender typed", async () => {
    await receive({
      from: '"[Pay here](https://evil.example)" <stranger@evil.example>',
      subject: "Invoice | Nov 2026 | [Confirm bank details](https://evil.example/x)",
    });
    expect(payment().description).not.toMatch(/[\[\]()]/);
    expect(payment().name).not.toMatch(/[\[\]()]/);
  });

  it("turns a flood from one address away, and says so", async () => {
    for (let index = 0; index < 5; index += 1) {
      await receive({ from: "stranger@evil.example", subject: `Invoice | Nov 2026 | job ${index}` });
    }
    expect(db.rows("payments")).toHaveLength(5);
    const sixth = await receive({ from: "stranger@evil.example", subject: "Invoice | Nov 2026 | one more" });
    expect(sixth).toMatchObject({ ok: true });
    expect("skipped" in sixth).toBe(true);
    expect(db.rows("payments")).toHaveLength(5);
    expect(turnedAway()).toHaveLength(1);
    expect(turnedAway()[0]).toMatchObject({ action: "skipped", actor: "stranger@evil.example" });
  });

  it("saves a retried webhook once", async () => {
    mails.set("same", { from: "priya@example.com", subject: "Invoice | WR-07 | Nov 2026" });
    const data = { email_id: "same", from: "priya@example.com", subject: "Invoice | WR-07 | Nov 2026", attachments: [] };
    await handleReceivedEmail(data);
    expect(await handleReceivedEmail(data)).toMatchObject({ ok: true, duplicate: true });
    expect(db.rows("payments")).toHaveLength(1);
  });
});

describe("emailed expense claims", () => {
  it("files one from a verified person on the team list", async () => {
    const result = await receive({ from: "dev@studio1hq.com", subject: "Reimbursement | Dev Rao | S1-012 | Nov 2026", text: "Cab to the venue\nAmount: ₹840" });
    expect(result).toMatchObject({ ok: true, kind: "reimbursement" });
    expect(db.rows("team_reimbursements")[0]).toMatchObject({ email: "dev@studio1hq.com", amount: 840, source: "email", status: "submitted" });
    expect(turnedAway()).toHaveLength(0);
  });

  it("turns away a claim whose sender isn't verified, where an admin can see it", async () => {
    const result = await receive({ from: "dev@studio1hq.com", subject: "Reimbursement | Dev Rao | S1-012 | Nov 2026", dmarc: "none" });
    expect("skipped" in result).toBe(true);
    expect(db.rows("team_reimbursements")).toHaveLength(0);
    expect(turnedAway()[0]).toMatchObject({ actor: "dev@studio1hq.com", subject: "Reimbursement | Dev Rao | S1-012 | Nov 2026" });
    expect(String((turnedAway()[0].detail as { reason: string }).reason)).toContain("DMARC");
  });

  it("turns away a claim from someone who isn't on the team list", async () => {
    const result = await receive({ from: "stranger@example.com", subject: "Expense claim | Nov 2026" });
    expect("skipped" in result).toBe(true);
    expect(db.rows("team_reimbursements")).toHaveLength(0);
    expect(turnedAway()).toHaveLength(1);
  });
});

describe("who the mail was for", () => {
  it("looks through To, Cc and Bcc", () => {
    expect(addressedToIntake({ to: ["Bills <bills@studio1hq.com>"] }, "bills@studio1hq.com")).toBe(true);
    expect(addressedToIntake({ to: ["a@x.com"], cc: ["BILLS@studio1hq.com"] }, "bills@studio1hq.com")).toBe(true);
    expect(addressedToIntake({ to: ["careers@studio1hq.com"] }, "bills@studio1hq.com")).toBe(false);
  });

  it("can't tell without an address or a recipient list", () => {
    expect(addressedToIntake({ to: ["a@x.com"] }, "")).toBeNull();
    expect(addressedToIntake({}, "bills@studio1hq.com")).toBeNull();
  });
});

describe("reading a download", () => {
  it("stops at the size limit", async () => {
    expect(await readCapped(new Response(new Uint8Array(50)), 100)).toHaveLength(50);
    expect(await readCapped(new Response(new Uint8Array(500)), 100)).toBeNull();
    expect(await readCapped(new Response("x", { headers: { "content-length": "999999" } }), 100)).toBeNull();
  });
});
