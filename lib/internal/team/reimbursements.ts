import { deleteRows, insertRow, selectRows, updateRows } from "@/lib/supabase-server";
import { audit } from "@/lib/internal/team/audit";
import { deleteTeamFiles, saveTeamFile } from "@/lib/internal/team/files";
import {
  TEAM_MIGRATION_HINT,
  isCurrency,
  isDateKey,
  isMissingTable,
  isMonthKey,
  isUuid,
  monthStart,
  parseAmount,
  type Reimbursement,
  type ReimbursementStatus,
  type TeamResult,
} from "@/lib/internal/team/shared";

/**
 * Expense claims (team_reimbursements). Employees add them on My day or by
 * email (lib/internal/team/inbound.ts); an admin approves them onto a
 * payslip month on the Payroll page. No session checks here. Server only.
 */

const TABLE = "team_reimbursements";

const STATUSES: ReimbursementStatus[] = ["submitted", "approved", "rejected", "paid"];

function toReimbursement(row: Record<string, unknown>): Reimbursement | null {
  if (typeof row.id !== "string" || typeof row.email !== "string") return null;
  const amount = row.amount === null || row.amount === undefined ? null : Number(row.amount);
  return {
    id: row.id,
    created_at: String(row.created_at ?? ""),
    email: row.email,
    spent_on: typeof row.spent_on === "string" ? row.spent_on : null,
    description: typeof row.description === "string" ? row.description : "",
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: typeof row.currency === "string" ? row.currency : "INR",
    receipt_path: typeof row.receipt_path === "string" && row.receipt_path ? row.receipt_path : null,
    receipt_name: typeof row.receipt_name === "string" ? row.receipt_name : null,
    source: row.source === "email" ? "email" : "dashboard",
    status: STATUSES.includes(row.status as ReimbursementStatus) ? (row.status as ReimbursementStatus) : "submitted",
    month: typeof row.month === "string" ? row.month.slice(0, 7) : null,
    decided_by: typeof row.decided_by === "string" ? row.decided_by : null,
    decided_at: typeof row.decided_at === "string" ? row.decided_at : null,
    note: typeof row.note === "string" ? row.note : "",
  };
}

export type ReimbursementsResult =
  | { ok: true; items: Reimbursement[] }
  | { ok: false; message: string; missing: boolean };

export async function listReimbursements(
  filter: { email?: string; status?: ReimbursementStatus[]; month?: string } = {},
): Promise<ReimbursementsResult> {
  const query = new URLSearchParams({ select: "*", order: "created_at.desc", limit: "500" });
  if (filter.email) query.set("email", `eq.${filter.email}`);
  if (filter.status?.length) query.set("status", `in.(${filter.status.join(",")})`);
  if (filter.month && isMonthKey(filter.month)) query.set("month", `eq.${monthStart(filter.month)}`);
  const result = await selectRows(TABLE, query);
  if (!result.ok) {
    const missing = isMissingTable(result.message);
    if (!missing) console.error(`[team] reading ${TABLE} failed: ${result.message}`);
    return { ok: false, missing, message: missing ? TEAM_MIGRATION_HINT : "Couldn't load reimbursements." };
  }
  return { ok: true, items: result.rows.map(toReimbursement).filter((item): item is Reimbursement => item !== null) };
}

