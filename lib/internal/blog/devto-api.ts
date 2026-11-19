import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  devPath,
  readDevArticles,
  type DevArticle,
  type DevDraft,
} from "@/lib/internal/blog/devto";

/**
 * The team's DEV (dev.to) account over DEV's API (API v1), for Blog →
 * External: its articles with their numbers, and new drafts. Server-only:
 * it uses the account's API key, which never goes into a message.
 *
 *   DEV_API_KEY          DEV → Settings → Extensions → "DEV Community API Keys"
 *   DEV_ORGANIZATION_ID  optional: post drafts under this DEV organization
 *                        (its number; the key's account must be a member)
 *
 * Nothing here throws: callers get `{ ok: false, message }`.
 */

const API = "https://dev.to/api";
const PER_PAGE = 1000;
const MAX_PAGES = 5;
const TIMEOUT_MS = 10_000;

/** On the page's kept read of the article list; cleared after a send. */
const DEV_TAG = "devto-articles";

function apiKey() {
  return process.env.DEV_API_KEY?.trim() || null;
}

export function isDevConfigured() {
  return apiKey() !== null;
}

export function devOrganizationId(): number | null {
  const id = process.env.DEV_ORGANIZATION_ID?.trim();
  return id && /^\d{1,12}$/.test(id) ? Number(id) : null;
}

class DevError extends Error {}

function headers(key: string) {
  return {
    "api-key": key,
    accept: "application/vnd.forem.api-v1+json",
    "content-type": "application/json",
    // DEV turns away requests without a user agent.
    "user-agent": "devto-drafts/1.0",
  };
}

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
  if (response.status === 401) {
    return "DEV didn't accept the API key. Make a new one in DEV → Settings → Extensions and update DEV_API_KEY.";
  }
  if (response.status === 429) {
    const wait = Number(response.headers.get("retry-after"));
    return `DEV is limiting requests right now. Wait ${wait > 0 && wait <= 600 ? `${Math.ceil(wait)} seconds` : "a minute"}, then try again.`;
  }
  const detail = await reason(response);
  if (response.status === 422) return `DEV turned the post down: ${detail}`;
  return `DEV answered ${response.status}: ${detail}`;
}

function networkMessage(error: unknown, writing: boolean) {
  const timedOut =
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError");
  if (writing) {
    return timedOut
      ? "DEV didn't answer in time, so the draft may or may not exist. Reload this page before sending again."
      : "Couldn't reach DEV, so the draft may or may not exist. Reload this page before sending again.";
  }
  return timedOut
    ? "DEV didn't answer in time. Try again in a minute."
    : "Couldn't reach DEV. Try again in a minute.";
}

/** Every article on the account, published or not, a page of 1,000 at a time. */
async function fetchArticles(key: string): Promise<DevArticle[]> {
  const articles: DevArticle[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let response: Response;
    try {
      response = await fetch(
        `${API}/articles/me/all?per_page=${PER_PAGE}&page=${page}`,
        {
          headers: headers(key),
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
    } catch (error) {
      throw new DevError(networkMessage(error, false));
    }
    if (!response.ok) throw new DevError(await failure(response));
    const json: unknown = await response.json().catch(() => null);
    if (!Array.isArray(json))
      throw new DevError(
        "DEV sent back something that isn't a list of articles.",
      );
    articles.push(...readDevArticles(json));
    if (json.length < PER_PAGE) break;
  }
  return articles;
}

export type DevList =
  { ok: true; articles: DevArticle[] } | { ok: false; message: string };

function listFailure(error: unknown): DevList {
  const message =
    error instanceof DevError
      ? error.message
      : "Couldn't read the DEV articles.";
  if (!(error instanceof DevError))
    console.error("[devto]", error instanceof Error ? error.message : error);
  return { ok: false, message };
}

const loadArticles = unstable_cache(
  async () => {
    const key = apiKey();
    if (!key) throw new DevError("DEV isn't connected.");
    return fetchArticles(key);
  },
  ["devto-articles-v1"],
  { revalidate: 10 * 60, tags: [DEV_TAG] },
);

/** The account's articles for the page, kept for ten minutes; never throws. */
export async function devArticles(): Promise<DevList> {
  if (!isDevConfigured()) return { ok: false, message: "DEV isn't connected." };
  try {
    return { ok: true, articles: await loadArticles() };
  } catch (error) {
    return listFailure(error);
  }
}

/** The same list read now, to check before making a draft; never throws. */
export async function devArticlesNow(): Promise<DevList> {
  const key = apiKey();
  if (!key) return { ok: false, message: "DEV isn't connected." };
  try {
    return { ok: true, articles: await fetchArticles(key) };
  } catch (error) {
    return listFailure(error);
  }
}

export type DevCreated =
  | { ok: true; id: number | null; path: string | null }
  | { ok: false; message: string };

/** Makes the draft on DEV; never throws. */
export async function createDevDraft(draft: DevDraft): Promise<DevCreated> {
  const key = apiKey();
  if (!key) return { ok: false, message: "DEV isn't connected." };
  let response: Response;
  try {
    response = await fetch(`${API}/articles`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ article: draft }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, message: networkMessage(error, true) };
  }
  if (!response.ok) return { ok: false, message: await failure(response) };
  const json = (await response.json().catch(() => null)) as {
    id?: unknown;
    url?: unknown;
  } | null;
  return {
    ok: true,
    id: typeof json?.id === "number" ? json.id : null,
    path: devPath(json?.url),
  };
}

/** After a send: the page's next read goes to DEV. Server actions and route handlers only. */
export function devArticlesChanged() {
  try {
    revalidateTag(DEV_TAG, { expire: 0 });
  } catch {
    // Outside a request nothing is kept anyway.
  }
}
