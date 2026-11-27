/**
 * The arithmetic behind the Inbound stats page: weeks, medians and counts.
 * Pure, so it is tested beside it (stats.test.ts). Weeks run Monday to
 * Sunday in IST, where the team works.
 */

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type WeekCount = { week: string; call: number; mail: number };
export type StageCount = {
  stage: string;
  /** Leads at this stage now. */
  inStage: number;
  /** Leads at this stage or any later one (never counts lost); null for lost. */
  reached: number | null;
};
export type InboundStats = {
  weeks: WeekCount[];
  weekKeys: string[];
  leadTotal: number;
  medianMs: number | null;
  /** How many leads the median is over. */
  timedLeads: number;
  stages: StageCount[];
  mailSorted: number;
  mailCorrected: number;
  mailKeepDays: number;
  month: { run: number; failed: number };
  truncated: boolean;
};

/** The Monday (YYYY-MM-DD, IST) of the week the moment falls in. */
export function weekStart(value: Date | string | number): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const local = new Date(time + IST_MS);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(local.getTime() - sinceMonday * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The Mondays of the last `count` weeks, oldest first, this week last. */
export function weekKeys(now: Date, count: number): string[] {
  const first = new Date(`${weekStart(now)}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, index) =>
    new Date(first - (count - 1 - index) * 7 * DAY_MS)
      .toISOString()
      .slice(0, 10),
  );
}

/** Leads created in each of the last weeks, split by how they came. */
export function countLeadsPerWeek(
  leads: readonly { created_at: string; source: string }[],
  now: Date,
  count: number,
): WeekCount[] {
  const weeks = weekKeys(now, count).map((week) => ({
    week,
    call: 0,
    mail: 0,
  }));
  for (const lead of leads) {
    const row = weeks.find((item) => item.week === weekStart(lead.created_at));
    if (!row) continue;
    if (lead.source === "inbound_call") row.call += 1;
    else if (lead.source === "inbound_email") row.mail += 1;
  }
  return weeks;
}

/** The middle value; the mean of the two middle ones for an even count; null for none. */
export function median(values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * For each lead with a finished lead_created event, the time from the lead
 * arriving to the earliest such finish, in ms. Leads without one, and any
 * that would come out negative, are left out.
 */
export function firstLeadTimes(
  leads: readonly { id: string; created_at: string }[],
  events: readonly { org_id: string; finished_at: string | null }[],
): number[] {
  const first = new Map<string, number>();
  for (const event of events) {
    if (!event.finished_at) continue;
    const at = new Date(event.finished_at).getTime();
    if (Number.isNaN(at)) continue;
    const seen = first.get(event.org_id);
    if (seen === undefined || at < seen) first.set(event.org_id, at);
  }
  const times: number[] = [];
  for (const lead of leads) {
    const finished = first.get(lead.id);
    if (finished === undefined) continue;
    const span = finished - new Date(lead.created_at).getTime();
    if (Number.isFinite(span) && span >= 0) times.push(span);
  }
  return times;
}

/** How many leads sit at each stage, and how many got that far. */
export function stageCounts(
  stages: readonly string[],
  order: readonly string[],
): StageCount[] {
  const path = order.filter((stage) => stage !== "lost");
  return order.map((stage) => {
    const inStage = stages.filter((item) => item === stage).length;
    const index = path.indexOf(stage);
    if (index === -1) return { stage, inStage, reached: null };
    const later = new Set(path.slice(index));
    return {
      stage,
      inStage,
      reached: stages.filter((item) => later.has(item)).length,
    };
  });
}

/** Events that ran (finished well or badly) and events that failed. */
export function eventsThisMonth(events: readonly { status: string }[]) {
  const failed = events.filter((event) => event.status === "failed").length;
  const done = events.filter((event) => event.status === "done").length;
  return { run: done + failed, failed };
}

/** The first moment of this month in IST, as an ISO string for a filter. */
export function monthStartIso(now: Date): string {
  const local = new Date(now.getTime() + IST_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - IST_MS,
  ).toISOString();
}

/** "45 min", "3 h", "2 days": a short span for a headline number. */
export function spanLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const minutes = ms / 60_000;
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round(hours / 24)} days`;
}

/** A share as a whole percent, or null with nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}
