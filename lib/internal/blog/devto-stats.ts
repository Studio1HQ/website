import { canonicalSlug, devPath } from "@/lib/internal/blog/devto";

/*
 * Blog → Stats → DEV: the Studio1 organization on DEV (dev.to/studio1hq),
 * read from DEV's own analytics. Pure, so the tests can check it: these
 * take DEV's JSON and give the page clean numbers. The reads are in
 * lib/internal/blog/devto-stats-api.ts.
 *
 * DEV's answers (Forem's API, v1):
 *   GET /api/analytics/dashboard?organization_id&start&end
 *     { historical: { "YYYY-MM-DD": Day }, totals: Day (all time),
 *       referrers: { domains: [{ domain, count }] },
 *       top_contributors: [{ username, name, reactions_count, comments_count }],
 *       follower_engagement: { total_followers, engaged_followers, ratio },
 *       start_date_floor: "2024-08-22" }
 *     Day = { comments: { total }, follows: { total },
 *             reactions: { total, like, readinglist, unique_reactors, … },
 *             page_views: { total, average_read_time_in_seconds,
 *                           total_read_time_in_seconds } }
 *   GET /api/analytics/historical?organization_id&start&end   { "YYYY-MM-DD": Day }
 *     (checked 26 Nov 2026: over a long stretch, entries older than about
 *     six months come one a week, keyed by the Monday, holding the week's sum)
 *   GET /api/organizations/:id/article_analytics?start&end
 *     [{ id, page_views_count, public_reactions_count, comments_count,
 *        daily: [{ date, page_views, comments, reactions: { total } }] }]
 *   GET /api/organizations/:username/articles   (public: authors, canonical URLs)
 */

/** The organization the stats are for. */
export const DEV_ORG_USERNAME = "studio1hq";
export const DEV_ORG_URL = `https://dev.to/${DEV_ORG_USERNAME}`;

export type DevDay = {
  views: number;
  reactions: number;
  comments: number;
  follows: number;
  /** DEV's average read time that day, in seconds (signed-in readers only). */
  readSeconds: number;
};

export type DevReferrer = { domain: string; views: number };

export type DevContributor = {
  username: string;
  name: string;
  reactions: number;
  comments: number;
};

export type DevEngagement = {
  followers: number;
  engaged: number;
  /** 0–100, as DEV gives it. */
  percent: number;
};

export type DevDashboard = {
  days: Record<string, DevDay>;
  /** All time. */
  totals: DevDay;
  /** All time too: seconds read, reading-list saves, people who reacted. */
  lifetime: { readSeconds: number; saves: number; reactors: number };
  /** Readers who came from a site; `domain` is "" for direct or unknown. */
  referrers: DevReferrer[];
  contributors: DevContributor[];
  engagement: DevEngagement | null;
  /** The first day DEV keeps day-by-day numbers for, or null. */
  since: string | null;
};

/** One published post on the organization. */
export type DevOrgArticle = {
  id: number;
  title: string;
  url: string | null;
  publishedAt: string | null;
  author: { name: string; username: string } | null;
  reactions: number;
  comments: number;
  /** All-time views; null when DEV's per-post analytics didn't load. */
  views: number | null;
  /** Views in the chosen days; null when there are none to give. */
  rangeViews: number | null;
  /** The Studio1 post this is a copy of (its canonical URL), else null. */
  slug: string | null;
};

/** Per-post analytics by article id. */
export type DevArticleNumbers = {
  views: number;
  reactions: number;
  comments: number;
  /** The sum of `daily` when DEV sent days, else null. */
  rangeViews: number | null;
};

const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** `{ total: 3 }` or a bare number. */
const total = (value: unknown) =>
  typeof value === "number" ? count(value) : count(record(value).total);

const oneLine = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_DAY: DevDay = {
  views: 0,
  reactions: 0,
  comments: 0,
  follows: 0,
  readSeconds: 0,
};

/** One of DEV's day (or totals) objects. */
export function readDevDay(value: unknown): DevDay {
  const row = record(value);
  return {
    views: total(row.page_views),
    reactions: total(row.reactions),
    comments: total(row.comments),
    follows: total(row.follows),
    readSeconds: count(record(row.page_views).average_read_time_in_seconds),
  };
}

/** DEV's `{ "YYYY-MM-DD": Day }`; anything not keyed by a day is dropped. */
export function readDevDays(json: unknown): Record<string, DevDay> {
  const days: Record<string, DevDay> = {};
  for (const [day, value] of Object.entries(record(json)))
    if (DAY.test(day)) days[day] = readDevDay(value);
  return days;
}

