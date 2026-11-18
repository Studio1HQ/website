"use server";

import { revalidatePath } from "next/cache";
import { dashboardUrl } from "@/lib/internal/host";
import { requireClients } from "@/lib/internal/session";
import { cleanWeek, isUuid } from "@/lib/internal/clients/clean";
import {
  TABLES,
  getClient,
  getEngagement,
  loadEngagements,
  updateRecord,
} from "@/lib/internal/clients/data";
import {
  CLIENT_LINKS_MIGRATION_HINT,
  cleanLinks,
} from "@/lib/internal/clients/links";
import {
  CLIENTS_MIGRATION_HINT,
  clientPath,
  todayKey,
  type ActionResult,
} from "@/lib/internal/clients/schema";
import {
  clientWeekSummary,
  clientsSlackReady,
  postToClients,
} from "@/lib/internal/clients/slack";
import { engagementsForWeek } from "@/lib/internal/clients/week";
import { loadClientWeek } from "@/lib/internal/clients/week-data";
import { saveTask } from "@/app/internal/(dashboard)/tasks/actions";

/**
 * The client workspace's own writes: its links, a task for someone on one
 * of its engagements, and posting its week to Slack. Managers only, checked
 * here (server actions are public endpoints). Kept apart from actions.ts so
 * the Tasks actions, which import that file, aren't imported back.
 */

const DENIED: ActionResult = {
  ok: false,
  message: "Only client managers can change this.",
};

const UNKNOWN: ActionResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};

const TRY_AGAIN: ActionResult = {
  ok: false,
  message: "Couldn't check that just now. Try again in a minute.",
};

async function manager() {
  const staff = await requireClients();
  return staff.clients === "manager" ? staff : null;
}

/** Replaces a client's links (in the order given). links: { label, url }[]. */
export async function saveClientLinks(
  clientId: unknown,
  links: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (typeof clientId !== "string" || !isUuid(clientId)) return UNKNOWN;
  const clean = cleanLinks(links);
  if (!clean.ok) return clean;
  const result = await updateRecord(
    TABLES.clients,
    "client",
    clientId.toLowerCase(),
    { links: clean.links },
    staff.email,
  );
  if (!result.ok)
    // The table is there (the page loaded), so a missing column is the links migration.
    return result.message === CLIENTS_MIGRATION_HINT
      ? { ok: false, message: CLIENT_LINKS_MIGRATION_HINT }
      : result;
  revalidatePath("/internal/clients", "layout");
  return { ok: true, message: "Links saved" };
}

/**
 * Puts a task on someone's board for one of this client's engagements,
 * through the Tasks area's own saveTask, so its rules apply as they are
 * (who may give whom a task, the team list, secrets). values: { email,
 * title, notes?, due_on?, deliverable_id? }.
 */
export async function addClientTask(
  engagementId: unknown,
  values: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (typeof engagementId !== "string" || !isUuid(engagementId)) return UNKNOWN;
  const engagement = await getEngagement(engagementId.toLowerCase());
  if (engagement === "error") return TRY_AGAIN;
  if (!engagement) return UNKNOWN;
  if (engagement.status === "ended")
    return { ok: false, message: "That engagement has ended. Pick another." };
  const input =
    values && typeof values === "object" && !Array.isArray(values)
      ? (values as Record<string, unknown>)
      : {};
  const result = await saveTask(null, {
    email: input.email,
    title: input.title,
    notes: input.notes,
    due_on: input.due_on,
    engagement_id: engagement.id,
    deliverable_id: input.deliverable_id || null,
  });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/internal/clients", "layout");
  return { ok: true, id: result.id, message: result.message ?? "Task added" };
}

/** Posts this client's week (any day of it) to the client-work Slack channel. */
export async function postClientWeek(
  clientId: unknown,
  week: unknown,
): Promise<ActionResult> {
  const staff = await manager();
  if (!staff) return DENIED;
  if (typeof clientId !== "string" || !isUuid(clientId)) return UNKNOWN;
  const monday = cleanWeek(week);
  if (!monday) return { ok: false, message: "Pick a valid week." };
  if (!clientsSlackReady())
    return {
      ok: false,
      message:
        "Slack isn't set up for client work yet (SLACK_WEBHOOK_URL_CLIENTS).",
    };
  const client = await getClient(clientId.toLowerCase());
  if (client === "error") return TRY_AGAIN;
  if (!client) return UNKNOWN;
  const engagements = await loadEngagements({ clientId: client.id });
  if (!engagements.ok) return { ok: false, message: engagements.message };
  const covered = engagementsForWeek(engagements.rows, monday, todayKey());
  const data = await loadClientWeek({
    engagementIds: covered.map((engagement) => engagement.id),
    week: monday,
    staff,
  });
  if (!data.ok) return { ok: false, message: data.message };
  const sent = await postToClients(
    clientWeekSummary({
      client: client.name,
      week: monday,
      lines: data.lines,
      names: data.names,
      engagements:
        covered.length > 1
          ? Object.fromEntries(covered.map((item) => [item.id, item.name]))
          : undefined,
      workspaceUrl: `${dashboardUrl}${clientPath(client.slug)}?week=${monday}`,
    }),
  );
  return sent
    ? { ok: true, message: "Posted to Slack" }
    : {
        ok: false,
        message: "Slack didn't take the message. Try again in a minute.",
      };
}
