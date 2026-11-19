import { describe, expect, it } from "vitest";
import {
  changeShare,
  fillDays,
  gaDay,
  pathSlug,
  rankPosts,
  readTime,
  readerSources,
  statsRange,
  statsWindow,
  sumDays,
} from "@/lib/internal/blog/stats";

describe("blog stats", () => {
  it("picks a range, 28 days by default", () => {
    expect(statsRange("7").days).toBe(7);
    expect(statsRange("90").days).toBe(90);
    expect(statsRange(undefined).days).toBe(28);
    expect(statsRange("365").days).toBe(28);
  });

  it("ends the window yesterday and puts the stretch before right behind it", () => {
    const window = statsWindow(7, new Date("2026-11-18T09:00:00Z"));
    expect(window).toMatchObject({
      start: "2026-11-11",
      end: "2026-11-17",
      previousStart: "2026-11-04",
      previousEnd: "2026-11-10",
    });
    expect(window.days).toHaveLength(7);
    expect(window.days[0]).toBe("2026-11-11");
    expect(window.days[6]).toBe("2026-11-17");
  });

  it("crosses month ends", () => {
    const window = statsWindow(28, new Date("2026-03-02T00:00:00Z"));
    expect(window.start).toBe("2026-02-02");
    expect(window.end).toBe("2026-03-01");
  });

  it("reads post slugs from site paths", () => {
    expect(pathSlug("/blog/aeo-guide")).toBe("aeo-guide");
    expect(pathSlug("/blog/aeo-guide/")).toBe("aeo-guide");
    expect(pathSlug("/fr/blog/aeo-guide")).toBe("aeo-guide");
    expect(pathSlug("/blog")).toBeNull();
    expect(pathSlug("/blog/")).toBeNull();
    expect(pathSlug("/blog/tag/aeo")).toBeNull();
    expect(pathSlug("/case-studies/x")).toBeNull();
  });

  it("turns Google Analytics days into ISO days", () => {
    expect(gaDay("20261118")).toBe("2026-11-18");
    expect(gaDay("2026-11-18")).toBe("2026-11-18");
  });

  it("fills missing days with zero and sums a stretch", () => {
    const values = { "2026-11-16": 4, "2026-11-17": 6, "2026-11-01": 100 };
    expect(
      fillDays(
        { days: ["2026-11-15", "2026-11-16", "2026-11-17"] },
        values,
      ).map((point) => point.value),
    ).toEqual([0, 4, 6]);
    expect(sumDays(values, "2026-11-15", "2026-11-17")).toBe(10);
  });

  it("compares only with something to compare against", () => {
    expect(changeShare(120, 100)).toBeCloseTo(0.2);
    expect(changeShare(50, 100)).toBeCloseTo(-0.5);
    expect(changeShare(10, 0)).toBeNull();
  });

  it("ranks posts by views, then clicks, and keeps titles from the site", () => {
    const site = [
      { slug: "a", title: "Post A", date: "2026-10-01" },
      { slug: "b", title: "Post B", date: "2026-10-02" },
      { slug: "quiet", title: "Quiet", date: "2026-10-03" },
    ];
    const reads = {
      a: { views: 10, readers: 8, engaged: 400 },
      b: { views: 30, readers: 20, engaged: 900 },
    };
    const search = {
      a: { clicks: 50, impressions: 900, ctr: 0.05, position: 7 },
      "old-post": { clicks: 3, impressions: 40, ctr: 0.07, position: 12 },
      quiet: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    };
    const rows = rankPosts(site, reads, search);
    expect(rows.map((row) => row.slug)).toEqual(["b", "a", "old-post"]);
    expect(rows[0].title).toBe("Post B");
    expect(rows[2]).toMatchObject({
      title: "Old post",
      date: null,
      reads: null,
    });
    expect(rankPosts(site, null, search).map((row) => row.slug)).toEqual([
      "a",
      "old-post",
    ]);
  });

  it("writes reading time short", () => {
    expect(readTime(0)).toBe("–");
    expect(readTime(Number.NaN)).toBe("–");
    expect(readTime(48.4)).toBe("48s");
    expect(readTime(102)).toBe("1m 42s");
    expect(readTime(605)).toBe("10m 05s");
  });

  it("names and merges reader sources", () => {
    const rows = readerSources([
      { source: "google", views: 40 },
      { source: "(direct)", views: 20 },
      { source: "t.co", views: 5 },
      { source: "x.com", views: 6 },
      { source: "www.perplexity.ai", views: 2 },
      { source: "newsletter.example", views: 1 },
      { source: "nothing", views: 0 },
    ]);
    expect(rows).toEqual([
      { source: "Google", views: 40 },
      { source: "Direct", views: 20 },
      { source: "X", views: 11 },
      { source: "Perplexity", views: 2 },
      { source: "newsletter.example", views: 1 },
    ]);
    expect(
      readerSources(
        [
          { source: "a", views: 1 },
          { source: "b", views: 2 },
        ],
        1,
      ),
    ).toEqual([{ source: "b", views: 2 }]);
  });
});
