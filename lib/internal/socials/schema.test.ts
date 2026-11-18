import { describe, expect, it } from "vitest";
import {
  audienceOf,
  growthSeries,
  isPlatform,
  overviewOf,
  shareOf,
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

  it("adds up the audience without counting a new platform as growth", () => {
    const [studio] = growthSeries([
      row("Studio1", "linkedin", "2026-10", 400),
      row("Studio1", "linkedin", "2026-11", 480),
      row("Studio1", "x", "2026-10", 250),
      row("Studio1", "x", "2026-11", 270),
      // First logged in November: in the total, not in the gain.
      row("Studio1", "instagram", "2026-11", 26),
      // Logged in October only: carried into November.
      row("Studio1", "youtube", "2026-10", 20),
      // Stars aren't audience.
      row("Studio1", "github", "2026-11", 900),
    ]);
    const audience = audienceOf(studio.platforms);
    expect(audience).toMatchObject({
      total: 796,
      platforms: 4,
      newest: "2026-11",
      gained: 100,
      percent: 15.4,
    });
    expect(audience.byMonth).toEqual([
      { month: "2026-10", total: 670, gained: null, percent: null },
      { month: "2026-11", total: 796, gained: 100, percent: 15.4 },
    ]);
    const linkedin = studio.platforms.find(
      (item) => item.platform === "linkedin",
    )!;
    const github = studio.platforms.find((item) => item.platform === "github")!;
    expect(shareOf(linkedin, audience)).toBe(60);
    expect(shareOf(github, audience)).toBeNull();
  });

  it("has no gain to show in the first month", () => {
    const [studio] = growthSeries([row("Studio1", "x", "2026-11", 271)]);
    expect(audienceOf(studio.platforms)).toMatchObject({
      total: 271,
      gained: null,
      percent: null,
    });
  });

  it("puts the total first, then each platform with its profile", () => {
    const [studio] = growthSeries([
      row("Studio1", "linkedin", "2026-10", 400),
      row("Studio1", "linkedin", "2026-11", 480),
      row("Studio1", "x", "2026-11", 271),
    ]);
    const strip = overviewOf(studio, audienceOf(studio.platforms));
    expect(strip.map((item) => item.key)).toEqual(["total", "linkedin", "x"]);
    expect(strip[0]).toMatchObject({
      value: 751,
      gained: 80,
      since: "2026-10",
    });
    expect(strip[0].points.map((point) => point.value)).toEqual([400, 751]);
    expect(strip[1]).toMatchObject({
      value: 480,
      gained: 80,
      percent: 20,
      share: 64,
      since: "2026-10",
      href: "https://www.linkedin.com/company/studio1hq/",
    });
    expect(strip[2]).toMatchObject({ gained: null, since: null, share: 36 });

    const [person] = growthSeries([row("Arindam", "x", "2026-11", 9000)]);
    const alone = overviewOf(person, audienceOf(person.platforms));
    expect(alone.map((item) => item.key)).toEqual(["x"]);
    expect(alone[0].href).toBeNull();
  });
});
