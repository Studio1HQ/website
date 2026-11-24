import { describe, expect, it } from "vitest";
import {
  canChangeLog,
  canChangeTask,
  canGiveTask,
  canShareTask,
  canReadReports,
  canSeeOthers,
  canSeeTasksOf,
  logDayProblem,
  owesReports,
  type TaskViewer,
} from "@/lib/internal/tasks/access";
import { buildSnapshot, readSnapshot, reportText } from "@/lib/internal/tasks/report";
import {
  communityColumn,
  deliverableColumn,
  dueOn,
  forKey,
  forLabel,
  isOnTask,
  isPastDue,
  isTaskLate,
  isPeriodStart,
  owedPeriods,
  peopleOn,
  periodEnd,
  periodStart,
  readyOn,
  splitStudioClient,
  totalsByFor,
  type EngagementLabel,
  type Task,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

const founder: TaskViewer = { email: "arindam@studio1hq.com", roles: ["admin"], status: "owner", interns: [] };
const associate: TaskViewer = { email: "assoc@studio1hq.com", roles: ["tasks_viewer"], status: "active", interns: [] };
const admin: TaskViewer = { email: "ops@studio1hq.com", roles: ["admin"], status: "active", interns: [] };
const reviewer: TaskViewer = { email: "lead@studio1hq.com", roles: ["client_member"], status: "active", interns: ["intern@studio1hq.com"] };
const employee: TaskViewer = { email: "dev@studio1hq.com", roles: [], status: "pending", interns: [] };

const person = (email: string, guarded = false) => ({ email, guarded });

describe("who sees whose tasks", () => {
  it("lets everyone see their own and nobody else's by default", () => {
    expect(canSeeTasksOf(employee, person("dev@studio1hq.com"))).toBe(true);
    expect(canSeeTasksOf(employee, person("other@studio1hq.com"))).toBe(false);
    expect(canSeeOthers(employee)).toBe(false);
  });

  it("lets the founders see everyone, admins and each other included", () => {
    expect(canSeeTasksOf(founder, person("dev@studio1hq.com"))).toBe(true);
    expect(canSeeTasksOf(founder, person("amitesh@studio1hq.com", true))).toBe(true);
    expect(canSeeTasksOf(founder, person("ops@studio1hq.com", true))).toBe(true);
  });

  it("lets the founder's associate see everyone, the founders included", () => {
    expect(canSeeOthers(associate)).toBe(true);
    expect(canSeeTasksOf(associate, person("dev@studio1hq.com"))).toBe(true);
    expect(canSeeTasksOf(associate, person("intern@studio1hq.com"))).toBe(true);
    expect(canSeeTasksOf(associate, person("arindam@studio1hq.com", true))).toBe(true);
    expect(canSeeTasksOf(associate, person("ops@studio1hq.com", true))).toBe(true);
  });

  it("keeps the founders and other admins from a non-founder admin", () => {
    expect(canSeeTasksOf(admin, person("dev@studio1hq.com"))).toBe(true);
    expect(canSeeTasksOf(admin, person("amitesh@studio1hq.com", true))).toBe(false);
  });

  it("lets intern reviewers see their interns only", () => {
    expect(canSeeTasksOf(reviewer, person("intern@studio1hq.com"))).toBe(true);
    expect(canSeeTasksOf(reviewer, person("dev@studio1hq.com"))).toBe(false);
  });
});

describe("who changes what", () => {
  const task = { email: "dev@studio1hq.com", created_by: "dev@studio1hq.com" };
  it("gives tasks: yourself; founders, admins and the associate to others; nobody else", () => {
    expect(canGiveTask(employee, "dev@studio1hq.com")).toBe(true);
    expect(canGiveTask(employee, "other@studio1hq.com")).toBe(false);
    expect(canGiveTask(founder, "dev@studio1hq.com")).toBe(true);
    expect(canGiveTask(founder, "amitesh@studio1hq.com", true)).toBe(true);
    expect(canGiveTask(associate, "dev@studio1hq.com")).toBe(true);
    expect(canGiveTask(associate, "arindam@studio1hq.com", true)).toBe(true);
    expect(canGiveTask(admin, "dev@studio1hq.com")).toBe(true);
    expect(canGiveTask(admin, "arindam@studio1hq.com", true)).toBe(false);
    // Intern reviewers and client managers don't give tasks.
    expect(canGiveTask(reviewer, "intern@studio1hq.com")).toBe(false);
    expect(canGiveTask({ ...employee, roles: ["client_manager"] }, "other@studio1hq.com")).toBe(false);
  });

  it("changes a task: its owner, a founder, the associate, or whoever gave it", () => {
    expect(canChangeTask(employee, task)).toBe(true);
    expect(canChangeTask(founder, task)).toBe(true);
    // The founder's associate keeps everyone's tasks up to date, the founders' too.
    expect(canChangeTask(associate, task)).toBe(true);
    expect(canChangeTask(associate, { email: "arindam@studio1hq.com", created_by: "arindam@studio1hq.com" })).toBe(true);
    expect(canChangeTask(admin, { email: "dev@studio1hq.com", created_by: "dev@studio1hq.com" })).toBe(false);
    expect(canChangeTask(admin, { email: "dev@studio1hq.com", created_by: "ops@studio1hq.com" })).toBe(true);
    expect(canChangeTask(reviewer, { email: "intern@studio1hq.com", created_by: "lead@studio1hq.com" })).toBe(false);
  });

  it("lets the people a task is shared with change it too", () => {
    const shared = { email: "lead@studio1hq.com", created_by: "lead@studio1hq.com", with_emails: ["dev@studio1hq.com"] };
    expect(canChangeTask(employee, shared)).toBe(true);
    expect(canChangeTask(employee, { ...shared, with_emails: ["other@studio1hq.com"] })).toBe(false);
    expect(canChangeTask(employee, { ...shared, with_emails: [] })).toBe(false);
    // Who it's shared with stays with its own person (and founders, the associate, the giver).
    expect(canShareTask(employee, shared)).toBe(false);
    expect(canShareTask(employee, { ...shared, email: "dev@studio1hq.com" })).toBe(true);
    expect(canShareTask(founder, shared)).toBe(true);
  });

  it("puts a shared task on everyone's list, once each", () => {
    const shared = { email: "Lead@studio1hq.com", with_emails: ["dev@studio1hq.com", "lead@studio1hq.com"] };
    expect(peopleOn(shared)).toEqual(["lead@studio1hq.com", "dev@studio1hq.com"]);
    expect(isOnTask(shared, "DEV@studio1hq.com")).toBe(true);
    expect(isOnTask(shared, "other@studio1hq.com")).toBe(false);
  });

  it("keeps logs and reports personal (founders read reports)", () => {
    expect(canChangeLog(employee, { email: "dev@studio1hq.com" })).toBe(true);
    expect(canChangeLog(founder, { email: "dev@studio1hq.com" })).toBe(false);
    expect(canReadReports(founder, "dev@studio1hq.com")).toBe(true);
    expect(canReadReports(associate, "dev@studio1hq.com")).toBe(false);
    expect(owesReports("dev@studio1hq.com")).toBe(true);
    expect(owesReports("amitesh@studio1hq.com")).toBe(false);
  });

  it("logs from the start of last month to today", () => {
    expect(logDayProblem("2026-11-15", "2026-11-15")).toBeNull();
    expect(logDayProblem("2026-10-01", "2026-11-15")).toBeNull();
    expect(logDayProblem("2026-09-30", "2026-11-15")).not.toBeNull();
    expect(logDayProblem("2026-11-16", "2026-11-15")).not.toBeNull();
    expect(logDayProblem("2025-12-01", "2026-01-10")).toBeNull();
  });
});

describe("the board", () => {
  it("puts client deliverables in the column their status means", () => {
    expect(deliverableColumn("planned")).toBe("todo");
    expect(deliverableColumn("in_progress")).toBe("doing");
    expect(deliverableColumn("changes_requested")).toBe("doing");
    expect(deliverableColumn("internal_review")).toBe("review");
    expect(deliverableColumn("client_review")).toBe("review");
    expect(deliverableColumn("approved")).toBe("review");
    expect(deliverableColumn("published")).toBe("done");
  });

  it("shows a blocked community task as Doing", () => {
    expect(communityColumn("todo")).toBe("todo");
    expect(communityColumn("blocked")).toBe("doing");
    expect(communityColumn("done")).toBe("done");
  });

  it("calls a task late only while it's still owed", () => {
    const today = "2026-11-24";
    expect(isTaskLate({ status: "todo", due_on: "2026-11-23" }, today)).toBe(true);
    expect(isTaskLate({ status: "doing", due_on: "2026-11-23" }, today)).toBe(true);
    // Handed in for review, or done: never late.
    expect(isTaskLate({ status: "review", due_on: "2026-11-23" }, today)).toBe(false);
    expect(isTaskLate({ status: "done", due_on: "2026-11-23" }, today)).toBe(false);
    // Due today, or no due day: not late yet.
    expect(isTaskLate({ status: "doing", due_on: today }, today)).toBe(false);
    expect(isTaskLate({ status: "todo", due_on: null }, today)).toBe(false);
  });
});

describe("periods", () => {
  it("starts weeks on Monday and months on the 1st", () => {
    expect(periodStart("week", "2026-11-15")).toBe("2026-11-09");
    expect(periodStart("week", "2026-11-16")).toBe("2026-11-16");
    expect(periodEnd("week", "2026-11-16")).toBe("2026-11-22");
    expect(periodStart("month", "2026-11-15")).toBe("2026-11-01");
    expect(periodEnd("month", "2026-02-01")).toBe("2026-02-28");
    expect(isPeriodStart("week", "2026-11-16")).toBe(true);
    expect(isPeriodStart("week", "2026-11-17")).toBe(false);
    expect(isPeriodStart("month", "2026-11-01")).toBe(true);
    expect(isPeriodStart("month", "2026-11-31")).toBe(false);
  });

  it("is ready from Friday / 3 days before month end and due Monday / the 2nd at noon", () => {
    expect(readyOn("week", "2026-11-16")).toBe("2026-11-20");
    expect(dueOn("week", "2026-11-16")).toBe("2026-11-23");
    expect(readyOn("month", "2026-11-01")).toBe("2026-11-28");
    expect(dueOn("month", "2026-11-01")).toBe("2026-12-02");
    expect(isPastDue("week", "2026-11-16", { date: "2026-11-23", time: "11:59" })).toBe(false);
    expect(isPastDue("week", "2026-11-16", { date: "2026-11-23", time: "12:00" })).toBe(true);
  });

  it("owes this period once ready and the last one until a week after it was due", () => {
    expect(owedPeriods("week", "2026-11-18")).toEqual(["2026-11-09"]);
    expect(owedPeriods("week", "2026-11-20")).toEqual(["2026-11-16", "2026-11-09"]);
    expect(owedPeriods("week", "2026-11-30")).toEqual(["2026-11-23"]);
    expect(owedPeriods("week", "2026-11-18", "2026-11-16")).toEqual([]);
    expect(owedPeriods("month", "2026-11-29")).toEqual(["2026-11-01"]);
    expect(owedPeriods("month", "2026-12-05")).toEqual(["2026-11-01"]);
  });
});

const engagements = new Map<string, EngagementLabel>([
  ["e1", { id: "e1", client: "Acme", name: "DevRel retainer", internal: false }],
  ["e2", { id: "e2", client: "Studio1", name: "Blog & socials", internal: true }],
]);

function log(partial: Partial<WorkLog>): WorkLog {
  return {
    id: crypto.randomUUID(),
    created_at: "",
    created_by: "dev@studio1hq.com",
    email: "dev@studio1hq.com",
    day: "2026-11-16",
    minutes: 60,
    note: "",
    task_id: null,
    deliverable_id: null,
    community_task_id: null,
    title: "",
    area: "other",
    engagement_id: null,
    ...partial,
  };
}

function task(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    created_at: "",
    updated_at: "",
    created_by: "dev@studio1hq.com",
    updated_by: null,
    email: "dev@studio1hq.com",
    title: "A task",
    notes: "",
    status: "todo",
    priority: "medium",
    with_emails: [],
    area: "content",
    engagement_id: null,
    deliverable_id: null,
    due_on: null,
    done_on: null,
    blocked: false,
    block_reason: "",
    ...partial,
  };
}

