import { describe, expect, it } from "vitest";
import type { Deliverable } from "@/lib/internal/clients/schema";
import { finishedDay, placeCards } from "@/lib/internal/tasks/calendar";
import type { Task } from "@/lib/internal/tasks/shared";

const deliverable = (id: string, patch: Partial<Deliverable>) =>
  ({
    id,
    engagement_id: "e1",
    title: id,
    kind: "blog",
    status: "in_progress",
    owner: "me@studio1hq.com",
    reviewer: null,
    due_on: null,
    published_at: null,
    ...patch,
  }) as Deliverable;

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
    due_on: "2026-11-18",
    done_on: null,
    blocked: false,
    block_reason: "",
    ...patch,
  }) as Task;

const place = (input: {
  deliverables?: Deliverable[];
  reviewing?: Deliverable[];
  tasks?: Task[];
  today?: string;
  person?: string;
  names?: Record<string, string>;
}) =>
  placeCards({
    week: "2026-11-16",
    end: "2026-11-22",
    today: input.today ?? "2026-11-17",
    person: input.person ?? "me@studio1hq.com",
    names: input.names,
    tasks: input.tasks ?? [],
    deliverables: input.deliverables ?? [],
    reviewing: input.reviewing ?? [],
    community: [],
    engagements: new Map(),
    dayOf: (value) => (value ? value.slice(0, 10) : null),
  });

describe("placeCards: client deliverables", () => {
  it("puts one due this week on its day", () => {
    const { cards, tray } = place({ deliverables: [deliverable("a", { due_on: "2026-11-18" })] });
    expect(cards.map((card) => [card.id, card.day])).toEqual([["a", "2026-11-18"]]);
    expect(tray).toEqual([]);
  });

  it("keeps overdue and undated open ones in the tray, oldest first", () => {
    const { cards, tray } = place({
      deliverables: [deliverable("undated", {}), deliverable("late", { due_on: "2026-11-05" })],
    });
    expect(cards).toEqual([]);
    expect(tray.map((card) => card.id)).toEqual(["late", "undated"]);
  });

  it("leaves published ones from earlier weeks, and next week's, off this week", () => {
    const { cards, tray } = place({
      deliverables: [
        deliverable("old", { status: "published", published_at: "2026-11-03T10:00:00Z", due_on: "2026-11-03" }),
        deliverable("next", { due_on: "2026-11-25" }),
      ],
    });
    expect([...cards, ...tray]).toEqual([]);
  });

  it("shows someone else's piece that's waiting on your review, once", () => {
    const mine = deliverable("mine", { status: "internal_review", due_on: "2026-11-18" });
    const { cards, tray } = place({
      deliverables: [mine],
      reviewing: [mine, deliverable("theirs", { status: "internal_review", owner: "x@studio1hq.com" }), deliverable("moved-on", { status: "client_review" })],
    });
    expect(cards.map((card) => card.id)).toEqual(["mine"]);
    expect(tray.map((card) => [card.id, card.kind === "deliverable" && card.status])).toEqual([["theirs", "Your review"]]);
  });

  it("has no tray on a week that's over", () => {
    const { tray } = place({ today: "2026-11-30", deliverables: [deliverable("late", { due_on: "2026-11-05" })] });
    expect(tray).toEqual([]);
  });
});

describe("placeCards: shared tasks", () => {
  it("names everyone else on it, on the owner's week and on a co-worker's", () => {
    const shared = task("video", { email: "lead@studio1hq.com", created_by: "lead@studio1hq.com", with_emails: ["me@studio1hq.com", "nancy.d@studio1hq.com"] });
    const names = { "lead@studio1hq.com": "Shivam Kumar", "me@studio1hq.com": "Arindam Majumder" };
    // On a co-worker's week ("me"): with the owner and the other co-worker; no "From", that's the owner's line.
    const { cards } = place({ tasks: [shared], names });
    const card = cards[0];
    expect(card.kind === "task" && [card.owner, card.withNames, card.from, card.people]).toEqual([
      "lead@studio1hq.com",
      ["Shivam", "Nancy"],
      null,
      ["me@studio1hq.com", "nancy.d@studio1hq.com"],
    ]);
    // On the owner's week: with the two others.
    const owner = place({ tasks: [shared], names, person: "lead@studio1hq.com" }).cards[0];
    expect(owner.kind === "task" && owner.withNames).toEqual(["Arindam", "Nancy"]);
  });
});

describe("placeCards: priority", () => {
  it("lists a day's open tasks Top first, Low last, blocked first within a priority, done after", () => {
    const { cards } = place({
      tasks: [
        task("b low", { priority: "low" }),
        task("a medium", {}),
        task("z top", { priority: "top" }),
        task("c medium blocked", { blocked: true, block_reason: "Waiting" }),
        task("a done top", { status: "done", priority: "top", done_on: "2026-11-18" }),
        task("b done", { status: "done", done_on: "2026-11-18" }),
      ],
      deliverables: [deliverable("m client piece", { due_on: "2026-11-18" })],
    });
    expect(cards.map((card) => card.id)).toEqual([
      "z top",
      "c medium blocked",
      "a medium",
      "m client piece",
      "b low",
      "a done top",
      "b done",
    ]);
    expect(cards[0].kind === "task" && cards[0].priority).toBe("top");
  });
});

describe("finishedDay: marking a card Done without a day", () => {
  // Wednesday 25 Nov 2026; its week starts Monday 23 Nov.
  const today = "2026-11-25";

  it("keeps the card's own day when it's this week and not ahead", () => {
    expect(finishedDay("2026-11-23", today)).toBe("2026-11-23");
    expect(finishedDay("2026-11-25", today)).toBe("2026-11-25");
  });

  it("stamps today for an overdue card from an earlier week", () => {
    expect(finishedDay("2026-11-10", today)).toBe(today);
    expect(finishedDay("2026-11-22", today)).toBe(today);
  });

  it("stamps today for a day still ahead, or no day at all", () => {
    expect(finishedDay("2026-11-26", today)).toBe(today);
    expect(finishedDay("2026-12-02", today)).toBe(today);
    expect(finishedDay(null, today)).toBe(today);
  });

  it("counts Sunday as the end of its own week", () => {
    expect(finishedDay("2026-11-23", "2026-11-29")).toBe("2026-11-23");
    expect(finishedDay("2026-11-29", "2026-11-30")).toBe("2026-11-30");
  });
});
