import { describe, expect, it } from "vitest";
import {
  bestAmount,
  budgetBreakdown,
  lineSums,
  perPerson,
  withBudgetFields,
} from "@/lib/internal/community/budget";
import { cleanRecord } from "@/lib/internal/community/clean";
import {
  ENTITIES,
  costTypeFor,
  type Expense,
} from "@/lib/internal/community/schema";
import { moneyOf } from "@/lib/internal/community/stats";

let next = 0;
function cost(over: Partial<Expense> = {}): Expense {
  next += 1;
  return {
    id: `cost-${next}`,
    created_at: "2026-11-18T10:00:00Z",
    updated_at: "2026-11-18T10:00:00Z",
    created_by: null,
    updated_by: null,
    event_id: "event-1",
    category: "venue",
    cost_type: "fixed",
    description: `Cost ${next}`,
    vendor: "",
    expected_amount: null,
    amount: null,
    currency: "INR",
    status: "planned",
    due_on: null,
    paid_on: null,
    receipt_url: null,
    notes: "",
    ...over,
  };
}

describe("a cost line", () => {
  it("stands in its estimate until the final cost is known", () => {
    expect(lineSums(cost({ expected_amount: 5000 }))).toEqual({
      expected: 5000,
      final: 0,
      pending: 5000,
      forecast: 5000,
      waiting: 1,
    });
    expect(
      lineSums(cost({ expected_amount: 5000, amount: 6200, status: "paid" })),
    ).toEqual({
      expected: 5000,
      final: 6200,
      pending: 0,
      forecast: 6200,
      waiting: 0,
    });
  });

  it("counts an unplanned cost only in the final budget", () => {
    expect(lineSums(cost({ amount: 1500, status: "to_pay" }))).toMatchObject({
      expected: 0,
      final: 1500,
      forecast: 1500,
    });
  });

  it("keeps a cancelled cost in the plan but costs nothing, unless there's a fee", () => {
    expect(
      lineSums(cost({ expected_amount: 8000, status: "cancelled" })),
    ).toEqual({ expected: 8000, final: 0, pending: 0, forecast: 0, waiting: 0 });
    expect(
      lineSums(
        cost({ expected_amount: 8000, amount: 1000, status: "cancelled" }),
      ),
    ).toMatchObject({ expected: 8000, final: 1000, forecast: 1000 });
  });

  it("has a best-known amount: final, else the estimate", () => {
    expect(bestAmount(cost({ expected_amount: 100 }))).toBe(100);
    expect(bestAmount(cost({ expected_amount: 100, amount: 90 }))).toBe(90);
    expect(
      bestAmount(cost({ expected_amount: 100, status: "cancelled" })),
    ).toBeNull();
  });
});

