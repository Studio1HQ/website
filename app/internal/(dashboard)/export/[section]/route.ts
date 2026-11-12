import { exportRows } from "@/lib/internal/data";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { UUID_PATTERN, parseFilters, sectionFor } from "@/lib/internal/sections";

/**
 * CSV of a section: the list's current filters, or exactly the selected
 * rows (`ids`). Up to 10,000 rows.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const section = sectionFor((await params).section);
  if (!section) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const query: Record<string, string[]> = {};
  for (const [key, value] of url.searchParams) (query[key] ??= []).push(value);
  const filters = parseFilters(section, query);
  const ids = (query.ids ?? []).filter((id) => UUID_PATTERN.test(id)).slice(0, 500);
  // exportRows checks the session before reading anything.
  const result = await exportRows(section, filters, ids);
  if (!result.ok) return new Response(result.message, { status: 502 });

  // Subscribers get a personal unsubscribe link, for the newsletter tool's
  // merge field (every marketing email needs one).
  if (section.key === "subscribers") {
    for (const row of result.rows) {
      row.unsubscribe_url = typeof row.email === "string" ? await unsubscribeUrl(row.email) : null;
    }
  }

  const columns = result.rows.length
    ? [...new Set(result.rows.flatMap((row) => Object.keys(row)))]
    : section.listSelect;
  const lines = [
    columns.map(csvCell).join(","),
    ...result.rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  // YYYY-MM-DD in IST, like the dates on the dashboard.
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${section.key}-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let cell = Array.isArray(value) ? value.join("; ") : String(value);
  // Form answers are untrusted: stop spreadsheets running them as formulas.
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}
