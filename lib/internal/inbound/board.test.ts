import { describe, expect, it } from "vitest";
import {
  ageLabel,
  filterCards,
  lastFailure,
  parseSource,
} from "@/lib/internal/inbound/board";
import type { LeadCard } from "@/lib/internal/inbound/schema";

const card = (
  id: string,
  over: Partial<LeadCard> & { source?: string } = {},
): LeadCard =>
  ({
    org: { id, name: id, source: over.source ?? "inbound_call" },
    column: over.column ?? "new",
    primaryContact: null,
    latest: over.latest ?? null,
  }) as unknown as LeadCard;

const failed = (at: string): LeadCard["latest"] => ({
  kind: "lead_created",
  status: "failed",
  created_at: at,
  error: "boom",
  waiting: 0,
});

describe("the board helpers", () => {
  it("only knows two sources", () => {
    expect(parseSource("call")).toBe("call");
    expect(parseSource("mail")).toBe("mail");
    expect(parseSource("x")).toBe("");
    expect(parseSource(undefined)).toBe("");
  });

  it("filters by source and hides Lost unless asked", () => {
    const cards = [
      card("a"),
      card("b", { source: "inbound_email" }),
      card("c", { column: "lost" }),
    ];
    expect(filterCards(cards, "", false).map((c) => c.org.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterCards(cards, "mail", true).map((c) => c.org.id)).toEqual([
      "b",
    ]);
    expect(filterCards(cards, "call", true).map((c) => c.org.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("says how long ago", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    expect(ageLabel("2026-11-27T01:00:00Z", now)).toBe("Today");
    expect(ageLabel("2026-11-26T01:00:00Z", now)).toBe("Yesterday");
    expect(ageLabel("2026-11-20T00:00:00Z", now)).toBe("7 days ago");
    expect(ageLabel("2026-11-01T00:00:00Z", now)).toBe("3 weeks ago");
    expect(ageLabel("2026-05-01T00:00:00Z", now)).toBe("7 months ago");
    expect(ageLabel("nope", now)).toBe("");
  });

  it("finds the newest failure", () => {
    const cards = [
      card("a", { latest: failed("2026-11-20T00:00:00Z") }),
      card("b", { latest: failed("2026-11-25T00:00:00Z") }),
      card("c"),
    ];
    expect(lastFailure(cards)?.org.id).toBe("b");
    expect(lastFailure([card("c")])).toBeNull();
  });
});
