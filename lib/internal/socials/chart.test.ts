import { describe, expect, it } from "vitest";
import {
  axisMonth,
  axisNumber,
  gainTicks,
  lineTicks,
  niceTicks,
} from "@/lib/internal/socials/chart";

describe("social growth chart", () => {
  it("rounds ticks to 1, 2 or 5 steps", () => {
    expect(niceTicks(0, 100)).toEqual([0, 50, 100]);
    expect(niceTicks(380, 500)).toEqual([350, 400, 450, 500]);
    expect(niceTicks(0, 1)).toEqual([0, 1]);
  });

  it("gives a line air around it and never goes under zero", () => {
    expect(lineTicks([480])).toEqual([440, 460, 480, 500, 520]);
    expect(lineTicks([400, 480])).toEqual([350, 400, 450, 500]);
    expect(lineTicks([0, 3])[0]).toBe(0);
  });

  it("keeps zero in the gains", () => {
    expect(gainTicks([12, -4])).toEqual([-5, 0, 5, 10, 15]);
    expect(gainTicks([8])[0]).toBe(0);
    expect(gainTicks([0])).toEqual([0, 2, 4, 6]);
  });

  it("writes axis labels short", () => {
    expect(axisNumber(1240)).toBe("1,240");
    expect(axisNumber(12_000)).toBe("12K");
    expect(axisMonth("2026-11", false)).toBe("Nov");
    expect(axisMonth("2026-11", true)).toBe("Nov ’26");
    expect(axisMonth("2027-01", false)).toBe("Jan ’27");
  });
});
