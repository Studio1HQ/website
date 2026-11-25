import "server-only";
import { deleteRows, selectRows, upsertRows } from "@/lib/supabase-server";
import { isMissingTable } from "@/lib/internal/community/data";
import { requireArea, type Staff } from "@/lib/internal/session";
import {
  INSIGHTS_MIGRATION_HINT,
  SOCIALS_MIGRATION_HINT,
  isPlatform,
  type Platform,
  type SocialMetric,
  type SocialResult,
} from "@/lib/internal/socials/schema";
import {
  cleanInsights,
  mergeInsights,
  type SocialInsights,
} from "@/lib/internal/socials/insights";

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
    // Null until the insights migration has run.
    engagements: number(row.engagements),
    posts: number(row.posts),
    notes: String(row.notes ?? ""),
    insights: cleanInsights(row.insights),
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

/** The insights migration hasn't run: engagements or insights isn't a column yet. */
function missingInsights(message: string) {
  return (
    /engagements|insights/.test(message) &&
    /42703|PGRST204|does not exist|Could not find/.test(message)
  );
}

function writeError(message: string): { ok: false; message: string } {
  if (missingInsights(message))
    return { ok: false, message: INSIGHTS_MIGRATION_HINT };
  if (isMissingTable(message))
    return { ok: false, message: SOCIALS_MIGRATION_HINT };
  console.error(`[socials] saving failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/**
 * Saves a month's numbers; the same account, platform and month is
 * replaced (what an import added stays). Before the insights migration,
 * engagements is left out when there's none to save.
 */
export async function saveMetricRow(
  row: Pick<
    SocialMetric,
    | "account"
    | "platform"
    | "month"
    | "followers"
    | "impressions"
    | "engagements"
    | "posts"
    | "notes"
  >,
  by: string,
): Promise<SocialResult> {
  const write = (values: Record<string, unknown>) =>
    upsertRows(
      TABLE,
      [
        {
          ...values,
          created_by: by,
          updated_by: by,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "account,platform,month" },
    );
  let result = await write(row);
  if (
    !result.ok &&
    row.engagements === null &&
    missingInsights(result.message)
  ) {
    const rest: Record<string, unknown> = { ...row };
    delete rest.engagements;
    result = await write(rest);
  }
  return result.ok ? { ok: true } : writeError(result.message);
}

/** One platform's month from an import, checked (see importMonth). */
export type ImportedRow = {
  platform: Platform;
  /** Null keeps what's logged (the action makes sure there's something). */
  followers: number | null;
  impressions: number | null;
  engagements: number | null;
  posts: number | null;
  insights: SocialInsights;
};

/** What's logged for an account's month, by platform. */
export async function monthRows(
  account: string,
  month: string,
): Promise<
  | { ok: true; rows: Map<Platform, SocialMetric> }
  | { ok: false; message: string }
> {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({
      select: "*",
      account: `eq.${account}`,
      month: `eq.${month}`,
    }),
  );
  if (!result.ok) return writeError(result.message);
  const rows = new Map<Platform, SocialMetric>();
  for (const raw of result.rows) {
    const row = toMetric(raw);
    if (row) rows.set(row.platform, row);
  }
  return { ok: true, rows };
}

/**
 * Saves an import over what the month had: a number the files gave
 * replaces the old one, one they didn't keeps it, the notes stay, and the
 * insights merge (mergeInsights).
 */
export async function saveImportedRows(
  account: string,
  month: string,
  imported: ImportedRow[],
  existing: Map<Platform, SocialMetric>,
  by: string,
): Promise<SocialResult> {
  const now = new Date().toISOString();
  const rows = imported.map((item) => {
    const before = existing.get(item.platform);
    return {
      account,
      platform: item.platform,
      month,
      followers: item.followers ?? before?.followers ?? 0,
      impressions: item.impressions ?? before?.impressions ?? null,
      engagements: item.engagements ?? before?.engagements ?? null,
      posts: item.posts ?? before?.posts ?? null,
      notes: before?.notes ?? "",
      insights: mergeInsights(before?.insights ?? {}, item.insights),
      created_by: by,
      updated_by: by,
      updated_at: now,
    };
  });
  const result = await upsertRows(TABLE, rows, {
    onConflict: "account,platform,month",
  });
  return result.ok ? { ok: true } : writeError(result.message);
}

export async function deleteMetricRow(id: string): Promise<SocialResult> {
  const result = await deleteRows(
    TABLE,
    new URLSearchParams({ id: `eq.${id}` }),
  );
  return result.ok ? { ok: true } : writeError(result.message);
}
