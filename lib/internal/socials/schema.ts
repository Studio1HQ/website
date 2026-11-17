/**
 * Social growth: the platforms, a month's numbers for one account, and the
 * month-by-month series the page shows. Pure; lib/internal/socials/data.ts
 * reads and writes the rows.
 */

export const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", unit: "followers" },
  { value: "x", label: "X (Twitter)", unit: "followers" },
  { value: "youtube", label: "YouTube", unit: "subscribers" },
  { value: "instagram", label: "Instagram", unit: "followers" },
  { value: "github", label: "GitHub", unit: "stars" },
  { value: "newsletter", label: "Newsletter", unit: "subscribers" },
  { value: "website", label: "Website", unit: "visitors" },
  { value: "other", label: "Other", unit: "followers" },
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
