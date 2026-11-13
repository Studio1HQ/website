import { HACKATHONS, getHackathon } from "@/data/hackathons";
import { selectRows, signedFileUrl, updateRows } from "@/lib/supabase-server";
import { todayKey } from "@/lib/internal/community/schema";
import { PLAN_TEMPLATES, emailPlan, planSendTime, type PlanStep } from "@/lib/internal/hackathon-plan";
import { blockedAddresses, deliveriesFor, type Delivery } from "@/lib/email-delivery";
import { isAdmin, requireMember, requireSection } from "@/lib/internal/session";
import {
  facetOptions,
  filterRows,
  isOverdue,
  repeats,
  rowTags,
  sortRows,
  statusCounts,
  tagOptions,
  type FacetOptions,
  type Option,
  type Row,
} from "@/lib/internal/query";
import {
  FORM_SECTION,
  PAGE_SIZE,
  PIPELINES,
  SECTIONS,
  UUID_PATTERN,
  cleanTag,
  readableSections,
  sectionAccess,
  type Filters,
  type Section,
  type SectionKey,
} from "@/lib/internal/sections";

/**
 * Data reads and writes for the internal dashboard. Each one checks the
 * session first, so nothing here runs for a signed-out visitor, whatever
 * page, action or route calls it.
 */

export type { Row };

const MAX_ROWS = 10_000;
const BATCH = 1000;

/** True when Supabase rejected a query because `column` doesn't exist yet. */
function missingColumn(message: string, column: string) {
  return (
    message.includes(column) &&
    /42703|PGRST204|does not exist|Could not find/.test(message)
  );
}

type AllRows = { ok: true; rows: Row[]; truncated: boolean } | { ok: false; message: string };

/**
 * Every row of a table, read a page at a time, up to MAX_ROWS. `order` ends
 * with a unique column, so rows that share a timestamp can't swap places
 * between pages and show up twice or not at all. The first page also asks
 * for the full count: reading stops when every row is in, however many rows
 * Supabase returns per request, and `truncated` says when the table holds
 * more than was read.
 */
async function loadAll(
  table: string,
  select: string,
  order: string,
  filters: Record<string, string> = {},
): Promise<AllRows> {
  const rows: Row[] = [];
  let total: number | null = null;
  while (rows.length < MAX_ROWS) {
    const result = await selectRows(
      table,
      new URLSearchParams({
        ...filters,
        select,
        order,
        limit: String(Math.min(BATCH, MAX_ROWS - rows.length)),
        offset: String(rows.length),
      }),
      { count: rows.length === 0 },
    );
    if (!result.ok) return result;
    if (rows.length === 0) total = result.total;
    rows.push(...result.rows);
    if (result.rows.length === 0) break;
    if (total !== null ? rows.length >= total : result.rows.length < BATCH) break;
  }
  return { ok: true, rows, truncated: total !== null ? total > rows.length : rows.length >= MAX_ROWS };
}

type Loaded =
  | { ok: true; rows: Row[]; tagsReady: boolean; truncated: boolean }
  | { ok: false; message: string };

function fail(section: Section, message: string): Loaded {
  console.error(`[internal] reading ${section.table} failed: ${message}`);
  return { ok: false, message: `Couldn't load ${section.title.toLowerCase()} from Supabase.` };
}

/**
 * Every row of a section. `tags` is read when the table has it; before the
 * dashboard migration runs, the list still loads without tags.
 */
async function loadSection(section: Section, full = false): Promise<Loaded> {
  const columns = new Set(section.listSelect);
  for (const facet of section.facets) {
    columns.add(facet.column);
    if (facet.labelColumn) columns.add(facet.labelColumn);
  }
  const base = full ? "*" : [...columns].join(",");
  const order = `${section.dateColumn}.desc,${section.idColumn}.desc`;
  if (section.tags && !full) {
    const withTags = await loadAll(section.table, `${base},tags`, order);
    if (withTags.ok) return { ...withTags, tagsReady: true };
    if (!missingColumn(withTags.message, "tags")) return fail(section, withTags.message);
  }
  const result = await loadAll(section.table, base, order);
  if (!result.ok) return fail(section, result.message);
  const tagsReady = section.tags && full && result.rows.some((row) => "tags" in row);
  return { ...result, tagsReady };
}

