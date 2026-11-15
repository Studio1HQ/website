import "server-only";
import { cache } from "react";
import {
  deleteRows,
  insertRow,
  insertRows,
  selectRows,
  updateRows,
  upsertRows,
} from "@/lib/supabase-server";
import { membersWith } from "@/lib/internal/members";
import {
  incomplete,
  isMissingTable,
  type Loaded,
} from "@/lib/internal/community/data";
import { isUuid } from "@/lib/internal/clients/clean";
import {
  engagementRows,
  needsMe,
  type EngagementRow,
} from "@/lib/internal/clients/rules";
import {
  CLIENTS_MIGRATION_HINT,
  namesFrom,
  thisMonth,
  todayKey,
  DELIVERABLE_STATUSES,
  type ActionResult,
  type ClientAccount,
  type ClientPerson,
  type Cycle,
  type Deliverable,
  type Engagement,
  type Milestone,
  type Partner,
  type ScopeLine,
  type ScopeTemplate,
  type StatusEvent,
  type StatusEventKind,
  type DeliverableStatus,
} from "@/lib/internal/clients/schema";

export { incomplete, isMissingTable, type Loaded };

/**
 * Reads and writes for client work. No session checks here: every page and
 * action calls requireClients() first. Server only (service-role key).
 *
 * Reads are kept for the length of one request (React's cache), the way the
 * community area does it: a page, its sidebar counts and its pickers share
 * one read, and the next request reads fresh. Actions call
 * revalidatePath("/internal/clients", "layout") after a write, which also
 * drops the browser's copy of the pages.
 */

export const TABLES = {
  clients: "client_accounts",
  engagements: "client_engagements",
  templates: "client_scope_templates",
  cycles: "client_cycles",
  lines: "client_scope_lines",
  deliverables: "client_deliverables",
  events: "client_status_events",
  people: "client_people",
  milestones: "client_milestones",
  partners: "client_partners",
} as const;

function failed<T>(table: string, message: string): Loaded<T> {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[clients] reading ${table} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing
      ? CLIENTS_MIGRATION_HINT
      : "Couldn't load the client work data.",
  };
}

const PAGE = 1000;

/** Every matching row, a page at a time; `tieBreak` keeps pages stable. */
async function selectAll<T>(
  table: string,
  params: Record<string, string>,
  { cap = 20_000, tieBreak = "id" as string | null } = {},
): Promise<Loaded<T>> {
  const rows: T[] = [];
  const order = [params.order, tieBreak ? `${tieBreak}.asc` : ""]
    .filter(Boolean)
    .join(",");
  let truncated = false;
  for (let offset = 0; offset < cap; offset += PAGE) {
    const query = new URLSearchParams({
      select: "*",
      ...params,
      ...(order ? { order } : {}),
      limit: String(Math.min(PAGE, cap - offset)),
      offset: String(offset),
    });
    const result = await selectRows<T>(table, query);
    if (!result.ok) return failed(table, result.message);
    rows.push(...result.rows);
    if (result.rows.length < PAGE) break;
    truncated = offset + PAGE >= cap;
  }
  if (truncated)
    console.error(
      `[clients] ${table} has more than ${cap} rows; the rest were left out`,
    );
  return truncated ? { ok: true, rows, truncated } : { ok: true, rows };
}

/** One read per request for the same table and filters. */
const kept = cache(
  (table: string, key: string, cap: number, tieBreak: string | null) =>
    selectAll<unknown>(table, JSON.parse(key) as Record<string, string>, {
      cap,
      tieBreak,
    }),
);

function read<T>(
  table: string,
  params: Record<string, string>,
  { cap = 20_000, tieBreak = "id" as string | null } = {},
): Promise<Loaded<T>> {
  return kept(table, JSON.stringify(params), cap, tieBreak) as Promise<
    Loaded<T>
  >;
}

/** Reads ids in chunks (a long `in.(…)` list makes the URL too long), merged. */
async function readIn<T>(
  table: string,
  column: string,
  ids: readonly string[],
  params: Record<string, string>,
  options?: { cap?: number },
): Promise<Loaded<T>> {
  const valid = [...new Set(ids.filter(isUuid))].sort();
  if (!valid.length) return { ok: true, rows: [] };
  const rows: T[] = [];
  let truncated = false;
  for (let start = 0; start < valid.length; start += 100) {
    const result = await read<T>(
      table,
      {
        ...params,
        [column]: `in.(${valid.slice(start, start + 100).join(",")})`,
      },
      options,
    );
    if (!result.ok) return result;
    rows.push(...result.rows);
    if (result.truncated) truncated = true;
  }
  return truncated ? { ok: true, rows, truncated } : { ok: true, rows };
}

