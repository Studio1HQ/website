import { describe, expect, it } from "vitest";
import {
  cleanInsights,
  mergeInsights,
  shareText,
  statLabel,
} from "@/lib/internal/socials/insights";

describe("import insights", () => {
  it("keeps only what the page can show, in the sizes it holds", () => {
    const clean = cleanInsights({
      stats: { reach: "800", clicks: -4, nonsense: 5, reactions: 12.6 },
      daily: [
        { day: "2026-10-01", impressions: 100, extra: 1 },
        { day: "Oct 1" },
      ],
      posts: [
        {
          url: "javascript:alert(1)",
          text: "  Hello\n world ",
          impressions: 5,
          day: "2026-10-02",
        },
        { url: "https://x.com/a/status/1", text: "", engagements: "7" },
        { text: "" },
        ...Array.from({ length: 10 }, () => ({ text: "more" })),
      ],
      posts_measure: "weird",
      demographics: [
        {
          kind: "followers",
          as_of: "2026-10-31",
          groups: [
            {
              group: "Location",
              items: [
                { name: "Kolkata", share: 140 },
                { name: "", share: 3 },
              ],
            },
          ],
        },
        {
          kind: "aliens",
          groups: [{ group: "x", items: [{ name: "y", share: 1 }] }],
        },
      ],
      sources: [
        {
          label: "X analytics",
          file: "a.csv",
          from: "2026-10-01",
          to: "nope",
          days: 40,
          of: 31,
          at: "2026-11-25",
        },
        { label: "" },
      ],
      script: "<script>",
    });
    expect(clean).toEqual({
      stats: { reach: 800, reactions: 13 },
      daily: [{ day: "2026-10-01", impressions: 100 }],
      posts: [
        {
          url: null,
          day: "2026-10-02",
          text: "Hello world",
          impressions: 5,
          engagements: null,
        },
        {
          url: "https://x.com/a/status/1",
          day: null,
          text: "",
          impressions: null,
          engagements: 7,
        },
        {
          url: null,
          day: null,
          text: "more",
          impressions: null,
          engagements: null,
        },
        {
          url: null,
          day: null,
          text: "more",
          impressions: null,
          engagements: null,
        },
      ],
      posts_measure: "lifetime",
      demographics: [
        {
          kind: "followers",
          as_of: "2026-10-31",
          groups: [
            { group: "Location", items: [{ name: "Kolkata", share: 100 }] },
          ],
        },
      ],
      sources: [
        {
          label: "X analytics",
          file: "a.csv",
          from: "2026-10-01",
          to: null,
          days: 31,
          of: 31,
          at: "2026-11-25",
        },
      ],
    });
    expect(cleanInsights("nope")).toEqual({});
    expect(cleanInsights(null)).toEqual({});
  });

  it("merges an import over what the month had", () => {
    const merged = mergeInsights(
      {
        stats: { reach: 1, clicks: 2 },
        daily: [{ day: "2026-10-01", impressions: 10, new_followers: 1 }],
        posts: [
          { url: null, day: null, text: "old", impressions: 1, engagements: 1 },
        ],
        posts_measure: "month",
        demographics: [
          { kind: "followers", as_of: "2026-10-01", groups: [] },
          { kind: "visitors", as_of: null, groups: [] },
        ],
        sources: [
          {
            label: "LinkedIn Page analytics",
            file: "a.xls",
            from: null,
            to: null,
            days: 1,
            of: 31,
            at: "2026-10-02",
          },
        ],
      },
      {
        stats: { clicks: 5 },
        daily: [
          { day: "2026-10-01", impressions: 20 },
          { day: "2026-10-02", engagements: 3 },
        ],
        demographics: [{ kind: "followers", as_of: "2026-10-31", groups: [] }],
        sources: [
          {
            label: "LinkedIn Page analytics",
            file: "b.xls",
            from: null,
            to: null,
            days: 31,
            of: 31,
            at: "2026-11-01",
          },
        ],
      },
    );
    expect(merged.stats).toEqual({ reach: 1, clicks: 5 });
    expect(merged.daily).toEqual([
      { day: "2026-10-01", impressions: 20, new_followers: 1 },
      { day: "2026-10-02", engagements: 3 },
    ]);
    // No posts in the new files: the old ones stay.
    expect([merged.posts?.[0].text, merged.posts_measure]).toEqual([
      "old",
      "month",
    ]);
    expect(merged.demographics?.map((item) => [item.kind, item.as_of])).toEqual(
      [
        ["followers", "2026-10-31"],
        ["visitors", null],
      ],
    );
    expect(merged.sources?.map((item) => item.file)).toEqual(["b.xls"]);
  });

  it("names things the way each platform does", () => {
    expect(statLabel("reactions", "linkedin")).toBe("Reactions");
    expect(statLabel("reactions", "x")).toBe("Likes");
    expect(shareText(0.5)).toBe("<1%");
    expect(shareText(11.4)).toBe("11%");
  });

  it("puts totals and audience groups in the page's order", () => {
    // As Postgres returns jsonb: keys shortest first.
    const clean = cleanInsights({
      stats: {
        saves: 61,
        shares: 20,
        comments: 63,
        reactions: 807,
        new_followers: 79,
      },
      demographics: [
        {
          kind: "followers",
          as_of: "2026-11-15",
          groups: [
            { group: "Company", items: [{ name: "IBM", share: 0.5 }] },
            { group: "Groups", items: [{ name: "Other", share: 3 }] },
            { group: "Location", items: [{ name: "India", share: 40 }] },
            { group: "Job title", items: [{ name: "Engineer", share: 9 }] },
          ],
        },
      ],
    });
    expect(Object.keys(clean.stats ?? {})).toEqual([
      "new_followers",
      "reactions",
      "comments",
      "saves",
      "shares",
    ]);
    expect(clean.demographics?.[0].groups.map((item) => item.group)).toEqual([
      "Job title",
      "Location",
      "Company",
      "Groups",
    ]);
  });
});