export type ListView =
  | {
      ok: true;
      rows: Row[];
      total: number;
      statusCounts: Record<string, number>;
      facets: FacetOptions;
      tags: Option[];
      tagsReady: boolean;
      /** Overdue entries under the other filters, for the Overdue chip. */
      overdue: number;
      /** The table holds more rows than the dashboard reads (MAX_ROWS). */
      truncated: boolean;
    }
  | { ok: false; message: string };

export async function listView(section: Section, filters: Filters): Promise<ListView> {
  await requireSection(section);
  const loaded = await loadSection(section);
  if (!loaded.ok) return loaded;
  const matching = sortRows(filterRows(loaded.rows, section, filters), section, filters.sort);
  const start = (filters.page - 1) * PAGE_SIZE;
  const others = section.repeatLabel ? repeats(loaded.rows, section) : new Map();
  const now = Date.now();
  return {
    ok: true,
    // Flags for the list: _overdue and _also (this person's other entries).
    rows: matching.slice(start, start + PAGE_SIZE).map((row) => ({
      ...row,
      _overdue: isOverdue(row, section, now),
      _also: others.get(String(row.id)) ?? [],
    })),
    overdue: section.statuses
      ? filterRows(loaded.rows, section, { ...filters, status: undefined }, "overdue").filter(
          (row) => isOverdue(row, section, now),
        ).length
      : 0,
    total: matching.length,
    statusCounts: section.statuses ? statusCounts(loaded.rows, section, filters) : {},
    facets: facetOptions(loaded.rows, section, filters),
    tags: tagOptions(loaded.rows, section, filters),
    tagsReady: loaded.tagsReady,
    truncated: loaded.truncated,
  };
}

/** The most rows a list or an export reads from one table. */
export const ROW_LIMIT = MAX_ROWS;

/** Rows for the CSV export: the list's filters, or exactly `ids`. */
export async function exportRows(
  section: Section,
  filters: Filters,
  ids: string[],
): Promise<{ ok: true; rows: Row[]; truncated: boolean } | { ok: false; message: string }> {
  await requireSection(section, "export");
  const loaded = await loadSection(section, true);
  if (!loaded.ok) return loaded;
  if (ids.length) {
    const wanted = new Set(ids);
    return {
      ok: true,
      rows: loaded.rows.filter((row) => wanted.has(String(row[section.idColumn]))),
      truncated: loaded.truncated,
    };
  }
  return {
    ok: true,
    rows: sortRows(filterRows(loaded.rows, section, filters), section, filters.sort),
    truncated: loaded.truncated,
  };
}

export type RecordView = {
  record: Row;
  tagsReady: boolean;
  tags: Option[];
  /** Where this entry sits in the filtered list it was opened from. */
  position: { index: number; total: number; prev?: string; next?: string } | null;
};

