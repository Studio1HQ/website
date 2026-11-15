import {
  plannedVsDelivered,
  reportRows,
  slippedItems,
  waitsOnClient,
  type ReportRow,
} from "@/lib/internal/clients/rules";
import {
  DELIVERABLE_KINDS,
  formatDay,
  labelOf,
  monthLabel,
  personName,
  todayKey,
  type ClientAccount,
  type Cycle,
  type Deliverable,
  type Engagement,
  type Milestone,
  type ScopeLine,
} from "@/lib/internal/clients/schema";

/**
 * The monthly report for one engagement, as the client sees it: planned
 * against delivered, what went live, the status of everything else and what
 * slipped (theirs, ours, or someone else's). Pure, so the page, the CSV and
 * the "Copy for the client" text all say the same thing.
 *
 * Client-ready on purpose: no invoice state, no internal notes, no draft,
 * review or PR links, no sizes or capacity. Only live links leave here.
 */

/** Who a slipped item is waiting on, for grouping in the report. */
export type SlipSide = "client" | "studio1" | "third_party";

export type SlippedLine = {
  id: string;
  title: string;
  kind: string;
  side: SlipSide;
  reason: string;
};

export type ClientReport = {
  client: string;
  engagement: string;
  /** "YYYY-MM". */
  month: string;
  /** "November 2026". */
  monthName: string;
  /** The account owner's name, or "". */
  owner: string;
  /** The day the numbers are from (YYYY-MM-DD, IST). */
  asOf: string;
  planned: {
    kind: string;
    label: string;
    planned: number;
    done: number;
    approved: number;
  }[];
  totals: { planned: number; done: number; approved: number };
  /** Live this month, oldest first. */
  published: ReportRow[];
  /** Everything not live yet: ready first, then by date. */
  open: ReportRow[];
  slipped: SlippedLine[];
  /** Views on the month's work (posts mostly), 0 when none were logged. */
  reach: number;
  /** The engagement's wins this month, oldest first. */
  milestones: { id: string; day: string; title: string; url: string | null }[];
  scopeNote: string;
  retroNote: string;
};

