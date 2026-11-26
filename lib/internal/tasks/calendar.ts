/**
 * The week calendar: which day each card sits on. Pure (no server
 * imports), so it's easy to test and the client can use the types.
 *
 *   your tasks          Done → the day it was done; open → its day (due_on)
 *                       when that's in the week; open with no day, or a day
 *                       before the week → the "No day yet" tray (this week
 *                       and later only); a day after the week → left out.
 *                       One that runs over several days (start_on) is one
 *                       card across them: start_on to due_on, or to the day
 *                       it was done once it's done (taskSpan)
 *   client deliverables you own: open → their due day in the week;
 *                       published → the day they went live in the week
 *   community tasks     yours: open → their due day; done → the day done
 */

import { DELIVERABLE_STATUSES, statusLabel, toneOf, weekStart, type Deliverable } from "@/lib/internal/clients/schema";
import { displayName } from "@/lib/internal/team/shared";
import {
  STUDIO_LINK,
  forKey,
  forLabel,
  isClientKey,
  peopleOn,
  priorityRank,
  type CommunityCard,
  type EngagementLabel,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type Tone,
} from "@/lib/internal/tasks/shared";

export type CalendarCard =
  | {
      kind: "task";
      id: string;
      title: string;
      /** Context for whoever checks it; "" when there's none. */
      notes: string;
      /** The day the card sits on; for a task over several days, its first day in the week shown. */
      day: string | null;
      /**
       * A task that runs over several days: its first and last day (the day
       * it was finished, once it's done). Null for a one-day task.
       */
      range: Span | null;
      status: TaskStatus;
      priority: TaskPriority;
      /** "Nebius · DevRel retainer", "Studio1 · Hiring", "Studio1". */
      forLabel: string;
      /** A short tag: the client's name, or the Studio1 area; "" for plain Studio1. */
      tag: string;
      client: boolean;
      /** The For picker's value. */
      link: string;
      blocked: boolean;
      reason: string;
      /** Who added it, when it wasn't the person (and it isn't shared with them). */
      from: string | null;
      /** Whose task it is (lowercase email); someone else's when it's shared with the person. */
      owner: string;
      /** Who it's shared with (lowercase emails), besides its owner. */
      people: string[];
      /** First names of everyone else on it, for "With …". */
      withNames: string[];
      /** Whether the viewer may edit, move or delete it (set by the page). */
      editable?: boolean;
    }
  | {
      kind: "deliverable";
      id: string;
      title: string;
      /** Null in the tray: no due date yet. */
      day: string | null;
      status: string;
      tone: Tone;
      done: boolean;
      tag: string;
      client: boolean;
      href: string | null;
      /** The viewer may move it to another day, which sets its due date (set by the page; open ones they own or manage). */
      editable?: boolean;
    }
  | {
      kind: "community";
      id: string;
      title: string;
      day: string;
      status: string;
      tone: Tone;
      done: boolean;
      tag: string;
      client: false;
      href: string;
    };

/** A run of days, first and last included. */
export type Span = { from: string; to: string };

