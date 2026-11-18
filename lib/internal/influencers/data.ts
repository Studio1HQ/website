import "server-only";
import { cache } from "react";
import {
  deleteRows,
  insertRow,
  selectRows,
  updateRows,
} from "@/lib/supabase-server";
import { isUuid } from "@/lib/internal/community/clean";
import { isMissingTable } from "@/lib/internal/community/data";
import {
  INFLUENCERS_MIGRATION_HINT,
  INFLUENCER_DETAILS_HINT,
  type Channel,
  type Influencer,
  type InfluencerResult,
  type Post,
  type Rate,
} from "@/lib/internal/influencers/schema";
import { membersWith } from "@/lib/internal/members";
import { requireArea, type Staff } from "@/lib/internal/session";

/**
 * Influencer reads and writes. People given Influencers on People (the
 * founders always are; Admin alone isn't enough): what creators charge, and
 * what Studio1 paid them, isn't for the whole team. Pages check with
 * requireInfluencers; the actions check on their own
 * (app/internal/(dashboard)/influencers/actions.ts). Nothing below that
 * checks who's asking.
 */

export async function requireInfluencers(): Promise<Staff> {
  return requireArea("influencers", "manage");
}

export const TABLES = {
  influencers: "influencers",
  channels: "influencer_channels",
  rates: "influencer_rates",
  posts: "influencer_posts",
} as const;
export type TableKey = keyof typeof TABLES;

export type Loaded<T> =
  | { ok: true; rows: T[]; truncated: boolean }
  | { ok: false; missing: boolean; message: string };

const PAGE = 1000;

/** Every matching row, a page at a time (Supabase caps a read at 1,000), up to `cap`. */
async function selectAll<T>(
  table: string,
  params: Record<string, string>,
  cap = 10_000,
): Promise<Loaded<T>> {
  const rows: T[] = [];
  const order = [params.order, "id.asc"].filter(Boolean).join(",");
  for (let offset = 0; offset < cap; offset += PAGE) {
    const result = await selectRows<T>(
      table,
      new URLSearchParams({
        select: "*",
        ...params,
        order,
        limit: String(PAGE),
        offset: String(offset),
      }),
    );
    if (!result.ok) {
      const missing = isMissingTable(result.message);
      if (!missing)
        console.error(
          `[influencers] reading ${table} failed: ${result.message}`,
        );
      return {
        ok: false,
        missing,
        message: missing
          ? INFLUENCERS_MIGRATION_HINT
          : "Couldn't load the influencers just now. Reload in a minute.",
      };
    }
    rows.push(...result.rows);
    if (result.rows.length < PAGE) return { ok: true, rows, truncated: false };
  }
  return { ok: true, rows, truncated: true };
}

/* Postgres sends numerics and big integers as text or numbers; the pages want numbers. */
function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapped<T>(result: Loaded<T>, fix: (row: T) => T): Loaded<T> {
  return result.ok ? { ...result, rows: result.rows.map(fix) } : result;
}

// The details fields are blank until their migration has run.
const toInfluencer = (row: Influencer): Influencer => ({
  ...row,
  tags: row.tags ?? [],
  niches: row.niches ?? [],
  audience: row.audience ?? "",
  languages: row.languages ?? "",
  content_style: row.content_style ?? "",
});
const toChannel = (row: Channel): Channel => ({
  ...row,
  followers: number(row.followers),
  median_views: number(row.median_views),
  avg_views: number(row.avg_views),
  best_views: number(row.best_views),
  avg_engagements: number(row.avg_engagements),
  posts_per_month: number(row.posts_per_month),
  open_rate: number(row.open_rate),
  click_rate: number(row.click_rate),
});
const toRate = (row: Rate): Rate => ({ ...row, price: number(row.price) ?? 0 });
const toPost = (row: Post): Post => ({
  ...row,
  cost: number(row.cost),
  views: number(row.views),
  likes: number(row.likes),
  comments: number(row.comments),
  reposts: number(row.reposts),
  saves: number(row.saves),
  clicks: number(row.clicks),
});

/* ----------------------------------------------------------------- reads */

