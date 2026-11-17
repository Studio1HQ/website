import { describe, expect, it } from "vitest";
import type { Call } from "@/lib/internal/calls/shared";
import type { Org } from "@/lib/internal/outreach/schema";
import { outreachSummary, todayCalls, todayTasks } from "@/lib/internal/overview-today";
import type { Task } from "@/lib/internal/tasks/shared";

const TODAY = "2026-11-18"; // a Wednesday
const ME = "arindam@studio1hq.com";

const task = (id: string, due_on: string | null, status: Task["status"] = "todo") =>
  ({ id, title: `Task ${id}`, due_on, status, blocked: false, created_at: `2026-11-01T00:00:0${id}Z` }) as Task;

const call = (id: string, patch: Partial<Call>) =>
  ({
    id,
    title: `Call ${id}`,
    link: "",
    host: null,
    people: [],
    whole_team: false,
    repeat: "once",
    days: [],
    every_weeks: 1,
    starts_on: TODAY,
    ends_on: null,
    start_time: "10:00",
    minutes: 30,
    ...patch,
  }) as Call;

describe("the Overview's tasks for today", () => {
  it("lists open tasks due today or earlier, the longest overdue first", () => {
    const result = todayTasks(
      [task("1", TODAY), task("2", "2026-11-16"), task("3", "2026-11-19"), task("4", null), task("5", "2026-11-10", "done")],
      TODAY,
    );
    expect(result.items.map((item) => [item.id, item.late])).toEqual([
      ["2", true],
      ["1", false],
    ]);
    expect(result.more).toBe(0);
  });

  it("says how many more there are past the limit", () => {
    const result = todayTasks([task("1", TODAY), task("2", TODAY), task("3", TODAY)], TODAY, 2);
    expect(result.items).toHaveLength(2);
    expect(result.more).toBe(1);
  });
});

describe("the Overview's calls for today", () => {
  it("shows only the calls this person is in, earliest first, and marks finished ones", () => {
    const calls = [
      call("a", { people: [ME], start_time: "15:00" }),
      call("b", { whole_team: true, start_time: "09:30" }),
      call("c", { people: ["nancy@studio1hq.com"] }),
      call("d", { host: ME, starts_on: "2026-11-19" }),
    ];
    const result = todayCalls(calls, [], ME, TODAY, "12:00");
    expect(result.map((item) => [item.title, item.over])).toEqual([
      ["Call b", true],
      ["Call a", false],
    ]);
  });

  it("leaves out a call cancelled for today", () => {
    const calls = [call("a", { people: [ME] })];
    const changes = [{ id: "x", call_id: "a", on_day: TODAY, cancelled: true, moved_day: null, moved_time: null, note: "", created_by: ME }];
    expect(todayCalls(calls, changes, ME, TODAY, "08:00")).toEqual([]);
  });
});

describe("the Overview's outreach numbers", () => {
  it("counts what's in play, follow-ups due and this month's wins", () => {
    const org = (stage: Org["stage"], patch: Partial<Org> = {}) =>
      ({ stage, follow_up_on: null, closed_on: null, created_at: "2026-11-17T06:00:00Z", ...patch }) as Org;
    expect(
      outreachSummary(
        [
          org("lead", { follow_up_on: "2026-11-17" }),
          org("call_booked", { follow_up_on: "2026-11-20" }),
          org("proposal"),
          org("won", { closed_on: "2026-11-03" }),
          org("won", { closed_on: "2026-10-28" }),
          org("lost", { follow_up_on: "2026-11-01" }),
        ],
        TODAY,
        Date.parse("2026-11-18T12:00:00Z"),
      ),
    ).toEqual({ open: 3, callBooked: 1, proposal: 1, followUpsDue: 1, addedByWeek: [0, 0, 0, 0, 0, 0, 0, 6], wonThisMonth: 1 });
  });
});
