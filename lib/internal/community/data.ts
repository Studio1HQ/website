import { cache } from "react";
import { HACKATHONS } from "@/data/hackathons";
import {
  deleteRows,
  insertRow,
  selectRows,
  updateRows,
  upsertRows,
} from "@/lib/supabase-server";
import { membersWith } from "@/lib/internal/members";
import {
  cleanRecord,
  crossFieldError,
  isUuid,
  statusStamps,
  wouldLoop,
} from "@/lib/internal/community/clean";
import { mergedStatus, type ImportedGuest } from "@/lib/internal/community/csv";
import {
  COMMUNITY_MIGRATION_HINT,
  ENTITIES,
  EVENT_PARTNERS_MIGRATION_HINT,
  EVENT_KINDS,
  PARTNER_CLOSED_STAGES,
  PARTNER_KINDS,
  SPONSOR_CLOSED_STAGES,
  formatEventDate,
  isDateKey,
  labelOf,
  todayKey,
  type ActionResult,
  type Activity,
  type CommunityEvent,
  type Contact,
  type EntityKey,
  type EventPartner,
  type Expense,
  type Guest,
  type GuestCounts,
  type Metric,
  type Option,
  type Partner,
  type RefKind,
  type RefOptions,
  type Sponsor,
  type Sponsorship,
  type Task,
} from "@/lib/internal/community/schema";

/**
 * Reads and writes for the community area. No session checks here; the
 * pages and actions do that. Server only: it uses the service-role key.
 */

export type Loaded<T> =
  | {
      ok: true;
      rows: T[];
      /** There were more rows than one read is allowed to fetch. */
      truncated?: boolean;
    }
  | { ok: false; missing: boolean; message: string };

/**
 * True when any of these reads failed or came back cut short, so a page
 * can say its numbers are incomplete instead of showing zeros.
 */
export function incomplete(
  ...results: ({ ok: boolean; truncated?: boolean } | null | undefined)[]
) {
  return results.some(
    (result) =>
      result !== null &&
      result !== undefined &&
      (!result.ok || result.truncated === true),
  );
}

/** True when Supabase says the table, view or column doesn't exist yet. */
export function isMissingTable(message: string) {
  return /PGRST205|PGRST204|42P01|42703|does not exist|Could not find the table/i.test(
    message,
  );
}

