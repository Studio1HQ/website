import "server-only";
import { isMissingTable } from "@/lib/internal/community/data";
import {
  INBOUND_MIGRATION_HINT,
  INBOUND_SOURCES,
  INBOUND_STAGES,
  type InboundLoad,
} from "@/lib/internal/inbound/schema";
import { MAIL_KEEP_DAYS, mailCutoff } from "@/lib/internal/inbound/rules";
import { TABLES } from "@/lib/internal/inbound/data";
import {
  countLeadsPerWeek,
  eventsThisMonth,
  firstLeadTimes,
  median,
  monthStartIso,
  stageCounts,
  weekKeys,
  type InboundStats,
} from "@/lib/internal/inbound/stats-math";
import { inList, selectRows } from "@/lib/supabase-server";

/**
 * Inbound's figures, read with the service client. Call after
 * requireInbound(). Only the columns the Stats page needs are read: no mail
 * text, no money. The arithmetic is in stats-math.ts, where it is tested.
 */

const LIMIT = "5000";

function failed<T>(what: string, message: string): InboundLoad<T> {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[inbound] reading ${what} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing
      ? INBOUND_MIGRATION_HINT
      : "Couldn't load the numbers just now. Reload in a minute.",
  };
}

export async function loadInboundStats(
  now = new Date(),
): Promise<InboundLoad<InboundStats>> {
  const [orgs, events, monthEvents, sorted, corrected] = await Promise.all([
    selectRows<{
      id: string;
      created_at: string;
      source: string;
      stage: string;
    }>(
      TABLES.orgs,
      new URLSearchParams({
        select: "id,created_at,source,stage",
        source: inList([...INBOUND_SOURCES]),
        limit: LIMIT,
      }),
    ),
    selectRows<{ org_id: string; finished_at: string | null }>(
      TABLES.events,
      new URLSearchParams({
        select: "org_id,finished_at",
        kind: "eq.lead_created",
        status: "eq.done",
        limit: LIMIT,
      }),
    ),
    selectRows<{ status: string }>(
      TABLES.events,
      new URLSearchParams({
        select: "status",
        created_at: `gte.${monthStartIso(now)}`,
        limit: LIMIT,
      }),
    ),
    selectRows(
      TABLES.mail,
      new URLSearchParams({
        select: "id",
        status: "eq.sorted",
        received_at: `gte.${mailCutoff(now)}`,
        limit: "1",
      }),
      { count: true },
    ),
    selectRows(
      TABLES.mail,
      new URLSearchParams({
        select: "id",
        status: "eq.sorted",
        correction: "in.(lead,not_lead)",
        received_at: `gte.${mailCutoff(now)}`,
        limit: "1",
      }),
      { count: true },
    ),
  ]);
  if (!orgs.ok) return failed("leads", orgs.message);
  if (!events.ok) return failed("agent events", events.message);
  if (!monthEvents.ok) return failed("agent events", monthEvents.message);
  if (!sorted.ok) return failed("mail", sorted.message);
  if (!corrected.ok) return failed("mail", corrected.message);

  const times = firstLeadTimes(orgs.rows, events.rows);
  return {
    ok: true,
    value: {
      weeks: countLeadsPerWeek(orgs.rows, now, 8),
      weekKeys: weekKeys(now, 8),
      leadTotal: orgs.rows.length,
      medianMs: median(times),
      timedLeads: times.length,
      stages: stageCounts(
        orgs.rows.map((row) => row.stage),
        INBOUND_STAGES,
      ),
      mailSorted: sorted.total ?? 0,
      mailCorrected: corrected.total ?? 0,
      mailKeepDays: MAIL_KEEP_DAYS,
      month: eventsThisMonth(monthEvents.rows),
      truncated: orgs.rows.length >= Number(LIMIT),
    },
  };
}
