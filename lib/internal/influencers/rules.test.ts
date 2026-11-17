import { describe, expect, it } from "vitest";
import {
  bestChannel,
  bestResult,
  bestValue,
  byResult,
  changed,
  countsToNumbers,
  engagementRate,
  engagements,
  formatCount,
  formatPercent,
  hasOwnViews,
  isSpiky,
  lowestRate,
  mainCurrency,
  opensPerIssue,
  per1k,
  rateLines,
  reachRate,
  results,
  sizeOf,
  totalFollowers,
  typicalViews,
} from "@/lib/internal/influencers/rules";
import {
  FORMATS,
  formatName,
  formatsFor,
  type Channel,
  type Post,
  type Rate,
} from "@/lib/internal/influencers/schema";

const stamps = {
  created_at: "",
  updated_at: "",
  created_by: null,
  updated_by: null,
};

function channel(over: Partial<Channel>): Channel {
  return {
    ...stamps,
    id: "c",
    influencer_id: "a",
    platform: "x",
    handle: "",
    url: null,
    followers: null,
    median_views: null,
    avg_views: null,
    best_views: null,
    avg_engagements: null,
    posts_per_month: null,
    open_rate: null,
    click_rate: null,
    checked_on: null,
    notes: "",
    ...over,
  };
}

function rate(over: Partial<Rate>): Rate {
  return {
    ...stamps,
    id: "r",
    influencer_id: "a",
    platform: "x",
    format: "x_post",
    price: 100,
    currency: "USD",
    details: "",
    quoted_on: null,
    ...over,
  };
}

function post(over: Partial<Post>): Post {
  return {
    ...stamps,
    id: "p",
    influencer_id: "a",
    platform: "x",
    format: "x_post",
    campaign: "",
    posted_on: "2026-11-01",
    url: null,
    cost: null,
    currency: "USD",
    views: null,
    likes: null,
    comments: null,
    reposts: null,
    saves: null,
    clicks: null,
    notes: "",
    ...over,
  };
}