describe("totals", () => {
  it("labels Studio1 areas, client engagements and Studio1's own engagement", () => {
    expect(forLabel(forKey({ engagement_id: null, area: "content" }), engagements)).toBe("Studio1 · Content");
    expect(forLabel(forKey({ engagement_id: "e1", area: "client" }), engagements)).toBe("Acme · DevRel retainer");
    expect(forLabel(forKey({ engagement_id: "e2", area: "content" }), engagements)).toBe("Studio1 · Blog & socials");
  });

  it("adds time per client and area, and splits Studio1 from clients", () => {
    const logs = [
      log({ engagement_id: "e1", area: "client", minutes: 120 }),
      log({ engagement_id: "e1", area: "client", minutes: 30 }),
      log({ area: "hiring", minutes: 45 }),
      log({ engagement_id: "e2", area: "content", minutes: 60 }),
    ];
    expect(totalsByFor(logs, engagements).map((row) => [row.label, row.minutes, row.client])).toEqual([
      ["Acme · DevRel retainer", 150, true],
      ["Studio1 · Blog & socials", 60, false],
      ["Studio1 · Hiring", 45, false],
    ]);
    expect(splitStudioClient(logs, engagements)).toEqual({ studio: 105, client: 150 });
  });
});

describe("report snapshot", () => {
  const snapshot = buildSnapshot({
    period: "week",
    starts_on: "2026-11-16",
    ends_on: "2026-11-22",
    attendance: [
      { day: "2026-11-16", kind: "work", active_minutes: 480 },
      { day: "2026-11-17", kind: "half_day", active_minutes: 240 },
      { day: "2026-11-18", kind: "leave", active_minutes: null },
      { day: "2026-11-24", kind: "work", active_minutes: 480 },
    ],
    logs: [log({ minutes: 90, area: "content" }), log({ day: "2026-11-17", minutes: 60, engagement_id: "e1", area: "client" }), log({ day: "2026-11-30" })],
    tasks: [
      task({ title: "Write the launch post", status: "done", done_on: "2026-11-17" }),
      task({ title: "Old thing", status: "done", done_on: "2026-11-02" }),
      task({ title: "Hiring loop", status: "doing", area: "hiring", blocked: true, block_reason: "Waiting on Amitesh" }),
    ],
    deliverables: [
      {
        id: "d1",
        title: "Acme blog 3",
        status: "published",
        engagement_id: "e1",
        published_url: "https://acme.dev/blog/3",
        published_at: "2026-11-19T06:00:00Z",
        due_on: null,
        blocked: false,
        block_reason: "",
      },
      { id: "d2", title: "Acme demo", status: "client_review", engagement_id: "e1", published_url: null, published_at: null, due_on: "2026-11-25", blocked: false, block_reason: "" },
    ],
    community: [
      { id: "c1", title: "Book the venue", details: "", owner: "dev@studio1hq.com", due_on: null, priority: "normal", status: "done", completed_at: "2026-11-20T10:00:00Z" },
    ],
    moves: [{ title: "Acme demo", engagement_id: "e1", from_status: "internal_review", to_status: "client_review", at: "2026-11-18T09:00:00Z" }],
    engagements,
  });

  it("counts attendance, time and days in the period only", () => {
    expect(snapshot.attendance).toEqual({ worked: 1, half: 1, leave: 1, active_minutes: 720 });
    expect(snapshot.logged_minutes).toBe(150);
    expect(snapshot.logged_days).toBe(2);
    expect(snapshot.by_for.map((row) => row.label)).toEqual(["Studio1 · Content", "Acme · DevRel retainer"]);
  });

  it("lists what got done from all three places, in day order", () => {
    expect(snapshot.done.map((item) => [item.title, item.source, item.day])).toEqual([
      ["Write the launch post", "task", "2026-11-17"],
      ["Acme blog 3", "deliverable", "2026-11-19"],
      ["Book the venue", "community", "2026-11-20"],
    ]);
    expect(snapshot.done[1].url).toBe("https://acme.dev/blog/3");
  });

  it("lists open work with blocked first, and the client moves", () => {
    expect(snapshot.open.map((item) => [item.title, item.column, Boolean(item.blocked)])).toEqual([
      ["Hiring loop", "doing", true],
      ["Acme demo", "review", false],
    ]);
    expect(snapshot.moved).toEqual([
      { title: "Acme demo", for: "Acme · DevRel retainer", from: "Internal review", to: "Client review", day: "2026-11-18" },
    ]);
  });

  it("survives a round trip through the database and reads as text", () => {
    const back = readSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(back).toEqual(snapshot);
    expect(readSnapshot({})).toBeNull();
    const text = reportText("Dev", { highlights: "Shipped the post", blockers: "", next_plan: "Two more" }, snapshot);
    expect(text).toContain("Dev: Week of 16 Nov report");
    expect(text).toContain("Acme blog 3 (Acme · DevRel retainer, Thu 19 Nov) https://acme.dev/blog/3");
    expect(text).toContain("BLOCKED: Waiting on Amitesh");
  });
});

