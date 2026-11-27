import "server-only";
import { cache } from "react";
import { isMissingTable } from "@/lib/internal/community/data";
import { isUuid } from "@/lib/internal/community/clean";
import { todayKey } from "@/lib/internal/community/schema";
import {
  CONTACT_COLUMNS,
  DEFAULT_SETTINGS,
  INBOUND_MIGRATION_HINT,
  INBOUND_SOURCES,
  INBOUND_STAGES,
  LEAD_COLUMNS,
  toAgentEvent,
  toAgentFile,
  toAgentSettings,
  toInboundMail,
  toLeadContact,
  toLeadOrg,
  type AgentEvent,
  type AgentFile,
  type AgentSettings,
  type EventKind,
  type InboundLoad,
  type InboundMail,
  type InboundResult,
  type LeadCard,
  type LeadDetail,
  type SettingKey,
} from "@/lib/internal/inbound/schema";
import {
  boardColumn,
  bookingMovesStage,
  canQueue,
  cleanMail,
  companyDomainFromEmail,
  isInboundSource,
  nameFromDomain,
  normalizeEmail,
  oneLineText,
  plainText,
  stageAfter,
  threadIdFor,
  validatePayload,
  validateSetting,
} from "@/lib/internal/inbound/rules";
import type { CalBooking } from "@/lib/internal/inbound/webhooks";
import { domainOf } from "@/lib/internal/outreach/rules";
import { isOwner } from "@/lib/internal/roles";
import { audit } from "@/lib/internal/team/audit";
import {
  inList,
  insertRow,
  selectRows,
  signedFileUrl as createSignedUrl,
  updateRows,
  upsertRows,
} from "@/lib/supabase-server";

/**
 * Inbound reads and writes. Server only, with the service client, so
 * nothing here checks who is asking:
 *   - a page or action calls requireInbound() (lib/internal/inbound/access.ts)
 *     or checks canSeeInbound(staff) before using any function here that
 *     takes a `staff` or `createdBy` person;
 *   - the Cal.com webhook (app/api/webhooks/cal) and the Resend webhook
 *     call recordInboundMail and upsertLeadFromBooking after checking their
 *     signatures;
 *   - the cron route checks its secret.
 *
 * Money never leaves here: leads are read with LEAD_COLUMNS, which leaves
 * out est_value, currency and notes. Deal values stay on Outreach, for the
 * founders.
 *
 * Lists are read once per request (React cache), like Outreach. Writes by
 * a person leave an entry on the audit trail (area "inbound"); the
 * webhooks' own writes are marked by created_by instead.
 */

export const TABLES = {
  orgs: "outreach_orgs",
  contacts: "outreach_contacts",
  events: "agent_events",
  files: "agent_files",
  mail: "inbound_mail",
  settings: "agent_settings",
} as const;

export const FILES_BUCKET = "agent-files";

const GONE: InboundResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};
const TRY_AGAIN: { ok: false; message: string } = {
  ok: false,
  message: "Couldn't save. Try again in a minute.",
};

function readFailed<T>(what: string, message: string): InboundLoad<T> {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[inbound] reading ${what} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing
      ? INBOUND_MIGRATION_HINT
      : "Couldn't load inbound just now. Reload in a minute.",
  };
}

function writeFailed(
  what: string,
  message: string,
): { ok: false; message: string } {
  if (isMissingTable(message))
    return { ok: false, message: INBOUND_MIGRATION_HINT };
  console.error(`[inbound] saving ${what} failed: ${message}`);
  return TRY_AGAIN;
}

/** A person's email, as opposed to the system's own "webhook:cal" or "sorter". */
function isPerson(createdBy: string) {
  return /^[^\s@:]+@[^\s@:]+$/.test(createdBy);
}

function chunks<T>(items: readonly T[], size: number) {
  const parts: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    parts.push(items.slice(index, index + size));
  return parts;
}

/* ----------------------------------------------------------------- reads */

/**
 * Every inbound lead as a board card, by name. Cached for the request.
 * Call after requireInbound().
 */
