import {
  OVERDUE_DAYS,
  SINCE,
  statusLabel,
  type Facet,
  type Filters,
  type Section,
} from "@/lib/internal/sections";

/**
 * Filtering, counting and sorting for the dashboard lists. The tables are
 * small (hundreds of rows), so the server loads a section once and filters
 * in memory: every facet count then reflects the other active filters, and
 * the list, the detail page's previous/next and the CSV export all agree.
 */

export type Row = Record<string, unknown>;

export type Option = { value: string; label: string; count: number };

export function rowTags(row: Row): string[] {
  return Array.isArray(row.tags) ? row.tags.map(String) : [];
}

function facetValues(row: Row, facet: Facet): string[] {
  const value = row[facet.column];
  if (facet.type === "boolean") return [value ? "yes" : "no"];
  if (facet.type === "array") return Array.isArray(value) ? value.map(String) : [];
  return value === null || value === undefined || value === "" ? [] : [String(value)];
}

/** Still New, and received more than OVERDUE_DAYS ago. */
export function isOverdue(row: Row, section: Section, now = Date.now()) {
  if (!section.statuses || row.review_status !== "new") return false;
  const received = Date.parse(String(row[section.dateColumn] ?? ""));
  return received > 0 && now - received > OVERDUE_DAYS * 24 * 60 * 60 * 1000;
}

/** Days since an entry came in. */
export function daysWaiting(row: Row, section: Section, now = Date.now()) {
  const received = Date.parse(String(row[section.dateColumn] ?? ""));
  return received > 0 ? Math.floor((now - received) / (24 * 60 * 60 * 1000)) : 0;
}

/**
 * For each row, the same person's other entries in this section (by email),
 * labelled by role, event or cohort.
 */
export function repeats(rows: Row[], section: Section): Map<string, string[]> {
  const byEmail = new Map<string, Row[]>();
  for (const row of rows) {
    const email = String(row.email ?? "").toLowerCase();
    if (!email) continue;
    byEmail.set(email, [...(byEmail.get(email) ?? []), row]);
  }
  const others = new Map<string, string[]>();
  for (const group of byEmail.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      others.set(
        String(row.id),
        group
          .filter((other) => other !== row)
          .map((other) => String(other[section.repeatLabel ?? "id"] ?? "another entry")),
      );
    }
  }
  return others;
}

/** Rows matching the filters; `skip` leaves one filter out (for its counts). */
export function filterRows(
  rows: Row[],
  section: Section,
  filters: Filters,
  skip?: string,
): Row[] {
  const terms = filters.q?.toLowerCase().split(" ").filter(Boolean) ?? [];
  const tags = filters.tags.map((tag) => tag.toLowerCase());
  const since = filters.since
    ? Date.now() - SINCE[filters.since].days * 24 * 60 * 60 * 1000
    : null;
  const facets = section.facets.filter(
    (facet) => facet.key !== skip && filters.facets[facet.key]?.length,
  );

  return rows.filter((row) => {
    if (skip !== "status" && filters.status && row.review_status !== filters.status) {
      return false;
    }
    if (skip !== "tags" && tags.length) {
      const own = rowTags(row).map((tag) => tag.toLowerCase());
      if (!tags.some((tag) => own.includes(tag))) return false;
    }
    for (const facet of facets) {
      const chosen = filters.facets[facet.key];
      if (!facetValues(row, facet).some((value) => chosen.includes(value))) return false;
    }
    if (skip !== "overdue" && filters.overdue && !isOverdue(row, section)) return false;
    if (skip !== "since" && since !== null) {
      const date = Date.parse(String(row[section.dateColumn] ?? ""));
      if (!(date >= since)) return false;
    }
    if (terms.length) {
      const haystack = [
        ...section.search.map((column) => row[column]),
        ...rowTags(row),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

export function sortRows(rows: Row[], section: Section, sort: Filters["sort"]) {
  const time = (row: Row, column: string) => Date.parse(String(row[column] ?? "")) || 0;
  const sorted = [...rows];
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => time(a, section.dateColumn) - time(b, section.dateColumn));
    case "updated":
      return sorted.sort(
        (a, b) =>
          time(b, "updated_at") - time(a, "updated_at") ||
          time(b, section.dateColumn) - time(a, section.dateColumn),
      );
    case "name":
      return sorted.sort((a, b) =>
        String(a.name ?? a.email ?? "").localeCompare(String(b.name ?? b.email ?? ""), "en", {
          sensitivity: "base",
        }),
      );
    default:
      return sorted.sort((a, b) => time(b, section.dateColumn) - time(a, section.dateColumn));
  }
}

function tally(values: Iterable<string>) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export type FacetOptions = { key: string; label: string; options: Option[] }[];

/** Values for every facet, counted against the other active filters. */
export function facetOptions(rows: Row[], section: Section, filters: Filters): FacetOptions {
  return section.facets.map((facet) => {
    const scoped = filterRows(rows, section, filters, facet.key);
    const counts = tally(scoped.flatMap((row) => facetValues(row, facet)));
    for (const chosen of filters.facets[facet.key] ?? []) {
      if (!counts.has(chosen)) counts.set(chosen, 0);
    }
    const labelFor = new Map<string, string>();
    if (facet.labelColumn) {
      for (const row of rows) {
        const value = row[facet.column];
        if (value !== null && value !== undefined && !labelFor.has(String(value))) {
          labelFor.set(String(value), String(row[facet.labelColumn] ?? value));
        }
      }
    }
    const options = [...counts].map(([value, count]) => ({
      value,
      count,
      label:
        // hasOwn: a value typed into the URL ("constructor") is not a label.
        (facet.labels && Object.hasOwn(facet.labels, value) ? facet.labels[value] : undefined) ??
        labelFor.get(value) ??
        (facet.column === "review_status" ? statusLabel(value) : value),
    }));
    options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return { key: facet.key, label: facet.label, options };
  });
}

/** Rows per status, counted against every other active filter. */
export function statusCounts(rows: Row[], section: Section, filters: Filters) {
  const scoped = filterRows(rows, section, filters, "status");
  return { all: scoped.length, ...Object.fromEntries(tally(scoped.map((row) => String(row.review_status ?? "")))) } as Record<string, number>;
}

/** Tags in use (with counts) plus the section's presets, for pickers and filters. */
export function tagOptions(rows: Row[], section: Section, filters: Filters): Option[] {
  if (!section.tags) return [];
  const scoped = filterRows(rows, section, filters, "tags");
  const byKey = new Map<string, Option>();
  for (const tag of scoped.flatMap(rowTags)) {
    const key = tag.toLowerCase();
    const existing = byKey.get(key);
    if (existing) existing.count += 1;
    else byKey.set(key, { value: tag, label: tag, count: 1 });
  }
  for (const tag of [...section.tagPresets, ...filters.tags]) {
    if (!byKey.has(tag.toLowerCase())) {
      byKey.set(tag.toLowerCase(), { value: tag, label: tag, count: 0 });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}
