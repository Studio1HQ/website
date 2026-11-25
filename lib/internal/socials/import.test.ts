import { describe, expect, it } from "vitest";
import {
  buildMonth,
  defaultMonth,
  monthsIn,
  parseExport,
  planMonths,
  toDay,
  wholeMonths,
  toNumber,
  type ParsedExport,
} from "@/lib/internal/socials/import";
import { parseCsv, type Cell, type Sheet } from "@/lib/internal/socials/sheets";

/** Days from `from` for `count` days, as M/D/YYYY like LinkedIn writes them. */
function usDays(from: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${from}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
  });
}

function parsed(file: string, sheets: Sheet[]): ParsedExport {
  const result = parseExport(file, sheets);
  if (!result.ok) throw new Error(result.message);
  return result.export;
}

/** Like LinkedIn's profile export: 25 Oct – 5 Nov, 100 impressions and 2 followers a day. */
function linkedinProfile(): Sheet[] {
  const days = usDays("2026-10-25", 12);
  return [
    {
      name: "DISCOVERY",
      rows: [
        ["Overall Performance", "10/25/2026 - 11/5/2026"],
        ["Impressions", "1200"],
        ["Members reached", "800"],
      ],
    },
    {
      name: "ENGAGEMENT",
      rows: [
        ["Date", "Impressions", "Engagements"],
        ...days.map((day): Cell[] => [day, "100", "5"]),
      ],
    },
    {
      name: "TOP POSTS",
      rows: [
        ["Maximum of 50 posts available to include in this list"],
        [],
        [
          "Post URL",
          "Post Publish Date",
          "Engagements",
          null,
          "Post URL",
          "Post Publish Date",
          "Impressions",
        ],
        [
          "https://www.linkedin.com/posts/me_launch-day-share-1-aa",
          "10/28/2026",
          "40",
          null,
          "https://www.linkedin.com/posts/me_old-post-ugcPost-2-bb",
          "7/1/2026",
          "900",
        ],
        [
          "https://www.linkedin.com/posts/me_old-post-ugcPost-2-bb",
          "7/1/2026",
          "3",
          null,
          "https://www.linkedin.com/posts/me_launch-day-share-1-aa",
          "10/28/2026",
          "650",
        ],
      ],
    },
    {
      name: "FOLLOWERS",
      rows: [
        ["Total followers on 11/5/2026", "5000"],
        [],
        ["Date", "New followers"],
        ...days.map((day): Cell[] => [day, "2"]),
      ],
    },
    {
      name: "AUDIENCE DEMOGRAPHICS",
      rows: [
        ["Top Demographics", "Value", "Percentage"],
        ["Location", "Kolkata", "4%"],
        ["Location", "Greater Bengaluru Area", "11%"],
        ["Job title", "Software Engineer", "< 1%"],
      ],
    },
    {
      name: "CONTENT DEMOGRAPHICS",
      rows: [
        ["Top Demographics", "Value", "Percentage"],
        ["Seniority", "Senior", "29%"],
      ],
    },
  ];
}

describe("reading cells", () => {
  it("reads numbers as the exports write them", () => {
    expect(toNumber("1,234")).toBe(1234);
    expect(toNumber(" 12% ")).toBe(12);
    expect(toNumber("< 1%")).toBe(0.5);
    expect(toNumber(7)).toBe(7);
    expect(toNumber("-")).toBeNull();
    expect(toNumber("12 posts")).toBeNull();
  });

  it("reads the date styles LinkedIn, X and Excel use", () => {
    expect(toDay("10/3/2026")).toBe("2026-10-03");
    expect(toDay("03/10/2026", true)).toBe("2026-10-03");
    expect(toDay("25/10/2026")).toBe("2026-10-25");
    expect(toDay("2026-10-03")).toBe("2026-10-03");
    expect(toDay("2019-04-30 18:21 +0000")).toBe("2019-04-30");
    expect(toDay("Sat, Nov 15, 2026")).toBe("2026-11-15");
    expect(toDay("November 15, 2026")).toBe("2026-11-15");
    expect(toDay("15 Nov 2026")).toBe("2026-11-15");
    expect(toDay(46326)).toBe("2026-10-31");
    expect(toDay("2/30/2026")).toBeNull();
    expect(toDay("Impressions")).toBeNull();
  });
});

