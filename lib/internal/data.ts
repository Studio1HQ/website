import { selectRows, signedFileUrl, updateRows } from "@/lib/supabase-server";
import { blockedAddresses, deliveriesFor, type Delivery } from "@/lib/email-delivery";
import { requireStaff } from "@/lib/internal/session";
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

async function loadAll(table: string, select: string, order: string) {
  const rows: Row[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += BATCH) {
    const result = await selectRows(
      table,
      new URLSearchParams({ select, order, limit: String(BATCH), offset: String(offset) }),
    );
    if (!result.ok) return result;
    rows.push(...result.rows);
    if (result.rows.length < BATCH) break;
  }
  return { ok: true as const, rows };
}

type Loaded =
  | { ok: true; rows: Row[]; tagsReady: boolean }
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
  const order = `${section.dateColumn}.desc`;
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
  };
}

/** Rows for the CSV export: the list's filters, or exactly `ids`. */
export async function exportRows(
  section: Section,
  filters: Filters,
  ids: string[],
): Promise<{ ok: true; rows: Row[] } | { ok: false; message: string }> {
  await requireStaff("admin");
  const loaded = await loadSection(section, true);
  if (!loaded.ok) return loaded;
  if (ids.length) {
    const wanted = new Set(ids);
    return {
      ok: true,
      rows: loaded.rows.filter((row) => wanted.has(String(row.id ?? row.record_id))),
    };
  }
  return {
    ok: true,
    rows: sortRows(filterRows(loaded.rows, section, filters), section, filters.sort),
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

/**
 * Applies one change to up to 200 entries: a status, notes, or tags added or
 * removed. Stamps reviewed_by (skipped while that column doesn't exist yet).
 */
export async function updateEntries(
  section: Section,
  ids: string[],
  change: EntryChange,
): Promise<{ ok: true; tags?: Record<string, string[]> } | { ok: false; message: string }> {
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

  const write = async (filter: string, values: Row) => {
    const query = () => new URLSearchParams({ id: filter });
    let result = await updateRows(section.table, query(), { ...values, reviewed_by: staff.email });
    if (!result.ok && missingColumn(result.message, "reviewed_by")) {
      result = await updateRows(section.table, query(), values);
    }
    return result;
  };

  const patch: Row = {};
  if (change.status !== undefined) patch.review_status = change.status;
  if (change.notes !== undefined) patch.review_notes = change.notes;
  if (Object.keys(patch).length) {
    const result = await write(`in.(${unique.join(",")})`, patch);
    if (!result.ok) {
      console.error(`[internal] updating ${section.table} failed: ${result.message}`);
      return { ok: false, message: "Couldn't save. Try again in a minute." };
    }
  }

  const add = (change.addTags ?? []).map(cleanTag).filter((tag): tag is string => !!tag);
  const remove = (change.removeTags ?? []).map((tag) => tag.toLowerCase());
  if (!add.length && !remove.length) return { ok: true };

  const current = await selectRows(
    section.table,
    new URLSearchParams({ select: "id,tags", id: `in.(${unique.join(",")})` }),
  );
  if (!current.ok) {
    console.error(`[internal] reading tags on ${section.table} failed: ${current.message}`);
    return {
      ok: false,
      message: missingColumn(current.message, "tags")
        ? "Tags need the dashboard migration in Supabase first."
        : "Couldn't save the tags. Try again in a minute.",
    };
  }
  const updated: Record<string, string[]> = {};
  const results = await Promise.all(
    current.rows.map(async (row) => {
      const before = rowTags(row);
      const next = before.filter((tag) => !remove.includes(tag.toLowerCase()));
      for (const tag of add) {
        if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag);
      }
      const kept = next.slice(0, 20);
      updated[String(row.id)] = kept;
      if (kept.join("\u0000") === before.join("\u0000")) return { ok: true as const };
      return write(`eq.${row.id}`, { tags: kept });
    }),
  );
  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    console.error(`[internal] tagging ${section.table} failed: ${failed.message}`);
    return { ok: false, message: "Couldn't save the tags. Try again in a minute." };
  }
  return { ok: true, tags: updated };
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
  await requireStaff();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [pipelines, subscribers, partners, latest] = await Promise.all([
    Promise.all(
      PIPELINES.map(async (key): Promise<PipelineStats> => {
        const section = SECTIONS[key];
        const result = await loadAll(section.table, "review_status,created_at", "created_at.desc");
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
    count(SECTIONS.subscribers.table),
    count(SECTIONS["partner-pool"].table),
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

export { programOf } from "@/lib/internal/program";

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
 * dashboard, the same person's other entries on any form, and (jobs) a
 * ten-minute résumé link for the inline viewer. Each part fails quietly.
 */
export async function entryExtras(section: Section, record: Row) {
  await requireStaff(section.minRole);
  const id = String(record.id);
  const email = String(record.email ?? "").toLowerCase();
  const [log, others, resume] = await Promise.all([
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
    section.key === "jobs" && typeof record.resume_path === "string" && record.resume_path
      ? signedFileUrl("job-applications", record.resume_path, 600)
      : Promise.resolve(null),
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
    resumeUrl: resume && resume.ok ? resume.url : null,
  };
}
