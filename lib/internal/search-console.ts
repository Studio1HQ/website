import { unstable_cache } from "next/cache";
import { pathSlug, type SearchNumbers, type StatsWindow } from "@/lib/internal/blog/stats";
import { GOOGLE_SCOPES, googleAccessToken, googleError, serviceAccount } from "@/lib/internal/google";

/**
 * Google Search numbers for blog posts (clicks, impressions, average
 * position) from the Search Console API: per post on the Blog page's Live
 * tab, and in full on Blog → Stats. It reads as the dashboard's Google
 * service account (lib/internal/google.ts), added to the Search Console
 * property as a user; no Google sign-in for the team.
 *
 *   GSC_SITE_URL  optional: the property, default "sc-domain:studio1hq.com"
 *                 (a URL-prefix property is "https://www.studio1hq.com/")
 *
 * The Live tab shows the last 28 days of final data, which Google has
 * about two days behind; Stats includes the fresher, still-settling days.
 */

export type { SearchNumbers };
export type SearchStats =
  | { ok: true; start: string; end: string; posts: Record<string, SearchNumbers> }
  | { ok: false; message: string };

type Row = { keys?: string[]; clicks?: number; impressions?: number; position?: number };

function credentials() {
  const account = serviceAccount();
  if (!account) return null;
  return { ...account, site: process.env.GSC_SITE_URL?.trim() || "sc-domain:studio1hq.com" };
}

export function isSearchConsoleConfigured() {
  return credentials() !== null;
}

/** The post slug in a blog URL ("https://www.studio1hq.com/fr/blog/x/" → "x"), else null. */
export function blogSlug(url: string) {
  try {
    return pathSlug(new URL(url).pathname);
  } catch {
    return null;
  }
}

/** Adds up rows per post (translations count with the post); position is weighted by impressions. */
export function bySlug(rows: readonly Row[]) {
  const totals = new Map<string, { clicks: number; impressions: number; weighted: number }>();
  for (const row of rows) {
    const slug = row.keys?.[0] ? blogSlug(row.keys[0]) : null;
    if (!slug) continue;
    const item = totals.get(slug) ?? { clicks: 0, impressions: 0, weighted: 0 };
    const impressions = row.impressions ?? 0;
    item.clicks += row.clicks ?? 0;
    item.impressions += impressions;
    item.weighted += (row.position ?? 0) * impressions;
    totals.set(slug, item);
  }
  const posts: Record<string, SearchNumbers> = {};
  for (const [slug, item] of totals) {
    posts[slug] = {
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.impressions ? item.clicks / item.impressions : 0,
      position: item.impressions ? item.weighted / item.impressions : 0,
    };
  }
  return posts;
}

/** The 28 days ending two days ago (UTC), as YYYY-MM-DD. */
export function searchWindow(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Post pages only: not the blog's index or tag pages. */
const POST_PAGES = { dimension: "page", operator: "includingRegex", expression: "/blog/[a-z0-9-]+/?$" };

/** One Search Analytics query as the service account; throws with a reason a reviewer can act on. */
async function query(body: Record<string, unknown>) {
  const creds = credentials();
  if (!creds) throw new Error("Search Console isn't connected.");
  const token = await googleAccessToken(creds, GOOGLE_SCOPES.searchConsole);
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(creds.site)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (response.status === 403 || response.status === 404) {
    throw new Error(
      `The service account can't read ${creds.site}. Add ${creds.email} in Search Console → Settings → Users and permissions.`,
    );
  }
  if (!response.ok) throw new Error(`Search Console answered: ${await googleError(response)}`);
  const json = (await response.json()) as { rows?: Row[] };
  return json.rows ?? [];
}

const load = unstable_cache(
  async (): Promise<Extract<SearchStats, { ok: true }>> => {
    const { start, end } = searchWindow();
    const rows = await query({
      startDate: start,
      endDate: end,
      dimensions: ["page"],
      dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }] }],
      rowLimit: 5000,
    });
    return { ok: true, start, end, posts: bySlug(rows) };
  },
  ["search-console-blog-28d"],
  { revalidate: 6 * 60 * 60 },
);

/** Never throws; a failure isn't cached, so the next page load tries again. */
export async function searchStats(): Promise<SearchStats> {
  if (!isSearchConsoleConfigured()) return { ok: false, message: "Search Console isn't connected." };
  try {
    return await load();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[search console] ${message}`);
    return { ok: false, message };
  }
}

/* ------------------------------------------------------- Blog → Stats */

export type SearchQuery = { query: string; clicks: number; impressions: number; position: number };
export type SearchDay = { clicks: number; impressions: number; weighted: number };

export type SearchReport =
  | {
      ok: true;
      /** Each day from the previous stretch's start to the end. */
      daily: Record<string, SearchDay>;
      posts: Record<string, SearchNumbers>;
      queries: SearchQuery[];
    }
  | { ok: false; message: string };

/** Rows keyed by date into clicks, impressions and impression-weighted position. */
export function byDay(rows: readonly Row[]) {
  const daily: Record<string, SearchDay> = {};
  for (const row of rows) {
    const day = row.keys?.[0];
    if (!day) continue;
    const impressions = row.impressions ?? 0;
    daily[day] = { clicks: row.clicks ?? 0, impressions, weighted: (row.position ?? 0) * impressions };
  }
  return daily;
}

/** Totals over the days from `from` to `to`, both included. */
export function searchTotals(daily: Record<string, SearchDay>, from: string, to: string) {
  let clicks = 0;
  let impressions = 0;
  let weighted = 0;
  for (const [day, item] of Object.entries(daily)) {
    if (day < from || day > to) continue;
    clicks += item.clicks;
    impressions += item.impressions;
    weighted += item.weighted;
  }
  return { clicks, impressions, position: impressions ? weighted / impressions : 0 };
}

const loadReport = unstable_cache(
  async (start: string, end: string, previousStart: string): Promise<Extract<SearchReport, { ok: true }>> => {
    const shared = { endDate: end, dataState: "all", dimensionFilterGroups: [{ filters: [POST_PAGES] }] };
    const [days, pages, queries] = await Promise.all([
      query({ ...shared, startDate: previousStart, dimensions: ["date"], rowLimit: 1000 }),
      query({ ...shared, startDate: start, dimensions: ["page"], rowLimit: 5000 }),
      query({ ...shared, startDate: start, dimensions: ["query"], rowLimit: 10 }),
    ]);
    return {
      ok: true,
      daily: byDay(days),
      posts: bySlug(pages),
      queries: queries.flatMap((row) =>
        row.keys?.[0]
          ? [{ query: row.keys[0], clicks: row.clicks ?? 0, impressions: row.impressions ?? 0, position: row.position ?? 0 }]
          : [],
      ),
    };
  },
  ["search-console-blog-stats"],
  { revalidate: 60 * 60 },
);

/** Clicks a day, per post and top searches for the window; never throws. */
export async function searchReport(window: StatsWindow): Promise<SearchReport> {
  if (!isSearchConsoleConfigured()) return { ok: false, message: "Search Console isn't connected." };
  try {
    return await loadReport(window.start, window.end, window.previousStart);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[search console] ${message}`);
    return { ok: false, message };
  }
}
