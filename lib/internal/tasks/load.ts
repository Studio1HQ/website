import "server-only";
import type { Staff } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { listPeople } from "@/lib/internal/team/people";
import { istNow, type TeamPerson } from "@/lib/internal/team/shared";
import { clientPath, weekStart, type Deliverable } from "@/lib/internal/clients/schema";
import { canSeeOthers, canSeeTasksOf, isFounder, type TaskViewer } from "@/lib/internal/tasks/access";
import {
  choicesFor,
  engagementChoices,
  engagementLabels,
  guardedEmails,
  listLogs,
  listTasks,
  movesBy,
  ownedCommunityTasks,
  ownedDeliverables,
  reportDeliverable,
  reviewingDeliverables,
  type Loaded,
} from "@/lib/internal/tasks/data";
import { buildSnapshot, istDay } from "@/lib/internal/tasks/report";
import { linkOptions } from "@/lib/internal/tasks/board-data";
import { placeCards } from "@/lib/internal/tasks/calendar";
import {
  periodEnd,
  type CommunityCard,
  type EngagementLabel,
  type LinkOption,
  type ReportPeriod,
  type ReportSnapshot,
  type Task,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

/**
 * Page loaders for Tasks: whose boards the viewer may open, one person's
 * board, and a report's snapshot. Server only.
 */

export function taskViewer(staff: Staff): TaskViewer {
  return { email: staff.email, roles: staff.roles, status: staff.status, interns: staff.interns };
}

export type VisiblePerson = Pick<TeamPerson, "email" | "name" | "kind" | "designation" | "photo_path"> & {
  /** A founder or admin: hidden from everyone but the founders. */
  guarded: boolean;
};

/**
 * The people on the team list this viewer may see the tasks of (themselves
 * first), active ones only.
 */
export async function visiblePeople(staff: Staff): Promise<{ people: VisiblePerson[]; failed: boolean }> {
  const viewer = taskViewer(staff);
  if (!canSeeOthers(viewer)) {
    return {
      people: staff.person
        ? [{ ...pick(staff.person), guarded: false }]
        : [],
      failed: false,
    };
  }
  // If who's an admin can't be read, everyone else counts as guarded (fails closed).
  const [people, guarded] = await Promise.all([listPeople({ activeOnly: true }), guardedEmails().catch(() => null)]);
  if (!people.ok) return { people: staff.person ? [{ ...pick(staff.person), guarded: false }] : [], failed: true };
  const visible = people.people
    .map((person) => ({ ...pick(person), guarded: guarded ? guarded.has(person.email.toLowerCase()) : true }))
    .filter((person) => canSeeTasksOf(viewer, person));
  const me = staff.email.toLowerCase();
  visible.sort((a, b) => Number(b.email === me) - Number(a.email === me) || (a.name || a.email).localeCompare(b.name || b.email));
  return { people: visible, failed: guarded === null };
}

function pick(person: TeamPerson) {
  return {
    email: person.email,
    name: person.name,
    kind: person.kind,
    designation: person.designation,
    photo_path: person.photo_path,
  };
}

export type BoardData = {
  email: string;
  week: string;
  tasks: Task[];
  /** Client deliverables they own (open, or published this week). */
  deliverables: Deliverable[];
  /** Waiting on their internal review. */
  reviewing: Deliverable[];
  community: CommunityCard[];
  engagements: Map<string, EngagementLabel>;
  failed: string | null;
  missing: boolean;
};

function problem(...results: Loaded<unknown>[]) {
  const failed = results.find((result) => !result.ok);
  return failed && !failed.ok ? failed : null;
}

/**
 * One person's board for a week: their open work from all three places
 * (their own tasks, the client deliverables they own, the community tasks
 * assigned to them) and what was finished that week.
 */
export async function loadBoard(email: string, week: string): Promise<BoardData> {
  email = email.toLowerCase();
  const to = addDaysKey(week, 6);
  const [tasks, deliverables, reviewing, community, engagements] = await Promise.all([
    listTasks({ emails: [email], from: week, to }),
    ownedDeliverables(email, week),
    reviewingDeliverables(email),
    ownedCommunityTasks(email, week),
    engagementLabels(),
  ]);
  const failed = problem(tasks, deliverables, reviewing, community);
  return {
    email,
    week,
    tasks: tasks.ok ? tasks.rows : [],
    deliverables: deliverables.ok ? deliverables.rows : [],
    reviewing: reviewing.ok ? reviewing.rows : [],
    community: community.ok ? community.rows : [],
    engagements,
    failed: failed ? failed.message : null,
    missing: !tasks.ok && tasks.missing,
  };
}

function addDaysKey(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Logs for some people between two days. */
export function loadLogs(emails: readonly string[], from: string, to: string): Promise<Loaded<WorkLog>> {
  return listLogs({ emails, from, to });
}

/**
 * What a report for this person and period shows right now, from live
 * data. A submitted report keeps the snapshot it was sent with instead.
 */
export async function liveSnapshot(
  email: string,
  period: ReportPeriod,
  start: string,
): Promise<{ ok: true; snapshot: ReportSnapshot } | { ok: false; message: string }> {
  const end = periodEnd(period, start);
  const [logs, tasks, deliverables, community, moves, days, engagements] = await Promise.all([
    listLogs({ emails: [email], from: start, to: end }),
    listTasks({ emails: [email], from: start, to: end }),
    ownedDeliverables(email, start),
    ownedCommunityTasks(email, start),
    movesBy(email, start, end),
    listDays({ from: start, to: end, emails: [email] }),
    engagementLabels(),
  ]);
  const failed = problem(logs, tasks, deliverables, community, moves);
  if (failed) return { ok: false, message: failed.message };
  return {
    ok: true,
    snapshot: buildSnapshot({
      period,
      starts_on: start,
      ends_on: end,
      attendance: days.ok ? days.days : null,
      logs: logs.ok ? logs.rows : [],
      tasks: tasks.ok ? tasks.rows : [],
      deliverables: deliverables.ok ? deliverables.rows.map(reportDeliverable) : [],
      community: community.ok ? community.rows : [],
      moves: moves.ok ? moves.rows : [],
      engagements,
    }),
  };
}

/** This week's Monday in IST. */
export function thisWeek() {
  return weekStart(istNow().date);
}

export { isFounder };

/**
 * One person's week on the calendar: their cards per day and the "No day
 * yet" tray (see placeCards in lib/internal/tasks/calendar.ts).
 */
export async function loadWeekCards(email: string, week: string, today: string, names?: Record<string, string>) {
  email = email.toLowerCase();
  const end = addDaysKey(week, 6);
  const [tasks, deliverables, community, engagements] = await Promise.all([
    listTasks({ emails: [email], from: week, to: end }),
    ownedDeliverables(email, week),
    ownedCommunityTasks(email, week),
    engagementLabels(),
  ]);
  const placed = placeCards({
    week,
    end,
    today,
    person: email,
    tasks: tasks.ok ? tasks.rows : [],
    deliverables: deliverables.ok ? deliverables.rows : [],
    community: community.ok ? community.rows : [],
    engagements,
    dayOf: istDay,
    names,
    clientPath,
  });
  const failed = [tasks, deliverables, community].find((result) => !result.ok);
  return {
    ...placed,
    failed: failed && !failed.ok ? failed.message : null,
    missing: !tasks.ok && tasks.missing,
  };
}

/**
 * What a card can be for (the "For" picker): Studio1 and its areas, the
 * running clients (for people who can open client work) and their own open
 * client deliverables.
 */
export async function cardChoices(staff: Staff): Promise<LinkOption[]> {
  const [board, choices] = await Promise.all([
    loadBoard(staff.email, thisWeek()),
    staff.clients ? engagementChoices().then((list) => choicesFor(staff.clientScope, list)) : Promise.resolve([]),
  ]);
  // Their own deliverables too: only on clients they may open (People).
  const mayOpen = (item: Deliverable) => {
    const label = board.engagements.get(item.engagement_id);
    return label ? choicesFor(staff.clientScope, [label]).length > 0 : false;
  };
  const scoped =
    staff.clientScope === null
      ? board
      : { ...board, deliverables: board.deliverables.filter(mayOpen), reviewing: board.reviewing.filter(mayOpen) };
  return linkOptions(scoped, choices).filter(
    (option) => option.group === "studio" || option.group === "client" || option.group === "deliverable",
  );
}