/** The day `n` days after (or before) a day. */
export function addDays(day: string, n: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** How many days from one day to another (negative when it's earlier). */
export function daysApart(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * The days a task covers: an open one from start_on to its due day, a done
 * one from start_on to the day it was finished. A one-day task (no
 * start_on, or one that isn't before the last day) is just that day:
 * `from` is null then. `to` is null for an open task with no day yet.
 */
export function taskSpan(task: Pick<Task, "status" | "start_on" | "due_on" | "done_on">): { from: string | null; to: string | null } {
  const to = task.status === "done" ? task.done_on : task.due_on;
  return { from: task.start_on && to && task.start_on < to ? task.start_on : null, to };
}

const spanMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const spanDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });

/** "24–27 Nov"; across months, "28 Nov – 2 Dec". */
export function spanLabel({ from, to }: Span) {
  const first = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  return from.slice(0, 7) === to.slice(0, 7)
    ? `${spanDay.format(first)}–${spanMonth.format(last)}`
    : `${spanMonth.format(first)} – ${spanMonth.format(last)}`;
}

/** Whether a card is on a day: its own day, or one of the days a task over several runs over. */
export function onDay(card: CalendarCard, day: string) {
  return card.kind === "task" && card.range ? card.range.from <= day && day <= card.range.to : card.day === day;
}

/**
 * A task's days once it's marked Done from its card (editTask's rule): it
 * was finished on its last day when that's this week and not still ahead,
 * else today (finishedDay); one over several days ends then, and is one
 * day again if that's not after its first.
 */
export function doneSpan(range: Span | null, day: string | null, today: string): { from: string | null; to: string } {
  const to = finishedDay(range?.to ?? day, today);
  return { from: range && range.from < to ? range.from : null, to };
}

/**
 * Where a task goes when it's dragged onto `target`: a one-day task to
 * that day; one with several days keeps its length and moves by as many
 * days as lie between the day it was picked up on (`day`, on the week
 * shown) and `target`. From the tray (`day` isn't on the week) its run
 * starts on `target`.
 */
export function movedSpan(range: Span | null, day: string | null, target: string, onWeek: boolean): { from: string | null; to: string } {
  if (!range) return { from: null, to: target };
  const shift = onWeek && day ? daysApart(day, target) : daysApart(range.from, target);
  return { from: addDays(range.from, shift), to: addDays(range.to, shift) };
}

const COMMUNITY: Record<string, [string, Tone]> = {
  todo: ["Not started", "stone"],
  doing: ["In progress", "sky"],
  blocked: ["Blocked", "rose"],
  done: ["Done", "emerald"],
};

/** The picker value for a task's "For". */
export function taskLink(task: Pick<Task, "engagement_id" | "deliverable_id" | "area">) {
  if (task.deliverable_id) return `d:${task.deliverable_id}`;
  if (task.engagement_id) return `e:${task.engagement_id}`;
  return task.area && task.area !== "client" ? `s:${task.area}` : STUDIO_LINK;
}

function tagFor(key: string, engagements: ReadonlyMap<string, EngagementLabel>) {
  if (key.startsWith("e:")) {
    const engagement = engagements.get(key.slice(2));
    if (!engagement) return "Client";
    return engagement.internal ? engagement.name : engagement.client;
  }
  const label = forLabel(key, engagements);
  return label === "Studio1" ? "" : label.replace(/^Studio1 · /, "");
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function inRange(day: string | null | undefined, from: string, to: string): boolean {
  return Boolean(day && day >= from && day <= to);
}

/** The 1st of last month: the earliest day a card can go on. */
export function earliestCardDay(today: string) {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
}

/**
 * The day a card was finished when it's marked Done without being put on a
 * day: its own day if that's in this week and not still ahead, else today.
 * So an overdue card ticked off weeks later isn't back-dated to the day it
 * was due (the board's Done stamps today too).
 */
export function finishedDay(cardDay: string | null | undefined, today: string) {
  return cardDay && cardDay >= weekStart(today) && cardDay <= today ? cardDay : today;
}

export function placeCards(input: {
  week: string;
  end: string;
  /** Today (IST): the tray is only for this week and later. */
  today: string;
  person: string;
  tasks: readonly Task[];
  deliverables: readonly Deliverable[];
  /** Other people's deliverables in internal review, waiting on this person. */
  reviewing?: readonly Deliverable[];
  community: readonly CommunityCard[];
  engagements: ReadonlyMap<string, EngagementLabel>;
  /** IST day of a timestamp. */
  dayOf: (value: string | null | undefined) => string | null;
  /** email → name, for "from". */
  names?: Readonly<Record<string, string>>;
  clientPath?: (slug: string) => string;
}): { cards: CalendarCard[]; tray: CalendarCard[] } {
  const { week, end, engagements } = input;
  const cards: CalendarCard[] = [];
  const tray: CalendarCard[] = [];
  const current = input.today <= end;

  const me = input.person.toLowerCase();
  for (const task of input.tasks) {
    const key = forKey(task);
    const card: CalendarCard = {
      kind: "task",
      id: task.id,
      title: task.title,
      notes: task.notes ?? "",
      day: null,
      range: null,
      status: task.status,
      priority: task.priority,
      forLabel: forLabel(key, engagements),
      tag: tagFor(key, engagements),
      client: isClientKey(key, engagements),
      link: taskLink(task),
      blocked: task.blocked,
      reason: task.block_reason,
      from:
        task.created_by && task.created_by.toLowerCase() !== me && task.email.toLowerCase() === me
          ? (input.names?.[task.created_by.toLowerCase()] ?? task.created_by)
          : null,
      owner: task.email.toLowerCase(),
      people: task.with_emails ?? [],
      withNames: peopleOn(task)
        .filter((email) => email !== me)
        .map((email) => firstName(input.names?.[email] || displayName({ email }))),
    };
    const { from, to } = taskSpan(task);
    const range = from && to ? { from, to } : null;
    const first = from ?? to;
    if (first && to && first <= end && to >= week) {
      // One card, even over several days: the week draws it across them.
      cards.push({ ...card, range, day: first < week ? week : first });
    } else if (task.status !== "done" && current && (to === null || to < week)) tray.push({ ...card, range, day: to });
  }

  const owned = new Set(input.deliverables.map((row) => row.id));
  for (const row of input.deliverables) {
    const engagement = engagements.get(row.engagement_id);
    const done = row.status === "published";
    const day = done ? input.dayOf(row.published_at) : row.due_on;
    const card: CalendarCard = {
      kind: "deliverable",
      id: row.id,
      title: row.title,
      day,
      status: statusLabel(row.status, row.kind),
      tone: toneOf(DELIVERABLE_STATUSES, row.status) as Tone,
      done,
      tag: engagement ? (engagement.internal ? engagement.name : engagement.client) : "Client",
      client: !engagement?.internal,
      href: engagement?.clientSlug && input.clientPath ? input.clientPath(engagement.clientSlug) : null,
    };
    if (inRange(day, week, end)) cards.push(card);
    // Like tasks: open work with no due date, or due before this week, stays
    // in sight in the tray instead of dropping off the week.
    else if (!done && current && (!day || day < week)) tray.push(card);
  }

  // Someone else's piece waiting on this person's review has no day of its
  // own here, so it sits in the tray until they've reviewed it.
  if (current) {
    for (const row of input.reviewing ?? []) {
      if (owned.has(row.id) || row.status !== "internal_review") continue;
      const engagement = engagements.get(row.engagement_id);
      tray.push({
        kind: "deliverable",
        id: row.id,
        title: row.title,
        day: row.due_on,
        status: "Your review",
        tone: "violet",
        done: false,
        tag: engagement ? (engagement.internal ? engagement.name : engagement.client) : "Client",
        client: !engagement?.internal,
        href: engagement?.clientSlug && input.clientPath ? input.clientPath(engagement.clientSlug) : null,
      });
    }
  }

  for (const row of input.community) {
    const done = row.status === "done";
    const day = done ? input.dayOf(row.completed_at) : row.due_on;
    if (!day || !inRange(day, week, end)) continue;
    const [status, tone] = COMMUNITY[row.status] ?? COMMUNITY.todo;
    cards.push({
      kind: "community",
      id: row.id,
      title: row.title,
      day,
      status,
      tone,
      done,
      tag: "Community",
      client: false,
      href: "/community/tasks",
    });
  }

  cards.sort(cardOrder);
  tray.sort((a, b) => (a.day ?? "9999").localeCompare(b.day ?? "9999") || a.title.localeCompare(b.title));
  return { cards, tray };
}

/**
 * The order of cards within a day: open first, then done; each by priority
 * (Top first; client and community cards count as Medium), blocked on top
 * of its priority, then by title.
 */
export function cardOrder(a: CalendarCard, b: CalendarCard) {
  const rank = (card: CalendarCard) => (card.kind === "task" ? (card.status === "done" ? 1 : 0) : card.done ? 1 : 0);
  const priority = (card: CalendarCard) => priorityRank(card.kind === "task" ? card.priority : undefined);
  const blocked = (card: CalendarCard) => (card.kind === "task" && card.blocked ? 0 : 1);
  return rank(a) - rank(b) || priority(a) - priority(b) || blocked(a) - blocked(b) || a.title.localeCompare(b.title);
}

/** Counts for the week's header: done, in progress / in review, not started. Each card counts once. */
export function weekTally(cards: readonly CalendarCard[]) {
  let done = 0;
  let doing = 0;
  let todo = 0;
  const seen = new Set<string>();
  for (const card of cards) {
    const key = `${card.kind}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (card.kind === "task") {
      if (card.status === "done") done += 1;
      else if (card.status === "todo") todo += 1;
      else doing += 1;
    } else if (card.done) done += 1;
    else doing += 1;
  }
  return { done, doing, todo };
}
