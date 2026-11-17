import { parseCount } from "@/lib/internal/clients/clean";
import {
  COUNT_KEYS,
  formatInfo,
  type Channel,
  type Post,
  type Rate,
} from "@/lib/internal/influencers/schema";

/**
 * The sums behind the Influencers pages: reach, what a thousand views
 * costs (on paper from a rate card, and for real from the posts we paid
 * for), and which platform or format does best. Pure, so it's tested
 * (rules.test.ts); nothing here reads or writes.
 *
 * Money is never converted: every cost figure is for one currency.
 */

/** 950 → "950", 12400 → "12.4k", 1200000 → "1.2M". */
export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
  const short = (number: number, unit: string) =>
    `${Number(number.toFixed(1))}${unit}`;
  if (value >= 999_950) return short(value / 1_000_000, "M");
  if (value >= 1000) return short(value / 1000, "k");
  return String(Math.round(value));
}

/**
 * Turns "120k" and "1.2M" in the count fields into whole numbers, so the
 * usual field checks can take them. Names the field that isn't a count.
 */
export function countsToNumbers(
  input: Record<string, unknown>,
  labels: Record<string, string> = {},
):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; message: string } {
  const values = { ...input };
  for (const key of COUNT_KEYS) {
    const value = values[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const count = parseCount(value.trim());
    if (count === null || !Number.isFinite(count)) {
      return {
        ok: false,
        message: `${labels[key] ?? key} should be a number, like 4500, 45k or 1.2M.`,
      };
    }
    values[key] = Math.round(count);
  }
  return { ok: true, values };
}

/** What a thousand views cost; null when there's no price or no views. */
export function per1k(
  price: number | null | undefined,
  views: number | null | undefined,
) {
  if (price === null || price === undefined || !views || views <= 0)
    return null;
  return Math.round((price / views) * 1000 * 100) / 100;
}

/** Followers added up across platforms. The same person may follow twice. */
export function totalFollowers(channels: readonly Channel[]) {
  return channels.reduce((sum, channel) => sum + (channel.followers ?? 0), 0);
}

/** The channel whose posts get the most views; followers settle it when views aren't known. */
export function bestChannel(channels: readonly Channel[]): Channel | null {
  return (
    [...channels].sort(
      (a, b) =>
        (b.avg_views ?? -1) - (a.avg_views ?? -1) ||
        (b.followers ?? -1) - (a.followers ?? -1),
    )[0] ?? null
  );
}

/**
 * True for a format that is the creator's own post, so their usual views
 * apply to it. A retweet, a comment, a like or a save rides on someone
 * else's post: nobody can say what it will be seen by.
 */
export function hasOwnViews(format: string) {
  return (
    !/_(repost|reply|comment|like|save)$/.test(format) &&
    formatInfo(format) !== null &&
    format !== "other"
  );
}

export type RateLine = Rate & {
  /** Their usual views on that platform; null when not known or not their own post. */
  expectedViews: number | null;
  /** The price for a thousand of those views. */
  per1k: number | null;
};

/** Each price with what it should buy, going by the channel's usual views. */
export function rateLines(
  rates: readonly Rate[],
  channels: readonly Channel[],
): RateLine[] {
  const views = new Map(
    channels.map((channel) => [
      `${channel.influencer_id}:${channel.platform}`,
      channel.avg_views,
    ]),
  );
  return rates.map((rate) => {
    const expectedViews = hasOwnViews(rate.format)
      ? (views.get(`${rate.influencer_id}:${rate.platform}`) ?? null)
      : null;
    return { ...rate, expectedViews, per1k: per1k(rate.price, expectedViews) };
  });
}

/** Cheapest per thousand views first, then cheapest outright; one currency after another. */
export function byValue(a: RateLine, b: RateLine) {
  return (
    a.currency.localeCompare(b.currency) ||
    (a.per1k ?? Number.POSITIVE_INFINITY) -
      (b.per1k ?? Number.POSITIVE_INFINITY) ||
    a.price - b.price
  );
}

/** The price that buys views cheapest, in the currency most of the prices are in. */
export function bestValue(lines: readonly RateLine[]): RateLine | null {
  const priced = lines.filter((line) => line.per1k !== null);
  const currency = mainCurrency(priced.map((line) => line.currency));
  return (
    priced.filter((line) => line.currency === currency).sort(byValue)[0] ?? null
  );
}

/** The lowest price on the card, in the currency most of the prices are in. */
export function lowestRate<T extends Pick<Rate, "price" | "currency">>(
  rates: readonly T[],
): T | null {
  const currency = mainCurrency(rates.map((rate) => rate.currency));
  return (
    rates
      .filter((rate) => rate.currency === currency)
      .sort((a, b) => a.price - b.price)[0] ?? null
  );
}

/** The currency used most; ties go to the one that sorts first. */
export function mainCurrency(currencies: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const currency of currencies)
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  return (
    [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? null
  );
}

/** Likes, comments, reposts and saves added up; null when none were noted. */
export function engagements(
  post: Pick<Post, "likes" | "comments" | "reposts" | "saves">,
) {
  const parts = [post.likes, post.comments, post.reposts, post.saves].filter(
    (part): part is number => part !== null && part !== undefined,
  );
  return parts.length ? parts.reduce((sum, part) => sum + part, 0) : null;
}

export type Result = {
  key: string;
  posts: number;
  /** Views added up over the posts that have them. */
  views: number;
  /** Views a post, over the posts that have them. */
  avgViews: number | null;
  /** Paid in `currency`. */
  spent: number;
  /** Posts paid for in `currency`. */
  paid: number;
  /** What a thousand views cost, over the paid posts that have views. */
  per1k: number | null;
  /** Engagements for every hundred views, over the posts that have both. */
  engagementRate: number | null;
  clicks: number;
};

/**
 * The posts grouped (by platform, format or creator) and added up. Views
 * and engagement count every post; the money counts only the posts paid
 * for in `currency`.
 */
export function results(
  posts: readonly Post[],
  keyOf: (post: Post) => string,
  currency: string,
): Result[] {
  type Sum = Result & {
    seen: number;
    paidCost: number;
    paidViews: number;
    engaged: number;
    engagedViews: number;
  };
  const groups = new Map<string, Sum>();
  for (const post of posts) {
    const key = keyOf(post);
    const sum: Sum = groups.get(key) ?? {
      key,
      posts: 0,
      views: 0,
      avgViews: null,
      spent: 0,
      paid: 0,
      per1k: null,
      engagementRate: null,
      clicks: 0,
      seen: 0,
      paidCost: 0,
      paidViews: 0,
      engaged: 0,
      engagedViews: 0,
    };
    sum.posts += 1;
    sum.clicks += post.clicks ?? 0;
    const views = post.views && post.views > 0 ? post.views : null;
    if (views) {
      sum.views += views;
      sum.seen += 1;
    }
    const paid =
      post.currency === currency && post.cost !== null && post.cost > 0
        ? post.cost
        : null;
    if (paid) {
      sum.spent += paid;
      sum.paid += 1;
      if (views) {
        sum.paidCost += paid;
        sum.paidViews += views;
      }
    }
    const engaged = engagements(post);
    if (engaged !== null && views) {
      sum.engaged += engaged;
      sum.engagedViews += views;
    }
    groups.set(key, sum);
  }
  return [...groups.values()].map(
    ({ seen, paidCost, paidViews, engaged, engagedViews, ...sum }) => ({
      ...sum,
      avgViews: seen ? Math.round(sum.views / seen) : null,
      per1k: per1k(paidViews ? paidCost : null, paidViews),
      engagementRate: engagedViews
        ? Math.round((engaged / engagedViews) * 1000) / 10
        : null,
    }),
  );
}

/** Cheapest views first; groups nobody paid for go by views a post. */
export function byResult(a: Result, b: Result) {
  return (
    (a.per1k ?? Number.POSITIVE_INFINITY) -
      (b.per1k ?? Number.POSITIVE_INFINITY) ||
    (b.avgViews ?? -1) - (a.avgViews ?? -1) ||
    a.key.localeCompare(b.key)
  );
}

/** The group that did best: the cheapest views, or the most views a post when nothing was paid for. */
export function bestResult(rows: readonly Result[]): Result | null {
  const withViews = rows.filter((row) => row.avgViews !== null);
  return [...withViews].sort(byResult)[0] ?? null;
}

/** What a change did to a record, for the audit trail: only the fields that differ. */
export function changed(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null) ||
    // Postgres hands numerics back as text.
    (a !== null &&
      b !== null &&
      a !== "" &&
      b !== "" &&
      typeof a !== typeof b &&
      Number(a) === Number(b));
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, to] of Object.entries(patch)) {
    const from = before[key];
    if (!same(from, to)) out[key] = { from: from ?? null, to: to ?? null };
  }
  return out;
}
