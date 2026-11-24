/**
 * Every company's projects added up, for the Projects and Stats pages. A
 * project is an engagement's month (a cycle). Pure, for the pages and the
 * tests: the pages load the rows and scope them first.
 */

import { isLate, isWaitingOnClient, waitsOnClient } from "@/lib/internal/clients/rules";
import {
  shiftMonth,
  todayKey,
  type ClientAccount,
  type Cycle,
  type Deliverable,
  type DeliverableStatus,
  type Engagement,
  type ScopeLine,
} from "@/lib/internal/clients/schema";

/** Where a project's pieces are, from not started to live. */
export type PieceCounts = {
  live: number;
  approved: number;
  withClient: number;
  working: number;
  /** Planned pieces not started, and planned ones not added yet. */
  notStarted: number;
};

export const PIECE_GROUPS = [
  { key: "live", label: "Live" },
  { key: "approved", label: "Approved" },
  { key: "withClient", label: "With the client" },
  { key: "working", label: "In the works" },
  { key: "notStarted", label: "Not started" },
] as const satisfies readonly { key: keyof PieceCounts; label: string }[];

const GROUP_OF: Record<DeliverableStatus, keyof PieceCounts> = {
  published: "live",
  approved: "approved",
  client_review: "withClient",
  in_progress: "working",
  internal_review: "working",
  changes_requested: "working",
  planned: "notStarted",
};

/**
 * The pieces by group. Planned pieces nobody has added yet count as not
 * started, so the groups add up to the plan (or to the pieces, when there
 * are more of them than planned).
 */
export function pieceCounts(planned: number, pieces: readonly Pick<Deliverable, "status">[]): PieceCounts {
  const counts: PieceCounts = { live: 0, approved: 0, withClient: 0, working: 0, notStarted: 0 };
  for (const piece of pieces) counts[GROUP_OF[piece.status] ?? "working"] += 1;
  counts.notStarted += Math.max(0, planned - pieces.length);
  return counts;
}

export function addCounts(all: readonly PieceCounts[]): PieceCounts {
  const total: PieceCounts = { live: 0, approved: 0, withClient: 0, working: 0, notStarted: 0 };
  for (const counts of all) for (const group of PIECE_GROUPS) total[group.key] += counts[group.key];
  return total;
}

export const countsTotal = (counts: PieceCounts) => PIECE_GROUPS.reduce((sum, group) => sum + counts[group.key], 0);

export type ProjectRow = {
  cycle: Cycle;
  engagement: Engagement;
  client: ClientAccount;
  /** The company has more than one engagement, so its links name which. */
  several: boolean;
  /** Pieces planned in the month's scope lines. */
  planned: number;
  counts: PieceCounts;
  /** Views on its live pieces. */
  views: number;
  blocked: number;
  /** Waiting on the client: past their reply date, or blocked on them. */
  waiting: number;
  late: number;
};

/** One row per project, newest month first, then by company and project name. */
export function projectRows(input: {
  clients: readonly ClientAccount[];
  engagements: readonly Engagement[];
  cycles: readonly Cycle[];
  lines: readonly Pick<ScopeLine, "cycle_id" | "planned">[];
  deliverables: readonly Deliverable[];
  today?: string;
}): ProjectRow[] {
  const today = input.today ?? todayKey();
  const clients = new Map(input.clients.map((client) => [client.id, client]));
  const engagements = new Map(input.engagements.map((engagement) => [engagement.id, engagement]));
  const perClient = new Map<string, number>();
  for (const engagement of input.engagements) perClient.set(engagement.client_id, (perClient.get(engagement.client_id) ?? 0) + 1);
  const plannedOf = new Map<string, number>();
  for (const line of input.lines) plannedOf.set(line.cycle_id, (plannedOf.get(line.cycle_id) ?? 0) + Math.max(0, line.planned));
  const piecesOf = new Map<string, Deliverable[]>();
  for (const piece of input.deliverables) piecesOf.set(piece.cycle_id, [...(piecesOf.get(piece.cycle_id) ?? []), piece]);

  const rows: ProjectRow[] = [];
  for (const cycle of input.cycles) {
    const engagement = engagements.get(cycle.engagement_id);
    const client = engagement ? clients.get(engagement.client_id) : undefined;
    if (!engagement || !client) continue;
    const pieces = piecesOf.get(cycle.id) ?? [];
    const planned = plannedOf.get(cycle.id) ?? 0;
    rows.push({
      cycle,
      engagement,
      client,
      several: (perClient.get(client.id) ?? 0) > 1,
      planned,
      counts: pieceCounts(planned, pieces),
      views: pieces.filter((piece) => piece.status === "published").reduce((sum, piece) => sum + (piece.views ?? 0), 0),
      blocked: pieces.filter((piece) => piece.blocked && piece.status !== "published").length,
      waiting: pieces.filter((piece) => piece.status !== "published" && waitsOnClient(piece, today)).length,
      late: pieces.filter((piece) => isLate(piece, today)).length,
    });
  }
  return rows.sort(
    (a, b) =>
      b.cycle.month.localeCompare(a.cycle.month) ||
      a.client.name.localeCompare(b.client.name) ||
      a.engagement.name.localeCompare(b.engagement.name),
  );
}