export function buildClientReport(input: {
  client: Pick<ClientAccount, "name"> | null;
  engagement: Pick<Engagement, "name" | "owner">;
  cycle: Pick<Cycle, "month" | "scope_note" | "retro_note">;
  lines: readonly ScopeLine[];
  deliverables: readonly Deliverable[];
  names?: Readonly<Record<string, string>>;
  today?: string;
  milestones?: readonly Pick<
    Milestone,
    "id" | "happened_on" | "title" | "url"
  >[];
}): ClientReport {
  const today = input.today ?? todayKey();
  const rows = reportRows(input.deliverables, { today, names: input.names });
  const planned = plannedVsDelivered(input.lines, input.deliverables).map(
    (row) => ({
      ...row,
      kind: labelOf(DELIVERABLE_KINDS, row.kind),
    }),
  );
  const published = rows
    .filter((row) => row.state === "live")
    .sort(
      (a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999") ||
        a.title.localeCompare(b.title),
    );
  const side = (item: Deliverable): SlipSide =>
    waitsOnClient(item, today) ||
    (item.status === "client_review" && !item.blocked)
      ? "client"
      : item.blocked && item.waits_on === "third_party"
        ? "third_party"
        : "studio1";
  const order: Record<SlipSide, number> = {
    client: 0,
    studio1: 1,
    third_party: 2,
  };
  const slipped = slippedItems(input.cycle, input.deliverables, today)
    .map(({ deliverable, reason }) => ({
      id: deliverable.id,
      title: deliverable.title,
      kind: labelOf(DELIVERABLE_KINDS, deliverable.kind),
      side: side(deliverable),
      reason,
    }))
    .sort(
      (a, b) => order[a.side] - order[b.side] || a.title.localeCompare(b.title),
    );
  return {
    client: input.client?.name ?? "",
    engagement: input.engagement.name,
    month: input.cycle.month,
    monthName: monthLabel(input.cycle.month),
    owner: personName(input.engagement.owner, input.names),
    asOf: today,
    planned,
    totals: {
      planned: planned.reduce((sum, row) => sum + Math.max(0, row.planned), 0),
      done: planned.reduce((sum, row) => sum + row.done, 0),
      approved: planned.reduce((sum, row) => sum + row.approved, 0),
    },
    published,
    open: rows.filter((row) => row.state !== "live"),
    slipped,
    reach: input.deliverables.reduce(
      (sum, item) =>
        sum + (item.status === "published" ? (item.views ?? 0) : 0),
      0,
    ),
    milestones: (input.milestones ?? [])
      .filter((item) => item.happened_on.startsWith(`${input.cycle.month}-`))
      .map((item) => ({
        id: item.id,
        day: item.happened_on,
        title: item.title,
        url: item.url,
      }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    scopeNote: input.cycle.scope_note.trim(),
    retroNote: input.cycle.retro_note.trim(),
  };
}

/** The heading for each group of slipped items. */
export function slipHeading(side: SlipSide, client: string) {
  if (side === "client")
    return client ? `Waiting on ${client}` : "Waiting on the client";
  if (side === "third_party") return "Waiting on someone else";
  return "Delayed on our side";
}

/** Who a slipped item waits on, in one or two words (the CSV's column). */
export function slipOwner(side: SlipSide, client: string) {
  if (side === "client") return client || "The client";
  if (side === "third_party") return "Someone else";
  return "Studio1";
}

/** Slipped items grouped by who they wait on, in report order (empty groups left out). */
export function slipGroups(report: Pick<ClientReport, "slipped">) {
  const sides: SlipSide[] = ["client", "studio1", "third_party"];
  return sides
    .map((side) => ({
      side,
      items: report.slipped.filter((item) => item.side === side),
    }))
    .filter((group) => group.items.length > 0);
}

/** One line of a list: no line breaks, no runs of spaces. */
function flat(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The report as plain text for Slack or an email: short headings, "•"
 * bullets, live links written out so they unfurl. Nothing in it needs
 * Markdown to read well.
 */
export function reportText(report: ClientReport): string {
  const out: string[] = [];
  const title = [report.client, report.engagement].filter(Boolean).join(" · ");
  out.push(title || "Monthly report");
  out.push(
    `Monthly report for ${report.monthName}, as of ${formatDay(report.asOf, "")}`,
  );
  if (report.owner) out.push(`Account owner: ${report.owner}`);

  out.push("", "Planned against delivered");
  if (!report.planned.length) out.push("• Nothing was planned for this month.");
  for (const row of report.planned) {
    const approved = row.approved
      ? ` (+${row.approved} approved, not live yet)`
      : "";
    out.push(
      `• ${flat(row.label)}: ${row.done} of ${row.planned} delivered${approved}`,
    );
  }
  if (report.planned.length > 1)
    out.push(
      `Total: ${report.totals.done} of ${report.totals.planned} delivered`,
    );

  out.push("", "Published this month");
  if (!report.published.length)
    out.push("• Nothing has gone live yet this month.");
  for (const row of report.published) {
    const when = row.date ? `, live ${formatDay(row.date, report.asOf)}` : "";
    out.push(
      `• ${flat(row.title)} (${row.kind}${when})${row.url ? `: ${row.url}` : ""}`,
    );
  }

  if (report.reach > 0)
    out.push(
      "",
      "Reach",
      `• ${report.reach.toLocaleString("en-US")} views on what went live this month`,
    );

  if (report.milestones.length) {
    out.push("", "Milestones");
    for (const item of report.milestones)
      out.push(
        `• ${formatDay(item.day, report.asOf)}: ${flat(item.title)}${item.url ? `: ${item.url}` : ""}`,
      );
  }

  out.push("", "Status of everything else");
  if (!report.open.length) out.push("• Everything planned is live.");
  for (const row of report.open) {
    const parts = [
      row.stateLabel,
      row.owner ? `owner ${row.owner}` : "",
      row.dateLabel,
    ].filter(Boolean);
    out.push(`• ${flat(row.title)} (${row.kind}): ${parts.join(", ")}`);
    if (row.note) out.push(`  ${flat(row.note)}`);
  }

  const groups = slipGroups(report);
  if (groups.length) {
    out.push("", "Slipped");
    for (const group of groups) {
      out.push(`${slipHeading(group.side, report.client)}:`);
      for (const item of group.items)
        out.push(`• ${flat(item.title)}: ${flat(item.reason)}`);
    }
  }

  if (report.scopeNote) out.push("", "Agreed scope", report.scopeNote);
  if (report.retroNote)
    out.push("", "Looking back on the month", report.retroNote);
  return `${out.join("\n").trim()}\n`;
}

/** The CSV's columns, in order. */
export const REPORT_CSV_COLUMNS = [
  "item",
  "type",
  "status",
  "ready",
  "owner",
  "when",
  "live_link",
  "slipped",
  "waiting_on",
  "note",
];

/** One CSV row per deliverable: live ones first, then the status of the rest. */
export function reportCsvRows(report: ClientReport): Record<string, string>[] {
  const slipped = new Map(report.slipped.map((item) => [item.id, item]));
  return [...report.published, ...report.open].map((row) => {
    const slip = slipped.get(row.id);
    return {
      item: row.title,
      type: row.kind,
      status: row.stateLabel,
      ready: row.ready ? "yes" : "no",
      owner: row.owner,
      when: row.dateLabel,
      live_link: row.url ?? "",
      slipped: slip ? slip.reason : "",
      waiting_on: slip
        ? slipOwner(slip.side, report.client)
        : row.state === "waiting_on_client"
          ? report.client
          : "",
      note: row.note,
    };
  });
}
