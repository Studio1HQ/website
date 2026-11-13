"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/internal/session";
import { emailAddress } from "@/lib/internal/token";
import { getSlipFor, monthIsOpen, savePayslip, sendPayslip, type SendResult } from "@/lib/internal/team/payroll";
import { decideReimbursement, getReimbursement } from "@/lib/internal/team/reimbursements";
import { cleanLines, isMonthKey, isUuid, monthLabel, type TeamResult } from "@/lib/internal/team/shared";

/*
 * Payroll actions, admins only. Server actions are public endpoints, so each
 * one checks the session and every input again.
 */

const NOT_YET = "Payslips can be made for this month or earlier ones, not later.";

/** Saves the payslip editor: lines, loss-of-pay days, and maybe the salary defaults. */
export async function saveSlip(input: {
  email: unknown;
  month: unknown;
  earnings: unknown;
  deductions: unknown;
  lopDays: unknown;
  saveDefaults: unknown;
}): Promise<TeamResult> {
  const admin = await requireStaff("admin");
  const email = emailAddress(input?.email);
  const month = input?.month;
  if (!email || !isMonthKey(month)) return { ok: false, message: "That payslip isn't valid." };
  if (!monthIsOpen(month)) return { ok: false, message: NOT_YET };
  const lopDays = typeof input.lopDays === "number" ? input.lopDays : Number(input.lopDays);
  if (!Number.isFinite(lopDays)) return { ok: false, message: "Loss-of-pay days should be a number." };
  const result = await savePayslip(
    email,
    month,
    {
      earnings: cleanLines(input.earnings),
      deductions: cleanLines(input.deductions),
      lopDays,
      saveDefaults: input.saveDefaults === true,
    },
    admin.email,
  );
  if (result.ok) revalidatePath("/internal/money/payroll");
  return result;
}

/** Emails one payslip; the page calls this once per person so it can show progress. */
export async function emailSlip(email: unknown, month: unknown, resend: unknown): Promise<SendResult> {
  const admin = await requireStaff("admin");
  const target = emailAddress(email);
  if (!target || !isMonthKey(month)) return { ok: false, message: "That payslip isn't valid." };
  if (!monthIsOpen(month)) return { ok: false, message: NOT_YET };
  const result = await sendPayslip(target, month, admin.email, { resend: resend === true });
  revalidatePath("/internal", "layout");
  return result;
}

/** Approves an expense claim onto a payslip month (amount can be corrected), or rejects it. */
export async function decideClaim(
  id: unknown,
  decision: unknown,
  month: unknown,
  amount: unknown,
): Promise<TeamResult> {
  const admin = await requireStaff("admin");
  if (!isUuid(id)) return { ok: false, message: "That claim isn't valid." };
  if (decision !== "approved" && decision !== "rejected") return { ok: false, message: "That change isn't valid." };
  const claim = await getReimbursement(id);
  if (!claim) return { ok: false, message: "That claim isn't there any more." };
  if (claim.status === "paid") return { ok: false, message: "It's already been paid with a payslip." };
  if (decision === "approved") {
    if (!isMonthKey(month)) return { ok: false, message: "Pick the payslip month it's paid with." };
    // A payslip that's already gone out keeps its numbers, so a claim put on
    // it now would never be paid. It goes on a later one instead.
    const slip = await getSlipFor(claim.email, month);
    if (slip?.status === "sent") {
      return {
        ok: false,
        message: `The ${monthLabel(month)} payslip has already been emailed. Pick a later month, or edit that payslip first.`,
      };
    }
  }
  const result = await decideReimbursement(
    id,
    decision === "approved" && isMonthKey(month) ? { status: "approved", month, amount } : { status: "rejected" },
    admin.email,
  );
  if (result.ok) revalidatePath("/internal", "layout");
  return result;
}
