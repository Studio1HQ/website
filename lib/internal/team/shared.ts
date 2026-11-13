/**
 * Team, attendance, payroll and payments: the types and small helpers both
 * the server and client components use. No server imports here.
 *
 * Tables: supabase/migrations/20261113130000_team_and_payments.sql.
 * Dates are plain "YYYY-MM-DD" strings and months "YYYY-MM", in IST, where
 * the team works.
 */

/* ---------------------------------------------------------------- people */

export type PersonKind = "employee" | "intern";

export const PERSON_KINDS: Record<PersonKind, string> = {
  employee: "Employee",
  intern: "Intern",
};

/** One earning or deduction on a payslip. */
export type PayLine = { label: string; amount: number };

export type TeamPerson = {
  email: string;
  name: string;
  employee_code: string | null;
  photo_path: string | null;
  kind: PersonKind;
  designation: string;
  joined_on: string | null;
  /** Interns: who logs their days, besides admins. */
  reviewer: string | null;
  active: boolean;
  updated_at: string;
};

/**
 * A person with their salary lines. Only the Money pages (admins) read this
 * shape; everything else gets TeamPerson, so pay can't reach a browser that
 * shouldn't see it by accident.
 */
export type TeamPersonPay = TeamPerson & {
  earnings: PayLine[];
  deductions: PayLine[];
};

/** The name to show: their own, else the part of the email before the @. */
export function displayName(person: { name?: string | null; email: string }) {
  const name = person.name?.trim();
  if (name) return name;
  return person.email
    .split("@")[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The dashboard URL of someone's photo, or null; the version busts caches. */
export function photoUrl(person: { email: string; photo_path: string | null } | null | undefined) {
  if (!person?.photo_path) return null;
  const version = person.photo_path.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
  return `/internal/team-file/photo/${encodeURIComponent(person.email)}?v=${version}`;
}

/* ------------------------------------------------------------ attendance */

export type AttendanceKind = "work" | "half_day" | "leave";
export type LeaveType = "paid" | "sick" | "unpaid";

export const ATTENDANCE_KINDS: Record<AttendanceKind, string> = {
  work: "Worked",
  half_day: "Half day",
  leave: "Leave",
};

export const LEAVE_TYPES: Record<LeaveType, string> = {
  paid: "Paid leave",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
};

export type AttendanceDay = {
  id: string;
  email: string;
  day: string;
  kind: AttendanceKind;
  leave_type: LeaveType | null;
  /** "09:30", or null. */
  start_time: string | null;
  end_time: string | null;
  active_minutes: number | null;
  note: string;
  logged_by: string;
  updated_at: string;
};

/** Days of loss of pay a day adds: 1 for unpaid leave, 0.5 for an unpaid half. */
export function lopFor(day: Pick<AttendanceDay, "kind" | "leave_type">) {
  if (day.leave_type !== "unpaid") return 0;
  return day.kind === "leave" ? 1 : day.kind === "half_day" ? 0.5 : 0;
}

/** Leave days a day adds, of any type. */
export function leaveFor(day: Pick<AttendanceDay, "kind">) {
  return day.kind === "leave" ? 1 : day.kind === "half_day" ? 0.5 : 0;
}

/** "09:30:00" or "9:30" → "09:30"; anything else → null. */
export function cleanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Minutes from start to end; past midnight counts as the next day. */
export function minutesBetween(start: string | null, end: string | null) {
  const a = cleanTime(start);
  const b = cleanTime(end);
  if (!a || !b) return null;
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const diff = toMinutes(b) - toMinutes(a);
  return diff >= 0 ? diff : diff + 1440;
}

/** 450 → "7h 30m", 480 → "8h", 25 → "25m". */
export function formatMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "7.5" or "7:30" or "7h 30m" → 450; blank → null; nonsense → NaN. */
export function parseHours(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  const clock = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const words = raw.match(/^(?:(\d{1,2})\s*h)?\s*(?:(\d{1,2})\s*m)?$/);
  if (words && (words[1] || words[2])) return Number(words[1] ?? 0) * 60 + Number(words[2] ?? 0);
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 && number <= 24 ? Math.round(number * 60) : Number.NaN;
}

/* ----------------------------------------------------------------- dates */

const IST = "Asia/Kolkata";

/** Today's date and the time now in IST: { date: "2026-11-13", time: "17:35" }. */
export function istNow(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** "2026-11-13" → "2026-11". */
export function monthOf(date: string) {
  return date.slice(0, 7);
}

/** "2026-11" → "2026-11-01", the form the tables store months in. */
export function monthStart(month: string) {
  return `${month}-01`;
}

/** "2026-11" moved by n months. */
export function shiftMonth(month: string, n: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + n, 1));
  return date.toISOString().slice(0, 7);
}

export function daysInMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

/** Every date in the month: ["2026-11-01", …, "2026-11-30"]. */
export function datesOfMonth(month: string) {
  return Array.from({ length: daysInMonth(month) }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isWeekend(date: string) {
  const day = weekday(date);
  return day === 0 || day === 6;
}

/** Every date from start to end, both included (at most 62). */
export function dateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last && dates.length < 62) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** "2026-11" → "November 2026"; short: "Nov 2026". */
export function monthLabel(month: string, short = false) {
  const [year, index] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: short ? "short" : "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, index - 1, 1)),
  );
}

/** "2026-11-13" → "Fri 13 Nov"; long: "Friday, 13 November 2026". */
export function dayLabel(date: string, long = false) {
  return new Intl.DateTimeFormat(
    "en-GB",
    long
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
      : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" },
  ).format(new Date(`${date}T00:00:00Z`));
}

/* ----------------------------------------------------------------- money */

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** ₹45,000 or $1,250.50; "—" for nothing. */
export function formatMoney(amount: number | null | undefined, currency = "INR") {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const code = isCurrency(currency) ? currency : "INR";
  return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "12,500.50", "₹12500", "12500" → 12500.5; blank → null; nonsense → NaN. */
export function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : Number.NaN;
  if (typeof value !== "string") return null;
  const raw = value.replace(/[₹$€£,\s]|inr|rs\.?/gi, "");
  if (!raw) return null;
  // Plain digits with an optional decimal part only: no "1e5", "0x10" or "Infinity".
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(raw)) return Number.NaN;
  const number = Number(raw);
  return Number.isFinite(number) && number < 1e10 ? Math.round(number * 100) / 100 : Number.NaN;
}

