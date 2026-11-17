import { describe, expect, it } from "vitest";
import type { Hackathon } from "@/data/hackathons";
import { formatDate, formatShortDate, isRegistrationOpen, statusOf } from "@/lib/hackathons";

const event = {
  registrationCloses: "2026-12-20",
  startDate: "2026-12-21",
  endDate: "2026-12-22",
} as Hackathon;

/** An instant given as IST wall-clock time. */
const ist = (time: string) => Date.parse(`${time}+05:30`);

describe("isRegistrationOpen", () => {
  it("stays open to the last minute of the closing day in IST", () => {
    expect(isRegistrationOpen(event, ist("2026-12-20T23:59:00"))).toBe(true);
  });

  it("closes at midnight IST, when the dashboard shows it closed", () => {
    expect(isRegistrationOpen(event, ist("2026-12-21T00:00:00"))).toBe(false);
    // The old UTC boundary: still open at 05:29 IST the next morning.
    expect(isRegistrationOpen(event, ist("2026-12-21T05:29:00"))).toBe(false);
  });
});

describe("date labels", () => {
  it("keep the calendar day", () => {
    expect(formatDate("2026-12-20")).toBe("Dec 20, 2026");
    expect(formatShortDate("2026-12-01")).toBe("Dec 1");
  });

  it("show an instant as its IST day", () => {
    expect(formatShortDate(ist("2026-12-21T01:00:00"))).toBe("Dec 21");
  });
});

describe("statusOf", () => {
  it("goes live and ends on IST days", () => {
    expect(statusOf(event, ist("2026-12-20T23:59:00"))).toBe("upcoming");
    expect(statusOf(event, ist("2026-12-21T00:00:00"))).toBe("live");
    expect(statusOf(event, ist("2026-12-22T23:59:00"))).toBe("live");
    expect(statusOf(event, ist("2026-12-23T00:00:00"))).toBe("past");
  });
});
