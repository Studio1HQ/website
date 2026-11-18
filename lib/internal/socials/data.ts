import "server-only";
import { deleteRows, selectRows, upsertRows } from "@/lib/supabase-server";
import { isMissingTable } from "@/lib/internal/community/data";
import { requireArea, type Staff } from "@/lib/internal/session";
import {
  SOCIALS_MIGRATION_HINT,
  isPlatform,
  type SocialMetric,
  type SocialResult,
} from "@/lib/internal/socials/schema";

/**
 * Social growth reads and writes. People given Social growth on People (the
 * founders always are; Admin alone isn't enough): the page checks with
 * requireSocials, the actions check on their own.
 */

const TABLE = "social_metrics";

export async function requireSocials(): Promise<Staff> {
  return requireArea("socials", "manage");
}

export type LoadedMetrics =
  | { ok: true; rows: SocialMetric[] }
  | { ok: false; missing: boolean; message: string };

function toMetric(row: Record<string, unknown>): SocialMetric | null {
  if (typeof row.id !== "string" || !isPlatform(row.platform)) return null;
  const number = (value: unknown) =>
    value === null || value === undefined || !Number.isFinite(Number(value))
      ? null
      : Number(value);
  return {
    id: row.id,
    account: String(row.account ?? ""),
    platform: row.platform,
    month: String(row.month ?? ""),
    followers: number(row.followers) ?? 0,
    impressions: number(row.impressions),
    posts: number(row.posts),
    notes: String(row.notes ?? ""),
    updated_at: String(row.updated_at ?? ""),
    updated_by: typeof row.updated_by === "string" ? row.updated_by : null,
  };
}

/** Every month logged, newest first. */
export async function loadMetrics(): Promise<LoadedMetrics> {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({
      select: "*",
      order: "month.desc,account.asc,platform.asc",
      limit: "5000",
    }),
  );
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing)
      console.error(`[socials] reading ${TABLE} failed: ${result.message}`);
    return {
      ok: false,
      missing,
      message: missing
        ? SOCIALS_MIGRATION_HINT
        : "Couldn't load the numbers just now. Reload in a minute.",
    };
  }
  return {
    ok: true,
    rows: result.rows
      .map(toMetric)
      .filter((row): row is SocialMetric => row !== null),
  };
}

function writeError(message: string): SocialResult {
  if (isMissingTable(message))
    return { ok: false, message: SOCIALS_MIGRATION_HINT };
  console.error(`[socials] saving failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** Saves a month's numbers; the same account, platform and month is replaced. */
export async function saveMetricRow(
  row: Pick<
    SocialMetric,
    | "account"
    | "platform"
    | "month"
    | "followers"
    | "impressions"
    | "posts"
    | "notes"
  >,
  by: string,
): Promise<SocialResult> {
  const result = await upsertRows(
    TABLE,
    [
      {
        ...row,
        created_by: by,
        updated_by: by,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "account,platform,month" },
  );
  return result.ok ? { ok: true } : writeError(result.message);
}

export async function deleteMetricRow(id: string): Promise<SocialResult> {
  const result = await deleteRows(
    TABLE,
    new URLSearchParams({ id: `eq.${id}` }),
  );
  return result.ok ? { ok: true } : writeError(result.message);
}
