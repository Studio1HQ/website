import { describe, expect, it } from "vitest";
import {
  addCounts,
  companyTerm,
  companyTotals,
  countsTotal,
  doneOfPlanned,
  headline,
  monthRange,
  perMonth,
  pieceCounts,
  planOf,
  projectRows,
} from "@/lib/internal/clients/portfolio";
import type { ClientAccount, Cycle, Deliverable, Engagement, ScopeLine } from "@/lib/internal/clients/schema";

const stamps = {
  created_at: "2026-11-01T04:00:00Z",
  updated_at: "2026-11-01T04:00:00Z",
  created_by: null,
  updated_by: null,
};

const client = (over: Partial<ClientAccount>) => ({ ...stamps, id: "k1", name: "Acme", slug: "acme", status: "active", ...over }) as ClientAccount;
const engagement = (over: Partial<Engagement>) =>
  ({ ...stamps, id: "e1", client_id: "k1", name: "Acme DevRel", type: "devrel", status: "active", owner: null, ...over }) as Engagement;
const cycle = (over: Partial<Cycle>) => ({ ...stamps, id: "c1", engagement_id: "e1", month: "2026-11", state: "active", ...over }) as Cycle;
const line = (over: Partial<ScopeLine>) => ({ ...stamps, id: "l1", cycle_id: "c1", planned: 4, ...over }) as ScopeLine;
const piece = (over: Partial<Deliverable>) =>
  ({
    ...stamps,
    id: "d1",
    engagement_id: "e1",
    cycle_id: "c1",
    status: "in_progress",
    blocked: false,
    waits_on: null,
    due_on: null,
    client_due_on: null,
    views: null,
    ...over,
  }) as Deliverable;

describe("piece counts", () => {
  it("groups pieces from not started to live, and counts planned ones not added yet", () => {
    const counts = pieceCounts(6, [
      piece({ status: "published" }),
      piece({ status: "approved" }),
      piece({ status: "client_review" }),
      piece({ status: "changes_requested" }),
      piece({ status: "planned" }),
    ]);
    expect(counts).toEqual({ live: 1, approved: 1, withClient: 1, working: 1, notStarted: 2 });
    expect(countsTotal(counts)).toBe(6);
  });

  it("adds up to the pieces when there are more than planned", () => {
    const counts = pieceCounts(1, [piece({ status: "published" }), piece({ status: "published" })]);
    expect(counts.notStarted).toBe(0);
    expect(countsTotal(counts)).toBe(2);
  });

  it("adds several projects' counts", () => {
    const one = pieceCounts(2, [piece({ status: "published" })]);
    expect(addCounts([one, one])).toEqual({ live: 2, approved: 0, withClient: 0, working: 0, notStarted: 2 });
  });
});