function failed<T>(table: string, message: string): Loaded<T> {
  const missing = isMissingTable(message);
  if (!missing)
    console.error(`[community] reading ${table} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing
      ? COMMUNITY_MIGRATION_HINT
      : "Couldn't load the community data.",
  };
}

const PAGE = 1000;

/**
 * Every matching row, a page at a time (Supabase caps a read at 1,000).
 * Pages are cut by position, so the order has to be the same on every
 * read: `tieBreak` (the id) settles rows the order leaves equal. Pass null
 * for views without an id whose order is already unique.
 */
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
      limit: String(PAGE),
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
      `[community] ${table} has more than ${cap} rows; the rest were left out`,
    );
  return truncated ? { ok: true, rows, truncated } : { ok: true, rows };
}

/* ----------------------------------------------------------------- lists */

// The whole-table lists are read once per page render (React's cache), so
// a page and the pickers it builds (refOptions) share one read.
export const loadEvents = cache(() =>
  selectAll<CommunityEvent>("community_events", {
    order: "starts_on.desc.nullsfirst,created_at.desc",
  }),
);

export const loadPartners = cache(() =>
  selectAll<Partner>("community_partners", { order: "name.asc" }),
);

export const loadSponsors = cache(() =>
  selectAll<Sponsor>("community_sponsors", { order: "name.asc" }),
);

type Filter = Partial<Record<"event_id" | "sponsor_id" | "partner_id", string>>;

function filterParams(filter: Filter) {
  const params: Record<string, string> = {};
  for (const [column, id] of Object.entries(filter)) {
    if (id && isUuid(id)) params[column] = `eq.${id}`;
  }
  return params;
}

export const loadSponsorships = (filter: Filter = {}) =>
  selectAll<Sponsorship>("community_sponsorships", {
    ...filterParams(filter),
    order: "created_at.desc",
  });

export const loadExpenses = (filter: Filter = {}) =>
  selectAll<Expense>("community_expenses", {
    ...filterParams(filter),
    order: "created_at.desc",
  });

export const loadTasks = (filter: Filter = {}) =>
  selectAll<Task>("community_tasks", {
    ...filterParams(filter),
    order: "due_on.asc.nullslast,created_at.desc",
  });

export const loadContacts = (filter: Filter) =>
  selectAll<Contact>("community_contacts", {
    ...filterParams(filter),
    order: "is_primary.desc,name.asc",
  });

export const loadActivity = (filter: Filter) =>
  selectAll<Activity>(
    "community_activity",
    { ...filterParams(filter), order: "happened_on.desc,created_at.desc" },
    { cap: 2000 },
  );

/**
 * Partners linked to events with a role (besides each event's host): for
 * one event, one partner, or all of them.
 */
export const loadEventPartners = (filter: Pick<Filter, "event_id" | "partner_id"> = {}) =>
  selectAll<EventPartner>("community_event_partners", {
    ...filterParams(filter),
    order: "created_at.asc",
  });

export const loadGuests = (eventId: string) =>
  selectAll<Guest>("community_guests", {
    event_id: `eq.${eventId}`,
    order: "created_at.asc",
  });

export const loadMetrics = () =>
  selectAll<Metric>("community_metrics", { order: "recorded_on.asc" });

/** Guest-list counts per event id. */
export const loadGuestCounts = cache(
  (): Promise<Loaded<GuestCounts & { event_id: string }>> =>
    selectAll(
      "community_guest_counts",
      { order: "event_id.asc" },
      { tieBreak: null },
    ),
);

export type HackathonCounts = GuestCounts & {
  hackathon_slug: string;
  hackathon_name: string;
};

/** Site-form sign-ups per hackathon. */
export const loadHackathonCounts = cache((): Promise<Loaded<HackathonCounts>> =>
  selectAll(
    "community_hackathon_counts",
    { order: "hackathon_slug.asc" },
    { tieBreak: null },
  ),
);

export async function getRecord<T>(
  entity: EntityKey,
  id: string,
): Promise<T | null> {
  if (!isUuid(id)) return null;
  const result = await selectRows<T>(
    ENTITIES[entity].table,
    new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }),
  );
  return result.ok ? (result.rows[0] ?? null) : null;
}

/**
 * Everyone reached (unique emails) and how many signed up for more than
 * one event. Null when the count couldn't be read.
 */
export async function peopleTotals(): Promise<{
  people: number;
  returning: number;
} | null> {
  const count = async (params: Record<string, string>) => {
    const result = await selectRows(
      "community_people",
      new URLSearchParams({ select: "email", limit: "1", ...params }),
      {
        count: true,
      },
    );
    return result.ok ? (result.total ?? result.rows.length) : null;
  };
  const [people, returning] = await Promise.all([
    count({}),
    count({ events: "gte.2" }),
  ]);
  return people === null || returning === null ? null : { people, returning };
}

/** New people per month, or null when it couldn't be read. */
export async function peopleByMonth(): Promise<
  { month: string; people: number; came_back: number }[] | null
> {
  const result = await selectAll<{
    month: string;
    people: number;
    came_back: number;
  }>("community_people_by_month", { order: "month.asc" }, { tieBreak: null });
  return result.ok ? result.rows : null;
}

/**
 * When each email subscriber first opted in, by month: "2026-11" → 42.
 * Null when it couldn't be read.
 */
export async function subscribersByMonth(): Promise<Record<
  string,
  number
> | null> {
  const result = await selectAll<{ first_opted_in: string }>(
    "email_subscribers",
    {
      select: "first_opted_in",
      order: "first_opted_in.asc",
    },
    // Only months are counted, and rows with the same moment are
    // interchangeable, so no tie-break is needed.
    { tieBreak: null },
  );
  if (!result.ok) return null;
  const months: Record<string, number> = {};
  for (const row of result.rows) {
    const month = String(row.first_opted_in ?? "").slice(0, 7);
    if (month) months[month] = (months[month] ?? 0) + 1;
  }
  return months;
}

/* --------------------------------------------------------------- pickers */

/** Options for the event, sponsor, partner and hackathon pickers. */
export async function refOptions(
  kinds: readonly RefKind[],
): Promise<RefOptions> {
  const today = todayKey();
  const [events, sponsors, partners, hackathons] = await Promise.all([
    kinds.includes("event") ? loadEvents() : null,
    kinds.includes("sponsor") ? loadSponsors() : null,
    kinds.includes("partner") ? loadPartners() : null,
    kinds.includes("hackathon") ? loadHackathonCounts() : null,
  ]);
  const refs: RefOptions = {};
  if (events?.ok) {
    refs.event = events.rows.map((event) => ({
      value: event.id,
      label: `${event.name} · ${event.starts_on ? formatEventDate(event.starts_on, null, today) : labelOf(EVENT_KINDS, event.kind)}`,
    }));
  }
  if (sponsors?.ok)
    refs.sponsor = sponsors.rows.map((sponsor) => ({
      value: sponsor.id,
      label: sponsor.name,
    }));
  if (partners?.ok) {
    refs.partner = partners.rows.map((partner) => ({
      value: partner.id,
      label: `${partner.name} · ${labelOf(PARTNER_KINDS, partner.kind)}${partner.city ? `, ${partner.city}` : ""}`,
    }));
  }
  if (kinds.includes("hackathon")) {
    // Hackathons on the site, plus any slug that has sign-ups.
    const counts = new Map(
      (hackathons?.ok ? hackathons.rows : []).map((row) => [
        row.hackathon_slug,
        row,
      ]),
    );
    const options = new Map<string, Option>();
    for (const hackathon of HACKATHONS) {
      const signed = counts.get(hackathon.slug)?.signed_up ?? 0;
      options.set(hackathon.slug, {
        value: hackathon.slug,
        label: `${hackathon.name} (${signed} signed up)`,
      });
    }
    for (const row of counts.values()) {
      if (!options.has(row.hackathon_slug)) {
        options.set(row.hackathon_slug, {
          value: row.hackathon_slug,
          label: `${row.hackathon_name} (${row.signed_up} signed up)`,
        });
      }
    }
    refs.hackathon = [...options.values()];
  }
  return refs;
}

/** People who can own community work: admins and community roles. */
export async function ownerChoices(): Promise<string[]> {
  return (
    await membersWith(["admin", "community_manager", "community_viewer"])
  ).sort();
}

/* ---------------------------------------------------------------- writes */

function writeError(entity: EntityKey, message: string): ActionResult {
  if (isMissingTable(message))
    return {
      ok: false,
      message: entity === "event_partner" ? EVENT_PARTNERS_MIGRATION_HINT : COMMUNITY_MIGRATION_HINT,
    };
  if (message.includes("23505")) {
    return {
      ok: false,
      message:
        entity === "guest"
          ? "That email is already on this guest list."
          : entity === "event_partner"
            ? "That partner already has this role on this event."
          : entity === "metric"
            ? "That channel already has a number for this date. Edit it instead."
            : "That one already exists.",
    };
  }
  if (message.includes("23503"))
    return {
      ok: false,
      message: "The linked record isn't there any more. Reload the page.",
    };
  console.error(`[community] saving ${entity} failed: ${message}`);
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

/** Adds a record from form input; returns its id. */
export async function createRecord(
  entity: EntityKey,
  input: Record<string, unknown>,
  by: string,
): Promise<ActionResult> {
  const def = ENTITIES[entity];
  const clean = cleanRecord(def, input, "create");
  if (!clean.ok) return clean;
  const id = crypto.randomUUID();
  const row: Record<string, unknown> = {
    ...clean.row,
    id,
    created_by: by,
    updated_by: by,
  };
  if (entity === "task" && row.status === "done")
    row.completed_at = new Date().toISOString();
  if (entity === "guest" && row.status === "attended")
    row.checked_in_at = new Date().toISOString();
  const result = await insertRow(def.table, row);
  return result.ok ? { ok: true, id } : writeError(entity, result.message);
}

/** Changes the fields given; the rest stay as they are. */
export async function updateRecord(
  entity: EntityKey,
  id: string,
  input: Record<string, unknown>,
  by: string,
): Promise<ActionResult> {
  const gone: ActionResult = {
    ok: false,
    message: "That record isn't there any more.",
  };
  if (!isUuid(id)) return gone;
  const def = ENTITIES[entity];
  const clean = cleanRecord(def, input, "update");
  if (!clean.ok) return clean;

  // The saved row: the rules across fields need the whole record, and the
  // time stamps only move when the status really changes.
  const saved = await selectRows<Record<string, unknown>>(
    def.table,
    new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }),
  );
  if (!saved.ok) return writeError(entity, saved.message);
  const before = saved.rows[0];
  if (!before) return gone;
  const problem = crossFieldError(entity, { ...before, ...clean.row }, true);
  if (problem) return { ok: false, message: problem };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    ...clean.row,
    ...("status" in clean.row
      ? statusStamps(
          entity,
          typeof before.status === "string" ? before.status : null,
          clean.row.status,
          now,
        )
      : {}),
    updated_by: by,
    updated_at: now,
  };
  if (
    entity === "partner" &&
    typeof patch.parent_id === "string" &&
    patch.parent_id !== before.parent_id
  ) {
    // Read fresh, not through the cached list: this runs in an action.
    const all = await selectAll<{ id: string; parent_id: string | null }>(
      def.table,
      { select: "id,parent_id" },
    );
    if (!all.ok) return writeError(entity, all.message);
    const parents = new Map(all.rows.map((row) => [row.id, row.parent_id]));
    if (wouldLoop(id, patch.parent_id, parents)) {
      return {
        ok: false,
        message: "A club can't belong to itself or to one of its own clubs.",
      };
    }
  }
  const result = await updateRows(
    def.table,
    new URLSearchParams({ id: `eq.${id}` }),
    patch,
  );
  if (!result.ok) return writeError(entity, result.message);
  return result.count ? { ok: true, id } : gone;
}

export async function deleteRecord(
  entity: EntityKey,
  id: string,
): Promise<ActionResult> {
  if (!isUuid(id))
    return { ok: false, message: "That record isn't there any more." };
  const result = await deleteRows(
    ENTITIES[entity].table,
    new URLSearchParams({ id: `eq.${id}` }),
  );
  if (!result.ok) return writeError(entity, result.message);
  return { ok: true };
}

/**
 * Moves a sponsor's or partner's follow-up date, and stamps the last
 * contact. The last contact only ever moves forward, so logging an old
 * call doesn't hide a newer one.
 */
export async function touchFollowUp(
  entity: "sponsor" | "partner",
  id: string,
  change: { followUpOn?: string | null; contactedOn?: string | null },
  by: string,
): Promise<ActionResult> {
  const gone: ActionResult = {
    ok: false,
    message: "That record isn't there any more.",
  };
  if (!isUuid(id)) return gone;
  const table = ENTITIES[entity].table;
  const stamps = { updated_by: by, updated_at: new Date().toISOString() };
  if (change.followUpOn !== undefined) {
    const result = await updateRows(
      table,
      new URLSearchParams({ id: `eq.${id}` }),
      { ...stamps, follow_up_on: change.followUpOn },
    );
    if (!result.ok) return writeError(entity, result.message);
    if (!result.count) return gone;
  }
  if (change.contactedOn && isDateKey(change.contactedOn)) {
    const result = await updateRows(
      table,
      new URLSearchParams({
        id: `eq.${id}`,
        or: `(last_contact_on.is.null,last_contact_on.lt.${change.contactedOn})`,
      }),
      { ...stamps, last_contact_on: change.contactedOn },
    );
    if (!result.ok) return writeError(entity, result.message);
  }
  return { ok: true };
}

/**
 * Merges imported guests into an event's list: new emails are added,
 * existing ones are updated without undoing check-ins (mergedStatus).
 */
export async function importGuests(
  eventId: string,
  guests: ImportedGuest[],
  by: string,
): Promise<ActionResult & { added?: number; updated?: number }> {
  const existing = await loadGuests(eventId);
  if (!existing.ok) return { ok: false, message: existing.message };
  const byEmail = new Map(existing.rows.map((guest) => [guest.email, guest]));
  const now = new Date().toISOString();
  let added = 0;
  const rows = guests.map((guest) => {
    const before = byEmail.get(guest.email);
    if (!before) added++;
    const status = mergedStatus(before?.status, guest.status);
    return {
      event_id: eventId,
      email: guest.email,
      name: guest.name || before?.name || "",
      organisation: guest.organisation || before?.organisation || "",
      role: guest.role ?? before?.role ?? "attendee",
      status,
      checked_in_at:
        status === "attended"
          ? (before?.checked_in_at ?? guest.checkedInAt ?? now)
          : null,
      source: before?.source ?? "import",
      created_by: before?.created_by ?? by,
      updated_by: by,
      updated_at: now,
    };
  });
  for (let start = 0; start < rows.length; start += 500) {
    const result = await upsertRows(
      "community_guests",
      rows.slice(start, start + 500),
      { onConflict: "event_id,email" },
    );
    if (!result.ok) return writeError("guest", result.message);
  }
  return { ok: true, added, updated: rows.length - added };
}

/** Saves growth numbers for one date; a channel's number for that date is replaced. */
export async function saveMetrics(
  day: string,
  values: { channel: string; value: number }[],
  by: string,
): Promise<ActionResult> {
  const now = new Date().toISOString();
  const rows = values.map((item) => ({
    channel: item.channel,
    recorded_on: day,
    value: item.value,
    created_by: by,
    updated_by: by,
    updated_at: now,
  }));
  const result = await upsertRows("community_metrics", rows, {
    onConflict: "channel,recorded_on",
  });
  return result.ok ? { ok: true } : writeError("metric", result.message);
}

/* ---------------------------------------------------------------- badges */

/** Sidebar counts: my tasks due or late, and follow-ups due today or earlier. */
export async function communityBadges(
  email: string,
): Promise<{ tasks: number; sponsors: number; partners: number }> {
  const today = todayKey();
  const count = async (table: string, params: Record<string, string>) => {
    const result = await selectRows(
      table,
      new URLSearchParams({ select: "id", limit: "1", ...params }),
      { count: true },
    );
    return result.ok ? (result.total ?? result.rows.length) : 0;
  };
  const [tasks, sponsors, partners] = await Promise.all([
    count("community_tasks", {
      owner: `eq.${email}`,
      status: "neq.done",
      due_on: `lte.${today}`,
    }),
    count("community_sponsors", {
      follow_up_on: `lte.${today}`,
      stage: `not.in.(${SPONSOR_CLOSED_STAGES.join(",")})`,
    }),
    count("community_partners", {
      follow_up_on: `lte.${today}`,
      stage: `not.in.(${PARTNER_CLOSED_STAGES.join(",")})`,
    }),
  ]);
  return { tasks, sponsors, partners };
}

/** After an event: everyone still registered or confirmed becomes a no-show. */
export async function markNoShows(
  eventId: string,
  by: string,
): Promise<ActionResult & { count?: number }> {
  if (!isUuid(eventId)) return { ok: false, message: "Unknown event." };
  const result = await updateRows(
    "community_guests",
    new URLSearchParams({
      event_id: `eq.${eventId}`,
      status: "in.(registered,confirmed)",
    }),
    {
      status: "no_show",
      checked_in_at: null,
      updated_by: by,
      updated_at: new Date().toISOString(),
    },
  );
  if (!result.ok) return writeError("guest", result.message);
  return { ok: true, count: result.count };
}

/** The latest outreach and notes across everything, for the overview. */
export async function loadRecentActivity(limit = 8): Promise<Loaded<Activity>> {
  const result = await selectRows<Activity>(
    "community_activity",
    new URLSearchParams({
      select: "*",
      order: "created_at.desc",
      limit: String(limit),
    }),
  );
  return result.ok
    ? { ok: true, rows: result.rows }
    : failed("community_activity", result.message);
}
