/**
 * The numbers behind the Analytics card on Social growth: a measure month
 * by month (for all platforms or one), a month's days, and its best posts
 * across platforms. Pure; components/internal/socials/social-analytics.tsx
 * draws them.
 */
import { shiftMonth } from "@/lib/internal/clients/schema";
import type { TopPost } from "@/lib/internal/socials/insights";
import type {
  MonthSummary,
  Platform,
  PlatformMonth,
} from "@/lib/internal/socials/schema";

export type Scope = "all" | Platform;

export const TREND_METRICS = [
  { key: "impressions", label: "Impressions" },
  { key: "engagements", label: "Engagements" },
  { key: "rate", label: "Engagement rate" },
  { key: "gained", label: "Net new followers" },
  { key: "posts", label: "Posts" },
  { key: "views", label: "Video views" },
] as const;
export type TrendMetric = (typeof TREND_METRICS)[number]["key"];

export type TrendPoint = {
  month: string;
  value: number | null;
  /** Each platform's share of it (all platforms only; not for the rate). */
  parts: { platform: Platform; value: number }[];
};

function platformValue(item: PlatformMonth, metric: TrendMetric) {
  return metric === "gained"
    ? item.gained
    : metric === "views"
      ? (item.insights.stats?.video_views ?? null)
      : item[metric];
}

function allValue(summary: MonthSummary, metric: TrendMetric) {
  if (metric === "views") {
    const views = summary.platforms.flatMap((item) => {
      const value = item.insights.stats?.video_views;
      return value === undefined ? [] : [value];
    });
    return views.length ? views.reduce((sum, value) => sum + value, 0) : null;
  }
  return metric === "gained"
    ? (summary.audience?.gained ?? null)
    : summary[metric];
}

/**
 * A measure month by month, oldest first: up to `span` months ending with
 * the newest logged, from the first logged (a month not logged is a gap).
 */
export function trendOf(
  summaries: MonthSummary[],
  scope: Scope,
  metric: TrendMetric,
  span = 12,
): TrendPoint[] {
  if (!summaries.length) return [];
  const sorted = [...summaries].sort((a, b) => a.month.localeCompare(b.month));
  const newest = sorted[sorted.length - 1].month;
  const oldest = sorted[0].month;
  const byMonth = new Map(sorted.map((item) => [item.month, item]));
  const points: TrendPoint[] = [];
  for (let index = span - 1; index >= 0; index--) {
    const month = shiftMonth(newest, -index);
    if (month < oldest) continue;
    const summary = byMonth.get(month);
    if (!summary) {
      points.push({ month, value: null, parts: [] });
      continue;
    }
    if (scope === "all") {
      points.push({
        month,
        value: allValue(summary, metric),
        parts:
          metric === "rate"
            ? []
            : summary.platforms.flatMap((item) => {
                const value = platformValue(item, metric);
                return value === null
                  ? []
                  : [{ platform: item.platform, value }];
              }),
      });
    } else {
      const item = summary.platforms.find((entry) => entry.platform === scope);
      points.push({
        month,
        value: item ? platformValue(item, metric) : null,
        parts: [],
      });
    }
  }
  return points;
}

/** The measures that have a number in at least one month of the trend. */
export function trendMetrics(
  summaries: MonthSummary[],
  scope: Scope,
): TrendMetric[] {
  return TREND_METRICS.map((item) => item.key).filter((metric) =>
    trendOf(summaries, scope, metric).some((point) => point.value !== null),
  );
}

export const DAILY_METRICS = [
  { key: "impressions", label: "Impressions" },
  { key: "engagements", label: "Engagements" },
  { key: "new_followers", label: "New followers" },
  { key: "views", label: "Video views" },
] as const;
export type DailyMetric = (typeof DAILY_METRICS)[number]["key"];

export type DayPoint = {
  day: string;
  value: number | null;
  parts: { platform: Platform; value: number }[];
};

/**
 * A month's days for one measure, from the first day with numbers to the
 * last; across platforms, each day is the sum of those that have it.
 */
