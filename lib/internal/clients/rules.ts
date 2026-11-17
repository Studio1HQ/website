import {
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
  SIZE_POINTS,
  WAITS_ON,
  addDays,
  daysBetween,
  formatDay,
  inWeek,
  isDateKey,
  isOwnedBy,
  labelOf,
  lastDay,
  monthElapsed,
  personName,
  plural,
  todayKey,
  type ClientAccount,
  type ClientPerson,
  type Cycle,
  type Engagement,
  type Deliverable,
  type DeliverableKind,
  type DeliverableStatus,
  type EngagementType,
  type HealthLevel,
  type ScopeLine,
  type StatusEvent,
  POST_KINDS,
} from "@/lib/internal/clients/schema";
import type { ClientsAccess } from "@/lib/internal/roles";

/**
 * The client work rules, pure so they're easy to test: the status workflow
 * and what each move needs, "waiting on client", lateness, progress, health,
 * owner load and the report rows. Pages and actions both use these, so the
 * board, the overview and the server agree.
 */

/* ------------------------------------------------------------- workflow */

/**
 * Planned → In progress ⇄ Internal review → Client review → Approved →
 * Published; Client review → Changes requested → In progress. Our own
 * review is optional: In progress can go straight to Client review (for a
 * blog: Writing → Sent for approval). A step back to Planned is allowed
 * while work hasn't reached review.
 */
const FLOW: Record<DeliverableStatus, readonly DeliverableStatus[]> = {
  planned: ["in_progress"],
  in_progress: ["internal_review", "client_review", "planned"],
  internal_review: ["client_review", "in_progress"],
  client_review: ["approved", "changes_requested"],
  changes_requested: ["in_progress"],
  approved: ["published"],
  published: [],
};

/** Internal work (the Studio1 blog and socials) skips Client review. */
export function isInternal(type: EngagementType | null | undefined) {
  return type === "internal";
}

/** The statuses a deliverable can move to from where it is, in board order. */
export function nextStatuses(
  from: DeliverableStatus,
  options: { internal?: boolean } = {},
): DeliverableStatus[] {
  const next = new Set<DeliverableStatus>(FLOW[from] ?? []);
  if (options.internal && from === "internal_review") next.add("approved");
  return DELIVERABLE_STATUSES.map((option) => option.value).filter((status) =>
    next.has(status),
  );
}

export function canMove(
  from: DeliverableStatus,
  to: DeliverableStatus,
  options: { internal?: boolean } = {},
) {
  return nextStatuses(from, options).includes(to);
}

/** What a move asks for before it can be saved. */
export type MoveNeeds = {
  /** Published: the live link, for the monthly report. */
  publishedUrl: boolean;
  /** Client review: when the client should answer by. */
  clientDueOn: boolean;
};

export function moveNeeds(to: DeliverableStatus): MoveNeeds {
  return {
    publishedUrl: to === "published",
    clientDueOn: to === "client_review",
  };
}

export type MoveInput = {
  published_url?: string | null;
  client_due_on?: string | null;
  comment?: string;
};

/**
 * Why this move can't be saved, or null when it can. `current` is the saved
 * deliverable; the input fills what the move needs (a saved published URL or
 * client due date counts).
 */
export function moveProblem(
  current: Pick<Deliverable, "status" | "published_url" | "client_due_on">,
  to: DeliverableStatus,
  input: MoveInput,
  options: { internal?: boolean; today?: string } = {},
): string | null {
  if (current.status === to) return "It's already there.";
  if (!canMove(current.status, to, options)) {
    return `It can't go from ${labelOf(DELIVERABLE_STATUSES, current.status)} to ${labelOf(DELIVERABLE_STATUSES, to)}.`;
  }
  const needs = moveNeeds(to);
  if (needs.publishedUrl && !(input.published_url ?? current.published_url))
    return "Add the published link first, so the monthly report can list it.";
  if (needs.clientDueOn) {
    const due = input.client_due_on ?? current.client_due_on;
    if (!due || !isDateKey(due))
      return "Set the date the client should reply by.";
    if (input.client_due_on && due < (options.today ?? todayKey()))
      return "The client's reply date can't be in the past.";
  }
  return null;
}

