import "server-only";
import { unstable_cache } from "next/cache";
import {
  DEV_ORG_USERNAME,
  readDevArticleNumbers,
  readDevDashboard,
  readDevDays,
  readDevOrgArticles,
  type DevArticleNumbers,
  type DevDashboard,
  type DevDay,
  type DevOrgArticle,
} from "@/lib/internal/blog/devto-stats";
import type { StatsWindow } from "@/lib/internal/blog/stats";

/**
 * Blog → Stats → DEV: the Studio1 organization's numbers from DEV's
 * analytics API. Server-only.
 *
 *   DEV_STATS_API_KEY  a DEV key whose account is a member of the
 *                      organization (DEV → Settings → Extensions). Only for
 *                      reading: this file makes GET requests and nothing
 *                      else, and nothing that publishes uses this key.
 *                      Publishing to DEV is Blog → External, on DEV_API_KEY.
 *
 * DEV allows about 4 reads a second and 40 a minute per key, so a page
 * makes at most five, one after another, and keeps them for an hour.
 * Nothing here throws: callers get `{ ok: false, message }`.
 */

const API = "https://dev.to/api";
const TIMEOUT_MS = 10_000;
const ANALYTICS_PER_PAGE = 100;
const MAX_PAGES = 5;

function apiKey() {
  return process.env.DEV_STATS_API_KEY?.trim() || null;
}

export function isDevStatsConfigured() {
  return apiKey() !== null;
}

class DevStatsError extends Error {}

/** DEV's own reason ({ "error": "…" }), short, or the status. */
async function reason(response: Response) {
  try {
    const json = (await response.json()) as { error?: unknown };
    if (typeof json?.error === "string" && json.error.trim())
      return json.error.trim().slice(0, 300);
  } catch {
    // Not JSON: the status will do.
  }
  return `HTTP ${response.status}`;
}

async function failure(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return "DEV didn't accept DEV_STATS_API_KEY for the Studio1 organization. Check the key is current (DEV → Settings → Extensions) and that its account is a member of dev.to/studio1hq.";
  }
  if (response.status === 429) {
    const wait = Number(response.headers.get("retry-after"));
    return `DEV is limiting requests right now. Try again in ${wait > 0 && wait <= 600 ? `${Math.ceil(wait)} seconds` : "a minute"}.`;
  }
  return `DEV answered ${response.status}: ${await reason(response)}`;
}

type Read = { ok: true; json: unknown } | { ok: false; response: Response };

/** A GET to DEV's API with the stats key. Throws DevStatsError when DEV can't be reached. */
async function get(path: string, query: Record<string, string> = {}) {
  const key = apiKey();
  if (!key) throw new DevStatsError("DEV stats aren't connected.");
  const search = new URLSearchParams(query).toString();
  let response: Response;
  try {
    response = await fetch(`${API}${path}${search ? `?${search}` : ""}`, {
      method: "GET",
      headers: {
        "api-key": key,
        accept: "application/vnd.forem.api-v1+json",
        // DEV turns away requests without a user agent.
        "user-agent": "devto-stats/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new DevStatsError(
      timedOut
        ? "DEV didn't answer in time. Try again in a minute."
        : "Couldn't reach DEV. Try again in a minute.",
    );
  }
  if (!response.ok) return { ok: false, response } satisfies Read;
  const json: unknown = await response.json().catch(() => null);
  if (json === null)
    throw new DevStatsError("DEV sent back something that isn't JSON.");
  return { ok: true, json } satisfies Read;
}

/** The same, failing on any answer that isn't a success. */
async function must(path: string, query: Record<string, string> = {}) {
  const read = await get(path, query);
  if (!read.ok) throw new DevStatsError(await failure(read.response));
  return read.json;
}

type Org = { id: number; name: string };

const loadOrg = unstable_cache(
  async (): Promise<Org> => {
    const json = (await must(`/organizations/${DEV_ORG_USERNAME}`)) as {
      id?: unknown;
      name?: unknown;
    };
    if (typeof json?.id !== "number")
      throw new DevStatsError("DEV didn't say which organization this is.");
    return {
      id: json.id,
      name: typeof json.name === "string" && json.name ? json.name : "Studio1",
    };
  },
  ["devto-org-v1"],
  { revalidate: 24 * 60 * 60 },
);

/** Every published post on the organization (public list: authors, canonical URLs). */
async function orgArticleList() {
  const all: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const json = await must(`/organizations/${DEV_ORG_USERNAME}/articles`, {
      per_page: "1000",
      page: String(page),
    });
    if (!Array.isArray(json))
      throw new DevStatsError(
        "DEV sent back something that isn't a list of posts.",
      );
    all.push(...json);
    if (json.length < 1000) break;
  }
  return all;
}

/**
 * DEV's per-post analytics for the organization, with each day from `start`
 * to `end` when given. DEV only lets some organizations read these: when it
 * says no, the posts show without views and `note` says why.
 */
async function articleNumbers(
  orgId: number,
  range: { start: string; end: string } | null,
): Promise<{
  numbers: [number, DevArticleNumbers][] | null;
  note: string | null;
}> {
  const numbers: [number, DevArticleNumbers][] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const read = await get(`/organizations/${orgId}/article_analytics`, {
      per_page: String(ANALYTICS_PER_PAGE),
      page: String(page),
      ...(range ?? {}),
    });
    if (!read.ok) {
      if ([401, 403, 404].includes(read.response.status))
        return {
          numbers: null,
          note: "DEV doesn't give per-post views for this organization yet, so posts show reactions and comments only.",
        };
      throw new DevStatsError(await failure(read.response));
    }
    if (!Array.isArray(read.json))
      throw new DevStatsError(
        "DEV sent back something that isn't a list of posts.",
      );
    numbers.push(...readDevArticleNumbers(read.json));
    if (read.json.length < ANALYTICS_PER_PAGE) break;
  }
  return { numbers, note: null };
}

