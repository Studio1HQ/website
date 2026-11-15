import { describe, expect, it } from "vitest";
import {
  attendanceByPersonDay,
  barShares,
  groupByWeek,
  heatLevel,
  logsByDay,
  minutesByPersonDay,
  monthCalendar,
  monthToShow,
  reportCell,
  share,
  weekToShow,
} from "@/lib/internal/tasks/views";

describe("which period to show", () => {
  it("snaps ?week= to its Monday and never goes past this week", () => {
    expect(weekToShow(undefined, "2026-11-18")).toBe("2026-11-16");
    expect(weekToShow("2026-11-12", "2026-11-18")).toBe("2026-11-09");
    expect(weekToShow("2026-11-30", "2026-11-18")).toBe("2026-11-16");
    expect(weekToShow("nonsense", "2026-11-18")).toBe("2026-11-16");
  });

  it("takes ?month= up to this month", () => {
    expect(monthToShow(undefined, "2026-11-18")).toBe("2026-11");
    expect(monthToShow("2026-10", "2026-11-18")).toBe("2026-10");
    expect(monthToShow("2027-01", "2026-11-18")).toBe("2026-11");
    expect(monthToShow("2026-13", "2026-11-18")).toBe("2026-11");
  });
});

describe("the month calendar", () => {
  it("starts weeks on Monday and pads outside days with null", () => {
    const rows = monthCalendar("2026-11");
    // 1 Nov 2026 is a Sunday: the first row is Mon 26 Oct – Sun 1 Nov.
    expect(rows[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(rows[1][0]).toBe("2026-11-02");
    expect(rows.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(rows.flat().filter(Boolean)).toHaveLength(30);
    expect(rows.every((row) => row.length === 7)).toBe(true);
  });

  it("steps heat by things done", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(heatLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
    expect(heatLevel(null)).toBe(0);
  });
});

describe("grouping", () => {
  it("groups logs by day and minutes by person and day", () => {
    const logs = [
      { email: "A@studio1hq.com", day: "2026-11-16", minutes: 60 },
      { email: "a@studio1hq.com", day: "2026-11-16", minutes: 30 },
      { email: "b@studio1hq.com", day: "2026-11-17", minutes: 15 },
    ];
    expect(Object.keys(logsByDay(logs))).toEqual(["2026-11-16", "2026-11-17"]);
    expect(minutesByPersonDay(logs)).toEqual({
      "a@studio1hq.com": { "2026-11-16": 90 },
      "b@studio1hq.com": { "2026-11-17": 15 },
    });
    expect(
      attendanceByPersonDay([{ email: "A@studio1hq.com", day: "2026-11-16", kind: "leave", active_minutes: null }]),
    ).toEqual({ "a@studio1hq.com": { "2026-11-16": { kind: "leave", active_minutes: null } } });
  });

  it("groups done items by week, in order, skipping undated ones", () => {
    const groups = groupByWeek([{ day: "2026-11-18" }, { day: "2026-11-03" }, { day: null }, { day: "2026-11-16" }]);
    expect(groups.map(([week, items]) => [week, items.length])).toEqual([
      ["2026-11-02", 1],
      ["2026-11-16", 2],
    ]);
  });

  it("sizes bars against the biggest", () => {
    expect(barShares([120, 60, 0, 1])).toEqual([100, 50, 0, 2]);
    expect(barShares([])).toEqual([]);
    expect(share(30, 120)).toBe(25);
    expect(share(5, 0)).toBe(0);
  });
});

describe("the founders' report cell", () => {
  const week = "2026-11-16";
  it("says not due before Friday and late after Monday noon", () => {
    expect(reportCell(null, week, { date: "2026-11-18", time: "10:00" })).toEqual({ label: "Not due yet", tone: "stone", late: false });
    expect(reportCell(null, week, { date: "2026-11-21", time: "10:00" }).label).toBe("Not started");
    expect(reportCell(null, week, { date: "2026-11-23", time: "12:30" })).toEqual({ label: "Not started", tone: "rose", late: true });
  });

  it("shows the status, late only while it isn't sent", () => {
    const after = { date: "2026-11-24", time: "09:00" };
    expect(reportCell({ status: "submitted" }, week, after)).toEqual({ label: "Submitted", tone: "sky", late: false });
    expect(reportCell({ status: "seen" }, week, after)).toEqual({ label: "Seen", tone: "emerald", late: false });
    expect(reportCell({ status: "draft" }, week, after)).toEqual({ label: "Draft", tone: "rose", late: true });
    expect(reportCell({ status: "returned" }, week, { date: "2026-11-21", time: "09:00" })).toEqual({
      label: "Sent back",
      tone: "amber",
      late: false,
    });
  });
});