describe("LinkedIn profile export", () => {
  const file = parsed(
    "AggregateAnalytics_Me_2026-10-25_2026-11-05.xlsx",
    linkedinProfile(),
  );

  it("finds what's in it", () => {
    expect(file.platform).toBe("linkedin");
    expect(file.label).toBe("LinkedIn profile analytics");
    expect([file.from, file.to]).toEqual(["2026-10-25", "2026-11-05"]);
    expect(file.daily).toHaveLength(12);
    expect(file.daily[0]).toEqual({
      day: "2026-10-25",
      impressions: 100,
      engagements: 5,
      new_followers: 2,
    });
    expect(file.followerTotal).toEqual({ day: "2026-11-05", count: 5000 });
    expect(file.periodStats).toEqual({ impressions: 1200, reach: 800 });
    expect(file.postNumbers).toBe("month");
    // Two side-by-side lists, read as four rows (the same two posts).
    expect(file.posts).toHaveLength(4);
    expect(file.demographics.map((item) => item.kind)).toEqual([
      "followers",
      "viewers",
    ]);
    expect(file.demographics[0].groups[0]).toEqual({
      group: "Location",
      items: [
        { name: "Greater Bengaluru Area", share: 11 },
        { name: "Kolkata", share: 4 },
      ],
    });
  });

  it("leaves the audience off a month the file ended long after", () => {
    const sheets = linkedinProfile();
    sheets[0].rows[0][1] = "10/25/2026 - 11/20/2026";
    sheets[3].rows[0][0] = "Total followers on 11/20/2026";
    const month = buildMonth(
      [parsed("AggregateAnalytics_Me.xlsx", sheets)],
      "linkedin",
      "2026-10",
      "2026-11-25",
      null,
    );
    expect(month.insights.demographics).toBeUndefined();
    // Nor followers: 6–20 Nov aren't in the file.
    expect(month.followers).toBeNull();
  });

  it("works out October's end from the total in November", () => {
    const month = buildMonth([file], "linkedin", "2026-10", "2026-11-25", null);
    expect(month).toMatchObject({
      days: 7,
      of: 31,
      impressions: 700,
      engagements: 35,
      posts: null,
    });
    // 5000 on 5 Nov, less 2 a day for 1–5 Nov.
    expect(month.followers).toBe(4990);
    expect(month.followersNote).toContain(
      "less the 10 who followed after 31 Oct",
    );
    expect(month.insights.stats).toEqual({ new_followers: 14 });
    expect(month.insights.daily).toHaveLength(7);
    // The file runs past October, so no month-only posts or reach; it ends
    // within a week of it, so the audience counts.
    expect(month.insights.posts).toBeUndefined();
    expect(month.insights.stats?.reach).toBeUndefined();
    expect(month.insights.demographics?.[0].as_of).toBe("2026-11-05");
    expect(month.notes[0]).toContain("7 of the month's 31 days");
  });

  it("uses the total itself for the month it's in, and the audience as of then", () => {
    const month = buildMonth([file], "linkedin", "2026-11", "2026-11-25", null);
    // November so far: to yesterday, 24 Nov.
    expect(month).toMatchObject({ days: 5, of: 24, followers: 5000 });
    expect(
      month.insights.demographics?.map((item) => [item.kind, item.as_of]),
    ).toEqual([
      ["followers", "2026-11-05"],
      ["viewers", "2026-11-05"],
    ]);
  });

  it("keeps the month's own posts and reach when the file is just that month", () => {
    const sheets = linkedinProfile();
    sheets[0].rows[0][1] = "10/25/2026 - 10/31/2026";
    const month = buildMonth(
      [parsed("AggregateAnalytics_Me.xlsx", sheets)],
      "linkedin",
      "2026-10",
      "2026-11-25",
      null,
    );
    expect(month.insights.stats?.reach).toBe(800);
    expect(month.insights.posts_measure).toBe("month");
    expect(
      month.insights.posts?.map((post) => [
        post.day,
        post.impressions,
        post.engagements,
      ]),
    ).toEqual([
      ["2026-07-01", 900, 3],
      ["2026-10-28", 650, 40],
    ]);
  });
});