/** Valid pay lines from untrusted input: a label and a non-negative amount. */
export function cleanLines(value: unknown): PayLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => {
      const label = typeof line?.label === "string" ? line.label.trim().slice(0, 60) : "";
      const amount = parseAmount(line?.amount);
      return label && amount !== null && !Number.isNaN(amount) ? { label, amount } : null;
    })
    .filter((line): line is PayLine => line !== null)
    .slice(0, 20);
}

export function sumLines(lines: readonly PayLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
}

/* -------------------------------------------------------- reimbursements */

export type ReimbursementStatus = "submitted" | "approved" | "rejected" | "paid";

export const REIMBURSEMENT_STATUSES: Record<ReimbursementStatus, string> = {
  submitted: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export type Reimbursement = {
  id: string;
  created_at: string;
  email: string;
  spent_on: string | null;
  description: string;
  amount: number | null;
  currency: string;
  receipt_path: string | null;
  receipt_name: string | null;
  source: "dashboard" | "email";
  status: ReimbursementStatus;
  /** The payslip month it's paid with: "2026-11", or null. */
  month: string | null;
  decided_by: string | null;
  decided_at: string | null;
  note: string;
};

export function receiptUrl(item: Pick<Reimbursement, "id" | "receipt_path">) {
  return item.receipt_path ? `/internal/team-file/receipt/${item.id}` : null;
}

/* -------------------------------------------------------------- payslips */

export type PayslipStatus = "draft" | "sent";

export type Payslip = {
  id: string;
  email: string;
  /** "2026-11" */
  month: string;
  name: string;
  employee_code: string | null;
  designation: string;
  joined_on: string | null;
  paid_days: number | null;
  lop_days: number;
  earnings: PayLine[];
  deductions: PayLine[];
  reimbursement: number;
  net: number;
  status: PayslipStatus;
  sent_at: string | null;
  sent_by: string | null;
  updated_at: string;
};

/** Earnings minus deductions plus reimbursements, never below zero. */
export function payslipNet(slip: Pick<Payslip, "earnings" | "deductions" | "reimbursement">) {
  const net = sumLines(slip.earnings) - sumLines(slip.deductions) + (slip.reimbursement || 0);
  return Math.max(0, Math.round(net * 100) / 100);
}

export function payslipPdfUrl(slip: Pick<Payslip, "id">) {
  return `/internal/money/payroll/${slip.id}/pdf`;
}

/* -------------------------------------------------------------- payments */

export type PayeeKind = "writer" | "hackathon" | "sponsor" | "other";

export const PAYEE_KINDS: Record<PayeeKind, string> = {
  writer: "Writer",
  hackathon: "Hackathon",
  sponsor: "Sponsor",
  other: "Other",
};

export type Payee = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  kind: PayeeKind;
  notes: string;
  active: boolean;
};

