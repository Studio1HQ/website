"use server";

import { revalidatePath } from "next/cache";
import { markRead } from "@/lib/internal/notifications/data";
import { requireMember } from "@/lib/internal/session";

/**
 * The bell's writes. Each works only on the signed-in person's own
 * notifications: the email comes from the session, never from the browser.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marks one of your notifications read (when you open it). */
export async function readNotification(id: unknown): Promise<{ ok: boolean }> {
  const staff = await requireMember();
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false };
  const ok = await markRead(staff.email, id);
  if (ok) revalidatePath("/internal", "layout");
  return { ok };
}

/** Marks all of your notifications read. */
export async function readAllNotifications(): Promise<{ ok: boolean }> {
  const staff = await requireMember();
  const ok = await markRead(staff.email);
  if (ok) revalidatePath("/internal", "layout");
  return { ok };
}
