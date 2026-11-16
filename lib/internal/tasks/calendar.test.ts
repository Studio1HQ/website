import { describe, expect, it } from "vitest";
import type { Deliverable } from "@/lib/internal/clients/schema";
import { placeCards } from "@/lib/internal/tasks/calendar";

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

const place = (input: { deliverables?: Deliverable[]; reviewing?: Deliverable[]; today?: string }) =>
  placeCards({
    week: "2026-11-16",
    end: "2026-11-22",
    today: input.today ?? "2026-11-17",
    person: "me@studio1hq.com",
    tasks: [],
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
