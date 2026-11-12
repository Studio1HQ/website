import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Eye } from "@phosphor-icons/react/dist/ssr";
import { PostLayout } from "@/components/blog/post-layout";
import {
  blogMdxComponents,
  transformBlogMdxContent,
} from "@/components/blog/mdx";
import {
  countBlogWords,
  estimateReadingMinutes,
  extractKeyTakeaways,
  getLatestPosts,
  removeLeadingDuplicateTitle,
  removeTldrSection,
} from "@/lib/blog";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n-messages";
import { getPost } from "@/lib/internal/blog/data";
import { remarkSafeMdx } from "@/lib/internal/blog/safe-mdx";
import { STATUS_INFO, todayIst } from "@/lib/internal/blog/shared";
import { requireBlog } from "@/lib/internal/session";
import { baseUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Preview" };

type Props = { params: Promise<{ id: string }> };

/** The post exactly as the live blog will show it, from the saved draft. */
export default async function BlogPreviewPage({ params }: Props) {
  const staff = await requireBlog("writer");
  // The post layout uses the public site's translations, like app/(site)/layout.
  setRequestLocale(DEFAULT_LOCALE);
  const messages = await getMessages(DEFAULT_LOCALE);
  const { id } = await params;
  const post = await getPost(staff, id);
  if (!post) notFound();

  const title = post.title.trim() || "Untitled post";
  const description = post.description.trim();
  const body = removeLeadingDuplicateTitle(post.body, title);
  const keyTakeaways = extractKeyTakeaways(
    body,
    description,
    post.tldr_bullets,
  );
  const content = removeTldrSection(body);
  const date = post.publish_date ?? todayIst();
  const slug = post.slug || "untitled";

  let rendered: React.ReactNode;
  try {
    ({ content: rendered } = await compileMDX({
      source: transformBlogMdxContent(content),
      components: blogMdxComponents,
      // Never run a draft's raw HTML: writers can be outside the team.
      options: { mdxOptions: { remarkPlugins: [remarkGfm, remarkSafeMdx] } },
    }));
  } catch (error) {
    rendered = (
      <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-[15px] text-rose-900">
        <strong>The site can&apos;t read part of this post.</strong> Usually
        it&apos;s a stray {"{"}, {"}"} or {"<"} in the text. Fix it in the
        editor before publishing.
        <pre className="mt-2 whitespace-pre-wrap text-[12px]">
          {String(error instanceof Error ? error.message : error).slice(0, 400)}
        </pre>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
      <div className="bg-[#f4efe7]">
        <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-black/10 bg-[#141414] px-4 py-2 text-[13px] text-white">
          <Link
            href={`/internal/blog/${post.id}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back to the editor
          </Link>
          <span className="inline-flex items-center gap-1.5 text-white/70">
            <Eye size={14} /> Preview · {STATUS_INFO[post.status].label} · not
            public
          </span>
          <span className="ml-auto hidden text-white/50 sm:inline">{`${baseUrl.replace("https://", "")}/blog/${slug}`}</span>
        </div>
        <PostLayout
          title={title}
          description={description}
          date={date}
          updatedDate={date}
          author={post.authors.join(", ")}
          authors={post.authors}
          tags={post.tags}
          slug={slug}
          bannerImage={post.banner_image ?? undefined}
          bannerImageAlt={post.banner_image_alt ?? title}
          previewCover={`/internal/blog-cover/${post.id}?v=${encodeURIComponent(post.updated_at)}`}
          readingTimeMinutes={estimateReadingMinutes(content)}
          wordCount={countBlogWords(content)}
          shareUrl={`${baseUrl}/blog/${slug}`}
          markdownUrl={`/blog/${slug}.md`}
          tldrSummary={post.tldr_summary.trim() || description}
          keyTakeaways={keyTakeaways}
          latest={getLatestPosts(undefined, 3)}
        >
          {rendered}
        </PostLayout>
      </div>
    </NextIntlClientProvider>
  );
}
