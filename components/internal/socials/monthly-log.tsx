import { Plus } from "@/components/internal/icons";
import { monthLabel } from "@/lib/internal/clients/schema";
import {
  platformInfo,
  type AccountSeries,
  type Audience,
} from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/internal/ui";
import { Delta } from "@/components/internal/socials/delta";
import { MetricDialog } from "@/components/internal/socials/metric-dialog";
import { PlatformLogo } from "@/components/internal/socials/platform-logo";

/**
 * Every month logged for an account, one row a month and one column a
 * platform, with the total at the end: the chart's numbers in full. Click a
 * number to change it, or the + in an empty cell to log that month.
 * Server component; the dialogs are client islands.
 */

const counts = new Intl.NumberFormat("en-US");

export function MonthlyLog({
  account,
  audience,
  accounts,
  month,
}: {
  account: AccountSeries;
  audience: Audience;
  accounts: string[];
  /** This month, "YYYY-MM": the latest that can be logged. */
  month: string;
}) {
  const months = [
    ...new Set(
      account.platforms.flatMap((item) =>
        item.months.map((entry) => entry.month),
      ),
    ),
  ]
    .sort()
    .reverse()
    .slice(0, 12);
  const cells = new Map(
    account.platforms.map((item) => [
      item.platform,
      new Map(item.months.map((entry) => [entry.month, entry])),
    ]),
  );
  const totals = new Map(audience.byMonth.map((entry) => [entry.month, entry]));
  const showTotal = audience.platforms > 1;
  const lastPlatform = account.platforms.length - 1;

  return (
    <Card className="overflow-hidden">
      <CardTitle>
        Month by month
        <span className="font-normal text-[var(--i-faint)] max-sm:hidden">
          {" "}
          · click a number to change it
        </span>
      </CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)]">
              <th
                scope="col"
                className="py-2.5 pl-4 pr-2 text-left font-normal sm:pl-5"
              >
                Month
              </th>
              {account.platforms.map((item, index) => {
                const label = platformInfo(item.platform).label;
                return (
                  <th
                    key={item.platform}
                    scope="col"
                    title={label}
                    className={cn(
                      "px-2 py-2.5 text-right font-normal",
                      index === lastPlatform &&
                        (showTotal ? "max-sm:pr-4" : "pr-4 sm:pr-5"),
                    )}
                  >
                    <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <PlatformLogo platform={item.platform} size={18} />
                      <span className="max-sm:sr-only">{label}</span>
                    </span>
                  </th>
                );
              })}
              {showTotal ? (
                <th
                  scope="col"
                  className="py-2.5 pl-2 pr-5 text-right font-normal max-sm:hidden"
                >
                  Total
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {months.map((key) => {
              const total = totals.get(key);
              return (
                <tr
                  key={key}
                  className="border-b border-[var(--i-line)] last:border-0"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap py-2 pl-4 pr-2 text-left font-normal text-[var(--i-ink-2)] sm:pl-5"
                  >
                    {monthLabel(key, true)}
                  </th>
                  {account.platforms.map((item, index) => {
                    const label = platformInfo(item.platform).label;
                    const entry = cells.get(item.platform)?.get(key);
                    return (
                      <td
                        key={item.platform}
                        className={cn(
                          "px-1 py-1.5 text-right",
                          index === lastPlatform &&
                            (showTotal ? "max-sm:pr-3" : "pr-3 sm:pr-4"),
                        )}
                      >
                        {entry ? (
                          <MetricDialog
                            metric={entry}
                            accounts={accounts}
                            month={month}
                            trigger={
                              <button
                                type="button"
                                title={entry.notes || undefined}
                                aria-label={`Change ${label}, ${monthLabel(key)}`}
                                className="ml-auto flex flex-col items-end rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--i-hover)]"
                              >
                                <span className="font-medium tabular-nums text-[var(--i-ink)]">
                                  {counts.format(entry.followers)}
                                </span>
                                {entry.gained !== null ? (
                                  <Delta
                                    gained={entry.gained}
                                    percent={entry.percent}
                                    percentClassName="max-md:hidden"
                                    className="mt-0.5 text-[11px]"
                                  />
                                ) : null}
                              </button>
                            }
                          />
                        ) : (
                          <MetricDialog
                            accounts={accounts}
                            month={month}
                            defaults={{
                              account: account.account,
                              platform: item.platform,
                              month: key,
                            }}
                            trigger={
                              <button
                                type="button"
                                aria-label={`Log ${label} for ${monthLabel(key)}`}
                                className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-[var(--i-faint)] transition-colors hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                              >
                                <Plus size={12} />
                              </button>
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                  {showTotal ? (
                    <td className="py-1.5 pl-2 pr-5 text-right max-sm:hidden">
                      {total ? (
                        <span className="flex flex-col items-end py-1">
                          <span className="font-medium tabular-nums text-[var(--i-ink)]">
                            {counts.format(total.total)}
                          </span>
                          {total.gained !== null ? (
                            <Delta
                              gained={total.gained}
                              percent={total.percent}
                              percentClassName="max-md:hidden"
                              className="mt-0.5 text-[11px]"
                            />
                          ) : null}
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
