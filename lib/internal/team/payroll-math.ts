import {
  daysInMonth,
  payslipNet,
  sumLines,
  type PayLine,
  type Payslip,
  type TeamPersonPay,
} from "@/lib/internal/team/shared";

/**
 * Payslip numbers with no server imports, so the Payroll editor can work them
 * out live and the tests can check them: the loss-of-pay line, a fresh draft
 * from someone's salary lines, and the amount in words.
 */

/** The figures a payslip shows; a saved slip or a fresh draft. */
export type PayslipFigures = Pick<
  Payslip,
  "earnings" | "deductions" | "lop_days" | "paid_days" | "reimbursement" | "net"
>;

/** Lines starting with this are the loss-of-pay deduction the editor manages. */
export const LOP_PREFIX = "Loss of pay";

export function isLopLine(line: PayLine) {
  return line.label.startsWith(LOP_PREFIX);
}

/** "Loss of pay (2 days)", "Loss of pay (0.5 day)". */
export function lopLabel(days: number) {
  return `${LOP_PREFIX} (${days} ${days === 1 || days === 0.5 ? "day" : "days"})`;
}

/** Gross pay for the month, divided by its days, times the unpaid days, rounded to the rupee. */
export function lopAmount(gross: number, month: string, lopDays: number) {
  if (!(lopDays > 0) || !(gross > 0)) return 0;
  return Math.round((gross / daysInMonth(month)) * Math.min(lopDays, daysInMonth(month)));
}

/**
 * Deductions with the loss-of-pay line brought up to date: added, updated or
 * removed to match the unpaid days. Other lines stay as they are.
 */
export function withLopLine(deductions: readonly PayLine[], earnings: readonly PayLine[], month: string, lopDays: number) {
  const others = deductions.filter((line) => !isLopLine(line));
  const amount = lopAmount(sumLines(earnings), month, lopDays);
  return amount > 0 ? [...others, { label: lopLabel(lopDays), amount }] : others;
}

/** Paid days: the days in the month less the unpaid ones, never below zero. */
export function paidDays(month: string, lopDays: number) {
  return Math.max(0, daysInMonth(month) - Math.max(0, lopDays));
}

/** A new payslip from someone's salary lines, their unpaid days and approved claims. */
export function draftFigures(
  person: Pick<TeamPersonPay, "earnings" | "deductions">,
  month: string,
  lopDays: number,
  reimbursement: number,
): PayslipFigures {
  const earnings = [...person.earnings];
  const deductions = withLopLine(person.deductions, earnings, month, lopDays);
  const figures = { earnings, deductions, reimbursement: round2(reimbursement) };
  return {
    ...figures,
    lop_days: lopDays,
    paid_days: paidDays(month, lopDays),
    net: payslipNet(figures),
  };
}

/**
 * When someone joined after the 1st of this month (or after the month
 * altogether): the days they're due pay for, counting the joining day. Null
 * when they were there all month, or the joining date isn't known.
 */
export function joinedPartWay(joinedOn: string | null | undefined, month: string): { days: number } | null {
  if (!joinedOn || !/^\d{4}-\d{2}-\d{2}$/.test(joinedOn)) return null;
  const joinedMonth = joinedOn.slice(0, 7);
  if (joinedMonth < month) return null;
  if (joinedMonth > month) return { days: 0 };
  const day = Number(joinedOn.slice(8));
  return day <= 1 ? null : { days: Math.max(0, daysInMonth(month) - day + 1) };
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/* -------------------------------------------------------- amount in words */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number) {
  if (n < 20) return ONES[n];
  const rest = n % 10;
  return rest ? `${TENS[Math.floor(n / 10)]}-${ONES[rest]}` : TENS[Math.floor(n / 10)];
}

/** Whole numbers in the Indian system: crore, lakh, thousand, hundred. */
export function numberInWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const hundred = Math.floor((n % 1e3) / 100);
  const rest = n % 100;
  if (crore) parts.push(`${numberInWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(belowHundred(rest));
  return parts.join(" ");
}

/** 45000 → "Rupees Forty-Five Thousand Only"; 1250.5 → "… and Fifty Paise Only". */
export function amountInWords(amount: number) {
  const value = Math.max(0, round2(amount));
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const words = `Rupees ${numberInWords(rupees)}`;
  return paise ? `${words} and ${belowHundred(paise)} Paise Only` : `${words} Only`;
}
