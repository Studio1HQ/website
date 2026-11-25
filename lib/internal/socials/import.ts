import type { Cell, Sheet } from "@/lib/internal/socials/sheets";
import {
  MAX_POSTS,
  STATS,
  type DailyPoint,
  type DemographicGroup,
  type DemographicKind,
  type Demographics,
  type ImportSource,
  type SocialInsights,
  type StatKey,
  type TopPost,
} from "@/lib/internal/socials/insights";

/**
 * Makes sense of LinkedIn and X analytics exports, by their column names
 * rather than their exact layout (both change them now and then):
 *
 * - LinkedIn profile ("AggregateAnalytics_….xlsx"): daily impressions and
 *   engagements, new followers and the total, top posts, demographics.
 * - LinkedIn Page (".xls" from Page analytics → Export): Content (daily
 *   metrics, all posts), Followers (new followers a day, demographics),
 *   Visitors (page views a day, demographics).
 * - X (".csv" from Analytics → Export): the account overview (a row a
 *   day) and the posts (a row a post), today's and the older layout.
 *
 * parseExport reads one file's sheets; buildMonth turns the files for a
 * platform into one month's numbers. Pure.
 */

export type ImportPlatform = "linkedin" | "x" | "youtube";

type Metric = "impressions" | "engagements" | "posts" | "followers" | StatKey;
type Numbers = Partial<Record<Metric, number>>;

export type DayNumbers = { day: string } & Numbers;
export type PostNumbers = {
  url: string | null;
  day: string | null;
  text: string;
} & Numbers;

export type ParsedExport = {
  file: string;
  platform: ImportPlatform;
  label: string;
  /** What was found, for the preview: "31 days", "12 posts", … */
  found: string[];
  /** The days the export covers. */
  from: string | null;
  to: string | null;
  daily: DayNumbers[];
  posts: PostNumbers[];
  /**
   * "month": each post's numbers are what it did within from–to (and older
   * posts can be listed). "lifetime": posts published in the range, with
   * their totals so far.
   */
  postNumbers: "month" | "lifetime";
  /** A list hit the export's cap, so it may not hold every post. */
  postsCapped: boolean;
  /** Totals for the whole range (LinkedIn's "Members reached"). */
  periodStats: Numbers;
  /** LinkedIn's "Total followers on <day>". */
  followerTotal: { day: string; count: number } | null;
  demographics: Demographics[];
};

export type ParseResult =
  { ok: true; export: ParsedExport } | { ok: false; message: string };

// ---------------------------------------------------------------- cells

/** "Impressions (total)" → "impressions total". */
export function norm(cell: Cell): string {
  return String(cell ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

/** "1,234" → 1234, "12%" → 12, "< 1%" → 0.5; null when it isn't a number. */
export function toNumber(cell: Cell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell !== "string") return null;
  const text = cell.trim();
  if (/^<\s*1\s*%$/.test(text)) return 0.5;
  const plain = text.replace(/[,\s%]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(plain)) return null;
  return Number(plain);
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function isoDay(year: number, month: number, day: number): string | null {
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  if (year < 2000 || year > 2100) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * A cell as "YYYY-MM-DD": ISO dates and times, 11/15/2026 (15/11/2026 with
 * `dayFirst`), "Sat, Nov 15, 2026", "15 Nov 2026", or an Excel day number.
 */
export function toDay(cell: Cell, dayFirst = false): string | null {
  if (typeof cell === "number") {
    if (cell > 20_000 && cell < 80_000) {
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(cell) * 86_400_000)
        .toISOString()
        .slice(0, 10);
    }
    return null;
  }
  if (typeof cell !== "string") return null;
  const text = cell.trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match)
    return isoDay(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (match) {
    const [a, b] = [Number(match[1]), Number(match[2])];
    return dayFirst || a > 12
      ? isoDay(Number(match[3]), b, a)
      : isoDay(Number(match[3]), a, b);
  }
  const words = text.toLowerCase().replace(/^[a-z]+,\s*/, "");
  match = words.match(
    /^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/,
  );
  if (match && MONTHS.includes(match[1]))
    return isoDay(
      Number(match[3]),
      MONTHS.indexOf(match[1]) + 1,
      Number(match[2]),
    );
  match = words.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/,
  );
  if (match && MONTHS.includes(match[2]))
    return isoDay(
      Number(match[3]),
      MONTHS.indexOf(match[2]) + 1,
      Number(match[1]),
    );
  return null;
}

/** Whether a column of dates is written day first (some value starts above 12). */
function dayFirstColumn(cells: Cell[]) {
  return cells.some((cell) => {
    const match =
      typeof cell === "string"
        ? cell.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/)
        : null;
    return match ? Number(match[1]) > 12 : false;
  });
}

// ---------------------------------------------------------------- columns