export type PaymentStatus = "due" | "paid" | "cancelled";
export type PaymentDirection = "out" | "in";

export type Payment = {
  id: string;
  created_at: string;
  created_by: string;
  payee_id: string | null;
  name: string;
  email: string | null;
  code: string | null;
  kind: PayeeKind;
  direction: PaymentDirection;
  /** "2026-11" */
  month: string;
  description: string;
  amount: number | null;
  currency: string;
  status: PaymentStatus;
  source: "dashboard" | "email";
  email_subject: string | null;
  flagged: string | null;
  invoice_path: string | null;
  invoice_name: string | null;
  paid_on: string | null;
  paid_by: string | null;
  paid_reference: string | null;
  note: string;
};

/** "Paid" for money out, "Received" for money in (sponsors). */
export function paymentStatusLabel(payment: Pick<Payment, "status" | "direction">) {
  if (payment.status === "paid") return payment.direction === "in" ? "Received" : "Paid";
  if (payment.status === "cancelled") return "Cancelled";
  return payment.direction === "in" ? "To receive" : "To pay";
}

export function invoiceUrl(payment: Pick<Payment, "id" | "invoice_path">) {
  return payment.invoice_path ? `/internal/team-file/invoice/${payment.id}` : null;
}

/* --------------------------------------------------------- email intake */

/**
 * The subject lines the email intake (lib/internal/team/inbound.ts) reads:
 * a keyword, then name, code and month, split by "|". Writers, hackathon
 * partners and sponsors send invoices; employees send expense claims.
 */
export const INVOICE_SUBJECT = "Invoice | Your name | Your code | Month";
export const INVOICE_SUBJECT_EXAMPLE = "Invoice | Priya Sharma | WR-07 | Nov 2026";
export const REIMBURSEMENT_SUBJECT = "Reimbursement | Your name | Employee ID | Month";
export const REIMBURSEMENT_SUBJECT_EXAMPLE = "Reimbursement | Priya Sharma | S1-012 | Nov 2026";

/* ----------------------------------------------------------------- misc */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** One line of text someone typed: spaces tidied, cut to `max`; "" for anything else. */
export function shortText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/**
 * The biggest photo or receipt the dashboard takes. Uploads go through a
 * server action, whose whole request is capped at 4 MB (next.config.ts), so
 * the file itself gets a little less. Emailed invoices aren't bound by this.
 */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "3.5 MB";

export type TeamResult = { ok: true; message?: string } | { ok: false; message: string };

/** The message to show when a table from the team migration isn't there yet. */
export const TEAM_MIGRATION_HINT =
  "Run the team migration (supabase/migrations/20261113130000_team_and_payments.sql) in Supabase first.";

/** True when Supabase says the table or column doesn't exist yet. */
export function isMissingTable(message: string) {
  return /PGRST205|PGRST204|42P01|42703|does not exist|Could not find the table/i.test(message);
}
