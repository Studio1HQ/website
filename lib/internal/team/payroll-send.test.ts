import { beforeEach, describe, expect, it, vi } from "vitest";

// Sending a payslip reads and writes four tables, makes a PDF and emails it.
// Here the database is in memory, the PDF is a stub and no email leaves.
vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);
vi.mock("@/lib/mailer", () => ({
  isMailerConfigured: () => true,
  sendMail: vi.fn(async () => ({ id: "resend-1" })),
}));
vi.mock("@/lib/email-delivery", () => ({
  recordAccepted: vi.fn(async () => undefined),
  logEmails: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/internal/team/payslip-pdf", () => ({
  payslipPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
  payslipFileName: () => "Payslip.pdf",
}));

const { db } = await import("@/lib/internal/team/test-db");
const { claimsTotal, payrollMonth, savePayslip, sendPayslip } = await import("@/lib/internal/team/payroll");
const { sendMail } = await import("@/lib/mailer");
const { istNow, monthOf, monthStart, shiftMonth } = await import("@/lib/internal/team/shared");

const ADMIN = "arindam@studio1hq.com";
const EMAIL = "priya@studio1hq.com";
const MONTH = monthOf(istNow().date);

const slip = () => db.rows("team_payslips").find((row) => row.email === EMAIL);
const claim = () => db.rows("team_reimbursements")[0];

beforeEach(() => {
  db.reset();
  vi.mocked(sendMail).mockClear();
  db.add("team_people", {
    email: EMAIL,
    name: "Priya Sharma",
    joined_on: "2025-01-06",
    earnings: [{ label: "Basic", amount: 50000 }],
    deductions: [{ label: "Professional tax", amount: 200 }],
  });
  db.add("team_reimbursements", { email: EMAIL, amount: 1200, status: "approved", month: monthStart(MONTH), description: "Cab" });
});

describe("a payslip's claims", () => {
  it("count approved and already-paid claims in rupees, nothing else", () => {
    expect(
      claimsTotal([
        { status: "approved", currency: "INR", amount: 1200 },
        { status: "paid", currency: "INR", amount: 300.5 },
        { status: "approved", currency: "USD", amount: 40 },
        { status: "submitted", currency: "INR", amount: 999 },
        { status: "rejected", currency: "INR", amount: 999 },
      ]),
    ).toBe(1500.5);
  });
});