describe("formats", () => {
  it("has every format the team asked for", () => {
    const names = FORMATS.map((format) => formatName(format.value));
    for (const name of [
      "X · Retweet",
      "X · Quote tweet",
      "X · Comment",
      "X · Like",
      "X · Save",
      "LinkedIn · Post",
      "LinkedIn · Repost",
      "LinkedIn · Comment",
      "LinkedIn · Like",
      "LinkedIn · Save",
      "YouTube · Sponsored video",
      "YouTube · Sponsored section",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("starts every format with its platform, so the two can't disagree", () => {
    for (const format of FORMATS) {
      expect(
        format.value === "other" ||
          format.value.startsWith(`${format.platform}_`),
      ).toBe(true);
    }
    expect(formatsFor("youtube").map((format) => format.value)).toEqual([
      "youtube_video",
      "youtube_section",
      "youtube_short",
    ]);
  });

  it("keeps a format the list no longer has readable", () => {
    expect(formatName("x_space")).toBe("x_space");
  });
});

describe("formatCount", () => {
  it("shortens thousands and millions", () => {
    expect(formatCount(950)).toBe("950");
    expect(formatCount(1000)).toBe("1k");
    expect(formatCount(12_400)).toBe("12.4k");
    expect(formatCount(999_960)).toBe("1M");
    expect(formatCount(1_250_000)).toBe("1.3M");
    expect(formatCount(null)).toBe("—");
  });
});

describe("countsToNumbers", () => {
  it("reads 120k and 1.2M, and leaves the rest alone", () => {
    const result = countsToNumbers({
      followers: "120k",
      avg_views: "1.2M",
      views: "4,500",
      handle: "@a",
      likes: "",
    });
    expect(result).toEqual({
      ok: true,
      values: {
        followers: 120_000,
        avg_views: 1_200_000,
        views: 4500,
        handle: "@a",
        likes: "",
      },
    });
  });

  it("names the field that isn't a number", () => {
    expect(
      countsToNumbers({ followers: "lots" }, { followers: "Followers" }),
    ).toEqual({
      ok: false,
      message: "Followers should be a number, like 4500, 45k or 1.2M.",
    });
  });

  it("reads the median and best views, and percents with or without %", () => {
    expect(
      countsToNumbers({ median_views: "32k", best_views: "1.1M", open_rate: "42%", click_rate: " 4.5 " }),
    ).toEqual({
      ok: true,
      values: { median_views: 32_000, best_views: 1_100_000, open_rate: 42, click_rate: 4.5 },
    });
  });

  it("refuses a percent above 100 or that isn't one", () => {
    expect(countsToNumbers({ open_rate: "140" }, { open_rate: "Open rate, %" })).toEqual({
      ok: false,
      message: "Open rate, % should be a percent from 0 to 100, like 42 or 4.5.",
    });
    expect(countsToNumbers({ click_rate: "high" })).toMatchObject({ ok: false });
  });
});

describe("per1k", () => {
  it("is the price for a thousand views", () => {
    expect(per1k(500, 40_000)).toBe(12.5);
    expect(per1k(0, 40_000)).toBe(0);
  });

  it("is nothing without a price or views", () => {
    expect(per1k(null, 40_000)).toBeNull();
    expect(per1k(500, 0)).toBeNull();
    expect(per1k(500, null)).toBeNull();
  });
});

describe("channels", () => {
  const channels = [
    channel({ platform: "x", followers: 120_000, avg_views: 30_000 }),
    channel({ platform: "linkedin", followers: 40_000, avg_views: 55_000 }),
    channel({ platform: "youtube", followers: 8000 }),
  ];

  it("adds followers up", () => {
    expect(totalFollowers(channels)).toBe(168_000);
    expect(totalFollowers([])).toBe(0);
  });

  it("picks the channel with the most views a post", () => {
    expect(bestChannel(channels)?.platform).toBe("linkedin");
    expect(bestChannel([])).toBeNull();
  });

  it("falls back to followers when no views are known", () => {
    expect(
      bestChannel([
        channel({ platform: "x", followers: 10 }),
        channel({ platform: "youtube", followers: 90 }),
      ])?.platform,
    ).toBe("youtube");
  });

  it("goes by the typical post, not an average a viral post lifted", () => {
    expect(
      bestChannel([
        channel({ platform: "x", median_views: 8000, avg_views: 60_000 }),
        channel({ platform: "linkedin", median_views: 20_000, avg_views: 22_000 }),
      ])?.platform,
    ).toBe("linkedin");
  });
});

describe("channel numbers", () => {
  it("takes the median as typical, else the mean, else a newsletter's opens", () => {
    expect(typicalViews(channel({ median_views: 9000, avg_views: 30_000 }))).toBe(9000);
    expect(typicalViews(channel({ avg_views: 30_000 }))).toBe(30_000);
    expect(
      typicalViews(channel({ platform: "newsletter", followers: 200_000, open_rate: 42 })),
    ).toBe(84_000);
    expect(typicalViews(channel({ followers: 200_000 }))).toBeNull();
  });

  it("works out a newsletter's opens an issue only for newsletters", () => {
    expect(opensPerIssue(channel({ platform: "newsletter", followers: 50_000, open_rate: 38.5 }))).toBe(19_250);
    expect(opensPerIssue(channel({ platform: "newsletter", followers: 50_000 }))).toBeNull();
    expect(opensPerIssue(channel({ platform: "x", followers: 50_000, open_rate: 40 }))).toBeNull();
  });

  it("gives engagement per 100 views, and a newsletter's click rate", () => {
    expect(engagementRate(channel({ avg_engagements: 900, avg_views: 30_000 }))).toBe(3);
    expect(engagementRate(channel({ avg_engagements: 450, median_views: 9000 }))).toBe(5);
    expect(engagementRate(channel({ avg_engagements: 900 }))).toBeNull();
    expect(engagementRate(channel({ platform: "newsletter", click_rate: 4.5 }))).toBe(4.5);
  });

  it("says how much of the following a typical post reaches", () => {
    expect(reachRate(channel({ followers: 40_000, median_views: 10_000 }))).toBe(25);
    expect(reachRate(channel({ followers: 5000, median_views: 12_000 }))).toBe(240);
    expect(reachRate(channel({ median_views: 10_000 }))).toBeNull();
  });

  it("flags a channel whose average is twice its typical post", () => {
    expect(isSpiky(channel({ median_views: 10_000, avg_views: 20_000 }))).toBe(true);
    expect(isSpiky(channel({ median_views: 10_000, avg_views: 19_000 }))).toBe(false);
    expect(isSpiky(channel({ avg_views: 90_000 }))).toBe(false);
  });

  it("puts a following in its size band", () => {
    expect(sizeOf(9999)).toBe("nano");
    expect(sizeOf(10_000)).toBe("micro");
    expect(sizeOf(250_000)).toBe("mid");
    expect(sizeOf(999_999)).toBe("macro");
    expect(sizeOf(3_000_000)).toBe("mega");
    expect(sizeOf(null)).toBeNull();
  });

  it("formats a percent", () => {
    expect(formatPercent(3)).toBe("3%");
    expect(formatPercent(4.56)).toBe("4.6%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("rate cards", () => {
  const channels = [
    channel({ platform: "x", avg_views: 40_000 }),
    channel({ platform: "linkedin", avg_views: 20_000 }),
    channel({ influencer_id: "b", platform: "x", avg_views: 100_000 }),
  ];

  it("prices a thousand views from the channel's usual views", () => {
    const [line] = rateLines(
      [rate({ format: "x_quote", price: 500 })],
      channels,
    );
    expect(line.expectedViews).toBe(40_000);
    expect(line.per1k).toBe(12.5);
  });

  it("prices against the typical post when the median is known", () => {
    const [line] = rateLines(
      [rate({ format: "x_post", price: 500 })],
      [channel({ platform: "x", median_views: 10_000, avg_views: 40_000 })],
    );
    expect(line.expectedViews).toBe(10_000);
    expect(line.per1k).toBe(50);
  });

  it("prices a newsletter slot per thousand opens", () => {
    const [line] = rateLines(
      [rate({ platform: "newsletter", format: "newsletter_primary", price: 2000 })],
      [channel({ platform: "newsletter", followers: 100_000, open_rate: 40 })],
    );
    expect(line.expectedViews).toBe(40_000);
    expect(line.per1k).toBe(50);
  });

  it("uses that creator's channel, not someone else's", () => {
    const [line] = rateLines(
      [rate({ influencer_id: "b", price: 500 })],
      channels,
    );
    expect(line.per1k).toBe(5);
  });

  it("doesn't guess views for a retweet, a comment, a like or a save", () => {
    for (const format of [
      "x_repost",
      "x_reply",
      "x_like",
      "x_save",
      "linkedin_repost",
      "linkedin_comment",
      "other",
    ]) {
      expect(hasOwnViews(format)).toBe(false);
    }
    for (const format of [
      "x_post",
      "x_thread",
      "x_quote",
      "linkedin_post",
      "youtube_video",
      "youtube_section",
    ]) {
      expect(hasOwnViews(format)).toBe(true);
    }
    expect(
      rateLines([rate({ format: "x_like", price: 20 })], channels)[0].per1k,
    ).toBeNull();
  });

  it("has no per-thousand price without a channel", () => {
    expect(
      rateLines(
        [rate({ platform: "youtube", format: "youtube_video" })],
        channels,
      )[0].per1k,
    ).toBeNull();
  });

  it("finds the best value and the lowest price in the main currency", () => {
    const lines = rateLines(
      [
        rate({ id: "1", format: "x_post", price: 800 }),
        rate({
          id: "2",
          platform: "linkedin",
          format: "linkedin_post",
          price: 300,
        }),
        rate({ id: "3", format: "x_like", price: 20 }),
        rate({ id: "4", format: "x_quote", price: 1, currency: "INR" }),
      ],
      channels,
    );
    expect(bestValue(lines)?.id).toBe("2");
    expect(lowestRate(lines)?.id).toBe("3");
    expect(bestValue([])).toBeNull();
  });

  it("names the currency used most", () => {
    expect(mainCurrency(["USD", "INR", "USD"])).toBe("USD");
    expect(mainCurrency(["USD", "INR"])).toBe("INR");
    expect(mainCurrency([])).toBeNull();
  });
});

describe("results", () => {
  const posts = [
    post({
      platform: "x",
      cost: 500,
      views: 50_000,
      likes: 900,
      comments: 100,
      clicks: 40,
    }),
    post({ platform: "x", cost: 300, views: 30_000 }),
    post({ platform: "x", cost: 200 }),
    post({
      platform: "linkedin",
      format: "linkedin_post",
      cost: 400,
      views: 80_000,
      likes: 1600,
    }),
    post({ platform: "linkedin", format: "linkedin_post", views: 20_000 }),
    post({
      platform: "youtube",
      format: "youtube_video",
      cost: 90_000,
      currency: "INR",
      views: 10_000,
    }),
  ];
  const rows = results(posts, (item) => item.platform, "USD");
  const row = (key: string) => rows.find((item) => item.key === key)!;

  it("counts every post, and views where they're known", () => {
    expect(row("x").posts).toBe(3);
    expect(row("x").views).toBe(80_000);
    expect(row("x").avgViews).toBe(40_000);
    expect(row("x").clicks).toBe(40);
  });

  it("prices a thousand views from the paid posts that have views", () => {
    // $800 for 80,000 views; the $200 post with no views isn't in it.
    expect(row("x").spent).toBe(1000);
    expect(row("x").paid).toBe(3);
    expect(row("x").per1k).toBe(10);
    // The free post's views don't make the paid one look cheaper.
    expect(row("linkedin").per1k).toBe(5);
    expect(row("linkedin").avgViews).toBe(50_000);
  });

  it("keeps another currency's money out", () => {
    expect(row("youtube").spent).toBe(0);
    expect(row("youtube").per1k).toBeNull();
    expect(
      results(posts, (item) => item.platform, "INR").find(
        (item) => item.key === "youtube",
      )?.per1k,
    ).toBe(9000);
  });

  it("works out engagement for every hundred views", () => {
    expect(row("x").engagementRate).toBe(2);
    expect(row("linkedin").engagementRate).toBe(2);
    expect(row("youtube").engagementRate).toBeNull();
  });

  it("puts the cheapest views first", () => {
    expect([...rows].sort(byResult).map((item) => item.key)).toEqual([
      "linkedin",
      "x",
      "youtube",
    ]);
    expect(bestResult(rows)?.key).toBe("linkedin");
    expect(bestResult([])).toBeNull();
  });

  it("goes by views a post when nothing was paid for", () => {
    const free = results(
      [
        post({ platform: "x", views: 10 }),
        post({ platform: "youtube", views: 90 }),
      ],
      (item) => item.platform,
      "USD",
    );
    expect(bestResult(free)?.key).toBe("youtube");
  });
});

describe("engagements", () => {
  it("adds up what was noted", () => {
    expect(
      engagements({ likes: 10, comments: null, reposts: 2, saves: 0 }),
    ).toBe(12);
    expect(
      engagements({ likes: null, comments: null, reposts: null, saves: null }),
    ).toBeNull();
  });
});

describe("changed", () => {
  it("keeps only the fields that differ", () => {
    expect(
      changed(
        { name: "Priya", price: "500.00", tags: ["a"], email: null, notes: "" },
        { name: "Priya S", price: 500, tags: ["a"], email: null, notes: "x" },
      ),
    ).toEqual({
      name: { from: "Priya", to: "Priya S" },
      notes: { from: "", to: "x" },
    });
  });
});