/* ----------------------------------------------------------------- reads */

/** Clients by name. Archived ones only when asked for. */
export const loadClients = (options: { archived?: boolean } = {}) =>
  read<ClientAccount>(TABLES.clients, {
    ...(options.archived ? {} : { archived_at: "is.null" }),
    order: "name.asc",
  });

/** One client by its slug, or null (archived ones too). */
export async function loadClientBySlug(
  slug: string,
): Promise<Loaded<ClientAccount> & { client?: ClientAccount | null }> {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug))
    return { ok: true, rows: [], client: null };
  const result = await read<ClientAccount>(TABLES.clients, {
    slug: `eq.${slug}`,
  });
  return result.ok ? { ...result, client: result.rows[0] ?? null } : result;
}

/** Engagements: all, one client's, or only some statuses. Newest start first. */
export const loadEngagements = (
  filter: { clientId?: string; statuses?: readonly string[] } = {},
) =>
  read<Engagement>(TABLES.engagements, {
    ...(filter.clientId && isUuid(filter.clientId)
      ? { client_id: `eq.${filter.clientId}` }
      : {}),
    ...(filter.statuses?.length
      ? { status: `in.(${[...filter.statuses].sort().join(",")})` }
      : {}),
    order: "starts_on.desc.nullslast,name.asc",
  });

/** Cycles for some engagements and/or a month (or months), newest month first. */
export async function loadCycles(
  filter: {
    engagementIds?: readonly string[];
    month?: string;
    months?: readonly string[];
  } = {},
): Promise<Loaded<Cycle>> {
  const months = filter.months ?? (filter.month ? [filter.month] : []);
  const params: Record<string, string> = {
    ...(months.length ? { month: `in.(${[...months].sort().join(",")})` } : {}),
    order: "month.desc",
  };
  return filter.engagementIds
    ? readIn<Cycle>(
        TABLES.cycles,
        "engagement_id",
        filter.engagementIds,
        params,
      )
    : read<Cycle>(TABLES.cycles, params);
}

/** Scope lines of these cycles, in their order. */
export const loadScopeLines = (cycleIds: readonly string[]) =>
  readIn<ScopeLine>(TABLES.lines, "cycle_id", cycleIds, {
    order: "position.asc,created_at.asc",
  });

