"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/internal/community/clean";
import {
  createInboundLead,
  getAgentSettings,
  getInboundLead,
  queueEvent,
  resolveHeldMail,
  setAgentSetting,
  setFileApproval,
} from "@/lib/internal/inbound/data";
import {
  canQueue,
  isEventKind,
  validatePayload,
} from "@/lib/internal/inbound/rules";
import type { EventKind, InboundResult } from "@/lib/internal/inbound/schema";
import {
  canSeeInbound,
  canSeeMoney,
  requireMember,
} from "@/lib/internal/session";

/**
 * Inbound writes. Server actions are public endpoints, so every one checks
 * the session here: people given Inbound (the founders always are; Admin
 * alone isn't enough). Prices and scope (founder answers, file approval,
 * settings) are the founders' only, checked again here and in the data
 * helpers. Nothing here sends anything outside.
 */

const DENIED: InboundResult = {
  ok: false,
  message: "You don't have access to Inbound.",
};
const FOUNDERS_ONLY: InboundResult = {
  ok: false,
  message: "Only the founders can do that.",
};
const UNKNOWN: InboundResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};

/** The signed-in person, if they may use this area; null otherwise. */
async function allowed() {
  const staff = await requireMember();
  return canSeeInbound(staff) ? staff : null;
}

function refresh() {
  // The layout too: the sidebar badge counts mail waiting for a decision.
  revalidatePath("/internal", "layout");
}

function asInput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** The events the lead page can ask for (a reply is logged by mail, not here). */
const ASKABLE: readonly EventKind[] = [
  "lead_created",
  "call_notes_added",
  "founder_answers",
  "proposal_sent",
  "won",
  "lost",
];

export async function addLead(values: unknown): Promise<InboundResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  const input = asInput(values);
  const result = await createInboundLead(
    {
      name: input.name,
      website: input.website,
      source: input.source,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      message: input.message,
      startAgent: input.startAgent === true,
    },
    staff,
  );
  if (result.ok) refresh();
  return result;
}

/** Asks the agent to do something for a lead (or marks it proposal sent, won, lost). */
export async function askAgent(
  orgId: unknown,
  kind: unknown,
  values: unknown,
): Promise<InboundResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof orgId !== "string" || !isUuid(orgId)) return UNKNOWN;
  if (!isEventKind(kind) || !ASKABLE.includes(kind))
    return { ok: false, message: "That isn't something you can ask for here." };
  if (kind === "founder_answers" && !canSeeMoney(staff)) return FOUNDERS_ONLY;
  const checked = validatePayload(kind, asInput(values));
  if (!checked.ok) return checked;
  const result = await queueEvent(
    orgId.toLowerCase(),
    kind,
    checked.payload,
    staff.email,
  );
  if (result.ok) refresh();
  return result;
}

/** Queues a failed event's kind again, with what it was given. */
export async function retryEvent(
  orgId: unknown,
  eventId: unknown,
): Promise<InboundResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (
    typeof orgId !== "string" ||
    !isUuid(orgId) ||
    typeof eventId !== "string" ||
    !isUuid(eventId)
  )
    return UNKNOWN;
  const lead = await getInboundLead(orgId.toLowerCase());
  if (lead === "error")
    return {
      ok: false,
      message: "Couldn't load that lead. Try again in a minute.",
    };
  if (!lead) return UNKNOWN;
  const event = lead.events.find((item) => item.id === eventId.toLowerCase());
  if (!event) return UNKNOWN;
  if (event.status !== "failed")
    return { ok: false, message: "Only a failed run can be tried again." };
  if (!ASKABLE.includes(event.kind))
    return { ok: false, message: "That can't be tried again here." };
  if (event.kind === "founder_answers" && !canSeeMoney(staff))
    return FOUNDERS_ONLY;
  if (!canQueue(lead.org.stage, event.kind))
    return {
      ok: false,
      message: "The agent can't be asked that at this stage.",
    };
  const result = await queueEvent(
    lead.org.id,
    event.kind,
    event.payload,
    staff.email,
  );
  if (result.ok) refresh();
  return result;
}

export async function resolveMail(
  id: unknown,
  decision: unknown,
): Promise<InboundResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (typeof id !== "string" || !isUuid(id)) return UNKNOWN;
  if (decision !== "lead" && decision !== "not_lead")
    return { ok: false, message: "Choose lead or not a lead." };
  const result = await resolveHeldMail(id.toLowerCase(), decision, staff);
  if (result.ok) refresh();
  return result;
}

export async function approveFile(
  fileId: unknown,
  approved: unknown,
): Promise<InboundResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (!canSeeMoney(staff)) return FOUNDERS_ONLY;
  if (typeof fileId !== "string" || !isUuid(fileId)) return UNKNOWN;
  const result = await setFileApproval(
    fileId.toLowerCase(),
    approved === true,
    staff,
  );
  if (result.ok) refresh();
  return result;
}

/** Saves the settings that changed, and only those. Founders only. */
export async function saveSettings(values: unknown): Promise<InboundResult> {
  const staff = await allowed();
  if (!staff) return DENIED;
  if (!canSeeMoney(staff)) return FOUNDERS_ONLY;
  const input = asInput(values);
  const current = await getAgentSettings();
  const sorter = { apply: input.sorterApply === true };
  const autoStart = {
    booking: input.startOnBooking === true,
    mail: input.startOnMail === true,
  };
  const rules = (Array.isArray(input.rules) ? input.rules : [])
    .filter((rule): rule is string => typeof rule === "string")
    .map((rule) => rule.trim())
    .filter(Boolean);
  let changed = 0;
  if (sorter.apply !== current.sorter.apply) {
    const result = await setAgentSetting("sorter", sorter, staff);
    if (!result.ok) return result;
    changed += 1;
  }
  if (
    autoStart.booking !== current.auto_start.booking ||
    autoStart.mail !== current.auto_start.mail
  ) {
    const result = await setAgentSetting("auto_start", autoStart, staff);
    if (!result.ok) return result;
    changed += 1;
  }
  if (JSON.stringify(rules) !== JSON.stringify(current.house_rules.rules)) {
    const result = await setAgentSetting("house_rules", { rules }, staff);
    if (!result.ok) return result;
    changed += 1;
  }
  if (changed) refresh();
  return { ok: true, message: changed ? "Saved" : "Nothing was changed" };
}
