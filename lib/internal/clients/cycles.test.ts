import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  engagementsNeedingCycle,
  linesFromLastMonth,
  linesFromTemplate,
  monthToPrepare,
} from "@/lib/internal/clients/cycles";
import {
  DEFAULT_TEMPLATES,
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
  ENGAGEMENT_TYPES,
  isMonthKey,
  isWeekKey,
  monthElapsed,
  monthLabel,
  shiftMonth,
  shiftWeek,
  templateFor,
  thisMonth,
  todayKey,
  weekLabel,
  weekStart,
  weeksOfMonth,
} from "@/lib/internal/clients/schema";

describe("next month's cycles", () => {
  it("prepares next month from the 25th only", () => {
    expect(monthToPrepare("2026-11-24")).toBeNull();
    expect(monthToPrepare("2026-11-25")).toBe("2026-12");
    expect(monthToPrepare("2026-12-31")).toBe("2027-01");
  });

  it("picks active engagements without the month, inside their dates", () => {
    const engagements = [
      { id: "a", status: "active", starts_on: null, ends_on: null },
      { id: "b", status: "active", starts_on: null, ends_on: null },
      { id: "c", status: "paused", starts_on: null, ends_on: null },
      { id: "d", status: "active", starts_on: null, ends_on: "2026-11-30" },
      { id: "e", status: "active", starts_on: "2027-01-05", ends_on: null },
      { id: "f", status: "active", starts_on: "2026-12-20", ends_on: null },
    ] as const;
    const cycles = [
      { engagement_id: "b", month: "2026-12" },
      { engagement_id: "a", month: "2026-11" },
    ];
    expect(
      engagementsNeedingCycle(engagements, cycles, "2026-12").map(
        (item) => item.id,
      ),
    ).toEqual(["a", "f"]);
  });

  it("carries last month's agreed numbers into the new month, in order", () => {
    const lines = linesFromLastMonth(
      [
        { kind: "video", label: "Videos", planned: 1, owner_role: null, due_rule: null, position: 2 },
        { kind: "blog", label: "Blogs", planned: 6, owner_role: "writer", due_rule: "weekly", position: 0 },
      ],
      "cycle-2",
    );
    expect(lines).toEqual([
      { cycle_id: "cycle-2", kind: "blog", label: "Blogs", planned: 6, owner_role: "writer", due_rule: "weekly", position: 0 },
      { cycle_id: "cycle-2", kind: "video", label: "Videos", planned: 1, owner_role: null, due_rule: null, position: 1 },
    ]);
  });

  it("seeds scope lines from a template, in order", () => {
    const lines = linesFromTemplate(
      DEFAULT_TEMPLATES.blogs_only.lines,
      "cycle-1",
    );
    expect(lines).toEqual([
      {
        cycle_id: "cycle-1",
        kind: "blog",
        label: "Blogs",
        planned: 4,
        owner_role: "writer",
        due_rule: "weekly",
        position: 0,
      },
      {
        cycle_id: "cycle-1",
        kind: "republish",
        label: "Republish (Medium or dev.to)",
        planned: 0,
        owner_role: "writer",
        due_rule: "weekly",
        position: 1,
      },
      {
        cycle_id: "cycle-1",
        kind: "report",
        label: "Monthly report",
        planned: 1,
        owner_role: "founder",
        due_rule: "end_of_month",
        position: 2,
      },
    ]);
  });

  it("has a default template for every engagement type, and uses a saved one first", () => {
    for (const type of ENGAGEMENT_TYPES)
      expect(DEFAULT_TEMPLATES[type.value].lines.length).toBeGreaterThan(0);
    expect(templateFor("campaign").custom).toBe(false);
    const saved = [
      { engagement_type: "campaign" as const, lines: [], rhythm: "Custom" },
    ];
    expect(templateFor("campaign", saved)).toEqual({
      lines: [],
      rhythm: "Custom",
      custom: true,
    });
  });
});

describe("weeks and months", () => {
  it("uses Monday weeks", () => {
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekLabel("2026-11-09")).toBe("9–15 Nov");
    expect(weekLabel("2026-11-30")).toBe("30 Nov – 6 Dec");
    expect(weeksOfMonth("2026-11")).toEqual([
      "2026-10-26",
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
    ]);
  });

  it("knows how far into a month we are", () => {
    expect(monthElapsed("2026-11", "2026-11-15")).toBe(0.5);
    expect(monthElapsed("2026-10", "2026-11-15")).toBe(1);
    expect(monthElapsed("2026-12", "2026-11-15")).toBe(0);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthLabel("2026-11")).toBe("November 2026");
  });
});

