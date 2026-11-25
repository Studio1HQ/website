"use server";

import { revalidatePath } from "next/cache";
import { looksLikeSecret, parseCount } from "@/lib/internal/clients/clean";
import {
  isMonthKey,
  monthLabel,
  thisMonth,
} from "@/lib/internal/clients/schema";
import { isUuid } from "@/lib/internal/community/clean";
import { canSeeSocials, requireMember } from "@/lib/internal/session";
import {
  deleteMetricRow,
  monthRows,
  saveImportedRows,
  saveMetricRow,
  type ImportedRow,
} from "@/lib/internal/socials/data";
import { cleanInsights } from "@/lib/internal/socials/insights";
import {
  isPlatform,
  platformInfo,
  type Platform,
  type SocialResult,
} from "@/lib/internal/socials/schema";

/**
 * Social growth writes. Server actions are public endpoints, so each one
 * checks the session here: people given Social growth (the founders always
 * are; Admin alone isn't enough).
 */

const DENIED: SocialResult = {
  ok: false,
  message: "You don't have access to Social growth.",
};

/** The signed-in person, if they may use this area; null otherwise. */
async function allowed() {
  const staff = await requireMember();
  return canSeeSocials(staff) ? staff : null;
}

const text = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

/** A count field: "" is null, "7k" is 7000; "bad" when it isn't a count. */
function count(value: unknown, top: number): number | null | "bad" {
  const raw = typeof value === "number" ? String(value) : text(value, 20);
  if (!raw) return null;
  const number = parseCount(raw);
  return number === null || number > top ? "bad" : number;
}

const TOP = {
  followers: 2_000_000_000,
  impressions: 9_000_000_000_000,
  engagements: 9_000_000_000_000,
  posts: 100_000,
};

/**
 * Saves one account's numbers for a platform and month.
 * values: { account, platform, month, followers, impressions?, engagements?, posts?, notes? }.
 */
export async function saveMetric(values: unknown): Promise<SocialResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const input =
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : {};
  const account = text(input.account, 60);
  if (!account) return { ok: false, message: "Say whose account it is." };
  if (!isPlatform(input.platform))
    return { ok: false, message: "Pick a platform." };
  const month = input.month;
  if (!isMonthKey(month) || month > thisMonth())
    return { ok: false, message: "Pick this month or an earlier one." };
  const followers = count(input.followers, 2_000_000_000);
  if (followers === null || followers === "bad")
    return {
      ok: false,
      message: "Followers should be a number, like 1,240 or 7k.",
    };
  const impressions = count(input.impressions, TOP.impressions);
  if (impressions === "bad")
    return { ok: false, message: "Impressions should be a number." };
  const engagements = count(input.engagements, TOP.engagements);
  if (engagements === "bad")
    return { ok: false, message: "Engagements should be a number." };
  const posts = count(input.posts, TOP.posts);
  if (posts === "bad")
    return { ok: false, message: "Posts should be a number." };
  const notes = text(input.notes, 500);
  if (looksLikeSecret(notes) || looksLikeSecret(account))
    return {
      ok: false,
      message: "That looks like a password or a key. Don't store those here.",
    };

  const result = await saveMetricRow(
    {
      account,
      platform: input.platform,
      month,
      followers,
      impressions,
      engagements,
      posts,
      notes,
    },
    staff.email,
  );
  if (!result.ok) return result;
  revalidatePath("/internal/socials");
  return { ok: true, message: "Saved" };
}

/**
 * Saves a month read from LinkedIn or X analytics exports (the import
 * dialog reads the files in the browser and sends the numbers): one row
 * per platform, merged into what the month had.
 * values: { account, month, rows: [{ platform, followers, impressions,
 * engagements, posts, insights }] }.
 */
/** Whose account an import is for, or why it can't be. */
function importAccount(
  value: unknown,
): { ok: true; account: string } | { ok: false; message: string } {
  const account = text(value, 60);
  if (!account) return { ok: false, message: "Say whose account it is." };
  if (looksLikeSecret(account))
    return {
      ok: false,
      message: "That looks like a password or a key. Don't store those here.",
    };
  return { ok: true, account };
}

