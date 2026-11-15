import { describe, expect, it } from "vitest";
import {
  REPORT_CSV_COLUMNS,
  buildClientReport,
  reportCsvRows,
  reportText,
  slipGroups,
} from "@/lib/internal/clients/report-text";
import type { Deliverable, ScopeLine } from "@/lib/internal/clients/schema";
import { toCsv } from "@/lib/internal/csv";

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
    owner: "priya.k@studio1hq.com",
    reviewer: "arindam@studio1hq.com",
    status: "in_progress",
    status_changed_at: "2026-11-02T04:00:00Z",
    published_at: null,
    blocked: false,
    block_reason: "",
    waits_on: null,
    blocked_at: null,
    week: "2026-11-09",
    due_on: "2026-11-20",
    client_due_on: null,
    size: "M",
    draft_url: "https://docs.google.com/document/d/draft",
    review_url: "https://docs.google.com/document/d/review",
    pr_url: "https://github.com/acme/repo/pull/1",
    published_url: null,
    notes: "Internal: the writer is on leave next week",
    ...over,
  };
}

function scope(over: Partial<ScopeLine> = {}): ScopeLine {
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

const deliverables = [
  item({
    id: "live",
    title: "Launch post",
    status: "published",
    published_at: "2026-11-12T06:00:00Z",
    published_url: "https://acme.dev/blog/launch",
  }),
  item({ id: "approved", title: "Approved post", status: "approved" }),
  item({
    id: "client",
    title: "Waiting post",
    status: "client_review",
    client_due_on: "2026-11-10",
  }),
  item({ id: "late", title: "Late post", due_on: "2026-11-05" }),
  item({
    id: "vendor",
    title: "Video",
    kind: "video",
    scope_line_id: "l2",
    blocked: true,
    waits_on: "third_party",
    block_reason: "Editor is rendering",
    blocked_at: "2026-11-08T04:00:00Z",
    due_on: "2026-11-11",
  }),
];

const report = buildClientReport({
  client: { name: "Acme" },
  engagement: { name: "Token Factory content", owner: "priya.k@studio1hq.com" },
  cycle: { month: "2026-11", scope_note: "4 blogs, 1 video", retro_note: "" },
  lines: [
    scope(),
    scope({ id: "l2", kind: "video", label: "Videos", planned: 1 }),
  ],
  deliverables,
  names: { "priya.k@studio1hq.com": "Priya" },
  today: "2026-11-15",
});

describe("buildClientReport", () => {
  it("adds up planned against delivered by kind", () => {
    expect(report.planned).toEqual([
      { kind: "Blog", label: "Blogs", planned: 4, done: 1, approved: 1 },
      { kind: "Video", label: "Videos", planned: 1, done: 0, approved: 0 },
    ]);
    expect(report.totals).toEqual({ planned: 5, done: 1, approved: 1 });
  });

  it("lists live work with its link and keeps the rest apart", () => {
    expect(report.published.map((row) => [row.title, row.url])).toEqual([
      ["Launch post", "https://acme.dev/blog/launch"],
    ]);
    expect(report.open.map((row) => row.id)).not.toContain("live");
    expect(report.open[0].id).toBe("approved");
  });

  it("names the account owner from the capacity list", () => {
    expect(report.owner).toBe("Priya");
    expect(report.monthName).toBe("November 2026");
  });

  it("splits slipped work by who it waits on", () => {
    const groups = slipGroups(report);
    expect(
      groups.map((group) => [group.side, group.items.map((entry) => entry.id)]),
    ).toEqual([
      ["client", ["client"]],
      ["studio1", ["late"]],
      ["third_party", ["vendor"]],
    ]);
  });

  it("counts everything not live as slipped once the month is over", () => {
    const later = buildClientReport({
      client: { name: "Acme" },
      engagement: { name: "Content", owner: null },
      cycle: { month: "2026-11", scope_note: "", retro_note: "" },
      lines: [scope()],
      deliverables,
      today: "2026-12-02",
    });
    expect(later.slipped.map((entry) => entry.id).sort()).toEqual(
      ["approved", "client", "late", "vendor"].sort(),
    );
    expect(later.owner).toBe("");
  });
});

describe("reportText", () => {
  const text = reportText(report);

  it("has the header, the sections and the live link", () => {
    expect(
      text.startsWith(
        "Acme · Token Factory content\nMonthly report for November 2026, as of 15 Nov 2026\n",
      ),
    ).toBe(true);
    expect(text).toContain("Account owner: Priya");
    expect(text).toContain(
      "• Blogs: 1 of 4 delivered (+1 approved, not live yet)",
    );
    expect(text).toContain("Total: 1 of 5 delivered");
    expect(text).toContain(
      "• Launch post (Blog, live 12 Nov): https://acme.dev/blog/launch",
    );
    expect(text).toContain(
      "Waiting on Acme:\n• Waiting post: Waiting on the client since 10 Nov",
    );
    expect(text).toContain(
      "Delayed on our side:\n• Late post: Late: was due 5 Nov",
    );
    expect(text).toContain("Agreed scope\n4 blogs, 1 video");
    expect(text).not.toContain("Looking back");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("never carries draft, review or PR links, sizes or internal notes", () => {
    expect(text).not.toContain("docs.google.com");
    expect(text).not.toContain("github.com");
    expect(text).not.toContain("on leave");
    expect(text).not.toMatch(/invoice|points|\bsize\b/i);
  });

  it("says so when there's nothing to list", () => {
    const empty = reportText(
      buildClientReport({
        client: null,
        engagement: { name: "", owner: null },
        cycle: { month: "2026-11", scope_note: " ", retro_note: "Good month" },
        lines: [],
        deliverables: [],
        today: "2026-11-15",
      }),
    );
    expect(empty.split("\n")[0]).toBe("Monthly report");
    expect(empty).toContain("• Nothing was planned for this month.");
    expect(empty).toContain("• Nothing has gone live yet this month.");
    expect(empty).toContain("• Everything planned is live.");
    expect(empty).not.toContain("Slipped");
    expect(empty).not.toContain("Agreed scope");
    expect(empty).toContain("Looking back on the month\nGood month");
  });

  it("keeps each bullet on one line", () => {
    const messy = reportText(
      buildClientReport({
        client: { name: "Acme" },
        engagement: { name: "Content", owner: null },
        cycle: { month: "2026-11", scope_note: "", retro_note: "" },
        lines: [],
        deliverables: [item({ title: "Two\nlines", status: "planned" })],
        today: "2026-11-15",
      }),
    );
    expect(messy).toContain(
      "• Two lines (Blog): Not started, owner Priya K, Due 20 Nov",
    );
  });
});

describe("reportCsvRows", () => {
  it("has one row per deliverable in the CSV's columns, no internal links", () => {
    const rows = reportCsvRows(report);
    expect(rows).toHaveLength(deliverables.length);
    for (const row of rows)
      expect(Object.keys(row)).toEqual(REPORT_CSV_COLUMNS);
    expect(rows[0]).toMatchObject({
      item: "Launch post",
      ready: "yes",
      live_link: "https://acme.dev/blog/launch",
    });
    const late = rows.find((row) => row.item === "Late post");
    expect(late).toMatchObject({
      slipped: "Late: was due 5 Nov",
      waiting_on: "Studio1",
      live_link: "",
    });
    expect(rows.find((row) => row.item === "Waiting post")?.waiting_on).toBe(
      "Acme",
    );
    expect(JSON.stringify(rows)).not.toMatch(
      /docs\.google|github\.com|on leave/,
    );
  });
});

/** A small RFC 4180 reader: quoted cells, "" for a quote, CRLF rows, BOM. */
function parseCsv(text: string): string[][] {
  const body = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted) {
      if (char === '"' && body[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" && body[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

describe("the CSV export, end to end", () => {
  const titles = [
    '=HYPERLINK("https://evil.example","Open")',
    "+SUM(1,2)",
    "-2+3",
    "@cmd",
    'Pricing, plans & "free" tier\nPart 2',
  ];
  const exported = buildClientReport({
    client: { name: "Acme" },
    engagement: { name: "Content", owner: null },
    cycle: { month: "2026-11", scope_note: "", retro_note: "" },
    lines: [scope()],
    deliverables: [
      ...titles.map((title, index) =>
        item({ id: `t${index}`, title, status: "planned", due_on: null }),
      ),
      item({
        id: "note",
        title: "Blocked post",
        blocked: true,
        waits_on: "studio1",
        block_reason: "=cmd|' /C calc'!A0",
        due_on: null,
      }),
    ],
    today: "2026-11-15",
  });
  const rows = parseCsv(toCsv(REPORT_CSV_COLUMNS, reportCsvRows(exported)));
  const header = rows[0];
  const cells = (column: string) =>
    rows.slice(1).map((row) => row[header.indexOf(column)]);

  it("reads back as the header and one row per deliverable", () => {
    expect(header).toEqual(REPORT_CSV_COLUMNS);
    expect(rows).toHaveLength(1 + titles.length + 1);
    for (const row of rows) expect(row).toHaveLength(REPORT_CSV_COLUMNS.length);
  });

  it("turns a title a spreadsheet would run into plain text", () => {
    const items = cells("item");
    for (const title of titles.slice(0, 4))
      expect(items).toContain(`'${title}`);
    for (const value of rows.slice(1).flat())
      expect(value).not.toMatch(/^[=+\-@\t\r]/);
    expect(cells("note")).toContain("'=cmd|' /C calc'!A0");
  });

  it("keeps commas, quotes and line breaks in a title", () => {
    expect(cells("item")).toContain('Pricing, plans & "free" tier\nPart 2');
  });
});

describe("reach and milestones", () => {
  const withReach = buildClientReport({
    client: { name: "Acme" },
    engagement: { name: "DevRel", owner: null },
    cycle: { month: "2026-11", scope_note: "", retro_note: "" },
    lines: [],
    deliverables: [
      item({
        id: "p1",
        kind: "social_post",
        status: "published",
        published_at: "2026-11-03T06:00:00Z",
        published_url: "https://x.com/a/status/1",
        views: 7000,
      }),
      item({ id: "p2", kind: "social_post", views: 500 }),
    ],
    milestones: [
      {
        id: "m1",
        happened_on: "2026-11-09",
        title: "1,000 GitHub stars",
        url: null,
      },
      { id: "m0", happened_on: "2026-10-30", title: "Last month", url: null },
    ],
    today: "2026-11-15",
  });

  it("counts views only on what went live, and only this month's milestones", () => {
    expect(withReach.reach).toBe(7000);
    expect(withReach.milestones.map((row) => row.id)).toEqual(["m1"]);
  });

  it("writes both into the client text", () => {
    const text = reportText(withReach);
    expect(text).toContain("Reach\n• 7,000 views on what went live this month");
    expect(text).toContain("Milestones\n• 9 Nov: 1,000 GitHub stars");
    expect(text).not.toContain("Last month");
  });

  it("leaves both out when there's nothing", () => {
    const text = reportText(report);
    expect(text).not.toContain("Reach");
    expect(text).not.toContain("Milestones");
  });
});