export function readDevDashboard(json: unknown): DevDashboard {
  const row = record(json);
  const domains = record(row.referrers).domains;
  const engagement = record(row.follower_engagement);
  const totals = record(row.totals);
  const reactions = record(totals.reactions);
  const since = row.start_date_floor;
  return {
    days: readDevDays(row.historical),
    totals: readDevDay(totals),
    lifetime: {
      readSeconds: count(record(totals.page_views).total_read_time_in_seconds),
      saves: count(reactions.readinglist),
      reactors: count(reactions.unique_reactors),
    },
    referrers: (Array.isArray(domains) ? domains : []).flatMap(
      (item): DevReferrer[] => {
        const domain = oneLine(record(item).domain);
        const views = count(record(item).count);
        return views ? [{ domain, views }] : [];
      },
    ),
    since: typeof since === "string" && DAY.test(since) ? since : null,
    contributors: (Array.isArray(row.top_contributors)
      ? row.top_contributors
      : []
    ).flatMap((item): DevContributor[] => {
      const person = record(item);
      const username = oneLine(person.username);
      if (!/^[\w.-]{1,60}$/.test(username)) return [];
      return [
        {
          username,
          name: oneLine(person.name) || username,
          reactions: count(person.reactions_count),
          comments: count(person.comments_count),
        },
      ];
    }),
    engagement:
      typeof engagement.total_followers === "number"
        ? {
            followers: count(engagement.total_followers),
            engaged: count(engagement.engaged_followers),
            percent:
              typeof engagement.ratio === "number" &&
              Number.isFinite(engagement.ratio)
                ? Math.max(0, Math.min(100, engagement.ratio))
                : 0,
          }
        : null,
  };
}

/** DEV's per-post analytics list, by article id. */
export function readDevArticleNumbers(
  json: unknown,
): Map<number, DevArticleNumbers> {
  const numbers = new Map<number, DevArticleNumbers>();
  if (!Array.isArray(json)) return numbers;
  for (const item of json) {
    const row = record(item);
    if (typeof row.id !== "number") continue;
    const daily = Array.isArray(row.daily) ? row.daily : null;
    numbers.set(row.id, {
      views: count(row.page_views_count),
      reactions: count(row.public_reactions_count),
      comments: count(row.comments_count),
      rangeViews: daily
        ? daily.reduce((sum, day) => sum + total(record(day).page_views), 0)
        : null,
    });
  }
  return numbers;
}

/**
 * The organization's public post list (GET /organizations/:username/articles)
 * with DEV's per-post analytics laid over it when there are any.
 */
export function readDevOrgArticles(
  json: unknown,
  numbers: ReadonlyMap<number, DevArticleNumbers> | null = null,
): DevOrgArticle[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item): DevOrgArticle[] => {
    const row = record(item);
    if (typeof row.id !== "number") return [];
    const path = devPath(row.url);
    const user = record(row.user);
    const username = oneLine(user.username);
    const own = numbers?.get(row.id);
    return [
      {
        id: row.id,
        title: oneLine(row.title) || "Untitled",
        url: path ? `https://dev.to${path}` : null,
        publishedAt:
          typeof row.published_at === "string" && row.published_at
            ? row.published_at
            : null,
        author: /^[\w.-]{1,60}$/.test(username)
          ? { name: oneLine(user.name) || username, username }
          : null,
        // The analytics are newer than the public list, which DEV caches.
        reactions:
          own?.reactions ??
          count(row.public_reactions_count ?? row.positive_reactions_count),
        comments: own?.comments ?? count(row.comments_count),
        views: own ? own.views : null,
        rangeViews: own ? own.rangeViews : null,
        slug: canonicalSlug(row.canonical_url),
      },
    ];
  });
}

/** Adds up the days from `from` to `to`, both included; read time is weighted by views. */
export function sumDevDays(
  days: Readonly<Record<string, DevDay>>,
  from: string,
  to: string,
): DevDay {
  const sum = { ...EMPTY_DAY };
  let weighted = 0;
  for (const [day, value] of Object.entries(days)) {
    if (day < from || day > to) continue;
    sum.views += value.views;
    sum.reactions += value.reactions;
    sum.comments += value.comments;
    sum.follows += value.follows;
    weighted += value.readSeconds * value.views;
  }
  sum.readSeconds = sum.views ? Math.round(weighted / sum.views) : 0;
  return sum;
}

export type DevMonth = {
  /** "2026-11" */
  month: string;
  views: number;
  reactions: number;
  comments: number;
  follows: number;
};

/**
 * DEV's history added up per month, every month from the first to the last
 * it has (empty ones included), oldest first. Over a long stretch DEV sends
 * older numbers one entry a week, keyed by its Monday, so a week that runs
 * past a month's end counts in the month it starts in.
 */
