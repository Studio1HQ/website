import { unstable_cache } from "next/cache";
import {
  POST_PATH_PATTERN,
  gaDay,
  pathSlug,
  postPathPattern,
  type MonthWindow,
  type ReadNumbers,
  type StatsWindow,
} from "@/lib/internal/blog/stats";
import {
  GOOGLE_SCOPES,
  googleAccessToken,
  googleError,
  serviceAccount,
} from "@/lib/internal/google";

/**
 * Blog numbers from Google Analytics (the GA4 property "studio1hq.com",
 * lib/analytics.ts): views, readers and reading time per post, views a day,
 * and where readers come from, for Blog → Stats. It reads with the Analytics
 * Data API as the dashboard's Google service account (lib/internal/google.ts),
 * added to the property as a Viewer.
 *
 *   GA_PROPERTY_ID  the property's number (Admin → Property details), e.g. "512345678"
 */

/** The site started sending Google Analytics on this day (PR #120); earlier days read as zero. */
export const ANALYTICS_SINCE = "2026-11-18";

function propertyId() {
  const id = process.env.GA_PROPERTY_ID?.trim().replace(/^properties\//, "");
  return id && /^\d+$/.test(id) ? id : null;
}

export function isAnalyticsConfigured() {
  return Boolean(serviceAccount() && propertyId());
}

type GaRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};
export type GaReport = { rows?: GaRow[] };

export type AnalyticsReport =
  | {
      ok: true;
      totals: ReadNumbers;
      previous: ReadNumbers;
      /** Views each day of the window. */
      daily: Record<string, number>;
      posts: Record<string, ReadNumbers>;
      sources: { source: string; views: number }[];
    }
  | { ok: false; message: string };

const READ_METRICS = [
  "screenPageViews",
  "activeUsers",
  "userEngagementDuration",
] as const;

const numberAt = (row: GaRow, index: number) =>
  Number(row.metricValues?.[index]?.value ?? 0) || 0;
const reads = (row: GaRow | undefined): ReadNumbers =>
  row
    ? {
        views: numberAt(row, 0),
        readers: numberAt(row, 1),
        engaged: numberAt(row, 2),
      }
    : { views: 0, readers: 0, engaged: 0 };
const dimension = (row: GaRow) => row.dimensionValues?.[0]?.value ?? "";

/** A report with named date ranges and no dimensions: each range's numbers. */
export function rangeReads(report: GaReport | undefined, name: string) {
  return reads((report?.rows ?? []).find((row) => dimension(row) === name));
}

/** Views a day from a report by date. */
export function dayViews(report: GaReport | undefined) {
  const daily: Record<string, number> = {};
  for (const row of report?.rows ?? [])
    daily[gaDay(dimension(row))] = numberAt(row, 0);
  return daily;
}

/**
 * Numbers per post from a report by page path. With several date ranges,
 * Google adds the range's name as the last dimension: `range` keeps one.
 */
export function postReads(report: GaReport | undefined, range?: string) {
  const posts: Record<string, ReadNumbers> = {};
  for (const row of report?.rows ?? []) {
    if (range !== undefined && row.dimensionValues?.[1]?.value !== range)
      continue;
    const slug = pathSlug(dimension(row));
    if (!slug) continue;
    const item = posts[slug] ?? { views: 0, readers: 0, engaged: 0 };
    const add = reads(row);
    // Readers of /blog/x and /blog/x/ overlap a little; adding them is close enough.
    posts[slug] = {
      views: item.views + add.views,
      readers: item.readers + add.readers,
      engaged: item.engaged + add.engaged,
    };
  }
  return posts;
}

/** Views per value of the report's one dimension (a source, a country), as Google ordered them. */
export function viewsBy(report: GaReport | undefined) {
  return (report?.rows ?? []).map((row) => ({
    source: dimension(row),
    views: numberAt(row, 0),
  }));
}

/** The four reports (totals, days, pages, sources), in the order `requests()` asks for them. */
export function readReports([totals, days, pages, sources]: readonly (
  GaReport | undefined
)[]) {
  return {
    totals: rangeReads(totals, "current"),
    previous: rangeReads(totals, "previous"),
    daily: dayViews(days),
    posts: postReads(pages),
    sources: viewsBy(sources),
  };
}