export async function recordView(
  section: Section,
  id: string,
  filters: Filters,
): Promise<RecordView | null> {
  await requireSection(section);
  if (!UUID_PATTERN.test(id)) return null;
  const [one, loaded] = await Promise.all([
    selectRows(section.table, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" })),
    loadSection(section),
  ]);
  if (!one.ok) {
    console.error(`[internal] reading ${section.table} ${id} failed: ${one.message}`);
    throw new Error("Couldn't load this entry from Supabase.");
  }
  const record = one.rows[0];
  if (!record) return null;
  if (!loaded.ok) return { record, tagsReady: "tags" in record, tags: [], position: null };

  const ids = sortRows(filterRows(loaded.rows, section, filters), section, filters.sort).map(
    (row) => String(row.id),
  );
  const index = ids.indexOf(id);
  return {
    record,
    tagsReady: loaded.tagsReady,
    tags: tagOptions(loaded.rows, section, { ...filters, tags: [] }),
    position:
      index === -1
        ? null
        : { index, total: ids.length, prev: ids[index - 1], next: ids[index + 1] },
  };
}

export type EntryChange = {
  status?: string;
  notes?: string | null;
  addTags?: string[];
  removeTags?: string[];
};

/** A Postgres array literal for a list of tags: {"Strong fit","Maybe"}. */
function arrayLiteral(values: string[]) {
  return `{${values.map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

/** How often a tag change is retried when someone else changed the tags first. */
const TAG_ATTEMPTS = 3;

/**
 * Applies one change to up to 200 entries: a status, notes, or tags added or
 * removed. Stamps reviewed_by (skipped while that column doesn't exist yet).
 *
 * Tags are saved with a check that they're still what was read ("only if
 * the tags are still X"), and read again if not, so two people tagging the
 * same entry at once both keep their tag. When the status or notes saved
 * but the tags didn't, the message says so and `saved` is true.
 */
export async function updateEntries(
  section: Section,
  ids: string[],
  change: EntryChange,
): Promise<
  | { ok: true; tags?: Record<string, string[]> }
  | { ok: false; message: string; /** Part of the change was saved. */ saved?: boolean }
> {
  const staff = await requireSection(section, "edit");
  const unique = [...new Set(ids)];
  if (
    !section.statuses ||
    unique.length === 0 ||
    unique.length > 200 ||
    !unique.every((id) => UUID_PATTERN.test(id)) ||
    (change.status !== undefined && !section.statuses.includes(change.status))
  ) {
    return { ok: false, message: "That change isn't valid." };
  }

  const write = async (filters: Record<string, string>, values: Row) => {
    const query = () => new URLSearchParams(filters);
    let result = await updateRows(section.table, query(), { ...values, reviewed_by: staff.email });
    if (!result.ok && missingColumn(result.message, "reviewed_by")) {
      result = await updateRows(section.table, query(), values);
    }
    return result;
  };

  const patch: Row = {};
  if (change.status !== undefined) patch.review_status = change.status;
  if (change.notes !== undefined) patch.review_notes = change.notes;
  const patched = Object.keys(patch).length > 0;
  if (patched) {
    const result = await write({ id: `in.(${unique.join(",")})` }, patch);
    if (!result.ok) {
      console.error(`[internal] updating ${section.table} failed: ${result.message}`);
      return { ok: false, message: "Couldn't save. Try again in a minute." };
    }
  }

  const add = (change.addTags ?? []).map(cleanTag).filter((tag): tag is string => !!tag);
  const remove = (change.removeTags ?? []).map((tag) => tag.toLowerCase());
  if (!add.length && !remove.length) return { ok: true };

  const tagsFailed = (message: string) => ({
    ok: false as const,
    message: patched ? `The status and notes were saved, but the tags weren't. ${message}` : message,
    saved: patched,
  });
  const readTags = (wanted: string[]) =>
    selectRows(section.table, new URLSearchParams({ select: "id,tags", id: `in.(${wanted.join(",")})` }));

  let current = await readTags(unique);
  if (!current.ok) {
    console.error(`[internal] reading tags on ${section.table} failed: ${current.message}`);
    return tagsFailed(
      missingColumn(current.message, "tags")
        ? "Tags need the dashboard migration in Supabase first."
        : "Couldn't save the tags. Try again in a minute.",
    );
  }

  const updated: Record<string, string[]> = {};
  let failure: string | null = null;
  for (let attempt = 0; attempt < TAG_ATTEMPTS && current.ok; attempt += 1) {
    // Nothing left to tag (an entry deleted in between leaves no row).
    if (!current.rows.length) return { ok: true, tags: updated };
    // The last try saves whatever it read, so tags that keep changing
    // still end with this change applied.
    const guarded = attempt < TAG_ATTEMPTS - 1;
    const changedUnderneath: string[] = [];
    const results = await Promise.all(
      current.rows.map(async (row) => {
        const id = String(row.id);
        const before = rowTags(row);
        const next = before.filter((tag) => !remove.includes(tag.toLowerCase()));
        for (const tag of add) {
          if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag);
        }
        const kept = next.slice(0, 20);
        updated[id] = kept;
        if (kept.join("\u0000") === before.join("\u0000")) return { ok: true as const };
        // Only if the tags are still what was just read.
        const unchanged = Array.isArray(row.tags) ? `eq.${arrayLiteral(before)}` : "is.null";
        const result = await write({ id: `eq.${id}`, ...(guarded ? { tags: unchanged } : {}) }, { tags: kept });
        if (!guarded) return result;
        // Not saved (changed in between, or the guarded write was refused):
        // goes round again.
        if (!result.ok || result.count === 0) changedUnderneath.push(id);
        return { ok: true as const };
      }),
    );
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      failure = failed.message;
      break;
    }
    if (!changedUnderneath.length) return { ok: true, tags: updated };
    // Someone else changed these in between: read them again and redo.
    current = await readTags(changedUnderneath);
  }
  console.error(`[internal] tagging ${section.table} failed: ${failure ?? (current.ok ? "unknown" : current.message)}`);
  return tagsFailed("Couldn't save the tags. Try again in a minute.");
}

