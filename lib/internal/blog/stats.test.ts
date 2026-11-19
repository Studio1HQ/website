import { describe, expect, it } from "vitest";
import {
  changeShare,
  fillDays,
  gaDay,
  lastMonths,
  monthWindow,
  movers,
  pathSlug,
  pick,
  postPathPattern,
  postSlug,
  rankPosts,
  readTime,
  readerSources,
  runningTotal,
  searchPagePattern,
  searchSince,
  statsRange,
  statsWindow,
  sumByMonth,
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

describe("blog overview", () => {
  it("lists months up to this one, across a year end", () => {
    expect(lastMonths("2027-02", 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("compares this month so far with the same days of last month", () => {
    expect(monthWindow(new Date("2026-11-19T10:00:00Z"))).toEqual({
      month: "2026-11",
      start: "2026-11-01",
      end: "2026-11-19",
      lastStart: "2026-10-01",
      lastEnd: "2026-10-19",
    });
  });

  it("cuts last month at its last day", () => {
    const window = monthWindow(new Date("2027-03-31T23:00:00Z"));
    expect(window.lastStart).toBe("2027-02-01");
    expect(window.lastEnd).toBe("2027-02-28");
    expect(monthWindow(new Date("2027-01-15T00:00:00Z")).lastStart).toBe("2026-12-01");
  });

  it("starts Search Console's all time inside its 16 months", () => {
    expect(searchSince(new Date("2026-11-19T00:00:00Z"))).toBe("2025-07-21");
  });

  it("adds days up per month and keeps a running total", () => {
    expect(sumByMonth({ "2026-10-30": 2, "2026-11-01": 3, "2026-11-19": 4, "2025-01-01": 9 }, ["2026-10", "2026-11"])).toEqual([2, 7]);
    expect(runningTotal([{ day: "a", value: 2 }, { day: "b", value: 0 }, { day: "c", value: 5 }])).toEqual([
      { day: "a", value: 2 },
      { day: "b", value: 2 },
      { day: "c", value: 7 },
    ]);
  });

  it("finds the biggest gains and losses, ignoring tiny posts", () => {
    const moved = movers({ a: 40, b: 10, c: 3, d: 30 }, { a: 10, b: 25, c: 0, e: 12, d: 30 }, { min: 5 });
    expect(moved.up).toEqual([{ slug: "a", now: 40, before: 10, delta: 30 }]);
    expect(moved.down).toEqual([
      { slug: "b", now: 10, before: 25, delta: -15 },
      { slug: "e", now: 0, before: 12, delta: -12 },
    ]);
  });

  it("picks one number per post", () => {
    expect(pick({ a: { views: 3, readers: 1 } }, (item) => item.views)).toEqual({ a: 3 });
    expect(pick(null, () => 1)).toEqual({});
  });

  it("only takes real slugs into a pattern", () => {
    expect(postSlug("my-post-2")).toBe("my-post-2");
    expect(postSlug("../x")).toBeNull();
    expect(postSlug(["a"])).toBeNull();
    expect(postPathPattern("a-b")).toBe("^(/[a-z]{2}(-[A-Za-z]{2})?)?/blog/a-b/?$");
    expect(searchPagePattern("a-b")).toBe("/blog/a-b/?$");
    expect(() => postPathPattern(".*")).toThrow();
    expect(new RegExp(postPathPattern("a-b")).test("/fr/blog/a-b/")).toBe(true);
    expect(new RegExp(postPathPattern("a-b")).test("/blog/a-b-c")).toBe(false);
  });
});
