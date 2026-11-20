/**
 * The team report: one row per person for a week or a month, built from
 * attendance, work logs, tasks and published client pieces. Pure; the data
 * comes in (lib/internal/tasks/team-report-data.ts reads it).
 */

import type { AttendanceDay } from "@/lib/internal/team/shared";
import { SIZE_POINTS, type Size } from "@/lib/internal/clients/schema";
import {
  forKey,
  isClientKey,
  type EngagementLabel,
  type Task,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

/** A client piece that went live in the period. */
export type PublishedPiece = { owner: string | null; size: Size };

export type TeamRow = {
  email: string;
  name: string;
  /** Days at work (a half day counts as half); null when attendance couldn't be read. */
  daysWorked: number | null;
  leave: number | null;
  /** Minutes clocked on attendance; null when it couldn't be read. */
  clocked: number | null;
  /** Minutes logged on tasks and client work. */
  logged: number;
  loggedDays: number;
  /**
   * Minutes a working day: clocked over days at work, or logged over the
   * days with a log when nothing was clocked. Null with no day to divide by.
   */
  perDay: number | null;
  clientMinutes: number;
  studioMinutes: number;
  tasksDone: number;
  /** As things stand today, whatever period is shown. */
  tasksOpen: number;
  tasksLate: number;
  tasksBlocked: number;
  /** Client pieces published, by size. */
  pieces: Record<Size, number>;
  published: number;
  points: number;
};

export type TeamInput = {
  people: readonly { email: string; name: string }[];
  from: string;
  to: string;
  today: string;
  /** Null when attendance couldn't be read. */
  days:
    | readonly Pick<
        AttendanceDay,
        "email" | "day" | "kind" | "active_minutes"
      >[]
    | null;
  logs: readonly Pick<
    WorkLog,
    "email" | "day" | "minutes" | "engagement_id" | "area"
  >[];
  /** Open tasks, and the ones done in the period. Shared ones count for everyone on them. */
  tasks: readonly (Pick<Task, "email" | "status" | "done_on" | "due_on" | "blocked"> & {
    with_emails?: readonly string[];
  })[];
  pieces: readonly PublishedPiece[];
  engagements: ReadonlyMap<string, EngagementLabel>;
};

const inside = (day: string | null | undefined, from: string, to: string) =>
  Boolean(day && day >= from && day <= to);

/** One row per person, most hours first. */
export function teamRows(input: TeamInput): TeamRow[] {
  const { from, to, today, engagements } = input;
  return input.people
    .map((person) => {
      const email = person.email.toLowerCase();
      const mine = <T extends { email: string }>(rows: readonly T[]) =>
        rows.filter((row) => row.email.toLowerCase() === email);

      const days = input.days
        ? mine(input.days).filter((day) => inside(day.day, from, to))
        : null;
      const daysWorked = days
        ? days.reduce(
            (sum, day) =>
              sum +
              (day.kind === "work" ? 1 : day.kind === "half_day" ? 0.5 : 0),
            0,
          )
        : null;
      const clocked = days
        ? days.reduce(
            (sum, day) =>
              sum + (day.kind === "leave" ? 0 : (day.active_minutes ?? 0)),
            0,
          )
        : null;

      const logs = mine(input.logs).filter(
        (log) => inside(log.day, from, to) && log.minutes > 0,
      );
      const logged = logs.reduce((sum, log) => sum + log.minutes, 0);
      const loggedDays = new Set(logs.map((log) => log.day)).size;
      const clientMinutes = logs
        .filter((log) => isClientKey(forKey(log), engagements))
        .reduce((sum, log) => sum + log.minutes, 0);

      const perDay =
        clocked && daysWorked
          ? Math.round(clocked / daysWorked)
          : logged && loggedDays
            ? Math.round(logged / loggedDays)
            : null;

      const tasks = input.tasks.filter(
        (task) => task.email.toLowerCase() === email || task.with_emails?.some((other) => other.toLowerCase() === email),
      );
      const open = tasks.filter((task) => task.status !== "done");
      const pieces: Record<Size, number> = { S: 0, M: 0, L: 0 };
      for (const piece of input.pieces)
        if (piece.owner?.toLowerCase() === email) pieces[piece.size] += 1;

      return {
        email,
        name: person.name,
        daysWorked,
        leave: days ? days.filter((day) => day.kind === "leave").length : null,
        clocked,
        logged,
        loggedDays,
        perDay,
        clientMinutes,
        studioMinutes: logged - clientMinutes,
        tasksDone: tasks.filter(
          (task) => task.status === "done" && inside(task.done_on, from, to),
        ).length,
        tasksOpen: open.length,
        tasksLate: open.filter((task) => task.due_on && task.due_on < today)
          .length,
        tasksBlocked: open.filter((task) => task.blocked).length,
        pieces,
        published: pieces.S + pieces.M + pieces.L,
        points:
          pieces.S * SIZE_POINTS.S +
          pieces.M * SIZE_POINTS.M +
          pieces.L * SIZE_POINTS.L,
      };
    })
    .sort(
      (a, b) =>
        (b.clocked ?? 0) + b.logged - ((a.clocked ?? 0) + a.logged) ||
        b.tasksDone - a.tasksDone ||
        a.name.localeCompare(b.name),
    );
}

/** The team's totals, and the average working day across people who have one. */
export function teamTotals(rows: readonly TeamRow[]) {
  const sum = (pick: (row: TeamRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const withDay = rows.filter((row) => row.perDay !== null);
  return {
    clocked: sum((row) => row.clocked ?? 0),
    logged: sum((row) => row.logged),
    clientMinutes: sum((row) => row.clientMinutes),
    tasksDone: sum((row) => row.tasksDone),
    tasksLate: sum((row) => row.tasksLate),
    published: sum((row) => row.published),
    points: sum((row) => row.points),
    perDay: withDay.length
      ? Math.round(
          withDay.reduce((total, row) => total + (row.perDay ?? 0), 0) /
            withDay.length,
        )
      : null,
  };
}

/** "S 2 · M 1": the sizes of what someone published; "" for nothing. */
export function piecesLabel(pieces: Record<Size, number>) {
  return (["S", "M", "L"] as const)
    .filter((size) => pieces[size] > 0)
    .map((size) => `${size} ${pieces[size]}`)
    .join(" · ");
}