describe("work shown in other areas", () => {
  it("hides founders' and admins' client hours from everyone but the founders, the associate and themselves", async () => {
    const { canSeeWorkOf } = await import("@/lib/internal/tasks/access");
    const guarded = new Set(["arindam@studio1hq.com", "ops@studio1hq.com"]);
    expect(canSeeWorkOf(employee, "dev@studio1hq.com", guarded)).toBe(true);
    expect(canSeeWorkOf(employee, "other@studio1hq.com", guarded)).toBe(true);
    expect(canSeeWorkOf(employee, "arindam@studio1hq.com", guarded)).toBe(false);
    expect(canSeeWorkOf(admin, "ops@studio1hq.com", guarded)).toBe(true);
    expect(canSeeWorkOf(admin, "arindam@studio1hq.com", guarded)).toBe(false);
    expect(canSeeWorkOf(founder, "ops@studio1hq.com", guarded)).toBe(true);
    expect(canSeeWorkOf(associate, "arindam@studio1hq.com", guarded)).toBe(true);
  });
});

describe("today's list", () => {
  it("reads and writes the For picker's values", async () => {
    const { parseLink, linkOf, STUDIO_LINK } = await import("@/lib/internal/tasks/shared");
    const id = "6f1c2a7e-1b2c-4d5e-8f90-123456789abc";
    expect(parseLink(STUDIO_LINK)).toEqual({ kind: "s", id: "other" });
    expect(parseLink("s:hiring")).toEqual({ kind: "s", id: "hiring" });
    expect(parseLink("s:client")).toBeNull();
    expect(parseLink(`d:${id.toUpperCase()}`)).toEqual({ kind: "d", id });
    expect(parseLink("t:not-a-uuid")).toBeNull();
    expect(parseLink("x:whatever")).toBeNull();
    expect(linkOf(log({ task_id: id, deliverable_id: "d" }))).toBe(`t:${id}`);
    expect(linkOf(log({ deliverable_id: id, engagement_id: "e1" }))).toBe(`d:${id}`);
    expect(linkOf(log({ engagement_id: "e1", area: "client" }))).toBe("e:e1");
    expect(linkOf(log({ area: "client" }))).toBe("s:other");
    expect(linkOf(log({ area: "ops" }))).toBe("s:ops");
  });

  it("calls plain Studio1 work just Studio1", () => {
    expect(forLabel(forKey({ engagement_id: null, area: "other" }), engagements)).toBe("Studio1");
    expect(forLabel(forKey({ engagement_id: null, area: "hiring" }), engagements)).toBe("Studio1 · Hiring");
  });

  it("suggests the client work a line is about", async () => {
    const { suggestLink } = await import("@/lib/internal/tasks/shared");
    const options = [
      { value: "s:other", label: "Studio1", group: "studio" as const, client: false },
      { value: "d:1", label: "Launch post for v2", group: "deliverable" as const, hint: "Acme", client: true },
      { value: "d:2", label: "Kubernetes operator cookbook", group: "deliverable" as const, hint: "Nimbus", client: true },
      { value: "e:1", label: "Acme · DevRel retainer", group: "client" as const, hint: "Acme", client: true },
      { value: "t:1", label: "Onboarding doc for interns", group: "task" as const, hint: "Studio1 · Ops", client: false },
    ];
    expect(suggestLink("Wrote the Acme launch post draft", options)?.value).toBe("d:1");
    expect(suggestLink("Kubernetes operator cookbook: first two recipes", options)?.value).toBe("d:2");
    expect(suggestLink("Call with Acme about pricing", options)?.value).toBe("e:1");
    expect(suggestLink("finished the onboarding doc", options)?.value).toBe("t:1");
    expect(suggestLink("Team standup", options)).toBeNull();
    expect(suggestLink("", options)).toBeNull();
  });

});
