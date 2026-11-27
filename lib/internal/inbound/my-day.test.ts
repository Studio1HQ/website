import { describe, expect, it } from "vitest";
import { pickWaitingLeads } from "@/lib/internal/inbound/my-day";
import type { BoardColumn, LeadCard } from "@/lib/internal/inbound/schema";

function card(
  id: string,
  column: BoardColumn,
  waiting: number | null,
  at = "2026-11-20T10:00:00Z",
): LeadCard {
  return {
    org: { id, name: `Org ${id}` } as LeadCard["org"],
    column,
    primaryContact: null,
    latest:
      waiting === null
        ? null
        : ({
            kind: "brief",
            status: "done",
            created_at: at,
            error: "",
            waiting,
          } as unknown as LeadCard["latest"]),
  };
}

describe("pickWaitingLeads", () => {
  it("keeps open leads that are waiting, newest first", () => {
    const out = pickWaitingLeads([
      card("a", "new", 1, "2026-11-01T00:00:00Z"),
      card("b", "proposal", 3, "2026-11-05T00:00:00Z"),
      card("c", "call_done", 0),
      card("d", "won", 2),
      card("e", "lost", 2),
      card("f", "new", null),
    ]);
    expect(out.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(out.items[0].waiting).toBe(3);
    expect(out.more).toBe(0);
  });

  it("cuts to the limit and counts the rest", () => {
    const cards = Array.from({ length: 7 }, (_, i) =>
      card(String(i), "new", 1, `2026-11-0${i + 1}T00:00:00Z`),
    );
    const out = pickWaitingLeads(cards);
    expect(out.items).toHaveLength(5);
    expect(out.items[0].id).toBe("6");
    expect(out.more).toBe(2);
  });
});
