/**
 * Social growth: the platforms, a month's numbers for one account, and the
 * month-by-month series the page shows. Pure; lib/internal/socials/data.ts
 * reads and writes the rows.
 */

/**
 * `audience`: its number is people who follow along (followers,
 * subscribers), so it counts towards the total audience. Stars and
 * visitors don't.
 */
export const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", unit: "followers", audience: true },
  { value: "x", label: "X (Twitter)", unit: "followers", audience: true },
  { value: "youtube", label: "YouTube", unit: "subscribers", audience: true },
  { value: "instagram", label: "Instagram", unit: "followers", audience: true },
  { value: "github", label: "GitHub", unit: "stars", audience: false },
  {
    value: "newsletter",
    label: "Newsletter",
    unit: "subscribers",
    audience: true,
  },
  { value: "website", label: "Website", unit: "visitors", audience: false },
  { value: "other", label: "Other", unit: "followers", audience: true },
] as const;
export type Platform = (typeof PLATFORMS)[number]["value"];

export function isPlatform(value: unknown): value is Platform {
  return PLATFORMS.some((platform) => platform.value === value);
}

export function platformInfo(value: string) {
  return (
    PLATFORMS.find((platform) => platform.value === value) ??
    PLATFORMS[PLATFORMS.length - 1]
  );
}

/** Studio1's own accounts; anything else is a person's. */
export const STUDIO_ACCOUNT = "Studio1";

/** Where Studio1's own profiles live, so the page can link to them. */
export const STUDIO_PROFILES: Partial<Record<Platform, string>> = {
  linkedin: "https://www.linkedin.com/company/studio1hq/",
  x: "https://x.com/Studio1HQ",
  youtube: "https://www.youtube.com/@studio1hq",
  instagram: "https://www.instagram.com/studio1_hq/",
};

export type SocialMetric = {
  id: string;
  account: string;
  platform: Platform;
  /** "YYYY-MM". */
  month: string;
  followers: number;
  impressions: number | null;
  posts: number | null;
  notes: string;
  updated_at: string;
  updated_by: string | null;
};

export type SocialResult =
  { ok: true; message?: string } | { ok: false; message: string };

export const SOCIALS_MIGRATION_HINT =
  "Run the social growth migration (supabase/migrations/20261118110000_social_metrics.sql) in Supabase first.";

/** A month in a platform's series, with the change since the month logged before it. */
export type SeriesMonth = SocialMetric & {
  /** Followers gained since the last month logged; null for the first. */
  gained: number | null;
  /** That gain as a percent of where it started; null when it can't be said. */
  percent: number | null;
};

export type PlatformSeries = {
  platform: Platform;
  /** Newest first. */
  months: SeriesMonth[];
  latest: SeriesMonth;
  /** Followers gained since the first month logged. */
  sinceStart: number;
  first: SeriesMonth;
};

export type AccountSeries = { account: string; platforms: PlatformSeries[] };

function percent(gained: number, from: number) {
  return from > 0 ? Math.round((gained / from) * 1000) / 10 : null;
}

/**
 * The rows as accounts → platforms → months. Studio1 comes first, then
 * people by name; platforms in the order above.
 */
export function growthSeries(rows: readonly SocialMetric[]): AccountSeries[] {
  const accounts = new Map<string, Map<Platform, SocialMetric[]>>();
  for (const row of rows) {
    const platforms = accounts.get(row.account) ?? new Map();
    platforms.set(row.platform, [...(platforms.get(row.platform) ?? []), row]);
    accounts.set(row.account, platforms);
  }
  const order = PLATFORMS.map((platform) => platform.value as Platform);
  return [...accounts.entries()]
    .sort(
      ([a], [b]) =>
        Number(b === STUDIO_ACCOUNT) - Number(a === STUDIO_ACCOUNT) ||
        a.localeCompare(b),
    )
    .map(([account, platforms]) => ({
      account,
      platforms: [...platforms.entries()]
        .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
        .map(([platform, list]) => {
          const oldestFirst = [...list].sort((a, b) =>
            a.month.localeCompare(b.month),
          );
          const months = oldestFirst
            .map((row, index): SeriesMonth => {
              const before = oldestFirst[index - 1];
              const gained = before ? row.followers - before.followers : null;
              return {
                ...row,
                gained,
                percent:
                  gained === null || !before
                    ? null
                    : percent(gained, before.followers),
              };
            })
            .reverse();
          const latest = months[0];
          const first = months[months.length - 1];
          return {
            platform,
            months,
            latest,
            first,
            sinceStart: latest.followers - first.followers,
          };
        }),
    }));
}

/** "+120", "-4", "0". */
export function signed(value: number) {
  const text = new Intl.NumberFormat("en-US").format(Math.abs(value));
  return value > 0 ? `+${text}` : value < 0 ? `-${text}` : "0";
}

