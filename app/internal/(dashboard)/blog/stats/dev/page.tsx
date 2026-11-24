import type { Metadata } from "next";
import { DevStatsView } from "@/components/internal/blog/dev-stats";
import { sitePosts } from "@/lib/internal/blog/data";
import { devOrgSort } from "@/lib/internal/blog/devto-stats";
import {
  devOrgStats,
  isDevStatsConfigured,
} from "@/lib/internal/blog/devto-stats-api";
import { statsRange, statsWindow } from "@/lib/internal/blog/stats";
import { requireBlog } from "@/lib/internal/session";

export const metadata: Metadata = { title: "DEV stats" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The Studio1 organization on DEV: views, reactions, comments, followers,
 * posts, writers and referrers (blog reviewers). Read-only: the stats key
 * never publishes. A post with the slug "dev" would be shadowed by this
 * page, so don't give a post that slug.
 */
export default async function DevStatsPage({ searchParams }: Props) {
  await requireBlog("reviewer");
  const params = await searchParams;
  const range = statsRange(params.range);
  const window = statsWindow(range.days);
  const stats = isDevStatsConfigured() ? await devOrgStats(window) : null;
  const hasViews = Boolean(stats?.ok && stats.viewsNote === null);
  return (
    <DevStatsView
      range={range}
      window={window}
      stats={stats}
      sort={devOrgSort(params.sort, hasViews)}
      site={sitePosts()}
    />
  );
}