export const listInboundLeads = cache(
  async (): Promise<InboundLoad<LeadCard[]>> => {
    const orgs = await selectRows<Record<string, unknown>>(
      TABLES.orgs,
      new URLSearchParams({
        select: LEAD_COLUMNS,
        source: `in.(${INBOUND_SOURCES.join(",")})`,
        stage: `in.(${INBOUND_STAGES.join(",")})`,
        order: "name.asc,id.asc",
        limit: "1000",
      }),
    );
    if (!orgs.ok) return readFailed("leads", orgs.message);
    const leads = orgs.rows.map(toLeadOrg);
    if (leads.length === 0) return { ok: true, value: [] };

    // Every event is some lead's, so no filter by lead is needed.
    const events = await selectRows<Record<string, unknown>>(
      TABLES.events,
      new URLSearchParams({
        select: "id,org_id,kind,status,created_at,error,waiting_items",
        order: "created_at.desc",
        limit: "5000",
      }),
    );
    if (!events.ok) return readFailed("events", events.message);
    const byOrg = new Map<
      string,
      {
        kind: EventKind;
        status: AgentEvent["status"];
        created_at: string;
        error: string;
        waiting: number;
      }[]
    >();
    for (const row of events.rows) {
      const event = toAgentEvent(row);
      const list = byOrg.get(event.org_id) ?? [];
      list.push({
        kind: event.kind,
        status: event.status,
        created_at: event.created_at,
        error: event.error,
        waiting: event.waiting_items.length,
      });
      byOrg.set(event.org_id, list);
    }

    const main = new Map<string, { name: string; email: string | null }>();
    for (const part of chunks(
      leads.map((lead) => lead.id),
      100,
    )) {
      const contacts = await selectRows<Record<string, unknown>>(
        TABLES.contacts,
        new URLSearchParams({
          select: CONTACT_COLUMNS,
          org_id: inList(part),
          order: "is_primary.desc,created_at.asc",
          limit: "1000",
        }),
      );
      if (!contacts.ok) return readFailed("contacts", contacts.message);
      for (const row of contacts.rows) {
        const contact = toLeadContact(row);
        if (!main.has(contact.org_id))
          main.set(contact.org_id, {
            name: contact.name,
            email: contact.email,
          });
      }
    }

    const cards: LeadCard[] = [];
    for (const org of leads) {
      const history = byOrg.get(org.id) ?? [];
      const column = boardColumn(org.stage, history);
      if (!column) continue;
      cards.push({
        org,
        column,
        primaryContact: main.get(org.id) ?? null,
        latest: history[0] ?? null,
      });
    }
    return { ok: true, value: cards };
  },
);

/**
 * One lead with its people, its events (newest first) and the files the
 * agent made. Null when there's no such inbound lead; "error" when it
 * couldn't be read. Call after requireInbound().
 */
async function readInboundLead(
  id: string,
): Promise<LeadDetail | null | "error"> {
  if (!isUuid(id)) return null;
  const org = await selectRows<Record<string, unknown>>(
    TABLES.orgs,
    new URLSearchParams({ select: LEAD_COLUMNS, id: `eq.${id}`, limit: "1" }),
  );
  if (!org.ok) {
    readFailed("a lead", org.message);
    return "error";
  }
  const row = org.rows[0];
  if (!row) return null;
  const lead = toLeadOrg(row);
  if (
    !INBOUND_SOURCES.includes(lead.source as (typeof INBOUND_SOURCES)[number])
  )
    return null;

  const [contacts, events, files] = await Promise.all([
    selectRows<Record<string, unknown>>(
      TABLES.contacts,
      new URLSearchParams({
        select: CONTACT_COLUMNS,
        org_id: `eq.${id}`,
        order: "is_primary.desc,name.asc",
        limit: "200",
      }),
    ),
    selectRows<Record<string, unknown>>(
      TABLES.events,
      new URLSearchParams({
        select: "*",
        org_id: `eq.${id}`,
        order: "created_at.desc",
        limit: "500",
      }),
    ),
    selectRows<Record<string, unknown>>(
      TABLES.files,
      new URLSearchParams({
        select: "*",
        org_id: `eq.${id}`,
        order: "created_at.desc",
        limit: "500",
      }),
    ),
  ]);
  for (const result of [contacts, events, files]) {
    if (!result.ok) {
      readFailed("a lead's details", result.message);
      return "error";
    }
  }
  if (!contacts.ok || !events.ok || !files.ok) return "error";
  const eventList = events.rows.map(toAgentEvent);
  return {
    org: lead,
    column: boardColumn(lead.stage, eventList) ?? "new",
    threadId: threadIdFor(lead),
    contacts: contacts.rows.map(toLeadContact),
    events: eventList,
    files: files.rows.map(toAgentFile),
  };
}

