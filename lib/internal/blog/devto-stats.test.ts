import { describe, expect, it } from "vitest";
import {
  devDayValues,
  devGrowth,
  devMonths,
  devOrgSort,
  devWriters,
  readDevArticleNumbers,
  readDevDashboard,
  readDevDay,
  readDevDays,
  readDevOrgArticles,
  sortDevOrgArticles,
  sumDevDays,
  type DevOrgArticle,
} from "@/lib/internal/blog/devto-stats";

/** A day as DEV's analytics send it. */
const day = (
  views: number,
  reactions: number,
  comments = 0,
  follows = 0,
  read = 0,
) => ({
  comments: { total: comments },
  follows: { total: follows },
  reactions: { total: reactions, like: reactions, readinglist: 0, unicorn: 0 },
  page_views: {
    total: views,
    average_read_time_in_seconds: read,
    total_read_time_in_seconds: views * read,
  },
});

describe("readDevDay", () => {
  it("takes DEV's day object", () => {
    expect(readDevDay(day(120, 7, 2, 1, 95))).toEqual({
      views: 120,
      reactions: 7,
      comments: 2,
      follows: 1,
      readSeconds: 95,
    });
  });

  it("gives zeros for junk", () => {
    expect(readDevDay(null)).toEqual({
      views: 0,
      reactions: 0,
      comments: 0,
      follows: 0,
      readSeconds: 0,
    });
    expect(
      readDevDay({ page_views: { total: -4 }, reactions: "x" }).views,
    ).toBe(0);
  });
});

describe("readDevDays", () => {
  it("keeps only day keys", () => {
    const days = readDevDays({
      "2026-11-01": day(10, 1),
      "2026-11-02": day(20, 0),
      total: day(99, 9),
    });
    expect(Object.keys(days)).toEqual(["2026-11-01", "2026-11-02"]);
    expect(days["2026-11-02"].views).toBe(20);
  });

  it("is empty for anything that isn't an object", () => {
    expect(readDevDays([day(1, 1)])).toEqual({});
    expect(readDevDays("nope")).toEqual({});
  });
});

describe("readDevDashboard", () => {
  const json = {
    historical: { "2026-11-20": day(50, 3, 1, 2, 60) },
    totals: {
      ...day(9000, 800, 120, 0, 70),
      reactions: { total: 800, readinglist: 300, unique_reactors: 450 },
    },
    referrers: {
      domains: [
        { domain: "google.com", count: 40 },
        { domain: "", count: 3 },
        { domain: "t.co", count: 0 },
      ],
    },
    top_contributors: [
      {
        username: "ada",
        name: "Ada",
        reactions_count: 4,
        comments_count: 1,
        score: 10,
      },
      { username: "bad user!", name: "Nope", reactions_count: 9 },
    ],
    follower_engagement: {
      total_followers: 310,
      engaged_followers: 12,
      ratio: 3.9,
    },
    start_date_floor: "2024-08-22",
  };

  it("reads every part", () => {
    const dashboard = readDevDashboard(json);
    expect(dashboard.days["2026-11-20"].follows).toBe(2);
    expect(dashboard.totals.views).toBe(9000);
    expect(dashboard.lifetime).toEqual({
      readSeconds: 630000,
      saves: 300,
      reactors: 450,
    });
    expect(dashboard.since).toBe("2024-08-22");
    // Direct visits ("") stay; a site with no visits doesn't.
    expect(dashboard.referrers).toEqual([
      { domain: "google.com", views: 40 },
      { domain: "", views: 3 },
    ]);
    expect(dashboard.contributors).toEqual([
      { username: "ada", name: "Ada", reactions: 4, comments: 1 },
    ]);
    expect(dashboard.engagement).toEqual({
      followers: 310,
      engaged: 12,
      percent: 3.9,
    });
  });

  it("copes with a missing part", () => {
    const dashboard = readDevDashboard({ totals: day(1, 1) });
    expect(dashboard.days).toEqual({});
    expect(dashboard.referrers).toEqual([]);
    expect(dashboard.contributors).toEqual([]);
    expect(dashboard.engagement).toBeNull();
    expect(dashboard.lifetime).toEqual({
      readSeconds: 0,
      saves: 0,
      reactors: 0,
    });
    expect(dashboard.since).toBeNull();
  });
});

