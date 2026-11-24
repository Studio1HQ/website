import "server-only";
import {
  TABLES,
  deleteRecord,
  insertMany,
  insertRecord,
  loadClients,
  loadCycles,
  loadEngagements,
  loadScopeLines,
  loadTemplates,
} from "@/lib/internal/clients/data";
import {
  firstDay,
  lastDay,
  monthOf,
  shiftMonth,
  templateFor,
  todayKey,
  type ClientAccount,
  type ClientStatus,
  type Cycle,
  type Engagement,
  type ScopeLine,
  type ScopeTemplate,
  type TemplateLine,
} from "@/lib/internal/clients/schema";

/**
 * Next month's cycles. On or after the 25th (IST) each active engagement
 * gets next month's cycle in Planning. Its scope lines are last month's
 * (the numbers agreed with this client), or its type's template when there
 * was no last month; the account owner then adjusts them and moves it to
 * Active. The daily cron (app/api/cron/client-cycles) and the "Start next
 * month" button both call ensureNextCycles. Running it again changes
 * nothing: an engagement that has the month already is skipped. A client
 * that is paused, ended or archived gets no new months (takesNewMonths).
 */

/** The day of the month from which next month's cycles are made. */
export const NEXT_MONTH_FROM_DAY = 25;

/** The month the cron should prepare today: next month from the 25th, else null. */
export function monthToPrepare(today = todayKey()) {
  return Number(today.slice(8, 10)) >= NEXT_MONTH_FROM_DAY
    ? shiftMonth(monthOf(today), 1)
    : null;
}

/** Client statuses that mean the work has stopped. */
export const STOPPED_CLIENT_STATUSES: readonly ClientStatus[] = [
  "paused",
  "ended",
];

/**
 * True when months may start by themselves for this client: it isn't
 * archived, and it isn't paused or ended (even if nobody ended its
 * engagements). A manager can still start a month by hand.
 */
export function takesNewMonths(
  client: Pick<ClientAccount, "status" | "archived_at">,
) {
  return (
    !client.archived_at && !STOPPED_CLIENT_STATUSES.includes(client.status)
  );
}

/**
 * Active engagements without a cycle for the month, leaving out ones that
 * end before the month starts or start after it ends.
 */
export function engagementsNeedingCycle<
  T extends Pick<Engagement, "id" | "status" | "starts_on" | "ends_on">,
>(
  engagements: readonly T[],
  cycles: readonly Pick<Cycle, "engagement_id" | "month">[],
  month: string,
): T[] {
  const has = new Set(
    cycles
      .filter((cycle) => cycle.month === month)
      .map((cycle) => cycle.engagement_id),
  );
  return engagements.filter(
    (engagement) =>
      engagement.status === "active" &&
      !has.has(engagement.id) &&
      !(engagement.ends_on && engagement.ends_on < firstDay(month)) &&
      !(engagement.starts_on && engagement.starts_on > lastDay(month)),
  );
}

/** Scope-line rows for a new cycle, from template lines, in order. */
export function linesFromTemplate(
  lines: readonly TemplateLine[],
  cycleId: string,
) {
  return lines.map((line, position) => ({
    cycle_id: cycleId,
    kind: line.kind,
    label: line.label,
    planned: Math.max(0, Math.min(999, Math.round(line.quantity))),
    owner_role: line.owner_role,
    due_rule: line.due_rule,
    position,
  }));
}

/**
 * Scope-line rows for a new cycle, carried over from the month before: the
 * same kinds, labels and numbers, in the same order. Notes stay behind
 * (they were about that month).
 */
export function linesFromLastMonth(
  lines: readonly Pick<
    ScopeLine,
    "kind" | "label" | "planned" | "owner_role" | "due_rule" | "position"
  >[],
  cycleId: string,
) {
  return [...lines]
    .sort((a, b) => a.position - b.position)
    .map((line, position) => ({
      cycle_id: cycleId,
      kind: line.kind,
      label: line.label,
      planned: Math.max(0, Math.min(999, Math.round(line.planned))),
      owner_role: line.owner_role,
      due_rule: line.due_rule,
      position,
    }));
}

/**
 * Each engagement's scope lines from the month before `month`, by
 * engagement id (only those that had lines). Null when it can't be read:
 * callers then stop, or fall back to the template and say so.
 */