export type DeliverableFilter = {
  engagementId?: string;
  cycleIds?: readonly string[];
  /** Owned or reviewed by this email. */
  person?: string;
  /** Due (due_on) or planned (week) between these days, inclusive. */
  from?: string;
  to?: string;
  /** Leave out published ones. */
  open?: boolean;
  /** Only blocked ones. */
  blocked?: boolean;
  /** Only in these statuses. */
  statuses?: readonly DeliverableStatus[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@(),"]+@[^\s@(),"]+$/;

/** Deliverables matching every filter given, by due date. */
export async function loadDeliverables(
  filter: DeliverableFilter = {},
): Promise<Loaded<Deliverable>> {
  const params: Record<string, string> = {
    order: "due_on.asc.nullslast,created_at.asc",
  };
  if (filter.engagementId) {
    if (!isUuid(filter.engagementId)) return { ok: true, rows: [] };
    params.engagement_id = `eq.${filter.engagementId}`;
  }
  if (filter.statuses) {
    const wanted = DELIVERABLE_STATUSES.map((status) => status.value).filter(
      (status) =>
        filter.statuses?.includes(status) &&
        !(filter.open && status === "published"),
    );
    if (!wanted.length) return { ok: true, rows: [] };
    params.status = `in.(${wanted.join(",")})`;
  } else if (filter.open) params.status = "neq.published";
  if (filter.blocked) params.blocked = "is.true";
  const ors: string[] = [];
  if (filter.person) {
    const email = filter.person.trim().toLowerCase();
    if (!EMAIL.test(email)) return { ok: true, rows: [] };
    ors.push(`or(owner.eq."${email}",reviewer.eq."${email}")`);
  }
  if (
    filter.from &&
    filter.to &&
    DAY.test(filter.from) &&
    DAY.test(filter.to)
  ) {
    ors.push(
      `or(and(due_on.gte.${filter.from},due_on.lte.${filter.to}),and(due_on.is.null,week.gte.${filter.from},week.lte.${filter.to}))`,
    );
  }
  if (ors.length) params.and = `(${ors.join(",")})`;
  return filter.cycleIds
    ? readIn<Deliverable>(
        TABLES.deliverables,
        "cycle_id",
        filter.cycleIds,
        params,
      )
    : read<Deliverable>(TABLES.deliverables, params);
}

/* ------------------------------------------------------- DevRel tracker */

/**
 * True once the DevRel tracker migration has run (content type, views and
 * extra links on deliverables). Until then the forms leave those fields out
 * and saves drop them, so adding work keeps working. One check per request.
 */
let devrelSeen = false;
export const devrelReady = cache(async (): Promise<boolean> => {
  // A migration doesn't un-run: once it's there, stop asking.
  if (devrelSeen) return true;
  const result = await selectRows(
    TABLES.deliverables,
    new URLSearchParams({
      select: "content_type,views,extra_urls",
      limit: "1",
    }),
  );
  if (!result.ok && !isMissingTable(result.message))
    console.error(
      `[clients] checking the DevRel columns failed: ${result.message}`,
    );
  devrelSeen = result.ok;
  return result.ok;
});

/** An engagement's milestones, newest first. */
export const loadMilestones = (engagementIds: readonly string[]) =>
  readIn<Milestone>(TABLES.milestones, "engagement_id", engagementIds, {
    order: "happened_on.desc,created_at.desc",
  });

/** An engagement's partner outreach, most recently changed first. */
export const loadPartners = (engagementIds: readonly string[]) =>
  readIn<Partner>(TABLES.partners, "engagement_id", engagementIds, {
    order: "updated_at.desc",
  });

export async function getMilestone(
  id: string,
): Promise<Milestone | null | "error"> {
  return getOne<Milestone>(TABLES.milestones, id);
}

export async function getPartner(
  id: string,
): Promise<Partner | null | "error"> {
  return getOne<Partner>(TABLES.partners, id);
}

/** One deliverable, read fresh (for actions). */
export async function getDeliverable(
  id: string,
): Promise<Deliverable | null | "error"> {
  return getOne<Deliverable>(TABLES.deliverables, id);
}

export async function getEngagement(
  id: string,
): Promise<Engagement | null | "error"> {
  return getOne<Engagement>(TABLES.engagements, id);
}

export async function getCycle(id: string): Promise<Cycle | null | "error"> {
  return getOne<Cycle>(TABLES.cycles, id);
}

export async function getClient(
  id: string,
): Promise<ClientAccount | null | "error"> {
  return getOne<ClientAccount>(TABLES.clients, id);
}

export async function getScopeLine(
  id: string,
): Promise<ScopeLine | null | "error"> {
  return getOne<ScopeLine>(TABLES.lines, id);
}

async function getOne<T>(
  table: string,
  id: string,
): Promise<T | null | "error"> {
  if (!isUuid(id)) return null;
  const result = await selectRows<T>(
    table,
    new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }),
  );
  if (!result.ok) {
    console.error(`[clients] reading ${table} ${id} failed: ${result.message}`);
    return "error";
  }
  return result.rows[0] ?? null;
}

/** Status events: for some deliverables, and/or since a time. Newest first. */
export async function loadStatusEvents(
  filter: {
    deliverableIds?: readonly string[];
    since?: string;
    limit?: number;
  } = {},
): Promise<Loaded<StatusEvent>> {
  const params: Record<string, string> = {
    ...(filter.since && !Number.isNaN(Date.parse(filter.since))
      ? { at: `gte.${filter.since}` }
      : {}),
    order: "at.desc",
  };
  const cap = filter.limit ?? 5000;
  return filter.deliverableIds
    ? readIn<StatusEvent>(
        TABLES.events,
        "deliverable_id",
        filter.deliverableIds,
        params,
        { cap },
      )
    : read<StatusEvent>(TABLES.events, params, { cap });
}

/** Everyone with a capacity row, by name. */
export const loadPeople = () =>
  read<ClientPerson>(
    TABLES.people,
    { order: "name.asc,email.asc" },
    { tieBreak: null },
  );

/** Saved scope templates (types without a row use DEFAULT_TEMPLATES). */
export const loadTemplates = () =>
  read<ScopeTemplate>(
    TABLES.templates,
    { order: "engagement_type.asc" },
    { tieBreak: null },
  );

/** People who can own or review client work: admins and the client roles, by email. */
export async function ownerChoices(): Promise<string[]> {
  // Dashboard members in client work, plus everyone active on the capacity
  // list (Templates & capacity): people who haven't signed in yet can still
  // own work.
  const [members, people] = await Promise.all([
    membersWith(["admin", "client_manager", "client_member"]),
    loadPeople(),
  ]);
  const listed = people.ok
    ? people.rows
        .filter((person) => person.active)
        .map((person) => person.email)
    : [];
  return [
    ...new Set([...members, ...listed].map((email) => email.toLowerCase())),
  ].sort();
}

