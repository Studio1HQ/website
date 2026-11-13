import { describe, expect, it } from "vitest";
import { doorCounts, doorRows, type SiteRegistration } from "@/lib/internal/community/door";
import { eventReport, istDay, signupSeries, type ReportRegistration } from "@/lib/internal/community/report";
import type { Guest } from "@/lib/internal/community/schema";
import { emailPlan, planSendTime } from "@/lib/internal/hackathon-plan";
import { unfilledParts } from "@/lib/internal/email-templates";

function guest(over: Partial<Guest>): Guest {
  return {
    id: "g1",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
    created_by: null,
    updated_by: null,
    event_id: "e1",
    name: "Guest",
    email: "guest@example.com",
    organisation: "",
    role: "attendee",
    status: "registered",
    checked_in_at: null,
    source: "import",
    notes: "",
    ...over,
  };
}

function registration(over: Partial<ReportRegistration>): ReportRegistration {
  return {
    id: "r1",
    created_at: "2026-11-02T10:00:00Z",
    name: "Asha Rao",
    email: "asha@example.com",
    github: "@asharao",
    team: "solo",
    team_name: "",
    track: "Reliable tool use",
    review_status: "confirmed",
    country: "India",
    role: "Student",
    experience: "Beginner",
    partner_consent: false,
    answers: [],
    ...over,
  };
}

describe("door list", () => {
  it("counts someone on both lists once, as their registration, and keeps other roles", () => {
    const registrations: SiteRegistration[] = [registration({ email: "Asha@example.com" })];
    const rows = doorRows(
      [
        guest({ id: "g1", email: "asha@example.com", status: "registered" }),
        guest({ id: "g2", email: "asha@example.com", role: "mentor", status: "confirmed" }),
        guest({ id: "g3", email: "walkin@example.com", status: "attended" }),
      ],
      registrations,
    );
    expect(rows.map((row) => row.key)).toEqual(["g:g2", "g:g3", "r:r1"]);
    expect(rows.find((row) => row.source === "site")).toMatchObject({ status: "confirmed", detail: "@asharao · Reliable tool use" });
    expect(doorCounts(rows)).toEqual({ signed_up: 3, attended: 1, waitlisted: 0, no_show: 0 });
  });

  it("maps registration statuses onto the guest list's", () => {
    const rows = doorRows(
      [],
      ["new", "waitlisted", "attended", "no_show", "rejected", "withdrawn"].map((status, index) =>
        registration({ id: `r${index}`, email: `p${index}@example.com`, review_status: status }),
      ),
    );
    expect(rows.map((row) => row.status)).toEqual(["registered", "waitlisted", "attended", "no_show", "cancelled", "cancelled"]);
    expect(doorCounts(rows)).toEqual({ signed_up: 4, attended: 1, waitlisted: 1, no_show: 1 });
  });
});

describe("email plan", () => {
  it("dates each step from the hackathon's own dates", () => {
    const plan = emailPlan({
      startDate: "2026-11-23",
      endDate: "2026-12-06",
      timeline: [{ date: "2026-12-13", label: "Winners announced", description: "" }],
    });
    expect(plan.map((step) => [step.template, step.on])).toEqual([
      ["week-before", "2026-11-16"],
      ["day-before", "2026-11-22"],
      ["kickoff", "2026-11-23"],
      ["deadline", "2026-12-05"],
      ["results", "2026-12-13"],
    ]);
    expect(planSendTime("2026-11-16")).toBe("2026-11-16T04:30:00.000Z");
  });

  it("puts the deadline on the day itself for a one-day event", () => {
    const plan = emailPlan({ startDate: "2026-12-01", endDate: "2026-12-01", timeline: [] });
    expect(plan.find((step) => step.template === "deadline")?.on).toBe("2026-12-01");
    expect(plan.find((step) => step.template === "results")?.on).toBe("2026-12-08");
  });

  it("finds parts left to fill in, but not Markdown links", () => {
    expect(unfilledParts("Where: [venue address]\nSee [our projects](https://studio1hq.com/oss)")).toEqual(["venue address"]);
    expect(unfilledParts("All filled in.")).toEqual([]);
  });
});

describe("event report", () => {
  it("leaves rejected and withdrawn people out of the breakdowns and counts opt-ins", () => {
    const report = eventReport({
      guests: [guest({ id: "g9", role: "judge", status: "confirmed", email: "judge@example.com" })],
      registrations: [
        registration({ id: "r1", country: "India", partner_consent: true, team_name: "Bytes", review_status: "attended" }),
        registration({ id: "r2", email: "b@example.com", country: "india ", team_name: "bytes" }),
        registration({ id: "r3", email: "c@example.com", country: "Nepal", review_status: "rejected", partner_consent: true }),
      ],
      questions: [{ id: "framework", label: "Framework", type: "choice", options: ["A", "B"] }],
      over: true,
    });
    expect(report.registered).toBe(2);
    expect(report.countries).toBe(1);
    expect(report.teams).toBe(1);
    expect(report.partnerOptIns).toBe(1);
    expect(report.crew).toEqual([{ label: "Judges", count: 1 }]);
    // "India" and "india " are one country.
    expect(report.breakdowns.find((item) => item.key === "country")?.rows).toEqual([{ label: "India", count: 2 }]);
    // Nobody answered the question: no empty chart.
    expect(report.breakdowns.some((item) => item.key === "q:framework")).toBe(false);
    // 3 signed up (2 registrations + the judge), none waitlisted, 1 attended.
    expect(report.showUp).toBeCloseTo(1 / 3);
  });

  it("groups sign-ups by day in India, and by week past a month", () => {
    expect(istDay("2026-11-13T20:00:00Z")).toBe("2026-11-14");
    const daily = signupSeries(["2026-11-03", "2026-11-01", "2026-11-03"]);
    expect(daily.signupsBy).toBe("day");
    expect(daily.signups.map((item) => item.value)).toEqual([1, 0, 2]);
    const weekly = signupSeries(["2026-09-01", "2026-11-03"]);
    expect(weekly.signupsBy).toBe("week");
    expect(weekly.signups[0].key).toBe("2026-08-31");
    expect(weekly.signups.reduce((sum, item) => sum + item.value, 0)).toBe(2);
  });
});