function requests(window: StatsWindow) {
  const current = { startDate: window.start, endDate: window.end };
  const dimensionFilter = {
    filter: {
      fieldName: "pagePath",
      stringFilter: { matchType: "FULL_REGEXP", value: POST_PATH_PATTERN },
    },
  };
  const metrics = READ_METRICS.map((name) => ({ name }));
  const views = [{ name: "screenPageViews" }];
  return [
    {
      dateRanges: [
        { ...current, name: "current" },
        {
          startDate: window.previousStart,
          endDate: window.previousEnd,
          name: "previous",
        },
      ],
      metrics,
      dimensionFilter,
    },
    {
      dateRanges: [current],
      dimensions: [{ name: "date" }],
      metrics: views,
      dimensionFilter,
      limit: 400,
    },
    {
      dateRanges: [current],
      dimensions: [{ name: "pagePath" }],
      metrics,
      dimensionFilter,
      limit: 2000,
    },
    {
      dateRanges: [current],
      dimensions: [{ name: "sessionSource" }],
      metrics: views,
      dimensionFilter,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 25,
    },
  ];
}

/** Up to five reports in one call, as the service account; throws with a reason a reviewer can act on. */
async function runReports(requests: readonly object[]): Promise<GaReport[]> {
  const account = serviceAccount();
  const property = propertyId();
  if (!account || !property)
    throw new Error("Google Analytics isn't connected.");
  const token = await googleAccessToken(account, GOOGLE_SCOPES.analytics);
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ requests }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (response.status === 403) {
    throw new Error(
      `The service account can't read property ${property} (${await googleError(response)}). Add ${account.email} in Google Analytics → Admin → Property access management as a Viewer, and turn on the Google Analytics Data API in its Google Cloud project.`,
    );
  }
  if (!response.ok)
    throw new Error(
      `Google Analytics answered: ${await googleError(response)}`,
    );
  const json = (await response.json()) as { reports?: GaReport[] };
  return json.reports ?? [];
}