describe("emailing a payslip", () => {
  it("sends it once, marks it sent and the claim paid", async () => {
    expect(await sendPayslip(EMAIL, MONTH, ADMIN)).toEqual({ ok: true, status: "sent" });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(slip()).toMatchObject({ status: "sent", net: 51000, reimbursement: 1200, sent_by: ADMIN, resend_id: "resend-1" });
    expect(claim().status).toBe("paid");

    // "Email all" again, or a second click: nothing more goes out.
    expect(await sendPayslip(EMAIL, MONTH, ADMIN)).toMatchObject({ ok: true, status: "skipped" });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("keeps the reimbursement when a sent slip is edited and emailed again", async () => {
    await sendPayslip(EMAIL, MONTH, ADMIN);
    const edited = await savePayslip(
      EMAIL,
      MONTH,
      { earnings: [{ label: "Basic", amount: 52000 }], deductions: [{ label: "Professional tax", amount: 200 }], lopDays: 0, saveDefaults: false },
      ADMIN,
    );
    expect(edited).toEqual({ ok: true });
    // Back to a draft, with the claim it already paid still on it.
    expect(slip()).toMatchObject({ status: "draft", sent_at: null, reimbursement: 1200, net: 53000 });

    const month = await payrollMonth(MONTH);
    expect(month.ok && month.rows[0].figures).toMatchObject({ reimbursement: 1200, net: 53000 });

    expect(await sendPayslip(EMAIL, MONTH, ADMIN)).toEqual({ ok: true, status: "sent" });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(slip()).toMatchObject({ status: "sent", reimbursement: 1200, net: 53000 });
    expect(claim().status).toBe("paid");
  });

  it("doesn't go out twice when two people send at once", async () => {
    // Someone else's send has the slip: saved as a draft and held a moment ago.
    db.add("team_payslips", {
      email: EMAIL,
      month: monthStart(MONTH),
      earnings: [{ label: "Basic", amount: 50000 }],
      deductions: [],
      reimbursement: 1200,
      net: 51200,
      lop_days: 0,
      sent_at: new Date().toISOString(),
      sent_by: "amitesh@studio1hq.com",
    });
    const result = await sendPayslip(EMAIL, MONTH, ADMIN);
    expect(result.ok).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
    expect(slip()?.sent_by).toBe("amitesh@studio1hq.com");
  });

  it("takes over a hold left by a send that died", async () => {
    db.add("team_payslips", {
      email: EMAIL,
      month: monthStart(MONTH),
      earnings: [{ label: "Basic", amount: 50000 }],
      deductions: [],
      lop_days: 0,
      sent_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    });
    expect(await sendPayslip(EMAIL, MONTH, ADMIN)).toEqual({ ok: true, status: "sent" });
  });

  it("frees the slip when the email fails", async () => {
    vi.mocked(sendMail).mockRejectedValueOnce(new Error("resend is down"));
    expect((await sendPayslip(EMAIL, MONTH, ADMIN)).ok).toBe(false);
    expect(slip()).toMatchObject({ status: "draft", sent_at: null });
    expect(claim().status).toBe("approved");
    // The next try goes through.
    expect(await sendPayslip(EMAIL, MONTH, ADMIN)).toEqual({ ok: true, status: "sent" });
  });

  it("says so when the email went out but the slip couldn't be marked sent", async () => {
    db.failUpdates((table, patch) => table === "team_payslips" && patch.status === "sent");
    const result = await sendPayslip(EMAIL, MONTH, ADMIN);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("went out");
    expect(sendMail).toHaveBeenCalledTimes(1);
    // The claim isn't marked paid on a slip that isn't marked sent, and the
    // hold stays so "email all" doesn't send it again straight away.
    expect(claim().status).toBe("approved");
    db.failUpdates(null);
    expect((await sendPayslip(EMAIL, MONTH, ADMIN)).ok).toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("stops when attendance can't be read, instead of assuming no loss of pay", async () => {
    db.fail("team_attendance");
    const result = await sendPayslip(EMAIL, MONTH, ADMIN);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("attendance");
    expect(sendMail).not.toHaveBeenCalled();
    expect(await payrollMonth(MONTH)).toMatchObject({ ok: false });
  });

  it("works loss of pay out from unpaid leave", async () => {
    db.add("team_attendance", { email: EMAIL, day: `${MONTH}-03`, kind: "leave", leave_type: "unpaid", logged_by: ADMIN });
    const month = await payrollMonth(MONTH);
    expect(month.ok && month.rows[0]).toMatchObject({ attendanceLop: 1, figures: { lop_days: 1 } });
  });

  it("won't email a full month to someone who joined part-way, until their slip is saved", async () => {
    db.rows("team_people")[0].joined_on = `${MONTH}-15`;
    const month = await payrollMonth(MONTH);
    expect(month.ok && month.rows[0].check).toContain("Joined on");
    expect((await sendPayslip(EMAIL, MONTH, ADMIN)).ok).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();

    await savePayslip(
      EMAIL,
      MONTH,
      { earnings: [{ label: "Basic", amount: 26000 }], deductions: [], lopDays: 0, saveDefaults: false },
      ADMIN,
    );
    expect(await sendPayslip(EMAIL, MONTH, ADMIN)).toEqual({ ok: true, status: "sent" });
  });

  it("never runs ahead of this month", async () => {
    const next = shiftMonth(MONTH, 1);
    expect((await sendPayslip(EMAIL, next, ADMIN)).ok).toBe(false);
    expect((await savePayslip(EMAIL, next, { earnings: [], deductions: [], lopDays: 0, saveDefaults: false }, ADMIN)).ok).toBe(false);
  });

  it("leaves a trail", async () => {
    await sendPayslip(EMAIL, MONTH, ADMIN);
    expect(db.rows("team_audit").map((row) => row.action)).toContain("payslip-sent");
  });
});