describe("LinkedIn Page exports", () => {
  const content = parsed("studio1hq_content_1764000000000.xls", [
    {
      name: "Metrics",
      rows: [
        ["Aggregated metrics for all updates"],
        [
          "Date",
          "Impressions (organic)",
          "Impressions (sponsored)",
          "Impressions (total)",
          "Clicks (total)",
          "Reactions (total)",
          "Comments (total)",
          "Reposts (total)",
          "Engagement rate (total)",
        ],
        ["10/01/2026", "90", "10", "100", "4", "6", "1", "1", "0.12"],
        ["10/02/2026", "200", "0", "200", "10", "8", "2", "0", "0.1"],
      ],
    },
    {
      name: "All posts",
      rows: [
        ["Total metrics for each post"],
        [
          "Post title",
          "Post link",
          "Post type",
          "Posted by",
          "Created date",
          "Impressions",
          "Clicks",
          "Likes",
          "Comments",
          "Reposts",
          "Follows",
          "Engagement rate",
        ],
        [
          "We're hiring",
          "https://www.linkedin.com/feed/update/urn:li:activity:1",
          "Organic",
          "Arindam",
          "10/01/2026",
          "150",
          "4",
          "9",
          "1",
          "0",
          "2",
          "0.09",
        ],
        [
          "Old news",
          "https://www.linkedin.com/feed/update/urn:li:activity:0",
          "Organic",
          "Arindam",
          "09/30/2026",
          "500",
          "1",
          "1",
          "0",
          "0",
          "0",
          "0.01",
        ],
      ],
    },
  ]);
  const followers = parsed("studio1hq_followers_1764000000000.xls", [
    {
      name: "New followers",
      rows: [
        [
          "Date",
          "Sponsored followers",
          "Organic followers",
          "Auto-invited followers",
          "Total followers",
        ],
        ["10/01/2026", "0", "3", "1", "4"],
        ["10/02/2026", "1", "2", "0", "3"],
      ],
    },
    {
      name: "Location",
      rows: [
        ["Location", "Total followers"],
        ["Kolkata", "30"],
        ["Bengaluru", "90"],
      ],
    },
    {
      name: "Seniority",
      rows: [
        ["Seniority", "Total followers"],
        ["Senior", "60"],
        ["Entry", "60"],
      ],
    },
  ]);

  it("reads Content, Followers and their demographics", () => {
    expect([content.platform, content.label, followers.label]).toEqual([
      "linkedin",
      "LinkedIn Page analytics",
      "LinkedIn Page analytics",
    ]);
    // No engagements column: clicks, reactions, comments and reposts.
    expect(content.daily[1]).toEqual({
      day: "2026-10-02",
      impressions: 200,
      engagements: 20,
      clicks: 10,
      reactions: 8,
      comments: 2,
      reposts: 0,
    });
    expect(content.posts[0]).toMatchObject({
      impressions: 150,
      engagements: 14,
    });
    expect(followers.daily).toEqual([
      { day: "2026-10-01", new_followers: 4 },
      { day: "2026-10-02", new_followers: 3 },
    ]);
    expect(followers.demographics).toEqual([
      {
        kind: "followers",
        as_of: "2026-10-02",
        groups: [
          {
            group: "Location",
            items: [
              { name: "Bengaluru", share: 75 },
              { name: "Kolkata", share: 25 },
            ],
          },
          {
            group: "Seniority",
            items: [
              { name: "Senior", share: 50 },
              { name: "Entry", share: 50 },
            ],
          },
        ],
      },
    ]);
  });

  it("puts the files together, with engagements added up", () => {
    const month = buildMonth(
      [content, followers],
      "linkedin",
      "2026-10",
      "2026-11-25",
      { month: "2026-09", followers: 400 },
    );
    expect(month).toMatchObject({
      days: 2,
      impressions: 300,
      engagements: 32,
      posts: 1,
      followers: null,
    });
    expect(month.followersNote).toContain("doesn't give the total");
    expect(month.insights.stats).toMatchObject({
      new_followers: 7,
      clicks: 14,
      reactions: 14,
    });
    expect(month.insights.posts).toEqual([
      {
        url: "https://www.linkedin.com/feed/update/urn:li:activity:1",
        day: "2026-10-01",
        text: "We're hiring",
        impressions: 150,
        // 4 clicks, 9 likes, 1 comment.
        engagements: 14,
      },
    ]);
    expect(month.insights.sources?.map((source) => source.file)).toEqual([
      "studio1hq_content_1764000000000.xls",
      "studio1hq_followers_1764000000000.xls",
    ]);
  });

  it("reads a running total of followers as the count", () => {
    const running = parsed("studio1hq_followers_1764000000000.xls", [
      {
        name: "New followers",
        rows: [
          ["Date", "Total followers"],
          ["10/30/2026", "480"],
          ["10/31/2026", "484"],
        ],
      },
    ]);
    expect(
      buildMonth([running], "linkedin", "2026-10", "2026-11-25", null)
        .followers,
    ).toBe(484);
  });
});