type Loaded = {
  org: Org;
  dashboard: DevDashboard;
  previous: Record<string, DevDay>;
  articles: DevOrgArticle[];
  viewsNote: string | null;
};

const loadStats = unstable_cache(
  async (
    start: string,
    end: string,
    previousStart: string,
    previousEnd: string,
  ): Promise<Loaded> => {
    const org = await loadOrg();
    const organization_id = String(org.id);
    // One after another: DEV counts requests a second.
    const dashboard = readDevDashboard(
      await must("/analytics/dashboard", { organization_id, start, end }),
    );
    const previous = readDevDays(
      await must("/analytics/historical", {
        organization_id,
        start: previousStart,
        end: previousEnd,
      }),
    );
    const { numbers, note } = await articleNumbers(org.id, { start, end });
    const list = await orgArticleList();
    return {
      org,
      dashboard,
      previous,
      articles: readDevOrgArticles(list, numbers ? new Map(numbers) : null),
      viewsNote: note,
    };
  },
  ["devto-org-stats-v1"],
  { revalidate: 60 * 60 },
);

export type DevOrgStats =
  ({ ok: true } & Loaded) | { ok: false; message: string };

function failed(error: unknown): { ok: false; message: string } {
  if (error instanceof DevStatsError)
    return { ok: false, message: error.message };
  console.error(
    "[devto-stats]",
    error instanceof Error ? error.message : error,
  );
  return { ok: false, message: "Couldn't read the DEV numbers." };
}

/** The organization's numbers over the window and the stretch before; never throws. */
export async function devOrgStats(window: StatsWindow): Promise<DevOrgStats> {
  if (!isDevStatsConfigured())
    return { ok: false, message: "DEV stats aren't connected." };
  try {
    return {
      ok: true,
      ...(await loadStats(
        window.start,
        window.end,
        window.previousStart,
        window.previousEnd,
      )),
    };
  } catch (error) {
    return failed(error);
  }
}

const loadArticles = unstable_cache(
  async (): Promise<DevOrgArticle[]> => {
    const org = await loadOrg();
    const { numbers } = await articleNumbers(org.id, null);
    return readDevOrgArticles(
      await orgArticleList(),
      numbers ? new Map(numbers) : null,
    );
  },
  ["devto-org-articles-v1"],
  { revalidate: 60 * 60 },
);

/** The organization's copy of a Studio1 post (matched by canonical URL), or null; never throws. */
export async function devOrgPost(slug: string): Promise<DevOrgArticle | null> {
  if (!isDevStatsConfigured()) return null;
  try {
    return (
      (await loadArticles()).find((article) => article.slug === slug) ?? null
    );
  } catch (error) {
    failed(error);
    return null;
  }
}
