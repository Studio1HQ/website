import { selectRows, updateRows, upsertRows } from "@/lib/supabase-server";
import { logEmails, recordAccepted } from "@/lib/email-delivery";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { listDays } from "@/lib/internal/team/attendance";
import { audit } from "@/lib/internal/team/audit";
import { getPersonPay, listPeoplePay, savePayDefaults } from "@/lib/internal/team/people";
import {
  draftFigures,
  isLopLine,
  joinedPartWay,
  paidDays,
  round2,
  type PayslipFigures,
} from "@/lib/internal/team/payroll-math";
import { payslipEmail } from "@/lib/internal/team/payroll-email";
import { payslipFileName, payslipPdf } from "@/lib/internal/team/payslip-pdf";
import { listReimbursements } from "@/lib/internal/team/reimbursements";
import {
  TEAM_MIGRATION_HINT,
  cleanLines,
  daysInMonth,
  isMissingTable,
  isMonthKey,
  isUuid,
  istNow,
  lopFor,
  monthLabel,
  monthOf,
  monthStart,
  payslipNet,
  sumLines,
  type PayLine,
  type Payslip,
  type PayslipStatus,
  type Reimbursement,
  type TeamPersonPay,
  type TeamResult,
} from "@/lib/internal/team/shared";

/**
 * Payslips (team_payslips): one per person per month. A draft starts from
 * the person's salary lines (team_people), the month's unpaid leave
 * (team_attendance) and their approved expense claims; the admin checks it
 * on /internal/money/payroll, and "Done" emails each one as a PDF. No session
 * checks here; the page, actions and PDF route do that. Server only.
 *
 * Emailing a slip marks the month's approved claims paid. They still belong
 * to that slip, so a slip's claims total always counts approved and paid
 * ones: editing a slip after it went out keeps its reimbursements.
 */

const TABLE = "team_payslips";

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toPayslip(row: Record<string, unknown>): Payslip | null {
  if (typeof row.id !== "string" || typeof row.email !== "string" || typeof row.month !== "string") return null;
  return {
    id: row.id,
    email: row.email,
    month: row.month.slice(0, 7),
    name: typeof row.name === "string" ? row.name : "",
    employee_code: typeof row.employee_code === "string" && row.employee_code ? row.employee_code : null,
    designation: typeof row.designation === "string" ? row.designation : "",
    joined_on: typeof row.joined_on === "string" ? row.joined_on : null,
    paid_days: num(row.paid_days),
    lop_days: num(row.lop_days) ?? 0,
    earnings: cleanLines(row.earnings),
    deductions: cleanLines(row.deductions),
    reimbursement: num(row.reimbursement) ?? 0,
    net: num(row.net) ?? 0,
    status: row.status === "sent" ? "sent" : "draft",
    sent_at: typeof row.sent_at === "string" ? row.sent_at : null,
    sent_by: typeof row.sent_by === "string" ? row.sent_by : null,
    updated_at: String(row.updated_at ?? ""),
  };
}

export type PayslipsResult = { ok: true; slips: Payslip[] } | { ok: false; message: string; missing: boolean };

/** Saved payslips, newest month first: someone's, a month's, or by status. */
export async function listPayslips(
  filter: { email?: string; month?: string; status?: PayslipStatus } = {},
): Promise<PayslipsResult> {
  const query = new URLSearchParams({ select: "*", order: "month.desc,name.asc", limit: "500" });
  if (filter.email) query.set("email", `eq.${filter.email}`);
  if (filter.month && isMonthKey(filter.month)) query.set("month", `eq.${monthStart(filter.month)}`);
  if (filter.status) query.set("status", `eq.${filter.status}`);
  const result = await selectRows(TABLE, query);
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing) console.error(`[payroll] reading ${TABLE} failed: ${result.message}`);
    return { ok: false, missing, message: missing ? TEAM_MIGRATION_HINT : "Couldn't load payslips." };
  }
  return { ok: true, slips: result.rows.map(toPayslip).filter((slip): slip is Payslip => slip !== null) };
}