/** Each measure's column names, best first (LinkedIn Page's "(total)" before "(organic)"). */
const COLUMNS: [Metric, string[]][] = [
  [
    "impressions",
    [
      "impressions total",
      "impressions",
      "total impressions",
      "thumbnail impressions",
      "impressions organic",
    ],
  ],
  ["engagements", ["engagements", "engagements total", "total engagements"]],
  ["reach", ["members reached"]],
  [
    "new_followers",
    [
      "new followers",
      "new follows",
      "followers gained",
      "follows",
      // YouTube's "Subscribers" is the net change.
      "subscribers",
      "subscribers gained",
    ],
  ],
  ["lost_followers", ["unfollows", "lost followers", "subscribers lost"]],
  ["reactions", ["reactions total", "reactions", "likes", "reactions organic"]],
  ["comments", ["comments total", "comments", "replies", "comments organic"]],
  [
    "reposts",
    ["reposts total", "reposts", "retweets", "shares total", "reposts organic"],
  ],
  ["saves", ["saves", "bookmarks"]],
  ["shares", ["sends", "shares"]],
  [
    "clicks",
    [
      "clicks total",
      "clicks",
      "url clicks",
      "link clicks",
      "visits to links",
      "clicks organic",
    ],
  ],
  [
    "profile_views",
    [
      "profile visits",
      "user profile clicks",
      "profile viewers",
      "profile clicks",
    ],
  ],
  [
    "page_views",
    [
      "total page views total",
      "page views total",
      "total page views",
      "page views",
    ],
  ],
  ["video_views", ["video views", "views"]],
  ["watch_minutes", ["watch time minutes"]],
  ["posts", ["create post", "tweets published", "posts published"]],
];

const DAY_COLUMN = ["date", "day"];
const POST_DAY = [
  "video publish time",
  "post publish date",
  "created date",
  "publish date",
  "published date",
  "date",
  "time",
];
const POST_URL = [
  "post link",
  "post url",
  "tweet permalink",
  "permalink",
  "update link",
  "link",
  "url",
];
const POST_TEXT = [
  "post title",
  "post text",
  "tweet text",
  "update title",
  "video title",
  "text",
  "content",
];
const POST_ID = ["post id", "tweet id"];
const FOLLOWER_PARTS = [
  "sponsored followers",
  "organic followers",
  "auto invited followers",
];
const DEMOGRAPHIC_SHEETS = [
  "location",
  "country",
  "region",
  "job function",
  "job title",
  "seniority",
  "industry",
  "company size",
  "company",
];

function find(
  header: string[],
  names: string[],
  from = 0,
  to = header.length,
): number {
  for (const name of names) {
    const index = header.findIndex(
      (cell, at) => at >= from && at < to && cell === name,
    );
    if (index >= 0) return index;
  }
  return -1;
}

/** Where each measure is in a header row (between from and to). */
function metricColumns(header: string[], from = 0, to = header.length) {
  const columns: [Metric, number][] = [];
  const used = new Set<number>();
  for (const [metric, names] of COLUMNS) {
    const index = find(header, names, from, to);
    if (index >= 0 && !used.has(index)) {
      used.add(index);
      columns.push([metric, index]);
    }
  }
  return columns;
}

/** The first row (of the first 15) that looks like a header: a date column and a measure. */
function headerRow(rows: Cell[][]): number {
  for (let index = 0; index < Math.min(rows.length, 15); index++) {
    const header = rows[index].map(norm);
    const dated = find(header, [...DAY_COLUMN, ...POST_DAY]) >= 0;
    const named = find(header, [...POST_URL, ...POST_TEXT, ...POST_ID]) >= 0;
    if (
      (dated || named) &&
      (metricColumns(header).length > 0 || header.includes("total followers"))
    )
      return index;
  }
  return -1;
}

// ---------------------------------------------------------------- sheets

type Parts = {
  daily: DayNumbers[];
  posts: PostNumbers[];
  capped: boolean;
  periodStats: Numbers;
  period: { from: string; to: string } | null;
  followerTotal: { day: string | null; count: number } | null;
  demographics: { kind: DemographicKind; groups: DemographicGroup[] }[];
};

/** A row's measures; YouTube's watch time comes in hours and is kept in minutes. */
function numbersOf(
  header: string[],
  row: Cell[],
  columns: [Metric, number][],
): Numbers {
  const numbers: Numbers = {};
  for (const [metric, index] of columns) {
    const value = toNumber(row[index]);
    if (value !== null) numbers[metric] = value;
  }
  const hoursAt = header.indexOf("watch time hours");
  const hours = hoursAt >= 0 ? toNumber(row[hoursAt]) : null;
  if (hours !== null && numbers.watch_minutes === undefined)
    numbers.watch_minutes = hours * 60;
  return numbers;
}

function dailyRows(rows: Cell[][], at: number): DayNumbers[] {
  const header = rows[at].map(norm);
  const dayAt = find(header, DAY_COLUMN);
  if (dayAt < 0) return [];
  const columns = metricColumns(header);
  const totalAt = header.indexOf("total followers");
  const partsAt = FOLLOWER_PARTS.map((name) => header.indexOf(name)).filter(
    (index) => index >= 0,
  );
  const body = rows.slice(at + 1);
  const dayFirst = dayFirstColumn(body.map((row) => row[dayAt]));

  // LinkedIn Page's "Total followers" is the day's new followers (all
  // kinds) when it matches the parts, else the running total.
  let totalIs: "new" | "count" | null = null;
  if (totalAt >= 0) {
    const values = body
      .map((row) => toNumber(row[totalAt]))
      .filter((value): value is number => value !== null);
    const matchesParts =
      partsAt.length > 0 &&
      body.every((row) => {
        const total = toNumber(row[totalAt]);
        const parts = partsAt.reduce(
          (sum, index) => sum + (toNumber(row[index]) ?? 0),
          0,
        );
        return total === null || Math.abs(total - parts) < 0.5;
      });
    const rising = values.every(
      (value, index) => index === 0 || value >= values[index - 1],
    );
    totalIs = matchesParts
      ? "new"
      : rising && (values[0] ?? 0) >= 50
        ? "count"
        : "new";
  }

  const days: DayNumbers[] = [];
  for (const row of body) {
    const day = toDay(row[dayAt], dayFirst);
    if (!day) continue;
    const numbers: DayNumbers = { day, ...numbersOf(header, row, columns) };
    if (totalAt >= 0) {
      const total = toNumber(row[totalAt]);
      if (total !== null) {
        if (totalIs === "count") numbers.followers = total;
        else numbers.new_followers ??= total;
      }
    } else if (partsAt.length && numbers.new_followers === undefined) {
      numbers.new_followers = partsAt.reduce(
        (sum, index) => sum + (toNumber(row[index]) ?? 0),
        0,
      );
    }
    days.push(numbers);
  }
  return days;
}

