import { describe, expect, it } from "vitest";
import {
  findAmount,
  htmlToText,
  intakeSlackMessage,
  intakeWebhook,
  parseFrom,
  parseMonth,
  parseSubject,
} from "@/lib/internal/team/inbound";

// 13 Nov 2026, midday IST.
const NOW = new Date("2026-11-13T06:30:00Z");

describe("intake subjects", () => {
  it("reads the documented invoice format", () => {
    expect(parseSubject("Invoice | Priya Sharma | WR-07 | Nov 2026", NOW)).toMatchObject({
      kind: "invoice",
      name: "Priya Sharma",
      code: "WR-07",
      month: "2026-11",
      monthGuessed: false,
      extra: [],
    });
  });

  it("reads the documented reimbursement format", () => {
    expect(parseSubject("Reimbursement | Priya Sharma | S1-012 | Nov 2026", NOW)).toMatchObject({
      kind: "reimbursement",
      name: "Priya Sharma",
      code: "S1-012",
      month: "2026-11",
    });
  });

  it("takes the parts in any order, with dashes or slashes, after Re: and Fwd:", () => {
    expect(parseSubject("Fwd: RE: invoice - WR-07 - October 2026 - Priya", NOW)).toMatchObject({
      kind: "invoice",
      name: "Priya",
      code: "WR-07",
      month: "2026-10",
    });
    expect(parseSubject("Expense claim / 2026-10 / Rahul Das / S1/004", NOW)).toMatchObject({
      kind: "reimbursement",
      name: "Rahul Das",
      code: "S1/004",
      month: "2026-10",
    });
    expect(parseSubject("Bill: Acme Events, ACME-CO, 11/2026", NOW)).toMatchObject({
      kind: "invoice",
      name: "Acme Events",
      code: "ACME-CO",
      month: "2026-11",
    });
  });

  it("guesses this month when there's none, and says so", () => {
    expect(parseSubject("Invoice | Priya Sharma | WR-07", NOW)).toMatchObject({ month: "2026-11", monthGuessed: true });
  });

  it("keeps whatever else the subject says", () => {
    expect(parseSubject("Claim | Priya | S1-012 | Nov 2026 | Client lunch", NOW)?.extra).toEqual(["Client lunch"]);
  });

  it("ignores everything else", () => {
    expect(parseSubject("Quick question about the invoice", NOW)).toBeNull();
    expect(parseSubject("Invoices are attached? no", NOW)?.kind).toBe("invoice");
    expect(parseSubject("Invitation to speak", NOW)).toBeNull();
    expect(parseSubject("Billing question", NOW)).toBeNull();
    expect(parseSubject("", NOW)).toBeNull();
  });
});

describe("months", () => {
  it("reads the usual ways of writing one", () => {
    expect(parseMonth("Nov 2026", NOW)).toBe("2026-11");
    expect(parseMonth("November 2026", NOW)).toBe("2026-11");
    expect(parseMonth("Nov-26", NOW)).toBe("2026-11");
    expect(parseMonth("Nov'26", NOW)).toBe("2026-11");
    expect(parseMonth("Sept 2026", NOW)).toBe("2026-09");
    expect(parseMonth("11/2026", NOW)).toBe("2026-11");
    expect(parseMonth("2026-11", NOW)).toBe("2026-11");
  });

  it("puts a bare month in the latest year it fits", () => {
    expect(parseMonth("Oct", NOW)).toBe("2026-10");
    expect(parseMonth("Dec", NOW)).toBe("2026-12");
    expect(parseMonth("Jan", new Date("2027-01-05T06:30:00Z"))).toBe("2027-01");
    expect(parseMonth("Dec", new Date("2027-01-05T06:30:00Z"))).toBe("2026-12");
  });

  it("refuses words that only start like a month", () => {
    expect(parseMonth("Marketing", NOW)).toBeNull();
    expect(parseMonth("Mayo", NOW)).toBeNull();
    expect(parseMonth("13/2026", NOW)).toBeNull();
    expect(parseMonth("Priya Sharma", NOW)).toBeNull();
  });
});

describe("amounts in emails", () => {
  it("prefers the total line", () => {
    expect(findAmount("Invoice date: 01/11/2026\nArticles: 3\nAmount: ₹12,500\nTotal payable: ₹13,000")).toEqual({
      amount: 13000,
      currency: "INR",
    });
  });

  it("reads currency codes and signs", () => {
    expect(findAmount("Total: INR 12500")).toEqual({ amount: 12500, currency: "INR" });
    expect(findAmount("Amount: Rs. 1,25,000/-")).toEqual({ amount: 125000, currency: "INR" });
    expect(findAmount("Fee: $1,200.50")).toEqual({ amount: 1200.5, currency: "USD" });
    expect(findAmount("Total 950 EUR")).toEqual({ amount: 950, currency: "EUR" });
  });

  it("falls back to the first sum with a currency sign", () => {
    expect(findAmount("Hi team,\nPlease pay ₹8,000 for October.\nThanks")).toEqual({ amount: 8000, currency: "INR" });
  });

  it("doesn't mistake dates, years or phone numbers for the amount", () => {
    expect(findAmount("Due date: 30 Nov 2026\nCall me on 9876543210")).toBeNull();
    expect(findAmount("Invoice for 2026, see attached")).toBeNull();
    expect(findAmount("Total: 2026")).toBeNull();
  });
});

describe("senders and bodies", () => {
  it("parses the From header", () => {
    expect(parseFrom('"Priya Sharma" <Priya@Example.com>')).toEqual({ address: "priya@example.com", name: "Priya Sharma" });
    expect(parseFrom("priya@example.com")).toEqual({ address: "priya@example.com", name: null });
    expect(parseFrom("not an address")).toEqual({ address: null, name: null });
  });

  it("turns HTML into lines", () => {
    expect(htmlToText("<p>Amount:&nbsp;&#8377;12,500</p><p>Thanks</p>")).toContain("Amount: ₹12,500");
  });
});

describe("intake Slack posts", () => {
  it("escapes what senders typed and links to the dashboard", () => {
    const message = intakeSlackMessage(
      { title: "New invoice: <!channel> (WR-07)", points: ["₹12,500", "Nov 2026"], path: "/internal/money/payments" },
      "https://example.com",
    );
    expect(message.text).toBe("New invoice: &lt;!channel&gt; (WR-07) · ₹12,500 · Nov 2026");
    expect(JSON.stringify(message.blocks)).toContain("https://example.com/internal/money/payments");
  });

  it("only posts to Slack's webhook host", () => {
    expect(intakeWebhook({ SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/A" })).toBe("https://hooks.slack.com/services/A");
    expect(intakeWebhook({ SLACK_WEBHOOK_URL_PAYMENTS: "https://hooks.slack.com/services/P", SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/A" })).toBe(
      "https://hooks.slack.com/services/P",
    );
    expect(intakeWebhook({ SLACK_WEBHOOK_URL: "https://example.com/x" })).toBeNull();
  });
});