describe("readDevArticleNumbers", () => {
  it("reads all-time numbers and sums the days", () => {
    const numbers = readDevArticleNumbers([
      {
        id: 7,
        page_views_count: 900,
        public_reactions_count: 30,
        comments_count: 4,
        daily: [
          {
            date: "2026-11-20",
            page_views: 12,
            comments: 0,
            reactions: { total: 1 },
          },
          {
            date: "2026-11-21",
            page_views: 8,
            comments: 1,
            reactions: { total: 0 },
          },
        ],
      },
      { id: 8, page_views_count: 5 },
      { title: "no id" },
    ]);
    expect(numbers.get(7)).toEqual({
      views: 900,
      reactions: 30,
      comments: 4,
      rangeViews: 20,
    });
    expect(numbers.get(8)).toEqual({
      views: 5,
      reactions: 0,
      comments: 0,
      rangeViews: null,
    });
    expect(numbers.size).toBe(2);
  });
});

describe("readDevOrgArticles", () => {
  const list = [
    {
      id: 7,
      title: "  DevRel vs\nmarketing ",
      url: "https://dev.to/studio1hq/devrel-vs-marketing-bd9",
      published_at: "2026-11-21T18:00:00Z",
      public_reactions_count: 9,
      comments_count: 0,
      canonical_url:
        "https://www.studio1hq.com/blog/devrel-vs-developer-marketing",
      user: { name: "Nancy", username: "nanseedotai" },
    },
    {
      id: 8,
      title: "",
      url: "https://evil.example/x",
      positive_reactions_count: 2,
      canonical_url: "https://other.site/post",
      user: {},
    },
  ];

  it("cleans the public list", () => {
    const [first, second] = readDevOrgArticles(list);
    expect(first).toEqual({
      id: 7,
      title: "DevRel vs marketing",
      url: "https://dev.to/studio1hq/devrel-vs-marketing-bd9",
      publishedAt: "2026-11-21T18:00:00Z",
      author: { name: "Nancy", username: "nanseedotai" },
      reactions: 9,
      comments: 0,
      views: null,
      rangeViews: null,
      slug: "devrel-vs-developer-marketing",
    });
    expect(second).toMatchObject({
      title: "Untitled",
      url: null,
      author: null,
      reactions: 2,
      slug: null,
    });
  });

  it("lays the analytics over it", () => {
    const numbers = new Map([
      [7, { views: 400, reactions: 11, comments: 1, rangeViews: 50 }],
    ]);
    const [first, second] = readDevOrgArticles(list, numbers);
    expect(first).toMatchObject({
      views: 400,
      rangeViews: 50,
      reactions: 11,
      comments: 1,
    });
    expect(second).toMatchObject({ views: null, rangeViews: null });
  });
});

describe("sumDevDays", () => {
  const days = readDevDays({
    "2026-11-01": day(100, 4, 1, 1, 60),
    "2026-11-02": day(300, 6, 0, 0, 120),
    "2026-11-03": day(999, 99, 9, 9, 10),
  });

  it("adds the days in the stretch, read time weighted by views", () => {
    expect(sumDevDays(days, "2026-11-01", "2026-11-02")).toEqual({
      views: 400,
      reactions: 10,
      comments: 1,
      follows: 1,
      readSeconds: 105,
    });
  });

  it("is all zeros with no days", () => {
    expect(sumDevDays(days, "2026-10-01", "2026-10-31").readSeconds).toBe(0);
  });

  it("gives one number a day", () => {
    expect(devDayValues(days, "reactions")["2026-11-03"]).toBe(99);
  });
});

