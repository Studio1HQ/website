import { selectRows, signedFileUrl, updateRows } from "@/lib/supabase-server";
import { blockedAddresses, deliveriesFor, type Delivery } from "@/lib/email-delivery";
import { isAdmin, requireStaff } from "@/lib/internal/session";
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
async function loadAll(table: string, select: string, order: string): Promise<AllRows> {
  const rows: Row[] = [];
  let total: number | null = null;
  while (rows.length < MAX_ROWS) {
    const result = await selectRows(
      table,
      new URLSearchParams({
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
  await requireStaff(section.minRole);
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
  await requireStaff("admin");
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
  await requireStaff(section.minRole);
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
  const staff = await requireStaff("reviewer");
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
  await requireStaff();
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

/** "New" entries per pipeline, for the sidebar. */
export async function awaitingCounts(): Promise<Partial<Record<SectionKey, number>>> {
  await requireStaff();
  const counts = await Promise.all(
    PIPELINES.map(
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

export async function overview() {
  const staff = await requireStaff();
  // The audiences are admin-only, so nobody else's page even counts them.
  const admin = isAdmin(staff);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [pipelines, subscribers, partners, latest] = await Promise.all([
    Promise.all(
      PIPELINES.map(async (key): Promise<PipelineStats> => {
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
        order: "created_at.desc",
        limit: "8",
      }),
    ),
  ]);
  const entries: LatestEntry[] = latest.ok
    ? latest.rows.flatMap((row) => {
        const section = FORM_SECTION[String(row.form)];
        return section
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
  await requireStaff(section.minRole);
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
          if (!target || String(row.record_id) === id) return [];
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