/** Why a block can't be saved, or null. */
export function blockProblem(input: {
  reason?: string | null;
  waits_on?: string | null;
}) {
  if (!input.reason || !input.reason.trim())
    return "Say what it's waiting for.";
  if (!WAITS_ON.some((option) => option.value === input.waits_on))
    return "Pick who it's waiting on.";
  return null;
}

/* ------------------------------------------------------------ who may */

export type { ClientsAccess };

/**
 * May this person change this deliverable (status, links, dates, the
 * blocked flag)? Managers (and admins) change any; members only the ones
 * they own or review.
 */
export function canChangeDeliverable(
  viewer: { email: string; clients: ClientsAccess | null | undefined },
  deliverable: Pick<Deliverable, "owner" | "reviewer">,
) {
  if (viewer.clients === "manager") return true;
  if (viewer.clients !== "member") return false;
  return (
    isOwnedBy(deliverable.owner, viewer.email) ||
    isOwnedBy(deliverable.reviewer, viewer.email)
  );
}

/** The fields a member may change on their own deliverables. */
export const MEMBER_FIELDS = [
  "week",
  "due_on",
  "client_due_on",
  "draft_url",
  "review_url",
  "pr_url",
  "published_url",
  "notes",
  "content_type",
  "views",
  "extra_urls",
] as const satisfies readonly (keyof Deliverable)[];

/* -------------------------------------------------------- two editors */

/** The fields the deliverable dialog edits, with how a clash names them. */
export const FORM_FIELD_LABELS = {
  title: "title",
  kind: "kind",
  scope_line_id: "plan line",
  owner: "owner",
  reviewer: "reviewer",
  size: "size",
  week: "week",
  due_on: "due date",
  client_due_on: "client's reply date",
  draft_url: "draft link",
  review_url: "review link",
  pr_url: "PR link",
  published_url: "live link",
  notes: "notes",
  content_type: "type",
  views: "views",
  extra_urls: "other links",
} as const satisfies Partial<Record<keyof Deliverable, string>>;

export type FormField = keyof typeof FORM_FIELD_LABELS;

/**
 * A deliverable field as the dialog shows it: "" for nothing, one link per
 * line, numbers as text. The dialog starts from these, and the server reads
 * the saved row the same way, so the two compare exactly.
 */
export function formValueOf(item: Partial<Deliverable>, field: FormField): string {
  const value = item[field];
  if (value === null || value === undefined) return "";
  return Array.isArray(value) ? value.join("\n") : String(value);
}

/**
 * Fields this save changes that someone else changed after the dialog
 * opened: `seen` is what the dialog showed for each field it sends, `sent`
 * what it sends. A field they set to the very value sent isn't a clash.
 */
export function editClashes(
  current: Partial<Deliverable>,
  seen: Readonly<Record<string, unknown>>,
  sent: Readonly<Record<string, unknown>>,
): FormField[] {
  return (Object.keys(FORM_FIELD_LABELS) as FormField[]).filter((field) => {
    if (!(field in sent) || typeof seen[field] !== "string") return false;
    const now = formValueOf(current, field);
    return now !== seen[field] && now !== String(sent[field] ?? "");
  });
}

/** "the due date", "the owner and the notes", for a clash message. */
export function clashText(fields: readonly FormField[]) {
  const names = fields.map((field) => `the ${FORM_FIELD_LABELS[field]}`);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
}

/**
 * Where a member may start new work (the owner's rule, 16 Nov 2026):
 * Planned, In progress or In review. Later stages (with the client,
 * Approved, Published) count toward the client's report, so those are
 * reached through the stage menu or added by a client manager. The one
 * exception is a post (social, Reddit, community): it never goes to the
 * client for approval, so whoever posted it logs it as already live.
 */
export function memberMayStartAt(
  status: DeliverableStatus,
  kind: DeliverableKind,
) {
  if (["planned", "in_progress", "internal_review"].includes(status))
    return true;
  return status === "published" && POST_KINDS.has(kind);
}

