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
  minutesSoFar,
  monthLabel,
  openSlot,
  parseAmount,
  parseHours,
  readSlots,
  shiftMonth,
  slotsLabel,
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

  it("checks a day worked in several slots", () => {
    const day = (input: Record<string, unknown>) => cleanDay("a@studio1hq.com", { day: "2026-11-10", kind: "work", ...input });
    const two = day({ slots: [{ start: "09:30", end: "13:00" }, { start: "16:00", end: "20:00" }] });
    expect(two.ok && two.day.slots).toEqual([{ start: "09:30", end: "13:00" }, { start: "16:00", end: "20:00" }]);
    // The first start and the last end, and the time in the slots, not between them.
    expect(two.ok && [two.day.start_time, two.day.end_time, two.day.active_minutes]).toEqual(["09:30", "20:00", 450]);
    // Blank rows from the form are dropped.
    const blank = day({ slots: [{ start: "09:30", end: "13:00" }, { start: "", end: "" }] });
    expect(blank.ok && blank.day.slots.length).toBe(1);
    // A last slot still going: the day has no end, and the earlier slots count so far.
    const open = day({ slots: [{ start: "09:30", end: "13:00" }, { start: "16:00", end: null }] });
    expect(open.ok && [open.day.end_time, open.day.active_minutes]).toEqual([null, 210]);
    // Only the last slot can be open, they can't overlap, and breaks can't add time.
    expect(day({ slots: [{ start: "09:30", end: "" }, { start: "16:00", end: "20:00" }] }).ok).toBe(false);
    expect(day({ slots: [{ start: "09:30", end: "13:00" }, { start: "12:00", end: "20:00" }] }).ok).toBe(false);
    expect(day({ slots: [{ start: "09:30", end: "08:00" }, { start: "16:00", end: "20:00" }] }).ok).toBe(false);
    expect(day({ slots: [{ start: "", end: "13:00" }] }).ok).toBe(false);
    expect(day({ slots: [{ start: "09:00", end: "10:00" }, { start: "11:00", end: "12:00" }], active_hours: "3" }).ok).toBe(false);
    expect(day({ slots: Array.from({ length: 7 }, (_, hour) => ({ start: `0${hour + 1}:00`, end: `0${hour + 1}:30` })) }).ok).toBe(false);
    // The last slot may run past midnight.
    const late = day({ slots: [{ start: "10:00", end: "13:00" }, { start: "22:00", end: "01:00" }] });
    expect(late.ok && late.day.active_minutes).toBe(360);
  });

  it("reads slots, and days saved before there were any", () => {
    expect(readSlots(undefined, "09:30", "18:00")).toEqual([{ start: "09:30", end: "18:00" }]);
    expect(readSlots([], null, null)).toEqual([]);
    const slots = readSlots([{ start: "09:30:00", end: "13:00" }, { start: "16:00", end: null }, { start: "nope" }], "09:30", null);
    expect(slots).toEqual([{ start: "09:30", end: "13:00" }, { start: "16:00", end: null }]);
    expect(openSlot(slots)?.start).toBe("16:00");
    expect(slotsLabel(slots)).toBe("09:30–13:00, 16:00–…");
    // Earlier slots plus the running one; a typed figure for the earlier ones is kept.
    expect(minutesSoFar({ slots, active_minutes: 210 }, "17:00")).toBe(270);
    expect(minutesSoFar({ slots, active_minutes: 180 }, "17:00")).toBe(240);
    expect(minutesSoFar({ slots: [{ start: "09:30", end: "18:00" }], active_minutes: 510 }, "19:00")).toBeNull();
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
