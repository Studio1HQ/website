import "server-only";
import {
  TABLES,
  deleteRecord,
  insertMany,
  insertRecord,
  loadCycles,
  loadEngagements,
  loadTemplates,
} from "@/lib/internal/clients/data";
import {
  firstDay,
  lastDay,
  monthOf,
  shiftMonth,
  templateFor,
  todayKey,
  type Cycle,
  type Engagement,
  type ScopeTemplate,
  type TemplateLine,
} from "@/lib/internal/clients/schema";

/**
 * Next month's cycles. On or after the 25th (IST) each active engagement
 * gets next month's cycle in Planning, with scope lines from its type's
 * template; the account owner then adjusts the numbers and moves it to
 * Active. The daily cron (app/api/cron/client-cycles) and the "Start next
 * month" button both call ensureNextCycles. Running it again changes
 * nothing: an engagement that has the month already is skipped.
 */

/** The day of the month from which next month's cycles are made. */
export const NEXT_MONTH_FROM_DAY = 25;

/** The month the cron should prepare today: next month from the 25th, else null. */
export function monthToPrepare(today = todayKey()) {
  return Number(today.slice(8, 10)) >= NEXT_MONTH_FROM_DAY
    ? shiftMonth(monthOf(today), 1)
    : null;
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
 * Creates the month's cycle (Planning) with template scope lines for every
 * active engagement that lacks one, or only for `engagementIds` when given.
 * A cycle whose lines can't be added is taken back out, so the next run
 * tries again from scratch.
 */
export async function ensureNextCycles(options: {
  month: string;
  by: string;
  engagementIds?: readonly string[];
}): Promise<EnsureResult> {
  const [engagements, templates] = await Promise.all([
    loadEngagements({ statuses: ["active"] }),
    loadTemplates(),
  ]);
  if (!engagements.ok) return { ok: false, message: engagements.message };
  // A failed read must not quietly start every month on the built-in plan
  // (the month then exists, so no later run would put it right).
  if (!templates.ok && !templates.missing)
    return { ok: false, message: templates.message };
  const saved: ScopeTemplate[] = templates.ok ? templates.rows : [];
  const wanted = options.engagementIds ? new Set(options.engagementIds) : null;
  const pool = engagements.rows.filter(
    (engagement) => !wanted || wanted.has(engagement.id),
  );
  const cycles = await loadCycles({
    engagementIds: pool.map((engagement) => engagement.id),
    month: options.month,
  });
  if (!cycles.ok) return { ok: false, message: cycles.message };

  let created = 0;
  let failed = 0;
  const done: string[] = [];
  for (const engagement of engagementsNeedingCycle(
    pool,
    cycles.rows,
    options.month,
  )) {
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
    const lines = linesFromTemplate(
      templateFor(engagement.type, saved).lines,
      cycle.id,
    );
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
