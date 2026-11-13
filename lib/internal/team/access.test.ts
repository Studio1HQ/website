import { describe, expect, it } from "vitest";
import { cantChange, cantLog } from "@/lib/internal/team/access";
import { istNow, monthOf, shiftMonth } from "@/lib/internal/team/shared";

const today = istNow().date;
const month = monthOf(today);
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const employee = { email: "e@studio1hq.com", kind: "employee" as const, reviewer: null, active: true };
const intern = { email: "i@studio1hq.com", kind: "intern" as const, reviewer: "r@studio1hq.com", active: true };
const self = { email: "e@studio1hq.com", roles: [], interns: [] };
const reviewer = { email: "r@studio1hq.com", roles: [], interns: ["i@studio1hq.com"] };
const admin = { email: "a@studio1hq.com", roles: ["admin" as const], interns: [] };

describe("which dates someone can log", () => {
  it("opens an employee's window on the 1st of last month and shuts it today", () => {
    const first = `${shiftMonth(month, -1)}-01`;
    expect(cantLog(self, employee, first, "work")).toBeNull();
    expect(cantLog(self, employee, addDays(first, -1), "work")).not.toBeNull();
    expect(cantLog(self, employee, today, "work")).toBeNull();
    expect(cantLog(self, employee, addDays(today, 1), "work")).not.toBeNull();
  });

  it("lets leave be planned four months ahead, no further", () => {
    expect(cantLog(self, employee, addDays(today, 120), "leave")).toBeNull();
    expect(cantLog(self, employee, addDays(today, 121), "leave")).not.toBeNull();
  });

  it("gives a reviewer three months back for their own interns only", () => {
    const first = `${shiftMonth(month, -3)}-01`;
    expect(cantLog(reviewer, intern, first, "work")).toBeNull();
    expect(cantLog(reviewer, intern, addDays(first, -1), "work")).not.toBeNull();
    expect(cantLog(reviewer, employee, today, "work")).not.toBeNull();
    // Named as the reviewer on the row, but no longer on their list (the intern left).
    expect(cantLog({ ...reviewer, interns: [] }, intern, today, "work")).not.toBeNull();
  });

  it("refuses someone who's left, and an intern logging their own day", () => {
    expect(cantLog(self, { ...employee, active: false }, today, "work")).not.toBeNull();
    expect(cantLog({ email: intern.email, roles: [], interns: [] }, intern, today, "work")).toBe("Your reviewer logs your days.");
  });

  it("lets an admin log anyone, any date", () => {
    expect(cantLog(admin, employee, "2020-01-01", "work")).toBeNull();
    expect(cantLog(admin, { ...intern, active: false }, addDays(today, 400), "leave")).toBeNull();
  });
});

describe("what's already logged", () => {
  const mine = { logged_by: self.email, leave_type: null };

  it("lets someone fix their own entry", () => {
    expect(cantChange(self, null, false)).toBeNull();
    expect(cantChange(self, mine, false)).toBeNull();
    expect(cantChange(self, { ...mine, leave_type: "paid" }, false)).toBeNull();
  });

  it("keeps an entry an admin made, and any unpaid leave, as they are", () => {
    expect(cantChange(self, { logged_by: admin.email, leave_type: null }, false)).not.toBeNull();
    expect(cantChange(self, { ...mine, leave_type: "unpaid" }, false)).not.toBeNull();
  });

  it("locks every day of a month whose payslip is made", () => {
    expect(cantChange(self, null, true)).not.toBeNull();
    expect(cantChange(reviewer, { logged_by: reviewer.email, leave_type: null }, true)).not.toBeNull();
  });

  it("never stops an admin", () => {
    expect(cantChange(admin, { logged_by: self.email, leave_type: "unpaid" }, true)).toBeNull();
  });
});