export async function lastMonthLines(
  engagementIds: readonly string[],
  month: string,
): Promise<Map<string, ScopeLine[]> | null> {
  const found = new Map<string, ScopeLine[]>();
  if (!engagementIds.length) return found;
  const cycles = await loadCycles({
    engagementIds,
    month: shiftMonth(month, -1),
  });
  if (!cycles.ok) return null;
  if (!cycles.rows.length) return found;
  const lines = await loadScopeLines(cycles.rows.map((cycle) => cycle.id));
  if (!lines.ok) return null;
  const engagementOf = new Map(
    cycles.rows.map((cycle) => [cycle.id, cycle.engagement_id]),
  );
  for (const line of lines.rows) {
    const engagement = engagementOf.get(line.cycle_id);
    if (!engagement) continue;
    found.set(engagement, [...(found.get(engagement) ?? []), line]);
  }
  return found;
}

export type EnsureResult =
  | {
      ok: true;
      month: string;
      created: number;
      failed: number;
      engagements: string[];
    }
  | { ok: false; message: string };

/**
 * Creates the month's cycle (Planning) for every active engagement that
 * lacks one, or only for `engagementIds` when given, with last month's
 * scope lines (the template when there are none). Engagements of a client
 * that is paused, ended or archived are left out.
 * A cycle whose lines can't be added is taken back out, so the next run
 * tries again from scratch.
 */
export async function ensureNextCycles(options: {
  month: string;
  by: string;
  engagementIds?: readonly string[];
}): Promise<EnsureResult> {
  const [engagements, templates, clients] = await Promise.all([
    loadEngagements({ statuses: ["active"] }),
    loadTemplates(),
    loadClients(),
  ]);
  if (!engagements.ok) return { ok: false, message: engagements.message };
  if (!clients.ok) return { ok: false, message: clients.message };
  // An archived, paused or ended client gets no new months, even if nobody
  // ended its engagements when it stopped.
  const live = new Set(
    clients.rows.filter(takesNewMonths).map((client) => client.id),
  );
  // A failed read must not quietly start every month on the built-in plan
  // (the month then exists, so no later run would put it right).
  if (!templates.ok && !templates.missing)
    return { ok: false, message: templates.message };
  const saved: ScopeTemplate[] = templates.ok ? templates.rows : [];
  const wanted = options.engagementIds ? new Set(options.engagementIds) : null;
  const pool = engagements.rows.filter(
    (engagement) =>
      live.has(engagement.client_id) && (!wanted || wanted.has(engagement.id)),
  );
  const cycles = await loadCycles({
    engagementIds: pool.map((engagement) => engagement.id),
    month: options.month,
  });
  if (!cycles.ok) return { ok: false, message: cycles.message };
  const needing = engagementsNeedingCycle(pool, cycles.rows, options.month);
  // As with templates: a failed read must not quietly swap a client's agreed
  // numbers for the template's.
  const carried = await lastMonthLines(
    needing.map((engagement) => engagement.id),
    options.month,
  );
  if (!carried)
    return { ok: false, message: "Couldn't read last month's scope lines." };

  let created = 0;
  let failed = 0;
  const done: string[] = [];
  for (const engagement of needing) {
    const cycle = await insertRecord(
      TABLES.cycles,
      "month",
      {
        engagement_id: engagement.id,
        month: options.month,
        // This month or a past one is already under way.
        state: options.month <= monthOf(todayKey()) ? "active" : "planning",
      },
      options.by,
    );
    if (!cycle.ok || !cycle.id) {
      // Already there (made by another run meanwhile) counts as done.
      if (!cycle.ok && cycle.message.includes("already has this month"))
        continue;
      failed++;
      continue;
    }
    const before = carried.get(engagement.id);
    const lines = before?.length
      ? linesFromLastMonth(before, cycle.id)
      : linesFromTemplate(templateFor(engagement.type, saved).lines, cycle.id);
    if (lines.length) {
      const added = await insertMany(
        TABLES.lines,
        "scope line",
        lines,
        options.by,
      );
      if (!added.ok) {
        await deleteRecord(TABLES.cycles, "month", cycle.id);
        failed++;
        continue;
      }
    }
    created++;
    done.push(engagement.id);
  }
  if (failed)
    console.error(
      `[clients] ${failed} cycle(s) for ${options.month} couldn't be created`,
    );
  return { ok: true, month: options.month, created, failed, engagements: done };
}
