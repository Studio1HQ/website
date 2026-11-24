import { redirect } from "next/navigation";
import { scopeWork } from "@/lib/internal/clients/scope";
import { requireClients } from "@/lib/internal/session";
import { loadClientWork } from "@/lib/internal/clients/data";
import { isUuid } from "@/lib/internal/clients/clean";
import { projectPath } from "@/lib/internal/clients/projects";
import { isMonthKey, thisMonth } from "@/lib/internal/clients/schema";

/**
 * Monthly reports live on each project now (its Report tab). Old links
 * (?month=&engagement=) open that project's report; without an
 * engagement they go to the company list. The CSV stays at ./export.
 */
export default async function ClientsReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, query] = await Promise.all([requireClients(), searchParams]);
  const month = typeof query.month === "string" && isMonthKey(query.month) ? query.month : thisMonth();
  const engagementId = typeof query.engagement === "string" && isUuid(query.engagement) ? query.engagement.toLowerCase() : null;
  if (!engagementId) redirect("/clients");
  // Client team members an admin gave specific clients reach only theirs.
  const work = scopeWork(staff.clientScope, await loadClientWork(month));
  const engagement = work.ok ? work.engagements.find((item) => item.id === engagementId) : undefined;
  const client = engagement && work.ok ? work.clients.find((item) => item.id === engagement.client_id) : undefined;
  if (!client || !engagement) redirect("/clients");
  const several = work.ok && work.engagements.filter((item) => item.client_id === client.id).length > 1;
  redirect(projectPath(client.slug, month, { engagement: several ? engagement.id : null, view: "report" }));
}