describe("IST days at the midnight edge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("turns the day at 18:30 UTC, IST midnight", () => {
    expect(todayKey(new Date("2026-11-30T18:29:59Z"))).toBe("2026-11-30");
    expect(todayKey(new Date("2026-11-30T18:30:00Z"))).toBe("2026-12-01");
    expect(thisMonth(new Date("2026-11-30T18:29:59Z"))).toBe("2026-11");
    expect(thisMonth(new Date("2026-11-30T18:30:00Z"))).toBe("2026-12");
  });

  it("turns the year at IST midnight on 31 Dec", () => {
    expect(todayKey(new Date("2026-12-31T18:29:59Z"))).toBe("2026-12-31");
    expect(todayKey(new Date("2026-12-31T18:30:00Z"))).toBe("2027-01-01");
    expect(thisMonth(new Date("2026-12-31T18:29:59Z"))).toBe("2026-12");
    expect(thisMonth(new Date("2026-12-31T18:30:00Z"))).toBe("2027-01");
  });

  it("reads the clock in IST when no time is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T18:29:59Z"));
    expect(todayKey()).toBe("2026-12-31");
    expect(thisMonth()).toBe("2026-12");
    vi.setSystemTime(new Date("2026-12-31T18:30:00Z"));
    expect(todayKey()).toBe("2027-01-01");
    expect(thisMonth()).toBe("2027-01");
    // Sunday 22 Nov 23:59 IST, then Monday 23 Nov 00:00 IST.
    vi.setSystemTime(new Date("2026-11-22T18:29:59Z"));
    expect(weekStart()).toBe("2026-11-16");
    vi.setSystemTime(new Date("2026-11-22T18:30:00Z"));
    expect(weekStart()).toBe("2026-11-23");
  });
});

describe("Monday weeks across edges", () => {
  it("puts a Sunday in the week of the Monday before it", () => {
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
  });

  it("starts New Year's week in the old year", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
    expect(weekStart("2027-01-03")).toBe("2026-12-28");
    expect(weekStart("2027-01-04")).toBe("2027-01-04");
    expect(weekLabel("2026-12-28")).toBe("28 Dec – 3 Jan");
  });

  it("shifts weeks and months across years", () => {
    expect(shiftWeek("2026-12-28", 1)).toBe("2027-01-04");
    expect(shiftWeek("2027-01-04", -1)).toBe("2026-12-28");
    expect(shiftWeek("2026-12-28", -52)).toBe("2025-12-29");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2026-11", 14)).toBe("2028-01");
    expect(shiftMonth("2026-01", -13)).toBe("2024-12");
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
  });

  it("takes only a real Monday as a week key", () => {
    expect(isWeekKey("2026-11-16")).toBe(true);
    expect(isWeekKey("2026-12-28")).toBe(true);
    expect(isWeekKey("2026-11-17")).toBe(false);
    expect(isWeekKey("2026-11-22")).toBe(false);
    expect(isWeekKey("2026-02-30")).toBe(false);
    expect(isWeekKey("2026-11-16T00:00:00Z")).toBe(false);
    expect(isWeekKey(null)).toBe(false);
    expect(isMonthKey("2026-12")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
  });
});

describe("which month the cron prepares", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prepares next month on and after the 25th, across the year", () => {
    expect(monthToPrepare("2026-11-25")).toBe("2026-12");
    expect(monthToPrepare("2026-11-30")).toBe("2026-12");
    expect(monthToPrepare("2026-12-25")).toBe("2027-01");
    expect(monthToPrepare("2026-12-31")).toBe("2027-01");
  });

  // Asked for "before the 25th → this month"; the source (and its doc
  // comment) returns null before the 25th. Not asserted here; see report.
  it("reads the 25th in IST from the clock", () => {
    vi.useFakeTimers();
    // 24 Nov 23:59:59 IST.
    vi.setSystemTime(new Date("2026-11-24T18:29:59Z"));
    expect(monthToPrepare()).toBeNull();
    // 25 Nov 00:00 IST, still the 24th in UTC.
    vi.setSystemTime(new Date("2026-11-24T18:30:00Z"));
    expect(monthToPrepare()).toBe("2026-12");
    // 25 Dec 00:00 IST.
    vi.setSystemTime(new Date("2026-12-24T18:30:00Z"));
    expect(monthToPrepare()).toBe("2027-01");
  });
});

describe("the migration", () => {
  const sql = readFileSync(
    new URL(
      "../../../supabase/migrations/20261115130000_client_work.sql",
      import.meta.url,
    ),
    "utf8",
  );
  it("allows exactly the kinds, statuses and types the code knows", () => {
    for (const option of [
      ...DELIVERABLE_KINDS,
      ...DELIVERABLE_STATUSES,
      ...ENGAGEMENT_TYPES,
    ])
      expect(sql).toContain(`'${option.value}'`);
    const kinds =
      sql.match(/kind text not null check \(kind in \(([^)]*)\)/)?.[1] ?? "";
    expect(
      kinds
        .match(/'[a-z_]+'/g)
        ?.map((item) => item.slice(1, -1))
        .sort(),
    ).toEqual(DELIVERABLE_KINDS.map((option) => option.value).sort());
  });
  it("adds the client roles without dropping the others", () => {
    expect(sql).toContain("'community_manager', 'community_viewer',");
    expect(sql).toContain("'client_manager', 'client_member'");
    expect(sql).toContain("like '%client_manager%'");
  });
});