/**
 * One lead (see readInboundLead), read once per request: the lead page's
 * title and its body both ask for it.
 */
export const getInboundLead = cache(readInboundLead);

/** The mail the sorter held back for a person to decide, newest first. Call after requireInbound(). */
export async function listHeldMail(): Promise<InboundLoad<InboundMail[]>> {
  const result = await selectRows<Record<string, unknown>>(
    TABLES.mail,
    new URLSearchParams({
      select: "*",
      held: "is.true",
      correction: "eq.",
      order: "received_at.desc",
      limit: "200",
    }),
  );
  if (!result.ok) return readFailed("held mail", result.message);
  return { ok: true, value: result.rows.map(toInboundMail) };
}

/** The agent's settings, with defaults for anything missing. Call after requireInbound(). */
export async function getAgentSettings(): Promise<AgentSettings> {
  const result = await selectRows<Record<string, unknown>>(
    TABLES.settings,
    new URLSearchParams({ select: "key,value", limit: "50" }),
  );
  if (!result.ok) {
    if (!isMissingTable(result.message))
      console.error(`[inbound] reading settings failed: ${result.message}`);
    return structuredClone(DEFAULT_SETTINGS);
  }
  return toAgentSettings(result.rows);
}

/**
 * A short-lived link (60 seconds) to a file in the private bucket. Call
 * after requireInbound(), and only with a file read through getInboundLead.
 */
export async function signedFileUrl(
  file: Pick<AgentFile, "storage_path">,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!file.storage_path)
    return { ok: false, message: "That file isn't there." };
  const result = await createSignedUrl(FILES_BUCKET, file.storage_path, 60);
  if (!result.ok) {
    console.error(`[inbound] signing a file link failed: ${result.message}`);
    return {
      ok: false,
      message: "Couldn't open that file. Try again in a minute.",
    };
  }
  return result;
}

/* ---------------------------------------------------------------- writes */

/**
 * Queues something for the agent to do for a lead. `createdBy` is the
 * signed-in person's email (call after requireInbound()), or "webhook:cal"
 * or "sorter". A person's event must suit the lead's stage (canQueue) and
 * moves the stage where it means one (a proposal sent, won, lost); the
 * system's own events skip that check. Writes an audit entry for a person.
 */
export async function queueEvent(
  orgId: string,
  kind: EventKind,
  payload: unknown,
  createdBy: string,
): Promise<InboundResult> {
  if (!isUuid(orgId)) return GONE;
  const checked = validatePayload(kind, payload);
  if (!checked.ok) return checked;
  const person = isPerson(createdBy);

  let stage = "";
  if (person) {
    const org = await selectRows<{ stage: string; source: string }>(
      TABLES.orgs,
      new URLSearchParams({
        select: "stage,source",
        id: `eq.${orgId}`,
        limit: "1",
      }),
    );
    if (!org.ok) return writeFailed("an event", org.message);
    // Only an inbound lead: Inbound access must never reach an outreach
    // prospect or a client, which share this table.
    if (!org.rows[0] || !isInboundSource(org.rows[0].source)) return GONE;
    stage = org.rows[0].stage;
    if (!canQueue(stage, kind))
      return {
        ok: false,
        message: "The agent can't be asked that at this stage.",
      };
  }

  const id = crypto.randomUUID();
  const inserted = await insertRow(TABLES.events, {
    id,
    org_id: orgId,
    kind,
    payload: checked.payload,
    status: "queued",
    created_by: createdBy.slice(0, 254),
  });
  if (!inserted.ok) {
    if (inserted.message.includes("23503")) return GONE;
    return writeFailed("an event", inserted.message);
  }

  const moveTo = person ? stageAfter(kind) : null;
  if (moveTo) {
    const patch: Record<string, unknown> = {
      stage: moveTo,
      updated_by: createdBy,
      updated_at: new Date().toISOString(),
    };
    if (moveTo !== "proposal") patch.closed_on = todayKey();
    if (moveTo === "lost") patch.lost_reason = checked.payload.reason ?? "";
    const moved = await updateRows(
      TABLES.orgs,
      new URLSearchParams({
        id: `eq.${orgId}`,
        source: inList([...INBOUND_SOURCES]),
      }),
      patch,
    );
    if (!moved.ok)
      console.error(
        `[inbound] moving a lead to ${moveTo} failed: ${moved.message}`,
      );
  }
  if (person) {
    await audit({
      actor: createdBy,
      area: "inbound",
      action: "queued",
      subject: orgId,
      detail: {
        kind,
        event_id: id,
        stage_before: stage,
        ...(moveTo ? { stage_after: moveTo } : {}),
      },
    });
  }
  return { ok: true, id };
}