/** Runs `read` and turns a failure into a message; never throws. */
async function safely<T>(read: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; message: string }> {
  if (!isAnalyticsConfigured())
    return { ok: false, message: "Google Analytics isn't connected." };
  try {
    return { ok: true, ...(await read()) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[google analytics] ${message}`);
    return { ok: false, message };
  }
}

const load = unstable_cache(
  async (
    start: string,
    end: string,
    previousStart: string,
    previousEnd: string,
  ) => {
    const window: StatsWindow = {
      start,
      end,
      previousStart,
      previousEnd,
      days: [],
    };
    return readReports(await runReports(requests(window)));
  },
  ["google-analytics-blog-stats"],
  { revalidate: 60 * 60 },
);

/** Views, readers and sources for the window; never throws. */
export function analyticsReport(window: StatsWindow): Promise<AnalyticsReport> {
  return safely(() =>
    load(window.start, window.end, window.previousStart, window.previousEnd),
  );
}

/* ------------------------------------------------------- Blog overview */

export type AnalyticsOverview =
  | {
      ok: true;
      /** This month so far, the same days of last month, and everything since ANALYTICS_SINCE. */
      month: ReadNumbers;
      lastMonth: ReadNumbers;
      lifetime: ReadNumbers;
      /** Views each day since ANALYTICS_SINCE. */
      daily: Record<string, number>;
      /** Per post: this month so far, the last 28 days and the 28 before them. */
      monthPosts: Record<string, ReadNumbers>;
      recent: Record<string, ReadNumbers>;
      before: Record<string, ReadNumbers>;
    }
  | { ok: false; message: string };

const loadOverview = unstable_cache(
  async (key: string) => {
    const ranges = JSON.parse(key) as {
      month: [string, string];
      lastMonth: [string, string];
      recent: [string, string];
      before: [string, string];
      today: string;
    };
    const dimensionFilter = {
      filter: {
        fieldName: "pagePath",
        stringFilter: { matchType: "FULL_REGEXP", value: POST_PATH_PATTERN },
      },
    };
    const metrics = READ_METRICS.map((name) => ({ name }));
    const range = ([startDate, endDate]: [string, string], name?: string) => ({
      startDate,
      endDate,
      ...(name ? { name } : {}),
    });
    const [totals, days, month, stretches] = await runReports([
      {
        dateRanges: [
          range(ranges.month, "month"),
          range(ranges.lastMonth, "lastMonth"),
          range([ANALYTICS_SINCE, ranges.today], "lifetime"),
        ],
        metrics,
        dimensionFilter,
      },
      {
        dateRanges: [range([ANALYTICS_SINCE, ranges.today])],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter,
        limit: 2000,
      },
      {
        dateRanges: [range(ranges.month)],
        dimensions: [{ name: "pagePath" }],
        metrics,
        dimensionFilter,
        limit: 2000,
      },
      {
        dateRanges: [
          range(ranges.recent, "recent"),
          range(ranges.before, "before"),
        ],
        dimensions: [{ name: "pagePath" }],
        metrics,
        dimensionFilter,
        limit: 4000,
      },
    ]);
    return {
      month: rangeReads(totals, "month"),
      lastMonth: rangeReads(totals, "lastMonth"),
      lifetime: rangeReads(totals, "lifetime"),
      daily: dayViews(days),
      monthPosts: postReads(month),
      recent: postReads(stretches, "recent"),
      before: postReads(stretches, "before"),
    };
  },
  ["google-analytics-blog-overview"],
  { revalidate: 60 * 60 },
);

/** This month, all time and per-post numbers for the Blog overview; never throws. */
export function analyticsOverview(
  month: MonthWindow,
  stretch: StatsWindow,
): Promise<AnalyticsOverview> {
  return safely(() =>
    loadOverview(
      JSON.stringify({
        month: [month.start, month.end],
        lastMonth: [month.lastStart, month.lastEnd],
        recent: [stretch.start, stretch.end],
        before: [stretch.previousStart, stretch.previousEnd],
        today: month.end,
      }),
    ),
  );
}

/* ------------------------------------------------------------ One post */

export type AnalyticsPost =
  | {
      ok: true;
      totals: ReadNumbers;
      previous: ReadNumbers;
      /** Everything since ANALYTICS_SINCE. */
      lifetime: ReadNumbers;
      daily: Record<string, number>;
      sources: { source: string; views: number }[];
      countries: { source: string; views: number }[];
    }
  | { ok: false; message: string };

const loadPost = unstable_cache(
  async (
    slug: string,
    start: string,
    end: string,
    previousStart: string,
    previousEnd: string,
  ) => {
    const dimensionFilter = {
      filter: {
        fieldName: "pagePath",
        stringFilter: { matchType: "FULL_REGEXP", value: postPathPattern(slug) },
      },
    };
    const metrics = READ_METRICS.map((name) => ({ name }));
    const views = [{ name: "screenPageViews" }];
    const current = { startDate: start, endDate: end };
    const top = (name: string) => ({
      dateRanges: [current],
      dimensions: [{ name }],
      metrics: views,
      dimensionFilter,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 25,
    });
    const [totals, days, sources, countries] = await runReports([
      {
        dateRanges: [
          { ...current, name: "current" },
          { startDate: previousStart, endDate: previousEnd, name: "previous" },
          { startDate: ANALYTICS_SINCE, endDate: "today", name: "lifetime" },
        ],
        metrics,
        dimensionFilter,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: "date" }],
        metrics: views,
        dimensionFilter,
        limit: 400,
      },
      top("sessionSource"),
      top("country"),
    ]);
    return {
      totals: rangeReads(totals, "current"),
      previous: rangeReads(totals, "previous"),
      lifetime: rangeReads(totals, "lifetime"),
      daily: dayViews(days),
      sources: viewsBy(sources),
      countries: viewsBy(countries),
    };
  },
  ["google-analytics-blog-post"],
  { revalidate: 60 * 60 },
);

/** One post's views, readers, days, sources and countries for the window; never throws. */
export function analyticsPost(
  slug: string,
  window: StatsWindow,
): Promise<AnalyticsPost> {
  return safely(() =>
    loadPost(slug, window.start, window.end, window.previousStart, window.previousEnd),
  );
}
