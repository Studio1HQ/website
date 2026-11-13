"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/internal/session";
import {
  addPayee,
  addPayment,
  cleanPayee,
  cleanPayment,
  deletePayment,
  getPayee,
  markPaid,
  setPaymentStatus,
  updatePayee,
  updatePayment,
} from "@/lib/internal/team/payments";
import { isUuid, type TeamResult } from "@/lib/internal/team/shared";

/*
 * The Payments page's changes. Admins only; server actions are public
 * endpoints, so every input is checked again here. Each one refreshes the
 * whole dashboard so the sidebar's "to pay" count stays right.
 */

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function done(result: TeamResult) {
  if (result.ok) revalidatePath("/internal", "layout");
  return result;
}

/** Adds a payee (id null) or changes one. */
export async function savePayeeAction(id: unknown, input: unknown): Promise<TeamResult> {
  await requireStaff("admin");
  const clean = cleanPayee(record(input));
  if (!clean.ok) return clean;
  if (id === null) return done(await addPayee(clean.payee));
  if (!isUuid(id)) return { ok: false, message: "That payee isn't there any more." };
  return done(await updatePayee(id, clean.payee));
}

/** Adds a payment by hand (id null) or changes one. */
export async function savePaymentAction(id: unknown, input: unknown): Promise<TeamResult> {
  const staff = await requireStaff("admin");
  const fields = record(input);
  const payeeId = typeof fields.payee_id === "string" && fields.payee_id ? fields.payee_id : null;
  const payee = payeeId ? await getPayee(payeeId) : null;
  const clean = cleanPayment({ ...fields, payee_id: payeeId }, payee);
  if (!clean.ok) return clean;
  if (id === null) return done(await addPayment(clean.payment, staff.email));
  if (!isUuid(id)) return { ok: false, message: "That payment isn't there any more." };
  return done(await updatePayment(id, clean.payment, staff.email, { clearFlag: fields.clear_flag === true }));
}

export async function markPaidAction(id: unknown, input: unknown): Promise<TeamResult> {
  const staff = await requireStaff("admin");
  if (!isUuid(id)) return { ok: false, message: "That payment isn't there any more." };
  const fields = record(input);
  return done(
    await markPaid(
      id,
      { amount: fields.amount, paidOn: fields.paid_on, reference: fields.reference, notify: fields.notify === true },
      staff.email,
    ),
  );
}

/** Cancels a payment, or puts it back to due ("Undo"). */
export async function setPaymentStatusAction(id: unknown, status: unknown): Promise<TeamResult> {
  const staff = await requireStaff("admin");
  if (!isUuid(id) || (status !== "due" && status !== "cancelled")) {
    return { ok: false, message: "That change isn't valid." };
  }
  return done(await setPaymentStatus(id, status, staff.email));
}

/**
 * Deletes a payment that isn't paid: one added by hand, or an emailed
 * invoice that turned out to be junk. Paid ones stay on the record; what was
 * deleted goes in the audit trail.
 */
export async function deletePaymentAction(id: unknown): Promise<TeamResult> {
  const staff = await requireStaff("admin");
  if (!isUuid(id)) return { ok: false, message: "That payment isn't there any more." };
  return done(await deletePayment(id, staff.email));
}