/** The organisation a person is already known as: by a contact with this email, else by the company's domain. */
export async function findOrgForPerson(
  email: string,
  domain: string | null,
): Promise<
  { id: string; name: string; stage: string; source: string } | null | "error"
> {
  if (email) {
    const contact = await selectRows<{ org_id: string }>(
      TABLES.contacts,
      new URLSearchParams({
        select: "org_id",
        email: `eq.${email}`,
        order: "created_at.asc",
        limit: "1",
      }),
    );
    if (!contact.ok) return "error";
    const orgId = contact.rows[0]?.org_id;
    if (orgId) {
      const org = await selectRows<{
        id: string;
        name: string;
        stage: string;
        source: string;
      }>(
        TABLES.orgs,
        new URLSearchParams({
          select: "id,name,stage,source",
          id: `eq.${orgId}`,
          limit: "1",
        }),
      );
      if (!org.ok) return "error";
      if (org.rows[0]) return org.rows[0];
    }
  }
  if (domain) {
    const org = await selectRows<{
      id: string;
      name: string;
      stage: string;
      source: string;
    }>(
      TABLES.orgs,
      new URLSearchParams({
        select: "id,name,stage,source",
        domain: `eq.${domain}`,
        limit: "1",
      }),
    );
    if (!org.ok) return "error";
    return org.rows[0] ?? null;
  }
  return null;
}

/** The lead a booking belongs to, if there is one. For the webhook, after its signature check. */
export function findOrgForBooking(booking: Pick<CalBooking, "attendeeEmail">) {
  return findOrgForPerson(
    booking.attendeeEmail,
    companyDomainFromEmail(booking.attendeeEmail),
  );
}

export type BookingResult =
  | {
      ok: true;
      orgId: string;
      created: boolean;
      queued: boolean;
      /**
       * Set when the booking names a company that is not an inbound lead.
       * Nothing was written for it: the caller tells the founders, and a
       * person confirms whose booking it is.
       */
      needsPerson?: { orgId: string; orgName: string };
    }
  | { ok: false; message: string };

/**
 * Turns a new or moved Cal.com booking into a lead. The attendee's email is
 * typed by whoever books and nobody has proved it, so a booking is trusted
 * to make a NEW company and to nudge a company that is already inbound, and
 * to do nothing else:
 *   - no company matches (by the attendee's company domain, else by a
 *     contact with the same email): a new org is made with source
 *     inbound_call at "call booked", the attendee is its contact. A
 *     free-mail attendee (gmail and the like) never makes a domain, so the
 *     company is named from the booking's company answer, else from their
 *     own name.
 *   - the match is already inbound: it may move to "call booked" (only from
 *     the early stages) and queue lead_created once. Its source is never
 *     changed and no contact is added, so a booking cannot widen who is on
 *     the company.
 *   - the match is anything else (an outreach prospect, a client): this
 *     stops anyone booking with an address at a prospect's domain to
 *     rewrite that company. Nothing is written and no event is queued; the
 *     result says a person is needed, and the webhook tells the founders.
 * lead_created is queued only while auto_start.booking is on. Call from the
 * verified webhook only.
 */