describe("an event's budget", () => {
  const lines = [
    cost({ description: "Hall", expected_amount: 50000, amount: 50000, status: "paid" }),
    cost({ description: "Prizes", category: "prizes", expected_amount: 60000 }),
    cost({
      description: "Food, 3 meals",
      category: "food",
      cost_type: "variable",
      expected_amount: 60000,
      amount: 72000,
      status: "to_pay",
    }),
    cost({
      description: "T-shirts",
      category: "swag",
      cost_type: "variable",
      expected_amount: 20000,
      status: "cancelled",
    }),
    cost({ description: "Speaker flight", category: "travel", cost_type: "variable", amount: 300, currency: "USD" }),
  ];

  it("splits expected and final into fixed and variable costs", () => {
    const budget = budgetBreakdown(lines, "INR");
    expect(budget.fixed).toMatchObject({
      expected: 110000,
      final: 50000,
      pending: 60000,
      forecast: 110000,
      waiting: 1,
    });
    expect(budget.variable).toMatchObject({
      expected: 80000,
      final: 72000,
      pending: 0,
      forecast: 72000,
      waiting: 0,
    });
    expect(budget.total).toEqual({
      expected: 190000,
      final: 122000,
      pending: 60000,
      forecast: 182000,
      waiting: 1,
    });
    // ₹8,000 under: food ran over by 12k, the cancelled swag saved 20k.
    expect(budget.difference).toBe(-8000);
  });

  it("leaves costs in other currencies out of the sums, and says which", () => {
    const budget = budgetBreakdown(lines, "INR");
    expect(budget.otherCurrencies.map((line) => line.description)).toEqual([
      "Speaker flight",
    ]);
    expect(budget.variable.lines.map((line) => line.description)).toEqual([
      "Food, 3 meals",
      "T-shirts",
    ]);
  });

  it("lists the biggest costs first", () => {
    const budget = budgetBreakdown(lines, "INR");
    expect(budget.fixed.lines.map((line) => line.description)).toEqual([
      "Prizes",
      "Hall",
    ]);
  });

  it("treats an unknown cost type as fixed", () => {
    const budget = budgetBreakdown(
      [cost({ cost_type: "other", expected_amount: 10 })],
      "INR",
    );
    expect(budget.fixed.lines).toHaveLength(1);
  });

  it("rounds sums to paise", () => {
    const budget = budgetBreakdown(
      [0.1, 0.2].map((amount) => cost({ expected_amount: amount })),
    );
    expect(budget.total.expected).toBe(0.3);
  });

  it("is empty without costs", () => {
    expect(budgetBreakdown([], "INR").total).toEqual({
      expected: 0,
      final: 0,
      pending: 0,
      forecast: 0,
      waiting: 0,
    });
  });

  it("works out a variable cost per person", () => {
    expect(perPerson(60000, 200)).toBe(300);
    expect(perPerson(60000, 0)).toBeNull();
    expect(perPerson(0, 200)).toBeNull();
    expect(perPerson(1000, null)).toBeNull();
  });
});

describe("costs saved before the budget columns", () => {
  it("reads them the way the migration converts them", () => {
    const old = (over: Partial<Expense>) => {
      const row = cost(over) as Partial<Expense>;
      delete row.expected_amount;
      delete row.cost_type;
      return row as Expense;
    };
    expect(
      withBudgetFields(old({ category: "food", amount: 4000, status: "planned" })),
    ).toMatchObject({ cost_type: "variable", expected_amount: 4000, amount: null });
    expect(
      withBudgetFields(old({ amount: 9000, status: "paid" })),
    ).toMatchObject({ cost_type: "fixed", expected_amount: 9000, amount: 9000 });
  });

  it("leaves converted rows alone", () => {
    const row = cost({ expected_amount: 100, amount: null });
    expect(withBudgetFields(row)).toBe(row);
  });

  it("still adds a planned estimate to the planned money", () => {
    const money = moneyOf(
      [
        cost({ expected_amount: 4000 }),
        cost({ expected_amount: 1000, amount: 1200, status: "to_pay" }),
      ],
      [],
    );
    expect(money.planned).toEqual({ INR: 4000 });
    expect(money.spent).toEqual({ INR: 1200 });
  });
});

describe("the cost form", () => {
  it("starts food, swag and travel as variable", () => {
    expect(costTypeFor("food")).toBe("variable");
    expect(costTypeFor("travel")).toBe("variable");
    expect(costTypeFor("venue")).toBe("fixed");
  });

  it("takes expected and final amounts and a cost type", () => {
    const saved = cleanRecord(
      ENTITIES.expense,
      {
        description: "Pizza for 80",
        cost_type: "variable",
        expected_amount: "₹24,000",
        amount: "26.5k",
      },
      "create",
    );
    expect(saved).toEqual({
      ok: true,
      row: {
        description: "Pizza for 80",
        cost_type: "variable",
        expected_amount: 24000,
        amount: 26500,
      },
    });
  });

  it("refuses a cost type it doesn't know", () => {
    expect(
      cleanRecord(
        ENTITIES.expense,
        { description: "Stage", cost_type: "sometimes" },
        "create",
      ),
    ).toEqual({ ok: false, message: "Pick a valid cost type." });
  });
});
