import { describe, expect, it } from "vitest";
import { claimMonth, formatTotals, summarizeClaims } from "@/lib/internal/team/claims-summary";
import { cleanDecisionNote } from "@/lib/internal/team/reimbursements";
import { sniffType } from "@/lib/internal/team/files";
import type { Reimbursement } from "@/lib/internal/team/shared";

function claim(patch: Partial<Reimbursement>): Reimbursement {
  return {
    id: crypto.randomUUID(),
    created_at: "2026-11-10T06:00:00.000Z",
    email: "a@studio1hq.com",
    spent_on: "2026-11-09",
    description: "Cab",
    amount: 100,
    currency: "INR",
    receipt_path: null,
    receipt_name: null,
    source: "dashboard",
    status: "submitted",
    month: null,
    decided_by: null,
    decided_at: null,
    note: "",
    ...patch,
  };
}

describe("claims summary", () => {
  const claims = [
    claim({ amount: 200, status: "rejected" }),
    claim({ amount: 1000.5, status: "paid" }),
    claim({ amount: 40, currency: "USD", status: "approved" }),
    claim({ email: "b@studio1hq.com", amount: 5000 }),
    claim({ email: "b@studio1hq.com", amount: 300, spent_on: "2026-10-30", status: "paid" }),
    claim({ email: "c@studio1hq.com", amount: null, spent_on: null, created_at: "2026-10-31T19:00:00.000Z" }),
  ];

  it("totals what was claimed, by status and by currency", () => {
    const { total } = summarizeClaims(claims);
    expect(total.count).toBe(6);
    expect(total.claimed).toEqual({ INR: 6500.5, USD: 40 });
    expect(total.submitted).toEqual({ INR: 5000 });
    expect(total.approved).toEqual({ USD: 40 });
    expect(total.paid).toEqual({ INR: 1300.5 });
    expect(total.rejected).toEqual({ INR: 200 });
    expect(total.counts).toEqual({ submitted: 2, approved: 1, rejected: 1, paid: 2 });
  });

  it("splits by person, biggest claimer first", () => {
    const { people } = summarizeClaims(claims);
    expect(people.map((person) => person.email)).toEqual(["b@studio1hq.com", "a@studio1hq.com", "c@studio1hq.com"]);
    expect(people[1].totals.claimed).toEqual({ INR: 1200.5, USD: 40 });
    expect(people[1].claims).toHaveLength(3);
    expect(people[2].totals.count).toBe(1);
    expect(people[2].totals.claimed).toEqual({});
  });

  it("keeps one month, by the day spent or else the day it came in (IST)", () => {
    // 19:00 UTC on 31 Oct is already 1 Nov in India.
    expect(claimMonth(claims[5])).toBe("2026-11");
    const november = summarizeClaims(claims, "2026-11");
    expect(november.total.count).toBe(5);
    expect(november.total.paid).toEqual({ INR: 1000.5 });
    expect(summarizeClaims(claims, "2026-10").people.map((person) => person.email)).toEqual(["b@studio1hq.com"]);
    expect(summarizeClaims(claims, "2026-09").total.count).toBe(0);
  });

  it("writes totals with rupees first", () => {
    expect(formatTotals({ USD: 40, INR: 6500.5 })).toBe("₹6,500.50 + $40");
    expect(formatTotals({})).toBe("—");
    expect(formatTotals({ INR: 0 })).toBe("—");
  });
});

describe("decision notes", () => {
  it("keeps one tidy line", () => {
    expect(cleanDecisionNote("  No receipt,\n ask   again ")).toBe("No receipt, ask again");
    expect(cleanDecisionNote(undefined)).toBe("");
    expect(cleanDecisionNote("x".repeat(400))).toHaveLength(300);
  });
});

describe("receipt file types", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  it("knows a PDF, even with a byte-order mark or blank lines ahead of the header", () => {
    expect(sniffType(bytes("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffType(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes("%PDF-1.4\n")]))).toBe("application/pdf");
    expect(sniffType(bytes("\r\n\r\n%PDF-1.4\n"))).toBe("application/pdf");
  });

  it("refuses what isn't a PDF or an image", () => {
    expect(sniffType(bytes("<html>%PD</html>"))).toBeNull();
    expect(sniffType(bytes(`${"x".repeat(2000)}%PDF-1.4`))).toBeNull();
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffType(new Uint8Array(0))).toBeNull();
  });
});
