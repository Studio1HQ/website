"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateEntries, type EntryChange } from "@/lib/internal/data";
import { cleanTag, sectionFor } from "@/lib/internal/sections";
import { sessionCookieOptions } from "@/lib/internal/session";
import { SESSION_COOKIE } from "@/lib/internal/token";

export type ActionResult =
  | { ok: true; tags?: Record<string, string[]> }
  | { ok: false; message: string; /** Part of the change was saved. */ saved?: boolean };

function strings(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  return value.every((item) => typeof item === "string") ? (value as string[]) : null;
}

/**
 * Status, notes and tags for one or more entries. Server actions are public
 * endpoints, so every field is checked here, and updateEntries checks the
 * session before it writes.
 */
export async function changeEntries(
  sectionKey: string,
  ids: unknown,
  change: unknown,
): Promise<ActionResult> {
  const section = sectionFor(sectionKey);
  const idList = strings(ids, 200);
  if (!section?.statuses || !idList || typeof change !== "object" || change === null) {
    return { ok: false, message: "That change isn't valid." };
  }
  const input = change as Record<string, unknown>;
  const next: EntryChange = {};
  if (typeof input.status === "string") next.status = input.status;
  if (typeof input.notes === "string" || input.notes === null) {
    const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 5000) : "";
    next.notes = notes || null;
  }
  const add = input.addTags === undefined ? [] : strings(input.addTags, 20);
  const remove = input.removeTags === undefined ? [] : strings(input.removeTags, 20);
  if (!add || !remove) return { ok: false, message: "That change isn't valid." };
  next.addTags = add.map(cleanTag).filter((tag): tag is string => !!tag);
  next.removeTags = remove.map((tag) => tag.slice(0, 32));

  const result = await updateEntries(section, idList, next);
  // Also when only part of it saved (the status, but not the tags).
  if (result.ok || result.saved) revalidatePath("/internal", "layout");
  return result;
}

export async function signOut() {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
  redirect("/internal/login?signed-out");
}