export async function getReimbursement(id: string): Promise<Reimbursement | null> {
  if (!isUuid(id)) return null;
  const result = await selectRows(TABLE, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  return result.ok && result.rows[0] ? toReimbursement(result.rows[0]) : null;
}

export type NewReimbursement = {
  email: string;
  description: unknown;
  amount: unknown;
  currency?: unknown;
  spent_on?: unknown;
  /** The receipt: a PDF or an image. */
  receipt?: { body: Uint8Array | ArrayBuffer; name: string } | null;
  source: "dashboard" | "email";
  /** Resend's id for the email it came in. */
  inbound_id?: string;
  note?: string;
};

/** Files a claim, with its receipt if there is one. */
export async function addReimbursement(input: NewReimbursement): Promise<TeamResult & { id?: string; duplicate?: boolean }> {
  const description = typeof input.description === "string" ? input.description.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  if (input.source === "dashboard" && description.length < 3) return { ok: false, message: "Say what the expense was for." };
  const amount = parseAmount(input.amount);
  if (amount !== null && Number.isNaN(amount)) return { ok: false, message: "The amount should be a number, like 1250 or 1,250.50." };
  if (input.source === "dashboard" && !amount) return { ok: false, message: "Add the amount." };
  const spentOn = isDateKey(input.spent_on) ? input.spent_on : null;
  const id = crypto.randomUUID();

  let receipt: { path: string; name: string } | null = null;
  if (input.receipt) {
    const saved = await saveTeamFile("receipts", id, input.receipt.body, input.receipt.name);
    if (!saved.ok) return saved;
    receipt = { path: saved.path, name: saved.name };
  }

  const result = await insertRow(TABLE, {
    id,
    email: input.email,
    description,
    amount,
    currency: isCurrency(input.currency) ? input.currency : "INR",
    spent_on: spentOn,
    receipt_path: receipt?.path ?? null,
    receipt_name: receipt?.name ?? null,
    source: input.source,
    inbound_id: input.inbound_id ?? null,
    note: input.note ?? "",
  });
  if (!result.ok) {
    await deleteTeamFiles([receipt?.path]);
    if (result.duplicate) return { ok: true, duplicate: true };
    console.error(`[team] adding a reimbursement failed: ${result.message}`);
    if (isMissingTable(result.message)) return { ok: false, message: TEAM_MIGRATION_HINT };
    if (result.message.includes("23503")) return { ok: false, message: "You're not on the team list yet. Ask an admin to add you." };
    return { ok: false, message: "Couldn't save. Try again in a minute." };
  }
  return { ok: true, id };
}

/**
 * An admin's call on a claim that isn't paid yet: approve it onto a payslip
 * month (with the amount, which they can correct) or reject it. Payslips
 * mark claims paid themselves (lib/internal/team/payroll.ts).
 */
export async function decideReimbursement(
  id: string,
  change: { status: "approved"; month: string; amount?: unknown } | { status: "rejected" },
  by: string,
): Promise<TeamResult> {
  const patch: Record<string, unknown> = {
    status: change.status,
    decided_by: by,
    decided_at: new Date().toISOString(),
    month: null,
  };
  if (change.status === "approved") {
    if (!isMonthKey(change.month)) return { ok: false, message: "Pick the payslip month it's paid with." };
    patch.month = monthStart(change.month);
    if (change.amount !== undefined) {
      const amount = parseAmount(change.amount);
      if (amount === null || Number.isNaN(amount) || amount <= 0) return { ok: false, message: "Add a valid amount." };
      patch.amount = amount;
    }
  }
  // Never a paid one: a payslip may be marking it paid at this very moment.
  const result = await updateRows(TABLE, new URLSearchParams({ id: `eq.${id}`, status: "neq.paid" }), patch);
  if (!result.ok) {
    console.error(`[team] updating reimbursement ${id} failed: ${result.message}`);
    return { ok: false, message: isMissingTable(result.message) ? TEAM_MIGRATION_HINT : "Couldn't save. Try again in a minute." };
  }
  if (!result.count) return { ok: false, message: "That claim isn't there any more, or it's already been paid." };
  await audit({
    actor: by,
    area: "claims",
    action: change.status,
    subject: id,
    detail: change.status === "approved" ? { month: change.month, amount: patch.amount ?? null } : {},
  });
  return { ok: true };
}

/** Withdraws someone's own claim while it's still waiting. */
export async function withdrawReimbursement(id: string, email: string): Promise<TeamResult> {
  const item = await getReimbursement(id);
  if (!item || item.email !== email) return { ok: false, message: "That claim isn't there any more." };
  if (item.status !== "submitted") return { ok: false, message: "It's already been decided, so it can't be withdrawn." };
  const result = await deleteRows(TABLE, new URLSearchParams({ id: `eq.${id}`, status: "eq.submitted" }));
  if (!result.ok) return { ok: false, message: "Couldn't withdraw it. Try again in a minute." };
  // Nothing deleted: an admin decided it in the meantime, so its receipt stays too.
  if (!result.count) return { ok: false, message: "It's already been decided, so it can't be withdrawn." };
  await deleteTeamFiles([item.receipt_path]);
  return { ok: true };
}
