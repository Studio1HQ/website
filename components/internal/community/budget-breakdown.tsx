"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  budgetBreakdown,
  perPerson,
  type BudgetGroup,
  type BudgetSums,
} from "@/lib/internal/community/budget";
import {
  EXPENSE_CATEGORIES,
  formatMoney,
  formatTotals,
  labelOf,
  sumMoney,
  type Expense,
  type RefOptions,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { AddButton } from "@/components/internal/community/lists";
import { Meter, Muted, Table } from "@/components/internal/community/ui";

/**
 * An event's budget: expected against final, fixed costs and variable
 * ones, with every cost line. Managers add and edit costs here; the sums
 * come from lib/internal/community/budget.ts.
 */

type People = {
  /** Headcount the plan assumed: capacity, else sign-ups. */
  expected: number | null;
  expectedLabel: string;
  /** Who came; 0 before the event. */
  attended: number;
};

const GROUPS = [
  {
    type: "fixed",
    title: "Fixed costs",
    note: "The same whatever the turnout",
  },
  {
    type: "variable",
    title: "Variable costs",
    note: "Grow with headcount",
  },
] as const;

const over = "text-rose-600 dark:text-rose-300";
const under = "text-emerald-600 dark:text-emerald-400";

/** "+₹5,000" over the plan, "−₹2,000" under it. */
function Difference({
  value,
  currency,
  quiet = false,
}: {
  value: number;
  currency: string;
  quiet?: boolean;
}) {
  if (Math.abs(value) < 0.005) return <Muted>{quiet ? "" : "On plan"}</Muted>;
  return (
    <span className={cn("tabular-nums", value > 0 ? over : under)}>
      {value > 0 ? "+" : "−"}
      {formatMoney(Math.abs(value), currency)}
    </span>
  );
}

function money(amount: number, currency: string) {
  return formatMoney(amount, currency);
}

/** A final sum, with what's still an estimate under it. */
function FinalSum({ sums, currency }: { sums: BudgetSums; currency: string }) {
  if (!sums.waiting) return <>{money(sums.final, currency)}</>;
  return (
    <>
      {money(sums.forecast, currency)}
      <span className="block text-[11.5px] font-normal text-[var(--i-faint)]">
        {money(sums.pending, currency)} still estimated
      </span>
    </>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-[var(--i-muted)]">{label}</p>
      <p className="mt-1 text-[20px] font-medium leading-tight tabular-nums tracking-[-0.02em]">
        {value}
      </p>
      {note ? (
        <div className="mt-1 text-[12px] leading-snug text-[var(--i-faint)]">
          {note}
        </div>
      ) : null}
    </div>
  );
}

export function BudgetBreakdown({
  expenses,
  currency,
  limit,
  people,
  eventId,
  canEdit,
  refs,
}: {
  expenses: Expense[];
  currency: string;
  /** The event's budget limit, if it has one. */
  limit: number | null;
  people: People;
  eventId: string;
  canEdit: boolean;
  refs?: RefOptions;
}) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const breakdown = budgetBreakdown(expenses, currency);
  const { total, fixed, variable } = breakdown;
  const add = canEdit ? (
    <RecordDialog
      entity="expense"
      refs={refs}
      defaults={{ event_id: eventId, currency, status: "planned" }}
      hidden={["event_id"]}
      title="New cost"
      trigger={<AddButton label="Cost" />}
    />
  ) : null;

  const variableNote = (group: BudgetGroup) => {
    const expectedEach = perPerson(group.expected, people.expected);
    const finalEach = perPerson(group.forecast, people.attended);
    const parts = [
      expectedEach
        ? `${money(expectedEach, currency)} a person expected (${people.expected!.toLocaleString("en-IN")} ${people.expectedLabel})`
        : "",
      finalEach
        ? `${money(finalEach, currency)} a person final (${people.attended.toLocaleString("en-IN")} came)`
        : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };

  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">Budget</h2>
        {add}
      </div>

      {expenses.length ? (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[var(--i-line)] px-5 py-4 lg:grid-cols-4">
            <Figure
              label="Expected"
              value={money(total.expected, currency)}
              note={`Fixed ${money(fixed.expected, currency)} · variable ${money(variable.expected, currency)}`}
            />
            <Figure
              label="Final"
              value={money(total.forecast, currency)}
              note={
                <>
                  Fixed {money(fixed.forecast, currency)} · variable{" "}
                  {money(variable.forecast, currency)}
                  {total.waiting ? (
                    <span className="block">
                      {total.waiting}{" "}
                      {total.waiting === 1 ? "cost" : "costs"} still at the
                      estimate
                    </span>
                  ) : null}
                </>
              }
            />
            <Figure
              label="Difference"
              value={
                <Difference value={breakdown.difference} currency={currency} />
              }
              note={
                Math.abs(breakdown.difference) < 0.005
                  ? "Final matches the plan"
                  : breakdown.difference > 0
                    ? "Over the expected budget"
                    : "Under the expected budget"
              }
            />
            <Figure
              label="Limit"
              value={limit !== null ? money(limit, currency) : <Muted>—</Muted>}
              note={
                limit ? (
                  <span className="flex items-center gap-2">
                    <span className="w-16 shrink-0">
                      <Meter value={total.forecast} max={limit} />
                    </span>
                    <span
                      className={cn(total.forecast > limit && over)}
                    >
                      {Math.round((total.forecast / limit) * 100)}% used
                    </span>
                  </span>
                ) : (
                  "No limit set"
                )
              }
            />
          </div>

          <Table
            head={
              <>
                <th>Cost</th>
                <th>Category</th>
                <th className="text-right">Expected</th>
                <th className="text-right">Final</th>
                <th className="text-right">Difference</th>
                <th>Status</th>
              </>
            }
          >
            {GROUPS.map(({ type, title, note }) => {
              const group = breakdown[type];
              const perHead = type === "variable" ? variableNote(group) : null;
              return (
                <Fragment key={type}>
                  <tr className="bg-[var(--i-hover)]">
                    <td colSpan={6}>
                      <span className="text-[12.5px] font-medium">{title}</span>
                      <span className="ml-2 text-[12px] text-[var(--i-muted)]">
                        {perHead ?? note}
                      </span>
                    </td>
                  </tr>
                  {group.lines.length ? (
                    group.lines.map((line) => (
                      <tr
                        key={line.id}
                        className={cn(
                          "align-middle transition-colors hover:bg-[var(--i-hover)]",
                          line.status === "cancelled" && "text-[var(--i-muted)]",
                        )}
                      >
                        <td className="max-w-[18rem]">
                          <button
                            type="button"
                            onClick={() => setEditing(line)}
                            className="block w-full truncate text-left font-medium hover:text-[var(--i-accent-text)]"
                            title={canEdit ? "Edit this cost" : "See this cost"}
                          >
                            <span
                              className={cn(
                                line.status === "cancelled" && "line-through",
                              )}
                            >
                              {line.description}
                            </span>
                          </button>
                          {line.vendor ? (
                            <span className="block truncate text-[12px] text-[var(--i-muted)]">
                              {line.vendor}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap text-[var(--i-muted)]">
                          {labelOf(EXPENSE_CATEGORIES, line.category)}
                        </td>
                        <td className="whitespace-nowrap text-right tabular-nums">
                          {line.expected_amount !== null ? (
                            money(line.expected_amount, currency)
                          ) : (
                            <Muted>Unplanned</Muted>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right tabular-nums">
                          {line.amount !== null ? (
                            money(line.amount, currency)
                          ) : line.status === "cancelled" ? (
                            <Muted>{money(0, currency)}</Muted>
                          ) : (
                            <Muted>Not in yet</Muted>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {line.amount !== null ||
                          line.status === "cancelled" ? (
                            <Difference
                              value={
                                (line.amount ?? 0) - (line.expected_amount ?? 0)
                              }
                              currency={currency}
                              quiet
                            />
                          ) : null}
                        </td>
                        <td>
                          <QuickSelect
                            entity="expense"
                            id={line.id}
                            value={line.status}
                            canEdit={canEdit}
                            label={`Status of ${line.description}`}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-[12.5px] text-[var(--i-muted)]">
                        None yet.
                      </td>
                    </tr>
                  )}
                  {group.lines.length ? (
                    <SumRow
                      label={`${title}, total`}
                      sums={group}
                      currency={currency}
                    />
                  ) : null}
                </Fragment>
              );
            })}
            <SumRow label="Total" sums={total} currency={currency} strong />
          </Table>

          {breakdown.otherCurrencies.length ? (
            <p className="border-t border-[var(--i-line)] px-5 py-3 text-[12px] text-[var(--i-muted)]">
              In another currency, so not in the sums above:{" "}
              {breakdown.otherCurrencies
                .map((line) => line.description)
                .join(", ")}{" "}
              ({formatTotals(sumMoney(breakdown.otherCurrencies.map((line) => ({ amount: line.amount ?? line.expected_amount, currency: line.currency }))))}).
            </p>
          ) : null}
        </>
      ) : (
        <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
          No costs yet.{" "}
          {canEdit
            ? "Add each cost with what you expect it to be. Fill in the final amount once the bill is in."
            : ""}
        </p>
      )}

      <RecordDialog
        entity="expense"
        refs={refs}
        record={editing ?? undefined}
        hidden={[]}
        readOnly={!canEdit}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </section>
  );
}

function SumRow({
  label,
  sums,
  currency,
  strong = false,
}: {
  label: string;
  sums: BudgetSums;
  currency: string;
  strong?: boolean;
}) {
  return (
    <tr className={cn(strong ? "font-medium" : "text-[var(--i-ink-2)]")}>
      <td colSpan={2} className={cn(!strong && "text-[12.5px]")}>
        {label}
      </td>
      <td className="whitespace-nowrap text-right align-top tabular-nums">
        {money(sums.expected, currency)}
      </td>
      <td className="whitespace-nowrap text-right align-top tabular-nums">
        <FinalSum sums={sums} currency={currency} />
      </td>
      <td className="whitespace-nowrap text-right align-top">
        <Difference
          value={sums.forecast - sums.expected}
          currency={currency}
          quiet={!strong}
        />
      </td>
      <td />
    </tr>
  );
}
