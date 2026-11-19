import { describe, expect, it } from "vitest";
import {
  EMPTY_APPLICATION,
  checkPay,
  describePay,
  payLabel,
  readRupees,
  validateApplication,
} from "@/lib/job-application";

const APPLICATION = {
  ...EMPTY_APPLICATION,
  name: "Asha Rao",
  email: "asha@example.com",
  location: "Pune, India",
  workLinks: "github.com/asha/agent",
  planLink: "docs.google.com/plan",
  why: "I have built agents for two years and want to write about them with a team that ships every day.",
  start: "Within 2 weeks",
  contactConsent: true,
  emailUpdates: true,
};

describe("readRupees", () => {
  it.each([
    ["60000", 60_000],
    ["60,000", 60_000],
    ["₹ 60,000", 60_000],
    ["Rs. 45,000 per month", 45_000],
    ["INR 50000", 50_000],
    ["50000 rupees/month", 50_000],
    ["60k", 60_000],
    ["60K pm", 60_000],
    ["1.2L", 1_20_000],
    ["1.5 lakh", 1_50_000],
    ["2 lakhs", 2_00_000],
    ["1,20,000/month", 1_20_000],
    ["35000 monthly", 35_000],
  ])("reads %s", (typed, amount) => {
    expect(readRupees(typed)).toEqual({ ok: true, amount });
  });

  it("spots yearly figures and works out the month", () => {
    expect(readRupees("12 LPA")).toEqual({
      ok: false,
      reason: "yearly",
      amount: 1_00_000,
    });
    expect(readRupees("12 lakhs per annum")).toEqual({
      ok: false,
      reason: "yearly",
      amount: 1_00_000,
    });
    expect(readRupees("1200000 per year")).toEqual({
      ok: false,
      reason: "yearly",
      amount: 1_00_000,
    });
    expect(readRupees("as per CTC")).toMatchObject({ reason: "yearly" });
  });

  it("refuses ranges, blanks and words", () => {
    expect(readRupees("50k-60k")).toEqual({ ok: false, reason: "range" });
    expect(readRupees("50000 to 60000")).toEqual({
      ok: false,
      reason: "range",
    });
    expect(readRupees("  ")).toEqual({ ok: false, reason: "empty" });
    expect(readRupees("negotiable")).toEqual({
      ok: false,
      reason: "unreadable",
    });
    expect(readRupees("0")).toEqual({ ok: false, reason: "unreadable" });
  });
});

describe("checkPay", () => {
  it("keeps amounts in range for the basis", () => {
    expect(checkPay("60k", "month")).toEqual({ ok: true, amount: 60_000 });
    expect(checkPay("8000", "article")).toEqual({ ok: true, amount: 8_000 });
  });

  it("explains what's wrong in words", () => {
    expect(checkPay("", "month")).toEqual({
      ok: false,
      error: "Add the pay you expect.",
    });
    expect(checkPay("12 LPA", "month")).toEqual({
      ok: false,
      error: "Give a monthly amount: that's about ₹1,00,000 a month.",
    });
    expect(checkPay("60", "month")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/under ₹1,000 a month/),
    });
    expect(checkPay("1cr", "month")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/too high/),
    });
    expect(checkPay("12 LPA", "article")).toEqual({
      ok: false,
      error: "Give the amount per article.",
    });
  });
});

describe("pay wording", () => {
  it("names salary, stipend or pay by the kind of role", () => {
    expect(payLabel("Full-time", "month")).toBe(
      "Expected monthly salary (INR)",
    );
    expect(payLabel("Internship", "month")).toBe(
      "Expected monthly stipend (INR)",
    );
    expect(payLabel("Internship / Contract", "month")).toBe(
      "Expected monthly pay (INR)",
    );
    expect(payLabel("Contract", "article")).toBe(
      "Expected pay per article (INR)",
    );
  });

  it("formats rupees the Indian way", () => {
    expect(describePay(1_20_000, "month")).toBe("₹1,20,000 a month");
    expect(describePay(8_000, "article")).toBe("₹8,000 per article");
  });
});

describe("validateApplication", () => {
  it("returns the expected pay in rupees", () => {
    const result = validateApplication({ ...APPLICATION, expectedPay: "1.2L" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pay).toBe(1_20_000);
  });

  it("asks for pay, by the role's basis", () => {
    const missing = validateApplication(APPLICATION);
    expect(missing.ok).toBe(false);
    if (!missing.ok)
      expect(missing.errors.expectedPay).toBe("Add the pay you expect.");

    const perArticle = validateApplication(
      { ...APPLICATION, expectedPay: "50" },
      [],
      "article",
    );
    expect(perArticle.ok).toBe(false);
    if (!perArticle.ok)
      expect(perArticle.errors.expectedPay).toMatch(/under ₹100 per article/);
  });
});
