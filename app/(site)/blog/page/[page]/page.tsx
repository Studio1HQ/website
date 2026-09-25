import { notFound } from "next/navigation";
import {
  BlogIndexView,
  getBlogPageCount,
} from "@/components/blog/blog-index-view";

type PaginatedBlogPageProps = {
  params: Promise<{
    page: string;
  }>;
};

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
