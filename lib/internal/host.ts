/**
 * The staff dashboard has a host of its own, dashboard.studio1hq.com, and its
 * pages sit at the root there: /tasks is app/internal/(dashboard)/tasks.
 * proxy.ts maps each address to its app/internal route and sends old
 * studio1hq.com/internal links over. Being its own site keeps the public
 * site's scripts (analytics, embeds in posts) away from the dashboard's pages
 * and its session cookie, and keeps it out of search.
 *
 * Pure, with no server-only imports: proxy.ts runs this too.
 */

export const DASHBOARD_HOST = "dashboard.studio1hq.com";
export const dashboardUrl = `https://${DASHBOARD_HOST}`;

/**
 * For `next dev` (and `next start` on a laptop): browsers send any
 * *.localhost name to this machine, so http://dashboard.localhost:3000 is the
 * dashboard and http://localhost:3000 the public site.
 */
export const LOCAL_DASHBOARD_HOST = "dashboard.localhost";

/** The dashboard's hosts as a pattern, for `has` conditions in next.config.ts and proxy.ts. */
export const DASHBOARD_HOST_PATTERN =
  "dashboard\\.(?:studio1hq\\.com|localhost)";

/** Whether a Host header (port and all) is the dashboard's. */
export function isDashboardHost(host: string | null | undefined): boolean {
  const name = (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  return name === DASHBOARD_HOST || name === LOCAL_DASHBOARD_HOST;
}

/** The app/internal route a dashboard address is served by: "/tasks" → "/internal/tasks". */
export function toInternalPath(path: string): string {
  if (isInternalPath(path)) return path;
  if (path === "/" || path === "") return "/internal";
  if (path.startsWith("/?") || path.startsWith("/#"))
    return `/internal${path.slice(1)}`;
  return `/internal${path}`;
}

/**
 * The address on the dashboard host for an app/internal path: "/internal/tasks"
 * → "/tasks". Old links and stored notification links still carry the prefix.
 */
export function fromInternalPath(path: string): string {
  if (!isInternalPath(path)) return path;
  const rest = path.slice("/internal".length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

function isInternalPath(path: string) {
  return path === "/internal" || /^\/internal[/?#]/.test(path);
}

/** A path on this site (not "//other.site" or "/\\other.site"), safe to link or redirect to. */
export function isLocalPath(path: string): boolean {
  return /^\/(?![/\\])/.test(path) && !path.includes("\\");
}
