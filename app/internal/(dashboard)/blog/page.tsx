import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BlogOverview } from "@/components/internal/blog/overview";
import { listPosts, sitePosts } from "@/lib/internal/blog/data";
import { monthWindow, statsWindow } from "@/lib/internal/blog/stats";
import {
  analyticsOverview,
  isAnalyticsConfigured,
} from "@/lib/internal/google-analytics";
import {
  isSearchConsoleConfigured,
  searchOverview,
} from "@/lib/internal/search-console";
import { requireBlog } from "@/lib/internal/session";
import { newPost } from "./actions";

export const metadata: Metadata = { title: "Blog" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The list's own query keys: links from before the Blog section opened the list at /blog. */
const LIST_KEYS = ["tab", "sort", "error", "denied"];

/**
 * Blog → Overview for blog reviewers. Writers have no Google numbers, so
 * their Blog opens straight on Posts.
 */
export default async function BlogOverviewPage({ searchParams }: Props) {
  const staff = await requireBlog("writer");
  const params = await searchParams;
  if (
    staff.blog !== "reviewer" ||
    LIST_KEYS.some((key) => params[key] !== undefined)
  ) {
    const query = new URLSearchParams();
    for (const key of LIST_KEYS) {
      const value = params[key];
      if (typeof value === "string") query.set(key, value);
    }
    redirect(query.size ? `/blog/posts?${query}` : "/blog/posts");
  }

  const month = monthWindow();
  const stretch = statsWindow(28);
  const [reads, search, listed] = await Promise.all([
    isAnalyticsConfigured() ? analyticsOverview(month, stretch) : null,
    isSearchConsoleConfigured() ? searchOverview(month, stretch) : null,
    listPosts(staff),
  ]);
  return (
    <BlogOverview
      me={staff.email}
      month={month}
      stretch={stretch}
      reads={reads}
      search={search}
      site={sitePosts()}
      posts={listed.ok ? listed.posts : null}
      newPost={newPost}
    />
  );
}
