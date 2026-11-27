import { describe, expect, it } from "vitest";
import {
  canRetry,
  groupFiles,
  inFlight,
  isLongReport,
  latestDone,
} from "@/lib/internal/inbound/lead-page";
import type { AgentEvent, AgentFile } from "@/lib/internal/inbound/schema";

const event = (over: Partial<AgentEvent>): AgentEvent => ({
  id: "e",
  created_at: "2026-11-27T10:00:00Z",
  created_by: null,
  org_id: "o",
  kind: "lead_created",
  payload: {},
  status: "done",
  attempts: 1,
  claimed_at: null,
  finished_at: "2026-11-27T10:05:00Z",
  error: "",
  report: "",
  done_items: [],
  waiting_items: [],
  next_items: [],
  ...over,
});

const file = (over: Partial<AgentFile>): AgentFile => ({
  id: "f",
  created_at: "2026-11-27T10:00:00Z",
  org_id: "o",
  event_id: null,
  name: "deck.pdf",
  storage_path: "p",
  content_type: "application/pdf",
  bytes: 1,
  kind: "deck_pdf",
  approved_to_send: false,
  approved_by: null,
  approved_at: null,
  ...over,
});

describe("lead page helpers", () => {
  it("picks the newest finished event, not a failed or queued one", () => {
    const events = [
      event({ id: "q", status: "queued", finished_at: null }),
      event({ id: "x", status: "failed" }),
      event({ id: "b", finished_at: "2026-11-27T12:00:00Z" }),
      event({ id: "a", finished_at: "2026-11-27T09:00:00Z" }),
    ];
    expect(latestDone(events)?.id).toBe("b");
    expect(latestDone([events[0]])).toBeNull();
    expect(inFlight(events)?.id).toBe("q");
  });

  it("offers Try again only for failed, askable, allowed events", () => {
    expect(
      canRetry({ status: "failed", kind: "lead_created" }, "lead", false),
    ).toBe(true);
    expect(
      canRetry({ status: "done", kind: "lead_created" }, "lead", false),
    ).toBe(false);
    expect(
      canRetry({ status: "failed", kind: "reply_received" }, "lead", true),
    ).toBe(false);
    expect(
      canRetry(
        { status: "failed", kind: "founder_answers" },
        "proposal",
        false,
      ),
    ).toBe(false);
    expect(
      canRetry({ status: "failed", kind: "founder_answers" }, "proposal", true),
    ).toBe(true);
    expect(
      canRetry({ status: "failed", kind: "lead_created" }, "won", true),
    ).toBe(false);
  });

  it("collapses long reports", () => {
    expect(isLongReport("short")).toBe(false);
    expect(isLongReport("x".repeat(300))).toBe(true);
    expect(isLongReport("a\nb\nc\nd\ne\nf")).toBe(true);
  });

  it("groups versions of one file name, newest first", () => {
    const groups = groupFiles([
      file({ id: "1", created_at: "2026-11-26T10:00:00Z" }),
      file({ id: "2", name: "brief.md", created_at: "2026-11-27T11:00:00Z" }),
      file({ id: "3", created_at: "2026-11-27T10:00:00Z" }),
    ]);
    expect(groups.map((g) => g.name)).toEqual(["brief.md", "deck.pdf"]);
    expect(groups[1].versions.map((v) => v.id)).toEqual(["3", "1"]);
  });
});
