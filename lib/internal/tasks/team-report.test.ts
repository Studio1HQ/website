import { describe, expect, it } from "vitest";
import {
  piecesLabel,
  teamRows,
  teamTotals,
} from "@/lib/internal/tasks/team-report";
import type { EngagementLabel } from "@/lib/internal/tasks/shared";

const engagements = new Map<string, EngagementLabel>([
  [
    "e1",
    {
      id: "e1",
      name: "Retainer",
      client: "Nebius",
      clientId: "c1",
      internal: false,
    } as EngagementLabel,
  ],
]);

const rows = teamRows({
  people: [
    { email: "Priya@studio1hq.com", name: "Priya" },
    { email: "dev@studio1hq.com", name: "Dev" },
  ],
  from: "2026-11-16",
  to: "2026-11-22",
  today: "2026-11-20",
  days: [
    {
      email: "priya@studio1hq.com",
      day: "2026-11-16",
      kind: "work",
      active_minutes: 480,
    },
    {
      email: "priya@studio1hq.com",
      day: "2026-11-17",
      kind: "half_day",
      active_minutes: 240,
    },
    {
      email: "priya@studio1hq.com",
      day: "2026-11-18",
      kind: "leave",
      active_minutes: 60,
    },
    // Outside the week.
    {
      email: "priya@studio1hq.com",
      day: "2026-11-23",
      kind: "work",
      active_minutes: 600,
    },
  ],
  logs: [
    {
      email: "priya@studio1hq.com",
      day: "2026-11-16",
      minutes: 120,
      engagement_id: "e1",
      area: "client",
    },
    {
      email: "priya@studio1hq.com",
      day: "2026-11-16",
      minutes: 60,
      engagement_id: null,
      area: "other",
    },
    {
      email: "dev@studio1hq.com",
      day: "2026-11-17",
      minutes: 90,
      engagement_id: null,
      area: "other",
    },
    {
      email: "dev@studio1hq.com",
      day: "2026-11-19",
      minutes: 30,
      engagement_id: null,
      area: "other",
    },
  ],
  tasks: [
    {
      email: "priya@studio1hq.com",
      status: "done",
      done_on: "2026-11-17",
      due_on: null,
      blocked: false,
    },
    {
      email: "priya@studio1hq.com",
      status: "done",
      done_on: "2026-11-10",
      due_on: null,
      blocked: false,
    },
    {
      email: "priya@studio1hq.com",
      status: "todo",
      done_on: null,
      due_on: "2026-11-18",
      blocked: true,
    },
    {
      email: "priya@studio1hq.com",
      status: "doing",
      done_on: null,
      due_on: "2026-11-25",
      blocked: false,
    },
  ],
  pieces: [
    { owner: "priya@studio1hq.com", size: "M" },
    { owner: "PRIYA@studio1hq.com", size: "S" },
    { owner: null, size: "L" },
  ],
  engagements,
});

describe("team report", () => {
  it("adds up each person's week", () => {
    const priya = rows[0];
    expect(priya).toMatchObject({
      name: "Priya",
      daysWorked: 1.5,
      leave: 1,
      clocked: 720,
      logged: 180,
      clientMinutes: 120,
      studioMinutes: 60,
      // Clocked over days at work.
      perDay: 480,
      tasksDone: 1,
      tasksOpen: 2,
      tasksLate: 1,
      tasksBlocked: 1,
      pieces: { S: 1, M: 1, L: 0 },
      published: 2,
      points: 3,
    });
  });

  it("falls back to logged time over the days logged when nothing was clocked", () => {
    const dev = rows[1];
    expect(dev).toMatchObject({
      clocked: 0,
      logged: 120,
      loggedDays: 2,
      perDay: 60,
      tasksDone: 0,
    });
  });

  it("leaves attendance blank when it couldn't be read", () => {
    const [only] = teamRows({
      people: [{ email: "dev@studio1hq.com", name: "Dev" }],
      from: "2026-11-16",
      to: "2026-11-22",
      today: "2026-11-20",
      days: null,
      logs: [],
      tasks: [],
      pieces: [],
      engagements,
    });
    expect(only).toMatchObject({
      daysWorked: null,
      clocked: null,
      leave: null,
      perDay: null,
    });
  });

  it("counts a shared task for everyone on it", () => {
    const [dev, priya] = teamRows({
      people: [
        { email: "dev@studio1hq.com", name: "Dev" },
        { email: "priya@studio1hq.com", name: "Priya" },
      ],
      from: "2026-11-16",
      to: "2026-11-22",
      today: "2026-11-20",
      days: null,
      logs: [],
      tasks: [
        { email: "priya@studio1hq.com", with_emails: ["dev@studio1hq.com"], status: "done", done_on: "2026-11-17", due_on: null, blocked: false },
      ],
      pieces: [],
      engagements,
    });
    expect([dev.tasksDone, priya.tasksDone]).toEqual([1, 1]);
  });

  it("totals the team", () => {
    expect(teamTotals(rows)).toEqual({
      clocked: 720,
      logged: 300,
      clientMinutes: 120,
      tasksDone: 1,
      tasksLate: 1,
      published: 2,
      points: 3,
      perDay: 270,
    });
    expect(teamTotals([]).perDay).toBeNull();
  });

  it("writes sizes shortly", () => {
    expect(piecesLabel({ S: 2, M: 0, L: 1 })).toBe("S 2 · L 1");
    expect(piecesLabel({ S: 0, M: 0, L: 0 })).toBe("");
  });
});