export async function upsertLeadFromBooking(
  booking: CalBooking,
): Promise<BookingResult> {
  const domain = companyDomainFromEmail(booking.attendeeEmail);
  const by = "webhook:cal";
  let existing = await findOrgForPerson(booking.attendeeEmail, domain);
  if (existing === "error")
    return { ok: false, message: "Couldn't look the company up" };

  let orgId = existing?.id ?? "";
  let created = false;
  if (!existing) {
    const name = oneLineText(
      booking.companyName ||
        (domain ? nameFromDomain(domain) : "") ||
        booking.attendeeName ||
        booking.attendeeEmail,
      140,
    );
    orgId = crypto.randomUUID();
    const inserted = await insertRow(TABLES.orgs, {
      id: orgId,
      name,
      website: domain ? `https://${domain}` : null,
      domain,
      kind: "client",
      stage: "call_booked",
      source: "inbound_call",
      created_by: by,
      updated_by: by,
    });
    if (inserted.ok) {
      created = true;
      // The attendee is the new company's first contact.
      const added = await insertRow(TABLES.contacts, {
        id: crypto.randomUUID(),
        org_id: orgId,
        name: booking.attendeeName || booking.attendeeEmail,
        email: booking.attendeeEmail,
        is_primary: true,
        created_by: by,
        updated_by: by,
      });
      if (!added.ok)
        return {
          ok: false,
          message: writeFailed("a booking's contact", added.message).message,
        };
    } else if (inserted.duplicate && domain) {
      // Two bookings at once for the same company: the other one won, and
      // this one is handled as a booking for an existing company.
      const again = await findOrgForPerson("", domain);
      if (!again || again === "error")
        return { ok: false, message: "Couldn't save the company" };
      existing = again;
      orgId = again.id;
    } else {
      const failed = writeFailed("a booking's company", inserted.message);
      return { ok: false, message: failed.message };
    }
  }

  if (existing) {
    if (!isInboundSource(existing.source))
      return {
        ok: true,
        orgId,
        created: false,
        queued: false,
        needsPerson: { orgId, orgName: existing.name },
      };
    if (bookingMovesStage(existing.stage)) {
      const moved = await updateRows(
        TABLES.orgs,
        new URLSearchParams({ id: `eq.${orgId}` }),
        {
          stage: "call_booked",
          updated_by: by,
          updated_at: new Date().toISOString(),
        },
      );
      if (!moved.ok)
        return {
          ok: false,
          message: writeFailed("a booking's stage", moved.message).message,
        };
    }
  }

  // lead_created once per lead, and only while bookings start the agent.
  let queued = false;
  const settings = await getAgentSettings();
  if (settings.auto_start.booking) {
    const earlier = await selectRows(
      TABLES.events,
      new URLSearchParams({
        select: "id",
        org_id: `eq.${orgId}`,
        kind: "eq.lead_created",
        limit: "1",
      }),
    );
    if (!earlier.ok)
      return {
        ok: false,
        message: writeFailed("a booking's event", earlier.message).message,
      };
    if (earlier.rows.length === 0) {
      const result = await queueEvent(
        orgId,
        "lead_created",
        {
          contact_name: booking.attendeeName,
          call_at: booking.startTime,
          source: "inbound_call",
          message: booking.answers,
        },
        by,
      );
      if (!result.ok) return { ok: false, message: result.message };
      queued = true;
    }
  }
  return { ok: true, orgId, created, queued };
}

/**
 * Stores one received mail for the worker to sort: selected headers, body
 * text, de-duplicated by message id (a retried webhook adds nothing). Call
 * from the verified Resend webhook only.
 */
export async function recordInboundMail(
  mail: Parameters<typeof cleanMail>[0],
): Promise<{ ok: true; skipped?: string } | { ok: false; message: string }> {
  const clean = cleanMail(mail);
  if (!clean) return { ok: true, skipped: "No sender address or message id" };
  const saved = await upsertRows(
    TABLES.mail,
    [
      {
        message_id: clean.messageId,
        from_address: clean.fromAddress,
        from_name: clean.fromName,
        subject: clean.subject,
        headers: clean.headers,
        body_text: clean.bodyText,
        excerpt: clean.excerpt,
        sender_verified: clean.senderVerified,
        status: "new",
      },
    ],
    { onConflict: "message_id", keepExisting: true },
  );
  return saved.ok ? { ok: true } : { ok: false, message: saved.message };
}

type MailForDecision = {
  id: string;
  from_address: string;
  from_name: string;
  subject: string;
  excerpt: string;
  sender_verified: boolean;
  status: string;
  held: boolean;
  org_id: string | null;
  correction: string;
};

/**
 * The lead a mail becomes once a person says it is one. The sender's domain
 * is kept as the company's identity only when the receiving provider
 * verified the sender (sender_verified); a mail that only claims a domain
 * gets a lead with a name and a contact, never the domain. A sender who
 * already belongs to an inbound lead is linked to it and nothing about that
 * lead changes; one who belongs to an outreach prospect or a client is
 * refused, for a person to follow up there.
 */
async function leadFromMail(
  mail: MailForDecision,
  staff: { email: string },
): Promise<
  | { ok: true; orgId: string; created: boolean; note: string }
  | { ok: false; message: string }