function postRows(rows: Cell[][], at: number): PostNumbers[] {
  const header = rows[at].map(norm);
  // LinkedIn's "TOP POSTS" puts two lists side by side, each from a Post URL column.
  const starts = header.flatMap((cell, index) =>
    POST_URL.includes(cell) ? [index] : [],
  );
  const blocks =
    starts.length > 1
      ? starts.map((start, index) => [
          start,
          starts[index + 1] ?? header.length,
        ])
      : [[0, header.length]];
  const body = rows
    .slice(at + 1)
    // YouTube's table starts with the period's "Total" row.
    .filter((row) => norm(row[0]) !== "total");
  // YouTube's "Content" column is the video's id.
  const videoAt = header.includes("video title")
    ? header.indexOf("content")
    : -1;
  const posts: PostNumbers[] = [];
  for (const [from, to] of blocks) {
    const urlAt = find(header, POST_URL, from, to);
    const textAt = find(header, POST_TEXT, from, to);
    const idAt = find(header, POST_ID, from, to);
    const dayAt = find(header, POST_DAY, from, to);
    const columns = metricColumns(header, from, to);
    const dayFirst =
      dayAt >= 0 && dayFirstColumn(body.map((row) => row[dayAt]));
    for (const row of body) {
      const raw = urlAt >= 0 ? String(row[urlAt] ?? "").trim() : "";
      const id = idAt >= 0 ? String(row[idAt] ?? "").replace(/\D/g, "") : "";
      const video = videoAt >= 0 ? String(row[videoAt] ?? "").trim() : "";
      const url = /^https?:\/\//i.test(raw)
        ? raw
        : /^[\w-]{11}$/.test(video)
          ? `https://www.youtube.com/watch?v=${video}`
          : id
            ? `https://x.com/i/status/${id}`
            : null;
      const text =
        textAt >= 0
          ? String(row[textAt] ?? "")
              .replace(/\s+/g, " ")
              .trim()
          : "";
      if (!url && !text) continue;
      posts.push({
        url,
        text,
        day: dayAt >= 0 ? toDay(row[dayAt], dayFirst) : null,
        ...numbersOf(header, row, columns),
      });
    }
  }
  return posts;
}

/** "Top Demographics | Value | Percentage" (LinkedIn profile). */
function topDemographics(rows: Cell[][]): DemographicGroup[] | null {
  const header = (rows[0] ?? []).map(norm);
  if (header[0] !== "top demographics") return null;
  const groups = new Map<string, DemographicGroup["items"]>();
  for (const row of rows.slice(1)) {
    const group = String(row[0] ?? "").trim();
    const name = String(row[1] ?? "").trim();
    const share = toNumber(row[2]);
    if (!group || !name || share === null) continue;
    groups.set(group, [...(groups.get(group) ?? []), { name, share }]);
  }
  return [...groups.entries()].map(([group, items]) => ({
    group,
    items: items.sort((a, b) => b.share - a.share),
  }));
}

