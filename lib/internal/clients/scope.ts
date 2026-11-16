import type { ClientWork } from "@/lib/internal/clients/data";
import type { Engagement } from "@/lib/internal/clients/schema";

/**
 * Which clients someone may open. Null is every client: managers, admins
 * and the founders always, and Client team members until an admin picks
 * theirs on People (internal_members.client_ids). A list is only those
 * clients, by id: their workspaces, their work in the overview, board, load
 * and reports, and their engagements as task tags. Everything else in
 * Clients answers as if those clients weren't there.
 */
export type ClientScope = readonly string[] | null;

/** Whether someone with this scope may open this client. */
export function inScope(scope: ClientScope, clientId: string | null | undefined): boolean {
  return scope === null || (typeof clientId === "string" && scope.includes(clientId));
}

/** Just the clients (or rows with a client_id) in scope. */
export function scopeRows<T extends { id: string }>(scope: ClientScope, clients: readonly T[]): T[] {
  return scope === null ? [...clients] : clients.filter((client) => scope.includes(client.id));
}

/** Just the engagements of clients in scope. */
export function scopeEngagements<T extends Pick<Engagement, "client_id">>(scope: ClientScope, engagements: readonly T[]): T[] {
  return scope === null ? [...engagements] : engagements.filter((engagement) => scope.includes(engagement.client_id));
}

/** A month's client work cut down to the clients in scope. */
export function scopeWork(scope: ClientScope, work: ClientWork): ClientWork {
  if (scope === null || !work.ok) return work;
  const engagements = scopeEngagements(scope, work.engagements);
  const engagementIds = new Set(engagements.map((engagement) => engagement.id));
  const cycles = work.cycles.filter((cycle) => engagementIds.has(cycle.engagement_id));
  const cycleIds = new Set(cycles.map((cycle) => cycle.id));
  return {
    ...work,
    clients: scopeRows(scope, work.clients),
    engagements,
    cycles,
    lines: work.lines.filter((line) => cycleIds.has(line.cycle_id)),
    deliverables: work.deliverables.filter((item) => engagementIds.has(item.engagement_id)),
    rows: work.rows.filter((row) => engagementIds.has(row.engagement.id)),
  };
}
