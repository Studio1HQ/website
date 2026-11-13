import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  amountInWords,
  draftFigures,
  joinedPartWay,
  lopAmount,
  lopLabel,
  numberInWords,
  paidDays,
  withLopLine,
} from "@/lib/internal/team/payroll-math";
import { payslipFileName, payslipPdf } from "@/lib/internal/team/payslip-pdf";
import { payslipNet } from "@/lib/internal/team/shared";

describe("amountInWords", () => {
  it("writes rupees in the Indian system", () => {
    expect(amountInWords(45000)).toBe("Rupees Forty-Five Thousand Only");
    expect(amountInWords(0)).toBe("Rupees Zero Only");
    expect(amountInWords(105)).toBe("Rupees One Hundred Five Only");
    expect(amountInWords(250000)).toBe("Rupees Two Lakh Fifty Thousand Only");
    expect(amountInWords(12345678)).toBe(
      "Rupees One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only",
    );
    expect(numberInWords(1_000_000_000)).toBe("One Hundred Crore");
  });

  it("adds paise", () => {
    expect(amountInWords(1250.5)).toBe("Rupees One Thousand Two Hundred Fifty and Fifty Paise Only");
    expect(amountInWords(99.07)).toBe("Rupees Ninety-Nine and Seven Paise Only");
  });
});

describe("loss of pay", () => {
  it("is the day's gross pay times the unpaid days, to the rupee", () => {
    expect(lopAmount(30000, "2026-11", 2)).toBe(2000);
    expect(lopAmount(31000, "2026-12", 0.5)).toBe(500);
    expect(lopAmount(30000, "2026-11", 0)).toBe(0);
    expect(paidDays("2026-11", 1.5)).toBe(28.5);
    expect(lopLabel(1)).toBe("Loss of pay (1 day)");
    expect(lopLabel(2.5)).toBe("Loss of pay (2.5 days)");
  });

  it("keeps one loss-of-pay line in step with the days", () => {
    const earnings = [{ label: "Basic", amount: 30000 }];
    const tax = { label: "Professional tax", amount: 200 };
    expect(withLopLine([tax], earnings, "2026-11", 1)).toEqual([tax, { label: "Loss of pay (1 day)", amount: 1000 }]);
    expect(withLopLine([tax, { label: "Loss of pay (1 day)", amount: 1000 }], earnings, "2026-11", 3)).toEqual([
      tax,
      { label: "Loss of pay (3 days)", amount: 3000 },
    ]);
    expect(withLopLine([tax, { label: "Loss of pay (3 days)", amount: 3000 }], earnings, "2026-11", 0)).toEqual([tax]);
  });
});

describe("draftFigures", () => {
  it("starts from the salary lines, unpaid days and claims", () => {
    const figures = draftFigures(
      {
        earnings: [
          { label: "Basic", amount: 20000 },
          { label: "HRA", amount: 10000 },
        ],
        deductions: [{ label: "Professional tax", amount: 200 }],
      },
      "2026-11",
      1,
      1500,
    );
    expect(figures.deductions).toEqual([
      { label: "Professional tax", amount: 200 },
      { label: "Loss of pay (1 day)", amount: 1000 },
    ]);
    expect(figures.paid_days).toBe(29);
    expect(figures.net).toBe(30000 - 1200 + 1500);
    expect(payslipNet(figures)).toBe(figures.net);
  });

  it("never goes below zero", () => {
    expect(
      payslipNet({ earnings: [{ label: "Basic", amount: 100 }], deductions: [{ label: "Tax", amount: 500 }], reimbursement: 0 }),
    ).toBe(0);
  });
});

describe("joining part-way through a month", () => {
  it("counts the days from the joining day to the month's end", () => {
    expect(joinedPartWay("2026-11-20", "2026-11")).toEqual({ days: 11 });
    expect(joinedPartWay("2026-11-30", "2026-11")).toEqual({ days: 1 });
    expect(joinedPartWay("2026-12-05", "2026-11")).toEqual({ days: 0 });
  });

  it("is nothing special for a full month or an unknown date", () => {
    expect(joinedPartWay("2026-11-01", "2026-11")).toBeNull();
    expect(joinedPartWay("2026-10-20", "2026-11")).toBeNull();
    expect(joinedPartWay(null, "2026-11")).toBeNull();
  });
});

describe("payslipPdf", () => {
  it("makes an A4 PDF with no bank details", async () => {
    const slip = {
      name: "Priya Sharma",
      email: "priya@studio1hq.com",
      employee_code: "S1-012",
      designation: "Developer Advocate",
      joined_on: "2026-01-15",
      month: "2026-11",
      paid_days: 29,
      lop_days: 1,
      earnings: [
        { label: "Basic", amount: 25000 },
        { label: "House rent allowance", amount: 12500 },
        { label: "Special allowance", amount: 7500 },
      ],
      deductions: [
        { label: "Professional tax", amount: 200 },
        { label: "Loss of pay (1 day)", amount: 1500 },
      ],
      reimbursement: 1840.5,
      net: 45000 - 1700 + 1840.5,
      payDate: "2026-11-30T10:00:00Z",
    };
    const bytes = await payslipPdf(slip);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(payslipFileName(slip)).toBe("Payslip-Priya-Sharma-Nov-2026.pdf");
    // PAYSLIP_SAMPLE=/path/sample.pdf pnpm test payroll — to look at the layout.
    if (process.env.PAYSLIP_SAMPLE) await writeFile(process.env.PAYSLIP_SAMPLE, bytes);
  });
});