/** A LinkedIn Page sheet like "Location | Total followers" (or "Total views"). */
function countSheet(
  sheet: Sheet,
): { kind: DemographicKind; group: DemographicGroup } | null {
  const name = norm(sheet.name);
  if (!DEMOGRAPHIC_SHEETS.includes(name)) return null;
  const at = sheet.rows.findIndex(
    (row) => row.length >= 2 && /followers|views|visitors/.test(norm(row[1])),
  );
  if (at < 0) return null;
  const kind: DemographicKind = /followers/.test(norm(sheet.rows[at][1]))
    ? "followers"
    : "visitors";
  const items = sheet.rows
    .slice(at + 1)
    .map((row) => ({
      name: String(row[0] ?? "").trim(),
      count: toNumber(row[1]) ?? 0,
    }))
    .filter((item) => item.name && item.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return null;
  return {
    kind,
    group: {
      group: sheet.name.trim(),
      items: items
        .sort((a, b) => b.count - a.count)
        .map((item) => ({
          name: item.name,
          share: Math.round((item.count / total) * 1000) / 10,
        })),
    },
  };
}

/** "Overall Performance | 10/1/2026 - 10/31/2026", then "Impressions | 71065" rows. */
function periodSheet(rows: Cell[][]) {
  let period: { from: string; to: string } | null = null;
  const stats: Numbers = {};
  for (const row of rows.slice(0, 12)) {
    for (const cell of row) {
      const parts = typeof cell === "string" ? cell.split(/\s+[-–]\s+/) : [];
      if (parts.length === 2) {
        const from = toDay(parts[0]);
        const to = toDay(parts[1]);
        if (from && to) period = { from, to };
      }
    }
    if (row.length >= 2 && toNumber(row[1]) !== null) {
      const key = norm(row[0]);
      const metric = COLUMNS.find(([, names]) => names.includes(key))?.[0];
      if (metric) stats[metric] = toNumber(row[1]) ?? undefined;
    }
  }
  return period ? { period, stats } : null;
}

function readSheet(sheet: Sheet, parts: Parts) {
  const rows = sheet.rows;
  for (const row of rows.slice(0, 6)) {
    const match = norm(row[0]).match(/^total followers(?: on| as of)?(.*)$/);
    const count = row
      .slice(1)
      .map(toNumber)
      .find((value) => value !== null);
    if (match && count !== undefined && count !== null) {
      const label = String(row[0])
        .replace(/^\s*total followers\s*(on|as of)?\s*/i, "")
        .replace(/:\s*$/, "");
      parts.followerTotal = { day: toDay(label), count };
    }
  }
  const top = topDemographics(rows);
  if (top) {
    parts.demographics.push({
      kind: /content|viewer/i.test(sheet.name) ? "viewers" : "followers",
      groups: top,
    });
    return;
  }
  const counted = countSheet(sheet);
  if (counted) {
    const same = parts.demographics.find((item) => item.kind === counted.kind);
    if (same) same.groups.push(counted.group);
    else
      parts.demographics.push({ kind: counted.kind, groups: [counted.group] });
    return;
  }
  const at = headerRow(rows);
  if (at >= 0) {
    const header = rows[at].map(norm);
    // YouTube's "Chart data": a few videos' days, already in "Totals".
    if (find(header, DAY_COLUMN) >= 0 && header.includes("video title")) return;
    const isPosts = find(header, [...POST_URL, ...POST_TEXT, ...POST_ID]) >= 0;
    if (isPosts) {
      const total = rows.slice(at + 1).find((row) => norm(row[0]) === "total");
      if (total)
        Object.assign(
          parts.periodStats,
          numbersOf(header, total, metricColumns(header)),
        );
      const posts = postRows(rows, at);
      // LinkedIn says "Maximum of 50 posts available to include in this list".
      const cap = Number(
        String(rows[0]?.[0] ?? "").match(/maximum of (\d+)/i)?.[1] ?? NaN,
      );
      if (Number.isFinite(cap) && Math.max(0, ...countPerList(rows, at)) >= cap)
        parts.capped = true;
      parts.posts.push(...posts);
    } else parts.daily.push(...dailyRows(rows, at));
    return;
  }
  const period = periodSheet(rows);
  if (period) {
    parts.period = period.period;
    Object.assign(parts.periodStats, period.stats);
  }
}

function countPerList(rows: Cell[][], at: number): number[] {
  const header = rows[at].map(norm);
  const starts = header.flatMap((cell, index) =>
    POST_URL.includes(cell) ? [index] : [],
  );
  return (starts.length ? starts : [0]).map(
    (start) =>
      rows.slice(at + 1).filter((row) => String(row[start] ?? "").trim())
        .length,
  );
}

// ---------------------------------------------------------------- a file

const LINKEDIN_SIGNS =
  /members reached|reactions|sends|organic|sponsored|page views|top demographics|total followers on|linkedin\.com|job function|seniority|company size|auto invited/;
const YOUTUBE_SIGNS =
  /video title|video publish time|watch time|thumbnail impressions|youtube\.com/;
const X_SIGNS =
  /bookmarks|new follows|unfollows|profile visits|tweet|create post|detail expands|url clicks|permalink clicks|x\.com\/|twitter\.com\//;

function platformOf(file: string, sheets: Sheet[]): ImportPlatform | null {
  const name = file.toLowerCase();
  // LinkedIn Page files are "<page>_content_<timestamp>.xls" (or followers, visitors).
  let linkedin =
    /aggregateanalytics|linkedin|_(content|followers|visitors|updates)_\d{10,}/.test(
      name,
    )
      ? 3
      : 0;
  let x =
    /account_analytics|account_overview|tweet_activity|twitter|(^|[^a-z])x[_ -]analytics/.test(
      name,
    )
      ? 3
      : 0;
  // YouTube Studio's export is "Content <from>_<to> <channel>.zip".
  let youtube = /youtube|^content \d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}/.test(
    name,
  )
    ? 3
    : 0;
  for (const sheet of sheets) {
    const text = [
      norm(sheet.name),
      ...sheet.rows
        .slice(0, 8)
        .flat()
        .map((cell) => String(cell ?? "").toLowerCase()),
    ].join(" | ");
    linkedin += (text.match(new RegExp(LINKEDIN_SIGNS, "g")) ?? []).length;
    x += (text.match(new RegExp(X_SIGNS, "g")) ?? []).length;
    youtube += (text.match(new RegExp(YOUTUBE_SIGNS, "g")) ?? []).length;
  }
  const best = Math.max(linkedin, x, youtube);
  if (!best) return null;
  return linkedin === best ? "linkedin" : x === best ? "x" : "youtube";
}

function minMax(days: (string | null)[]) {
  const sorted = days.filter((day): day is string => Boolean(day)).sort();
  return sorted.length
    ? { from: sorted[0], to: sorted[sorted.length - 1] }
    : null;
}

