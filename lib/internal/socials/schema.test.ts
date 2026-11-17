import { describe, expect, it } from "vitest";
import {
  growthSeries,
  isPlatform,
  signed,
  type SocialMetric,
} from "@/lib/internal/socials/schema";

const row = (
  account: string,
  platform: SocialMetric["platform"],
  month: string,
  followers: number,
): SocialMetric => ({
  id: `${account}-${platform}-${month}`,
  account,
  platform,
  month,
  followers,
  impressions: null,
  posts: null,
  notes: "",
  updated_at: "",
  updated_by: null,
});

describe("social growth", () => {
  it("groups by account and platform, Studio1 first, newest month first", () => {
    const series = growthSeries([
      row("Arindam", "x", "2026-10", 9000),
      row("Studio1", "youtube", "2026-10", 300),
      row("Studio1", "linkedin", "2026-09", 1000),
      row("Studio1", "linkedin", "2026-11", 1210),
      row("Studio1", "linkedin", "2026-10", 1100),
    ]);
    expect(series.map((item) => item.account)).toEqual(["Studio1", "Arindam"]);
    expect(series[0].platforms.map((item) => item.platform)).toEqual([
      "linkedin",
      "youtube",
    ]);
    const linkedin = series[0].platforms[0];
    expect(linkedin.months.map((month) => month.month)).toEqual([
      "2026-11",
      "2026-10",
      "2026-09",
    ]);
    expect(linkedin.latest).toMatchObject({ gained: 110, percent: 10 });
    expect(linkedin.months[2]).toMatchObject({ gained: null, percent: null });
    expect(linkedin.sinceStart).toBe(210);
  });

  it("handles a drop and a start from zero", () => {
    const [account] = growthSeries([
      row("Studio1", "x", "2026-09", 0),
      row("Studio1", "x", "2026-10", 50),
      row("Studio1", "x", "2026-11", 40),
    ]);
    const [november, october] = account.platforms[0].months;
    expect(october).toMatchObject({ gained: 50, percent: null });
    expect(november).toMatchObject({ gained: -10, percent: -20 });
  });

  it("knows its platforms and writes changes with a sign", () => {
    expect(isPlatform("youtube")).toBe(true);
    expect(isPlatform("tiktok")).toBe(false);
    expect(signed(1200)).toBe("+1,200");
    expect(signed(-4)).toBe("-4");
    expect(signed(0)).toBe("0");
  });
});
