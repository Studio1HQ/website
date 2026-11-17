import type { Metadata } from "next";
import {
  ChartLineUp,
  PencilSimple,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { monthLabel, thisMonth } from "@/lib/internal/clients/schema";
import { loadMetrics, requireSocials } from "@/lib/internal/socials/data";
import {
  STUDIO_ACCOUNT,
  growthSeries,
  platformInfo,
  signed,
  type SeriesMonth,
} from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";
import {
  Card,
  CardTitle,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { Table, rowClass } from "@/components/internal/community/ui";
import { MetricDialog } from "@/components/internal/socials/metric-dialog";

export const metadata: Metadata = { title: "Social growth" };

const counts = new Intl.NumberFormat("en-US");

/** "+110 (10%)", green up and amber down; "—" for the first month. */
function Change({ month }: { month: SeriesMonth }) {
  if (month.gained === null)
    return <span className="text-[var(--i-faint)]">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums",
        month.gained > 0
          ? "text-emerald-700 dark:text-emerald-300"
          : month.gained < 0
            ? "text-amber-700 dark:text-amber-300"
            : "text-[var(--i-muted)]",
      )}
    >
      {signed(month.gained)}
      {month.percent === null ? "" : ` (${month.percent}%)`}
    </span>
  );
}

/**
 * How Studio1's audiences grow, month by month: followers on each platform
 * with the change since the month before, plus impressions and posts when
 * they're logged. Typed in by hand at the end of each month. Admins only.
 */
export default async function SocialsPage() {
  await requireSocials();
  const month = thisMonth();
  const metrics = await loadMetrics();
  const rows = metrics.ok ? metrics.rows : [];
  const series = growthSeries(rows);
  const accounts = [
    ...new Set([STUDIO_ACCOUNT, ...series.map((item) => item.account)]),
  ];

  return (
    <>
      <PageHeader
        title="Social growth"
        description="Followers, impressions and posts on each platform, month by month. Add the numbers at the end of every month."
        actions={
          <MetricDialog
            accounts={accounts}
            month={month}
            trigger={
              <button type="button" className={buttonClass("primary")}>
                <Plus size={13} /> Log a month
              </button>
            }
          />
        }
      />
      {!metrics.ok ? (
        <div className="mb-5">
          <Notice tone={metrics.missing ? "warning" : "error"}>
            {metrics.message}
          </Notice>
        </div>
      ) : null}

      {!series.length ? (
        <Card>
          <EmptyState icon={<ChartLineUp size={20} />} title="No numbers yet">
            Log last month&apos;s followers for LinkedIn, X and YouTube to
            start. Each month you add after that shows how much it grew.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-8">
          {series.map((account) => (
            <section key={account.account} aria-label={account.account}>
              <h2 className="mb-3 text-[15px] font-medium">
                {account.account}
              </h2>
              <Card className="mb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 p-5 sm:grid-cols-3 lg:grid-cols-5">
                  {account.platforms.map((item) => {
                    const info = platformInfo(item.platform);
                    return (
                      <div key={item.platform} className="min-w-0">
                        <p className="truncate text-[12px] text-[var(--i-muted)]">
                          {info.label}
                        </p>
                        <p className="mt-1 text-[20px] font-medium leading-none tabular-nums tracking-[-0.01em]">
                          {counts.format(item.latest.followers)}
                        </p>
                        <p className="mt-1 truncate text-[11.5px]">
                          <Change month={item.latest} />{" "}
                          <span className="text-[var(--i-faint)]">
                            in {monthLabel(item.latest.month, true)}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <div className="grid items-start gap-4 lg:grid-cols-2">
                {account.platforms.map((item) => {
                  const info = platformInfo(item.platform);
                  return (
                    <Card key={item.platform} className="min-w-0">
                      <CardTitle
                        action={
                          <MetricDialog
                            accounts={accounts}
                            month={month}
                            defaults={{
                              account: account.account,
                              platform: item.platform,
                            }}
                            trigger={
                              <button
                                type="button"
                                className={buttonClass("secondary", "sm")}
                              >
                                <Plus size={13} /> Add
                              </button>
                            }
                          />
                        }
                      >
                        {info.label}{" "}
                        <span className="font-normal text-[var(--i-faint)]">
                          {item.months.length > 1
                            ? `${signed(item.sinceStart)} since ${monthLabel(item.first.month, true)}`
                            : ""}
                        </span>
                      </CardTitle>
                      <Table
                        className="[&_table]:min-w-[440px]"
                        head={
                          <>
                            <th>Month</th>
                            <th className="capitalize">{info.unit}</th>
                            <th>Change</th>
                            <th>Impressions</th>
                            <th>Posts</th>
                            <th>
                              <span className="sr-only">Change</span>
                            </th>
                          </>
                        }
                      >
                        {item.months.slice(0, 12).map((entry) => (
                          <tr
                            key={entry.id}
                            className={rowClass}
                            title={entry.notes || undefined}
                          >
                            <td className="whitespace-nowrap">
                              {monthLabel(entry.month, true)}
                              {entry.notes ? (
                                <span className="block max-w-[14rem] truncate text-[12px] text-[var(--i-faint)]">
                                  {entry.notes}
                                </span>
                              ) : null}
                            </td>
                            <td className="font-medium tabular-nums">
                              {counts.format(entry.followers)}
                            </td>
                            <td>
                              <Change month={entry} />
                            </td>
                            <td className="tabular-nums">
                              {entry.impressions === null ? (
                                <span className="text-[var(--i-faint)]">—</span>
                              ) : (
                                counts.format(entry.impressions)
                              )}
                            </td>
                            <td className="tabular-nums">
                              {entry.posts === null ? (
                                <span className="text-[var(--i-faint)]">—</span>
                              ) : (
                                entry.posts
                              )}
                            </td>
                            <td className="text-right">
                              <MetricDialog
                                metric={entry}
                                accounts={accounts}
                                month={month}
                                trigger={
                                  <button
                                    type="button"
                                    aria-label={`Change ${monthLabel(entry.month)}`}
                                    className={buttonClass("ghost", "sm")}
                                  >
                                    <PencilSimple size={13} />
                                  </button>
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </Table>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