> {
  const email = normalizeEmail(mail.from_address);
  const domain = mail.sender_verified ? companyDomainFromEmail(email) : null;
  const existing = await findOrgForPerson(email ?? "", domain);
  if (existing === "error") return TRY_AGAIN;
  if (existing) {
    if (!isInboundSource(existing.source))
      return {
        ok: false,
        message: `${existing.name} is already in Outreach or Clients. Mark this as not a lead and follow it up there.`,
      };
    return {
      ok: true,
      orgId: existing.id,
      created: false,
      note: `Added to ${existing.name}, which is already a lead.`,
    };
  }

  const contactName = oneLineText(mail.from_name, 120);
  const name =
    (domain ? nameFromDomain(domain) : "") ||
    contactName ||
    oneLineText(email ?? mail.from_address, 140);
  if (!name)
    return {
      ok: false,
      message: "That mail has no sender to name the lead after.",
    };
  const message = plainText(
    [mail.subject, mail.excerpt].filter(Boolean).join("\n\n"),
    1000,
  );
  const by = staff.email.toLowerCase();
  const id = crypto.randomUUID();
  const inserted = await insertRow(TABLES.orgs, {
    id,
    name,
    website: domain ? `https://${domain}` : null,
    domain,
    kind: "client",
    stage: "lead",
    source: "inbound_email",
    interest: message,
    created_by: by,
    updated_by: by,
  });
  if (!inserted.ok) {
    if (inserted.duplicate)
      return {
        ok: false,
        message: "A company with that website already exists.",
      };
    return writeFailed("a lead from mail", inserted.message);
  }
  let note = "";
  if (email) {
    const added = await insertRow(TABLES.contacts, {
      id: crypto.randomUUID(),
      org_id: id,
      name: contactName || email,
      email,
      is_primary: true,
      created_by: by,
      updated_by: by,
    });
    if (!added.ok) note = "The lead was added, but its contact wasn't saved.";
  }
  await audit({
    actor: staff.email,
    area: "inbound",
    action: "added lead",
    subject: id,
    detail: { name, source: "inbound_email", from: "mail" },
  });
  return { ok: true, orgId: id, created: true, note };
}

/**
 * A person's decision on a sorted mail: it was a lead, or it wasn't. Mail
 * the sorter held takes either answer. Mail it skipped can only be turned
 * into a lead ("this was a lead"). Saying lead makes the lead here, at once
 * (leadFromMail), ties the mail to it and, when the founders have switched
 * on starting the agent for mail, queues its research. Call after
 * requireInbound(); `staff` is the signed-in person. Writes an audit entry.
 */
export async function resolveHeldMail(
  id: string,
  decision: "lead" | "not_lead",
  staff: { email: string },
): Promise<InboundResult> {
  if (!isUuid(id)) return GONE;
  if (decision !== "lead" && decision !== "not_lead")
    return { ok: false, message: "Choose lead or not a lead." };
  const found = await selectRows<MailForDecision>(
    TABLES.mail,
    new URLSearchParams({
      select:
        "id,from_address,from_name,subject,excerpt,sender_verified,status,held,org_id,correction",
      id: `eq.${id}`,
      limit: "1",
    }),
  );
  if (!found.ok) return writeFailed("a mail decision", found.message);
  const mail = found.rows[0];
  if (!mail) return GONE;
  if (mail.org_id)
    return { ok: false, message: "That mail already belongs to a lead." };
  if (!mail.held) {
    if (mail.status !== "sorted") return GONE;
    if (decision !== "lead" || mail.correction === "lead")
      return { ok: false, message: "That mail was already decided." };
  }

  let orgId: string | null = null;
  let created = false;
  let note = "";
  if (decision === "lead") {
    const lead = await leadFromMail(mail, staff);
    if (!lead.ok) return lead;
    ({ orgId, created, note } = lead);
  }

  const result = await updateRows(
    TABLES.mail,
    new URLSearchParams({
      id: `eq.${id}`,
      org_id: "is.null",
      held: mail.held ? "is.true" : "is.false",
    }),
    {
      correction: decision,
      held: false,
      org_id: orgId,
      resolved_by: staff.email.toLowerCase(),
      resolved_at: new Date().toISOString(),
    },
  );
  if (!result.ok) return writeFailed("a mail decision", result.message);
  if (!result.count) return GONE;
  await audit({
    actor: staff.email,
    area: "inbound",
    action: "resolved mail",
    subject: id,
    detail: { decision, org_id: orgId, was_held: mail.held },
  });

  if (orgId && created) {
    const settings = await getAgentSettings();
    if (settings.auto_start.mail) {
      const queued = await queueEvent(
        orgId,
        "lead_created",
        {
          contact_name: oneLineText(mail.from_name, 120),
          message: plainText(
            [mail.subject, mail.excerpt].filter(Boolean).join("\n\n"),
            1000,
          ),
          source: "inbound_email",
        },
        staff.email.toLowerCase(),
      );
      if (!queued.ok)
        note = `${note} The agent wasn't started: ${queued.message}`.trim();
    }
  }
  const base = { ok: true as const, id: orgId ?? id };
  return note ? { ...base, message: note } : base;
}

