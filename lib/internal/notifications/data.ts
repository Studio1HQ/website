import "server-only";
import { cache } from "react";
import { deleteRows, insertRows, selectRows, updateRows } from "@/lib/supabase-server";
import {
  BELL_LIMIT,
  NOTICE_KINDS,
  noticeCutoffs,
  noticeHref,
  noticeRows,
  type Notice,
  type Notification,
} from "@/lib/internal/notifications/shared";

/**
 * Reads and writes for the bell. Every function takes the person's email
 * from the caller's session, never from the browser, and only ever touches
 * that person's rows. Until the migration has run (or if a read fails) the
 * bell is simply empty: notifications are a convenience, so nothing else
 * should break over them.
 */

const TABLE = "internal_notifications";

/**
 * Tells people something now needs them. Call it inside `after()`: it
 * never throws. The person who did it is left out.
 */
export async function notify(to: readonly (string | null | undefined)[], actor: string, notice: Notice) {
  try {
    const rows = noticeRows(to, actor, notice);
    if (!rows.length) return;
    const result = await insertRows(TABLE, rows);
    if (!result.ok && !/PGRST205|42P01|Could not find the table/i.test(result.message)) {
      console.error(`[notifications] saving a notification failed: ${result.message}`);
    }
  } catch (error) {
    console.error("[notifications] saving a notification failed", error);
  }
}

function toNotification(row: Record<string, unknown>): Notification | null {
  if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.href !== "string") return null;
  const kind = NOTICE_KINDS.find((item) => item === row.kind) ?? "other";
  return {
    id: row.id,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    actor: typeof row.actor === "string" ? row.actor : "",
    kind,
    title: row.title,
    body: typeof row.body === "string" ? row.body : "",
    // Only ever a dashboard page, whatever is in the row.
    href: noticeHref(row.href),
    read_at: typeof row.read_at === "string" ? row.read_at : null,
  };
}

/** Someone's latest notifications and how many are unread. Once per request. */
export const bellFor = cache(async (email: string): Promise<{ items: Notification[]; unread: number }> => {
  const me = email.trim().toLowerCase();
  const [latest, unread] = await Promise.all([
    selectRows(TABLE, new URLSearchParams({ select: "*", email: `eq.${me}`, order: "created_at.desc", limit: String(BELL_LIMIT) })),
    selectRows(TABLE, new URLSearchParams({ select: "id", email: `eq.${me}`, read_at: "is.null", limit: "1" }), { count: true }),
  ]);
  if (!latest.ok) return { items: [], unread: 0 };
  const items = latest.rows.map(toNotification).filter((item): item is Notification => item !== null);
  return { items, unread: unread.ok ? (unread.total ?? 0) : items.filter((item) => !item.read_at).length };
});

/**
 * Deletes notifications read more than KEEP_READ_DAYS ago, and every one
 * older than KEEP_ANY_DAYS. No session check: only the daily cron route
 * calls this, after checking its secret.
 */
export async function pruneNotifications(now = new Date()): Promise<{ ok: true; deleted: number } | { ok: false; message: string }> {
  const { read, any } = noticeCutoffs(now);
  const [wasRead, old] = await Promise.all([
    deleteRows(TABLE, new URLSearchParams({ read_at: `lt.${read}` })),
    deleteRows(TABLE, new URLSearchParams({ created_at: `lt.${any}` })),
  ]);
  const failed = [wasRead, old].find((result) => !result.ok);
  if (failed && !failed.ok) return { ok: false, message: failed.message };
  return { ok: true, deleted: (wasRead.ok ? wasRead.count : 0) + (old.ok ? old.count : 0) };
}

/** Marks this person's unread notifications read: one by id, or all of them. */
export async function markRead(email: string, id?: string) {
  const query = new URLSearchParams({ email: `eq.${email.trim().toLowerCase()}`, read_at: "is.null" });
  if (id) query.set("id", `eq.${id}`);
  const result = await updateRows(TABLE, query, { read_at: new Date().toISOString() });
  return result.ok;
}
