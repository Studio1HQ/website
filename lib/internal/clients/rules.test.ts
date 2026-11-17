import { describe, expect, it } from "vitest";
import {
  BLOCKED_RED_DAYS,
  MEMBER_FIELDS,
  blockProblem,
  blockedDays,
  canChangeDeliverable,
  canMove,
  cycleProgress,
  daysStuck,
  engagementHealth,
  engagementRows,
  isDueInWeek,
  isLate,
  isWaitingOnClient,
  moveNeeds,
  moveProblem,
  needsMe,
  nextStatuses,
  ownerLoad,
  plannedVsDelivered,
  reportRows,
  scopeLineProgress,
  slippedItems,
  stuckSince,
  waitsOnClient,
  memberMayStartAt,
  clashText,
  editClashes,
  formValueOf,
} from "@/lib/internal/clients/rules";
import {
  isOwnedBy,
  type ClientAccount,
  type ClientPerson,
  type Cycle,
  type Deliverable,
  type Engagement,
  type ScopeLine,
} from "@/lib/internal/clients/schema";

const stamps = {
  created_at: "2026-11-01T04:00:00Z",
  updated_at: "2026-11-01T04:00:00Z",
  created_by: null,
  updated_by: null,
};

function item(over: Partial<Deliverable> = {}): Deliverable {
  return {
    ...stamps,
    id: "d1",
    engagement_id: "e1",
    cycle_id: "c1",
    scope_line_id: "l1",
    title: "Post",
    kind: "blog",
    owner: "priya@studio1hq.com",
    reviewer: "arindam@studio1hq.com",
    status: "in_progress",
    status_changed_at: "2026-11-02T04:00:00Z",
    published_at: null,
    blocked: false,
    block_reason: "",
    waits_on: null,
    blocked_at: null,
    week: "2026-11-09",
    due_on: null,
    client_due_on: null,
    size: "M",
    draft_url: null,
    review_url: null,
    pr_url: null,
    published_url: null,
    notes: "",
    ...over,
  };
}

function line(over: Partial<ScopeLine> = {}): ScopeLine {
  return {
    ...stamps,
    id: "l1",
    cycle_id: "c1",
    kind: "blog",
    label: "Blogs",
    planned: 4,
    owner_role: "writer",
    due_rule: "weekly",
    position: 0,
    notes: "",
    ...over,
  };
}

