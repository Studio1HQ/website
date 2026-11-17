import { describe, expect, it } from "vitest";
import { change, monthCounts, rollingCounts } from "@/lib/internal/trend";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-18T12:00:00Z");

describe("counts over time", () => {
  it("puts timestamps in back-to-back windows ending now, oldest first", () => {
    const times = [
      "2026-11-18T11:00:00Z", // the last 24 hours
      "2026-11-17T13:00:00Z", // the last 24 hours
      "2026-11-17T11:00:00Z", // the day before
      "2026-11-10T00:00:00Z", // too old for three days
      "2026-11-19T00:00:00Z", // in the future
      "not a date",
      null,
    ];
    expect(rollingCounts(times, NOW, DAY, 3)).toEqual([0, 1, 2]);
  });

  it("counts dates by calendar month, across a year end", () => {
    expect(monthCounts(["2026-01-05T00:00:00Z", "2025-12-31", "2025-12-01", "2025-10-01", null], "2026-01", 3)).toEqual([0, 2, 1]);
  });

  it("compares the latest stretch with the one before it", () => {
    expect(change([1, 2, 3, 4], 2)).toEqual({ now: 7, before: 3, delta: 4 });
    expect(change([5, 0], 1)).toEqual({ now: 0, before: 5, delta: -5 });
  });
});
