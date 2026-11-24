import "server-only";
import {
  incomplete,
  loadClients,
  loadCycles,
  loadDeliverables,
  loadEngagements,
  loadPeople,
  loadScopeLines,
  loadTypeOptions,
} from "@/lib/internal/clients/data";
import { scopeEngagements, scopeRows, type ClientScope } from "@/lib/internal/clients/scope";
import { namesFrom } from "@/lib/internal/clients/schema";

/**
 * Every project there is, for the Projects and Stats pages: all companies
 * (archived ones too, so past months still count), their engagements, every
 * month and its pieces. Cut down to the clients this person may open.
 */
export async function loadPortfolio(scope: ClientScope) {
  const [clients, engagements, cycles, people, types] = await Promise.all([
    loadClients({ archived: true }),
    loadEngagements(),
    loadCycles(),
    loadPeople(),
    loadTypeOptions(),
  ]);
  if (!clients.ok || !engagements.ok || !cycles.ok) {
    const failed = [clients, engagements, cycles].find((result) => !result.ok);
    return {
      ok: false as const,
      missing: Boolean(failed && !failed.ok && failed.missing),
      message: failed && !failed.ok ? failed.message : "Couldn't load client work.",
    };
  }
  const companies = scopeRows(scope, clients.rows);
  const ownEngagements = scopeEngagements(scope, engagements.rows);
  const engagementIds = new Set(ownEngagements.map((engagement) => engagement.id));
  const ownCycles = cycles.rows.filter((cycle) => engagementIds.has(cycle.engagement_id));
  const cycleIds = ownCycles.map((cycle) => cycle.id);
  const [lines, deliverables] = await Promise.all([loadScopeLines(cycleIds), loadDeliverables({ cycleIds })]);
  return {
    ok: true as const,
    clients: companies,
    engagements: ownEngagements,
    cycles: ownCycles,
    lines: lines.ok ? lines.rows : [],
    deliverables: deliverables.ok ? deliverables.rows : [],
    types,
    names: people.ok ? namesFrom(people.rows) : {},
    truncated: incomplete(clients, engagements, cycles, people, lines, deliverables),
  };
}
