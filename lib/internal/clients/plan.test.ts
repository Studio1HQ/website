import { describe, expect, it } from "vitest";
import { USUAL_LINES, firstMonthFor, planFrom, planLines, withKind } from "@/lib/internal/clients/plan";
import { DEFAULT_TEMPLATES } from "@/lib/internal/clients/schema";

describe("project checklist", () => {
  const blogs = DEFAULT_TEMPLATES.blogs_only.lines;

  it("opens on the template, ticking what it plans, then the usual kinds unticked", () => {
    const items = planFrom(blogs);
    expect(items.slice(0, 3).map((item) => [item.kind, item.on, item.quantity])).toEqual([
      ["blog", true, 4],
      // The template plans no republishes: unticked, and 1 if ticked.
      ["republish", false, 1],
      ["report", true, 1],
    ]);
    // Blogs and the report are the template's, so they aren't listed twice.
    expect(items.filter((item) => item.kind === "blog")).toHaveLength(1);
    expect(items.find((item) => item.kind === "social_post")).toMatchObject({ on: false, quantity: 1 });
    expect(items).toHaveLength(3 + USUAL_LINES.length - 2);
  });

  it("is the usual kinds, all unticked, for a type with no template lines", () => {
    expect(planFrom([]).every((item) => !item.on)).toBe(true);
  });

  it("saves only what's ticked, with a number from 1 to 999", () => {
    let items = planFrom(blogs);
    items = items.map((item) => (item.kind === "social_post" ? { ...item, on: true } : item));
    items = items.map((item) => (item.kind === "blog" ? { ...item, quantity: 2.6 } : item));
    items = items.map((item) => (item.kind === "report" ? { ...item, quantity: 0 } : item));
    expect(planLines(items).map((line) => [line.kind, line.quantity])).toEqual([
      ["blog", 3],
      ["social_post", 1],
    ]);
    expect(planLines(items).some((line) => "on" in line)).toBe(false);
  });

  it("adds a kind the list doesn't show, ticked", () => {
    const items = withKind(planFrom([]), "audit");
    expect(items.at(-1)).toMatchObject({ kind: "audit", label: "Audit", quantity: 1, on: true });
  });
});

describe("first month", () => {
  it("is this month, or the start month when that's later", () => {
    expect(firstMonthFor(null, "2026-11")).toBe("2026-11");
    expect(firstMonthFor("2026-09-15", "2026-11")).toBe("2026-11");
    expect(firstMonthFor("2027-01-05", "2026-11")).toBe("2027-01");
    expect(firstMonthFor("not a date", "2026-11")).toBe("2026-11");
  });
});