/** A two-minute link to an applicant's résumé PDF. */
export async function resumeUrl(id: string): Promise<string | null> {
  await requireSection(SECTIONS.jobs);
  if (!UUID_PATTERN.test(id)) return null;
  const result = await selectRows(
    SECTIONS.jobs.table,
    new URLSearchParams({ select: "resume_path", id: `eq.${id}`, limit: "1" }),
  );
  const path = result.ok ? result.rows[0]?.resume_path : null;
  if (typeof path !== "string" || !path) return null;
  const signed = await signedFileUrl("job-applications", path, 120);
  if (!signed.ok) {
    console.error(`[internal] signing résumé for ${id} failed: ${signed.message}`);
    return null;
  }
  return signed.url;
}

async function count(table: string, filters: Record<string, string> = {}) {
  const result = await selectRows(
    table,
    new URLSearchParams({ select: "*", limit: "1", ...filters }),
    { count: true },
  );
  return result.ok ? (result.total ?? 0) : null;
}

/** "New" entries per pipeline this person can open, for the sidebar. */
export async function awaitingCounts(): Promise<Partial<Record<SectionKey, number>>> {
  const staff = await requireMember();
  const counts = await Promise.all(
    readableSections(staff, PIPELINES).map(
      async (key) => [key, await count(SECTIONS[key].table, { review_status: "eq.new" })] as const,
    ),
  );
  return Object.fromEntries(counts.filter(([, value]) => value !== null));
}

export type PipelineStats = {
  key: SectionKey;
  ok: boolean;
  total: number;
  awaiting: number;
  lastWeek: number;
  overdue: number;
  byStatus: { status: string; count: number }[];
};

export type LatestEntry = {
  section: SectionKey;
  id: string;
  name: string;
  email: string;
  program: string;
  status: string;
  createdAt: string;
};

/**
 * Numbers for the pipelines this person can open (hiring reviewers don't
 * get hackathon registrations, community staff get only those), and the
 * latest entries among them.
 */
export async function overview() {
  const staff = await requireMember();
  // The audiences are admin-only, so nobody else's page even counts them.
  const admin = isAdmin(staff);
  const readable = readableSections(staff, PIPELINES);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [pipelines, subscribers, partners, latest] = await Promise.all([
    Promise.all(
      readable.map(async (key): Promise<PipelineStats> => {
        const section = SECTIONS[key];
        const result = await loadAll(section.table, "review_status,created_at", "created_at.desc,id.desc");
        if (!result.ok) {
          console.error(`[internal] overview of ${section.table} failed: ${result.message}`);
          return { key, ok: false, total: 0, awaiting: 0, lastWeek: 0, overdue: 0, byStatus: [] };
        }
        const counts = new Map<string, number>();
        for (const row of result.rows) {
          const status = String(row.review_status ?? "new");
          counts.set(status, (counts.get(status) ?? 0) + 1);
        }
        return {
          key,
          ok: true,
          total: result.rows.length,
          awaiting: counts.get("new") ?? 0,
          lastWeek: result.rows.filter((row) => Date.parse(String(row.created_at)) >= weekAgo)
            .length,
          overdue: result.rows.filter((row) => isOverdue(row, section)).length,
          byStatus: (section.statuses ?? []).map((status) => ({
            status,
            count: counts.get(status) ?? 0,
          })),
        };
      }),
    ),
    admin ? count(SECTIONS.subscribers.table) : Promise.resolve(null),
    admin ? count(SECTIONS["partner-pool"].table) : Promise.resolve(null),
    selectRows(
      "submissions",
      new URLSearchParams({
        select: "form,record_id,program,name,email,review_status,created_at",
        // Only the forms behind the sections this person can open.
        form: `in.(${Object.keys(FORM_SECTION).filter((form) => readable.includes(FORM_SECTION[form])).join(",") || "none"})`,
        order: "created_at.desc",
        limit: "8",
      }),
    ),
  ]);
  const entries: LatestEntry[] = latest.ok
    ? latest.rows.flatMap((row) => {
        const section = FORM_SECTION[String(row.form)];
        return section && readable.includes(section)
          ? [
              {
                section,
                id: String(row.record_id),
                name: String(row.name ?? ""),
                email: String(row.email ?? ""),
                program: String(row.program ?? ""),
                status: String(row.review_status ?? ""),
                createdAt: String(row.created_at ?? ""),
              },
            ]
          : [];
      })
    : [];
  return { pipelines, subscribers, partners, latest: entries, latestOk: latest.ok };
}