/**
 * A project's plan: its scope lines' planned pieces, or, for a month with no
 * plan set (older months were tracked without one), the pieces it had.
 */
export function planOf(row: Pick<ProjectRow, "planned" | "counts">) {
  return row.planned > 0 ? row.planned : countsTotal(row.counts);
}

/** Done of planned for a set of projects; extra pieces never push past the plan. */
export function doneOfPlanned(rows: readonly Pick<ProjectRow, "planned" | "counts">[]) {
  const planned = rows.reduce((sum, row) => sum + planOf(row), 0);
  const done = rows.reduce((sum, row) => sum + Math.min(row.counts.live, planOf(row)), 0);
  return { done, planned };
}

/**
 * The company page's four numbers, for any set of pieces: what's live and
 * since when, its reach, what's with the client (and how much of it is past
 * the reply date), and what's still in the works.
 */
export function headline(pieces: readonly Deliverable[], cycles: readonly Pick<Cycle, "month">[], today = todayKey()) {
  const live = pieces.filter((piece) => piece.status === "published");
  const withClient = pieces.filter((piece) => piece.status === "client_review");
  return {
    live: live.length,
    reach: live.reduce((sum, piece) => sum + (piece.views ?? 0), 0),
    withViews: live.filter((piece) => (piece.views ?? 0) > 0).length,
    withClient: withClient.length,
    overdue: withClient.filter((piece) => isWaitingOnClient(piece, today)).length,
    approved: pieces.filter((piece) => piece.status === "approved").length,
    working: pieces.filter((piece) => ["planned", "in_progress", "internal_review", "changes_requested"].includes(piece.status)).length,
    firstMonth: cycles.map((cycle) => cycle.month).sort()[0] ?? null,
  };
}

/**
 * The months from `first` to `last`, oldest first, at most `max` of them
 * (the newest). Empty when there's no first month.
 */
export function monthRange(first: string | null, last: string, max = 12): string[] {
  if (!first || first > last) return first ? [last] : [];
  const months: string[] = [];
  for (let month = last; month >= first && months.length < max; month = shiftMonth(month, -1)) months.unshift(month);
  return months;
}

/** Planned and live pieces per project month, for the months given. */
export function perMonth(rows: readonly ProjectRow[], months: readonly string[]) {
  return months.map((month) => {
    const inMonth = rows.filter((row) => row.cycle.month === month);
    return {
      month,
      planned: inMonth.reduce((sum, row) => sum + planOf(row), 0),
      live: inMonth.reduce((sum, row) => sum + row.counts.live, 0),
      views: inMonth.reduce((sum, row) => sum + row.views, 0),
      projects: inMonth.length,
    };
  });
}

export type CompanyTotals = {
  client: ClientAccount;
  projects: number;
  counts: PieceCounts;
  views: number;
  /** Its newest month's projects, added up. */
  latest: { month: string; done: number; planned: number } | null;
  heldUp: number;
};

/** Each company's projects added up, most live pieces first. */
export function companyTotals(rows: readonly ProjectRow[]): CompanyTotals[] {
  const byClient = new Map<string, ProjectRow[]>();
  for (const row of rows) byClient.set(row.client.id, [...(byClient.get(row.client.id) ?? []), row]);
  return [...byClient.values()]
    .map((own): CompanyTotals => {
      const newest = own.map((row) => row.cycle.month).sort().at(-1)!;
      const latest = own.filter((row) => row.cycle.month === newest);
      return {
        client: own[0].client,
        projects: own.length,
        counts: addCounts(own.map((row) => row.counts)),
        views: own.reduce((sum, row) => sum + row.views, 0),
        latest: { month: newest, ...doneOfPlanned(latest) },
        heldUp: own.reduce((sum, row) => sum + row.blocked + row.waiting + row.late, 0),
      };
    })
    .sort((a, b) => b.counts.live - a.counts.live || b.views - a.views || a.client.name.localeCompare(b.client.name));
}

/**
 * A company's time with us: since when (its start date, else its first
 * project's), and when it ends. While any project runs it's "ongoing" unless
 * every running one has an end date (then the latest); once all have ended,
 * the last end date.
 */
export function companyTerm(
  client: Pick<ClientAccount, "started_on">,
  engagements: readonly Pick<Engagement, "status" | "starts_on" | "ends_on">[],
) {
  const starts = engagements.map((item) => item.starts_on).filter((day): day is string => Boolean(day)).sort();
  const running = engagements.filter((item) => item.status !== "ended");
  const latest = (items: readonly Pick<Engagement, "ends_on">[]) =>
    items.map((item) => item.ends_on).filter((day): day is string => Boolean(day)).sort().at(-1) ?? null;
  const since = client.started_on ?? starts[0] ?? null;
  if (running.length) {
    const ends = running.every((item) => item.ends_on) ? latest(running) : null;
    return { since, ends, ongoing: !ends, ended: false };
  }
  return { since, ends: latest(engagements), ongoing: false, ended: engagements.length > 0 };
}
