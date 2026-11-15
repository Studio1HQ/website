/**
 * One client's week: what was done, what's in progress, what's next and
 * what's stuck, from the employees' own task tracker (team_tasks) and the
 * client's deliverables. Pure, so it's easy to test; the client workspace,
 * the "This week" index, the copied weekly update and the Slack post all
 * build from weekLines().
 *
 * Which items land in a week W (Monday to Sunday), with "today" in IST:
 *
 *   tasks
 *     done            Done, when done_on is in W (else left out)
 *     open, W is this week or later
 *                     always shown, except a To do due after W ends
 *     open, W is past only when it was due in W (it slipped)
 *     group           blocked → Blocked; To do → Up next;
 *                     Doing / In review → In progress
 *
 *   deliverables
 *     published       Done, when it went live in W (published_at, or a
 *                     status event to Published in W); else left out
 *     open, W is this week or later
 *                     shown when due in W, overdue, moved in W, blocked,
 *                     waiting on the client, or past Planned; Planned
 *                     ones due (or planned for a week) after W are left out
 *     open, W is past only when due in W or moved in W
 *     group           blocked or waiting on the client → Blocked;
 *                     Planned → Up next; the rest → In progress
 *
 * Open items show where they stand now: the tracker keeps no history of a
 * task's status, only the day it was done.
 */

import {
  inWeek,
  isDateKey,
  statusLabel,
  todayKey,
  weekEnd,
  weekLabel,
  weekStart,
  type Deliverable,
  type StatusEvent,
} from "@/lib/internal/clients/schema";
import { isDueInWeek, isLate, waitsOnClient } from "@/lib/internal/clients/rules";
import type { Task } from "@/lib/internal/tasks/shared";

/* ----------------------------------------------------------------- types */

export type WeekTask = Pick<
  Task,
  | "id"
  | "email"
  | "title"
  | "status"
  | "engagement_id"
  | "deliverable_id"
  | "due_on"
  | "done_on"
  | "blocked"
  | "block_reason"
>;

export type WeekDeliverable = Pick<
  Deliverable,
  | "id"
  | "engagement_id"
  | "title"
  | "owner"
  | "status"
  | "status_changed_at"
  | "published_at"
  | "published_url"
  | "blocked"
  | "block_reason"
  | "waits_on"
  | "week"
  | "due_on"
  | "client_due_on"
> &
  Partial<Pick<Deliverable, "kind">>;

export type WeekEvent = Pick<
  StatusEvent,
  "deliverable_id" | "at" | "kind" | "to_status"
>;

export type WeekGroup = "done" | "doing" | "next" | "blocked";

/** The groups in the order a weekly update reads. */
export const WEEK_GROUPS: readonly {
  value: WeekGroup;
  label: string;
  empty: string;
}[] = [
  { value: "done", label: "Done", empty: "Nothing finished yet." },
  { value: "doing", label: "In progress", empty: "Nothing in progress." },
  { value: "next", label: "Up next", empty: "Nothing lined up." },
  {
    value: "blocked",
    label: "Blocked or waiting on the client",
    empty: "Nothing stuck.",
  },
];

const TASK_STATUS_LABELS: Record<WeekTask["status"], string> = {
  todo: "Not started",
  doing: "In progress",
  review: "In review",
  done: "Done",
};

export type WeekLine = {
  /** "t:<id>" or "d:<id>". */
  key: string;
  source: "task" | "deliverable";
  id: string;
  title: string;
  /** The task's person or the deliverable's owner (an email), if any. */
  who: string | null;
  engagementId: string | null;
  group: WeekGroup;
  /** "Doing", "Client review"… */
  status: string;
  /** The raw status ("doing", "client_review"…), for its colour. */
  statusValue: string;
  /** The day it was done (Done) or is due (the rest). */
  day: string | null;
  dayKind: "done" | "due" | null;
  /** Past its due day and still ours to finish. */
  late: boolean;
  blocked: boolean;
  /** Why it's blocked. Internal: never in the copied update. */
  reason: string;
  /** Past the client's reply date, or blocked on the client. */
  waitingOnClient: boolean;
  /** A task that's a step of a deliverable: that deliverable. */
  deliverableId: string | null;
  deliverableTitle: string | null;
  /** The live link (published deliverables only). */
  url: string | null;
};

/* ------------------------------------------------------------- helpers */

/** The IST day of a timestamp, or null. */
export function istDay(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : todayKey(date);
}