/* -------------------------------------------------------------- states */

const DONE: readonly DeliverableStatus[] = ["published"];

export function isDone(deliverable: Pick<Deliverable, "status">) {
  return DONE.includes(deliverable.status);
}

/**
 * In Client review past the client's reply date: shown as waiting on the
 * client, never as late by Studio1. Starts the day after the date.
 */
export function isWaitingOnClient(
  deliverable: Pick<Deliverable, "status" | "client_due_on">,
  today = todayKey(),
) {
  return (
    deliverable.status === "client_review" &&
    Boolean(deliverable.client_due_on) &&
    today > (deliverable.client_due_on as string)
  );
}

/** Waiting on the client either way: past the reply date, or blocked on them. */
export function waitsOnClient(
  deliverable: Pick<
    Deliverable,
    "status" | "client_due_on" | "blocked" | "waits_on"
  >,
  today = todayKey(),
) {
  return (
    isWaitingOnClient(deliverable, today) ||
    (deliverable.blocked && deliverable.waits_on === "client")
  );
}

/**
 * Past its due date and still ours to finish. Items in Client review are the
 * client's (see isWaitingOnClient); published ones are done.
 */
export function isLate(
  deliverable: Pick<Deliverable, "status" | "due_on">,
  today = todayKey(),
) {
  return (
    Boolean(deliverable.due_on) &&
    (deliverable.due_on as string) < today &&
    !isDone(deliverable) &&
    deliverable.status !== "client_review"
  );
}

/** Whole days it has been blocked (0 the day it was blocked); null when not blocked. */
export function blockedDays(
  deliverable: Pick<Deliverable, "blocked" | "blocked_at">,
  today = todayKey(),
) {
  if (!deliverable.blocked) return null;
  if (!deliverable.blocked_at) return 0;
  return Math.max(
    0,
    daysBetween(todayKey(new Date(deliverable.blocked_at)), today),
  );
}

/**
 * When it last moved: its latest status event (any kind), else when its
 * status last changed, else when it was added. An ISO time.
 */
export function stuckSince(
  deliverable: Pick<Deliverable, "id" | "status_changed_at" | "created_at">,
  events: readonly Pick<StatusEvent, "deliverable_id" | "at">[] = [],
) {
  let latest = "";
  for (const event of events) {
    if (event.deliverable_id === deliverable.id && event.at > latest)
      latest = event.at;
  }
  return latest || deliverable.status_changed_at || deliverable.created_at;
}

/** Whole days since it last moved. */
export function daysStuck(
  deliverable: Pick<Deliverable, "id" | "status_changed_at" | "created_at">,
  events: readonly Pick<StatusEvent, "deliverable_id" | "at">[] = [],
  today = todayKey(),
) {
  return Math.max(
    0,
    daysBetween(todayKey(new Date(stuckSince(deliverable, events))), today),
  );
}

/**
 * Due in a week: its due date falls in the week, or (with no due date) it's
 * planned for that week.
 */
export function isDueInWeek(
  deliverable: Pick<Deliverable, "week" | "due_on">,
  week: string,
) {
  return deliverable.due_on
    ? inWeek(deliverable.due_on, week)
    : deliverable.week === week;
}

export function sizePoints(deliverable: Pick<Deliverable, "size">) {
  return SIZE_POINTS[deliverable.size] ?? SIZE_POINTS.M;
}

/* ------------------------------------------------------------ progress */

export type Progress = {
  planned: number;
  /** Published: the only thing that counts as done. */
  done: number;
  /** Approved, not yet live. */
  approved: number;
  /** Everything linked that isn't published. */
  open: number;
  /** done ÷ planned, 0 to 1 (0 when nothing is planned). */
  ratio: number;
};

function progress(
  planned: number,
  items: readonly Pick<Deliverable, "status">[],
): Progress {
  const done = items.filter((item) => item.status === "published").length;
  const approved = items.filter((item) => item.status === "approved").length;
  return {
    planned,
    done,
    approved,
    open: items.length - done,
    ratio: planned > 0 ? Math.min(1, done / planned) : 0,
  };
}

