import type { Metadata } from "next";
import { ChartLineUp, Plus, UploadSimple } from "@/components/internal/icons";
import { monthLabel, thisMonth } from "@/lib/internal/clients/schema";
import { todayKey } from "@/lib/internal/community/schema";
import type { Scope } from "@/lib/internal/socials/analytics";
import { loadMetrics, requireSocials } from "@/lib/internal/socials/data";
import {
  STUDIO_ACCOUNT,
  audienceOf,
  growthSeries,
  monthSummaries,
  platformInfo,
} from "@/lib/internal/socials/schema";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { LinkTabs } from "@/components/internal/community/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import { ImportDialog } from "@/components/internal/socials/import-dialog";
import { MetricDialog } from "@/components/internal/socials/metric-dialog";
import { MonthlyLog } from "@/components/internal/socials/monthly-log";
import {
  AudienceLogo,
  PlatformLogo,
} from "@/components/internal/socials/platform-logo";
import { SocialAnalytics } from "@/components/internal/socials/social-analytics";

export const metadata: Metadata = { title: "Social growth" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

/**
 * How Studio1's audiences grow: one account and month at a time (?account=,
 * ?month=), across all platforms or one (?platform=). Headline numbers,
 * growth month by month, the month's days, the platforms side by side, best
 * posts and who the audience is; then every month's followers in a table.
 * Uploaded from LinkedIn, X and YouTube analytics exports, or typed in by hand.
 * People given Social growth only.
 */
export default async function SocialsPage({ searchParams }: Props) {
  await requireSocials();
  const params = await searchParams;
  const current = thisMonth();
  const today = todayKey();
  const metrics = await loadMetrics();
  const rows = metrics.ok ? metrics.rows : [];
  const series = growthSeries(rows);
  const accounts = [
    ...new Set([STUDIO_ACCOUNT, ...series.map((item) => item.account)]),
  ];
  const homeAccount =
    series.find((item) => item.account === STUDIO_ACCOUNT)?.account ??
    series[0]?.account ??
    STUDIO_ACCOUNT;
  const account =
    series.find((item) => item.account === one(params.account)) ??
    series.find((item) => item.account === homeAccount) ??
    null;
  const audience = account ? audienceOf(account.platforms) : null;
  const summaries =
    account && audience ? monthSummaries(account, audience) : [];
  const newest = summaries[0]?.month ?? current;
  const summary =
    summaries.find((item) => item.month === one(params.month)) ??
    summaries[0] ??
    null;
  const month = summary?.month ?? current;
  const wanted = one(params.platform);
  const scope: Scope =
    summary?.platforms.find((item) => item.platform === wanted)?.platform ??
    "all";

  /** This page with some of account, month and platform changed. */
  const href = (next: { month?: string; platform?: Scope }) => {
    const query = new URLSearchParams();
    if (account && account.account !== homeAccount)
      query.set("account", account.account);
    const pickMonth = next.month ?? month;
    if (pickMonth !== newest) query.set("month", pickMonth);
    const pickPlatform = next.platform ?? scope;
    if (pickPlatform !== "all") query.set("platform", pickPlatform);
    const text = query.toString();
    return text ? `/socials?${text}` : "/socials";
  };

  const logged = rows.map((row) => ({
    account: row.account,
    platform: row.platform,
    month: row.month,
    followers: row.followers,
  }));
  /** The Upload stats button, starting on this account. */
  const upload = (variant: "accent" | "secondary", size?: "sm") => (
    <ImportDialog
      accounts={accounts}
      account={account?.account ?? STUDIO_ACCOUNT}
      today={today}
      logged={logged}
      trigger={
        <button type="button" className={buttonClass(variant, size)}>
          <UploadSimple size={13} /> Upload stats
        </button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Social growth"
        description="Followers, impressions and engagement on each platform, month by month. Upload the LinkedIn, X and YouTube analytics exports, or log the numbers by hand."
        actions={
          <>
            {series.length > 1 && account ? (
              <FilterDropdown
                label="Account"
                always
                align="end"
                items={series.map((item) => ({
                  key: item.account,
                  label: item.account,
                  href:
                    item.account === homeAccount
                      ? "/socials"
                      : `/socials?${new URLSearchParams({ account: item.account })}`,
                  on: item.account === account.account,
                }))}
              />
            ) : null}
            {summaries.length ? (
              <FilterDropdown
                label="Month"
                always
                align="end"
                items={summaries.map((item) => ({
                  key: item.month,
                  label: monthLabel(item.month),
                  href: href({ month: item.month }),
                  on: item.month === month,
                }))}
              />
            ) : null}
            <MetricDialog
              accounts={accounts}
              month={current}
              trigger={
                <button type="button" className={buttonClass("secondary")}>
                  <Plus size={13} /> Log a month
                </button>
              }
            />
            {upload("accent")}
          </>
        }
      />
      {!metrics.ok ? (
        <div className="mb-5">
          <Notice tone={metrics.missing ? "warning" : "error"}>
            {metrics.message}
          </Notice>
        </div>
      ) : null}

      {!account || !audience || !summary ? (
        <Card>
          <EmptyState
            icon={<ChartLineUp size={20} />}
            title="No numbers yet"
            action={upload("accent")}
          >
            Upload the LinkedIn, X and YouTube analytics exports (CSV, XLS, XLSX
            or ZIP), or log the followers by hand, to start. A longer export
            fills every whole month in it at once.
          </EmptyState>
        </Card>
      ) : (
        <>
          <LinkTabs
            active={scope}
            items={[
              {
                key: "all",
                label: "All platforms",
                icon: <AudienceLogo size={16} />,
                href: href({ platform: "all" }),
              },
              ...summary.platforms.map((item) => ({
                key: item.platform,
                label: platformInfo(item.platform).label,
                icon: <PlatformLogo platform={item.platform} size={16} />,
                href: href({ platform: item.platform }),
              })),
            ]}
          />
          <SocialAnalytics
            key={`${account.account}-${month}-${scope}`}
            summaries={summaries}
            month={month}
            scope={scope}
            monthHrefs={Object.fromEntries(
              summaries.map((item) => [
                item.month,
                href({ month: item.month }),
              ]),
            )}
            platformHrefs={Object.fromEntries(
              summary.platforms.map((item) => [
                item.platform,
                href({ platform: item.platform }),
              ]),
            )}
            upload={upload("secondary", "sm")}
          />
          <div className="mt-6">
            <MonthlyLog
              account={account}
              audience={audience}
              accounts={accounts}
              month={current}
            />
          </div>
        </>
      )}
    </>
  );
}
