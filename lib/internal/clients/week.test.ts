import { describe, expect, it } from "vitest";
import {
  engagementsForWeek,
  groupWeek,
  istDay,
  recentDone,
  weekCounts,
  weekLines,
  weeklyUpdateText,
  type WeekDeliverable,
  type WeekEvent,
  type WeekTask,
} from "@/lib/internal/clients/week";

// Wednesday of the week of Monday 16 Nov 2026.
const TODAY = "2026-11-18";
const WEEK = "2026-11-16";
const LAST_WEEK = "2026-11-09";
const NEXT_WEEK = "2026-11-23";

function task(over: Partial<WeekTask> = {}): WeekTask {
  return {
    id: "t1",
    email: "priya@studio1hq.com",
    title: "Article plan",
    status: "todo",
    engagement_id: "e1",
    deliverable_id: null,
    due_on: null,
    done_on: null,
    blocked: false,
    block_reason: "",
    ...over,
  };
}

function deliverable(over: Partial<WeekDeliverable> = {}): WeekDeliverable {
  return {
    id: "d1",
    engagement_id: "e1",
    title: "Scraping guide",
    owner: "rahul@studio1hq.com",
    status: "in_progress",
    status_changed_at: "2026-11-02T04:00:00Z",
    published_at: null,
    published_url: null,
    blocked: false,
    block_reason: "",
    waits_on: null,
    week: null,
    due_on: null,
    client_due_on: null,
    ...over,
  };
}

const lines = (
  input: {
    tasks?: WeekTask[];
    deliverables?: WeekDeliverable[];
    events?: WeekEvent[];
    titles?: Map<string, string>;
  },
  week = WEEK,
) =>
  weekLines({
    week,
    today: TODAY,
    tasks: input.tasks ?? [],
    deliverables: input.deliverables ?? [],
    events: input.events,
    titles: input.titles,
  });

describe("istDay", () => {
  it("reads a timestamp as an IST day", () => {
    expect(istDay("2026-11-15T20:00:00Z")).toBe("2026-11-16");
    expect(istDay(null)).toBeNull();
    expect(istDay("nope")).toBeNull();
  });
});

describe("weekLines: tasks", () => {
  it("puts tasks done in the week under Done, and leaves out ones done another week", () => {
    const result = lines({
      tasks: [
        task({ id: "a", status: "done", done_on: "2026-11-17" }),
        task({ id: "b", status: "done", done_on: "2026-11-13" }),
      ],
    });
    expect(result.map((line) => [line.id, line.group, line.dayKind])).toEqual([
      ["a", "done", "done"],
    ]);
  });

  it("groups open tasks: doing and review in progress, to do up next, blocked apart", () => {
    const groups = groupWeek(
      lines({
        tasks: [
          task({ id: "doing", status: "doing" }),
          task({ id: "review", status: "review" }),
          task({ id: "todo", status: "todo", due_on: "2026-11-20" }),
          task({ id: "stuck", status: "doing", blocked: true, block_reason: "No access" }),
        ],
      }),
    );
    expect(groups.doing.map((line) => line.id).sort()).toEqual(["doing", "review"]);
    expect(groups.next.map((line) => line.id)).toEqual(["todo"]);
    expect(groups.blocked.map((line) => line.id)).toEqual(["stuck"]);
    expect(groups.blocked[0].reason).toBe("No access");
  });

  it("this week: keeps undated and overdue to-dos, leaves out ones due after the week", () => {
    const result = lines({
      tasks: [
        task({ id: "undated" }),
        task({ id: "overdue", due_on: "2026-11-10" }),
        task({ id: "later", due_on: "2026-11-25" }),
      ],
    });
    expect(result.map((line) => line.id).sort()).toEqual(["overdue", "undated"]);
    expect(result.find((line) => line.id === "overdue")?.late).toBe(true);
  });

  it("a past week shows open tasks only when they were due in it", () => {
    const result = lines(
      {
        tasks: [
          task({ id: "slipped", status: "doing", due_on: "2026-11-11" }),
          task({ id: "other", status: "doing", due_on: "2026-11-18" }),
          task({ id: "undated", status: "doing" }),
          task({ id: "done", status: "done", done_on: "2026-11-12" }),
        ],
      },
      LAST_WEEK,
    );
    expect(result.map((line) => line.id).sort()).toEqual(["done", "slipped"]);
  });

  it("next week shows what's due then plus what's still open", () => {
    const result = lines(
      {
        tasks: [
          task({ id: "due", due_on: "2026-11-26" }),
          task({ id: "far", due_on: "2026-12-10" }),
          task({ id: "doing", status: "doing" }),
        ],
      },
      NEXT_WEEK,
    );
    expect(result.map((line) => line.id).sort()).toEqual(["doing", "due"]);
  });

  it("names the deliverable a task is part of", () => {
    const result = lines({
      tasks: [task({ id: "a", status: "doing", deliverable_id: "d9" })],
      titles: new Map([["d9", "Proxy guide"]]),
    });
    expect(result[0].deliverableTitle).toBe("Proxy guide");
  });
});