/** One hackathon's registrations, for its tab, its event page and the home page. */
export type HackathonStats = {
  slug: string;
  name: string;
  /** From data/hackathons.ts; null for a slug that's no longer listed there. */
  startDate: string | null;
  endDate: string | null;
  registrationCloses: string | null;
  /** "open": taking registrations; "upcoming": closed, not over; "past". */
  phase: "open" | "upcoming" | "past" | "unlisted";
  total: number;
  byStatus: Record<string, number>;
  lastWeek: number;
  overdue: number;
};

/**
 * Registrations per hackathon, by status: every hackathon on the site that
 * is taking or has taken registrations, plus any older slug that still has
 * some. Current ones first (by start date), then past ones (latest first).
 */
export async function hackathonBreakdown(): Promise<
  { ok: true; events: HackathonStats[] } | { ok: false; message: string }
> {
  await requireSection(SECTIONS.hackathons);
  const section = SECTIONS.hackathons;
  const result = await loadAll(
    section.table,
    "hackathon_slug,hackathon_name,review_status,created_at",
    "created_at.desc,id.desc",
  );
  if (!result.ok) {
    console.error(`[internal] hackathon breakdown failed: ${result.message}`);
    return { ok: false, message: "Couldn't load the hackathon registrations." };
  }
  const today = todayKey();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const bySlug = new Map<string, HackathonStats>();
  const blank = (slug: string, name: string): HackathonStats => {
    const listed = HACKATHONS.find((hackathon) => hackathon.slug === slug);
    return {
      slug,
      name: listed?.name ?? name,
      startDate: listed?.startDate ?? null,
      endDate: listed?.endDate ?? null,
      registrationCloses: listed?.registrationCloses ?? null,
      phase: !listed
        ? "unlisted"
        : listed.endDate < today
          ? "past"
          : listed.registrationCloses >= today
            ? "open"
            : "upcoming",
      total: 0,
      byStatus: Object.fromEntries((section.statuses ?? []).map((status) => [status, 0])),
      lastWeek: 0,
      overdue: 0,
    };
  };
  // Hackathons that take registrations on the site (not on Luma or Devpost).
  // Placeholders get a tab only once someone registers for one.
  for (const hackathon of HACKATHONS) {
    if (!hackathon.registerUrl && !hackathon.placeholder) bySlug.set(hackathon.slug, blank(hackathon.slug, hackathon.name));
  }
  for (const row of result.rows) {
    const slug = String(row.hackathon_slug ?? "");
    if (!slug) continue;
    let stats = bySlug.get(slug);
    if (!stats) {
      stats = blank(slug, String(row.hackathon_name ?? slug));
      bySlug.set(slug, stats);
    }
    const status = String(row.review_status ?? "new");
    stats.total += 1;
    stats.byStatus[status] = (stats.byStatus[status] ?? 0) + 1;
    if (Date.parse(String(row.created_at)) >= weekAgo) stats.lastWeek += 1;
    if (isOverdue(row, section)) stats.overdue += 1;
  }
  // Past hackathons nobody registered for (placeholders) aren't worth a tab.
  const events = [...bySlug.values()].filter((event) => event.total > 0 || event.phase === "open" || event.phase === "upcoming");
  const current = events
    .filter((event) => event.phase === "open" || event.phase === "upcoming")
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  const past = events
    .filter((event) => event.phase === "past" || event.phase === "unlisted")
    .sort((a, b) => String(b.startDate ?? "").localeCompare(String(a.startDate ?? "")));
  return { ok: true, events: [...current, ...past] };
}

