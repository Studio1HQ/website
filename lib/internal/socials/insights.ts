/**
 * What an imported analytics export adds to a month's row (social_metrics
 * .insights): the month's other totals, its days, its best posts, who the
 * audience is, and which files it came from. Pure, and shared by the import
 * dialog, the server action (cleanInsights checks what the browser sent)
 * and the page.
 */

/** Month totals beyond followers, impressions, engagements and posts. */
export const STATS = [
  { key: "reach", label: "Members reached", x: "Reach", yt: "Reach" },
  {
    key: "new_followers",
    label: "New followers",
    x: "New follows",
    yt: "Net subscribers",
  },
  {
    key: "lost_followers",
    label: "Unfollows",
    x: "Unfollows",
    yt: "Subscribers lost",
  },
  { key: "video_views", label: "Video views", x: "Video views", yt: "Views" },
  {
    key: "watch_minutes",
    label: "Watch time",
    x: "Watch time",
    yt: "Watch time",
  },
  { key: "reactions", label: "Reactions", x: "Likes", yt: "Likes" },
  { key: "comments", label: "Comments", x: "Replies", yt: "Comments" },
  { key: "reposts", label: "Reposts", x: "Reposts", yt: "Reposts" },
  { key: "saves", label: "Saves", x: "Bookmarks", yt: "Saves" },
  { key: "shares", label: "Sends", x: "Shares", yt: "Shares" },
  { key: "clicks", label: "Clicks", x: "Link clicks", yt: "Clicks" },
  {
    key: "profile_views",
    label: "Profile visits",
    x: "Profile visits",
    yt: "Channel visits",
  },
  { key: "page_views", label: "Page views", x: "Page views", yt: "Page views" },
] as const;
export type StatKey = (typeof STATS)[number]["key"];

export function isStatKey(value: unknown): value is StatKey {
  return STATS.some((stat) => stat.key === value);
}

/** What the platform calls it: X says Likes where LinkedIn says Reactions. */
export function statLabel(key: StatKey, platform: string) {
  const stat = STATS.find((item) => item.key === key);
  if (!stat) return key;
  return platform === "x"
    ? stat.x
    : platform === "youtube"
      ? stat.yt
      : stat.label;
}

/** A stat as the page shows it: watch time in hours, the rest as counts. */
export function statText(key: StatKey, value: number) {
  return key === "watch_minutes"
    ? `${(value / 60).toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} h`
    : value.toLocaleString("en-US");
}

export type DailyPoint = {
  /** "YYYY-MM-DD". */
  day: string;
  impressions?: number;
  engagements?: number;
  new_followers?: number;
  /** Video views (YouTube's views a day). */
  views?: number;
};

export type TopPost = {
  url: string | null;
  /** When it was published, "YYYY-MM-DD". */
  day: string | null;
  text: string;
  impressions: number | null;
  engagements: number | null;
  /** Video views (YouTube). */
  views?: number | null;
};

/** followers: who follows; viewers: who saw the posts; visitors: who opened the page. */
export const DEMOGRAPHIC_KINDS = ["followers", "viewers", "visitors"] as const;
export type DemographicKind = (typeof DEMOGRAPHIC_KINDS)[number];

export const DEMOGRAPHIC_LABELS: Record<DemographicKind, string> = {
  followers: "Followers",
  viewers: "Who saw the posts",
  visitors: "Page visitors",
};

export type DemographicGroup = {
  /** "Location", "Job title", "Industry", … */
  group: string;
  /** Biggest first; share is a percent of the whole (0.5 for "< 1%"). */
  items: { name: string; share: number }[];
};

export type Demographics = {
  kind: DemographicKind;
  /** The day the export was made up to, "YYYY-MM-DD". */
  as_of: string | null;
  groups: DemographicGroup[];
};

export type ImportSource = {
  /** "LinkedIn profile analytics", "X analytics", … */
  label: string;
  /** The file's name. */
  file: string;
  from: string | null;
  to: string | null;
  /** Days of the month the file had, and the month's days (so far). */
  days: number;
  of: number;
  /** When it was imported, "YYYY-MM-DD". */
  at: string;
};

export type SocialInsights = {
  stats?: Partial<Record<StatKey, number>>;
  daily?: DailyPoint[];
  /**
   * The month's best posts. `posts_measure`: "month" when the numbers are
   * what each post did in the month (LinkedIn's profile export, which can
   * list older posts too); "lifetime" when they're each post's totals so
   * far (posts published that month).
   */
  posts?: TopPost[];
  posts_measure?: "month" | "lifetime";
  demographics?: Demographics[];
  sources?: ImportSource[];
};

export const MAX_POSTS = 5;
const MAX_ITEMS = 8;
const MAX_GROUPS = 8;
const MAX_SOURCES = 8;
const BIG = 9_000_000_000_000;

const isDay = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);

function count(value: unknown): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(number) && number >= 0 && number <= BIG
    ? Math.round(number)
    : undefined;
}

