import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostStatsView } from "@/components/internal/blog/post-stats";
import { listPosts, sitePosts } from "@/lib/internal/blog/data";
import { devArticles, isDevConfigured } from "@/lib/internal/blog/devto-api";
import {
  postSlug,
  statsRange,
  statsWindow,
  titleFromSlug,
} from "@/lib/internal/blog/stats";
import {
  analyticsPost,
  isAnalyticsConfigured,
} from "@/lib/internal/google-analytics";
import {
  isSearchConsoleConfigured,
  searchPost,
} from "@/lib/internal/search-console";
import { requireBlog } from "@/lib/internal/session";
import { editSitePost } from "../../actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = postSlug((await params).slug);
  const post = slug ? sitePosts().find((item) => item.slug === slug) : null;
  return { title: post ? `${post.title} · Stats` : "Post stats" };
}

/** One post's views, readers, Google clicks, searches and sources (blog reviewers). */
export default async function PostStatsPage({ params, searchParams }: Props) {
  const staff = await requireBlog("reviewer");
  const slug = postSlug((await params).slug);
  if (!slug) notFound();
  const query = await searchParams;
  const range = statsRange(query.range);
  const window = statsWindow(range.days);
  const site = sitePosts().find((post) => post.slug === slug) ?? null;
  const [reads, search, listed, dev] = await Promise.all([
    isAnalyticsConfigured() ? analyticsPost(slug, window) : null,
    isSearchConsoleConfigured() ? searchPost(slug, window) : null,
    listPosts(staff),
    isDevConfigured() ? devArticles() : null,
  ]);
  // Published from the editor: its draft opens there; a post only on the site opens through Edit.
  const tracked = listed.ok
    ? (listed.posts.find(
        (post) => post.slug === slug && post.status === "published",
      ) ?? null)
    : null;
  return (
    <PostStatsView
      slug={slug}
      title={site?.title ?? tracked?.title ?? titleFromSlug(slug)}
      date={site?.date ?? null}
      onSite={Boolean(site)}
      unlisted={site?.unlisted ?? false}
      editorId={tracked?.id ?? null}
      editSitePost={site && !tracked ? editSitePost.bind(null, slug) : null}
      range={range}
      window={window}
      reads={reads}
      search={search}
      dev={
        dev?.ok
          ? (dev.articles.find((article) => article.slug === slug) ?? null)
          : null
      }
    />
  );
}
