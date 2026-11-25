"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "@/components/internal/icons";
import { monthLabel } from "@/lib/internal/clients/schema";
import {
  DAILY_METRICS,
  TREND_METRICS,
  bestPosts,
  dailyMetrics,
  dailyOf,
  exportNet,
  growthOf,
  trendOf,
  weekOnWeek,
  type DailyMetric,
  type RankedPost,
  type Scope,
  type TrendMetric,
} from "@/lib/internal/socials/analytics";
import { axisMonth, axisNumber } from "@/lib/internal/socials/chart";
import {
  DEMOGRAPHIC_LABELS,
  shareText,
  statLabel,
  statText,
  type Demographics,
  type ImportSource,
  type StatKey,
  type TopPost,
} from "@/lib/internal/socials/insights";
import {
  platformInfo,
  signed,
  type ChartPoint,
  type MonthSummary,
  type Platform,
  type PlatformMonth,
} from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";
import { Select } from "@/components/internal/select";
import { Card } from "@/components/internal/ui";
import { BarChart } from "@/components/internal/socials/bar-chart";
import { Delta } from "@/components/internal/socials/delta";
import { GrowthChart } from "@/components/internal/socials/growth-chart";
import { PlatformLogo } from "@/components/internal/socials/platform-logo";

/**
 * Social growth's analytics for one account and month, across all
 * platforms or one (the page's Month dropdown and platform tabs pick them,
 * in the URL). A row of headline numbers, each with how it moved; Growth,
 * month by month (followers as a line, the rest as bars; click a month to
 * open it); the month's days; the platforms side by side (or the
 * platform's other numbers); its best posts and who the audience is.
 * Impressions and the rest come from uploaded LinkedIn, X and YouTube exports; a
 * month typed in by hand has its followers. `upload` is the Upload stats
 * button, offered where a month has no uploaded numbers.
 */