describe("X exports", () => {
  const overviewCsv = [
    "Date,Impressions,Likes,Engagements,Bookmarks,Shares,New follows,Unfollows,Replies,Reposts,Profile visits,Create Post,Video views,Media views",
    ...Array.from(
      { length: 30 },
      (_, index) =>
        `"Sun, Nov ${index + 1}, 2026",1000,10,50,2,1,5,1,3,4,7,1,20,30`,
    ),
  ].join("\n");
  const postsCsv = [
    "Post id,Date,Post text,Post Link,Impressions,Likes,Engagements,Bookmarks,Shares,New follows,Replies,Reposts,Profile visits",
    '1987,"Mon, Nov 2, 2026","Launch day, finally",https://x.com/Studio1HQ/status/1987,9000,80,300,5,2,6,10,12,40',
    '1988,"Tue, Nov 3, 2026",A smaller one,https://x.com/Studio1HQ/status/1988,400,4,20,0,0,0,1,1,2',
    '1900,"Fri, Oct 30, 2026",Last month,https://x.com/Studio1HQ/status/1900,700,4,20,0,0,0,1,1,2',
  ].join("\n");
  const overview = parsed("account_overview_analytics.csv", [
    { name: "Sheet1", rows: parseCsv(overviewCsv) },
  ]);
  const posts = parsed("account_analytics_content.csv", [
    { name: "Sheet1", rows: parseCsv(postsCsv) },
  ]);

  it("reads the account overview and the posts", () => {
    expect([overview.platform, posts.platform, overview.label]).toEqual([
      "x",
      "x",
      "X analytics",
    ]);
    expect(overview.daily[0]).toMatchObject({
      day: "2026-11-01",
      impressions: 1000,
      engagements: 50,
      new_followers: 5,
      lost_followers: 1,
      reactions: 10,
      saves: 2,
      shares: 1,
      profile_views: 7,
      posts: 1,
      video_views: 20,
    });
    expect(posts.posts[0]).toMatchObject({
      url: "https://x.com/Studio1HQ/status/1987",
      day: "2026-11-02",
      text: "Launch day, finally",
      impressions: 9000,
    });
  });

  it("carries followers on from last month with the net follows", () => {
    const month = buildMonth([overview, posts], "x", "2026-11", "2026-12-01", {
      month: "2026-10",
      followers: 271,
    });
    expect(month).toMatchObject({
      days: 30,
      of: 30,
      impressions: 30_000,
      engagements: 1500,
      posts: 30,
      followers: 271 + 150 - 30,
    });
    expect(month.insights.posts?.map((post) => post.impressions)).toEqual([
      9000, 400,
    ]);
    expect(month.insights.posts_measure).toBe("lifetime");
    // Not from a month that isn't the one before.
    expect(
      buildMonth([overview], "x", "2026-11", "2026-12-01", {
        month: "2026-08",
        followers: 271,
      }).followers,
    ).toBeNull();
  });

  it("adds up the posts when there are no daily numbers", () => {
    const month = buildMonth([posts], "x", "2026-11", "2026-12-01", null);
    expect(month).toMatchObject({
      days: 0,
      impressions: 9400,
      engagements: 320,
      posts: 2,
    });
    expect(month.notes[0]).toContain("added up from the 2 posts");
  });

  it("offers the months in the files, starting on the newest whole one", () => {
    const choices = monthsIn([overview, posts], "2026-12-03");
    expect(choices).toEqual([
      { month: "2026-11", days: 30, of: 30 },
      { month: "2026-10", days: 0, of: 31 },
    ]);
    expect(defaultMonth(choices)).toBe("2026-11");
    expect(
      defaultMonth([
        { month: "2026-12", days: 2, of: 3 },
        { month: "2026-11", days: 12, of: 30 },
      ]),
    ).toBe("2026-12");
  });
});

