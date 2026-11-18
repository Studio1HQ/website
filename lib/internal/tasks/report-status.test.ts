import { describe, expect, it } from "vitest";
import { inboxPeriods, isSent, owedReports, reportsDue, reportsSince, stateOf, writeHref } from "@/lib/internal/tasks/report-status";
import type { Report } from "@/lib/internal/tasks/shared";

function report(partial: Partial<Report>): Report {
  return {
    id: "r1",
    created_at: "",
    updated_at: "",
    email: "dev@studio1hq.com",
    period: "week",
    starts_on: "2026-11-16",
    ends_on: "2026-11-22",
    status: "draft",
    highlights: "",
    blockers: "",
    next_plan: "",
    snapshot: null,
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    founder_note: "",
    ...partial,
  };
}

describe("report states", () => {
  it("reads a missing report as not started", () => {
    expect(stateOf(null)).toBe("none");
    expect(stateOf(report({ status: "returned" }))).toBe("returned");
    expect(isSent("submitted")).toBe(true);
    expect(isSent("seen")).toBe(true);
    expect(isSent("returned")).toBe(false);
  });

  it("starts owing from the later of joining and Tasks starting", () => {
    expect(reportsSince(null)).toBe("2026-11-16");
    expect(reportsSince("2025-01-01")).toBe("2026-11-16");
    expect(reportsSince("2026-12-01")).toBe("2026-12-01");
  });

  it("links to the form for a period", () => {
    expect(writeHref("week", "2026-11-16")).toBe("/tasks/reports/write?period=week&start=2026-11-16");
  });
});

describe("owed reports", () => {
  it("lists this week from Friday and marks a missed one late after Monday noon", () => {
    const friday = owedReports({ reports: [], now: { date: "2026-11-20", time: "10:00" }, since: "2026-11-16" });
    expect(friday.map((item) => [item.period, item.start, item.state, item.ready, item.late])).toEqual([
      ["week", "2026-11-16", "none", true, false],
    ]);
    const monday = owedReports({ reports: [], now: { date: "2026-11-23", time: "12:30" }, since: "2026-11-16" });
    expect(monday.map((item) => [item.start, item.late])).toEqual([["2026-11-16", true]]);
    expect(reportsDue(monday)).toHaveLength(1);
  });

  it("drops sent reports from what's due, and keeps sent-back ones", () => {
    const now = { date: "2026-11-23", time: "09:00" };
    const sent = owedReports({ reports: [report({ status: "submitted" })], now, since: "2026-11-16" });
    expect(reportsDue(sent)).toEqual([]);
    expect(sent[0].late).toBe(false);
    const back = owedReports({ reports: [report({ status: "returned" })], now, since: "2026-11-16" });
    expect(reportsDue(back).map((item) => item.state)).toEqual(["returned"]);
  });

  it("owes the month from three days before it ends", () => {
    const owed = owedReports({ reports: [], now: { date: "2026-11-28", time: "09:00" }, since: "2026-11-16" });
    expect(owed.map((item) => [item.period, item.start])).toEqual([
      ["week", "2026-11-23"],
      ["week", "2026-11-16"],
      ["month", "2026-11-01"],
    ]);
  });

  it("shows founders the latest owed week and month", () => {
    expect(inboxPeriods("2026-11-18")).toEqual([]);
    expect(inboxPeriods("2026-11-20")).toEqual([{ period: "week", start: "2026-11-16" }]);
    expect(inboxPeriods("2026-11-24")).toEqual([{ period: "week", start: "2026-11-16" }]);
    expect(inboxPeriods("2026-11-29")).toEqual([
      { period: "week", start: "2026-11-23" },
      { period: "month", start: "2026-11-01" },
    ]);
  });
});
