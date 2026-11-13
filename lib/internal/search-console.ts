import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";

/**
 * Google Search numbers per blog post (clicks, impressions, average
 * position) for the dashboard's Blog page, from the Search Console API.
 * It reads as a Google service account that was added to the Search
 * Console property as a user; no Google sign-in for the team.
 *
 *   GSC_CLIENT_EMAIL  the service account's email (…@….iam.gserviceaccount.com)
 *   GSC_PRIVATE_KEY   its private key from the JSON key file ("-----BEGIN
 *                     PRIVATE KEY-----\n…"; \n escapes are fine)
 *   GSC_SITE_URL      optional: the property, default "sc-domain:studio1hq.com"
 *                     (a URL-prefix property is "https://www.studio1hq.com/")
 *
 * The last 28 days of final data, which Google has about two days behind.
 * Cached for six hours.
 */

export type SearchNumbers = { clicks: number; impressions: number; ctr: number; position: number };
export type SearchStats =
  | { ok: true; start: string; end: string; posts: Record<string, SearchNumbers> }
  | { ok: false; message: string };

type Row = { keys?: string[]; clicks?: number; impressions?: number; position?: number };

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function credentials() {
  const email = process.env.GSC_CLIENT_EMAIL?.trim();
  const key = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !key?.includes("PRIVATE KEY")) return null;
  return { email, key, site: process.env.GSC_SITE_URL?.trim() || "sc-domain:studio1hq.com" };
}

export function isSearchConsoleConfigured() {
  return credentials() !== null;
}

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** A signed service-account assertion, exchanged for an access token. */
async function accessToken(email: string, key: string) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = (await response.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(`Google refused the service account key (${json.error_description ?? response.status}).`);
  }
  return json.access_token;
}

/** The post slug in a blog URL ("https://www.studio1hq.com/fr/blog/x/" → "x"), else null. */
export function blogSlug(url: string) {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = path.match(/^(?:\/[a-z]{2}(?:-[A-Za-z]{2})?)?\/blog\/([a-z0-9-]+)\/?$/);
  return match ? match[1] : null;
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

const load = unstable_cache(
  async (): Promise<Extract<SearchStats, { ok: true }>> => {
    const creds = credentials();
    if (!creds) throw new Error("Search Console isn't connected.");
    const token = await accessToken(creds.email, creds.key);
    const { start, end } = searchWindow();
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(creds.site)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: ["page"],
          dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }] }],
          rowLimit: 5000,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 403 || response.status === 404) {
      throw new Error(
        `The service account can't read ${creds.site}. Add ${creds.email} in Search Console → Settings → Users and permissions.`,
      );
    }
    if (!response.ok) throw new Error(`Search Console answered ${response.status}.`);
    const json = (await response.json()) as { rows?: Row[] };
    return { ok: true, start, end, posts: bySlug(json.rows ?? []) };
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