/* ------------------------------------------------------------ one month */

export type ClientWork =
  | {
      ok: true;
      month: string;
      clients: ClientAccount[];
      engagements: Engagement[];
      /** The month's cycles. */
      cycles: Cycle[];
      lines: ScopeLine[];
      /** Deliverables in the month's cycles. */
      deliverables: Deliverable[];
      people: ClientPerson[];
      /** email → name, from the capacity list. */
      names: Record<string, string>;
      /** One row per engagement that isn't ended, with health. */
      rows: EngagementRow[];
      /** Some read was cut short. */
      truncated: boolean;
    }
  | { ok: false; missing: boolean; message: string };

/**
 * Everything for one month across all clients: the overview, the reports
 * and the sidebar counts start here. `missing` says the migration hasn't
 * run (show <ClientsMigrationNotice />).
 */
export const loadClientWork = cache(
  async (month: string = thisMonth()): Promise<ClientWork> => {
    const [clients, engagements, cycles, people] = await Promise.all([
      loadClients({ archived: true }),
      loadEngagements(),
      loadCycles({ month }),
      loadPeople(),
    ]);
    if (!clients.ok) return clients;
    if (!engagements.ok) return engagements;
    if (!cycles.ok) return cycles;
    if (!people.ok) return people;
    const ids = cycles.rows.map((cycle) => cycle.id);
    const [lines, deliverables] = await Promise.all([
      loadScopeLines(ids),
      loadDeliverables({ cycleIds: ids }),
    ]);
    if (!lines.ok) return lines;
    if (!deliverables.ok) return deliverables;
    const names = namesFrom(people.rows);
    return {
      ok: true,
      month,
      clients: clients.rows,
      engagements: engagements.rows,
      cycles: cycles.rows,
      lines: lines.rows,
      deliverables: deliverables.rows,
      people: people.rows,
      names,
      rows: engagementRows({
        clients: clients.rows,
        engagements: engagements.rows,
        cycles: cycles.rows,
        lines: lines.rows,
        deliverables: deliverables.rows,
      }),
      truncated: incomplete(
        clients,
        engagements,
        cycles,
        people,
        lines,
        deliverables,
      ),
    };
  },
);

/* ---------------------------------------------------------------- badges */

export type ClientNeeds = {
  /** My deliverables past due. */
  late: number;
  /** My deliverables due in the next 7 days. */
  due: number;
  /** Items in internal review where I'm the reviewer. */
  toReview: number;
  /** Blocked items on engagements I own. */
  blocked: number;
};

const NO_NEEDS: ClientNeeds = { late: 0, due: 0, toReview: 0, blocked: 0 };

/**
 * What client work needs from this person, for the sidebar badge (late +
 * toReview) and the Overview's "Needs you". Zeros when it can't be read
 * (the migration not run included).
 */
export const clientNeeds = cache(
  async (email: string): Promise<ClientNeeds> => {
    const me = email.trim().toLowerCase();
    if (!EMAIL.test(me)) return NO_NEEDS;
    const [mine, owned] = await Promise.all([
      loadDeliverables({ person: me, open: true }),
      read<Pick<Engagement, "id">>(TABLES.engagements, {
        select: "id",
        owner: `eq.${me}`,
        status: "in.(active,planned,paused)",
      }),
    ]);
    if (!mine.ok || !owned.ok) return NO_NEEDS;
    const ownedIds = owned.rows.map((row) => row.id);
    const blocked = ownedIds.length
      ? await readIn<Deliverable>(
          TABLES.deliverables,
          "engagement_id",
          ownedIds,
          {
            blocked: "is.true",
            status: "neq.published",
          },
        )
      : { ok: true as const, rows: [] as Deliverable[] };
    const rows = new Map<string, Deliverable>();
    for (const item of [...mine.rows, ...(blocked.ok ? blocked.rows : [])])
      rows.set(item.id, item);
    return needsMe(me, [...rows.values()], new Set(ownedIds), todayKey());
  },
);

/* ---------------------------------------------------------------- writes */