describe("YouTube exports", () => {
  // Like YouTube Studio's Content export, 28 Oct – 25 Nov.
  const youtube = parsed("Content 2026-10-28_2026-11-25 Studio1HQ.zip", [
    {
      name: "Table data",
      rows: parseCsv(
        [
          "Content,Video title,Video publish time,Duration,Views,Watch time (hours),Subscribers,Thumbnail impressions,Thumbnail click-through rate (%)",
          "Total,,,,937,6.9654,7,5838,2.64",
          'jRf7ryRbyXo,"Kimi K3.1 Pro, All You Need To Know!","Nov 9, 2026",294,195,1.4325,3,1298,3.08',
          '86fFNr5Dyqk,Our Story,"Aug 4, 2026",348,38,0.5006,0,105,1.9',
          'TMxibaHTLTI,Debugging with Claude Code,"Nov 11, 2026",528,129,1.7953,3,606,2.64',
        ].join("\n"),
      ),
    },
    {
      name: "Chart data",
      rows: parseCsv(
        [
          "Date,Content,Video title,Video publish time,Duration,Views",
          '2026-11-01,jRf7ryRbyXo,"Kimi K3.1 Pro, All You Need To Know!","Nov 9, 2026",294,999',
        ].join("\n"),
      ),
    },
    {
      name: "Totals",
      rows: parseCsv(
        [
          "Date,Views",
          "2026-10-28,14",
          "2026-10-31,31",
          "2026-11-01,20",
          "2026-11-02,23",
        ].join("\n"),
      ),
    },
  ]);

  it("reads the totals, each video and the views a day", () => {
    expect(youtube).toMatchObject({
      platform: "youtube",
      label: "YouTube Studio analytics",
      from: "2026-10-28",
      to: "2026-11-25",
      postNumbers: "month",
      periodStats: {
        video_views: 937,
        new_followers: 7,
        impressions: 5838,
      },
    });
    expect(youtube.periodStats.watch_minutes).toBeCloseTo(417.9, 1);
    // The Chart data's few videos a day are left out: Totals has the days.
    expect(youtube.daily.map((day) => [day.day, day.video_views])).toEqual([
      ["2026-10-28", 14],
      ["2026-10-31", 31],
      ["2026-11-01", 20],
      ["2026-11-02", 23],
    ]);
    expect(youtube.posts[0]).toMatchObject({
      url: "https://www.youtube.com/watch?v=jRf7ryRbyXo",
      text: "Kimi K3.1 Pro, All You Need To Know!",
      day: "2026-11-09",
      video_views: 195,
      impressions: 1298,
    });
  });

  it("makes November from it, saying which numbers run into October", () => {
    const month = buildMonth(
      [youtube],
      "youtube",
      "2026-11",
      "2026-11-26",
      null,
    );
    expect(month).toMatchObject({
      impressions: 5838,
      engagements: null,
      posts: 2,
    });
    expect(month.insights.stats).toMatchObject({
      video_views: 43,
      new_followers: 7,
      watch_minutes: 418,
    });
    expect(month.insights.daily?.[0]).toEqual({ day: "2026-11-01", views: 20 });
    // Most watched first.
    expect(month.insights.posts?.map((post) => post.views)).toEqual([
      195, 129, 38,
    ]);
    expect(month.notes.join(" ")).toContain("4 of them before the month");
    // October has only a few of the export's days: no totals for it.
    const october = buildMonth(
      [youtube],
      "youtube",
      "2026-10",
      "2026-11-26",
      null,
    );
    expect(october.impressions).toBeNull();
  });
});