/** One export file's sheets, read. */
/**
 * A LinkedIn Page export has no engagements column, for days or posts:
 * clicks, reactions, comments and reposts are its engagements.
 */
function withEngagements<T extends Numbers>(item: T): T {
  if (item.engagements !== undefined) return item;
  const parts = [item.clicks, item.reactions, item.comments, item.reposts];
  if (parts.every((value) => value === undefined)) return item;
  return {
    ...item,
    engagements: parts.reduce<number>((sum, value) => sum + (value ?? 0), 0),
  };
}

export function parseExport(file: string, sheets: Sheet[]): ParseResult {
  const platform = platformOf(file, sheets);
  const parts: Parts = {
    daily: [],
    posts: [],
    capped: false,
    periodStats: {},
    period: null,
    followerTotal: null,
    demographics: [],
  };
  for (const sheet of sheets) readSheet(sheet, parts);
  // One entry a day: a profile export has impressions and followers on separate sheets.
  const byDay = new Map<string, DayNumbers>();
  for (const item of parts.daily)
    byDay.set(item.day, { ...byDay.get(item.day), ...item });
  parts.daily = [...byDay.values()]
    .map(withEngagements)
    .sort((a, b) => a.day.localeCompare(b.day));
  parts.posts = parts.posts.map(withEngagements);

  const anything =
    parts.daily.length ||
    parts.posts.length ||
    parts.followerTotal ||
    parts.demographics.length ||
    Object.keys(parts.periodStats).length;
  if (!platform || !anything) {
    return {
      ok: false,
      message: `${file}: this doesn't look like a LinkedIn or X analytics export. Export it again from the analytics page and add the file as it downloads.`,
    };
  }

  const named = file.match(/(\d{4}-\d{2}-\d{2})[_ ]+(\d{4}-\d{2}-\d{2})/);
  const range =
    parts.period ??
    (named ? { from: named[1], to: named[2] } : null) ??
    minMax(parts.daily.map((item) => item.day)) ??
    minMax(parts.posts.map((item) => item.day));
  const profile =
    platform === "linkedin" &&
    (Boolean(parts.period) ||
      parts.demographics.some((item) => item.kind === "viewers"));
  const label =
    platform === "x"
      ? "X analytics"
      : platform === "youtube"
        ? "YouTube Studio analytics"
        : profile
          ? "LinkedIn profile analytics"
          : "LinkedIn Page analytics";
  const postWord = platform === "youtube" ? "video" : "post";

  const days = new Set(parts.daily.map((item) => item.day)).size;
  const found = [
    days ? `${days} day${days === 1 ? "" : "s"} of numbers` : "",
    parts.posts.length
      ? `${parts.posts.length} ${postWord}${parts.posts.length === 1 ? "" : "s"}`
      : "",
    parts.followerTotal ? "the follower total" : "",
    parts.demographics.length ? "who the audience is" : "",
  ].filter(Boolean);

  return {
    ok: true,
    export: {
      file,
      platform,
      label,
      found,
      from: range?.from ?? null,
      to: range?.to ?? null,
      daily: parts.daily,
      posts: parts.posts,
      // LinkedIn profile and YouTube give each post's numbers for the dates.
      postNumbers: profile || platform === "youtube" ? "month" : "lifetime",
      postsCapped: parts.capped,
      periodStats: parts.periodStats,
      followerTotal: parts.followerTotal
        ? {
            day: parts.followerTotal.day ?? range?.to ?? "",
            count: parts.followerTotal.count,
          }
        : null,
      demographics: parts.demographics.map((item) => ({
        kind: item.kind,
        as_of: range?.to ?? null,
        groups: item.groups,
      })),
    },
  };
}

// ---------------------------------------------------------------- a month

export function daysInMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