export async function getPayslip(id: string): Promise<Payslip | null> {
  if (!isUuid(id)) return null;
  const result = await selectRows(TABLE, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  return result.ok && result.rows[0] ? toPayslip(result.rows[0]) : null;
}

/** Someone's saved payslip for a month, if there is one. */
export async function getSlipFor(email: string, month: string): Promise<Payslip | null> {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({ select: "*", email: `eq.${email}`, month: `eq.${monthStart(month)}`, limit: "1" }),
  );
  return result.ok && result.rows[0] ? toPayslip(result.rows[0]) : null;
}

/* ------------------------------------------------------------ the month */

/** Payroll never runs ahead: this IST month is the latest a payslip can be for. */
export function monthIsOpen(month: string) {
  return isMonthKey(month) && month <= monthOf(istNow().date);
}

/**
 * Unpaid leave days per person in a month, from attendance. Null when
 * attendance couldn't be read: callers must stop rather than treat that as
 * "nobody took unpaid leave".
 */
async function lopByPerson(month: string, emails: string[]): Promise<Map<string, number> | null> {
  const days = await listDays({ from: monthStart(month), to: `${month}-${daysInMonth(month)}`, emails });
  if (!days.ok) return null;
  const totals = new Map<string, number>();
  for (const day of days.days) totals.set(day.email, (totals.get(day.email) ?? 0) + lopFor(day));
  return totals;
}

/**
 * The month's claims that go on the payslip: approved ones, and ones this
 * slip already paid. Only rupees count; others need a manual line.
 */
export function claimsTotal(claims: readonly Pick<Reimbursement, "status" | "currency" | "amount">[]) {
  return round2(
    claims
      .filter((claim) => (claim.status === "approved" || claim.status === "paid") && claim.currency === "INR")
      .reduce((sum, claim) => sum + (claim.amount ?? 0), 0),
  );
}

export type PayrollRow = {
  person: TeamPersonPay;
  /** The saved payslip, if there is one. */
  slip: Payslip | null;
  /** What the slip shows now: the saved one (claims refreshed while a draft) or a fresh draft. */
  figures: PayslipFigures;
  /** Unpaid leave days attendance shows for the month. */
  attendanceLop: number;
  /** This month's approved and paid expense claims. */
  claims: Reimbursement[];
  /** No salary lines yet, and nothing saved: there's no payslip to make. */
  noSalary: boolean;
  /**
   * Why this unsaved draft can't be emailed as it is (they joined part-way
   * through the month, so a full month's pay would be too much), or null.
   * Saving the payslip, with the lines put right, clears it.
   */
  check: string | null;
};

export type PayrollMonth =
  | { ok: true; month: string; rows: PayrollRow[]; people: TeamPersonPay[] }
  | { ok: false; message: string; missing: boolean };

const ATTENDANCE_FAILED = "Couldn't read attendance, so loss of pay can't be worked out. Try again in a minute.";

/** Figures for a saved slip; while it's a draft, its claims total is brought up to date. */
function savedFigures(slip: Payslip, claims: readonly Reimbursement[]): PayslipFigures {
  const reimbursement = slip.status === "sent" ? slip.reimbursement : claimsTotal(claims);
  const figures = { earnings: slip.earnings, deductions: slip.deductions, reimbursement };
  return {
    ...figures,
    lop_days: slip.lop_days,
    paid_days: slip.paid_days ?? paidDays(slip.month, slip.lop_days),
    net: slip.status === "sent" ? slip.net : payslipNet(figures),
  };
}

function joinCheck(person: TeamPersonPay, month: string, slip: Payslip | null): string | null {
  if (slip) return null;
  const part = joinedPartWay(person.joined_on, month);
  if (!part) return null;
  return part.days === 0
    ? `Joined on ${person.joined_on}, after ${monthLabel(month)}: there's nothing to pay for this month.`
    : `Joined on ${person.joined_on}: pay is due for ${part.days} of ${daysInMonth(month)} days. Put the lines right and save before emailing.`;
}

function toRow(person: TeamPersonPay, month: string, slip: Payslip | null, claims: Reimbursement[], attendanceLop: number): PayrollRow {
  return {
    person,
    slip,
    figures: slip ? savedFigures(slip, claims) : draftFigures(person, month, attendanceLop, claimsTotal(claims)),
    attendanceLop,
    claims,
    noSalary: !slip && person.earnings.length === 0,
    check: joinCheck(person, month, slip),
  };
}