describe("several months at once", () => {
  /** X's overview for `from` (a 1st) over `count` days: 5 follows, 1 unfollow a day. */
  function xDays(from: string, count: number) {
    const rows = Array.from({ length: count }, (_, index) => {
      const date = new Date(`${from}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + index);
      const name = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
      return `"${name}",1000,10,50,2,1,5,1,3,4,7,1,20,30`;
    });
    return parsed("account_overview_analytics.csv", [
      {
        name: "Sheet1",
        rows: parseCsv(
          [
            "Date,Impressions,Likes,Engagements,Bookmarks,Shares,New follows,Unfollows,Replies,Reposts,Profile visits,Create Post,Video views,Media views",
            ...rows,
          ].join("\n"),
        ),
      },
    ]);
  }
  const none = () => null;

  it("takes only the months the files have every day of", () => {
    const file = xDays("2026-09-10", 21 + 31 + 30);
    const choices = monthsIn([file], "2026-12-03");
    expect(wholeMonths(choices)).toEqual(["2026-10", "2026-11"]);
    const plans = planMonths(
      [file],
      ["x"],
      ["2026-09", "2026-10", "2026-11"],
      "2026-12-03",
      {
        typed: none,
        logged: none,
      },
    );
    expect(plans.map((plan) => plan.month)).toEqual(["2026-10", "2026-11"]);
    expect(plans[0].drafts[0]).toMatchObject({
      impressions: 31_000,
      followers: null,
    });
  });

  it("counts this month to yesterday, as the exports run", () => {
    // Like X's export made on 26 Nov: 29 Oct to 25 Nov.
    const file = xDays("2026-10-29", 28);
    const choices = monthsIn([file], "2026-11-26");
    expect(choices).toEqual([
      { month: "2026-11", days: 25, of: 25 },
      { month: "2026-10", days: 3, of: 31 },
    ]);
    expect(wholeMonths(choices)).toEqual(["2026-11"]);
    expect(monthsIn([file], "2026-12-01").map((c) => c.month)).toEqual([
      "2026-11",
      "2026-10",
    ]);
  });

  it("works X's followers back from one total typed in", () => {
    const file = xDays("2026-10-01", 31 + 30);
    const plans = planMonths(
      [file],
      ["x"],
      ["2026-10", "2026-11"],
      "2026-12-03",
      {
        typed: (_, month) => (month === "2026-11" ? 1000 : null),
        logged: none,
      },
    );
    // November's 1000, less its 150 follows, plus its 30 unfollows.
    expect(plans[0].drafts[0].followers).toBe(880);
    expect(plans[0].drafts[0].followersNote).toContain("November's 1,000");
  });

  it("works a LinkedIn Page's followers back without unfollows", () => {
    const rows: Cell[][] = [
      [
        "Date",
        "Sponsored followers",
        "Organic followers",
        "Auto-invited followers",
        "Total followers",
      ],
      ...usDays("2026-10-01", 31 + 30).map((day) => [day, "0", "2", "0", "2"]),
    ];
    const file = parsed("studio1hq_followers_1764000000000.xls", [
      { name: "New followers", rows },
    ]);
    const plans = planMonths(
      [file],
      ["linkedin"],
      ["2026-10", "2026-11"],
      "2026-12-03",
      {
        typed: none,
        logged: (_, month) => (month === "2026-11" ? 480 : null),
      },
    );
    expect(plans.map((plan) => plan.drafts[0].followers)).toEqual([
      480 - 60,
      null,
    ]);
    expect(plans[0].drafts[0].followersNote).toContain(
      "doesn't count unfollows",
    );
  });

  it("carries X's followers on from the month logged before", () => {
    const file = xDays("2026-10-01", 31 + 30);
    const plans = planMonths(
      [file],
      ["x"],
      ["2026-10", "2026-11"],
      "2026-12-03",
      {
        typed: none,
        logged: (_, month) => (month === "2026-09" ? 700 : null),
      },
    );
    expect(plans.map((plan) => plan.drafts[0].followers)).toEqual([
      700 + 31 * 4,
      700 + 31 * 4 + 30 * 4,
    ]);
  });
});

describe("files that aren't exports", () => {
  it("says so", () => {
    const result = parseExport("guests.csv", [
      { name: "Sheet1", rows: parseCsv("Name,Email\nAsha,asha@example.com") },
    ]);
    expect(result.ok).toBe(false);
  });
});