describe("devMonths", () => {
  // DEV's long-stretch shape: weeks (keyed by Monday) for old numbers, then days.
  const days = readDevDays({
    "2025-11-24": day(70, 7, 0, 7),
    "2026-01-05": day(30, 3, 1, 3),
    "2026-01-31": day(5, 0, 0, 1),
    "2026-02-01": day(2, 1),
  });

  it("adds up each month and keeps empty months between", () => {
    expect(devMonths(days)).toEqual([
      { month: "2025-11", views: 70, reactions: 7, comments: 0, follows: 7 },
      { month: "2025-12", views: 0, reactions: 0, comments: 0, follows: 0 },
      { month: "2026-01", views: 35, reactions: 3, comments: 1, follows: 4 },
      { month: "2026-02", views: 2, reactions: 1, comments: 0, follows: 0 },
    ]);
  });

  it("is empty with no days", () => {
    expect(devMonths({})).toEqual([]);
  });

  it("gives the running totals, views starting from what came before the records", () => {
    const growth = devGrowth(devMonths(days), readDevDay(day(1107, 0, 0, 11)));
    expect(growth.viewsBefore).toBe(1000);
    expect(growth.followsBefore).toBe(0);
    expect(growth.points.map((point) => point.views)).toEqual([
      1070, 1070, 1105, 1107,
    ]);
    expect(growth.points.map((point) => point.follows)).toEqual([7, 7, 11, 11]);
  });

  it("never starts below zero when the total lags the days", () => {
    const growth = devGrowth(devMonths(days), readDevDay(day(50, 0)));
    expect(growth.viewsBefore).toBe(0);
    expect(growth.points[0].views).toBe(70);
  });
});

const article = (over: Partial<DevOrgArticle>): DevOrgArticle => ({
  id: 1,
  title: "A",
  url: null,
  publishedAt: "2026-11-01T00:00:00Z",
  author: { name: "Ada", username: "ada" },
  reactions: 0,
  comments: 0,
  views: null,
  rangeViews: null,
  slug: null,
  ...over,
});

describe("devWriters", () => {
  it("adds up each writer, most read first", () => {
    const writers = devWriters([
      article({ id: 1, reactions: 5, views: 100, rangeViews: 10 }),
      article({ id: 2, reactions: 1, views: 50, rangeViews: 5 }),
      article({
        id: 3,
        author: { name: "Bo", username: "bo" },
        reactions: 40,
        views: 10,
        rangeViews: 30,
      }),
      article({ id: 4, author: null, reactions: 99 }),
    ]);
    expect(writers.map((writer) => writer.username)).toEqual(["bo", "ada"]);
    expect(writers[1]).toMatchObject({
      posts: 2,
      reactions: 6,
      views: 150,
      rangeViews: 15,
    });
  });

  it("keeps views null when DEV gave none", () => {
    expect(devWriters([article({ reactions: 3 })])[0].views).toBeNull();
  });
});

describe("devOrgSort", () => {
  it("takes a known sort", () => {
    expect(devOrgSort("reactions", true)).toBe("reactions");
    expect(devOrgSort("views", true)).toBe("views");
  });

  it("falls back to most read, or newest without views", () => {
    expect(devOrgSort("nope", true)).toBe("read");
    expect(devOrgSort(undefined, false)).toBe("new");
    expect(devOrgSort("read", false)).toBe("new");
    expect(devOrgSort("comments", false)).toBe("comments");
  });
});

describe("sortDevOrgArticles", () => {
  const rows = [
    article({
      id: 1,
      publishedAt: "2026-10-01T00:00:00Z",
      reactions: 9,
      views: 10,
      rangeViews: 1,
    }),
    article({
      id: 2,
      publishedAt: "2026-11-01T00:00:00Z",
      reactions: 2,
      views: 500,
      rangeViews: 0,
    }),
    article({
      id: 3,
      publishedAt: "2026-09-01T00:00:00Z",
      reactions: 9,
      views: 20,
      rangeViews: 40,
    }),
  ];
  const ids = (sort: Parameters<typeof sortDevOrgArticles>[1]) =>
    sortDevOrgArticles(rows, sort).map((row) => row.id);

  it("sorts by the number, newest first on ties", () => {
    expect(ids("read")).toEqual([3, 1, 2]);
    expect(ids("views")).toEqual([2, 3, 1]);
    expect(ids("reactions")).toEqual([1, 3, 2]);
    expect(ids("new")).toEqual([2, 1, 3]);
  });

  it("doesn't change the list it was given", () => {
    sortDevOrgArticles(rows, "views");
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
  });
});
