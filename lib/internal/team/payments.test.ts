import { describe, expect, it } from "vitest";
import { cleanPayee, cleanPayment, paidEmail } from "@/lib/internal/team/payments";
import type { Payee, Payment } from "@/lib/internal/team/shared";

const payee: Payee = {
  id: "8d1f3c3e-1c1e-4c55-9f53-0f6a3c1b2a10",
  code: "WR-07",
  name: "Priya Sharma",
  email: "priya@example.com",
  kind: "writer",
  notes: "",
  active: true,
};

const payment: Payment = {
  id: "5b8e1f0a-7d55-4f86-8a4e-55a0ad3e1b22",
  created_at: "2026-11-02T10:00:00Z",
  created_by: "email",
  payee_id: payee.id,
  name: "Priya Sharma",
  email: "priya@example.com",
  code: "WR-07",
  kind: "writer",
  direction: "out",
  month: "2026-11",
  description: "3 blog posts",
  amount: 12500,
  currency: "INR",
  status: "due",
  source: "email",
  email_subject: "Invoice | Priya Sharma | WR-07 | Nov 2026",
  flagged: null,
  invoice_path: null,
  invoice_name: null,
  paid_on: null,
  paid_by: null,
  paid_reference: null,
  note: "",
};

describe("payees", () => {
  it("upper-cases codes and checks them", () => {
    expect(cleanPayee({ code: " wr-07 ", name: "Priya Sharma", email: "Priya@Example.com", kind: "writer" })).toMatchObject({
      ok: true,
      payee: { code: "WR-07", email: "priya@example.com", kind: "writer", active: true },
    });
    expect(cleanPayee({ code: "W", name: "Priya" }).ok).toBe(false);
    expect(cleanPayee({ code: "WR 07", name: "Priya" }).ok).toBe(false);
    expect(cleanPayee({ code: "WR-07", name: "Priya", email: "nope" }).ok).toBe(false);
  });
});

describe("payments typed by hand", () => {
  it("fills in from the payee picked", () => {
    expect(cleanPayment({ payee_id: payee.id, month: "2026-11", amount: "12,500", currency: "INR" }, payee)).toMatchObject({
      ok: true,
      payment: { name: "Priya Sharma", email: "priya@example.com", code: "WR-07", kind: "writer", direction: "out", amount: 12500 },
    });
  });

  it("treats sponsors as money coming in unless told otherwise", () => {
    expect(cleanPayment({ name: "Acme", kind: "sponsor", month: "2026-11" }, null)).toMatchObject({
      ok: true,
      payment: { direction: "in", amount: null },
    });
    expect(cleanPayment({ name: "Acme", kind: "sponsor", direction: "out", month: "2026-11" }, null)).toMatchObject({
      ok: true,
      payment: { direction: "out" },
    });
  });

  it("refuses what doesn't add up", () => {
    expect(cleanPayment({ name: "Acme", month: "2026-13" }, null).ok).toBe(false);
    expect(cleanPayment({ name: "Acme", month: "2026-11", amount: "twelve" }, null).ok).toBe(false);
    expect(cleanPayment({ name: "", month: "2026-11" }, null).ok).toBe(false);
    expect(cleanPayment({ payee_id: payee.id, month: "2026-11" }, null).ok).toBe(false);
  });
});

describe("the paid email", () => {
  it("says what was paid, for which month, with the reference", () => {
    const email = paidEmail(payment, { amount: 12500, reference: "UTR123", by: "arindam@studio1hq.com" });
    expect(email.subject).toBe("Payment sent for November 2026");
    expect(email.text).toContain("Hi Priya,");
    expect(email.text).toContain("₹12,500");
    expect(email.text).toContain("UTR123");
    expect(email.text).toContain("Arindam");
    expect(email.html).toContain("Payments");
    expect(email.html).not.toContain("/og/email/");
  });
});
