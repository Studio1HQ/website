import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase-server";
import {
  logoSite,
  sortDevRelJobs,
  toJobRecord,
  toPublicJob,
  type DevRelJob,
  type DevRelJobRecord,
} from "@/lib/devrel-jobs";

/*
 * Reads the DevRel jobs board's listings (devrel_jobs, added by
 * supabase/migrations/20261121100000_devrel_jobs.sql). The public page keeps
 * its read for an hour, and every save on the dashboard
 * (app/internal/(dashboard)/job-board/actions.ts) clears it, so changes show
 * on the next visit.
 */

export const DEVREL_JOBS_TABLE = "devrel_jobs";
const TAG = "devrel-jobs";
/** How long the public board keeps its read when nothing changed. */
export const DEVREL_JOBS_KEEP_SECONDS = 3600;

export const DEVREL_JOBS_MIGRATION_HINT =
  "Run the DevRel jobs migration (supabase/migrations/20261121100000_devrel_jobs.sql) in Supabase first.";

/** A table that isn't there yet (the migration hasn't run). */
export function isMissingTable(message: string) {
  return /PGRST205|PGRST204|42P01|42703|does not exist|Could not find the table/i.test(
    message,
  );
}

export type LoadedJobs =
  | { ok: true; jobs: DevRelJobRecord[] }
  | { ok: false; missing: boolean; message: string };

/** Every listing, hidden ones too, newest first (pinned on top). */
export async function loadJobRecords(): Promise<LoadedJobs> {
  if (!isSupabaseConfigured())
    return { ok: false, missing: false, message: "Supabase isn't configured." };
  const result = await selectRows(
    DEVREL_JOBS_TABLE,
    new URLSearchParams({
      select: "*",
      order: "posted_on.desc,created_at.desc",
      limit: "1000",
    }),
  );
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing)
      console.error(
        `[devrel-jobs] reading ${DEVREL_JOBS_TABLE} failed: ${result.message}`,
      );
    return {
      ok: false,
      missing,
      message: missing
        ? DEVREL_JOBS_MIGRATION_HINT
        : "Couldn't load the listings just now. Reload in a minute.",
    };
  }
  const jobs = result.rows
    .map(toJobRecord)
    .filter((job): job is DevRelJobRecord => job !== null);
  return { ok: true, jobs: sortDevRelJobs(jobs) };
}

/**
 * The live listings for the public board, kept for an hour. A failed read
 * throws, so nothing empty is kept: the page keeps showing its last good
 * version. Before the migration (or without Supabase, in a local build)
 * the board is simply empty.
 */
const keptPublicJobs = unstable_cache(
  async (): Promise<DevRelJob[]> => {
    const loaded = await loadJobRecords();
    if (!loaded.ok) {
      if (loaded.missing || !isSupabaseConfigured()) return [];
      throw new Error(`[devrel-jobs] ${loaded.message}`);
    }
    return loaded.jobs.filter((job) => job.live).map(toPublicJob);
  },
  ["devrel-jobs-public-v1"],
  { revalidate: DEVREL_JOBS_KEEP_SECONDS, tags: [TAG] },
);

export async function getDevRelJobs(): Promise<DevRelJob[]> {
  return keptPublicJobs();
}

/** The site a listing's logo comes from, or null (no such listing, or no site). */
export async function jobLogoSite(id: string): Promise<string | null> {
  const result = await selectRows<Record<string, unknown>>(
    DEVREL_JOBS_TABLE,
    new URLSearchParams({ select: "website,url", id: `eq.${id}`, limit: "1" }),
  );
  if (!result.ok || !result.rows[0]) return null;
  const row = result.rows[0];
  return logoSite({
    website: typeof row.website === "string" ? row.website : null,
    url: typeof row.url === "string" ? row.url : "",
  });
}

/**
 * Call after any change to the listings: the public board reads them again
 * on its next visit. Only works in a server action or route handler.
 */
export function devRelJobsChanged() {
  try {
    revalidateTag(TAG, { expire: 0 });
    revalidatePath("/devrel-jobs");
  } catch {
    // Outside a request (a test, a script): nothing is kept there anyway.
  }
}
