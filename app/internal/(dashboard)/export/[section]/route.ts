import { toCsv } from "@/lib/internal/csv";
import { ROW_LIMIT, exportRows } from "@/lib/internal/data";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { UUID_PATTERN, parseFilters, sectionFor } from "@/lib/internal/sections";

/**
 * CSV of a section: the list's current filters, or exactly the selected
 * rows (`ids`). Up to ROW_LIMIT rows; past that the file name ends in
 * "-first-N-rows" and the list page shows a warning.
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

  // A hackathon's or a role's own questions become one column each, named
  // after the question, instead of a JSON blob.
  if (section.key === "hackathons" || section.key === "jobs") {
    for (const row of result.rows) {
      const answers = Array.isArray(row.answers) ? row.answers : [];
      delete row.answers;
      for (const item of answers) {
        if (item && typeof item.question === "string") row[`Q: ${item.question}`] = String(item.answer ?? "");
      }
    }
  }

  const columns = result.rows.length
    ? [...new Set(result.rows.flatMap((row) => Object.keys(row)))]
    : section.listSelect;
  // YYYY-MM-DD in IST, like the dates on the dashboard.
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  // A table past the row limit exports only its newest rows: the file name
  // and a header say so, so nobody takes a cut-off file for the whole list.
  const name = `${section.key}-${date}${result.truncated ? `-first-${ROW_LIMIT}-rows` : ""}.csv`;
  return new Response(toCsv(columns, result.rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
      ...(result.truncated ? { "x-export-truncated": String(ROW_LIMIT) } : {}),
    },
  });
}
