/**
 * Projects: a company's work for one month, like "DevRel · November 2026".
 * Under the hood it's an engagement's month (a cycle); the pages call it a
 * project so the client area reads company → projects → the month's pieces.
 * Pure, for the pages and the tests.
 */

import {
  clientPath,
  isMonthKey,
  labelOf,
  monthLabel,
  type Engagement,
  type Option,
} from "@/lib/internal/clients/schema";

/**
 * What the project is called, without the company: "Nebius Token Factory
 * DevRel" → "DevRel", "Trina-Launch" → "Launch". One named just like its
 * company goes by its type ("DevRel retainer").
 */
export function projectName(
  engagement: Pick<Engagement, "name" | "type">,
  company: string,
  types: readonly Option[] = [],
) {
  const name = engagement.name.trim();
  const client = company.trim();
  const rest =
    client && name.toLowerCase().startsWith(client.toLowerCase())
      ? name
          .slice(client.length)
          .replace(/^[\s\-–—:·|/]+/, "")
          .trim()
      : name;
  return rest || labelOf(types, engagement.type) || name;
}

/** "DevRel · November 2026" (or "Nov 2026" with `short`). */
export function projectTitle(
  engagement: Pick<Engagement, "name" | "type">,
  company: string,
  month: string,
  options: { types?: readonly Option[]; short?: boolean } = {},
) {
  return `${projectName(engagement, company, options.types)} · ${monthLabel(month, options.short)}`;
}

/**
 * A project's page: /clients/<company>/<YYYY-MM>, with the engagement
 * (`?e=`) when the company has more than one, and the report view on ask.
 */
export function projectPath(
  slug: string,
  month: string,
  options: { engagement?: string | null; view?: "report" } = {},
) {
  const query = new URLSearchParams();
  if (options.engagement) query.set("e", options.engagement);
  if (options.view) query.set("view", options.view);
  const base = `${clientPath(slug)}/${isMonthKey(month) ? month : ""}`;
  return query.size ? `${base}?${query}` : base;
}