/**
 * Everyone's payslip for a month: active people, plus anyone who has a slip
 * that month and has since left. `people` is the whole roster, for names.
 */
export async function payrollMonth(month: string): Promise<PayrollMonth> {
  const [people, slips, claims] = await Promise.all([
    listPeoplePay(),
    listPayslips({ month }),
    listReimbursements({ status: ["approved", "paid"], month }),
  ]);
  if (!people.ok) return people;
  if (!slips.ok) return slips;
  if (!claims.ok) return claims;

  const slipFor = new Map(slips.slips.map((slip) => [slip.email, slip]));
  const included = people.people.filter((person) => person.active || slipFor.has(person.email));
  const lop = await lopByPerson(
    month,
    included.map((person) => person.email),
  );
  if (!lop) return { ok: false, missing: false, message: ATTENDANCE_FAILED };

  const rows = included.map((person) =>
    toRow(
      person,
      month,
      slipFor.get(person.email) ?? null,
      claims.items.filter((claim) => claim.email === person.email),
      lop.get(person.email) ?? 0,
    ),
  );
  return { ok: true, month, rows, people: people.people };
}

/** One person's row for a month (the draft builder for a single person), or why not. */
async function rowFor(email: string, month: string): Promise<{ ok: true; row: PayrollRow } | { ok: false; message: string }> {
  const [person, slip, claims, lop] = await Promise.all([
    getPersonPay(email),
    getSlipFor(email, month),
    listReimbursements({ email, status: ["approved", "paid"], month }),
    lopByPerson(month, [email]),
  ]);
  if (!person) return { ok: false, message: "That person isn't on the team list." };
  // Never guess: a failed read here would quietly drop claims or loss of pay.
  if (!claims.ok) return { ok: false, message: "Couldn't read the expense claims. Try again in a minute." };
  if (!lop) return { ok: false, message: ATTENDANCE_FAILED };
  return { ok: true, row: toRow(person, month, slip, claims.items, lop.get(email) ?? 0) };
}

/* --------------------------------------------------------------- saving */

function snapshot(person: TeamPersonPay) {
  return {
    name: person.name,
    employee_code: person.employee_code,
    designation: person.designation,
    joined_on: person.joined_on,
  };
}

function saveError(message: string): { ok: false; message: string } {
  console.error(`[payroll] saving a payslip failed: ${message}`);
  if (isMissingTable(message)) return { ok: false, message: TEAM_MIGRATION_HINT };
  if (message.includes("23503")) return { ok: false, message: "That person isn't on the team list." };
  return { ok: false, message: "Couldn't save. Try again in a minute." };
}

async function writeSlip(
  person: TeamPersonPay,
  month: string,
  figures: PayslipFigures,
  by: string,
  extra: Record<string, unknown> = {},
) {
  return upsertRows(
    TABLE,
    [
      {
        email: person.email,
        month: monthStart(month),
        ...snapshot(person),
        paid_days: figures.paid_days,
        lop_days: figures.lop_days,
        earnings: figures.earnings,
        deductions: figures.deductions,
        reimbursement: figures.reimbursement,
        net: figures.net,
        updated_by: by,
        updated_at: new Date().toISOString(),
        ...extra,
      },
    ],
    { onConflict: "email,month" },
  );
}

export type PayslipEdit = {
  earnings: PayLine[];
  deductions: PayLine[];
  lopDays: number;
  /** Also make these lines (less loss of pay) the person's salary for later months. */
  saveDefaults: boolean;
};

/**
 * Saves an admin's edits as a draft. A slip that was already emailed goes
 * back to unsent, so it can be emailed again with the new numbers; the
 * claims it paid stay on it.
 */