function lastDay(month: string) {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

function addDays(day: string, n: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/**
 * The month's days to count: all of them, or up to yesterday in this month
 * (exports run to the day before they're made).
 */
function daysToCount(month: string, today: string) {
  return today.startsWith(month)
    ? Number(today.slice(8, 10)) - 1
    : daysInMonth(month);
}

const within = (file: ParsedExport, month: string) =>
  Boolean(
    file.from &&
    file.to &&
    file.from.startsWith(month) &&
    file.to.startsWith(month),
  );

/**
 * The file's dates are in the month, or nearly (four in five of them, and
 * it ends in the month): its totals for the dates count for the month.
 */
function mostly(file: ParsedExport, month: string) {
  if (!file.from || !file.to || !file.to.startsWith(month)) return false;
  if (file.from.startsWith(month)) return true;
  const days =
    (Date.parse(`${file.to}T00:00:00Z`) -
      Date.parse(`${file.from}T00:00:00Z`)) /
      86_400_000 +
    1;
  return Number(file.to.slice(8, 10)) / days >= 0.8;
}

export type MonthChoice = { month: string; days: number; of: number };

/**
 * The months the files have numbers for, newest first, with how many of
 * each month's days they cover (the best of any platform).
 */
export function monthsIn(files: ParsedExport[], today: string): MonthChoice[] {
  const days = new Map<string, Set<string>>();
  const touch = (month: string) => {
    const found = days.get(month) ?? new Set<string>();
    days.set(month, found);
    return found;
  };
  for (const file of files) {
    for (const item of file.daily)
      touch(item.day.slice(0, 7)).add(`${file.platform}:${item.day}`);
    for (const post of file.postNumbers === "lifetime" ? file.posts : [])
      if (post.day) touch(post.day.slice(0, 7));
    if (file.from && file.to && !file.daily.length) touch(file.to.slice(0, 7));
  }
  return (
    [...days.entries()]
      .filter(([month]) => month <= today.slice(0, 7))
      .map(([month, set]) => {
        const byPlatform = new Map<string, number>();
        for (const key of set)
          byPlatform.set(
            key.split(":")[0],
            (byPlatform.get(key.split(":")[0]) ?? 0) + 1,
          );
        const of = daysToCount(month, today);
        return {
          month,
          days: Math.min(Math.max(0, ...byPlatform.values()), of),
          of,
        };
      })
      // On the 1st, this month has no whole day yet.
      .filter((choice) => choice.of > 0)
      .sort((a, b) => b.month.localeCompare(a.month))
  );
}

/** The month to start on: the newest one the files cover fully, else the newest. */
export function defaultMonth(choices: MonthChoice[]): string | null {
  return (
    (choices.find((choice) => choice.days >= choice.of) ?? choices[0])?.month ??
    null
  );
}

export type MonthDraft = {
  platform: ImportPlatform;
  month: string;
  /** Days of the month with daily numbers, of the month's days (so far). */
  days: number;
  of: number;
  impressions: number | null;
  engagements: number | null;
  posts: number | null;
  /** Followers at the month's end, when the files say or it can be worked out. */
  followers: number | null;
  /** How followers was got, or why it wasn't. */
  followersNote: string;
  insights: SocialInsights;
  /** Things to know before saving. */
  notes: string[];
};

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const short = (day: string) => dayLabel.format(new Date(`${day}T00:00:00Z`));
const SUMMED: Metric[] = [
  "impressions",
  "engagements",
  "posts",
  ...STATS.map((stat) => stat.key),
];
const ENGAGEMENT_PARTS: Metric[] = [
  "clicks",
  "reactions",
  "comments",
  "reposts",
];

/**
 * One platform's month from its files. `previous` is last month's logged
 * followers (to carry X's net follows on from); `today` is "YYYY-MM-DD".
 */
export function buildMonth(
  files: ParsedExport[],
  platform: ImportPlatform,
  month: string,
  today: string,
  previous: { month: string; followers: number } | null,
  /** Take the audience from a file that ended any time after the month. */
  anyAudience = false,
): MonthDraft {
  const mine = files.filter((file) => file.platform === platform);
  const notes: string[] = [];
  const of = daysToCount(month, today);
  const end = lastDay(month);

  const byDay = new Map<string, DayNumbers>();
  for (const file of mine)
    for (const item of file.daily)
      byDay.set(item.day, { ...byDay.get(item.day), ...item });
  const monthDays = [...byDay.values()]
    .filter((item) => item.day.startsWith(month))
    .sort((a, b) => a.day.localeCompare(b.day));
  const days = Math.min(monthDays.length, of);

  const totals: Numbers = {};
  for (const metric of SUMMED) {
    const values = monthDays
      .map((item) => item[metric])
      .filter((value): value is number => value !== undefined);
    if (values.length)
      totals[metric] = values.reduce((sum, value) => sum + value, 0);
  }
  if (
    totals.engagements === undefined &&
    ENGAGEMENT_PARTS.some((metric) => totals[metric] !== undefined)
  ) {
    // LinkedIn Page has no engagements column: clicks, reactions, comments and reposts.
    totals.engagements = ENGAGEMENT_PARTS.reduce(
      (sum, metric) => sum + (totals[metric] ?? 0),
      0,
    );
  }
  for (const file of mine.filter((item) => mostly(item, month))) {
    for (const [metric, value] of Object.entries(file.periodStats) as [
      Metric,
      number,
    ][])
      totals[metric] ??= value;
  }

  // Posts: published this month (lifetime numbers), or the month's own list.
  const posts = new Map<string, PostNumbers>();
  let capped = false;
  let measure: "month" | "lifetime" = "lifetime";
  for (const file of mine) {
    const usable =
      file.postNumbers === "lifetime"
        ? file.posts.filter((post) => post.day?.startsWith(month))
        : mostly(file, month)
          ? file.posts
          : [];
    if (!usable.length) continue;
    if (file.postNumbers === "month") measure = "month";
    capped ||= file.postsCapped;
    for (const post of usable) {
      const key = post.url ?? `${post.day}:${post.text.slice(0, 80)}`;
      const before = posts.get(key);
      const merged: PostNumbers = { ...before, ...post };
      for (const metric of SUMMED) {
        const values = [before?.[metric], post[metric]].filter(
          (value): value is number => value !== undefined,
        );
        if (values.length) merged[metric] = Math.max(...values);
      }
      posts.set(key, merged);
    }
  }
  const postList = [...posts.values()];
  if (!monthDays.length && postList.length && measure === "lifetime") {
    for (const metric of ["impressions", "engagements"] as const) {
      const values = postList
        .map((post) => post[metric])
        .filter((value): value is number => value !== undefined);
      if (values.length)
        totals[metric] ??= values.reduce((sum, value) => sum + value, 0);
    }
    notes.push(
      `Impressions and engagements are added up from the ${postList.length} posts published in the month.`,
    );
  }
  let postCount = totals.posts ?? null;
  if (postCount === null && postList.length && !capped) {
    postCount =
      postList.filter((post) => post.day?.startsWith(month)).length || null;
  }

  // Followers at the end of the month.
  let followers: number | null = null;
  let followersNote = "";
  // The total nearest the month's end: the latest within it, else the first after it.
  const totalsKnown = mine
    .map((file) => file.followerTotal)
    .filter((item): item is { day: string; count: number } =>
      Boolean(item?.day && item.day >= `${month}-01`),
    )
    .sort((a, b) => a.day.localeCompare(b.day));
  const totalFile =
    totalsKnown.filter((item) => item.day <= end).pop() ??
    totalsKnown.find((item) => item.day > end);
  const counts = monthDays.filter((item) => item.followers !== undefined);
  if (totalFile && totalFile.day <= end) {
    followers = totalFile.count;
    followersNote = `The total on ${short(totalFile.day)}, from the file.`;
  } else if (totalFile) {
    const after: DayNumbers[] = [];
    for (
      let day = addDays(end, 1);
      day <= totalFile.day;
      day = addDays(day, 1)
    ) {
      const item = byDay.get(day);
      if (!item || item.new_followers === undefined) break;
      after.push(item);
    }
    const span = Math.round(
      (Date.parse(totalFile.day) - Date.parse(end)) / 86_400_000,
    );
    if (after.length === span) {
      const gained = after.reduce(
        (sum, item) =>
          sum + (item.new_followers ?? 0) - (item.lost_followers ?? 0),
        0,
      );
      followers = Math.max(0, totalFile.count - gained);
      followersNote = `${totalFile.count.toLocaleString("en-US")} on ${short(totalFile.day)}, less the ${gained.toLocaleString("en-US")} who followed after ${short(end)}.`;
    }
  } else if (counts.length) {
    followers = counts[counts.length - 1].followers ?? null;
    followersNote = `The total on ${short(counts[counts.length - 1].day)}, from the file.`;
  }
  if (
    followers === null &&
    days >= of &&
    totals.new_followers !== undefined &&
    previous
  ) {
    const lastMonth = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1),
    )
      .toISOString()
      .slice(0, 7);
    if (previous.month === lastMonth) {
      // LinkedIn counts new followers but not unfollows.
      const lost = totals.lost_followers;
      followers = Math.max(
        0,
        previous.followers + totals.new_followers - (lost ?? 0),
      );
      followersNote =
        lost === undefined
          ? `Last month's ${previous.followers.toLocaleString("en-US")}, plus ${totals.new_followers.toLocaleString("en-US")} new followers (the export doesn't count unfollows).`
          : `Last month's ${previous.followers.toLocaleString("en-US")}, plus ${totals.new_followers.toLocaleString("en-US")} new follows less ${lost.toLocaleString("en-US")} unfollows.`;
    }
  }
  if (followers === null) {
    followersNote =
      platform === "x"
        ? "X's export doesn't give the total. Add it from the profile."
        : "This export doesn't give the total. Add it from the page.";
  }

  if (days && days < of)
    notes.push(
      `The files have ${days} of the month's ${of} days, so the totals are for those days.`,
    );

  // Who the audience is: from a file made up to this month (or within a week after it).
  const fresh = (file: ParsedExport) =>
    !file.to ||
    (file.to >= `${month}-01` && (anyAudience || file.to <= addDays(end, 7)));
  const demographics = new Map<DemographicKind, Demographics>();
  for (const file of mine.filter(fresh))
    for (const item of file.demographics) demographics.set(item.kind, item);

  // YouTube's best videos are the most watched; elsewhere the most seen.
  const lead = (post: PostNumbers) =>
    (platform === "youtube" ? post.video_views : post.impressions) ?? -1;
  const top = postList
    .sort(
      (a, b) =>
        lead(b) - lead(a) ||
        (b.impressions ?? -1) - (a.impressions ?? -1) ||
        (b.engagements ?? -1) - (a.engagements ?? -1),
    )
    .slice(0, MAX_POSTS)
    .map((post): TopPost => {
      const item: TopPost = {
        url: post.url,
        day: post.day,
        text: post.text.slice(0, 200),
        impressions: post.impressions ?? null,
        engagements: post.engagements ?? null,
      };
      if (post.video_views !== undefined)
        item.views = Math.round(post.video_views);
      return item;
    });

  // Totals for dates that spill a little over the month's start.
  for (const file of mine.filter(
    (item) => mostly(item, month) && !within(item, month),
  )) {
    const totalsUsed = Object.keys(file.periodStats).length > 0;
    const postsUsed = file.postNumbers === "month" && file.posts.length > 0;
    if ((!totalsUsed && !postsUsed) || !file.from || !file.to) continue;
    const before = Math.round(
      (Date.parse(`${month}-01T00:00:00Z`) -
        Date.parse(`${file.from}T00:00:00Z`)) /
        86_400_000,
    );
    const what =
      platform === "youtube"
        ? "Watch time, subscribers, impressions and each video's numbers"
        : "The totals for the dates and each post's numbers";
    notes.push(
      `${what} are for the export's dates, ${short(file.from)} – ${short(file.to)}, ${before} of them before the month. Export the month on its own for exact numbers.`,
    );
  }

  const stats: Partial<Record<StatKey, number>> = {};
  for (const stat of STATS) {
    const value = totals[stat.key];
    if (value !== undefined) stats[stat.key] = Math.round(value);
  }
  const daily: DailyPoint[] = monthDays.map((item) => {
    const point: DailyPoint = { day: item.day };
    if (item.impressions !== undefined) point.impressions = item.impressions;
    if (item.engagements !== undefined) point.engagements = item.engagements;
    if (item.new_followers !== undefined)
      point.new_followers = item.new_followers;
    if (item.video_views !== undefined) point.views = item.video_views;
    return point;
  });
  const sources: ImportSource[] = mine
    .filter(
      (file) =>
        file.daily.some((item) => item.day.startsWith(month)) ||
        mostly(file, month) ||
        (file.postNumbers === "lifetime" &&
          file.posts.some((post) => post.day?.startsWith(month))) ||
        (file.demographics.length > 0 && fresh(file)) ||
        file.followerTotal?.day === totalFile?.day,
    )
    .map((file) => ({
      label: file.label,
      file: file.file.slice(0, 120),
      from: file.from,
      to: file.to,
      days: Math.min(
        new Set(
          file.daily
            .filter((item) => item.day.startsWith(month))
            .map((item) => item.day),
        ).size,
        of,
      ),
      of,
      at: today,
    }));

  const insights: SocialInsights = {};
  if (Object.keys(stats).length) insights.stats = stats;
  if (daily.some((point) => Object.keys(point).length > 1))
    insights.daily = daily;
  if (top.length) {
    insights.posts = top;
    insights.posts_measure = measure;
  }
  if (demographics.size) insights.demographics = [...demographics.values()];
  if (sources.length) insights.sources = sources;

  const round = (value: number | undefined) =>
    value === undefined ? null : Math.round(value);
  return {
    platform,
    month,
    days,
    of,
    impressions: round(totals.impressions),
    engagements: round(totals.engagements),
    posts: postCount,
    followers,
    followersNote,
    insights,
    notes,
  };
}

