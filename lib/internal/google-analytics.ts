import { unstable_cache } from "next/cache";
import {
  POST_PATH_PATTERN,
  gaDay,
  pathSlug,
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

/** The four reports (totals, days, pages, sources), in the order `requests()` asks for them. */
export function readReports([totals, days, pages, sources]: readonly (
  GaReport | undefined
)[]) {
  const named = new Map(
    (totals?.rows ?? []).map((row) => [dimension(row), row]),
  );
  const daily: Record<string, number> = {};
  for (const row of days?.rows ?? [])
    daily[gaDay(dimension(row))] = numberAt(row, 0);
  const posts: Record<string, ReadNumbers> = {};
  for (const row of pages?.rows ?? []) {
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
  return {
    totals: reads(named.get("current")),
    previous: reads(named.get("previous")),
    daily,
    posts,
    sources: (sources?.rows ?? []).map((row) => ({
      source: dimension(row),
      views: numberAt(row, 0),
    })),
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

const load = unstable_cache(
  async (
    start: string,
    end: string,
    previousStart: string,
    previousEnd: string,
  ) => {
    const account = serviceAccount();
    const property = propertyId();
    if (!account || !property)
      throw new Error("Google Analytics isn't connected.");
    const token = await googleAccessToken(account, GOOGLE_SCOPES.analytics);
    const window: StatsWindow = {
      start,
      end,
      previousStart,
      previousEnd,
      days: [],
    };
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ requests: requests(window) }),
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
    return readReports(json.reports ?? []);
  },
  ["google-analytics-blog-stats"],
  { revalidate: 60 * 60 },
);

/** Views, readers and sources for the window; never throws. */
export async function analyticsReport(
  window: StatsWindow,
): Promise<AnalyticsReport> {
  if (!isAnalyticsConfigured())
    return { ok: false, message: "Google Analytics isn't connected." };
  try {
    return {
      ok: true,
      ...(await load(
        window.start,
        window.end,
        window.previousStart,
        window.previousEnd,
      )),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[google analytics] ${message}`);
    return { ok: false, message };
  }
}