/**
 * Changes one of the agent's settings. The founders control these, so it
 * checks that itself on top of requireInbound(): anyone else is refused.
 * Writes an audit entry.
 */
export async function setAgentSetting(
  key: SettingKey,
  value: unknown,
  staff: { email: string },
): Promise<InboundResult> {
  if (!isOwner(staff.email))
    return { ok: false, message: "Only the founders can change these." };
  const checked = validateSetting(key, value);
  if (!checked.ok) return checked;
  const saved = await upsertRows(
    TABLES.settings,
    [
      {
        key,
        value: checked.value,
        updated_at: new Date().toISOString(),
        updated_by: staff.email.toLowerCase(),
      },
    ],
    { onConflict: "key" },
  );
  if (!saved.ok) return writeFailed("a setting", saved.message);
  await audit({
    actor: staff.email,
    area: "inbound",
    action: "changed setting",
    subject: key,
    detail: { value: checked.value },
  });
  return { ok: true };
}

/* ----------------------------------------------- counts, files and new leads */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many agent events were queued, are running or failed in the last 7
 * days, for the board's status line. Call after requireInbound().
 */
export async function agentActivity(
  now = new Date(),
): Promise<InboundLoad<{ queued: number; running: number; failed: number }>> {
  const result = await selectRows<{ status: string }>(
    TABLES.events,
    new URLSearchParams({
      select: "status",
      status: "in.(queued,running,failed)",
      created_at: `gte.${new Date(now.getTime() - 7 * DAY_MS).toISOString()}`,
      limit: "5000",
    }),
  );
  if (!result.ok) return readFailed("agent activity", result.message);
  const count = (status: string) =>
    result.rows.filter((row) => row.status === status).length;
  return {
    ok: true,
    value: {
      queued: count("queued"),
      running: count("running"),
      failed: count("failed"),
    },
  };
}

/** How many held mails wait for a decision (the sidebar badge); 0 if it can't be read. */
export async function heldMailCount(): Promise<number> {
  const result = await selectRows<{ id: string }>(
    TABLES.mail,
    new URLSearchParams({
      select: "id",
      held: "is.true",
      correction: "eq.",
      limit: "200",
    }),
  );
  return result.ok ? result.rows.length : 0;
}

/**
 * One file of an inbound lead, for a download. Null when there is no such
 * file or its lead isn't an inbound one; "error" when it couldn't be read.
 * Call after checking canSeeInbound.
 */
export async function getInboundFile(
  id: string,
): Promise<AgentFile | null | "error"> {
  if (!isUuid(id)) return null;
  const file = await selectRows<Record<string, unknown>>(
    TABLES.files,
    new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }),
  );
  if (!file.ok) {
    readFailed("a file", file.message);
    return "error";
  }
  const row = file.rows[0];
  if (!row) return null;
  const found = toAgentFile(row);
  const org = await selectRows<{ source: string }>(
    TABLES.orgs,
    new URLSearchParams({
      select: "source",
      id: `eq.${found.org_id}`,
      limit: "1",
    }),
  );
  if (!org.ok) {
    readFailed("a file's lead", org.message);
    return "error";
  }
  const source = org.rows[0]?.source;
  return source && isInboundSource(source) ? found : null;
}

/**
 * Marks a file approved to send, or takes that back. Only the founders may:
 * this checks that itself, on top of the caller's own check. Writes an
 * audit entry.
 */
