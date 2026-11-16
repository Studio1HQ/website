import { describe, expect, it } from "vitest";
import { inScope, scopeEngagements, scopeRows, scopeWork } from "@/lib/internal/clients/scope";
import type { ClientWork } from "@/lib/internal/clients/data";
import { choicesFor } from "@/lib/internal/tasks/data";

const work = {
  ok: true,
  month: "2026-11",
  clients: [{ id: "a" }, { id: "b" }],
  engagements: [
    { id: "ea", client_id: "a" },
    { id: "eb", client_id: "b" },
  ],
  cycles: [
    { id: "ca", engagement_id: "ea" },
    { id: "cb", engagement_id: "eb" },
  ],
  lines: [
    { id: "la", cycle_id: "ca" },
    { id: "lb", cycle_id: "cb" },
  ],
  deliverables: [
    { id: "da", engagement_id: "ea" },
    { id: "db", engagement_id: "eb" },
  ],
  people: [],
  names: {},
  rows: [{ engagement: { id: "ea" } }, { engagement: { id: "eb" } }],
  truncated: false,
} as unknown as ClientWork;

describe("client scope", () => {
  it("lets everyone without a list see every client", () => {
    expect(inScope(null, "a")).toBe(true);
    expect(scopeWork(null, work)).toBe(work);
    expect(scopeRows(null, [{ id: "a" }])).toEqual([{ id: "a" }]);
  });

  it("cuts a month's work down to the clients picked, all the way to deliverables", () => {
    const only = scopeWork(["b"], work);
    if (!only.ok) throw new Error("expected work");
    expect(only.clients.map((row) => row.id)).toEqual(["b"]);
    expect(only.engagements.map((row) => row.id)).toEqual(["eb"]);
    expect(only.cycles.map((row) => row.id)).toEqual(["cb"]);
    expect(only.lines.map((row) => row.id)).toEqual(["lb"]);
    expect(only.deliverables.map((row) => row.id)).toEqual(["db"]);
    expect(only.rows.map((row) => row.engagement.id)).toEqual(["eb"]);
    expect(scopeEngagements([], [{ client_id: "a" }])).toEqual([]);
    expect(inScope(["b"], "a")).toBe(false);
    expect(inScope(["b"], null)).toBe(false);
  });

  it("still lets them tag Studio1's own work on tasks", () => {
    const choices = [
      { id: "1", clientId: "a", internal: false },
      { id: "2", clientId: "b", internal: false },
      { id: "3", clientId: "studio1", internal: true },
    ];
    expect(choicesFor(["b"], choices).map((choice) => choice.id)).toEqual(["2", "3"]);
    expect(choicesFor(null, choices)).toHaveLength(3);
  });
});