/** A scope line: its deliverables in Published against the planned number. */
export function scopeLineProgress(
  line: Pick<ScopeLine, "id" | "planned">,
  deliverables: readonly Pick<Deliverable, "scope_line_id" | "status">[],
): Progress {
  return progress(
    line.planned,
    deliverables.filter((item) => item.scope_line_id === line.id),
  );
}

/**
 * A cycle: done ÷ planned across its scope lines. Deliverables outside any
 * line still count as done (extra work), but never push past 100%.
 */
export function cycleProgress(
  lines: readonly Pick<ScopeLine, "planned">[],
  deliverables: readonly Pick<Deliverable, "status">[],
): Progress {
  return progress(
    lines.reduce((sum, item) => sum + Math.max(0, item.planned), 0),
    deliverables,
  );
}

/** Planned against delivered per kind, for the monthly report. */
export function plannedVsDelivered(
  lines: readonly Pick<ScopeLine, "id" | "kind" | "label" | "planned">[],
  deliverables: readonly Pick<
    Deliverable,
    "scope_line_id" | "kind" | "status"
  >[],
): {
  kind: DeliverableKind;
  label: string;
  planned: number;
  done: number;
  approved: number;
}[] {
  const rows = new Map<
    string,
    {
      kind: DeliverableKind;
      label: string;
      planned: number;
      done: number;
      approved: number;
    }
  >();
  for (const item of lines) {
    const row = rows.get(item.kind) ?? {
      kind: item.kind,
      label: item.label || labelOf(DELIVERABLE_KINDS, item.kind),
      planned: 0,
      done: 0,
      approved: 0,
    };
    row.planned += item.planned;
    rows.set(item.kind, row);
  }
  for (const item of deliverables) {
    const row = rows.get(item.kind) ?? {
      kind: item.kind,
      label: labelOf(DELIVERABLE_KINDS, item.kind),
      planned: 0,
      done: 0,
      approved: 0,
    };
    if (item.status === "published") row.done++;
    if (item.status === "approved") row.approved++;
    rows.set(item.kind, row);
  }
  return [...rows.values()];
}

/* -------------------------------------------------------------- health */

export type Health = { level: HealthLevel; reason: string };

/** Blocked longer than this is red. */
export const BLOCKED_RED_DAYS = 7;

/**
 * An engagement's health for a month, with the reason in plain words.
 *
 *   red    anything blocked over 7 days, or past 75% of the month with
 *          under half done
 *   amber  anything blocked, anything late, or past 50% of the month with
 *          under a quarter done
 *   green  otherwise
 *
 * Only the month's planned work counts for the pace rules; a month with
 * nothing planned has no pace to judge.
 */
export function engagementHealth(input: {
  month: string;
  lines: readonly Pick<ScopeLine, "planned">[];
  deliverables: readonly Pick<
    Deliverable,
    "status" | "due_on" | "blocked" | "blocked_at"
  >[];
  today?: string;
}): Health {
  const today = input.today ?? todayKey();
  const elapsed = monthElapsed(input.month, today);
  const { planned, done, ratio } = cycleProgress(
    input.lines,
    input.deliverables,
  );
  const blocked = input.deliverables.filter(
    (item) => item.blocked && !isDone(item),
  );
  const longest = Math.max(
    0,
    ...blocked.map((item) => blockedDays(item, today) ?? 0),
  );
  const late = input.deliverables.filter((item) => isLate(item, today)).length;
  const pace = `${done} of ${planned} done, ${Math.round(elapsed * 100)}% of the month gone`;

  const red: string[] = [];
  if (blocked.length && longest > BLOCKED_RED_DAYS)
    red.push(`blocked for ${plural(longest, "day")}`);
  if (planned > 0 && elapsed > 0.75 && ratio < 0.5) red.push(pace);
  if (red.length) return { level: "red", reason: capital(red.join("; ")) };

  const amber: string[] = [];
  if (blocked.length) amber.push(`${plural(blocked.length, "item")} blocked`);
  if (late) amber.push(`${plural(late, "item")} late`);
  if (planned > 0 && elapsed > 0.5 && ratio < 0.25) amber.push(pace);
  if (amber.length)
    return { level: "amber", reason: capital(amber.join("; ")) };

  return {
    level: "green",
    reason: planned > 0 ? capital(pace) : "Nothing planned yet this month",
  };
}

