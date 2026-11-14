import { describe, expect, it } from "vitest";
import { parseTimeText, timeLabel } from "@/components/internal/team/time-field";

describe("typing a time", () => {
  it("reads the ways people write one", () => {
    expect(parseTimeText("9")).toBe("09:00");
    expect(parseTimeText("930")).toBe("09:30");
    expect(parseTimeText("9.30")).toBe("09:30");
    expect(parseTimeText("9:30 PM")).toBe("21:30");
    expect(parseTimeText("12am")).toBe("00:00");
    expect(parseTimeText("12 pm")).toBe("12:00");
    expect(parseTimeText("21:05")).toBe("21:05");
    expect(parseTimeText("  ")).toBe("");
  });

  it("turns away what isn't a time", () => {
    for (const text of ["25:00", "9:75", "13pm", "soon", "9:3"]) expect(parseTimeText(text)).toBeNull();
  });

  it("shows a 12-hour clock", () => {
    expect(timeLabel("09:30")).toBe("9:30 am");
    expect(timeLabel("00:05")).toBe("12:05 am");
    expect(timeLabel("14:00:00")).toBe("2:00 pm");
    expect(timeLabel("")).toBe("");
  });
});