describe("weekLines: deliverables", () => {
  it("counts a deliverable published in the week as done, with its live link", () => {
    const result = lines({
      deliverables: [
        deliverable({
          status: "published",
          published_at: "2026-11-17T06:00:00Z",
          published_url: "https://brightdata.com/blog/guide",
        }),
        deliverable({
          id: "old",
          status: "published",
          published_at: "2026-11-05T06:00:00Z",
        }),
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      group: "done",
      day: "2026-11-17",
      url: "https://brightdata.com/blog/guide",
    });
  });

  it("goes by the day it went live, even when it was logged later", () => {
    // Logged this week, but it went live in October: not this week's work.
    const result = lines({
      deliverables: [
        deliverable({ status: "published", published_at: "2026-10-27T06:30:00Z" }),
      ],
      events: [
        { deliverable_id: "d1", at: "2026-11-19T05:00:00Z", kind: "created", to_status: "published" },
      ],
    });
    expect(result).toEqual([]);
  });

  it("uses a status event to Published when there's no live day", () => {
    const result = lines({
      deliverables: [
        deliverable({ status: "published", published_at: null, status_changed_at: "2026-11-02T06:00:00Z" }),
      ],
      events: [
        { deliverable_id: "d1", at: "2026-11-19T05:00:00Z", kind: "status", to_status: "published" },
      ],
    });
    expect(result[0]).toMatchObject({ group: "done", day: "2026-11-19" });
  });

  it("puts waiting-on-client and blocked items together, flags the client ones", () => {
    const groups = groupWeek(
      lines({
        deliverables: [
          deliverable({ id: "review", status: "client_review", client_due_on: "2026-11-16" }),
          deliverable({ id: "blocked", blocked: true, waits_on: "studio1", block_reason: "Writer out" }),
          deliverable({ id: "on-client", blocked: true, waits_on: "client", block_reason: "API key" }),
        ],
      }),
    );
    expect(groups.blocked.map((line) => [line.id, line.waitingOnClient]).sort()).toEqual([
      ["blocked", false],
      ["on-client", true],
      ["review", true],
    ]);
  });

  it("this week: planned items show when due by the week's end, not later", () => {
    const groups = groupWeek(
      lines({
        deliverables: [
          deliverable({ id: "due", status: "planned", due_on: "2026-11-19" }),
          deliverable({ id: "planned-week", status: "planned", week: WEEK }),
          deliverable({ id: "later", status: "planned", due_on: "2026-11-30" }),
          deliverable({ id: "undated", status: "planned" }),
        ],
      }),
    );
    expect(groups.next.map((line) => line.id)).toEqual(["due", "planned-week"]);
  });

  it("this week: anything past Planned is in progress, wherever it's due", () => {
    const result = lines({
      deliverables: [deliverable({ status: "internal_review", due_on: "2026-12-04" })],
    });
    expect(result[0].group).toBe("doing");
  });

  it("a past week shows open deliverables that were due or moved in it", () => {
    const result = lines(
      {
        deliverables: [
          deliverable({ id: "due", due_on: "2026-11-12" }),
          deliverable({ id: "moved" }),
          deliverable({ id: "quiet" }),
        ],
        events: [
          { deliverable_id: "moved", at: "2026-11-10T05:00:00Z", kind: "status", to_status: "in_progress" },
          { deliverable_id: "quiet", at: "2026-11-17T05:00:00Z", kind: "status", to_status: "in_progress" },
        ],
      },
      LAST_WEEK,
    );
    expect(result.map((line) => line.id).sort()).toEqual(["due", "moved"]);
  });
});

describe("groups and counts", () => {
  const all = lines({
    tasks: [
      task({ id: "a", status: "done", done_on: "2026-11-16", title: "Idea list" }),
      task({ id: "b", status: "done", done_on: "2026-11-18", title: "Community event" }),
      task({ id: "c", status: "doing" }),
    ],
    deliverables: [deliverable({ id: "p", status: "planned", due_on: "2026-11-20" })],
  });

  it("counts each group", () => {
    expect(weekCounts(all)).toEqual({ done: 2, doing: 1, next: 1, blocked: 0 });
  });

  it("lists the most recent done first", () => {
    expect(recentDone(all, 1).map((line) => line.title)).toEqual(["Community event"]);
  });
});

describe("weeklyUpdateText", () => {
  const sample = lines({
    tasks: [
      task({ id: "a", status: "done", done_on: "2026-11-17", title: "Article plan for December" }),
      task({
        id: "b",
        status: "doing",
        title: "Outline",
        deliverable_id: "d2",
        due_on: "2026-11-20",
      }),
      task({ id: "c", status: "todo", title: "Community event invite", due_on: "2026-11-21" }),
      task({ id: "d", status: "doing", blocked: true, block_reason: "Arjun on leave", title: "Demo app" }),
    ],
    deliverables: [
      deliverable({
        id: "d1",
        status: "published",
        title: "Scraping guide",
        published_at: "2026-11-16T06:00:00Z",
        published_url: "https://brightdata.com/blog/scraping",
      }),
      deliverable({
        id: "d2",
        status: "client_review",
        title: "Proxy guide",
        client_due_on: "2026-11-17",
      }),
    ],
  });
  const text = weeklyUpdateText({
    client: "Bright Data",
    week: WEEK,
    today: TODAY,
    lines: sample,
  });

  it("reads as a weekly update with the four sections", () => {
    expect(text).toBe(
      [
        "Bright Data: weekly update",
        "Week of 16–22 Nov",
        "",
        "Done",
        "- Article plan for December",
        "- Scraping guide: https://brightdata.com/blog/scraping",
        "",
        "In progress",
        "- Outline (Proxy guide) (due Fri 20 Nov)",
        "- Demo app",
        "",
        "Up next",
        "- Community event invite (due Sat 21 Nov)",
        "",
        "Waiting on you",
        "- Proxy guide",
      ].join("\n"),
    );
  });

  it("leaves out names, reasons and statuses", () => {
    expect(text).not.toContain("priya");
    expect(text).not.toContain("Arjun on leave");
    expect(text).not.toContain("Client review");
    expect(text).not.toContain("Doing");
  });

  it("labels lines with the engagement when there are several", () => {
    const multi = weeklyUpdateText({
      client: "Bright Data",
      week: WEEK,
      today: TODAY,
      lines: sample.filter((line) => line.id === "a"),
      engagements: { e1: "Blog" },
    });
    expect(multi).toContain("- Blog: Article plan for December");
  });

  it("says so when there's nothing", () => {
    expect(
      weeklyUpdateText({ client: "Acme", week: WEEK, today: TODAY, lines: [] }),
    ).toContain("Nothing to report for this week yet.");
  });
});

describe("weeklyUpdateText: what the client may see", () => {
  const mixed = lines({
    tasks: [
      task({
        id: "a",
        status: "done",
        done_on: "2026-11-17",
        title: "Topic\nresearch\t for  Q1",
      }),
      task({
        id: "b",
        status: "doing",
        email: "arjun.k@studio1hq.com",
        blocked: true,
        block_reason: "Arjun on sick leave, 6 hours lost",
        title: "Demo app",
      }),
    ],
    deliverables: [
      deliverable({
        id: "js",
        status: "published",
        title: "Script post",
        published_at: "2026-11-17T06:00:00Z",
        published_url: "javascript:alert(1)",
      }),
      deliverable({
        id: "ftp",
        status: "published",
        title: "Files post",
        published_at: "2026-11-17T06:00:00Z",
        published_url: "ftp://files.example.com/post",
      }),
      deliverable({
        id: "theirs",
        title: "Pricing page",
        blocked: true,
        waits_on: "client",
        block_reason: "Need Sam's staging login",
      }),
      deliverable({
        id: "ours",
        title: "Benchmarks",
        blocked: true,
        waits_on: "studio1",
        block_reason: "Writer out until Friday",
      }),
      deliverable({
        id: "vendor",
        title: "Launch video",
        blocked: true,
        waits_on: "third_party",
        block_reason: "Editor rendering",
      }),
    ],
  });
  const text = weeklyUpdateText({
    client: "Bright\nData",
    week: WEEK,
    today: TODAY,
    lines: mixed,
  });
  const section = (heading: string) => {
    const parts = text.split("\n\n");
    const found = parts.find((part) => part.startsWith(`${heading}\n`));
    return found ? found.split("\n").slice(1) : [];
  };

  it("has no emails, names, reasons or hours", () => {
    expect(text).not.toContain("@");
    for (const line of mixed)
      if (line.who) expect(text).not.toContain(line.who);
    expect(text).not.toMatch(/arjun|priya|rahul|sam's/i);
    expect(text).not.toMatch(/sick leave|staging login|Writer out|rendering/);
    expect(text).not.toMatch(/\bhours?\b/i);
  });

  it("puts every title and the client's name on one line", () => {
    expect(text.split("\n")[0]).toBe("Bright Data: weekly update");
    expect(section("Done")).toContain("- Topic research for Q1");
  });

  it("prints no link that isn't http(s)", () => {
    expect(section("Done")).toEqual(
      expect.arrayContaining(["- Files post", "- Script post"]),
    );
    expect(text).not.toMatch(/javascript:|ftp:/);
  });

  it("puts what's blocked on the client under Waiting on you, the rest in progress", () => {
    expect(section("Waiting on you")).toEqual(["- Pricing page"]);
    expect(section("In progress")).toEqual(
      expect.arrayContaining(["- Benchmarks", "- Launch video", "- Demo app"]),
    );
    expect(section("In progress")).not.toContain("- Pricing page");
  });

  it("shows 40 lines a section, then how many more", () => {
    const many = lines({
      tasks: Array.from({ length: 45 }, (_, index) =>
        task({
          id: `t${index}`,
          status: "done",
          done_on: "2026-11-17",
          title: `Item ${String(index).padStart(2, "0")}`,
        }),
      ),
    });
    const capped = weeklyUpdateText({
      client: "Acme",
      week: WEEK,
      today: TODAY,
      lines: many,
    });
    const done = capped.split("\n\n")[1].split("\n");
    expect(done[0]).toBe("Done");
    expect(done).toHaveLength(1 + 40 + 1);
    expect(done.at(-1)).toBe("- and 5 more");
    const exact = weeklyUpdateText({
      client: "Acme",
      week: WEEK,
      today: TODAY,
      lines: many.slice(0, 40),
    });
    expect(exact).not.toContain("more");
  });
});

describe("engagementsForWeek", () => {
  const engagements = [
    { id: "a", status: "active" },
    { id: "b", status: "ended" },
  ];
  it("leaves ended engagements out of this week, keeps them for past weeks", () => {
    expect(engagementsForWeek(engagements, WEEK, TODAY).map((e) => e.id)).toEqual(["a"]);
    expect(engagementsForWeek(engagements, LAST_WEEK, TODAY).map((e) => e.id)).toEqual(["a", "b"]);
  });
});
