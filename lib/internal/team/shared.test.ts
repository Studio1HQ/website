import { describe, expect, it } from "vitest";
import { cantLog } from "@/lib/internal/team/access";
import { cleanDay } from "@/lib/internal/team/attendance";
import {
  cleanLines,
  cleanTime,
  dateRange,
  daysInMonth,
  displayName,
  formatMinutes,
  isDateKey,
  istNow,
  lopFor,
  minutesBetween,
  monthLabel,
  parseAmount,
  parseHours,
  shiftMonth,
} from "@/lib/internal/team/shared";

describe("time helpers", () => {
  it("cleans clock times", () => {
    expect(cleanTime("9:05")).toBe("09:05");
    expect(cleanTime("18:30:00")).toBe("18:30");
    expect(cleanTime("24:00")).toBeNull();
    expect(cleanTime("nope")).toBeNull();
  });

  it("measures start to end, past midnight too", () => {
    expect(minutesBetween("09:30", "18:00")).toBe(510);
    expect(minutesBetween("22:00", "01:30")).toBe(210);
    expect(minutesBetween("09:30", null)).toBeNull();
  });

  it("reads active hours the ways people type them", () => {
    expect(parseHours("7.5")).toBe(450);
    expect(parseHours("7:30")).toBe(450);
    expect(parseHours("7h 30m")).toBe(450);
    expect(parseHours("45m")).toBe(45);
    expect(parseHours("")).toBeNull();
    expect(parseHours("lots")).toBeNaN();
  });

  it("formats minutes", () => {
    expect(formatMinutes(450)).toBe("7h 30m");
    expect(formatMinutes(480)).toBe("8h");
    expect(formatMinutes(25)).toBe("25m");
    expect(formatMinutes(null)).toBe("—");
  });

  it("gives today in IST", () => {
    // 20:00 UTC on 13 Nov is 01:30 on 14 Nov in India.
    expect(istNow(new Date("2026-11-13T20:00:00Z"))).toEqual({ date: "2026-11-14", time: "01:30" });
  });
});

describe("date helpers", () => {
  it("knows real dates and months", () => {
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(dateRange("2026-11-27", "2026-12-02")).toHaveLength(6);
  });
});

describe("money", () => {
  it("parses amounts with symbols and commas", () => {
    expect(parseAmount("₹12,500.50")).toBe(12500.5);
    expect(parseAmount("Rs. 900")).toBe(900);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-5")).toBeNaN();
  });

  it("takes plain digits only", () => {
    expect(parseAmount("1250.5")).toBe(1250.5);
    expect(parseAmount(".5")).toBe(0.5);
    for (const odd of ["1e5", "0x10", "Infinity", "1.2.3", "12abc"]) expect(parseAmount(odd)).toBeNaN();
  });

  it("keeps only valid pay lines", () => {
    expect(
      cleanLines([
        { label: " Basic ", amount: "25,000" },
        { label: "", amount: 100 },
        { label: "HRA", amount: "x" },
      ]),
    ).toEqual([{ label: "Basic", amount: 25000 }]);
  });
});

describe("attendance", () => {
  it("counts loss of pay", () => {
    expect(lopFor({ kind: "leave", leave_type: "unpaid" })).toBe(1);
    expect(lopFor({ kind: "half_day", leave_type: "unpaid" })).toBe(0.5);
    expect(lopFor({ kind: "leave", leave_type: "paid" })).toBe(0);
  });

  it("checks a worked day", () => {
    const ok = cleanDay("a@studio1hq.com", { day: "2026-11-10", kind: "work", start_time: "09:30", end_time: "18:00" });
    expect(ok.ok && ok.day.active_minutes).toBe(510);
    const less = cleanDay("a@studio1hq.com", {
      day: "2026-11-10",
      kind: "work",
      start_time: "09:30",
      end_time: "18:00",
      active_hours: "7",
    });
    expect(less.ok && less.day.active_minutes).toBe(420);
    expect(cleanDay("a@studio1hq.com", { day: "2026-11-10", kind: "work" }).ok).toBe(false);
    expect(
      cleanDay("a@studio1hq.com", { day: "2026-11-10", kind: "work", start_time: "09:00", end_time: "10:00", active_hours: "3" }).ok,
    ).toBe(false);
    expect(cleanDay("a@studio1hq.com", { day: "2026-11-10", kind: "leave" }).ok).toBe(false);
  });

  it("names people without a name from their email", () => {
    expect(displayName({ name: "", email: "priya.sharma@studio1hq.com" })).toBe("Priya Sharma");
  });
});

describe("who can log whose days", () => {
  const today = istNow().date;
  const employee = { email: "e@studio1hq.com", kind: "employee" as const, reviewer: null, active: true };
  const intern = { email: "i@studio1hq.com", kind: "intern" as const, reviewer: "r@studio1hq.com", active: true };

  it("lets employees log their own recent days only", () => {
    const self = { email: "e@studio1hq.com", roles: [], interns: [] };
    expect(cantLog(self, employee, today, "work")).toBeNull();
    expect(cantLog(self, employee, "2020-01-01", "work")).not.toBeNull();
    expect(cantLog(self, intern, today, "work")).not.toBeNull();
  });

  it("lets reviewers log their interns, and admins anyone", () => {
    expect(cantLog({ email: "r@studio1hq.com", roles: [], interns: ["i@studio1hq.com"] }, intern, today, "work")).toBeNull();
    expect(cantLog({ email: "i@studio1hq.com", roles: [], interns: [] }, intern, today, "work")).toBe("Your reviewer logs your days.");
    expect(cantLog({ email: "x@studio1hq.com", roles: ["admin"], interns: [] }, employee, "2020-01-01", "work")).toBeNull();
  });
});