export type AudienceMonth = {
  month: string;
  /**
   * The total at the end of the month. A platform not logged that month
   * counts at its last number, so a skipped month isn't a drop.
   */
  total: number;
  /**
   * Gained that month on the platforms logged then and before. A platform
   * logged for the first time doesn't count as growth. Null when there's
   * nothing to compare.
   */
  gained: number | null;
  /** That gain as a percent of where those platforms were; null when it can't be said. */
  percent: number | null;
};

export type Audience = {
  /** Followers and subscribers on the counted platforms, each at its newest month. */
  total: number;
  /** How many platforms count towards it. */
  platforms: number;
  /** The newest month logged on any counted platform. */
  newest: string | null;
  /** Month by month, oldest first. */
  byMonth: AudienceMonth[];
  /** The newest month's gain and percent (see AudienceMonth). */
  gained: number | null;
  percent: number | null;
};

/** One account's audience across its platforms (not stars or visitors). */
export function audienceOf(platforms: readonly PlatformSeries[]): Audience {
  const counted = platforms.filter(
    (item) => platformInfo(item.platform).audience,
  );
  const months = [
    ...new Set(
      counted.flatMap((item) => item.months.map((entry) => entry.month)),
    ),
  ].sort();
  const byMonth = months.map((month): AudienceMonth => {
    let total = 0;
    let gained: number | null = null;
    let before = 0;
    for (const item of counted) {
      // Months are newest first, so the first at or before is the latest then.
      const latest = item.months.find((entry) => entry.month <= month);
      total += latest?.followers ?? 0;
      if (latest?.month === month && latest.gained !== null) {
        gained = (gained ?? 0) + latest.gained;
        before += latest.followers - latest.gained;
      }
    }
    return {
      month,
      total,
      gained,
      percent: gained === null ? null : percent(gained, before),
    };
  });
  const last = byMonth[byMonth.length - 1];
  return {
    total: counted.reduce((sum, item) => sum + item.latest.followers, 0),
    platforms: counted.length,
    newest: last?.month ?? null,
    byMonth,
    gained: last?.gained ?? null,
    percent: last?.percent ?? null,
  };
}

/** A platform's slice of the audience as a whole percent; null when it doesn't count. */
export function shareOf(item: PlatformSeries, audience: Audience) {
  if (!platformInfo(item.platform).audience || audience.total <= 0) return null;
  return Math.round((item.latest.followers / audience.total) * 100);
}

/** One month on the growth chart. */
export type ChartPoint = {
  /** "YYYY-MM". */
  month: string;
  value: number;
  gained: number | null;
  percent: number | null;
};

/** One stat in the strip over the chart, with the months the chart draws. */
export type OverviewSeries = {
  key: string;
  /** Null for the total audience. */
  platform: Platform | null;
  label: string;
  /** What the number counts: "followers", "subscribers", "audience". */
  unit: string;
  value: number;
  gained: number | null;
  percent: number | null;
  /** The month the change is against, "YYYY-MM". */
  since: string | null;
  /** Share of the total audience, in whole percent. */
  share: number | null;
  /** The profile, to open it. */
  href: string | null;
  /** Oldest first, up to 12 months. */
  points: ChartPoint[];
};

/**
 * An account's stats strip: its total audience first (when there's more
 * than one platform to add up), then each platform.
 */
export function overviewOf(
  account: AccountSeries,
  audience: Audience,
): OverviewSeries[] {
  const before = audience.byMonth[audience.byMonth.length - 2];
  const total: OverviewSeries = {
    key: "total",
    platform: null,
    label: "Total audience",
    unit: "audience",
    value: audience.total,
    gained: audience.gained,
    percent: audience.percent,
    since: before?.month ?? null,
    share: null,
    href: null,
    points: audience.byMonth.slice(-12).map((entry) => ({
      month: entry.month,
      value: entry.total,
      gained: entry.gained,
      percent: entry.percent,
    })),
  };
  const platforms = account.platforms.map((item): OverviewSeries => {
    const info = platformInfo(item.platform);
    return {
      key: item.platform,
      platform: item.platform,
      label: info.label,
      unit: info.unit,
      value: item.latest.followers,
      gained: item.latest.gained,
      percent: item.latest.percent,
      since: item.months[1]?.month ?? null,
      share: shareOf(item, audience),
      href:
        account.account === STUDIO_ACCOUNT
          ? (STUDIO_PROFILES[item.platform] ?? null)
          : null,
      points: [...item.months]
        .reverse()
        .slice(-12)
        .map((entry) => ({
          month: entry.month,
          value: entry.followers,
          gained: entry.gained,
          percent: entry.percent,
        })),
    };
  });
  return audience.platforms > 1 ? [total, ...platforms] : platforms;
}
