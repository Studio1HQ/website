import { describe, expect, it } from "vitest";
import {
  datesLabel,
  dayBounds,
  followUpDraft,
  followUpHtml,
  hourMinutes,
  istHour,
  reviewLine,
  reviewPerson,
  reviewTeam,
  timingOf,
  type ReviewInput,
} from "@/lib/internal/team/review";
import type { EngagementLabel, Task } from "@/lib/internal/tasks/shared";

// Thursday 26 Nov 2026; the review starts Monday 16 Nov. Working days so
// far: 16–20 and 23–25 (8).
const TODAY = "2026-11-26";
const WEEKDAYS = ["16", "17", "18", "19", "20", "23", "24", "25"].map((day) => `2026-11-${day}`);

const engagements = new Map<string, EngagementLabel>([
  ["e1", { id: "e1", client: "Nebius", name: "DevRel", internal: false }],
]);

type TaskRow = ReviewInput["tasks"][number];
function task(over: Partial<TaskRow> & { email?: string }): TaskRow {
  return {
    email: "a@studio1hq.com",
    with_emails: [],
    title: "A task",
    status: "todo",
    due_on: null,
    done_on: null,
    area: "content",
    engagement_id: null,
    slips: 0,
    missed_on: null,
    ...over,
  } as Pick<Task, keyof TaskRow> as TaskRow;
}

function worked(email: string, day: string, start = "10:00", end = "19:00", minutes = 540) {
  return { email, day, kind: "work" as const, slots: [{ start, end }], active_minutes: minutes };
}

function input(over: Partial<ReviewInput> = {}): ReviewInput {
  return {
    month: "2026-11",
    today: TODAY,
    people: [{ email: "a@studio1hq.com", name: "Asha Rao", kind: "employee", joined_on: null }],
    attendance: [],
    tasks: [],
    pieces: [],
    actions: [],
    engagements,
    ...over,
  };
}

const person = (data: ReviewInput) => reviewPerson(data, data.people[0]);

describe("hours", () => {
  it("splits slots into the hours of the day, past midnight too", () => {
    const hours = hourMinutes([{ start: "22:30", end: "01:15" }]);
    expect(hours[22]).toBe(30);
    expect(hours[23]).toBe(60);
    expect(hours[0]).toBe(60);
    expect(hours[1]).toBe(15);
    expect(hours.reduce((sum, value) => sum + value, 0)).toBe(165);
  });

  it("skips a slot still going", () => {
    expect(hourMinutes([{ start: "09:00", end: null }]).every((value) => value === 0)).toBe(true);
  });

  it("puts early-morning slots with the night before", () => {
    expect(
      dayBounds([
        { start: "00:17", end: "02:37" },
        { start: "10:00", end: "11:00" },
        { start: "21:30", end: "23:45" },
      ]),
    ).toEqual({ start: 600, end: 1425 });
    // An evening slot running past midnight ends at 26:00.
    expect(dayBounds([{ start: "18:00", end: "02:00" }])).toEqual({ start: 1080, end: 1560 });
    expect(dayBounds([])).toBeNull();
  });

  it("finds the usual day and the busiest hours on the dashboard", () => {
    const days = [
      { kind: "work" as const, slots: [{ start: "10:00", end: "19:00" }], active_minutes: 480 },
      { kind: "work" as const, slots: [{ start: "10:30", end: "20:00" }], active_minutes: 500 },
      { kind: "work" as const, slots: [{ start: "11:00", end: "01:00" }], active_minutes: 600 },
      { kind: "leave" as const, slots: [], active_minutes: null },
    ];
    const actions = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].flatMap((date) => [
      { date, hour: 19 },
      { date, hour: 20 },
      { date, hour: 20 },
    ]);
    const timing = timingOf(days, actions);
    expect(timing.start).toBe("10:30");
    expect(timing.end).toBe("20:00");
    expect(timing.endsNextDay).toBe(false);
    expect(timing.perDay).toBe(527);
    expect(timing.loggedDays).toBe(3);
    // 10:00 and 10:30 starts work in the 10 o'clock hour; the 11:00 one doesn't.
    expect(timing.worked[10]).toBe(2);
    expect(timing.worked[11]).toBe(3);
    expect(timing.worked[9]).toBe(0);
    expect(timing.worked[0]).toBe(1);
    // Two actions in the same hour of the same day count once.
    expect(timing.actions[20]).toBe(5);
    expect(timing.busiest).toEqual({ from: 18, to: 21 });
  });

  it("reads ISO times as IST", () => {
    expect(istHour("2026-11-25T18:45:00Z")).toEqual({ date: "2026-11-26", hour: 0 });
    expect(istHour("2026-11-26T04:30:00+00:00")).toEqual({ date: "2026-11-26", hour: 10 });
    expect(istHour("nope")).toBeNull();
  });
});

