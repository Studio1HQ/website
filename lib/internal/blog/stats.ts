/**
 * The Blog stats page's sums and shapes (app/internal/(dashboard)/blog/stats).
 * Pure, so the tests can check them; the Google reads live in
 * lib/internal/google-analytics.ts and lib/internal/search-console.ts.
 */

export const STATS_RANGES = [
  { key: "7", days: 7, label: "Last 7 days" },
  { key: "28", days: 28, label: "Last 28 days" },
  { key: "90", days: 90, label: "Last 90 days" },
] as const;

export type StatsRange = (typeof STATS_RANGES)[number];

/** The range a `?range=` asks for; 28 days otherwise. */
export function statsRange(value: unknown): StatsRange {
  return STATS_RANGES.find((range) => range.key === value) ?? STATS_RANGES[1];
}

export type StatsWindow = {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  /** Every day from start to end, oldest first. */
  days: string[];
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** `days` days ending yesterday (UTC), and the same stretch just before them. */
export function statsWindow(days: number, now = new Date()): StatsWindow {
  const at = (back: number) =>
    dayKey(
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - back,
        ),
      ),
    );
  return {
    start: at(days),
    end: at(1),
    previousStart: at(2 * days),
    previousEnd: at(days + 1),
    days: Array.from({ length: days }, (_, index) => at(days - index)),
  };
}

/** Post pages, with or without a locale prefix, as an RE2 pattern for Google Analytics. */
export const POST_PATH_PATTERN =
  "^(/[a-z]{2}(-[A-Za-z]{2})?)?/blog/[a-z0-9-]+/?$";

/** The post slug in a site path ("/fr/blog/x/" → "x"), else null. */
export function pathSlug(path: string) {
  const match = path.match(
    /^(?:\/[a-z]{2}(?:-[A-Za-z]{2})?)?\/blog\/([a-z0-9-]+)\/?$/,
  );
  return match ? match[1] : null;
}

/** Google Analytics' "20261118" as "2026-11-18". */
export function gaDay(value: string) {
  return /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;
}

/** Each day's value over the window, 0 for days with none. */
export function fillDays(
  window: Pick<StatsWindow, "days">,
  values: Record<string, number>,
) {
  return window.days.map((day) => ({ day, value: values[day] ?? 0 }));
}

/** The sum of the days from `from` to `to`, both included. */
export function sumDays(
  values: Record<string, number>,
  from: string,
  to: string,
) {
  let total = 0;
  for (const [day, value] of Object.entries(values))
    if (day >= from && day <= to) total += value;
  return total;
}

/** The change against the stretch before as a share (0.12 is +12%), or null with nothing to compare. */
export function changeShare(now: number, before: number) {
  return before > 0 ? (now - before) / before : null;
}

export type ReadNumbers = { views: number; readers: number; engaged: number };
export type SearchNumbers = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type PostStat = {
  slug: string;
  title: string;
  date: string | null;
  reads: ReadNumbers | null;
  search: SearchNumbers | null;
};

/** "my-post-title" as "My post title", for a page that's no longer a post on the site. */
export function titleFromSlug(slug: string) {
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Every post with numbers, most read first: by views when Google Analytics
 * has any, then Google clicks, then impressions. Titles come from the site;
 * a slug the site no longer has keeps a title made from the slug.
 */
export function rankPosts(
  site: readonly { slug: string; title: string; date: string }[],
  reads: Record<string, ReadNumbers> | null,
  search: Record<string, SearchNumbers> | null,
): PostStat[] {
  const known = new Map(site.map((post) => [post.slug, post]));
  const slugs = new Set([
    ...Object.keys(reads ?? {}),
    ...Object.keys(search ?? {}),
  ]);
  const rows: PostStat[] = [...slugs].map((slug) => ({
    slug,
    title: known.get(slug)?.title ?? titleFromSlug(slug),
    date: known.get(slug)?.date || null,
    reads: reads?.[slug] ?? null,
    search: search?.[slug] ?? null,
  }));
  const score = (row: PostStat) =>
    [
      row.reads?.views ?? 0,
      row.search?.clicks ?? 0,
      row.search?.impressions ?? 0,
    ] as const;
  return rows
    .filter((row) => score(row).some((value) => value > 0))
    .sort((a, b) => {
      const [x, y] = [score(a), score(b)];
      return (
        y[0] - x[0] ||
        y[1] - x[1] ||
        y[2] - x[2] ||
        a.slug.localeCompare(b.slug)
      );
    });
}

/** Seconds of reading as "1m 42s", "48s", or "–" for none. */
export function readTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 1) return "–";
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  return minutes
    ? `${minutes}m ${String(whole % 60).padStart(2, "0")}s`
    : `${whole}s`;
}