/** `of` narrows the three child lists to one creator. */
const scope = (of?: string): Record<string, string> =>
  of ? { influencer_id: `eq.${of}` } : {};

export const loadInfluencers = cache(async (): Promise<Loaded<Influencer>> =>
  mapped(
    await selectAll<Influencer>(TABLES.influencers, { order: "name.asc" }),
    toInfluencer,
  ),
);

export const loadChannels = cache(
  async (of?: string): Promise<Loaded<Channel>> =>
    mapped(
      await selectAll<Channel>(
        TABLES.channels,
        { ...scope(of), order: "platform.asc" },
        20_000,
      ),
      toChannel,
    ),
);

export const loadRates = cache(async (of?: string): Promise<Loaded<Rate>> =>
  mapped(
    await selectAll<Rate>(
      TABLES.rates,
      { ...scope(of), order: "platform.asc,format.asc,price.asc" },
      20_000,
    ),
    toRate,
  ),
);

/** Newest first. */
export const loadPosts = cache(async (of?: string): Promise<Loaded<Post>> =>
  mapped(
    await selectAll<Post>(
      TABLES.posts,
      { ...scope(of), order: "posted_on.desc,created_at.desc" },
      20_000,
    ),
    toPost,
  ),
);

/** One row of any of the four tables, as saved; null when it isn't there. */
export async function getRecord<T = Record<string, unknown>>(
  table: TableKey,
  id: string,
): Promise<T | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows<T>(
    TABLES[table],
    new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }),
  );
  if (!result.ok) {
    if (!isMissingTable(result.message))
      console.error(
        `[influencers] reading ${TABLES[table]} failed: ${result.message}`,
      );
    return "error";
  }
  return result.rows[0] ?? null;
}

export async function getInfluencer(
  id: string,
): Promise<Influencer | null | "error"> {
  const row = await getRecord<Influencer>("influencers", id);
  return row && row !== "error" ? toInfluencer(row) : row;
}

/** People who can own a creator: whoever has Influencers (the founders included). */
export async function ownerChoices(): Promise<string[]> {
  return (await membersWith(["influencer_manager"])).sort();
}

/* ---------------------------------------------------------------- writes */

const GONE: InfluencerResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};

function writeError(what: string, message: string): InfluencerResult {
  // A missing column with the tables there: the details migration hasn't run.
  if (/PGRST204|42703/.test(message))
    return { ok: false, message: INFLUENCER_DETAILS_HINT };
  if (isMissingTable(message))
    return { ok: false, message: INFLUENCERS_MIGRATION_HINT };
  if (message.includes("23505")) {
    return {
      ok: false,
      message: "They already have that platform here. Edit that one instead.",
    };
  }
  if (message.includes("23503"))
    return {
      ok: false,
      message: "That influencer isn't there any more. Reload the page.",
    };
  console.error(`[influencers] saving ${what} failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** Adds a row with its stamps; returns the new id. */
export async function insertRecord(
  table: TableKey,
  what: string,
  row: Record<string, unknown>,
  by: string,
): Promise<InfluencerResult> {
  const id = crypto.randomUUID();
  const result = await insertRow(TABLES[table], {
    ...row,
    id,
    created_by: by,
    updated_by: by,
  });
  return result.ok ? { ok: true, id } : writeError(what, result.message);
}

export async function updateRecord(
  table: TableKey,
  what: string,
  id: string,
  patch: Record<string, unknown>,
  by: string,
): Promise<InfluencerResult> {
  if (!isUuid(id)) return GONE;
  const result = await updateRows(
    TABLES[table],
    new URLSearchParams({ id: `eq.${id}` }),
    {
      ...patch,
      updated_by: by,
      updated_at: new Date().toISOString(),
    },
  );
  if (!result.ok) return writeError(what, result.message);
  return result.count ? { ok: true, id } : GONE;
}

export async function deleteRecord(
  table: TableKey,
  what: string,
  id: string,
): Promise<InfluencerResult> {
  if (!isUuid(id)) return GONE;
  const result = await deleteRows(
    TABLES[table],
    new URLSearchParams({ id: `eq.${id}` }),
  );
  return result.ok ? { ok: true } : writeError(what, result.message);
}
