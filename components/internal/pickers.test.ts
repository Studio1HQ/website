import { describe, expect, it } from "vitest";
import { dateFieldLabel, isDateText, matchSuggestions, monthFieldLabel, monthGrid } from "@/components/internal/pickers";

describe("the date and month pickers", () => {
  it("lays a month out in weeks from Monday", () => {
    const weeks = monthGrid(2026, 11);
    // 1 November 2026 is a Sunday.
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.at(-1)?.[0]).toBe("2026-11-30");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(monthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
  });

  it("labels dates and months, and nothing for what isn't one", () => {
    expect(dateFieldLabel("2026-11-14")).toBe("14 Nov 2026");
    expect(dateFieldLabel("14/11/2026")).toBe("");
    expect(isDateText("2026-13-01")).toBe(false);
    expect(monthFieldLabel("2026-03")).toBe("March 2026");
    expect(monthFieldLabel("2026-13")).toBe("");
  });

  it("narrows suggestions as you type, and shows all for a blank or exact value", () => {
    const options = [{ value: "Discord" }, { value: "LinkedIn" }, { value: "x@studio1hq.com", label: "Xena" }];
    expect(matchSuggestions(options, "")).toHaveLength(3);
    expect(matchSuggestions(options, "link").map((option) => option.value)).toEqual(["LinkedIn"]);
    expect(matchSuggestions(options, "xen").map((option) => option.value)).toEqual(["x@studio1hq.com"]);
    expect(matchSuggestions(options, "discord")).toHaveLength(3);
  });
});
