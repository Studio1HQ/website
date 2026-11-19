import { costTypeFor, type Expense } from "@/lib/internal/community/schema";

/**
 * An event's budget, from its cost lines: what was expected while
 * planning against what it finally cost, split into fixed costs (the same
 * whatever the turnout) and variable ones (they grow with headcount).
 * Pure, and safe for client components.
 *
 * Per line:
 *   expected  its estimate (expected_amount)
 *   final     its final cost (amount), once the bill is known
 *   pending   no final cost yet: its estimate stands in for it
 * A cancelled line stays in the expected budget (it was part of the plan)
 * and costs nothing, unless a final amount says otherwise (a cancellation
 * fee).
 */

export type CostType = "fixed" | "variable";

export function costTypeOf(line: Pick<Expense, "cost_type">): CostType {
  return line.cost_type === "variable" ? "variable" : "fixed";
}

/**
 * A row saved before 20261118170000_expense_budget.sql ran, read the way
 * that migration converts it: a planned cost's amount was its estimate,
 * and an owed or paid one's was final. Rows that have the columns pass
 * through unchanged.
 */
export function withBudgetFields(row: Expense): Expense {
  // Typed as complete, but an old row comes back without the new columns.
  const saved: Partial<Expense> = row;
  if (saved.expected_amount !== undefined && saved.cost_type !== undefined)
    return row;
  const amount = row.amount ?? null;
  return {
    ...row,
    cost_type: costTypeFor(row.category),
    expected_amount: amount,
    amount: row.status === "planned" ? null : amount,
  };
}

/** A line's best-known cost: the final one, else its estimate. */
export function bestAmount(
  line: Pick<Expense, "amount" | "expected_amount" | "status">,
): number | null {
  if (line.amount !== null) return line.amount;
  if (line.status === "cancelled") return null;
  return line.expected_amount;
}

export type BudgetSums = {
  /** The estimates. */
  expected: number;
  /** Final costs known so far. */
  final: number;
  /** Estimates still standing in for a final cost. */
  pending: number;
  /** final + pending: where the budget is heading. */
  forecast: number;
  /** Lines still waiting for their final cost. */
  waiting: number;
};

export type BudgetGroup = BudgetSums & {
  type: CostType;
  lines: Expense[];
};

export type Breakdown = {
  currency: string;
  fixed: BudgetGroup;
  variable: BudgetGroup;
  total: BudgetSums;
  /** forecast − expected: above 0 is over the plan. */
  difference: number;
  /** Lines in another currency, left out of the sums above. */
  otherCurrencies: Expense[];
};

const zero = (): BudgetSums => ({
  expected: 0,
  final: 0,
  pending: 0,
  forecast: 0,
  waiting: 0,
});

/** One line's share of the sums. */
export function lineSums(line: Expense): BudgetSums {
  const expected = line.expected_amount ?? 0;
  if (line.amount !== null) {
    return {
      expected,
      final: line.amount,
      pending: 0,
      forecast: line.amount,
      waiting: 0,
    };
  }
  if (line.status === "cancelled") return { ...zero(), expected };
  return {
    expected,
    final: 0,
    pending: expected,
    forecast: expected,
    waiting: 1,
  };
}

function add(into: BudgetSums, more: BudgetSums) {
  into.expected += more.expected;
  into.final += more.final;
  into.pending += more.pending;
  into.forecast += more.forecast;
  into.waiting += more.waiting;
}

/** Rounds to paise, so adding 0.1s doesn't show as ₹0.30000000000000004. */
function rounded<T extends BudgetSums>(sums: T): T {
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    ...sums,
    expected: round(sums.expected),
    final: round(sums.final),
    pending: round(sums.pending),
    forecast: round(sums.forecast),
  };
}

/** Biggest first; within the same size, by name. */
function byAmount(a: Expense, b: Expense) {
  const size = (line: Expense) =>
    Math.max(line.amount ?? 0, line.expected_amount ?? 0);
  return size(b) - size(a) || a.description.localeCompare(b.description);
}

export function budgetBreakdown(
  expenses: readonly Expense[],
  currency = "INR",
): Breakdown {
  const groups: Record<CostType, BudgetGroup> = {
    fixed: { ...zero(), type: "fixed", lines: [] },
    variable: { ...zero(), type: "variable", lines: [] },
  };
  const total = zero();
  const otherCurrencies: Expense[] = [];
  for (const line of expenses) {
    if (line.currency !== currency) {
      otherCurrencies.push(line);
      continue;
    }
    const group = groups[costTypeOf(line)];
    const sums = lineSums(line);
    group.lines.push(line);
    add(group, sums);
    add(total, sums);
  }
  for (const group of Object.values(groups)) group.lines.sort(byAmount);
  const sums = rounded(total);
  return {
    currency,
    fixed: rounded(groups.fixed),
    variable: rounded(groups.variable),
    total: sums,
    difference: Math.round((sums.forecast - sums.expected) * 100) / 100,
    otherCurrencies,
  };
}

/** amount ÷ people, or null when there's no one to divide by. */
export function perPerson(amount: number, people: number | null | undefined) {
  if (!people || people <= 0 || amount <= 0) return null;
  return Math.round(amount / people);
}