export async function savePayslip(email: string, month: string, edit: PayslipEdit, by: string): Promise<TeamResult> {
  if (!monthIsOpen(month)) return { ok: false, message: "Pick this month or an earlier one." };
  const lopDays = Math.round(edit.lopDays * 2) / 2;
  if (!Number.isFinite(lopDays) || lopDays < 0 || lopDays > daysInMonth(month)) {
    return { ok: false, message: "Loss-of-pay days should be between 0 and the days in the month." };
  }
  const found = await rowFor(email, month);
  if (!found.ok) return found;
  const row = found.row;
  const earnings = cleanLines(edit.earnings);
  const deductions = cleanLines(edit.deductions);
  if (earnings.length === 0) return { ok: false, message: "Add at least one earning, like Basic." };
  const reimbursement = claimsTotal(row.claims);
  if (sumLines(deductions) > sumLines(earnings) + reimbursement) {
    return { ok: false, message: "Deductions are more than the pay. Check the amounts." };
  }
  const figures: PayslipFigures = {
    earnings,
    deductions,
    reimbursement,
    lop_days: lopDays,
    paid_days: Math.max(0, daysInMonth(month) - lopDays),
    net: payslipNet({ earnings, deductions, reimbursement }),
  };
  const result = await writeSlip(row.person, month, figures, by, {
    status: "draft",
    sent_at: null,
    sent_by: null,
    resend_id: null,
  });
  if (!result.ok) return saveError(result.message);
  await audit({
    actor: by,
    area: "payroll",
    action: row.slip?.status === "sent" ? "payslip-reopened" : "payslip-saved",
    subject: `${email} ${month}`,
    detail: {
      before: row.slip ? { net: row.slip.net, reimbursement: row.slip.reimbursement, lop_days: row.slip.lop_days } : null,
      after: { net: figures.net, reimbursement, lop_days: lopDays },
    },
  });
  if (edit.saveDefaults) {
    const defaults = await savePayDefaults(
      email,
      { earnings, deductions: deductions.filter((line) => !isLopLine(line)) },
      by,
    );
    if (!defaults.ok) return { ok: false, message: `Saved the payslip, but not the salary lines: ${defaults.message}` };
  }
  return { ok: true };
}

/* -------------------------------------------------------------- sending */

export type SendResult =
  | { ok: true; status: "sent" }
  | { ok: true; status: "skipped"; message: string }
  | { ok: false; message: string };

/** How long a "being emailed" hold lasts before another send may take over (a crashed send). */
const HOLD_MINUTES = 10;

/**
 * Takes the slip for sending, so two people (or a double click) can't both
 * email it: a draft is held by stamping `sent_at`, and only one update can
 * do that. True when this call got it.
 */
async function holdForSending(id: string, at: string, by: string) {
  const hold = { sent_at: at, sent_by: by };
  const free = await updateRows(TABLE, new URLSearchParams({ id: `eq.${id}`, status: "eq.draft", sent_at: "is.null" }), hold);
  if (free.ok && free.count) return true;
  const stale = new Date(Date.parse(at) - HOLD_MINUTES * 60_000).toISOString();
  const taken = await updateRows(TABLE, new URLSearchParams({ id: `eq.${id}`, status: "eq.draft", sent_at: `lt.${stale}` }), hold);
  return taken.ok && taken.count > 0;
}

async function releaseHold(id: string) {
  const result = await updateRows(TABLE, new URLSearchParams({ id: `eq.${id}`, status: "eq.draft" }), { sent_at: null, sent_by: null });
  if (!result.ok) console.error(`[payroll] releasing ${id} after a failed send didn't work: ${result.message}`);
}

/**
 * Emails one payslip as a PDF. Saves the draft first (from the person's
 * salary lines if nothing was saved), holds it so it can't go out twice,
 * then marks it sent and the month's approved claims paid. An already-sent
 * slip is skipped unless `resend`.
 */