describe("reviewPerson", () => {
  it("is on track when every working day shows work and nothing slipped", () => {
    const review = person(
      input({
        attendance: WEEKDAYS.map((day) => worked("a@studio1hq.com", day)),
        tasks: [
          task({ status: "done", due_on: "2026-11-17", done_on: "2026-11-17" }),
          task({ status: "done", due_on: "2026-11-20", done_on: "2026-11-19", engagement_id: "e1", area: "client" }),
        ],
      }),
    );
    expect(review.status).toBe("on_track");
    expect(review.workingDays).toBe(8);
    expect(review.activeDays).toBe(8);
    expect(review.quietDays).toEqual([]);
    expect(review.done.map((item) => item.label)).toEqual(["Nebius · DevRel", "Studio1 · Content"]);
    expect(review.highlights).toEqual(["2 tasks done", "Active every working day (8)", "Nothing slipped"]);
    expect(review.timing.start).toBe("10:00");
    expect(review.days.find((day) => day.date === TODAY)?.state).toBe("today");
    expect(review.days.find((day) => day.date === "2026-11-27")?.state).toBe("ahead");
    expect(review.days.find((day) => day.date === "2026-11-10")?.state).toBe("before");
  });

  it("flags working days with no sign of work, and asks for a follow-up when there are many", () => {
    const review = person(
      input({
        attendance: [worked("a@studio1hq.com", "2026-11-16"), worked("a@studio1hq.com", "2026-11-17")],
        // Did something on the 18th without logging hours.
        actions: [{ email: "A@studio1hq.com", at: "2026-11-18T06:00:00Z" }],
        tasks: [task({ status: "done", due_on: "2026-11-17", done_on: "2026-11-17" })],
      }),
    );
    expect(review.quietDays).toEqual(["2026-11-19", "2026-11-20", "2026-11-23", "2026-11-24", "2026-11-25"]);
    expect(review.days.find((day) => day.date === "2026-11-18")?.state).toBe("active");
    expect(review.activeDays).toBe(3);
    expect(review.status).toBe("follow_up");
    expect(review.flags[0]).toEqual({
      level: "follow_up",
      text: "No sign of work on 5 working days (19, 20, 23, 24 and 25 Nov)",
    });
  });

  it("only watches two quiet days, and leave isn't quiet", () => {
    const attendance = WEEKDAYS.filter((day) => !["2026-11-19", "2026-11-20", "2026-11-23"].includes(day)).map((day) =>
      worked("a@studio1hq.com", day),
    );
    attendance.push({ email: "a@studio1hq.com", day: "2026-11-23", kind: "leave" as never, slots: [], active_minutes: 0 });
    const review = person(input({ attendance, tasks: [task({ status: "done", done_on: "2026-11-18" })] }));
    expect(review.leaveDays).toBe(1);
    expect(review.workingDays).toBe(7);
    expect(review.quietDays).toEqual(["2026-11-19", "2026-11-20"]);
    expect(review.status).toBe("watch");
  });

  it("counts from the day someone joined", () => {
    const data = input({
      people: [{ email: "a@studio1hq.com", name: "Asha", kind: "employee", joined_on: "2026-11-24" }],
      attendance: [worked("a@studio1hq.com", "2026-11-24")],
    });
    const review = person(data);
    expect(review.workingDays).toBe(2);
    // Too few days for the day rules: no quiet or nothing-done flag yet.
    expect(review.flags).toEqual([]);
    expect(review.status).toBe("on_track");
  });

  it("lists what slipped: done late, still open, pushed and handed in", () => {
    const review = person(
      input({
        attendance: WEEKDAYS.map((day) => worked("a@studio1hq.com", day)),
        tasks: [
          task({ title: "Late", status: "done", due_on: "2026-11-17", done_on: "2026-11-19" }),
          task({ title: "Open", status: "doing", due_on: "2026-11-20" }),
          // Pushed twice: counted from the day it first missed.
          task({ title: "Pushed", status: "todo", due_on: "2026-11-27", missed_on: "2026-11-18", slips: 2 }),
          task({ title: "Handed in", status: "review", due_on: "2026-11-24", missed_on: "2026-11-23", slips: 1 }),
          // In review on time, planned ahead, and from before the review: none slipped.
          task({ title: "Review", status: "review", due_on: "2026-11-20" }),
          task({ title: "Ahead", status: "todo", due_on: "2026-11-28" }),
          task({ title: "Old", status: "todo", due_on: "2026-11-10" }),
          task({ title: "On time", status: "done", due_on: "2026-11-20", done_on: "2026-11-20" }),
        ],
      }),
    );
    expect(review.slipped.map((item) => [item.title, item.days, item.moves, item.done])).toEqual([
      ["Pushed", 8, 2, null],
      ["Open", 6, 0, null],
      ["Handed in", 1, 1, null],
      ["Late", 2, 0, "2026-11-19"],
    ]);
    expect(review.done.find((item) => item.title === "Late")?.late).toBe(2);
    expect(review.flags).toContainEqual({ level: "watch", text: "4 tasks slipped past their day, 3 still open" });
    expect(review.status).toBe("watch");
  });

  it("follows up from six slips, client pieces included", () => {
    const late = (title: string) => task({ title, status: "todo", due_on: "2026-11-18" });
    const review = person(
      input({
        attendance: WEEKDAYS.map((day) => worked("a@studio1hq.com", day)),
        tasks: [late("1"), late("2"), late("3"), late("4"), task({ status: "done", done_on: "2026-11-20" })],
        pieces: [
          { owner: "a@studio1hq.com", title: "Blog", engagement_id: "e1", due_on: "2026-11-18", done_on: "2026-11-21", waiting: false },
          { owner: "a@studio1hq.com", title: "Video", engagement_id: "e1", due_on: "2026-11-19", done_on: null, waiting: false },
          // Waiting on the client: not late on our side.
          { owner: "a@studio1hq.com", title: "Guide", engagement_id: "e1", due_on: "2026-11-19", done_on: null, waiting: true },
          { owner: "b@studio1hq.com", title: "Theirs", engagement_id: "e1", due_on: "2026-11-19", done_on: null, waiting: false },
        ],
      }),
    );
    expect(review.slipped).toHaveLength(6);
    expect(review.flags[0]).toEqual({
      level: "follow_up",
      text: "4 tasks, 2 client pieces slipped past their day, 5 still open",
    });
    expect(review.done.find((item) => item.title === "Blog")).toMatchObject({ kind: "piece", late: 3, label: "Nebius · DevRel" });
  });

  it("counts a shared task for everyone on it", () => {
    const data = input({
      people: [
        { email: "a@studio1hq.com", name: "Asha", kind: "employee", joined_on: null },
        { email: "b@studio1hq.com", name: "Bilal", kind: "employee", joined_on: null },
      ],
      tasks: [task({ status: "done", done_on: "2026-11-18", with_emails: ["b@studio1hq.com"] })],
    });
    const [a, b] = data.people.map((someone) => reviewPerson(data, someone));
    expect(a.done).toHaveLength(1);
    expect(b.done).toHaveLength(1);
    // The day they finished it counts as a day with work.
    expect(b.days.find((day) => day.date === "2026-11-18")?.state).toBe("active");
  });

  it("asks for a follow-up when nothing was finished", () => {
    const review = person(input({ attendance: WEEKDAYS.map((day) => worked("a@studio1hq.com", day)) }));
    expect(review.flags).toContainEqual({ level: "follow_up", text: "Nothing marked done so far" });
  });

  it("watches short days for employees only", () => {
    const attendance = WEEKDAYS.map((day) => worked("a@studio1hq.com", day, "10:00", "14:00", 240));
    const tasks = [task({ status: "done", done_on: "2026-11-18" })];
    const employee = person(input({ attendance, tasks }));
    expect(employee.flags).toContainEqual({ level: "watch", text: "Averaging 4h a day over 8 logged days" });
    const intern = person(
      input({ attendance, tasks, people: [{ email: "a@studio1hq.com", name: "Asha", kind: "intern", joined_on: null }] }),
    );
    expect(intern.flags.some((flag) => flag.text.startsWith("Averaging"))).toBe(false);
  });

  it("notes days worked without hours, and a missing monthly report", () => {
    const review = person(
      input({
        month: "2026-10",
        today: TODAY,
        start: "2026-10-01",
        actions: ["2026-10-05", "2026-10-06", "2026-10-07"].map((day) => ({ email: "a@studio1hq.com", at: `${day}T06:00:00Z` })),
        reportsMissing: new Set(["a@studio1hq.com"]),
      }),
    );
    expect(review.unloggedDays).toBe(3);
    expect(review.flags).toContainEqual({ level: "note", text: "Worked 3 days without logging hours" });
    expect(review.flags).toContainEqual({ level: "watch", text: "Monthly report not sent" });
    // A month that's over says "done", not "done so far".
    expect(review.flags).toContainEqual({ level: "follow_up", text: "Nothing marked done" });
  });
});

