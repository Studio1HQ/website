import { describe, expect, it } from "vitest";
import { badgeText, noticeCutoffs, noticeHref, noticeRecipients, noticeRows } from "@/lib/internal/notifications/shared";

describe("noticeRecipients", () => {
  it("leaves out the person who acted, blanks, names and repeats", () => {
    expect(
      noticeRecipients(["Priya@studio1hq.com", "me@studio1hq.com", null, "", "priya@studio1hq.com", "a volunteer"], "ME@studio1hq.com"),
    ).toEqual(["priya@studio1hq.com"]);
  });
});

describe("noticeRows", () => {
  const notice = { kind: "task" as const, title: "  Asha gave you\n a task ", body: "Write the launch post", href: "/tasks" };

  it("makes one tidy row per person, saving the link as its app/internal path (the table's check)", () => {
    expect(noticeRows(["priya@studio1hq.com", "dev@studio1hq.com"], "asha@studio1hq.com", notice)).toEqual([
      { email: "priya@studio1hq.com", actor: "asha@studio1hq.com", kind: "task", title: "Asha gave you a task", body: "Write the launch post", href: "/internal/tasks" },
      { email: "dev@studio1hq.com", actor: "asha@studio1hq.com", kind: "task", title: "Asha gave you a task", body: "Write the launch post", href: "/internal/tasks" },
    ]);
    const [overview] = noticeRows(["priya@studio1hq.com"], "asha@studio1hq.com", { ...notice, href: "/" });
    expect(overview.href).toBe("/internal");
  });

  it("saves nothing for yourself, an empty title or a link out of the dashboard", () => {
    expect(noticeRows(["asha@studio1hq.com"], "asha@studio1hq.com", notice)).toEqual([]);
    expect(noticeRows(["priya@studio1hq.com"], "asha@studio1hq.com", { ...notice, title: " " })).toEqual([]);
    expect(noticeRows(["priya@studio1hq.com"], "asha@studio1hq.com", { ...notice, href: "https://evil.example" })).toEqual([]);
    expect(noticeRows(["priya@studio1hq.com"], "asha@studio1hq.com", { ...notice, href: "//evil.example" })).toEqual([]);
  });

  it("cuts long text to what the table holds", () => {
    const [row] = noticeRows(["priya@studio1hq.com"], "a@studio1hq.com", { ...notice, title: "x".repeat(500), body: "y".repeat(500) });
    expect(row.title).toHaveLength(200);
    expect(row.body).toHaveLength(300);
  });
});

describe("noticeHref", () => {
  it("opens saved links at their dashboard address", () => {
    expect(noticeHref("/internal/tasks")).toBe("/tasks");
    expect(noticeHref("/internal")).toBe("/");
    expect(noticeHref("/internal/clients/acme?week=2026-11-16")).toBe("/clients/acme?week=2026-11-16");
  });

  it("falls back to the Overview for anything else", () => {
    expect(noticeHref("https://evil.example")).toBe("/");
    expect(noticeHref("//evil.example")).toBe("/");
  });
});

describe("badgeText", () => {
  it("caps at 9+", () => {
    expect(badgeText(3)).toBe("3");
    expect(badgeText(12)).toBe("9+");
  });
});

describe("noticeCutoffs", () => {
  it("keeps read notifications 30 days and any notification 90", () => {
    expect(noticeCutoffs(new Date("2026-11-18T10:00:00Z"))).toEqual({
      read: "2026-10-19T10:00:00.000Z",
      any: "2026-08-20T10:00:00.000Z",
    });
  });
});