function capital(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* --------------------------------------------------------- engagements */

export type EngagementRow = {
  engagement: Engagement;
  client: ClientAccount | null;
  /** This month's cycle, or null when it hasn't been started. */
  cycle: Cycle | null;
  progress: Progress;
  /** In Client review (waiting on the client included). */
  inClientReview: number;
  /** Past the client's reply date, or blocked on the client. */
  waitingOnClient: number;
  blocked: number;
  late: number;
  /** The latest change to the cycle or any of its deliverables (ISO), or null. */
  lastUpdate: string | null;
  health: Health;
};

/**
 * One row per engagement that hasn't ended, for the overview: the month's
 * progress, what's with the client, blocked and late, and health. `cycles`,
 * `lines` and `deliverables` are one month's (loadClientWork). Red first,
 * then amber, then by client name.
 */
export function engagementRows(input: {
  clients: readonly ClientAccount[];
  engagements: readonly Engagement[];
  cycles: readonly Cycle[];
  lines: readonly ScopeLine[];
  deliverables: readonly Deliverable[];
  today?: string;
  includeEnded?: boolean;
}): EngagementRow[] {
  const today = input.today ?? todayKey();
  const clients = new Map(input.clients.map((client) => [client.id, client]));
  const rank: Record<HealthLevel, number> = { red: 0, amber: 1, green: 2 };
  return input.engagements
    .filter((engagement) => input.includeEnded || engagement.status !== "ended")
    .map((engagement): EngagementRow => {
      const cycle =
        input.cycles.find((item) => item.engagement_id === engagement.id) ??
        null;
      const lines = cycle
        ? input.lines.filter((item) => item.cycle_id === cycle.id)
        : [];
      const items = cycle
        ? input.deliverables.filter((item) => item.cycle_id === cycle.id)
        : [];
      const open = items.filter((item) => !isDone(item));
      let lastUpdate = cycle?.updated_at ?? null;
      for (const item of items)
        if (!lastUpdate || item.updated_at > lastUpdate)
          lastUpdate = item.updated_at;
      return {
        engagement,
        client: clients.get(engagement.client_id) ?? null,
        cycle,
        progress: cycleProgress(lines, items),
        inClientReview: open.filter((item) => item.status === "client_review")
          .length,
        waitingOnClient: open.filter((item) => waitsOnClient(item, today))
          .length,
        blocked: open.filter((item) => item.blocked).length,
        late: open.filter((item) => isLate(item, today)).length,
        lastUpdate,
        health: cycle
          ? engagementHealth({
              month: cycle.month,
              lines,
              deliverables: items,
              today,
            })
          : engagement.status === "active"
            ? { level: "amber", reason: "This month hasn't been started yet" }
            : { level: "green", reason: "Not running this month" },
      };
    })
    .sort(
      (a, b) =>
        rank[a.health.level] - rank[b.health.level] ||
        (a.client?.name ?? "").localeCompare(b.client?.name ?? "") ||
        a.engagement.name.localeCompare(b.engagement.name),
    );
}

/* ---------------------------------------------------------- owner load */

export type OwnerLoad = {
  email: string;
  name: string;
  /** Weekly capacity in points; null when they have no capacity row. */
  capacity: number | null;
  /** Points of open work due this week. */
  points: number;
  /** How many open items are due this week. */
  due: number;
  /** points > capacity. */
  over: boolean;
  /** Their own items in internal or client review. */
  inReview: number;
  /** Items in internal review where they're the reviewer. */
  toReview: number;
  /** Their own items flagged blocked. */
  blocked: number;
  /** Their own items past due. */
  late: number;
};

/**
 * Per person, for a week: points due against capacity, plus their items in
 * review, waiting on their review, blocked and late. Everyone with a
 * capacity row (active) is listed, plus anyone who owns or reviews open work.
 */
export function ownerLoad(
  people: readonly Pick<
    ClientPerson,
    "email" | "name" | "weekly_capacity" | "active"
  >[],
  deliverables: readonly Deliverable[],
  week: string,
  today = todayKey(),
): OwnerLoad[] {
  const names: Record<string, string> = {};
  for (const person of people)
    if (person.name) names[person.email.toLowerCase()] = person.name;
  const rows = new Map<string, OwnerLoad>();
  const row = (email: string) => {
    const key = email.trim().toLowerCase();
    let found = rows.get(key);
    if (!found) {
      const person = people.find((item) => item.email.toLowerCase() === key);
      found = {
        email: key,
        name: personName(key, names),
        capacity: person ? person.weekly_capacity : null,
        points: 0,
        due: 0,
        over: false,
        inReview: 0,
        toReview: 0,
        blocked: 0,
        late: 0,
      };
      rows.set(key, found);
    }
    return found;
  };
  for (const person of people) if (person.active) row(person.email);
  for (const item of deliverables) {
    if (isDone(item)) continue;
    if (item.owner && item.owner.includes("@")) {
      const load = row(item.owner);
      if (isDueInWeek(item, week)) {
        load.points += sizePoints(item);
        load.due++;
      }
      if (item.status === "internal_review" || item.status === "client_review")
        load.inReview++;
      if (item.blocked) load.blocked++;
      if (isLate(item, today)) load.late++;
    }
    if (
      item.reviewer &&
      item.reviewer.includes("@") &&
      item.status === "internal_review"
    )
      row(item.reviewer).toReview++;
  }
  for (const load of rows.values())
    load.over = load.capacity !== null && load.points > load.capacity;
  return [...rows.values()].sort(
    (a, b) =>
      Number(b.over) - Number(a.over) ||
      b.points - a.points ||
      a.name.localeCompare(b.name),
  );
}

/* -------------------------------------------------------------- report */

export type ReportState =
  | "live"
  | "approved"
  | "with_client"
  | "waiting_on_client"
  | "in_review"
  | "in_progress"
  | "blocked"
  | "not_started";

export const REPORT_STATES: Record<ReportState, string> = {
  live: "Live",
  approved: "Approved, not live yet",
  with_client: "With the client for review",
  waiting_on_client: "Waiting on the client",
  in_review: "In our review",
  in_progress: "In progress",
  blocked: "Blocked",
  not_started: "Not started",
};

export type ReportRow = {
  id: string;
  title: string;
  kind: string;
  state: ReportState;
  /** Plain words for the state. */
  stateLabel: string;
  /** Live or approved: ready. */
  ready: boolean;
  owner: string;
  /** Live: when it went live; otherwise when it's due ("" for no date). */
  date: string;
  /** "Live 12 Nov", "Due 20 Nov", "Client to reply by 18 Nov". */
  dateLabel: string;
  /** The block reason, when blocked. */
  note: string;
  /** The live link, only when published. */
  url: string | null;
};

export function reportState(
  deliverable: Deliverable,
  today = todayKey(),
): ReportState {
  if (deliverable.status === "published") return "live";
  if (deliverable.blocked)
    return deliverable.waits_on === "client" ? "waiting_on_client" : "blocked";
  if (deliverable.status === "approved") return "approved";
  if (deliverable.status === "client_review")
    return isWaitingOnClient(deliverable, today)
      ? "waiting_on_client"
      : "with_client";
  if (deliverable.status === "internal_review") return "in_review";
  if (deliverable.status === "planned") return "not_started";
  return "in_progress";
}

/**
 * One row per deliverable answering the client's question: what's ready,
 * what's missing, who owns it and when it'll land. Ready first, then by
 * date. Draft and review links are never included, only live ones.
 */
export function reportRows(
  deliverables: readonly Deliverable[],
  options: { today?: string; names?: Readonly<Record<string, string>> } = {},
): ReportRow[] {
  const today = options.today ?? todayKey();
  const rank: Record<ReportState, number> = {
    live: 0,
    approved: 1,
    with_client: 2,
    waiting_on_client: 3,
    in_review: 4,
    in_progress: 5,
    blocked: 6,
    not_started: 7,
  };
  return deliverables
    .map((item): ReportRow => {
      const state = reportState(item, today);
      const live = item.published_at
        ? todayKey(new Date(item.published_at))
        : "";
      // Only a piece that's with the client for review has a reply date. One
      // blocked on the client at another step keeps our own due date.
      const clientDate =
        item.status === "client_review" &&
        (state === "with_client" || state === "waiting_on_client");
      const date =
        state === "live"
          ? live
          : clientDate
            ? (item.client_due_on ?? item.due_on ?? "")
            : (item.due_on ?? "");
      const dateLabel = !date
        ? ""
        : state === "live"
          ? `Live ${formatDay(date, today)}`
          : clientDate
            ? `Client to reply by ${formatDay(date, today)}`
            : `Due ${formatDay(date, today)}`;
      return {
        id: item.id,
        title: item.title,
        kind: labelOf(DELIVERABLE_KINDS, item.kind),
        state,
        stateLabel: REPORT_STATES[state],
        ready: state === "live" || state === "approved",
        owner: personName(item.owner, options.names),
        date,
        dateLabel,
        note: item.blocked ? item.block_reason : "",
        url: item.status === "published" ? item.published_url : null,
      };
    })
    .sort(
      (a, b) =>
        rank[a.state] - rank[b.state] ||
        (a.date || "9999").localeCompare(b.date || "9999") ||
        a.title.localeCompare(b.title),
    );
}

export type Slipped = {
  deliverable: Deliverable;
  /** Why, in plain words. */
  reason: string;
};

/**
 * What slipped in a month's cycle: everything not published by the end of
 * the month (or, for the current month, already past its due date), with
 * the reason: the block, the client, or plain late.
 */
export function slippedItems(
  cycle: Pick<Cycle, "month">,
  deliverables: readonly Deliverable[],
  today = todayKey(),
): Slipped[] {
  const monthOver = lastDay(cycle.month) < today;
  return deliverables
    .filter(
      (item) =>
        !isDone(item) &&
        (monthOver || isLate(item, today) || isWaitingOnClient(item, today)),
    )
    .map((item) => ({
      deliverable: item,
      reason: item.blocked
        ? `Blocked, waiting on ${labelOf(WAITS_ON, item.waits_on).toLowerCase()}: ${item.block_reason}`
        : isWaitingOnClient(item, today)
          ? `Waiting on the client since ${formatDay(item.client_due_on, today)}`
          : item.status === "client_review"
            ? "With the client for review"
            : item.status === "approved"
              ? "Approved, not published yet"
              : item.due_on && item.due_on < today
                ? `Late: was due ${formatDay(item.due_on, today)}`
                : "Not finished this month",
    }));
}

/* --------------------------------------------------------- sidebar etc. */

/**
 * What needs this person: their own late items, items waiting on their
 * review (internal review, they're the reviewer), and blocked items on the
 * engagements they own.
 */
export function needsMe(
  email: string,
  deliverables: readonly Deliverable[],
  ownedEngagementIds: ReadonlySet<string>,
  today = todayKey(),
) {
  let late = 0;
  let due = 0;
  let toReview = 0;
  let blocked = 0;
  const soon = addDays(today, 7);
  for (const item of deliverables) {
    if (isDone(item)) continue;
    if (isOwnedBy(item.owner, email)) {
      if (isLate(item, today)) late++;
      // Due in the next 7 days and still ours to move.
      else if (
        item.due_on &&
        item.due_on <= soon &&
        item.status !== "client_review"
      )
        due++;
    }
    if (isOwnedBy(item.reviewer, email) && item.status === "internal_review")
      toReview++;
    if (item.blocked && ownedEngagementIds.has(item.engagement_id)) blocked++;
  }
  return { late, due, toReview, blocked };
}
