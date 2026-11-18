import {
  formatMoney,
  isCurrency,
  istNow,
  monthOf,
  type Reimbursement,
  type ReimbursementStatus,
} from "@/lib/internal/team/shared";

/**
 * The founders' breakdown of expense claims on the Payroll page: how much
 * was claimed in all and by whom, split by where each claim stands. Pure,
 * so it runs on the server or in the browser.
 */

/** Money by currency: claims aren't always in rupees, and are never converted. */
export type Totals = Record<string, number>;

export type ClaimTotals = {
  count: number;
  /** Everything asked for, rejected claims included. */
  claimed: Totals;
} & Record<ReimbursementStatus, Totals> & { counts: Record<ReimbursementStatus, number> };

export type PersonClaims = { email: string; totals: ClaimTotals; claims: Reimbursement[] };

function emptyTotals(): ClaimTotals {
  return {
    count: 0,
    claimed: {},
    submitted: {},
    approved: {},
    rejected: {},
    paid: {},
    counts: { submitted: 0, approved: 0, rejected: 0, paid: 0 },
  };
}

function add(totals: Totals, claim: Reimbursement) {
  if (claim.amount === null) return;
  const code = isCurrency(claim.currency) ? claim.currency : "INR";
  totals[code] = Math.round(((totals[code] ?? 0) + claim.amount) * 100) / 100;
}

function count(totals: ClaimTotals, claim: Reimbursement) {
  totals.count += 1;
  totals.counts[claim.status] += 1;
  add(totals.claimed, claim);
  add(totals[claim.status], claim);
}

/**
 * The month a claim belongs to on the breakdown: when the money was spent,
 * or when the claim came in if it has no date (emailed ones often don't).
 */
export function claimMonth(claim: Pick<Reimbursement, "spent_on" | "created_at">) {
  if (claim.spent_on) return monthOf(claim.spent_on);
  const added = new Date(claim.created_at);
  return Number.isNaN(added.getTime()) ? "" : monthOf(istNow(added).date);
}

/**
 * Totals for everyone and for each person, biggest claimer first (by
 * rupees, then by number of claims). `month` keeps one month's claims;
 * leave it out for all of them.
 */
export function summarizeClaims(claims: readonly Reimbursement[], month?: string | null) {
  const total = emptyTotals();
  const byEmail = new Map<string, PersonClaims>();
  for (const claim of claims) {
    if (month && claimMonth(claim) !== month) continue;
    count(total, claim);
    let person = byEmail.get(claim.email);
    if (!person) {
      person = { email: claim.email, totals: emptyTotals(), claims: [] };
      byEmail.set(claim.email, person);
    }
    count(person.totals, claim);
    person.claims.push(claim);
  }
  const people = [...byEmail.values()].sort(
    (a, b) =>
      (b.totals.claimed.INR ?? 0) - (a.totals.claimed.INR ?? 0) ||
      b.totals.count - a.totals.count ||
      a.email.localeCompare(b.email),
  );
  return { total, people };
}

/** "₹1,200 + $40", rupees first; "—" when there's nothing. */
export function formatTotals(totals: Totals) {
  const codes = Object.keys(totals)
    .filter((code) => totals[code])
    .sort((a, b) => (a === "INR" ? -1 : b === "INR" ? 1 : a.localeCompare(b)));
  return codes.length ? codes.map((code) => formatMoney(totals[code], code)).join(" + ") : "—";
}