function line(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function link(value: unknown): string | null {
  const text = line(value, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Audience groups, most telling first: the page opens on the first, and
 * "Company" (every employer a sliver) says least. Others go last.
 */
const GROUP_ORDER = [
  "job title",
  "job function",
  "location",
  "country",
  "region",
  "industry",
  "seniority",
  "company size",
  "company",
];

function groupRank(group: string) {
  const rank = GROUP_ORDER.indexOf(group.toLowerCase());
  return rank < 0 ? GROUP_ORDER.length : rank;
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Only what the page knows how to show, in sizes it can hold: anything
 * else the browser sent is dropped. Returns {} for nothing usable.
 */
export function cleanInsights(value: unknown): SocialInsights {
  const input = object(value);
  const out: SocialInsights = {};

  // In STATS order: Postgres hands jsonb keys back shortest first.
  const stats: Partial<Record<StatKey, number>> = {};
  const rawStats = object(input.stats);
  for (const { key } of STATS) {
    const number = count(rawStats[key]);
    if (number !== undefined) stats[key] = number;
  }
  if (Object.keys(stats).length) out.stats = stats;

  const days = new Map<string, DailyPoint>();
  for (const raw of list(input.daily).slice(0, 62)) {
    const item = object(raw);
    if (!isDay(item.day)) continue;
    const point: DailyPoint = { day: item.day };
    for (const key of [
      "impressions",
      "engagements",
      "new_followers",
      "views",
    ] as const) {
      const number = count(item[key]);
      if (number !== undefined) point[key] = number;
    }
    days.set(point.day, point);
  }
  if (days.size)
    out.daily = [...days.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-31);

  const posts = list(input.posts)
    .slice(0, MAX_POSTS)
    .map((raw): TopPost | null => {
      const item = object(raw);
      const post: TopPost = {
        url: link(item.url),
        day: isDay(item.day) ? item.day : null,
        text: line(item.text, 200),
        impressions: count(item.impressions) ?? null,
        engagements: count(item.engagements) ?? null,
      };
      const views = count(item.views);
      if (views !== undefined) post.views = views;
      return post.url || post.text ? post : null;
    })
    .filter((post): post is TopPost => post !== null);
  if (posts.length) {
    out.posts = posts;
    out.posts_measure = input.posts_measure === "month" ? "month" : "lifetime";
  }

  const demographics = new Map<DemographicKind, Demographics>();
  for (const raw of list(input.demographics).slice(
    0,
    DEMOGRAPHIC_KINDS.length * 2,
  )) {
    const item = object(raw);
    const kind = DEMOGRAPHIC_KINDS.find((value) => value === item.kind);
    if (!kind) continue;
    const groups = list(item.groups)
      .slice(0, MAX_GROUPS)
      .map((rawGroup): DemographicGroup | null => {
        const group = object(rawGroup);
        const name = line(group.group, 40);
        const items = list(group.items)
          .map((rawItem) => {
            const entry = object(rawItem);
            const share =
              typeof entry.share === "number" && Number.isFinite(entry.share)
                ? entry.share
                : NaN;
            return {
              name: line(entry.name, 120),
              share: Math.round(Math.min(Math.max(share, 0), 100) * 10) / 10,
            };
          })
          .filter((entry) => entry.name && Number.isFinite(entry.share))
          .slice(0, MAX_ITEMS);
        return name && items.length ? { group: name, items } : null;
      })
      .filter((group): group is DemographicGroup => group !== null)
      .sort((a, b) => groupRank(a.group) - groupRank(b.group));
    if (groups.length)
      demographics.set(kind, {
        kind,
        as_of: isDay(item.as_of) ? item.as_of : null,
        groups,
      });
  }
  if (demographics.size) out.demographics = [...demographics.values()];

  const sources = list(input.sources)
    .slice(0, MAX_SOURCES)
    .map((raw): ImportSource | null => {
      const item = object(raw);
      const label = line(item.label, 60);
      if (!label || !isDay(item.at)) return null;
      return {
        label,
        file: line(item.file, 120),
        from: isDay(item.from) ? item.from : null,
        to: isDay(item.to) ? item.to : null,
        days: Math.min(count(item.days) ?? 0, 31),
        of: Math.min(count(item.of) ?? 0, 31),
        at: item.at,
      };
    })
    .filter((source): source is ImportSource => source !== null);
  if (sources.length) out.sources = sources;

  return out;
}

/**
 * A new import over what the month had: its totals and days win field by
 * field, its posts and audience replace the old ones (when it has any), and
 * a file of the same kind replaces the one before.
 */
export function mergeInsights(
  before: SocialInsights,
  next: SocialInsights,
): SocialInsights {
  const out: SocialInsights = {};
  const stats = { ...before.stats, ...next.stats };
  if (Object.keys(stats).length) out.stats = stats;

  const days = new Map((before.daily ?? []).map((point) => [point.day, point]));
  for (const point of next.daily ?? [])
    days.set(point.day, { ...days.get(point.day), ...point });
  if (days.size)
    out.daily = [...days.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-31);

  if (next.posts?.length) {
    out.posts = next.posts;
    out.posts_measure = next.posts_measure ?? "lifetime";
  } else if (before.posts?.length) {
    out.posts = before.posts;
    out.posts_measure = before.posts_measure ?? "lifetime";
  }

  const demographics = new Map(
    (before.demographics ?? []).map((item) => [item.kind, item]),
  );
  for (const item of next.demographics ?? []) demographics.set(item.kind, item);
  if (demographics.size) out.demographics = [...demographics.values()];

  const sources = new Map(
    (before.sources ?? []).map((item) => [item.label, item]),
  );
  for (const item of next.sources ?? []) sources.set(item.label, item);
  if (sources.size) out.sources = [...sources.values()].slice(-MAX_SOURCES);

  return out;
}

/** A share as the page shows it: "<1%", "12%". */
export function shareText(share: number) {
  return share < 1 ? "<1%" : `${Math.round(share)}%`;
}
