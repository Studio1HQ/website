import { beforeEach, describe, expect, it, vi } from "vitest";

// Payment status changes against an in-memory database; no email leaves.
vi.mock("@/lib/supabase-server", async () => (await import("@/lib/internal/team/test-db")).fakeSupabase);
vi.mock("@/lib/mailer", () => ({ isMailerConfigured: () => false, sendMail: vi.fn() }));

const { db } = await import("@/lib/internal/team/test-db");
const { deletePayment, markPaid, setPaymentStatus, updatePayment } = await import("@/lib/internal/team/payments");

const ADMIN = "arindam@studio1hq.com";
const ID = "5b8e1f0a-7d55-4f86-8a4e-55a0ad3e1b22";
const edit = {
  payee_id: null,
  name: "Priya Sharma",
  email: null,
  code: null,
  kind: "writer" as const,
  direction: "out" as const,
  month: "2026-11",
  description: "3 posts",
  amount: 9000,
  currency: "INR",
  note: "",
};

const payment = () => db.rows("payments")[0];
const pay = () => markPaid(ID, { amount: "12,500", paidOn: null, reference: "UTR123", notify: false }, ADMIN);

beforeEach(() => {
  db.reset();
  db.add("payments", { id: ID, name: "Priya Sharma", month: "2026-11-01", amount: 12500, source: "email", created_by: "email" });
});

describe("payment status", () => {
  it("marks a due payment paid once", async () => {
    expect((await pay()).ok).toBe(true);
    expect(payment()).toMatchObject({ status: "paid", paid_by: ADMIN, paid_reference: "UTR123" });
    expect((await pay()).ok).toBe(false);
  });

  it("won't pay a cancelled one until it's due again", async () => {
    await setPaymentStatus(ID, "cancelled", ADMIN);
    expect((await pay()).ok).toBe(false);
    await setPaymentStatus(ID, "due", ADMIN);
    expect((await pay()).ok).toBe(true);
  });

  it("keeps a paid one as it was paid", async () => {
    await pay();
    expect((await updatePayment(ID, edit, ADMIN)).ok).toBe(false);
    expect((await deletePayment(ID, ADMIN)).ok).toBe(false);
    expect((await setPaymentStatus(ID, "cancelled", ADMIN)).ok).toBe(false);
    expect(payment()).toMatchObject({ status: "paid", amount: 12500 });
  });

  it("remembers who had paid it when that's undone", async () => {
    await pay();
    expect((await setPaymentStatus(ID, "due", ADMIN)).ok).toBe(true);
    expect(payment()).toMatchObject({ status: "due", paid_on: null, paid_by: null });
    expect(payment().note).toContain(`by ${ADMIN}`);
    expect(payment().note).toContain("UTR123");
    expect(db.rows("team_audit").map((row) => row.action)).toEqual(["paid", "undone"]);
  });

  it("lets an emailed invoice that isn't paid be edited or deleted", async () => {
    expect((await updatePayment(ID, edit, ADMIN)).ok).toBe(true);
    expect(payment().amount).toBe(9000);
    expect((await deletePayment(ID, ADMIN)).ok).toBe(true);
    expect(db.rows("payments")).toHaveLength(0);
    expect(db.rows("team_audit").at(-1)).toMatchObject({ action: "deleted", actor: ADMIN });
  });

  it("still works when the audit table isn't there yet", async () => {
    db.fail("team_audit");
    expect((await pay()).ok).toBe(true);
    expect(payment().status).toBe("paid");
  });
});
