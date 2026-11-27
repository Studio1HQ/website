import { describe, expect, it } from "vitest";
import {
  fileSize,
  fitOf,
  httpUrl,
  queuedBy,
  shortError,
  statusLine,
} from "@/lib/internal/inbound/wording";
import { slidesUrl, toAgentFile } from "@/lib/internal/inbound/schema";

const latest = (
  over: Partial<NonNullable<Parameters<typeof statusLine>[0]>>,
) => ({
  kind: "lead_created" as const,
  status: "done" as const,
  created_at: "2026-11-27T10:00:00Z",
  error: "",
  waiting: 0,
  ...over,
});

describe("the status line on a card", () => {
  it("says the agent is working or waiting", () => {
    expect(statusLine(latest({ status: "running" }), "lead")).toBe(
      "Agent is working",
    );
    expect(statusLine(latest({ status: "queued" }), "lead")).toBe(
      "Waiting for the agent",
    );
  });
  it("says brief ready, or waiting on you when the agent asked something", () => {
    expect(statusLine(latest({}), "lead")).toBe("Brief ready");
    expect(statusLine(latest({ waiting: 2 }), "lead")).toBe("Waiting on you");
  });
  it("shows a short error for a failed event", () => {
    expect(
      statusLine(latest({ status: "failed", error: "Timed out" }), "lead"),
    ).toBe("Failed: Timed out");
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
    expect(fitOf("Fit: Good - a - b")).toEqual({
      level: "good",
      reasons: "a - b",
    });
    expect(fitOf("Fit: Unclear\r\nrest")).toEqual({
      level: "unclear",
      reasons: "",
    });
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

describe("a file's link to its editable copy", () => {
  const link = "https://docs.google.com/presentation/d/1AbC_dEf-123456/edit";

  it("keeps a Google Slides deck link", () => {
    expect(slidesUrl(link)).toBe(link);
    expect(toAgentFile({ open_url: link }).open_url).toBe(link);
  });

  it("drops anything else, and a row without the column", () => {
    for (const value of [
      "https://docs.google.com/forms/d/e/1AbC_dEf-123456/viewform",
      "https://docs.google.com/document/d/1AbC_dEf-123456/edit",
      "https://docs.google.com/presentation/d/1AbC_dEf-123456/pub",
      "https://docs.google.com/presentation/d/1AbC_dEf-123456/edit?usp=sharing",
      "https://docs.google.com/presentation/d/1AbC_dEf-123456/edit#slide=id.p",
      "https://docs.google.com/presentation/d/../../forms/d/x/edit",
      "https://docs.google.com/url?q=https://evil.example",
      "http://docs.google.com/presentation/d/1AbC_dEf-123456/edit",
      "https://docs.google.com.evil.example/presentation/d/1AbC_dEf-123456/edit",
      "https://user:pass@docs.google.com/presentation/d/1AbC_dEf-123456/edit",
      "https://docs.google.com:8443/presentation/d/1AbC_dEf-123456/edit",
      `${link}\nhttps://evil.example`,
      "javascript:alert(1)",
      "",
      null,
      undefined,
      42,
    ])
      expect(slidesUrl(value)).toBeNull();
    expect(toAgentFile({}).open_url).toBeNull();
  });
});