function writeError(noun: string, message: string): ActionResult {
  if (isMissingTable(message))
    return { ok: false, message: CLIENTS_MIGRATION_HINT };
  if (message.includes("23505")) {
    return {
      ok: false,
      message:
        noun === "client"
          ? "A client with that short name already exists. Pick another."
          : noun === "month"
            ? "That engagement already has this month."
            : "That one already exists.",
    };
  }
  if (message.includes("23503"))
    return {
      ok: false,
      message: "The linked record isn't there any more. Reload the page.",
    };
  if (message.includes("23514"))
    return {
      ok: false,
      message:
        "Something in that form isn't allowed. Check the links and dates and try again.",
    };
  console.error(`[clients] saving ${noun} failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

const GONE: ActionResult = {
  ok: false,
  message: "That isn't there any more. Reload the page.",
};

/** Adds a row; returns its new id. */
export async function insertRecord(
  table: (typeof TABLES)[keyof typeof TABLES],
  noun: string,
  row: Record<string, unknown>,
  by: string,
): Promise<ActionResult> {
  const id = crypto.randomUUID();
  const result = await insertRow(table, {
    ...row,
    id,
    created_by: by,
    updated_by: by,
  });
  return result.ok ? { ok: true, id } : writeError(noun, result.message);
}

/**
 * Changes the fields given on one row. `where` adds conditions (e.g. the
 * status it was checked against), so a change made meanwhile isn't
 * overwritten: no row matched → "isn't there any more".
 */
export async function updateRecord(
  table: (typeof TABLES)[keyof typeof TABLES],
  noun: string,
  id: string,
  patch: Record<string, unknown>,
  by: string,
  where: Record<string, string> = {},
): Promise<ActionResult> {
  if (!isUuid(id)) return GONE;
  const result = await updateRows(
    table,
    new URLSearchParams({ ...where, id: `eq.${id}` }),
    { ...patch, updated_by: by, updated_at: new Date().toISOString() },
  );
  if (!result.ok) return writeError(noun, result.message);
  return result.count ? { ok: true, id } : GONE;
}

export async function deleteRecord(
  table: (typeof TABLES)[keyof typeof TABLES],
  noun: string,
  id: string,
): Promise<ActionResult> {
  if (!isUuid(id)) return GONE;
  const result = await deleteRows(
    table,
    new URLSearchParams({ id: `eq.${id}` }),
  );
  if (!result.ok) return writeError(noun, result.message);
  return result.count ? { ok: true } : GONE;
}

/** Slugs in use, for picking a new client's. */
export async function takenSlugs(): Promise<Set<string> | null> {
  const result = await selectRows<{ slug: string }>(
    TABLES.clients,
    new URLSearchParams({ select: "slug", limit: "5000" }),
  );
  return result.ok ? new Set(result.rows.map((row) => row.slug)) : null;
}

/** Writes one status event. Failures are logged, not thrown: the change itself is saved. */
export async function logStatusEvent(event: {
  deliverable_id: string;
  kind: StatusEventKind;
  from_status?: DeliverableStatus | null;
  to_status?: DeliverableStatus | null;
  comment?: string;
  by: string;
}): Promise<boolean> {
  const result = await insertRow(TABLES.events, {
    deliverable_id: event.deliverable_id,
    kind: event.kind,
    from_status: event.from_status ?? null,
    to_status: event.to_status ?? null,
    comment: event.comment ?? "",
    by: event.by,
  });
  if (!result.ok)
    console.error(`[clients] logging a status event failed: ${result.message}`);
  return result.ok;
}

/** Adds several rows (scope lines from a template). */
export async function insertMany(
  table: (typeof TABLES)[keyof typeof TABLES],
  noun: string,
  rows: Record<string, unknown>[],
  by: string,
): Promise<ActionResult> {
  const result = await insertRows(
    table,
    rows.map((row) => ({ ...row, created_by: by, updated_by: by })),
  );
  return result.ok ? { ok: true } : writeError(noun, result.message);
}

/** Saves a type's template (replacing the saved one). */
export async function saveTemplateRow(
  row: Pick<ScopeTemplate, "engagement_type" | "lines" | "rhythm">,
  by: string,
): Promise<ActionResult> {
  const result = await upsertRows(
    TABLES.templates,
    [
      {
        ...row,
        created_by: by,
        updated_by: by,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "engagement_type" },
  );
  return result.ok ? { ok: true } : writeError("template", result.message);
}

/** Deletes a type's saved template, so the built-in one applies again. */
export async function resetTemplateRow(type: string): Promise<ActionResult> {
  const result = await deleteRows(
    TABLES.templates,
    new URLSearchParams({ engagement_type: `eq.${type}` }),
    "engagement_type",
  );
  return result.ok ? { ok: true } : writeError("template", result.message);
}

/** Saves a person's capacity row (by email). */
export async function savePersonRow(
  row: Record<string, unknown>,
  by: string,
): Promise<ActionResult> {
  const result = await upsertRows(
    TABLES.people,
    [
      {
        ...row,
        created_by: by,
        updated_by: by,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "email" },
  );
  return result.ok ? { ok: true } : writeError("person", result.message);
}