// ---------------------------------------------------------------- several months

/** The months the files cover from the first day to the last, oldest first. */
export function wholeMonths(choices: MonthChoice[]): string[] {
  return choices
    .filter((choice) => choice.days >= choice.of)
    .map((choice) => choice.month)
    .sort();
}

export type MonthPlan = { month: string; drafts: MonthDraft[] };

const monthName = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
});

function nextMonth(month: string, n: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + n, 1)).toISOString().slice(0, 7);
}

/**
 * Several whole months at once, oldest first, each with the platforms whose
 * files have all of its days. Followers at each month's end: what was typed
 * in, else what the files say, else what's logged. Where none of those has
 * it (X), it carries on from the month before (its total plus the net
 * follows) and back from the month after (its total less its net follows),
 * so one total typed in fills the rest.
 */
export function planMonths(
  files: ParsedExport[],
  platforms: ImportPlatform[],
  months: string[],
  today: string,
  followers: {
    typed: (platform: ImportPlatform, month: string) => number | null;
    logged: (platform: ImportPlatform, month: string) => number | null;
  },
): MonthPlan[] {
  const sorted = [...new Set(months)].sort();
  const byMonth = new Map<string, MonthDraft[]>(
    sorted.map((month) => [month, []]),
  );
  for (const platform of platforms) {
    const drafts: MonthDraft[] = [];
    const ends = new Map<string, number>();
    const endOf = (month: string) =>
      ends.get(month) ?? followers.logged(platform, month);
    for (const month of sorted) {
      const before = nextMonth(month, -1);
      const previous = endOf(before);
      const draft = buildMonth(
        files,
        platform,
        month,
        today,
        previous === null ? null : { month: before, followers: previous },
        // The newest month keeps the audience, even from a file made later.
        month === sorted[sorted.length - 1],
      );
      if (!draft.of || draft.days < draft.of) continue;
      drafts.push(draft);
      const end =
        followers.typed(platform, month) ??
        draft.followers ??
        followers.logged(platform, month);
      if (end !== null) ends.set(month, end);
    }
    for (let index = drafts.length - 2; index >= 0; index--) {
      const draft = drafts[index];
      const after = drafts[index + 1];
      const later = ends.get(after.month);
      const gained = after.insights.stats?.new_followers;
      const lost = after.insights.stats?.lost_followers;
      if (
        ends.has(draft.month) ||
        after.month !== nextMonth(draft.month, 1) ||
        later === undefined ||
        gained === undefined
      )
        continue;
      const end = Math.max(0, later - gained + (lost ?? 0));
      const laterName = monthName.format(
        new Date(`${after.month}-01T00:00:00Z`),
      );
      ends.set(draft.month, end);
      drafts[index] = {
        ...draft,
        followers: end,
        followersNote:
          lost === undefined
            ? `${laterName}'s ${later.toLocaleString("en-US")}, less its ${gained.toLocaleString("en-US")} new followers (the export doesn't count unfollows).`
            : `${laterName}'s ${later.toLocaleString("en-US")}, less its ${gained.toLocaleString("en-US")} new follows, plus its ${lost.toLocaleString("en-US")} unfollows.`,
      };
    }
    for (const draft of drafts) byMonth.get(draft.month)?.push(draft);
  }
  return sorted
    .map((month) => ({ month, drafts: byMonth.get(month) ?? [] }))
    .filter((plan) => plan.drafts.length > 0);
}
