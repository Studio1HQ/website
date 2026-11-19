import { describe, expect, it, vi } from "vitest";

// The cache wrapper needs Next's server runtime; the parsing doesn't.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const { blogSlug, byDay, bySlug, searchTotals, searchWindow } = await import("@/lib/internal/search-console");

describe("search console", () => {
  it("reads post slugs from page URLs", () => {
    expect(blogSlug("https://www.studio1hq.com/blog/aeo-guide")).toBe("aeo-guide");
    expect(blogSlug("https://www.studio1hq.com/blog/aeo-guide/")).toBe("aeo-guide");
    expect(blogSlug("https://www.studio1hq.com/fr/blog/aeo-guide")).toBe("aeo-guide");
    expect(blogSlug("https://www.studio1hq.com/blog/aeo-guide?utm=x#top")).toBe("aeo-guide");
    expect(blogSlug("https://www.studio1hq.com/blog")).toBeNull();
    expect(blogSlug("https://www.studio1hq.com/blog/tag/aeo")).toBeNull();
    expect(blogSlug("not a url")).toBeNull();
  });

  it("adds translations to the post and weights position by impressions", () => {
    const posts = bySlug([
      { keys: ["https://www.studio1hq.com/blog/a"], clicks: 10, impressions: 100, position: 4 },
      { keys: ["https://www.studio1hq.com/es/blog/a"], clicks: 2, impressions: 300, position: 12 },
      { keys: ["https://www.studio1hq.com/blog"], clicks: 50, impressions: 500, position: 2 },
    ]);
    expect(Object.keys(posts)).toEqual(["a"]);
    expect(posts.a.clicks).toBe(12);
    expect(posts.a.impressions).toBe(400);
    expect(posts.a.position).toBeCloseTo(10);
    expect(posts.a.ctr).toBeCloseTo(0.03);
  });

  it("adds up days into totals with position weighted by impressions", () => {
    const daily = byDay([
      { keys: ["2026-11-10"], clicks: 2, impressions: 100, position: 10 },
      { keys: ["2026-11-11"], clicks: 4, impressions: 300, position: 6 },
      { keys: ["2026-11-12"], clicks: 9, impressions: 50, position: 1 },
    ]);
    expect(searchTotals(daily, "2026-11-10", "2026-11-11")).toEqual({ clicks: 6, impressions: 400, position: 7 });
    expect(searchTotals(daily, "2026-12-01", "2026-12-31")).toEqual({ clicks: 0, impressions: 0, position: 0 });
  });

  it("reads the 28 days ending two days ago", () => {
    expect(searchWindow(new Date("2026-11-13T12:00:00Z"))).toEqual({ start: "2026-10-15", end: "2026-11-11" });
  });
});