export async function setFileApproval(
  fileId: string,
  approved: boolean,
  staff: { email: string },
): Promise<InboundResult> {
  if (!isOwner(staff.email))
    return { ok: false, message: "Only the founders can approve a file." };
  const file = await getInboundFile(fileId);
  if (file === "error") return TRY_AGAIN;
  if (!file) return GONE;
  const by = staff.email.toLowerCase();
  const result = await updateRows(
    TABLES.files,
    new URLSearchParams({ id: `eq.${file.id}` }),
    approved
      ? {
          approved_to_send: true,
          approved_by: by,
          approved_at: new Date().toISOString(),
        }
      : { approved_to_send: false, approved_by: null, approved_at: null },
  );
  if (!result.ok) return writeFailed("a file approval", result.message);
  if (!result.count) return GONE;
  await audit({
    actor: staff.email,
    area: "inbound",
    action: approved ? "approved file" : "withdrew approval",
    subject: file.org_id,
    detail: { file_id: file.id, name: file.name },
  });
  return { ok: true, id: file.id };
}

export type NewLead = {
  name: unknown;
  website: unknown;
  source: unknown;
  contactName: unknown;
  contactEmail: unknown;
  message: unknown;
  startAgent: unknown;
};

/**
 * Adds a lead by hand: the company, its first contact and, if asked, a
 * lead_created event for the agent. Refuses a website whose domain already
 * belongs to an organisation of any source (an outreach prospect or a
 * client too), and says which. Call after requireInbound(); `staff` is the
 * signed-in person. Writes an audit entry.
 */
export async function createInboundLead(
  input: NewLead,
  staff: { email: string },
): Promise<InboundResult> {
  const name = oneLineText(input.name, 140);
  if (!name) return { ok: false, message: "Add the company's name." };
  if (!isInboundSource(typeof input.source === "string" ? input.source : ""))
    return { ok: false, message: "Say how they reached us: call or mail." };
  const source = input.source as string;

  const websiteText = oneLineText(input.website, 300);
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i
    .exec(websiteText)?.[1]
    ?.toLowerCase();
  const domain = websiteText ? domainOf(websiteText) : null;
  if (
    websiteText &&
    (!domain ||
      (scheme !== undefined && scheme !== "http" && scheme !== "https"))
  )
    return { ok: false, message: "That website doesn't look right." };
  const website = domain
    ? scheme
      ? websiteText
      : `https://${websiteText}`
    : null;

  const emailText = oneLineText(input.contactEmail, 254);
  const email = emailText ? normalizeEmail(emailText) : null;
  if (emailText && !email)
    return { ok: false, message: "That email address doesn't look right." };
  const contactName = oneLineText(input.contactName, 120);
  const message = plainText(input.message, 2000);

  if (domain) {
    const existing = await findOrgForPerson("", domain);
    if (existing === "error") return TRY_AGAIN;
    if (existing) {
      const where = isInboundSource(existing.source)
        ? "Inbound"
        : "Outreach or Clients";
      return {
        ok: false,
        message: `${existing.name} already uses ${domain} (it is in ${where}).`,
      };
    }
  }

  const by = staff.email.toLowerCase();
  const id = crypto.randomUUID();
  const inserted = await insertRow(TABLES.orgs, {
    id,
    name,
    website,
    domain,
    kind: "client",
    stage: "lead",
    source,
    interest: message.slice(0, 1000),
    created_by: by,
    updated_by: by,
  });
  if (!inserted.ok) {
    if (inserted.duplicate)
      return {
        ok: false,
        message: "A company with that website already exists.",
      };
    return writeFailed("a lead", inserted.message);
  }

  let warning = "";
  if (contactName || email) {
    const added = await insertRow(TABLES.contacts, {
      id: crypto.randomUUID(),
      org_id: id,
      name: contactName || email || name,
      email,
      is_primary: true,
      created_by: by,
      updated_by: by,
    });
    if (!added.ok)
      warning = "The lead was added, but its contact wasn't saved.";
  }

  await audit({
    actor: staff.email,
    area: "inbound",
    action: "added lead",
    subject: id,
    detail: { name, source },
  });

  if (input.startAgent === true) {
    const queued = await queueEvent(
      id,
      "lead_created",
      {
        contact_name: contactName,
        message,
        source,
      },
      staff.email,
    );
    if (!queued.ok)
      warning = `${warning} The agent wasn't started: ${queued.message}`.trim();
  }
  return warning ? { ok: true, id, message: warning } : { ok: true, id };
}
