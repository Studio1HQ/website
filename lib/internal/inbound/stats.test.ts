import { describe, expect, it } from "vitest";
import {
  countLeadsPerWeek,
  eventsThisMonth,
  firstLeadTimes,
  median,
  monthStartIso,
  percent,
  spanLabel,
  stageCounts,
  weekKeys,
  weekStart,
} from "@/lib/internal/inbound/stats-math";

// 2026-11-27 is a Friday.
const NOW = new Date("2026-11-27T10:00:00Z");

describe("weeks", () => {
  it("starts a week on Monday, in IST", () => {
    expect(weekStart("2026-11-27T10:00:00Z")).toBe("2026-11-23");
    expect(weekStart("2026-11-23T00:30:00+05:30")).toBe("2026-11-23");
    // Sunday evening UTC is already Monday in IST.
    expect(weekStart("2026-11-22T19:00:00Z")).toBe("2026-11-23");
    expect(weekStart("2026-11-22T17:00:00Z")).toBe("2026-11-16");
    expect(weekStart("nonsense")).toBe("");
  });

  it("lists the last weeks oldest first", () => {
    expect(weekKeys(NOW, 3)).toEqual([
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
    ]);
    expect(weekKeys(NOW, 8)).toHaveLength(8);
  });

  it("counts leads per week by source and ignores old or odd ones", () => {
    const rows = countLeadsPerWeek(
      [
        { created_at: "2026-11-24T08:00:00Z", source: "inbound_call" },
        { created_at: "2026-11-25T08:00:00Z", source: "inbound_email" },
        { created_at: "2026-11-26T08:00:00Z", source: "inbound_email" },
        { created_at: "2026-11-10T08:00:00Z", source: "inbound_call" },
        { created_at: "2025-01-01T08:00:00Z", source: "inbound_call" },
        { created_at: "2026-11-24T08:00:00Z", source: "outreach" },
      ],
      NOW,
      3,
    );
    expect(rows).toEqual([
      { week: "2026-11-09", call: 1, mail: 0 },
      { week: "2026-11-16", call: 0, mail: 0 },
      { week: "2026-11-23", call: 1, mail: 2 },
    ]);
  });
});

describe("median", () => {
  it("handles none, one, odd and even counts", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
});

describe("firstLeadTimes", () => {
  const leads = [
    { id: "a", created_at: "2026-11-24T10:00:00Z" },
    { id: "b", created_at: "2026-11-24T10:00:00Z" },
    { id: "c", created_at: "2026-11-24T10:00:00Z" },
  ];
  it("takes the earliest finished event per lead", () => {
    const times = firstLeadTimes(leads, [
      { org_id: "a", finished_at: "2026-11-24T10:30:00Z" },
      { org_id: "a", finished_at: "2026-11-24T10:10:00Z" },
      { org_id: "b", finished_at: null },
      { org_id: "zzz", finished_at: "2026-11-24T11:00:00Z" },
    ]);
    expect(times).toEqual([10 * 60_000]);
  });
  it("leaves out negative spans", () => {
    expect(
      firstLeadTimes(leads, [
        { org_id: "a", finished_at: "2026-11-24T09:00:00Z" },
      ]),
    ).toEqual([]);
  });
});

describe("stageCounts", () => {
  it("counts who is at, and who reached, each stage", () => {
    const order = ["lead", "replied", "proposal", "won", "lost"];
    const rows = stageCounts(
      ["lead", "lead", "replied", "proposal", "won", "lost"],
      order,
    );
    expect(rows).toEqual([
      { stage: "lead", inStage: 2, reached: 5 },
      { stage: "replied", inStage: 1, reached: 3 },
      { stage: "proposal", inStage: 1, reached: 2 },
      { stage: "won", inStage: 1, reached: 1 },
      { stage: "lost", inStage: 1, reached: null },
    ]);
  });
});

describe("month and labels", () => {
  it("counts events run and failed", () => {
    expect(
      eventsThisMonth([
        { status: "done" },
        { status: "done" },
        { status: "failed" },
        { status: "queued" },
        { status: "cancelled" },
      ]),
    ).toEqual({ run: 3, failed: 1 });
  });
  it("finds the start of the month in IST", () => {
    expect(monthStartIso(NOW)).toBe("2026-10-31T18:30:00.000Z");
  });
  it("words a span and a share", () => {
    expect(spanLabel(30_000)).toBe("under a minute");
    expect(spanLabel(12 * 60_000)).toBe("12 min");
    expect(spanLabel(3 * 3_600_000)).toBe("3 h");
    expect(spanLabel(72 * 3_600_000)).toBe("3 days");
    expect(percent(1, 4)).toBe(25);
    expect(percent(0, 0)).toBeNull();
  });
});
