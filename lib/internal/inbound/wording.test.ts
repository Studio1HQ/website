import { describe, expect, it } from "vitest";
import {
  fileSize,
  fitOf,
  httpUrl,
  queuedBy,
  shortError,
  statusLine,
} from "@/lib/internal/inbound/wording";

const latest = (over: Partial<NonNullable<Parameters<typeof statusLine>[0]>>) => ({
  kind: "lead_created" as const,
  status: "done" as const,
  created_at: "2026-11-27T10:00:00Z",
  error: "",
  waiting: 0,
  ...over,
});

describe("the status line on a card", () => {
  it("says the agent is working or waiting", () => {
    expect(statusLine(latest({ status: "running" }), "lead")).toBe("Agent is working");
    expect(statusLine(latest({ status: "queued" }), "lead")).toBe("Waiting for the agent");
  });
  it("says brief ready, or waiting on you when the agent asked something", () => {
    expect(statusLine(latest({}), "lead")).toBe("Brief ready");
    expect(statusLine(latest({ waiting: 2 }), "lead")).toBe("Waiting on you");
  });
  it("shows a short error for a failed event", () => {
    expect(statusLine(latest({ status: "failed", error: "Timed out" }), "lead")).toBe("Failed: Timed out");
    expect(statusLine(latest({ status: "failed" }), "lead")).toBe("Failed");
    expect(shortError("x".repeat(200)).length).toBe(80);
  });
  it("has a line for a lead with no events", () => {
    expect(statusLine(null, "call_booked")).toBe("Call booked");
    expect(statusLine(null, "lead")).toBe("Not started");
  });
});

describe("small wording helpers", () => {
  it("names who queued an event", () => {
    expect(queuedBy("webhook:cal")).toBe("Cal.com booking");
    expect(queuedBy("sorter")).toBe("Mail sorter");
    expect(queuedBy("arindam@studio1hq.com")).toBe("Arindam");
  });
  it("formats sizes", () => {
    expect(fileSize(0)).toBe("0 KB");
    expect(fileSize(2048)).toBe("2 KB");
    expect(fileSize(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
  it("only links http and https", () => {
    expect(httpUrl("https://a.example/x")).toBe("https://a.example/x");
    expect(httpUrl("javascript:alert(1)")).toBeNull();
    expect(httpUrl("ftp://a.example")).toBeNull();
    expect(httpUrl(null)).toBeNull();
  });
});

describe("the fit label", () => {
  it("reads the level and the reasons from the first line", () => {
    expect(fitOf("Fit: Strong - builds dev tools\nMore text")).toEqual({
      level: "strong",
      reasons: "builds dev tools",
    });
    expect(fitOf("Fit: Weak")).toEqual({ level: "weak", reasons: "" });
    expect(fitOf("Fit: Good - a - b")).toEqual({ level: "good", reasons: "a - b" });
    expect(fitOf("Fit: Unclear\r\nrest")).toEqual({ level: "unclear", reasons: "" });
  });

  it("is null for anything else", () => {
    expect(fitOf("")).toBeNull();
    expect(fitOf("They build tools")).toBeNull();
    expect(fitOf("Fit: strong")).toBeNull();
    expect(fitOf("Fit: Great")).toBeNull();
    expect(fitOf("Fit: Strongish")).toBeNull();
    expect(fitOf("Intro line\nFit: Strong")).toBeNull();
  });
});