/** Every site registration for one hackathon, oldest first (all columns). */
export async function hackathonRegistrationsFor(
  slug: string,
): Promise<{ ok: true; rows: Row[]; truncated: boolean } | { ok: false; message: string }> {
  await requireSection(SECTIONS.hackathons);
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { ok: true, rows: [], truncated: false };
  const result = await loadAll(SECTIONS.hackathons.table, "*", "created_at.asc,id.asc", {
    hackathon_slug: `eq.${slug}`,
  });
  if (!result.ok) {
    console.error(`[internal] reading ${slug} registrations failed: ${result.message}`);
    return { ok: false, message: "Couldn't load this hackathon's registrations." };
  }
  return result;
}

/**
 * After the event: everyone registered on the site who wasn't checked in
 * (New or Confirmed) becomes a no-show. Returns how many.
 */
export async function markHackathonNoShows(
  slug: string,
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const staff = await requireSection(SECTIONS.hackathons, "edit");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { ok: false, message: "Unknown hackathon." };
  const query = () => new URLSearchParams({ hackathon_slug: `eq.${slug}`, review_status: "in.(new,confirmed)" });
  let result = await updateRows(SECTIONS.hackathons.table, query(), {
    review_status: "no_show",
    reviewed_by: staff.email,
  });
  if (!result.ok && missingColumn(result.message, "reviewed_by")) {
    result = await updateRows(SECTIONS.hackathons.table, query(), { review_status: "no_show" });
  }
  if (!result.ok) {
    console.error(`[internal] marking ${slug} no-shows failed: ${result.message}`);
    return { ok: false, message: "Couldn't mark the registrations as no-shows. Try again in a minute." };
  }
  return { ok: true, count: result.count ?? 0 };
}

export type PlanRecipient = { id: string; name: string; email: string; program: string };

export type PlanStepStatus = PlanStep & {
  /** 10:00 in India on the suggested day (ISO), for "send later". */
  sendAt: string;
  /** Everyone the step is for right now. */
  total: number;
  /** Of them, people it has gone to. */
  sent: number;
  /** Of them, people it's scheduled for (not canceled). */
  scheduled: number;
  nextScheduled: string | null;
  lastSent: string | null;
  /** Who still needs it: the step's people minus sent and scheduled. */
  remaining: PlanRecipient[];
};

/**
 * One hackathon's email plan with each step's progress, from the email log:
 * someone counts as done for a step once its template went to them (or is
 * scheduled to), whoever sent it and from wherever.
 */
export async function hackathonEmailPlan(
  slug: string,
): Promise<{ ok: true; steps: PlanStepStatus[] } | { ok: false; message: string } | null> {
  await requireSection(SECTIONS.hackathons);
  const hackathon = getHackathon(slug);
  if (!hackathon) return null;
  const [registrations, log] = await Promise.all([
    hackathonRegistrationsFor(slug),
    loadAll("internal_email_log", "*", "created_at.desc,id.desc", {
      source_table: `eq.${SECTIONS.hackathons.table}`,
      template: `in.(${PLAN_TEMPLATES.join(",")})`,
    }),
  ]);
  if (!registrations.ok) return registrations;
  if (!log.ok) {
    console.error(`[internal] reading the email log for ${slug} failed: ${log.message}`);
    return { ok: false, message: "Couldn't load which emails went out." };
  }
  const ids = new Set(registrations.rows.map((row) => String(row.id)));
  const now = Date.now();
  const entries = log.rows.filter((row) => ids.has(String(row.record_id)));
  // Scheduled sends someone canceled don't count.
  const pending = entries.filter((row) => typeof row.scheduled_for === "string" && Date.parse(row.scheduled_for) > now);
  const deliveries = await deliveriesFor(pending.map((row) => String(row.resend_id ?? "")).filter(Boolean));
  const canceled = (row: Row) =>
    typeof row.resend_id === "string" && deliveries.get(row.resend_id)?.status === "canceled";

  const steps = emailPlan(hackathon).map((step): PlanStepStatus => {
    const people = registrations.rows.filter((row) => step.audience.includes(String(row.review_status ?? "new")));
    const forStep = entries.filter((row) => row.template === step.template && !canceled(row));
    const sentTo = new Map<string, string>();
    const scheduledFor = new Map<string, string>();
    for (const row of forStep) {
      const id = String(row.record_id);
      const when = typeof row.scheduled_for === "string" ? row.scheduled_for : null;
      if (when && Date.parse(when) > now) scheduledFor.set(id, when);
      else if (!sentTo.has(id)) sentTo.set(id, String(when ?? row.created_at));
    }
    const peopleIds = people.map((row) => String(row.id));
    const sentTimes = peopleIds.flatMap((id) => (sentTo.has(id) ? [sentTo.get(id)!] : [])).sort();
    const scheduledTimes = peopleIds
      .flatMap((id) => (!sentTo.has(id) && scheduledFor.has(id) ? [scheduledFor.get(id)!] : []))
      .sort();
    return {
      ...step,
      sendAt: planSendTime(step.on),
      total: people.length,
      sent: sentTimes.length,
      scheduled: scheduledTimes.length,
      nextScheduled: scheduledTimes[0] ?? null,
      lastSent: sentTimes.at(-1) ?? null,
      remaining: people
        .filter((row) => !sentTo.has(String(row.id)) && !scheduledFor.has(String(row.id)))
        .map((row) => ({
          id: String(row.id),
          name: String(row.name ?? ""),
          email: String(row.email ?? ""),
          program: String(row.hackathon_name ?? hackathon.name),
        })),
    };
  });
  return { ok: true, steps };
}