const counts = new Intl.NumberFormat("en-US");
const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const weekdayLabel = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const short = (day: string) => dayLabel.format(new Date(`${day}T00:00:00Z`));
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function SocialAnalytics({
  summaries,
  month,
  scope,
  monthHrefs,
  platformHrefs,
  upload,
}: {
  /** Newest first. */
  summaries: MonthSummary[];
  month: string;
  scope: Scope;
  /** Each month's page, keeping the account and platform. */
  monthHrefs: Record<string, string>;
  /** Each platform's tab for this month. */
  platformHrefs: Record<string, string>;
  upload?: ReactNode;
}) {
  const router = useRouter();
  const summary =
    summaries.find((entry) => entry.month === month) ?? summaries[0];
  if (!summary) return null;
  const item =
    scope === "all"
      ? null
      : (summary.platforms.find((entry) => entry.platform === scope) ?? null);
  const shown = item ? [item] : summary.platforms;
  const imported = shown.some(
    (entry) => entry.impressions !== null || entry.engagements !== null,
  );
  const posts: RankedPost[] = item
    ? (item.insights.posts ?? []).map((post) => ({
        ...post,
        platform: item.platform,
        measure: item.insights.posts_measure ?? "lifetime",
      }))
    : bestPosts(summary);
  const audience = item?.insights.demographics ?? [];
  // YouTube's views and watch time are in the headline already.
  const stats = (
    Object.entries(item?.insights.stats ?? {}) as [StatKey, number][]
  ).filter(
    ([key]) =>
      item?.platform !== "youtube" ||
      (key !== "video_views" && key !== "watch_minutes"),
  );
  const go = (href: string | undefined) => {
    if (href) router.push(href, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <Headline summaries={summaries} summary={summary} item={item} />

      {!imported ? (
        <Card className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
          <div className="min-w-0 flex-1 basis-72">
            <p className="text-[13.5px] font-medium">
              {item
                ? `No ${platformInfo(item.platform).label} export for ${monthLabel(summary.month)} yet`
                : `No exports for ${monthLabel(summary.month)} yet`}
            </p>
            <p className="mt-0.5 text-[12.5px] text-[var(--i-muted)]">
              Upload the LinkedIn, X and YouTube analytics exports (CSV, XLS,
              XLSX or ZIP) to add impressions, engagement, the days, the best
              posts and who the audience is. A longer export fills every whole
              month in it.
            </p>
          </div>
          {upload}
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <GrowthPanel
          summaries={summaries}
          scope={scope}
          month={summary.month}
          onMonth={(key) => go(monthHrefs[key])}
        />
        <DailyPanel
          key={`${scope}-${summary.month}`}
          summary={summary}
          scope={scope}
        />
      </div>

      {item ? (
        stats.length ? (
          <Panel
            title="The month in numbers"
            note={`From ${platformInfo(item.platform).label}'s export`}
          >
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-4">
              {stats.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="truncate text-[12px] text-[var(--i-muted)]">
                    {statLabel(key, item.platform)}
                  </dt>
                  <dd className="mt-1 text-[17px] font-medium leading-none tabular-nums tracking-[-0.01em] text-[var(--i-ink)]">
                    {statText(key, value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        ) : null
      ) : (
        <PlatformsPanel
          summary={summary}
          onPick={(platform) => go(platformHrefs[platform])}
        />
      )}

      {posts.length || audience.length ? (
        <div
          className={cn(
            "grid gap-4",
            posts.length && audience.length && "lg:grid-cols-2",
          )}
        >
          {posts.length ? (
            <PostsPanel posts={posts} month={summary.month} across={!item} />
          ) : null}
          {audience.length ? (
            <AudiencePanel
              key={`${scope}-${summary.month}`}
              demographics={audience}
            />
          ) : null}
        </div>
      ) : null}

      <Sources platforms={shown} />
    </div>
  );
}

// ---------------------------------------------------------------- pieces

/** A card with a title, a quiet line under it and an action on the right. */
function Panel({
  title,
  note,
  action,
  children,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-medium">{title}</h2>
          {note ? (
            <div className="mt-0.5 text-[12px] leading-snug text-[var(--i-faint)]">
              {note}
            </div>
          ) : null}
        </div>
        {action}
      </div>
      <div className="px-5 pb-4 pt-3">{children}</div>
    </Card>
  );
}

/** "+12.5%" (or "-0.3 pts"): green up, amber down. */
function Moved({ value, points = false }: { value: number; points?: boolean }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        value > 0
          ? "text-emerald-700 dark:text-emerald-400"
          : value < 0
            ? "text-amber-700 dark:text-amber-400"
            : "text-[var(--i-ink-2)]",
      )}
    >
      {value > 0 ? "+" : ""}
      {value}
      {points ? " pts" : "%"}
    </span>
  );
}

const movedText = (value: number, points = false) =>
  `${value > 0 ? "+" : ""}${value}${points ? " pts" : "%"}`;

/** A platform's logo and name with its number: a line in a chart's card. */
function PartLine({ platform, value }: { platform: Platform; value: string }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <PlatformLogo platform={platform} size={14} />
        <span className="truncate">{platformInfo(platform).label}</span>
      </span>
      <span className="tabular-nums text-[var(--i-ink-2)]">{value}</span>
    </span>
  );
}

const dash = <span className="text-[var(--i-faint)]">—</span>;
const number = (value: number | null) =>
  value === null ? dash : counts.format(value);

// ---------------------------------------------------------------- headline

function Kpi({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <Card className="h-full min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="truncate text-[12px] text-[var(--i-muted)] sm:text-[12.5px]">
        {label}
      </p>
      <p className="mt-2 truncate text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-[26px]">
        {value}
      </p>
      <div className="mt-2 truncate text-[12px] leading-snug text-[var(--i-faint)] sm:text-[12.5px]">
        {note ?? " "}
      </div>
    </Card>
  );
}

/** "+18% on Oct 2026", against the nearest earlier month with a number. */
function MovedSince({
  summaries,
  scope,
  month,
  metric,
  fallback,
}: {
  summaries: MonthSummary[];
  scope: Scope;
  month: string;
  metric: TrendMetric;
  fallback: ReactNode;
}) {
  const growth = growthOf(trendOf(summaries, scope, metric), month, metric);
  if (!growth.previous) return <>{fallback}</>;
  return (
    <span className="whitespace-nowrap">
      <Moved value={growth.previous.change} points={metric === "rate"} /> on{" "}
      {monthLabel(growth.previous.month, true)}
    </span>
  );
}

function Headline({
  summaries,
  summary,
  item,
}: {
  summaries: MonthSummary[];
  summary: MonthSummary;
  item: PlatformMonth | null;
}) {
  const scope: Scope = item?.platform ?? "all";
  const month = summary.month;
  const impressions = item ? item.impressions : summary.impressions;
  const engagements = item ? item.engagements : summary.engagements;
  const rate = item ? item.rate : summary.rate;
  const posts = item ? item.posts : summary.posts;
  // YouTube is about views and watch time; it has no engagements column.
  const video = item?.platform === "youtube";
  const views = item?.insights.stats?.video_views ?? null;
  const watch = item?.insights.stats?.watch_minutes ?? null;
  const uploaded = (value: number | null, words: string) =>
    value === null ? "Not uploaded" : words;

  // Followers: on the month logged before, else the exports' own follows.
  let followers: ReactNode;
  if (item) {
    const net = exportNet(item);
    followers =
      item.gained === null && net !== null ? (
        <span className="inline-flex items-center gap-1">
          <Delta gained={net} percent={null} />
          in the month
        </span>
      ) : (
        <Delta
          gained={item.gained}
          percent={item.percent}
          first="First month logged"
        />
      );
  } else {
    const nets = summary.platforms.flatMap((entry) => {
      const net = exportNet(entry);
      return net === null ? [] : [{ platform: entry.platform, net }];
    });
    followers =
      summary.audience?.gained == null && nets.length ? (
        <span className="inline-flex items-center gap-1">
          <Delta
            gained={nets.reduce((sum, entry) => sum + entry.net, 0)}
            percent={null}
          />
          in the month
        </span>
      ) : (
        <Delta
          gained={summary.audience?.gained ?? null}
          percent={summary.audience?.percent ?? null}
          first="First month logged"
        />
      );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Kpi
        label={
          item ? capital(platformInfo(item.platform).unit) : "Total audience"
        }
        value={
          item
            ? counts.format(item.followers)
            : summary.audience
              ? counts.format(summary.audience.total)
              : dash
        }
        note={followers}
      />
      <Kpi
        label="Impressions"
        value={number(impressions)}
        note={
          <MovedSince
            summaries={summaries}
            scope={scope}
            month={month}
            metric="impressions"
            fallback={uploaded(impressions, `In ${monthLabel(month, true)}`)}
          />
        }
      />
      {video ? (
        <>
          <Kpi
            label="Views"
            value={number(views)}
            note={
              <MovedSince
                summaries={summaries}
                scope={scope}
                month={month}
                metric="views"
                fallback={uploaded(views, `In ${monthLabel(month, true)}`)}
              />
            }
          />
          <Kpi
            label="Watch time"
            value={watch === null ? dash : statText("watch_minutes", watch)}
            note={uploaded(watch, "Hours watched")}
          />
        </>
      ) : (
        <>
          <Kpi
            label="Engagements"
            value={number(engagements)}
            note={
              <MovedSince
                summaries={summaries}
                scope={scope}
                month={month}
                metric="engagements"
                fallback={uploaded(engagements, "Reactions, comments, clicks…")}
              />
            }
          />
          <Kpi
            label="Engagement rate"
            value={rate === null ? dash : `${rate}%`}
            note={
              <MovedSince
                summaries={summaries}
                scope={scope}
                month={month}
                metric="rate"
                fallback={uploaded(rate, "Engagements per impression")}
              />
            }
          />
        </>
      )}
      <Kpi
        label={video ? "Videos" : "Posts"}
        value={number(posts)}
        note={
          <MovedSince
            summaries={summaries}
            scope={scope}
            month={month}
            metric="posts"
            fallback={uploaded(
              posts,
              `Published in ${monthLabel(month, true)}`,
            )}
          />
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- growth

type GrowthMeasure = "followers" | TrendMetric;

const GROWTH_MEASURES: { key: GrowthMeasure; label: string }[] = [
  { key: "followers", label: "Followers" },
  { key: "gained", label: "Net new followers" },
  ...TREND_METRICS.filter((item) => item.key !== "gained").map((item) => ({
    key: item.key,
    label: item.label,
  })),
];

/** Followers (or the total audience) month by month, for the line. */
function followerPoints(summaries: MonthSummary[], scope: Scope): ChartPoint[] {
  return [...summaries]
    .reverse()
    .slice(-12)
    .flatMap((summary): ChartPoint[] => {
      if (scope === "all")
        return summary.audience
          ? [
              {
                month: summary.month,
                value: summary.audience.total,
                gained: summary.audience.gained,
                percent: summary.audience.percent,
              },
            ]
          : [];
      const item = summary.platforms.find((entry) => entry.platform === scope);
      return item
        ? [
            {
              month: summary.month,
              value: item.followers,
              gained: item.gained,
              percent: item.percent,
            },
          ]
        : [];
    });
}

function trendValue(metric: TrendMetric, value: number) {
  return metric === "rate"
    ? `${value}%`
    : metric === "gained"
      ? signed(value)
      : counts.format(value);
}

/** One measure month by month; clicking a month opens it. */
function GrowthPanel({
  summaries,
  scope,
  month,
  onMonth,
}: {
  summaries: MonthSummary[];
  scope: Scope;
  month: string;
  onMonth: (month: string) => void;
}) {
  const [measure, setMeasure] = useState<GrowthMeasure>("followers");
  const available = GROWTH_MEASURES.filter(
    (item) =>
      item.key === "followers" ||
      trendOf(summaries, scope, item.key).some((point) => point.value !== null),
  );
  const chosen = available.some((item) => item.key === measure)
    ? measure
    : "followers";
  const unit = scope === "all" ? "audience" : platformInfo(scope).unit;

  let note: ReactNode = null;
  let chart: ReactNode;
  if (chosen === "followers") {
    const points = followerPoints(summaries, scope);
    const first = points[0];
    const at = points.find((point) => point.month === month);
    const since =
      first && at && first.month !== at.month && first.value
        ? Math.round(((at.value - first.value) / first.value) * 1000) / 10
        : null;
    note =
      at && at.gained !== null ? (
        <span>
          {monthLabel(month, true)}:{" "}
          <Delta gained={at.gained} percent={at.percent} />
          {since !== null ? (
            <>
              {" · "}
              <Moved value={since} /> since {monthLabel(first.month, true)}
            </>
          ) : null}
        </span>
      ) : null;
    chart = (
      <GrowthChart
        key={`${scope}-count`}
        points={points}
        mode="count"
        name={scope === "all" ? "Total audience" : capital(unit)}
        unit={unit === "audience" ? "followers and subscribers" : unit}
      />
    );
  } else if (chosen === "gained") {
    const points = followerPoints(summaries, scope);
    const total = points.reduce((sum, point) => sum + (point.gained ?? 0), 0);
    note = points.some((point) => point.gained !== null) ? (
      <span>
        <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
          {signed(total)}
        </span>{" "}
        from {monthLabel(points[0].month, true)} to{" "}
        {monthLabel(points[points.length - 1].month, true)}
      </span>
    ) : null;
    chart = (
      <GrowthChart
        key={`${scope}-gained`}
        points={points}
        mode="gained"
        name={`Net new ${unit === "audience" ? "followers" : unit}`}
        unit={unit}
      />
    );
  } else {
    const points = trendOf(summaries, scope, chosen);
    const label =
      GROWTH_MEASURES.find((item) => item.key === chosen)?.label ?? chosen;
    const rated = chosen === "rate";
    const growth = growthOf(points, month, chosen);
    const logged = new Set(summaries.map((entry) => entry.month));
    note = growth.previous ? (
      <span>
        {monthLabel(month, true)}:{" "}
        <Moved value={growth.previous.change} points={rated} /> on{" "}
        {monthLabel(growth.previous.month, true)}
        {growth.first ? (
          <>
            {" · "}
            <Moved value={growth.first.change} points={rated} /> since{" "}
            {monthLabel(growth.first.month, true)}
          </>
        ) : null}
      </span>
    ) : points.filter((point) => point.value !== null).length < 2 ? (
      "Growth shows once a second month is uploaded."
    ) : null;
    chart = (
      <BarChart
        key={`${scope}-${chosen}`}
        height={160}
        bars={points.map((point) => ({ key: point.month, value: point.value }))}
        name={`${label}, month by month`}
        axisLabel={(index) => axisMonth(points[index].month, index === 0)}
        tick={rated ? (value) => `${value}%` : axisNumber}
        selected={points.findIndex((point) => point.month === month)}
        onPick={(index) => {
          if (logged.has(points[index].month)) onMonth(points[index].month);
        }}
        tip={(index) => {
          const point = points[index];
          const value =
            point.value === null ? null : trendValue(chosen, point.value);
          const moved = growthOf(points, point.month, chosen).previous;
          return {
            title: value ?? "—",
            lines: [
              `${label}, ${monthLabel(point.month, true)}`,
              moved
                ? `${movedText(moved.change, rated)} on ${monthLabel(moved.month, true)}`
                : "",
              ...(point.parts.length > 1
                ? point.parts.map((part) => (
                    <PartLine
                      key={part.platform}
                      platform={part.platform}
                      value={trendValue(chosen, part.value)}
                    />
                  ))
                : []),
              point.value === null
                ? logged.has(point.month)
                  ? "Not in this month's numbers"
                  : "Not logged"
                : "",
            ].filter(Boolean),
            read: `${monthLabel(point.month)}: ${value ?? "no number"}`,
          };
        }}
      />
    );
  }

  return (
    <Panel
      title="Growth"
      note={note ?? "Month by month"}
      action={
        available.length > 1 ? (
          <Select
            size="sm"
            aria-label="Growth measure"
            value={chosen}
            onChange={(value) => setMeasure(value as GrowthMeasure)}
            className="w-[11.5rem]"
            options={available.map((item) => ({
              value: item.key,
              label: item.label,
            }))}
          />
        ) : null
      }
    >
      {chart}
    </Panel>
  );
}

// ---------------------------------------------------------------- days

function DailyPanel({
  summary,
  scope,
}: {
  summary: MonthSummary;
  scope: Scope;
}) {
  const metrics = dailyMetrics(summary, scope);
  const [metric, setMetric] = useState<DailyMetric>("impressions");
  const chosen = metrics.includes(metric) ? metric : metrics[0];
  if (!chosen)
    return (
      <Panel title="Day by day" note={monthLabel(summary.month, true)}>
        <p className="flex h-[12rem] items-center justify-center text-center text-[12.5px] text-[var(--i-faint)]">
          The month&apos;s days show once its exports are uploaded.
        </p>
      </Panel>
    );
  const days = dailyOf(summary, scope, chosen);
  const label =
    DAILY_METRICS.find((item) => item.key === chosen)?.label ?? chosen;
  const week = weekOnWeek(days);
  let best: (typeof days)[number] | null = null;
  let total = 0;
  for (const day of days) {
    total += day.value ?? 0;
    if (day.value !== null && (best === null || day.value > (best.value ?? 0)))
      best = day;
  }
  return (
    <Panel
      title={
        <>
          Day by day
          <span className="font-normal text-[var(--i-muted)]">
            {" "}
            · {monthLabel(summary.month, true)}
          </span>
        </>
      }
      note={
        <>
          {week ? (
            <span className="block">
              Last 7 days {counts.format(week.last)}
              {week.change !== null ? (
                <>
                  , <Moved value={week.change} /> on the 7 before
                </>
              ) : null}
            </span>
          ) : null}
          {best ? (
            <span className="block tabular-nums">
              Best day {short(best.day)}: {counts.format(best.value ?? 0)} ·{" "}
              {counts.format(Math.round(total / days.length))} a day on average
            </span>
          ) : null}
        </>
      }
      action={
        metrics.length > 1 ? (
          <Select
            size="sm"
            aria-label="Daily measure"
            value={chosen}
            onChange={(value) => setMetric(value as DailyMetric)}
            className="w-[10rem]"
            options={DAILY_METRICS.filter((item) =>
              metrics.includes(item.key),
            ).map((item) => ({ value: item.key, label: item.label }))}
          />
        ) : null
      }
    >
      <BarChart
        key={`${scope}-${chosen}`}
        height={140}
        bars={days.map((day) => ({ key: day.day, value: day.value }))}
        name={`${label} a day, ${monthLabel(summary.month)}`}
        axisLabel={(index) => String(Number(days[index].day.slice(8)))}
        tip={(index) => {
          const day = days[index];
          const value = day.value === null ? "—" : counts.format(day.value);
          return {
            title: value,
            lines: [
              `${label}, ${weekdayLabel.format(new Date(`${day.day}T00:00:00Z`))}`,
              ...(day.parts.length > 1
                ? day.parts.map((part) => (
                    <PartLine
                      key={part.platform}
                      platform={part.platform}
                      value={counts.format(part.value)}
                    />
                  ))
                : []),
            ],
            read: `${short(day.day)}: ${value} ${label.toLowerCase()}`,
          };
        }}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------- platforms

function PlatformsPanel({
  summary,
  onPick,
}: {
  summary: MonthSummary;
  onPick: (platform: Platform) => void;
}) {
  const total = summary.audience?.total ?? 0;
  const head = "px-2 py-2.5 text-right font-normal";
  const cell = "px-2 py-2.5 text-right tabular-nums";
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="px-5 pt-4">
        <h2 className="text-[14.5px] font-medium">By platform</h2>
        <p className="mt-0.5 text-[12px] text-[var(--i-faint)]">
          {monthLabel(summary.month)} · open one for its days, posts and
          audience
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)]">
              <th
                scope="col"
                className="py-2.5 pl-5 pr-2 text-left font-normal"
              >
                Platform
              </th>
              <th scope="col" className={head}>
                Followers
              </th>
              <th scope="col" className={cn(head, "max-sm:hidden")}>
                Net new
              </th>
              <th scope="col" className={head}>
                Impressions
              </th>
              <th scope="col" className={cn(head, "max-md:hidden")}>
                Engagements
              </th>
              <th scope="col" className={cn(head, "max-md:hidden")}>
                Rate
              </th>
              <th scope="col" className={cn(head, "pr-5 max-sm:hidden")}>
                Posts
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.platforms.map((item) => {
              const info = platformInfo(item.platform);
              const net = item.gained ?? exportNet(item);
              const share = total
                ? Math.round((item.followers / total) * 100)
                : 0;
              return (
                <tr
                  key={item.platform}
                  className="border-b border-[var(--i-line)] last:border-0 hover:bg-[var(--i-hover)]"
                >
                  <th
                    scope="row"
                    className="py-1.5 pl-3 pr-2 text-left font-normal"
                  >
                    <button
                      type="button"
                      onClick={() => onPick(item.platform)}
                      className="inline-flex max-w-full items-center gap-2.5 rounded-md px-2 py-1 text-[var(--i-ink)]"
                    >
                      <PlatformLogo platform={item.platform} size={22} />
                      <span className="truncate font-medium">{info.label}</span>
                    </button>
                  </th>
                  <td className={cell}>
                    <span className="font-medium">
                      {counts.format(item.followers)}
                    </span>
                    {total ? (
                      <span className="ml-1.5 text-[11.5px] text-[var(--i-faint)] max-sm:hidden">
                        {share}%
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={cn(cell, "text-[var(--i-ink-2)] max-sm:hidden")}
                  >
                    {net === null ? dash : signed(net)}
                  </td>
                  <td className={cell}>{number(item.impressions)}</td>
                  <td className={cn(cell, "max-md:hidden")}>
                    {number(item.engagements)}
                  </td>
                  <td className={cn(cell, "max-md:hidden")}>
                    {item.rate === null ? dash : `${item.rate}%`}
                  </td>
                  <td className={cn(cell, "pr-5 max-sm:hidden")}>
                    {number(item.posts)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- posts

/** A post's title: its text, or the words in a LinkedIn link. */
function postTitle(post: TopPost) {
  if (post.text) {
    // LinkedIn posts often use 𝗯𝗼𝗹𝗱 letters; show them as plain ones.
    const text = post.text.normalize("NFKC");
    // Stored texts stop at 200 characters: end on a whole word.
    return text.length >= 190
      ? `${text.slice(0, text.lastIndexOf(" ", 190)).replace(/[\s,.;:–-]+$/, "")}…`
      : text;
  }
  const slug = post.url?.match(
    /\/posts\/[^_/]+_(.+?)-(?:share|ugcpost|activity)-/i,
  )?.[1];
  if (slug) {
    const words = slug.replace(/-/g, " ");
    return `${words.charAt(0).toUpperCase()}${words.slice(1)}…`;
  }
  return "A post";
}

/** The month's best posts as a table: the post, then its numbers in columns. */
function PostsPanel({
  posts,
  month,
  across,
}: {
  posts: RankedPost[];
  month: string;
  /** From several platforms. */
  across: boolean;
}) {
  const measured = posts.some((post) => post.measure === "month");
  // YouTube's videos lead with views; posts elsewhere with impressions.
  const videos = posts.every((post) => post.platform === "youtube");
  const leadOf = (post: RankedPost) =>
    videos ? (post.views ?? null) : post.impressions;
  const nextOf = (post: RankedPost) =>
    videos ? post.impressions : post.engagements;
  const top = Math.max(1, ...posts.map((post) => leadOf(post) ?? 0));
  const head = "px-2 py-2.5 text-right font-normal whitespace-nowrap";
  const cell = "px-2 py-3 text-right align-top tabular-nums whitespace-nowrap";
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="px-5 pt-4">
        <h2 className="text-[14.5px] font-medium">
          {videos ? "Best videos" : "Best posts"}
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--i-faint)]">
          {across
            ? `${monthLabel(month, true)}, across platforms, most impressions first`
            : measured
              ? `What each did in ${monthLabel(month, true)}`
              : `Published in ${monthLabel(month, true)}, totals so far`}
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)]">
              <th
                scope="col"
                className="w-10 py-2.5 pl-5 pr-1 text-left font-normal"
              >
                #
              </th>
              <th scope="col" className="px-2 py-2.5 text-left font-normal">
                {videos ? "Video" : "Post"}
              </th>
              <th scope="col" className={head}>
                {videos ? "Views" : "Impressions"}
              </th>
              <th
                scope="col"
                className={cn(head, "max-sm:hidden", videos && "pr-5")}
              >
                {videos ? "Impressions" : "Engagements"}
              </th>
              {videos ? null : (
                <th scope="col" className={cn(head, "pr-5 max-md:hidden")}>
                  Rate
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {posts.map((post, index) => {
              const title = postTitle(post);
              const lead = leadOf(post);
              const rate =
                post.impressions && post.engagements !== null
                  ? Math.round((post.engagements / post.impressions) * 1000) /
                    10
                  : null;
              return (
                <tr
                  key={`${post.url ?? title}-${index}`}
                  className="border-b border-[var(--i-line)] last:border-0 hover:bg-[var(--i-hover)]"
                >
                  <td className="py-3 pl-5 pr-1 align-top text-[12.5px] tabular-nums text-[var(--i-faint)]">
                    {index + 1}
                  </td>
                  <td className="w-full max-w-0 px-2 py-2.5 align-top">
                    <div className="flex min-w-0 gap-2.5">
                      <PlatformLogo
                        platform={post.platform}
                        size={22}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={title}
                            className="block truncate font-medium text-[var(--i-ink)] hover:underline hover:underline-offset-2"
                          >
                            {title}
                          </a>
                        ) : (
                          <p
                            title={title}
                            className="truncate font-medium text-[var(--i-ink)]"
                          >
                            {title}
                          </p>
                        )}
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[var(--i-faint)] [&>*]:whitespace-nowrap">
                          <span>{platformInfo(post.platform).label}</span>
                          {post.day ? <span>· {short(post.day)}</span> : null}
                          {post.url ? (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 hover:text-[var(--i-ink)]"
                            >
                              · Open <ArrowUpRight size={10} />
                            </a>
                          ) : null}
                          <span className="tabular-nums sm:hidden">
                            {nextOf(post) !== null
                              ? `· ${counts.format(nextOf(post) ?? 0)} ${videos ? "impressions" : "engagements"}`
                              : ""}
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cell}>
                    <span className="font-medium text-[var(--i-ink)]">
                      {number(lead)}
                    </span>
                    {lead !== null ? (
                      <span className="mt-1.5 ml-auto block h-1 w-20 overflow-hidden rounded-full bg-[var(--i-hover)] max-sm:w-14">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(4, (lead / top) * 100)}%`,
                            background: "var(--i-bar)",
                          }}
                        />
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(cell, "max-sm:hidden", videos && "pr-5")}>
                    {number(nextOf(post))}
                  </td>
                  {videos ? null : (
                    <td className={cn(cell, "pr-5 max-md:hidden")}>
                      {rate === null ? dash : `${rate}%`}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- audience

function AudiencePanel({ demographics }: { demographics: Demographics[] }) {
  const [kind, setKind] = useState(demographics[0].kind);
  const current =
    demographics.find((item) => item.kind === kind) ?? demographics[0];
  const [group, setGroup] = useState(current.groups[0]?.group ?? "");
  const chosen =
    current.groups.find((item) => item.group === group) ?? current.groups[0];
  const top = Math.max(1, ...(chosen?.items.map((item) => item.share) ?? []));
  return (
    <Panel
      title="Who the audience is"
      note={
        current.as_of
          ? `${DEMOGRAPHIC_LABELS[current.kind]}, as of ${short(current.as_of)}`
          : DEMOGRAPHIC_LABELS[current.kind]
      }
      action={
        demographics.length > 1 ? (
          <Select
            size="sm"
            aria-label="Whose"
            value={current.kind}
            onChange={(value) => setKind(value)}
            className="w-[11rem]"
            options={demographics.map((item) => ({
              value: item.kind,
              label: DEMOGRAPHIC_LABELS[item.kind],
            }))}
          />
        ) : null
      }
    >
      <div
        className="-mx-1 mb-3 flex flex-wrap gap-1"
        role="group"
        aria-label="Group"
      >
        {current.groups.map((item) => (
          <button
            key={item.group}
            type="button"
            aria-pressed={item.group === chosen?.group}
            onClick={() => setGroup(item.group)}
            className={cn(
              "h-7 rounded-full px-2.5 text-[12px] transition-colors",
              item.group === chosen?.group
                ? "bg-[var(--i-hover)] font-medium text-[var(--i-ink)] ring-1 ring-inset ring-[var(--i-line)]"
                : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
            )}
          >
            {item.group}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {chosen?.items.map((item) => (
          <li key={item.name} className="text-[12.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[var(--i-ink-2)]">
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--i-muted)]">
                {shareText(item.share)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--i-hover)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (item.share / top) * 100)}%`,
                  background: "var(--i-bar)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------- sources

/** Where the numbers came from: each platform's files, or its note. */
function Sources({ platforms }: { platforms: PlatformMonth[] }) {
  const lines = platforms.flatMap((item) => {
    const label = platformInfo(item.platform).label;
    const files = (item.insights.sources ?? []).map(
      (source: ImportSource) =>
        `${source.label}${source.from && source.to ? ` (${short(source.from)} – ${short(source.to)})` : ""}, uploaded ${short(source.at)}`,
    );
    return files.length
      ? [`${label}: ${files.join("; ")}.`]
      : item.notes
        ? [`${label}: ${item.notes}`]
        : [];
  });
  if (!lines.length) return null;
  return (
    <div className="space-y-0.5 px-1 text-[11.5px] leading-snug text-[var(--i-faint)]">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
