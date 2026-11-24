import { asConnected, json } from "@/lib/internal/extension/http";
import { summaryFor } from "@/lib/internal/extension/ops";
import { dashboardUrl } from "@/lib/internal/host";

export const dynamic = "force-dynamic";

/** The extension popup's view: who, today's clock, open tasks, notifications. */
export async function GET(request: Request) {
  // A local copy of the dashboard links to itself; the live one to dashboard.studio1hq.com.
  const host = new URL(request.url).host;
  const dashboard = /localhost/.test(host) ? `http://dashboard.localhost${host.includes(":") ? `:${host.split(":")[1]}` : ""}` : dashboardUrl;
  return asConnected(request, async (staff) => json(await summaryFor(staff, dashboard)));
}
