import { describe, expect, it } from "vitest";
import { statusLabel, type Deliverable } from "@/lib/internal/clients/schema";
import { findWork, markTerms } from "@/lib/internal/tasks/search";
import type { EngagementLabel, Task } from "@/lib/internal/tasks/shared";

const task = (id: string, patch: Partial<Task>) =>
  ({
    id,
    created_by: "me@studio1hq.com",
    email: "me@studio1hq.com",
    title: id,
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
    ...patch,
  }) as Task;

const deliverable = (id: string, patch: Partial<Deliverable>) =>
  ({
    id,
    engagement_id: "e1",
    title: id,
    kind: "blog",
    status: "in_progress",
    owner: "Me@studio1hq.com",
    reviewer: null,
    due_on: null,
    published_at: null,
    ...patch,
  }) as Deliverable;

const engagements = new Map<string, EngagementLabel>([
  ["e1", { id: "e1", client: "Nebius Token Factory", name: "Nebius Token Factory DevRel", internal: false }],
]);

const find = (query: string, tasks: Task[], deliverables: Deliverable[] = []) =>
  findWork({ query, tasks, deliverables, engagements, dayOf: (value) => (value ? value.slice(0, 10) : null), today: "2026-11-24" });

describe("findWork", () => {
  it("finds a task by any words in its title, in any order and case", () => {
    const result = find("plan BACKLINK", [task("Check Backlink Plan", {}), task("Sync with Harshal", {})]);
    expect(result.open.map((hit) => hit.title)).toEqual(["Check Backlink Plan"]);
  });

  it("finds by the note (and a link's name in it) and by the client it's for", () => {
    const tasks = [
      task("a", { notes: "https://app.notion.com/p/studio1hq/Studio1-Backlink-Plan-41cc71f11048808ea885c4711a8921c9" }),
      task("b", { engagement_id: "e1", area: "client" }),
    ];
    expect(find("notion", tasks).open.map((hit) => hit.id)).toEqual(["a"]);
    const [hit] = find("nebius", tasks).open;
    expect(hit).toMatchObject({ id: "b", forLabel: "Nebius Token Factory · DevRel", client: true });
  });

  it("puts open work soonest first and done work latest first, on the day each sits", () => {
    const result = find("post", [
      task("post later", { due_on: "2026-11-30" }),
      task("post no day", {}),
      task("post soon", { due_on: "2026-11-20" }),
      task("post old", { status: "done", done_on: "2026-11-02", due_on: "2026-11-01" }),
      task("post new", { status: "done", done_on: "2026-11-20" }),
    ]);
    expect(result.open.map((hit) => hit.title)).toEqual(["post soon", "post later", "post no day"]);
    expect(result.done.map((hit) => [hit.title, hit.day])).toEqual([
      ["post new", "2026-11-20"],
      ["post old", "2026-11-02"],
    ]);
    expect(result.total).toBe(5);
  });

  it("includes client pieces, done ones on the day they went live", () => {
    const result = find("flight", [], [
      deliverable("Flight date finder", { due_on: "2026-11-19", status: "planned" }),
      deliverable("Flight tutorial", { status: "published", published_at: "2026-11-10T08:00:00Z" }),
    ]);
    expect(result.open[0]).toMatchObject({ kind: "deliverable", status: { label: statusLabel("planned", "blog") }, day: "2026-11-19", email: "me@studio1hq.com" });
    expect(result.done[0]).toMatchObject({ day: "2026-11-10" });
  });

  it("calls work late only while it's still owed", () => {
    const result = find("draft", [
      task("draft owed", { status: "doing", due_on: "2026-11-20" }),
      task("draft handed in", { status: "review", due_on: "2026-11-20" }),
    ], [deliverable("draft with the client", { status: "client_review", due_on: "2026-11-20" })]);
    expect(Object.fromEntries(result.open.map((hit) => [hit.title, hit.late]))).toEqual({
      "draft owed": true,
      "draft handed in": false,
      "draft with the client": false,
    });
  });

  it("needs two letters, and lists a shared task once", () => {
    expect(find("p", [task("post", {})]).total).toBe(0);
    expect(find("post", [task("post", { id: "x" }), task("post", { id: "x" })]).total).toBe(1);
  });
});

describe("markTerms", () => {
  it("marks each word found, keeping the title's own case", () => {
    expect(markTerms("Check Backlink Plan", "backlink plan")).toEqual([
      { text: "Check ", hit: false },
      { text: "Backlink", hit: true },
      { text: " ", hit: false },
      { text: "Plan", hit: true },
    ]);
    expect(markTerms("a.b (c)", "(c)")).toEqual([
      { text: "a.b ", hit: false },
      { text: "(c)", hit: true },
    ]);
  });
});