describe("status workflow", () => {
  it("follows the plan's flow", () => {
    expect(nextStatuses("planned")).toEqual(["in_progress"]);
    expect(nextStatuses("in_progress")).toEqual([
      "planned",
      "internal_review",
      "client_review",
    ]);
    expect(nextStatuses("internal_review")).toEqual([
      "in_progress",
      "client_review",
    ]);
    expect(nextStatuses("client_review")).toEqual([
      "changes_requested",
      "approved",
    ]);
    expect(nextStatuses("changes_requested")).toEqual(["in_progress"]);
    expect(nextStatuses("approved")).toEqual(["published"]);
    expect(nextStatuses("published")).toEqual([]);
  });

  it("lets internal work skip Client review, and only internal work", () => {
    expect(canMove("internal_review", "approved")).toBe(false);
    expect(canMove("internal_review", "approved", { internal: true })).toBe(
      true,
    );
    expect(canMove("in_progress", "approved", { internal: true })).toBe(false);
  });

  it("says what a move needs", () => {
    expect(moveNeeds("published")).toEqual({
      publishedUrl: true,
      clientDueOn: false,
    });
    expect(moveNeeds("client_review")).toEqual({
      publishedUrl: false,
      clientDueOn: true,
    });
    expect(moveNeeds("approved")).toEqual({
      publishedUrl: false,
      clientDueOn: false,
    });
  });

  it("needs a live link to publish and a reply date for client review", () => {
    const approved = item({ status: "approved" });
    expect(moveProblem(approved, "published", {})).toMatch(/published link/);
    expect(
      moveProblem(approved, "published", {
        published_url: "https://x.dev/post",
      }),
    ).toBeNull();
    expect(
      moveProblem(
        { ...approved, published_url: "https://x.dev/post" },
        "published",
        {},
      ),
    ).toBeNull();

    const review = item({ status: "internal_review" });
    expect(
      moveProblem(review, "client_review", {}, { today: "2026-11-10" }),
    ).toMatch(/reply by/);
    expect(
      moveProblem(
        review,
        "client_review",
        { client_due_on: "2026-11-05" },
        { today: "2026-11-10" },
      ),
    ).toMatch(/past/);
    expect(
      moveProblem(
        review,
        "client_review",
        { client_due_on: "2026-11-14" },
        { today: "2026-11-10" },
      ),
    ).toBeNull();
  });

  it("refuses moves the flow doesn't allow", () => {
    expect(
      moveProblem(item({ status: "planned" }), "published", {
        published_url: "https://x.dev",
      }),
    ).toMatch(/can't go/);
    expect(moveProblem(item({ status: "planned" }), "planned", {})).toMatch(
      /already/,
    );
  });

  it("needs a reason and who a block waits on", () => {
    expect(blockProblem({ reason: "", waits_on: "client" })).toMatch(
      /waiting for/,
    );
    expect(blockProblem({ reason: "Access", waits_on: "nobody" })).toMatch(
      /who/,
    );
    expect(blockProblem({ reason: "Access", waits_on: "client" })).toBeNull();
  });
});

describe("who may change a deliverable", () => {
  const deliverable = {
    owner: "priya@studio1hq.com",
    reviewer: "ravi@studio1hq.com",
  };
  it("lets managers change any", () => {
    expect(
      canChangeDeliverable(
        { email: "boss@studio1hq.com", clients: "manager" },
        deliverable,
      ),
    ).toBe(true);
  });
  it("lets members change only what they own or review", () => {
    expect(
      canChangeDeliverable(
        { email: "Priya@studio1hq.com", clients: "member" },
        deliverable,
      ),
    ).toBe(true);
    expect(
      canChangeDeliverable(
        { email: "ravi@studio1hq.com", clients: "member" },
        deliverable,
      ),
    ).toBe(true);
    expect(
      canChangeDeliverable(
        { email: "sam@studio1hq.com", clients: "member" },
        deliverable,
      ),
    ).toBe(false);
  });
  it("lets nobody else change anything", () => {
    expect(
      canChangeDeliverable(
        { email: "priya@studio1hq.com", clients: null },
        deliverable,
      ),
    ).toBe(false);
  });
});

describe("waiting, late and stuck", () => {
  it("counts waiting on the client from the day after the reply date", () => {
    const review = item({
      status: "client_review",
      client_due_on: "2026-11-10",
    });
    expect(isWaitingOnClient(review, "2026-11-10")).toBe(false);
    expect(isWaitingOnClient(review, "2026-11-11")).toBe(true);
    expect(
      isWaitingOnClient({ ...review, status: "approved" }, "2026-11-11"),
    ).toBe(false);
    expect(
      waitsOnClient(item({ blocked: true, waits_on: "client" }), "2026-11-01"),
    ).toBe(true);
  });

  it("never calls client review late by Studio1, nor published work", () => {
    expect(isLate(item({ due_on: "2026-11-05" }), "2026-11-06")).toBe(true);
    expect(isLate(item({ due_on: "2026-11-05" }), "2026-11-05")).toBe(false);
    expect(
      isLate(
        item({ due_on: "2026-11-05", status: "client_review" }),
        "2026-11-20",
      ),
    ).toBe(false);
    expect(
      isLate(item({ due_on: "2026-11-05", status: "published" }), "2026-11-20"),
    ).toBe(false);
  });

  it("counts blocked days in IST", () => {
    expect(blockedDays(item(), "2026-11-10")).toBeNull();
    expect(
      blockedDays(
        item({ blocked: true, blocked_at: "2026-11-01T20:00:00Z" }),
        "2026-11-10",
      ),
    ).toBe(8);
  });

  it("is stuck since its latest event", () => {
    const deliverable = item();
    expect(stuckSince(deliverable)).toBe("2026-11-02T04:00:00Z");
    const events = [
      { deliverable_id: "d1", at: "2026-11-04T04:00:00Z" },
      { deliverable_id: "d2", at: "2026-11-09T04:00:00Z" },
    ];
    expect(stuckSince(deliverable, events)).toBe("2026-11-04T04:00:00Z");
    expect(daysStuck(deliverable, events, "2026-11-10")).toBe(6);
  });

  it("is due in a week by due date, else by its planned week", () => {
    expect(
      isDueInWeek(item({ due_on: "2026-11-15", week: null }), "2026-11-09"),
    ).toBe(true);
    expect(
      isDueInWeek(
        item({ due_on: "2026-11-16", week: "2026-11-09" }),
        "2026-11-09",
      ),
    ).toBe(false);
    expect(
      isDueInWeek(item({ due_on: null, week: "2026-11-09" }), "2026-11-09"),
    ).toBe(true);
  });
});

describe("progress", () => {
  const items = [
    item({ id: "a", status: "published" }),
    item({ id: "b", status: "approved" }),
    item({ id: "c", status: "in_progress" }),
    item({ id: "d", status: "published", scope_line_id: null, kind: "video" }),
  ];
  it("counts only published as done, approved apart", () => {
    expect(scopeLineProgress(line(), items)).toEqual({
      planned: 4,
      done: 1,
      approved: 1,
      open: 2,
      ratio: 0.25,
    });
    expect(
      cycleProgress([line(), line({ id: "l2", planned: 2 })], items),
    ).toMatchObject({ planned: 6, done: 2, ratio: 2 / 6 });
    expect(cycleProgress([], items).ratio).toBe(0);
  });

  it("lists planned against delivered by kind", () => {
    expect(plannedVsDelivered([line()], items)).toEqual([
      { kind: "blog", label: "Blogs", planned: 4, done: 1, approved: 1 },
      { kind: "video", label: "Video", planned: 0, done: 1, approved: 0 },
    ]);
  });
});

describe("engagement health", () => {
  const lines = [line({ planned: 10 })];
  it("is red when blocked over 7 days", () => {
    const health = engagementHealth({
      month: "2026-11",
      lines,
      deliverables: [
        item({ blocked: true, blocked_at: "2026-11-01T04:00:00Z" }),
      ],
      today: "2026-11-10",
    });
    expect(health.level).toBe("red");
    expect(health.reason).toMatch(/blocked for 9 days/i);
  });

  it("is red past 75% of the month with under half done", () => {
    const health = engagementHealth({
      month: "2026-11",
      lines,
      deliverables: [item({ status: "published" })],
      today: "2026-11-25",
    });
    expect(health.level).toBe("red");
    expect(health.reason).toMatch(/1 of 10 done/);
  });

  it("is amber when anything is blocked or late, or slow past halfway", () => {
    expect(
      engagementHealth({
        month: "2026-11",
        lines,
        deliverables: [
          item({ blocked: true, blocked_at: "2026-11-08T04:00:00Z" }),
        ],
        today: "2026-11-10",
      }).level,
    ).toBe("amber");
    expect(
      engagementHealth({
        month: "2026-11",
        lines,
        deliverables: [item({ due_on: "2026-11-05" })],
        today: "2026-11-10",
      }).reason,
    ).toMatch(/late/);
    expect(
      engagementHealth({
        month: "2026-11",
        lines,
        deliverables: [],
        today: "2026-11-17",
      }).level,
    ).toBe("amber");
  });

  it("is green otherwise", () => {
    expect(
      engagementHealth({
        month: "2026-11",
        lines,
        deliverables: [],
        today: "2026-11-10",
      }).level,
    ).toBe("green");
    expect(
      engagementHealth({
        month: "2026-11",
        lines: [],
        deliverables: [],
        today: "2026-11-28",
      }),
    ).toEqual({
      level: "green",
      reason: "Nothing planned yet this month",
    });
  });
});

describe("engagement health at the edges", () => {
  const lines = [line({ planned: 10 })];
  const health = (
    deliverables: Deliverable[],
    today: string,
    month = "2026-11",
    scope = lines,
  ) => engagementHealth({ month, lines: scope, deliverables, today });

  it("is red only after more than 7 days blocked", () => {
    expect(BLOCKED_RED_DAYS).toBe(7);
    // Blocked on 3 Nov (IST), 7 days by the 10th: amber.
    const seven = health(
      [item({ blocked: true, blocked_at: "2026-11-03T04:00:00Z" })],
      "2026-11-10",
    );
    expect(seven.level).toBe("amber");
    expect(seven.reason).toBe("1 item blocked");
    const eight = health(
      [item({ blocked: true, blocked_at: "2026-11-02T04:00:00Z" })],
      "2026-11-10",
    );
    expect(eight.level).toBe("red");
    expect(eight.reason).toMatch(/blocked for 8 days/i);
  });

  it("counts the blocked day in IST", () => {
    // 18:30 UTC on 2 Nov is 3 Nov in IST: 7 days.
    expect(
      health(
        [item({ blocked: true, blocked_at: "2026-11-02T18:30:00Z" })],
        "2026-11-10",
      ).level,
    ).toBe("amber");
    expect(
      health(
        [item({ blocked: true, blocked_at: "2026-11-02T18:29:59Z" })],
        "2026-11-10",
      ).level,
    ).toBe("red");
  });

  it("is red only past 75% of the month, not at it", () => {
    // February 2027 has 28 days: the 21st is exactly 0.75.
    const atEdge = health(
      [item({ status: "published" })],
      "2027-02-21",
      "2027-02",
    );
    expect(atEdge.level).not.toBe("red");
    expect(atEdge.reason).toMatch(/75% of the month gone/);
    expect(
      health([item({ status: "published" })], "2027-02-22", "2027-02").level,
    ).toBe("red");
  });

  it("is not red with exactly half done", () => {
    const four = [line({ planned: 4 })];
    const half = health(
      [
        item({ id: "a", status: "published" }),
        item({ id: "b", status: "published" }),
      ],
      "2026-11-29",
      "2026-11",
      four,
    );
    expect(half.level).toBe("green");
    expect(half.reason).toMatch(/^2 of 4 done/);
    expect(
      health(
        [item({ id: "a", status: "published" })],
        "2026-11-29",
        "2026-11",
        four,
      ).level,
    ).toBe("red");
  });

  it("ignores a published item still flagged blocked", () => {
    const result = health(
      [
        item({
          status: "published",
          blocked: true,
          blocked_at: "2026-10-01T04:00:00Z",
        }),
      ],
      "2026-11-10",
    );
    expect(result.level).toBe("green");
    expect(result.reason).not.toMatch(/blocked/);
  });

  it("treats a block with no time as blocked today, not old", () => {
    expect(blockedDays(item({ blocked: true, blocked_at: null }), "2026-11-28")).toBe(0);
    const result = health(
      [item({ blocked: true, blocked_at: null })],
      "2026-11-10",
    );
    expect(result).toEqual({ level: "amber", reason: "1 item blocked" });
  });
});

describe("who owns or reviews", () => {
  it("matches emails whatever the case or spacing", () => {
    expect(isOwnedBy("Priya@Studio1HQ.com", "priya@studio1hq.com")).toBe(true);
    expect(isOwnedBy(" priya@studio1hq.com ", "PRIYA@studio1hq.com")).toBe(true);
    expect(isOwnedBy("priya@studio1hq.com", "priyak@studio1hq.com")).toBe(false);
  });

  it("never matches a missing owner or a missing email", () => {
    expect(isOwnedBy(null, "priya@studio1hq.com")).toBe(false);
    expect(isOwnedBy(undefined, "priya@studio1hq.com")).toBe(false);
    expect(isOwnedBy("", "")).toBe(false);
    expect(isOwnedBy("priya@studio1hq.com", "")).toBe(false);
    // A typed name is not proof of who someone is.
    expect(isOwnedBy("Priya", "priya@studio1hq.com")).toBe(false);
  });

  it("lets a member change nothing with no owner or reviewer set", () => {
    expect(
      canChangeDeliverable(
        { email: "priya@studio1hq.com", clients: "member" },
        { owner: null, reviewer: null },
      ),
    ).toBe(false);
    expect(
      canChangeDeliverable(
        { email: "", clients: "member" },
        { owner: null, reviewer: null },
      ),
    ).toBe(false);
    expect(
      canChangeDeliverable(
        { email: "RAVI@studio1hq.com ", clients: "member" },
        { owner: null, reviewer: "ravi@studio1hq.com" },
      ),
    ).toBe(true);
    expect(
      canChangeDeliverable(
        { email: "priya@studio1hq.com", clients: undefined },
        { owner: "priya@studio1hq.com", reviewer: null },
      ),
    ).toBe(false);
  });

  it("keeps who, what and where out of a member's fields", () => {
    const fields: readonly string[] = MEMBER_FIELDS;
    for (const field of [
      "owner",
      "reviewer",
      "status",
      "blocked",
      "title",
      "kind",
      "size",
      "cycle_id",
      "engagement_id",
      "scope_line_id",
    ])
      expect(fields).not.toContain(field);
    expect(fields).toContain("due_on");
    expect(fields).toContain("published_url");
  });

  it("counts reviews for the reviewer whatever the case of their email", () => {
    const items = [
      item({
        id: "r",
        owner: "sam@studio1hq.com",
        reviewer: "Priya@Studio1hq.com",
        status: "internal_review",
      }),
      item({
        id: "s",
        owner: "sam@studio1hq.com",
        reviewer: "priya@studio1hq.com",
        status: "client_review",
      }),
    ];
    expect(
      needsMe("PRIYA@studio1hq.com", items, new Set(), "2026-11-10"),
    ).toEqual({ late: 0, due: 0, toReview: 1, blocked: 0 });
  });
});

describe("engagement rows", () => {
  const client = {
    ...stamps,
    id: "k1",
    name: "Acme",
    slug: "acme",
  } as ClientAccount;
  const engagement = (over: Partial<Engagement>) =>
    ({
      ...stamps,
      id: "e1",
      client_id: "k1",
      name: "Docs",
      type: "blogs_only",
      status: "active",
      ...over,
    }) as Engagement;
  const cycle = {
    ...stamps,
    id: "c1",
    engagement_id: "e1",
    month: "2026-11",
    state: "active",
  } as Cycle;
  it("summarises each engagement's month, riskiest first, ended ones left out", () => {
    const rows = engagementRows({
      clients: [client],
      engagements: [
        engagement({}),
        engagement({ id: "e2", name: "Launch" }),
        engagement({ id: "e3", status: "ended" }),
      ],
      cycles: [cycle],
      lines: [line()],
      deliverables: [
        item({
          id: "a",
          status: "client_review",
          client_due_on: "2026-11-05",
          updated_at: "2026-11-06T00:00:00Z",
        }),
        item({ id: "b", status: "published" }),
      ],
      today: "2026-11-10",
    });
    expect(rows.map((row) => row.engagement.id)).toEqual(["e2", "e1"]);
    expect(rows[0].health.reason).toMatch(/hasn't been started/);
    expect(rows[1]).toMatchObject({
      inClientReview: 1,
      waitingOnClient: 1,
      blocked: 0,
      lastUpdate: "2026-11-06T00:00:00Z",
    });
    expect(rows[1].progress.done).toBe(1);
  });
});

describe("owner load", () => {
  const people: ClientPerson[] = [
    {
      ...stamps,
      email: "priya@studio1hq.com",
      name: "Priya",
      role: "writer",
      weekly_capacity: 3,
      slack_user_id: "",
      active: true,
    },
    {
      ...stamps,
      email: "idle@studio1hq.com",
      name: "",
      role: "ops",
      weekly_capacity: 5,
      slack_user_id: "",
      active: true,
    },
  ];
  it("adds points due this week against capacity and flags anyone over", () => {
    const rows = ownerLoad(
      people,
      [
        item({ id: "a", size: "L", due_on: "2026-11-11" }),
        item({
          id: "b",
          size: "S",
          due_on: null,
          week: "2026-11-09",
          blocked: true,
          blocked_at: "2026-11-09T00:00:00Z",
        }),
        item({ id: "c", size: "M", due_on: "2026-11-20" }),
        item({ id: "d", size: "L", due_on: "2026-11-12", status: "published" }),
        item({
          id: "e",
          owner: "sam@studio1hq.com",
          reviewer: "priya@studio1hq.com",
          status: "internal_review",
          due_on: "2026-11-03",
        }),
      ],
      "2026-11-09",
      "2026-11-10",
    );
    const priya = rows.find((row) => row.email === "priya@studio1hq.com")!;
    expect(priya).toMatchObject({
      name: "Priya",
      capacity: 3,
      points: 4,
      due: 2,
      over: true,
      blocked: 1,
      toReview: 1,
    });
    const sam = rows.find((row) => row.email === "sam@studio1hq.com")!;
    expect(sam).toMatchObject({
      capacity: null,
      inReview: 1,
      late: 1,
      over: false,
    });
    expect(
      rows.find((row) => row.email === "idle@studio1hq.com"),
    ).toMatchObject({ points: 0, name: "Idle" });
    expect(rows[0].email).toBe("priya@studio1hq.com");
  });
});

describe("report rows and slipped items", () => {
  const today = "2026-11-20";
  const items = [
    item({
      id: "live",
      title: "Live one",
      status: "published",
      published_at: "2026-11-12T06:00:00Z",
      published_url: "https://x.dev/a",
    }),
    item({
      id: "wait",
      title: "With client",
      status: "client_review",
      client_due_on: "2026-11-18",
      review_url: "https://docs.google.com/x",
    }),
    item({
      id: "block",
      title: "Blocked one",
      blocked: true,
      waits_on: "third_party",
      block_reason: "API access",
      due_on: "2026-11-25",
    }),
    item({
      id: "todo",
      title: "Not started",
      status: "planned",
      due_on: "2026-11-10",
    }),
  ];

  it("answers ready, missing, owner and date, without draft links", () => {
    const rows = reportRows(items, {
      today,
      names: { "priya@studio1hq.com": "Priya S" },
    });
    expect(rows.map((row) => row.state)).toEqual([
      "live",
      "waiting_on_client",
      "blocked",
      "not_started",
    ]);
    expect(rows[0]).toMatchObject({
      ready: true,
      dateLabel: "Live 12 Nov",
      url: "https://x.dev/a",
      owner: "Priya S",
    });
    expect(rows[1]).toMatchObject({
      ready: false,
      dateLabel: "Client to reply by 18 Nov",
      url: null,
    });
    expect(rows[2].note).toBe("API access");
    expect(JSON.stringify(rows)).not.toContain("docs.google.com");
  });

  it("lists what slipped and why", () => {
    const current = slippedItems({ month: "2026-11" }, items, today);
    expect(current.map((entry) => entry.deliverable.id)).toEqual([
      "wait",
      "todo",
    ]);
    expect(current[0].reason).toMatch(/Waiting on the client since 18 Nov/);
    expect(current[1].reason).toMatch(/Late: was due 10 Nov/);
    const closed = slippedItems({ month: "2026-11" }, items, "2026-12-02");
    expect(closed.map((entry) => entry.deliverable.id)).toEqual([
      "wait",
      "block",
      "todo",
    ]);
    expect(closed[1].reason).toMatch(
      /Blocked, waiting on someone else: API access/,
    );
  });
});

describe("what needs me", () => {
  it("counts my late and due work, my reviews and blocks on my engagements", () => {
    const counts = needsMe(
      "priya@studio1hq.com",
      [
        item({ id: "a", due_on: "2026-11-05" }),
        item({ id: "b", due_on: "2026-11-14" }),
        item({
          id: "c",
          owner: "sam@studio1hq.com",
          reviewer: "priya@studio1hq.com",
          status: "internal_review",
        }),
        item({
          id: "d",
          owner: "sam@studio1hq.com",
          reviewer: null,
          engagement_id: "mine",
          blocked: true,
        }),
        item({ id: "e", due_on: "2026-11-01", status: "published" }),
      ],
      new Set(["mine"]),
      "2026-11-10",
    );
    expect(counts).toEqual({ late: 1, due: 1, toReview: 1, blocked: 1 });
  });
});

describe("where a member may start new work", () => {
  it("allows the early stages for any kind", () => {
    for (const status of ["planned", "in_progress", "internal_review"] as const)
      expect(memberMayStartAt(status, "blog")).toBe(true);
  });

  it("refuses work that's already with the client, approved or live", () => {
    for (const status of [
      "client_review",
      "changes_requested",
      "approved",
      "published",
    ] as const)
      expect(memberMayStartAt(status, "blog")).toBe(false);
  });

  it("lets a post be logged as already live, and nothing further", () => {
    expect(memberMayStartAt("published", "social_post")).toBe(true);
    expect(memberMayStartAt("published", "reddit_post")).toBe(true);
    expect(memberMayStartAt("approved", "social_post")).toBe(false);
  });
});

describe("two people editing one deliverable", () => {
  const saved: Partial<Deliverable> = {
    title: "Launch post",
    owner: "priya@studio1hq.com",
    due_on: "2026-11-20",
    notes: "",
    views: 1200,
    extra_urls: ["https://x.com/a", "https://x.com/b"],
    reviewer: null,
  };

  it("reads a saved field the way the dialog shows it", () => {
    expect(formValueOf(saved, "views")).toBe("1200");
    expect(formValueOf(saved, "extra_urls")).toBe("https://x.com/a\nhttps://x.com/b");
    expect(formValueOf(saved, "reviewer")).toBe("");
    expect(formValueOf({}, "content_type")).toBe("");
  });

  it("lets a save through when nobody else touched its fields", () => {
    expect(editClashes(saved, { due_on: "2026-11-20" }, { due_on: "2026-11-22" })).toEqual([]);
    // Someone else changed the title; this save only sends the due date.
    expect(editClashes({ ...saved, title: "Renamed" }, { due_on: "2026-11-20" }, { due_on: "2026-11-22" })).toEqual([]);
  });

  it("stops a save that would undo someone else's change to the same field", () => {
    const now = { ...saved, due_on: "2026-11-25", owner: "dev@studio1hq.com" };
    expect(
      editClashes(
        now,
        { due_on: "2026-11-20", owner: "priya@studio1hq.com", notes: "" },
        { due_on: "2026-11-22", owner: "asha@studio1hq.com", notes: "Draft in review" },
      ),
    ).toEqual(["owner", "due_on"]);
    expect(clashText(["owner", "due_on"])).toBe("the owner and the due date");
  });

  it("doesn't call it a clash when both set the same value, or nothing was seen", () => {
    const now = { ...saved, due_on: "2026-11-22" };
    expect(editClashes(now, { due_on: "2026-11-20" }, { due_on: "2026-11-22" })).toEqual([]);
    expect(editClashes(now, {}, { due_on: "2026-11-24" })).toEqual([]);
  });
});
