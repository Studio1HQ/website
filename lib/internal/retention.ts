import "server-only";
import { deleteRows, inList, removeFiles, selectRows, upsertRows } from "@/lib/supabase-server";

/**
 * How long a rejected job application is kept. After this many days without
 * a change, the daily job (app/api/cron/purge-rejected, scheduled in
 * vercel.json) deletes it for good: the row, its résumé and the log of
 * emails sent to that applicant.
 *
 * Their email address and name are kept (kept_contacts) for future
 * mailings until they unsubscribe, with what they ticked for "email me
 * about future roles": only people who opted in are on the mailing list.
 * Nothing is deleted unless the contact was saved first.
 *
 * The clock is the entry's `updated_at`, which every edit stamps: changing
 * the status, tags or notes. So an application goes 15 days after it was
 * last touched while rejected, never sooner, and moving it out of Rejected
 * saves it.
 */
export const REJECTED_RETENTION_DAYS = 15;

const TABLE = "job_applications";
const RESUME_BUCKET = "job-applications";
export const KEPT_CONTACTS = "kept_contacts";

type Due = { id: string; resume_path: string | null; email: string | null; name: string | null; email_updates: boolean | null; created_at: string | null };

/** One kept contact per address: opted in if any of their entries was, earliest date first seen. */
function contactsFrom(rows: Due[], keptAt: string) {
  const byEmail = new Map<string, { email: string; name: string; form: string; first_seen: string; kept_at: string; email_updates: boolean }>();
  for (const row of rows) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    const seen = row.created_at ?? keptAt;
    const before = byEmail.get(email);
    byEmail.set(email, {
      email,
      name: before?.name || String(row.name ?? "").trim().slice(0, 120),
      form: "job",
      first_seen: before && before.first_seen < seen ? before.first_seen : seen,
      kept_at: keptAt,
      email_updates: Boolean(before?.email_updates) || row.email_updates === true,
    });
  }
  return [...byEmail.values()];
}
/** Rows per pass; the job loops, so a backlog still clears in one run. */
const BATCH = 100;
const MAX_PASSES = 10;

/** Entries last changed before this instant are old enough to go. */
export function retentionCutoff(now = new Date(), days = REJECTED_RETENTION_DAYS) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type PurgeResult = { ok: true; deleted: number; files: number } | { ok: false; deleted: number; message: string };

/**
 * Deletes rejected job applications past the retention time. No session
 * check: only the cron route calls this, after checking its secret.
 */
export async function purgeRejectedApplications(now = new Date()): Promise<PurgeResult> {
  const cutoff = retentionCutoff(now);
  let deleted = 0;
  let files = 0;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const due = await selectRows<Due>(
      TABLE,
      new URLSearchParams({
        select: "id,resume_path,email,name,email_updates,created_at",
        review_status: "eq.rejected",
        updated_at: `lt.${cutoff}`,
        order: "updated_at.asc",
        limit: String(BATCH),
      }),
    );
    if (!due.ok) return { ok: false, deleted, message: due.message };
    if (due.rows.length === 0) break;

    // Keep the contacts first. Someone already kept stays as they are, so
    // an address that has unsubscribed since isn't opted back in.
    const kept = await upsertRows(KEPT_CONTACTS, contactsFrom(due.rows, now.toISOString()), { onConflict: "email", keepExisting: true });
    if (!kept.ok) return { ok: false, deleted, message: `couldn't keep the contacts, so nothing was deleted: ${kept.message}` };

    const ids = due.rows.map((row) => String(row.id));
    // The status and date are checked again in the delete itself, so an
    // entry someone moved out of Rejected a moment ago is left alone.
    const gone = await deleteRows(
      TABLE,
      new URLSearchParams({ id: inList(ids), review_status: "eq.rejected", updated_at: `lt.${cutoff}` }),
    );
    if (!gone.ok) return { ok: false, deleted, message: gone.message };
    deleted += gone.count;

    // Only files whose row really went: re-read what's left of this batch.
    const left = await selectRows<{ id: string }>(TABLE, new URLSearchParams({ select: "id", id: inList(ids), limit: String(BATCH) }));
    if (left.ok) {
      const still = new Set(left.rows.map((row) => String(row.id)));
      const removed = due.rows.filter((row) => !still.has(String(row.id)));
      const paths = removed.map((row) => row.resume_path).filter((path): path is string => typeof path === "string" && path !== "");
      await removeFiles(RESUME_BUCKET, paths);
      files += paths.length;
      // Best effort: the emails sent to them (needs the delete grant from
      // 20261115110000_retention.sql; without it the log rows just stay).
      if (removed.length) {
        const log = await deleteRows(
          "internal_email_log",
          new URLSearchParams({ source_table: `eq.${TABLE}`, record_id: inList(removed.map((row) => String(row.id))) }),
        );
        if (!log.ok) console.warn(`[retention] email log rows kept: ${log.message}`);
      }
    }
    if (gone.count === 0 || due.rows.length < BATCH) break;
  }
  return { ok: true, deleted, files };
}
