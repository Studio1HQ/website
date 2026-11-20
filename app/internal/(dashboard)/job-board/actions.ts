"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  deleteRows,
  insertRow,
  selectRows,
  updateRows,
} from "@/lib/supabase-server";
import { logoSite } from "@/lib/devrel-jobs";
import {
  DEVREL_JOBS_MIGRATION_HINT,
  DEVREL_JOBS_TABLE,
  devRelJobsChanged,
  isMissingTable,
} from "@/lib/devrel-jobs-data";
import { todayIst } from "@/lib/internal/blog/shared";
import { clientLogo } from "@/lib/internal/clients/logo";
import { isUuid } from "@/lib/internal/community/clean";
import {
  cleanJob,
  jobChanges,
  type JobInput,
  type JobResult,
} from "@/lib/internal/job-board/clean";
import { canEditJobBoard, requireMember } from "@/lib/internal/session";
import { audit } from "@/lib/internal/team/audit";

/**
 * The DevRel jobs board's writes. Server actions are public endpoints, so
 * each one checks the session here: people given DevRel jobs on People, and
 * admins. Every change is on the audit trail and shows on
 * studio1hq.com/devrel-jobs on its next visit.
 */

const DENIED: JobResult = {
  ok: false,
  message: "You don't have access to the DevRel jobs board.",
};
const GONE: JobResult = {
  ok: false,
  message: "That listing isn't there any more. Reload the page.",
};

async function allowed() {
  const staff = await requireMember();
  return canEditJobBoard(staff) ? staff : null;
}

function writeError(message: string): JobResult {
  if (isMissingTable(message))
    return { ok: false, message: DEVREL_JOBS_MIGRATION_HINT };
  console.error(`[job-board] saving failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** The stored listing, for the audit trail; null when it's gone, "error" when it couldn't be read. */
async function stored(
  id: string,
): Promise<Record<string, unknown> | null | "error"> {
  const result = await selectRows<Record<string, unknown>>(
    DEVREL_JOBS_TABLE,
    new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }),
  );
  if (!result.ok) {
    console.error(`[job-board] reading a listing failed: ${result.message}`);
    return "error";
  }
  return result.rows[0] ?? null;
}

function changed() {
  devRelJobsChanged();
  revalidatePath("/internal/job-board");
}

/** Finds the logo now, so the board has it on its first visit. */
function warmLogo(job: Pick<JobInput, "website" | "url">) {
  const site = logoSite(job);
  if (site) after(() => clientLogo(site).then(() => undefined));
}

/** Adds a listing (id null) or saves changes to one. */
export async function saveJob(
  id: unknown,
  values: unknown,
): Promise<JobResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const cleaned = cleanJob(values, todayIst());
  if (!cleaned.ok) return cleaned;
  const job = cleaned.job;
  const now = new Date().toISOString();

  if (id === null) {
    const newId = crypto.randomUUID();
    const result = await insertRow(DEVREL_JOBS_TABLE, {
      id: newId,
      ...job,
      created_by: staff.email,
      updated_by: staff.email,
    });
    if (!result.ok) return writeError(result.message);
    await audit({
      actor: staff.email,
      area: "job_board",
      action: "added",
      subject: newId,
      detail: { title: job.title, company: job.company, live: job.live },
    });
    warmLogo(job);
    changed();
    return {
      ok: true,
      message: job.live ? "Added to the board" : "Saved, hidden from the board",
    };
  }

  if (!isUuid(id)) return GONE;
  const before = await stored(id);
  if (before === "error")
    return { ok: false, message: "Couldn't save. Try again in a minute." };
  if (!before) return GONE;
  const result = await updateRows(
    DEVREL_JOBS_TABLE,
    new URLSearchParams({ id: `eq.${id}` }),
    { ...job, updated_by: staff.email, updated_at: now },
  );
  if (!result.ok) return writeError(result.message);
  if (result.count === 0) return GONE;
  const changes = jobChanges(
    before as Partial<Record<keyof JobInput, unknown>>,
    job,
  );
  if (Object.keys(changes).length) {
    await audit({
      actor: staff.email,
      area: "job_board",
      action: "changed",
      subject: id,
      detail: { title: job.title, company: job.company, changes },
    });
  }
  warmLogo(job);
  changed();
  return { ok: true, message: "Saved" };
}

/** Puts a listing on the board or takes it off, without removing it. */
export async function setJobLive(
  id: unknown,
  live: unknown,
): Promise<JobResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (!isUuid(id) || typeof live !== "boolean") return GONE;
  const result = await updateRows(
    DEVREL_JOBS_TABLE,
    new URLSearchParams({ id: `eq.${id}` }),
    { live, updated_by: staff.email, updated_at: new Date().toISOString() },
    "id,title,company",
  );
  if (!result.ok) return writeError(result.message);
  if (result.count === 0) return GONE;
  await audit({
    actor: staff.email,
    area: "job_board",
    action: live ? "shown" : "hidden",
    subject: id,
  });
  changed();
  return { ok: true, message: live ? "On the board" : "Hidden from the board" };
}

/** Removes a listing for good. */
export async function deleteJob(id: unknown): Promise<JobResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (!isUuid(id)) return GONE;
  const result = await deleteRows<Record<string, unknown>>(
    DEVREL_JOBS_TABLE,
    new URLSearchParams({ id: `eq.${id}` }),
    "id,title,company,url",
  );
  if (!result.ok) return writeError(result.message);
  if (result.count === 0) return GONE;
  const row = result.rows[0];
  await audit({
    actor: staff.email,
    area: "job_board",
    action: "removed",
    subject: id,
    detail: { title: row.title, company: row.company, url: row.url },
  });
  changed();
  return { ok: true, message: "Removed" };
}
