import type { Metadata } from "next";
import { ChartLineUp, Plus } from "@/components/internal/icons";
import { thisMonth } from "@/lib/internal/clients/schema";
import { loadMetrics, requireSocials } from "@/lib/internal/socials/data";
import {
  STUDIO_ACCOUNT,
  audienceOf,
  growthSeries,
  overviewOf,
} from "@/lib/internal/socials/schema";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { MetricDialog } from "@/components/internal/socials/metric-dialog";
import { MonthlyLog } from "@/components/internal/socials/monthly-log";
import { SocialsOverview } from "@/components/internal/socials/overview";

export const metadata: Metadata = { title: "Social growth" };

/**
 * How Studio1's audiences grow, month by month: a strip of stats with a
 * chart under it, then every month in a table. Typed in by hand at the end
 * of each month. Admins only.
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
        description="Followers on each platform, month by month. Log the numbers at the end of every month."
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
          {series.map((account) => {
            const audience = audienceOf(account.platforms);
            return (
              <section key={account.account} aria-label={account.account}>
                <h2 className="mb-3 text-[15px] font-medium">
                  {account.account}
                </h2>
                <SocialsOverview series={overviewOf(account, audience)} />
                <MonthlyLog
                  account={account}
                  audience={audience}
                  accounts={accounts}
                  month={month}
                />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
