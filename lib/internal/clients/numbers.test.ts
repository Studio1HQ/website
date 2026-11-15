import { describe, expect, it } from "vitest";
import {
  metricKey,
  numberRuns,
  readingTitle,
  signed,
  stepFor,
} from "@/lib/internal/clients/numbers";

const reading = (
  id: string,
  day: string,
  metric: string,
  value: number | null,
) => ({
  id,
  happened_on: day,
  metric,
  value,
  title: `${value} ${metric}`,
  created_at: `${day}T10:00:00Z`,
});

describe("numberRuns", () => {
  const runs = numberRuns([
    reading("a", "2026-09-30", "GitHub stars", 400),
    reading("c", "2026-10-19", "github stars ", 1500),
    reading("b", "2026-10-09", "GitHub stars", 1000),
    reading("d", "2026-11-01", "Discord members", 320),
    reading("e", "2026-10-03", "", null),
    reading("f", "2026-10-05", "Trendshift rank", null),
  ]);

  it("groups readings of the same number, oldest first", () => {
    const stars = runs.find((run) => metricKey(run.metric) === "github stars");
    expect(stars?.readings.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(stars?.first.value).toBe(400);
    expect(stars?.previous?.value).toBe(1000);
    expect(stars?.latest.value).toBe(1500);
  });

  it("leaves out wins without a number, and puts the latest change first", () => {
    expect(runs.map((run) => run.metric)).toEqual([
      "Discord members",
      "GitHub stars",
    ]);
    expect(runs[0].previous).toBeNull();
  });
});

describe("number helpers", () => {
  it("signs changes with a real minus", () => {
    expect(signed(120)).toBe("+120");
    expect(signed(-5)).toBe("−5");
    expect(signed(0)).toBe("0");
    expect(signed(1200, (n) => n.toLocaleString("en-US"))).toBe("+1,200");
  });

  it("titles a reading and picks a step that fits its size", () => {
    expect(readingTitle(" GitHub stars ", 1600)).toBe("1,600 GitHub stars");
    expect(stepFor(42)).toBe(1);
    expect(stepFor(1500)).toBe(10);
    expect(stepFor(42000)).toBe(100);
  });
});