describe("reviewTeam and wording", () => {
  it("puts the follow-ups first", () => {
    const data = input({
      people: [
        { email: "a@studio1hq.com", name: "Asha", kind: "employee", joined_on: null },
        { email: "b@studio1hq.com", name: "Bilal", kind: "employee", joined_on: null },
      ],
      attendance: WEEKDAYS.map((day) => worked("a@studio1hq.com", day)),
      tasks: [task({ status: "done", done_on: "2026-11-18" })],
    });
    expect(reviewTeam(data).map((review) => [review.name, review.status])).toEqual([
      ["Bilal", "follow_up"],
      ["Asha", "on_track"],
    ]);
  });

  it("names days and sums up a person in a line", () => {
    expect(datesLabel(["2026-11-19"])).toBe("19 Nov");
    expect(datesLabel(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"])).toBe(
      "1, 2, 3, 4, 5 and 2 more Nov",
    );
    expect(
      reviewLine({
        workingDays: 8,
        highlights: ["3 tasks done"],
        flags: [
          { level: "note", text: "Worked 3 days without logging hours" },
          { level: "watch", text: "Monthly report not sent" },
        ],
      }),
    ).toBe("Monthly report not sent");
    expect(reviewLine({ workingDays: 8, highlights: ["3 tasks done", "Nothing slipped"], flags: [] })).toBe(
      "3 tasks done · Nothing slipped",
    );
    expect(reviewLine({ workingDays: 0, highlights: [], flags: [] })).toBe("No working days yet");
  });

  it("drafts a follow-up email from the flags", () => {
    const draft = followUpDraft(
      {
        name: "Asha Rao",
        status: "follow_up",
        highlights: [],
        flags: [
          { level: "follow_up", text: "No sign of work on 4 working days (19, 20, 23 and 24 Nov)" },
          { level: "note", text: "Worked 3 days without logging hours" },
        ],
      },
      "2026-11",
      TODAY,
      "Arindam Majumder",
    );
    expect(draft.subject).toBe("Checking in on your November");
    expect(draft.body).toContain("Hi Asha,");
    expect(draft.body).toContain("November so far");
    expect(draft.body).toContain("- No sign of work on 4 working days (19, 20, 23 and 24 Nov)");
    expect(draft.body).not.toContain("without logging hours");
    expect(draft.body).toContain("Is something getting in the way?");
    expect(draft.body.endsWith("Arindam")).toBe(true);

    const fine = followUpDraft(
      { name: "Bilal", status: "on_track", highlights: ["5 tasks done", "Nothing slipped"], flags: [] },
      "2026-10",
      TODAY,
      "Amitesh",
    );
    expect(fine.body).toContain("I went through October on the dashboard: 5 tasks done, nothing slipped.");
  });

  it("turns the follow-up into a plain email, escaped", () => {
    const html = followUpHtml("Hi <Asha>,\n\n- One & two\n- Three\n\nThanks\nArindam");
    expect(html).toContain('<p style="margin:0 0 16px">Hi &lt;Asha&gt;,</p>');
    expect(html).toContain("<li style=\"margin:0 0 6px\">One &amp; two</li><li style=\"margin:0 0 6px\">Three</li>");
    expect(html).toContain("Thanks<br>Arindam");
    expect(html).not.toContain("<Asha>");
  });
});