describe("project rows", () => {
  const clients = [client({}), client({ id: "k2", name: "Bolt", slug: "bolt" })];
  const engagements = [
    engagement({}),
    engagement({ id: "e2", name: "Acme Launch" }),
    engagement({ id: "e3", client_id: "k2", name: "Bolt Blogs" }),
  ];
  const cycles = [
    cycle({}),
    cycle({ id: "c2", engagement_id: "e3", month: "2026-10" }),
    cycle({ id: "c3", engagement_id: "e3" }),
    cycle({ id: "c4", engagement_id: "gone" }),
  ];
  const rows = projectRows({
    clients,
    engagements,
    cycles,
    lines: [line({}), line({ id: "l2", planned: 2 }), line({ id: "l3", cycle_id: "c3", planned: 3 })],
    deliverables: [
      piece({ id: "a", status: "published", views: 1200 }),
      piece({ id: "b", status: "client_review", client_due_on: "2026-11-10" }),
      piece({ id: "c", status: "in_progress", blocked: true, due_on: "2026-11-12" }),
      piece({ id: "d", cycle_id: "c3", status: "published", views: 50 }),
    ],
    today: "2026-11-20",
  });

  it("makes one row per project, newest month first, and skips ones with no company", () => {
    expect(rows.map((row) => row.cycle.id)).toEqual(["c1", "c3", "c2"]);
  });

  it("knows how far each got and what's held up", () => {
    const acme = rows[0];
    expect(acme.planned).toBe(6);
    expect(acme.counts).toEqual({ live: 1, approved: 0, withClient: 1, working: 1, notStarted: 3 });
    expect(acme.views).toBe(1200);
    expect(acme.waiting).toBe(1);
    expect(acme.blocked).toBe(1);
    expect(acme.late).toBe(1);
    // Acme has two engagements, so its links name which one.
    expect(acme.several).toBe(true);
    expect(rows[1].several).toBe(false);
  });

  it("adds up done of planned without extra pieces passing the plan", () => {
    // Bolt's October has no plan set and no pieces: it adds nothing.
    expect(doneOfPlanned(rows)).toEqual({ done: 2, planned: 9 });
    expect(doneOfPlanned([{ planned: 1, counts: pieceCounts(1, [piece({ status: "published" }), piece({ status: "published" })]) }])).toEqual({
      done: 1,
      planned: 1,
    });
  });

  it("counts a month with no plan set by the pieces it had", () => {
    const unplanned = { planned: 0, counts: pieceCounts(0, [piece({ status: "published" }), piece({ status: "in_progress" })]) };
    expect(planOf(unplanned)).toBe(2);
    expect(doneOfPlanned([unplanned])).toEqual({ done: 1, planned: 2 });
  });

  it("adds each company up, most live pieces first, with its newest month", () => {
    const totals = companyTotals(rows);
    expect(totals.map((row) => row.client.name)).toEqual(["Acme", "Bolt"]);
    expect(totals[1].projects).toBe(2);
    expect(totals[1].latest).toEqual({ month: "2026-11", done: 1, planned: 3 });
    expect(totals[0].heldUp).toBe(3);
  });

  it("adds planned and live up per month", () => {
    expect(perMonth(rows, ["2026-10", "2026-11"])).toEqual([
      { month: "2026-10", planned: 0, live: 0, views: 0, projects: 1 },
      { month: "2026-11", planned: 9, live: 2, views: 1250, projects: 2 },
    ]);
  });
});

describe("headline numbers", () => {
  it("counts live, reach, with the client and in the works", () => {
    const numbers = headline(
      [
        piece({ status: "published", views: 300 }),
        piece({ status: "published" }),
        piece({ status: "client_review", client_due_on: "2026-11-01" }),
        piece({ status: "client_review", client_due_on: "2026-12-01" }),
        piece({ status: "approved" }),
        piece({ status: "planned" }),
      ],
      [{ month: "2026-11" }, { month: "2026-09" }],
      "2026-11-20",
    );
    expect(numbers).toEqual({
      live: 2,
      reach: 300,
      withViews: 1,
      withClient: 2,
      overdue: 1,
      approved: 1,
      working: 1,
      firstMonth: "2026-09",
    });
  });
});

describe("month range", () => {
  it("runs from the first month to the last, oldest first, newest kept when capped", () => {
    expect(monthRange("2026-09", "2026-11")).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(monthRange("2025-01", "2026-11", 3)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(monthRange(null, "2026-11")).toEqual([]);
    expect(monthRange("2026-12", "2026-11")).toEqual(["2026-11"]);
  });
});

describe("company term", () => {
  const work = (status: Engagement["status"], starts_on: string | null, ends_on: string | null) => ({ status, starts_on, ends_on });
  it("is ongoing while a running project has no end date", () => {
    expect(companyTerm({ started_on: null }, [work("active", "2026-09-01", null), work("active", "2026-10-01", "2027-01-31")])).toEqual({
      since: "2026-09-01",
      ends: null,
      ongoing: true,
      ended: false,
    });
  });
  it("ends with the latest running project when they all have end dates", () => {
    expect(companyTerm({ started_on: "2026-08-15" }, [work("active", null, "2026-12-31"), work("ended", null, "2027-03-01")])).toEqual({
      since: "2026-08-15",
      ends: "2026-12-31",
      ongoing: false,
      ended: false,
    });
  });
  it("has ended once every project has, on the last end date", () => {
    expect(companyTerm({ started_on: null }, [work("ended", "2026-06-01", "2026-09-30"), work("ended", null, "2026-10-15")])).toEqual({
      since: "2026-06-01",
      ends: "2026-10-15",
      ongoing: false,
      ended: true,
    });
    expect(companyTerm({ started_on: null }, [])).toEqual({ since: null, ends: null, ongoing: false, ended: false });
  });
});
