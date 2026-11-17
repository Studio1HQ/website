"use server";

import { revalidatePath } from "next/cache";
import { looksLikeSecret, parseCount } from "@/lib/internal/clients/clean";
import { isMonthKey, thisMonth } from "@/lib/internal/clients/schema";
import { isUuid } from "@/lib/internal/community/clean";
import { canSeeSocials, requireMember } from "@/lib/internal/session";
import { deleteMetricRow, saveMetricRow } from "@/lib/internal/socials/data";
import { isPlatform, type SocialResult } from "@/lib/internal/socials/schema";

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

/**
 * Saves one account's numbers for a platform and month.
 * values: { account, platform, month, followers, impressions?, posts?, notes? }.
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
  const impressions = count(input.impressions, 9_000_000_000_000);
  if (impressions === "bad")
    return { ok: false, message: "Impressions should be a number." };
  const posts = count(input.posts, 100_000);
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
      posts,
      notes,
    },
    staff.email,
  );
  if (!result.ok) return result;
  revalidatePath("/internal/socials");
  return { ok: true, message: "Saved" };
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
