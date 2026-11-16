import { toCsv } from "@/lib/internal/csv";
import { scopeWork } from "@/lib/internal/clients/scope";
import { requireClients } from "@/lib/internal/session";
import { loadClientWork } from "@/lib/internal/clients/data";
import { isUuid } from "@/lib/internal/clients/clean";
import {
  REPORT_CSV_COLUMNS,
  buildClientReport,
  reportCsvRows,
} from "@/lib/internal/clients/report-text";
import { isMonthKey, isOwnedBy } from "@/lib/internal/clients/schema";

/**
 * One engagement's monthly report as CSV: a row per deliverable with its
 * status, owner, date, live link and, when it slipped, why. Same rows as
 * the client-ready report: no invoice state, notes, sizes or draft links.
 * Client managers (and admins) and the engagement's account owner only:
 * they're the ones who send the report to the client.
 * `?engagement=<id>&month=YYYY-MM`.
 */
export async function GET(request: Request) {
  const staff = await requireClients();
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  const engagementId = (url.searchParams.get("engagement") ?? "").toLowerCase();
  if (!isMonthKey(month) || !isUuid(engagementId))
    return new Response("Not found", { status: 404 });

  const work = scopeWork(staff.clientScope, await loadClientWork(month));
  if (!work.ok)
    return new Response(work.message, { status: work.missing ? 503 : 502 });
  const engagement = work.engagements.find((item) => item.id === engagementId);
  const cycle = engagement
    ? work.cycles.find((item) => item.engagement_id === engagement.id)
    : undefined;
  if (!engagement || !cycle) return new Response("Not found", { status: 404 });
  if (staff.clients !== "manager" && !isOwnedBy(engagement.owner, staff.email))
    return new Response(
      "Only client managers and the account owner can download this report.",
      { status: 403 },
    );

  const client =
    work.clients.find((item) => item.id === engagement.client_id) ?? null;
  const report = buildClientReport({
    client,
    engagement,
    cycle,
    lines: work.lines.filter((item) => item.cycle_id === cycle.id),
    deliverables: work.deliverables.filter(
      (item) => item.cycle_id === cycle.id,
    ),
    names: work.names,
  });
  const rows = reportCsvRows(report);
  console.info(
    `[clients] ${staff.email} downloaded the ${month} report for engagement ${engagement.id}`,
  );

  // Slugs are lowercase letters, numbers and dashes, so safe in a file name.
  const name = `${client?.slug ?? "client"}-${month}-report${work.truncated ? "-incomplete" : ""}.csv`;
  return new Response(toCsv(REPORT_CSV_COLUMNS, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