export type EmailLogEntry = {
  id: string;
  created_at: string;
  template: string;
  subject: string;
  sent_by: string;
  resend_id?: string | null;
  /** When a scheduled email goes (or went) out. */
  scheduled_for?: string | null;
  /** The latest state from Resend's webhook, if any. */
  delivery?: Delivery | null;
};

export type OtherEntry = {
  section: SectionKey;
  id: string;
  program: string;
  status: string;
  createdAt: string;
};

/**
 * What an entry page shows besides the record: emails sent from the
 * dashboard and the same person's other entries on any form. Each part
 * fails quietly. The résumé isn't here: the page loads it through
 * /internal/jobs/[id]/resume, which checks the session on every fetch.
 */
export async function entryExtras(section: Section, record: Row) {
  const staff = await requireSection(section);
  const id = String(record.id);
  const email = String(record.email ?? "").toLowerCase();
  const [log, others] = await Promise.all([
    selectRows(
      "internal_email_log",
      new URLSearchParams({
        // "*": works before and after the delivery migration adds columns.
        select: "*",
        source_table: `eq.${section.table}`,
        record_id: `eq.${id}`,
        order: "created_at.desc",
        limit: "50",
      }),
    ),
    email
      ? selectRows(
          "submissions",
          new URLSearchParams({
            select: "form,record_id,program,review_status,created_at",
            email: `eq.${email}`,
            order: "created_at.desc",
            limit: "20",
          }),
        )
      : Promise.resolve({ ok: true as const, rows: [] as Row[], total: 0 }),
  ]);
  const sent = log.ok ? (log.rows as unknown as EmailLogEntry[]) : [];
  const [deliveries, blocked] = await Promise.all([
    deliveriesFor(sent.map((entry) => entry.resend_id ?? "").filter(Boolean)),
    email ? blockedAddresses([email]) : Promise.resolve(new Map<string, Delivery>()),
  ]);
  return {
    emails: sent.map((entry) => ({
      ...entry,
      delivery: entry.resend_id ? (deliveries.get(entry.resend_id) ?? null) : null,
    })),
    /** Set when this address bounced or complained: the senders skip it. */
    blocked: blocked.get(email) ?? null,
    others: others.ok
      ? others.rows.flatMap((row): OtherEntry[] => {
          const target = FORM_SECTION[String(row.form)];
          // Only entries on forms this person may open: a community manager
          // doesn't learn that a participant also applied for a job.
          if (!target || String(row.record_id) === id || !sectionAccess(staff, SECTIONS[target])) return [];
          return [
            {
              section: target,
              id: String(row.record_id),
              program: String(row.program ?? ""),
              status: String(row.review_status ?? ""),
              createdAt: String(row.created_at ?? ""),
            },
          ];
        })
      : [],
  };
}
