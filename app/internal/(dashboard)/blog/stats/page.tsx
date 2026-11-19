import type { Metadata } from "next";
import { BlogStatsView } from "@/components/internal/blog/stats-view";
import { sitePosts } from "@/lib/internal/blog/data";
import { statsRange, statsWindow } from "@/lib/internal/blog/stats";
import {
  analyticsReport,
  isAnalyticsConfigured,
} from "@/lib/internal/google-analytics";
import {
  isSearchConsoleConfigured,
  searchReport,
} from "@/lib/internal/search-console";
import { requireBlog } from "@/lib/internal/session";

export const metadata: Metadata = { title: "Blog stats" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Views, readers, Google clicks and the top posts (blog reviewers). */
export default async function BlogStatsPage({ searchParams }: Props) {
  await requireBlog("reviewer");
  const params = await searchParams;
  const range = statsRange(params.range);
  const window = statsWindow(range.days);
  const [reads, search] = await Promise.all([
    isAnalyticsConfigured() ? analyticsReport(window) : null,
    isSearchConsoleConfigured() ? searchReport(window) : null,
  ]);
  return (
    <BlogStatsView
      range={range}
      window={window}
      reads={reads}
      search={search}
      site={sitePosts()}
    />
  );
}