const SOURCE_NAMES: Record<string, string> = {
  "(direct)": "Direct",
  "(not set)": "Unknown",
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "claude.ai": "Claude",
  "gemini.google.com": "Gemini",
  "t.co": "X",
  "x.com": "X",
  "twitter.com": "X",
  "linkedin.com": "LinkedIn",
  "lnkd.in": "LinkedIn",
  "com.linkedin.android": "LinkedIn",
  "github.com": "GitHub",
  "news.ycombinator.com": "Hacker News",
  "reddit.com": "Reddit",
  "dev.to": "DEV",
  "medium.com": "Medium",
};

/** Google Analytics' session sources in plain names, merged ("t.co" and "x.com" are both X), most first. */
export function readerSources(
  rows: readonly { source: string; views: number }[],
  limit = 6,
) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.source
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");
    const name = SOURCE_NAMES[key] ?? key;
    totals.set(name, (totals.get(name) ?? 0) + row.views);
  }
  return [...totals]
    .map(([source, views]) => ({ source, views }))
    .filter((row) => row.views > 0)
    .sort((a, b) => b.views - a.views || a.source.localeCompare(b.source))
    .slice(0, limit);
}

/* ------------------------------------------- Blog overview and one post */

/** "2026-11" → the `count` months up to it, oldest first. */
export function lastMonths(month: string, count: number) {
  const [year, index] = month.split("-").map(Number);
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(year, index - 1 - (count - 1 - i), 1))
      .toISOString()
      .slice(0, 7),
  );
}

export type MonthWindow = {
  /** "2026-11" */
  month: string;
  /** The 1st of this month to today (UTC). */
  start: string;
  end: string;
  /** The same days of last month, cut at its last day: 1–19 Oct against 1–19 Nov. */
  lastStart: string;
  lastEnd: string;
};

/** This month so far, and the same stretch of last month. */
export function monthWindow(now = new Date()): MonthWindow {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();
  const lastDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    month: dayKey(new Date(Date.UTC(year, month, 1))).slice(0, 7),
    start: dayKey(new Date(Date.UTC(year, month, 1))),
    end: dayKey(new Date(Date.UTC(year, month, today))),
    lastStart: dayKey(new Date(Date.UTC(year, month - 1, 1))),
    lastEnd: dayKey(new Date(Date.UTC(year, month - 1, Math.min(today, lastDays)))),
  };
}

/** The first day Search Console still has: it keeps 16 months. */
export function searchSince(now = new Date()) {
  return dayKey(
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 16, now.getUTCDate() + 2),
    ),
  );
}

/** Daily values added up per month, in the order of `months`. */
export function sumByMonth(
  values: Record<string, number>,
  months: readonly string[],
) {
  const totals = new Map(months.map((month) => [month, 0]));
  for (const [day, value] of Object.entries(values)) {
    const month = day.slice(0, 7);
    if (totals.has(month)) totals.set(month, totals.get(month)! + value);
  }
  return months.map((month) => totals.get(month)!);
}

/** A running total of the points, in order. */
export function runningTotal<T extends { value: number }>(points: readonly T[]) {
  let total = 0;
  return points.map((point) => ({ ...point, value: (total += point.value) }));
}

export type Mover = { slug: string; now: number; before: number; delta: number };

/**
 * The posts that gained and lost the most between two stretches. Small
 * numbers swing a lot, so a post needs `min` in one of the two to count.
 */
export function movers(
  now: Record<string, number>,
  before: Record<string, number>,
  { min = 5, limit = 5 } = {},
) {
  const rows: Mover[] = [...new Set([...Object.keys(now), ...Object.keys(before)])]
    .map((slug) => {
      const a = now[slug] ?? 0;
      const b = before[slug] ?? 0;
      return { slug, now: a, before: b, delta: a - b };
    })
    .filter((row) => Math.max(row.now, row.before) >= min && row.delta !== 0);
  const order = (a: Mover, b: Mover) =>
    Math.abs(b.delta) - Math.abs(a.delta) || a.slug.localeCompare(b.slug);
  return {
    up: rows.filter((row) => row.delta > 0).sort(order).slice(0, limit),
    down: rows.filter((row) => row.delta < 0).sort(order).slice(0, limit),
  };
}

/** One number per post, out of a map of fuller numbers. */
export function pick<T>(
  posts: Record<string, T> | null | undefined,
  value: (item: T) => number,
) {
  const out: Record<string, number> = {};
  for (const [slug, item] of Object.entries(posts ?? {})) out[slug] = value(item);
  return out;
}

const SLUG = /^[a-z0-9-]{1,120}$/;

/** A post slug from a URL segment, or null if it can't be one. */
export function postSlug(value: unknown) {
  return typeof value === "string" && SLUG.test(value) ? value : null;
}

/** One post's pages, with or without a locale prefix, as an RE2 pattern for Google Analytics. */
export function postPathPattern(slug: string) {
  if (!SLUG.test(slug)) throw new Error("Not a post slug.");
  return `^(/[a-z]{2}(-[A-Za-z]{2})?)?/blog/${slug}/?$`;
}

/** One post's URLs as an RE2 pattern for Search Console. */
export function searchPagePattern(slug: string) {
  if (!SLUG.test(slug)) throw new Error("Not a post slug.");
  return `/blog/${slug}/?$`;
}