export function devMonths(days: Readonly<Record<string, DevDay>>): DevMonth[] {
  const keys = Object.keys(days)
    .filter((day) => DAY.test(day))
    .sort();
  if (!keys.length) return [];
  const months = new Map<string, DevMonth>();
  const [lastYear, lastMonth] = keys[keys.length - 1].split("-").map(Number);
  for (
    let [year, month] = keys[0].split("-").map(Number);
    year < lastYear || (year === lastYear && month <= lastMonth);
    month === 12 ? ((year += 1), (month = 1)) : (month += 1)
  ) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.set(key, {
      month: key,
      views: 0,
      reactions: 0,
      comments: 0,
      follows: 0,
    });
  }
  for (const day of keys) {
    const row = months.get(day.slice(0, 7))!;
    row.views += days[day].views;
    row.reactions += days[day].reactions;
    row.comments += days[day].comments;
    row.follows += days[day].follows;
  }
  return [...months.values()];
}

/**
 * Views and followers so far at the end of each month. DEV's all-time
 * totals count views from before its day-by-day records begin, so the
 * views line starts from that difference (`viewsBefore`).
 */
export function devGrowth(months: readonly DevMonth[], totals: DevDay) {
  const recorded = months.reduce(
    (sum, row) => ({
      views: sum.views + row.views,
      follows: sum.follows + row.follows,
    }),
    { views: 0, follows: 0 },
  );
  const viewsBefore = Math.max(0, totals.views - recorded.views);
  const followsBefore = Math.max(0, totals.follows - recorded.follows);
  let views = viewsBefore;
  let follows = followsBefore;
  return {
    viewsBefore,
    followsBefore,
    points: months.map((row) => ({
      month: row.month,
      views: (views += row.views),
      follows: (follows += row.follows),
    })),
  };
}

/** One number a day from DEV's days. */
export function devDayValues(
  days: Readonly<Record<string, DevDay>>,
  key: "views" | "reactions" | "comments" | "follows",
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(days).map(([day, value]) => [day, value[key]]),
  );
}

/** Posts, views and reactions per writer, the most read first. */
export function devWriters(articles: readonly DevOrgArticle[]) {
  const writers = new Map<
    string,
    {
      username: string;
      name: string;
      posts: number;
      views: number | null;
      rangeViews: number | null;
      reactions: number;
    }
  >();
  for (const article of articles) {
    if (!article.author) continue;
    const writer = writers.get(article.author.username) ?? {
      ...article.author,
      posts: 0,
      views: null,
      rangeViews: null,
      reactions: 0,
    };
    writer.posts += 1;
    writer.reactions += article.reactions;
    if (article.views !== null)
      writer.views = (writer.views ?? 0) + article.views;
    if (article.rangeViews !== null)
      writer.rangeViews = (writer.rangeViews ?? 0) + article.rangeViews;
    writers.set(article.author.username, writer);
  }
  return [...writers.values()].sort(
    (a, b) =>
      (b.rangeViews ?? 0) - (a.rangeViews ?? 0) ||
      (b.views ?? 0) - (a.views ?? 0) ||
      b.reactions - a.reactions ||
      a.name.localeCompare(b.name),
  );
}

export const DEV_ORG_SORTS = [
  { key: "read", label: "Most read", needsViews: true },
  { key: "views", label: "Most views ever", needsViews: true },
  { key: "reactions", label: "Most reactions", needsViews: false },
  { key: "comments", label: "Most comments", needsViews: false },
  { key: "new", label: "Newest", needsViews: false },
] as const;
export type DevOrgSort = (typeof DEV_ORG_SORTS)[number]["key"];

/** The sort a `?sort=` asks for; most read when there are views, else newest. */
export function devOrgSort(value: unknown, hasViews: boolean): DevOrgSort {
  const asked = DEV_ORG_SORTS.find((item) => item.key === value);
  if (asked && (hasViews || !asked.needsViews)) return asked.key;
  return hasViews ? "read" : "new";
}

/** Highest first for a number, newest first for "new"; ties go to the newer post. */
export function sortDevOrgArticles(
  articles: readonly DevOrgArticle[],
  sort: DevOrgSort,
) {
  const newest = (a: DevOrgArticle, b: DevOrgArticle) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || b.id - a.id;
  const value = (article: DevOrgArticle) =>
    sort === "read"
      ? (article.rangeViews ?? 0)
      : sort === "views"
        ? (article.views ?? 0)
        : sort === "reactions"
          ? article.reactions
          : sort === "comments"
            ? article.comments
            : 0;
  return [...articles].sort((a, b) => value(b) - value(a) || newest(a, b));
}