/** One month's rows from the import dialog, checked. */
function importRows(
  value: unknown,
): { ok: true; rows: ImportedRow[] } | { ok: false; message: string } {
  const list = Array.isArray(value) ? value.slice(0, 8) : [];
  if (!list.length) return { ok: false, message: "Add an export file first." };
  const rows: ImportedRow[] = [];
  const seen = new Set<Platform>();
  for (const raw of list) {
    const item =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    if (!isPlatform(item.platform) || seen.has(item.platform))
      return { ok: false, message: "Each platform can come in once." };
    seen.add(item.platform);
    const label = platformInfo(item.platform).label;
    const numbers = {
      followers: count(item.followers, TOP.followers),
      impressions: count(item.impressions, TOP.impressions),
      engagements: count(item.engagements, TOP.engagements),
      posts: count(item.posts, TOP.posts),
    };
    const bad = Object.entries(numbers).find(([, value]) => value === "bad");
    if (bad)
      return { ok: false, message: `${label}: ${bad[0]} should be a number.` };
    rows.push({
      platform: item.platform,
      followers: numbers.followers as number | null,
      impressions: numbers.impressions as number | null,
      engagements: numbers.engagements as number | null,
      posts: numbers.posts as number | null,
      insights: cleanInsights(item.insights),
    });
  }
  return { ok: true, rows };
}

/** Saves one month's imported rows over what it had. */
async function saveImport(
  account: string,
  month: string,
  rows: ImportedRow[],
  by: string,
): Promise<SocialResult> {
  const existing = await monthRows(account, month);
  if (!existing.ok) return existing;
  const missing = rows.find(
    (row) => row.followers === null && !existing.rows.has(row.platform),
  );
  if (missing) {
    const info = platformInfo(missing.platform);
    return {
      ok: false,
      message: `Add ${info.label}'s ${info.unit} at the end of ${monthLabel(month)}.`,
    };
  }
  return saveImportedRows(account, month, rows, existing.rows, by);
}

/** Imports one month from analytics exports (read in the browser). */
export async function importMonth(values: unknown): Promise<SocialResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const input =
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : {};
  const who = importAccount(input.account);
  if (!who.ok) return who;
  const month = input.month;
  if (!isMonthKey(month) || month > thisMonth())
    return { ok: false, message: "Pick this month or an earlier one." };
  const checked = importRows(input.rows);
  if (!checked.ok) return checked;

  const result = await saveImport(
    who.account,
    month,
    checked.rows,
    staff.email,
  );
  if (!result.ok) return result;
  revalidatePath("/internal/socials");
  const names = checked.rows.map((row) => platformInfo(row.platform).label);
  return {
    ok: true,
    message: `Imported ${names.join(" and ")} for ${monthLabel(month)}`,
  };
}

/**
 * Imports several months from one set of exports (a 90-day LinkedIn export
 * holds two or three). All are checked before any is saved; a month that
 * fails to save stops the rest, and the message says which went in.
 */
export async function importMonths(values: unknown): Promise<SocialResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const input =
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : {};
  const who = importAccount(input.account);
  if (!who.ok) return who;
  const list = Array.isArray(input.months) ? input.months : [];
  if (!list.length || list.length > 13)
    return { ok: false, message: "Pick up to 13 months." };

  const months: { month: string; rows: ImportedRow[] }[] = [];
  for (const raw of list) {
    const item =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const month = item.month;
    if (!isMonthKey(month) || month > thisMonth())
      return { ok: false, message: "Pick this month or earlier ones." };
    if (months.some((entry) => entry.month === month))
      return { ok: false, message: "Each month can come in once." };
    const checked = importRows(item.rows);
    if (!checked.ok)
      return {
        ok: false,
        message: `${monthLabel(month)}: ${checked.message}`,
      };
    months.push({ month, rows: checked.rows });
  }
  months.sort((a, b) => a.month.localeCompare(b.month));

  const saved: string[] = [];
  for (const entry of months) {
    const result = await saveImport(
      who.account,
      entry.month,
      entry.rows,
      staff.email,
    );
    if (!result.ok) {
      if (saved.length) revalidatePath("/internal/socials");
      return {
        ok: false,
        message: saved.length
          ? `${result.message} (${saved.map((month) => monthLabel(month)).join(", ")} went in.)`
          : result.message,
      };
    }
    saved.push(entry.month);
  }
  revalidatePath("/internal/socials");
  return {
    ok: true,
    message:
      saved.length === 1
        ? `Imported ${monthLabel(saved[0])}`
        : `Imported ${saved.length} months, ${monthLabel(saved[0])} to ${monthLabel(saved[saved.length - 1])}`,
  };
}

export async function deleteMetric(id: unknown): Promise<SocialResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (!isUuid(id))
    return {
      ok: false,
      message: "That isn't there any more. Reload the page.",
    };
  const result = await deleteMetricRow(id);
  if (!result.ok) return result;
  revalidatePath("/internal/socials");
  return { ok: true, message: "Removed" };
}
