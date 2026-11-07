import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BlogIndexView,
  getBlogPageCount,
} from "@/components/blog/blog-index-view";
import { pageMetadata } from "@/lib/seo";

type PaginatedBlogPageProps = {
  params: Promise<{
    page: string;
  }>;
};

/**
 * Each page of the archive is its own canonical URL with its own title, so
 * search engines index the older posts it lists instead of folding it into /blog.
 */
export async function generateMetadata({
  params,
}: PaginatedBlogPageProps): Promise<Metadata> {
  const { page } = await params;
  return pageMetadata({
    title: `Developer Marketing & Tech Blog, Page ${page}`,
    description: `Page ${page} of Studio1's practical guides on developer marketing, technical content, documentation, and growth for SaaS, AI, and devtool teams.`,
    path: `/blog/page/${page}`,
    rssPath: "/feed.xml",
  });
}

export function generateStaticParams() {
  const totalPages = getBlogPageCount();

  return Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export default async function PaginatedBlogPage({
  params,
}: PaginatedBlogPageProps) {
  const { page: pageParam } = await params;
  const page = Number.parseInt(pageParam, 10);
  const totalPages = getBlogPageCount();

  if (!Number.isFinite(page) || page < 2 || page > totalPages) {
    notFound();
  }

  return <BlogIndexView currentPage={page} />;
}