const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Fri 20 Nov". */
export function shortDay(day: string | null | undefined) {
  if (!day || !isDateKey(day)) return "";
  return weekdayFormat
    .format(new Date(`${day}T00:00:00Z`))
    .replace(",", "");
}

function liveUrl(url: string | null | undefined) {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

/**
 * The engagements a client's week covers: all of them for a past week; for
 * this week and later, the ones that haven't ended (an ended engagement's
 * leftovers aren't this week's work).
 */
export function engagementsForWeek<
  T extends { id: string; status: string },
>(engagements: readonly T[], week: string, today: string): T[] {
  if (week < weekStart(today)) return [...engagements];
  return engagements.filter((engagement) => engagement.status !== "ended");
}

/* ---------------------------------------------------------------- lines */

/**
 * Everything for a week, one line per task or deliverable, sorted within
 * each group (see the rules at the top of this file). `titles` names the
 * deliverables that tasks belong to when those aren't in `deliverables`.
 */
export function weekLines(input: {
  week: string;
  today: string;
  tasks: readonly WeekTask[];
  deliverables: readonly WeekDeliverable[];
  events?: readonly WeekEvent[];
  titles?: ReadonlyMap<string, string>;
}): WeekLine[] {
  const { week, today } = input;
  const end = weekEnd(week);
  const past = week < weekStart(today);
  const titles = new Map(input.titles ?? []);
  for (const item of input.deliverables) titles.set(item.id, item.title);

  // Status changes in the week, per deliverable.
  const moved = new Set<string>();
  const publishedOn = new Map<string, string>();
  for (const event of input.events ?? []) {
    const day = istDay(event.at);
    if (!day || !inWeek(day, week)) continue;
    moved.add(event.deliverable_id);
    if (event.to_status === "published" && event.kind !== "blocked")
      publishedOn.set(event.deliverable_id, day);
  }

  const lines: WeekLine[] = [];

  for (const task of input.tasks) {
    const base = {
      key: `t:${task.id}`,
      source: "task" as const,
      id: task.id,
      title: task.title,
      who: task.email || null,
      engagementId: task.engagement_id,
      status: TASK_STATUS_LABELS[task.status] ?? task.status,
      statusValue: task.status,
      deliverableId: task.deliverable_id,
      deliverableTitle: task.deliverable_id
        ? (titles.get(task.deliverable_id) ?? null)
        : null,
      url: null,
    };
    if (task.status === "done") {
      if (!inWeek(task.done_on, week)) continue;
      lines.push({
        ...base,
        group: "done",
        day: task.done_on,
        dayKind: "done",
        late: false,
        blocked: false,
        reason: "",
        waitingOnClient: false,
      });
      continue;
    }
    const relevant = past
      ? inWeek(task.due_on, week)
      : task.status !== "todo" ||
        task.blocked ||
        !task.due_on ||
        task.due_on <= end;
    if (!relevant) continue;
    lines.push({
      ...base,
      group: task.blocked ? "blocked" : task.status === "todo" ? "next" : "doing",
      day: task.due_on,
      dayKind: task.due_on ? "due" : null,
      late: Boolean(task.due_on) && (task.due_on as string) < today,
      blocked: task.blocked,
      reason: task.blocked ? task.block_reason : "",
      waitingOnClient: false,
    });
  }

  for (const item of input.deliverables) {
    const base = {
      key: `d:${item.id}`,
      source: "deliverable" as const,
      id: item.id,
      title: item.title,
      who: item.owner,
      engagementId: item.engagement_id,
      status: statusLabel(item.status, item.kind),
      statusValue: item.status,
      deliverableId: null,
      deliverableTitle: null,
    };
    if (item.status === "published") {
      // The day it went live counts (it can be set back for work logged
      // after the fact); the status event only when that day is missing.
      const live = istDay(item.published_at ?? item.status_changed_at);
      const day = item.published_at
        ? live && inWeek(live, week)
          ? live
          : null
        : live && inWeek(live, week)
          ? live
          : publishedOn.get(item.id);
      if (!day) continue;
      lines.push({
        ...base,
        group: "done",
        day,
        dayKind: "done",
        late: false,
        blocked: false,
        reason: "",
        waitingOnClient: false,
        url: liveUrl(item.published_url),
      });
      continue;
    }
    const waiting = waitsOnClient(item, today);
    const changed = moved.has(item.id);
    const dueInWeek = isDueInWeek(item, week);
    let relevant: boolean;
    if (past) relevant = dueInWeek || changed;
    else if (item.status === "planned")
      relevant =
        dueInWeek ||
        changed ||
        item.blocked ||
        (item.due_on ? item.due_on <= end : Boolean(item.week) && (item.week as string) <= week);
    else relevant = true;
    if (!relevant) continue;
    lines.push({
      ...base,
      group:
        item.blocked || waiting
          ? "blocked"
          : item.status === "planned"
            ? "next"
            : "doing",
      day: item.due_on,
      dayKind: item.due_on ? "due" : null,
      late: isLate(item, today),
      blocked: item.blocked,
      reason: item.blocked ? item.block_reason : "",
      waitingOnClient: waiting,
      url: null,
    });
  }

  return sortLines(lines);
}

/** Done newest first; the rest by due day (none last); then by title. */
export function sortLines(lines: readonly WeekLine[]) {
  return [...lines].sort((a, b) => {
    if (a.group !== b.group)
      return groupIndex(a.group) - groupIndex(b.group);
    const byDay =
      a.group === "done"
        ? (b.day ?? "").localeCompare(a.day ?? "")
        : (a.day ?? "9999").localeCompare(b.day ?? "9999");
    return byDay || a.title.localeCompare(b.title) || a.key.localeCompare(b.key);
  });
}

function groupIndex(group: WeekGroup) {
  return WEEK_GROUPS.findIndex((option) => option.value === group);
}

/** Lines per group, in order. */
export function groupWeek(lines: readonly WeekLine[]) {
  const groups: Record<WeekGroup, WeekLine[]> = {
    done: [],
    doing: [],
    next: [],
    blocked: [],
  };
  for (const line of sortLines(lines)) groups[line.group].push(line);
  return groups;
}

export function weekCounts(lines: readonly WeekLine[]) {
  const counts: Record<WeekGroup, number> = {
    done: 0,
    doing: 0,
    next: 0,
    blocked: 0,
  };
  for (const line of lines) counts[line.group] += 1;
  return counts;
}

/** The most recent done items, newest first. */
export function recentDone(lines: readonly WeekLine[], count = 3) {
  return groupWeek(lines).done.slice(0, count);
}

/* ------------------------------------------------------- weekly update */

const MAX_TEXT_LINES = 40;

/**
 * The weekly update to paste for the client: the week, then Done (with live
 * links), In progress, Up next and Waiting on you. Only titles, due days
 * and live links: no names, notes, reasons, hours or statuses that only
 * mean something inside Studio1. `engagements` (id → name) labels each line
 * when the client has more than one.
 */
export function weeklyUpdateText(input: {
  client: string;
  week: string;
  today: string;
  lines: readonly WeekLine[];
  engagements?: Readonly<Record<string, string>>;
}): string {
  const groups = groupWeek(input.lines);
  const label = (line: WeekLine) => {
    const engagement =
      input.engagements && line.engagementId
        ? input.engagements[line.engagementId]
        : "";
    const part =
      line.deliverableTitle && line.deliverableTitle !== line.title
        ? ` (${oneLine(line.deliverableTitle)})`
        : "";
    return `${engagement ? `${oneLine(engagement)}: ` : ""}${oneLine(line.title)}${part}`;
  };
  const due = (line: WeekLine) =>
    line.dayKind === "due" && line.day
      ? ` (due ${shortDay(line.day)})`
      : "";

  const sections: [string, string[]][] = [
    [
      "Done",
      groups.done.map(
        (line) => `- ${label(line)}${line.url ? `: ${line.url}` : ""}`,
      ),
    ],
    [
      "In progress",
      [
        ...groups.doing,
        // Blocked on our side or a third party: still ours, so in progress.
        ...groups.blocked.filter((line) => !line.waitingOnClient),
      ].map((line) => `- ${label(line)}${due(line)}`),
    ],
    ["Up next", groups.next.map((line) => `- ${label(line)}${due(line)}`)],
    [
      "Waiting on you",
      groups.blocked
        .filter((line) => line.waitingOnClient)
        .map((line) => `- ${label(line)}`),
    ],
  ];

  const body = sections
    .filter(([, items]) => items.length)
    .map(([heading, items]) => {
      const shown = items.slice(0, MAX_TEXT_LINES);
      const more = items.length - shown.length;
      return [heading, ...shown, ...(more > 0 ? [`- and ${more} more`] : [])].join(
        "\n",
      );
    });

  return [
    `${oneLine(input.client) || "Client"}: weekly update`,
    `Week of ${weekLabel(input.week)}`,
    "",
    body.length ? body.join("\n\n") : "Nothing to report for this week yet.",
  ].join("\n");
}

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
