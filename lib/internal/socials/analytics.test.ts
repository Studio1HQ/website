import { describe, expect, it } from "vitest";
import {
  bestPosts,
  dailyMetrics,
  dailyOf,
  exportNet,
  growthOf,
  trendMetrics,
  trendOf,
  weekOnWeek,
} from "@/lib/internal/socials/analytics";
import type { SocialInsights } from "@/lib/internal/socials/insights";
import type {
  MonthSummary,
  Platform,
  PlatformMonth,
} from "@/lib/internal/socials/schema";

function platform(
  name: Platform,
  numbers: Partial<PlatformMonth> = {},
  insights: SocialInsights = {},
): PlatformMonth {
  return {
    platform: name,
    followers: 100,
    gained: null,
    percent: null,
    impressions: null,
    engagements: null,
    posts: null,
    rate: null,
    impressionsChange: null,
    engagementsChange: null,
    notes: "",
    insights,
    ...numbers,
  };
}

function month(
  key: string,
  platforms: PlatformMonth[],
  totals: Partial<MonthSummary> = {},
): MonthSummary {
  return {
    month: key,
    platforms,
    audience: null,
    impressions: null,
    engagements: null,
    posts: null,
    rate: null,
    impressionsChange: null,
    engagementsChange: null,
    ...totals,
  };
}

describe("social analytics", () => {
  const summaries = [
    month(
      "2026-11",
      [
        platform("linkedin", { impressions: 900, gained: 30 }),
        platform("x", { impressions: 100, gained: -2 }),
      ],
      {
        impressions: 1000,
        audience: { month: "2026-11", total: 228, gained: 28, percent: 14 },
      },
    ),
    month("2026-09", [platform("linkedin", { impressions: 500 })], {
      impressions: 500,
    }),
  ];

  it("lays a measure out month by month, with gaps for months not logged", () => {
    const all = trendOf(summaries, "all", "impressions");
    expect(all.map((point) => [point.month, point.value])).toEqual([
      ["2026-09", 500],
      ["2026-10", null],
      ["2026-11", 1000],
    ]);
    expect(all[2].parts).toEqual([
      { platform: "linkedin", value: 900 },
      { platform: "x", value: 100 },
    ]);
    expect(trendOf(summaries, "x", "impressions").map((p) => p.value)).toEqual([
      null,
      null,
      100,
    ]);
    expect(trendOf(summaries, "all", "gained")[2].value).toBe(28);
    // Only the last 12 months.
    expect(
      trendOf([month("2025-01", []), month("2026-11", [])], "all", "posts"),
    ).toHaveLength(12);
  });

  it("offers only the measures that have numbers", () => {
    expect(trendMetrics(summaries, "all")).toEqual(["impressions", "gained"]);
    expect(trendMetrics(summaries, "x")).toEqual(["impressions", "gained"]);
  });

  it("adds the platforms' days together", () => {
    const november = month("2026-11", [
      platform(
        "linkedin",
        {},
        {
          daily: [
            { day: "2026-11-01", impressions: 10, engagements: 1 },
            { day: "2026-11-02", impressions: 20 },
          ],
        },
      ),
      platform(
        "x",
        {},
        {
          daily: [
            { day: "2026-11-02", impressions: 5 },
            { day: "2026-11-03", impressions: 7 },
          ],
        },
      ),
    ]);
    expect(
      dailyOf(november, "all", "impressions").map((point) => [
        point.day,
        point.value,
      ]),
    ).toEqual([
      ["2026-11-01", 10],
      ["2026-11-02", 25],
      ["2026-11-03", 7],
    ]);
    expect(dailyOf(november, "x", "engagements")).toEqual([]);
    expect(dailyMetrics(november, "all")).toEqual([
      "impressions",
      "engagements",
    ]);
  });

  it("ranks the best posts across platforms", () => {
    const post = (url: string, impressions: number | null) => ({
      url,
      day: "2026-11-02",
      text: "",
      impressions,
      engagements: null,
    });
    const november = month("2026-11", [
      platform(
        "linkedin",
        {},
        {
          posts: [
            post("https://a.example/1", 50),
            post("https://a.example/2", 5),
          ],
          posts_measure: "month",
        },
      ),
      platform("x", {}, { posts: [post("https://x.com/1", 20)] }),
    ]);
    expect(
      bestPosts(november, 2).map((item) => [item.platform, item.measure]),
    ).toEqual([
      ["linkedin", "month"],
      ["x", "lifetime"],
    ]);
  });

  it("says how a month grew on the one before and the first", () => {
    const points = [
      { month: "2026-08", value: 200, parts: [] },
      { month: "2026-09", value: null, parts: [] },
      { month: "2026-10", value: 400, parts: [] },
      { month: "2026-11", value: 500, parts: [] },
    ];
    expect(growthOf(points, "2026-11", "impressions")).toEqual({
      previous: { month: "2026-10", change: 25 },
      first: { month: "2026-08", change: 150 },
    });
    expect(growthOf(points, "2026-10", "impressions")).toEqual({
      previous: { month: "2026-08", change: 100 },
      first: null,
    });
    // The rate moves in points, not percent.
    const rates = [
      { month: "2026-10", value: 1.2, parts: [] },
      { month: "2026-11", value: 0.9, parts: [] },
    ];
    expect(growthOf(rates, "2026-11", "rate").previous?.change).toBe(-0.3);
    expect(growthOf(points, "2026-11", "gained")).toEqual({
      previous: null,
      first: null,
    });
  });

  it("counts a month's follows from the export, and the weeks", () => {
    expect(
      exportNet(
        platform("x", {}, { stats: { new_followers: 28, lost_followers: 4 } }),
      ),
    ).toBe(24);
    expect(exportNet(platform("linkedin"))).toBeNull();
    const days = Array.from({ length: 20 }, (_, index) => ({
      day: `2026-11-${String(index + 1).padStart(2, "0")}`,
      value: index < 13 ? 10 : 20,
      parts: [],
    }));
    // 14–20 Nov (20 a day) against 7–13 Nov (10 a day).
    expect(weekOnWeek(days)).toEqual({ last: 140, before: 70, change: 100 });
    expect(weekOnWeek(days.slice(0, 10))).toBeNull();
  });
});