export function dailyOf(
  summary: MonthSummary,
  scope: Scope,
  metric: DailyMetric,
): DayPoint[] {
  const platforms = summary.platforms.filter(
    (item) => scope === "all" || item.platform === scope,
  );
  const byDay = new Map<string, DayPoint>();
  for (const item of platforms)
    for (const point of item.insights.daily ?? []) {
      const value = point[metric];
      const entry = byDay.get(point.day) ?? {
        day: point.day,
        value: null,
        parts: [],
      };
      if (value !== undefined) {
        entry.value = (entry.value ?? 0) + value;
        entry.parts.push({ platform: item.platform, value });
      }
      byDay.set(point.day, entry);
    }
  const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  const first = days.findIndex((point) => point.value !== null);
  const last = days.findLastIndex((point) => point.value !== null);
  return first < 0 ? [] : days.slice(first, last + 1);
}

/** The daily measures the month has. */
export function dailyMetrics(
  summary: MonthSummary,
  scope: Scope,
): DailyMetric[] {
  return DAILY_METRICS.map((item) => item.key).filter(
    (metric) => dailyOf(summary, scope, metric).length > 0,
  );
}

export type RankedPost = TopPost & {
  platform: Platform;
  measure: "month" | "lifetime";
};

/** The month's best posts across platforms: most impressions first (views for videos). */
export function bestPosts(summary: MonthSummary, count = 5): RankedPost[] {
  return summary.platforms
    .flatMap((item) =>
      (item.insights.posts ?? []).map((post): RankedPost => ({
        ...post,
        platform: item.platform,
        measure: item.insights.posts_measure ?? "lifetime",
      })),
    )
    .sort(
      (a, b) =>
        (b.impressions ?? b.views ?? -1) - (a.impressions ?? a.views ?? -1) ||
        (b.engagements ?? -1) - (a.engagements ?? -1),
    )
    .slice(0, count);
}

export type Growth = {
  /** Against the nearest earlier month with a number. */
  previous: { month: string; change: number } | null;
  /** Against the first month in the chart with a number. */
  first: { month: string; change: number } | null;
};

/**
 * How the month's number moved: in percent (impressions, engagements,
 * posts), or in percentage points for the engagement rate. Net new
 * followers has no growth of its own (it is the growth).
 */
export function growthOf(
  points: TrendPoint[],
  month: string,
  metric: TrendMetric,
): Growth {
  const none: Growth = { previous: null, first: null };
  if (metric === "gained") return none;
  const index = points.findIndex((point) => point.month === month);
  const value = points[index]?.value;
  if (index < 0 || value === null || value === undefined) return none;
  const earlier = points
    .slice(0, index)
    .filter((point): point is TrendPoint & { value: number } =>
      Boolean(point.value !== null && (metric === "rate" || point.value > 0)),
    );
  const change = (before: number) =>
    metric === "rate"
      ? Math.round((value - before) * 10) / 10
      : Math.round(((value - before) / before) * 1000) / 10;
  const last = earlier[earlier.length - 1];
  const start = earlier[0];
  return {
    previous: last ? { month: last.month, change: change(last.value) } : null,
    first:
      start && start !== last
        ? { month: start.month, change: change(start.value) }
        : null,
  };
}

/**
 * Followers gained in the month by the export's own count (new follows
 * less unfollows, where it has them): growth for a month with none logged
 * before it. Null when the export doesn't count follows.
 */
export function exportNet(item: PlatformMonth): number | null {
  const stats = item.insights.stats;
  if (stats?.new_followers === undefined) return null;
  return stats.new_followers - (stats.lost_followers ?? 0);
}

export type WeekChange = {
  last: number;
  before: number;
  change: number | null;
};

/** The last 7 days with numbers against the 7 before them (needs 14 in a row). */
export function weekOnWeek(days: DayPoint[]): WeekChange | null {
  const known = days.filter((day) => day.value !== null);
  if (known.length < 14) return null;
  const tail = known.slice(-14);
  const first = Date.parse(`${tail[0].day}T00:00:00Z`);
  const end = Date.parse(`${tail[13].day}T00:00:00Z`);
  if ((end - first) / 86_400_000 !== 13) return null;
  const sum = (list: DayPoint[]) =>
    list.reduce((total, day) => total + (day.value ?? 0), 0);
  const before = sum(tail.slice(0, 7));
  const last = sum(tail.slice(7));
  return {
    last,
    before,
    change: before ? Math.round(((last - before) / before) * 1000) / 10 : null,
  };
}