export async function sendPayslip(email: string, month: string, by: string, options: { resend?: boolean } = {}): Promise<SendResult> {
  if (!monthIsOpen(month)) return { ok: false, message: "Pick this month or an earlier one." };
  if (!isMailerConfigured()) return { ok: false, message: "Email isn't set up here (RESEND_API_KEY)." };
  const found = await rowFor(email, month);
  if (!found.ok) return found;
  const row = found.row;
  if (row.slip?.status === "sent" && !options.resend) return { ok: true, status: "skipped", message: "Already emailed." };
  if (row.noSalary || row.figures.earnings.length === 0) {
    return { ok: true, status: "skipped", message: "No salary set." };
  }
  if (row.figures.net <= 0) return { ok: true, status: "skipped", message: "Net pay is zero." };
  if (row.check) return { ok: false, message: row.check };

  // A sent slip goes out again exactly as it was; anything else is saved
  // fresh, with today's details from the team list. The status isn't
  // written here: a slip someone else just sent must stay sent.
  const resending = row.slip?.status === "sent";
  if (!resending) {
    const saved = await writeSlip(row.person, month, row.figures, by);
    if (!saved.ok) return saveError(saved.message);
  }
  const slip = await getSlipFor(email, month);
  if (!slip) return { ok: false, message: "Couldn't save the payslip first. Try again." };

  const now = new Date().toISOString();
  if (!resending) {
    if (slip.status === "sent") return { ok: true, status: "skipped", message: "Already emailed." };
    if (!(await holdForSending(slip.id, now, by))) {
      return { ok: false, message: "It's being emailed right now by someone else. Reload in a minute." };
    }
  }
  const sentAt = resending && slip.sent_at ? slip.sent_at : now;

  let pdf: Uint8Array;
  try {
    pdf = await payslipPdf({ ...slip, payDate: sentAt });
  } catch (error) {
    console.error(`[payroll] making the PDF for ${email} failed`, error);
    if (!resending) await releaseHold(slip.id);
    return { ok: false, message: "Couldn't make the PDF." };
  }
  const message = payslipEmail({ name: slip.name || row.person.name, month, net: slip.net });
  let resendId: string | null = null;
  try {
    const sent = await sendMail({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: by.includes("@") ? by : undefined,
      attachments: [{ filename: payslipFileName(slip), content: pdf, contentType: "application/pdf" }],
    });
    resendId = sent.id;
  } catch (error) {
    console.error(`[payroll] emailing the payslip to ${email} failed`, error);
    if (!resending) await releaseHold(slip.id);
    return { ok: false, message: "Resend didn't take the email. Try again in a minute." };
  }

  // The email is out. Marking it is tried twice; if it still fails the hold
  // stays (so "email all" doesn't send it again straight away) and the admin
  // is told, instead of the page saying "sent" over a slip that isn't.
  const mark = { status: "sent", sent_at: sentAt, sent_by: by, resend_id: resendId, updated_at: new Date().toISOString() };
  let marked = await updateRows(TABLE, new URLSearchParams({ id: `eq.${slip.id}` }), mark);
  if (!marked.ok || !marked.count) marked = await updateRows(TABLE, new URLSearchParams({ id: `eq.${slip.id}` }), mark);
  if (!marked.ok || !marked.count) {
    console.error(`[payroll] marking ${slip.id} sent failed: ${marked.ok ? "no row changed" : marked.message}`);
    return {
      ok: false,
      message: "The email went out, but the payslip couldn't be marked as emailed. Don't send it again: reload in a minute and check.",
    };
  }

  const counted = row.claims.filter((claim) => claim.status === "approved" && claim.currency === "INR").map((claim) => claim.id);
  if (!resending && counted.length) {
    const paid = await updateRows(
      "team_reimbursements",
      new URLSearchParams({ id: `in.(${counted.join(",")})`, status: "eq.approved" }),
      { status: "paid" },
    );
    if (!paid.ok) console.error(`[payroll] marking claims paid for ${email} failed: ${paid.message}`);
  }

  await audit({
    actor: by,
    area: "payroll",
    action: resending ? "payslip-resent" : "payslip-sent",
    subject: `${email} ${month}`,
    detail: { net: slip.net, reimbursement: slip.reimbursement, claims: resending ? [] : counted },
  });
  await recordAccepted([{ resendId, to: email }], "sent");
  const logged = await logEmails([
    {
      source_table: TABLE,
      record_id: slip.id,
      to_email: email,
      template: "payslip",
      subject: message.subject,
      sent_by: by,
      resend_id: resendId,
    },
  ]);
  if (!logged.ok) console.error(`[payroll] logging the payslip email failed: ${logged.message}`);
  return { ok: true, status: "sent" };
}

/** The figures for a person's unsaved draft, for the admin's PDF preview. */
export async function draftPayslip(email: string, month: string): Promise<Payslip | null> {
  if (!isMonthKey(month)) return null;
  const found = await rowFor(email, month);
  if (!found.ok) return null;
  const row = found.row;
  return {
    id: "draft",
    email,
    month,
    ...snapshot(row.person),
    ...row.figures,
    status: row.slip?.status ?? "draft",
    sent_at: row.slip?.sent_at ?? null,
    sent_by: row.slip?.sent_by ?? null,
    updated_at: row.slip?.updated_at ?? "",
  };
}
