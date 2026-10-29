"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  RssSimple,
} from "@phosphor-icons/react";
import type { BlogPostMeta } from "@/lib/blog";
import { blogCoverUrl } from "@/lib/blog-cover";
import { tagLabel } from "@/lib/blog-tags";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/svgs/logo";
import { Container } from "@/components/home/ui";
import { NumericText } from "@/components/ui/num";
import { INK, PAPER, PRINT } from "@/components/paper/paper-hero";
import {
  Accent,
  CELL,
  CountUp,
  FAINT,
  GRID,
  IndexBar,
  LINE,
  MUTED,
  OutlineLink,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";

type PaperBlogIndexProps = {
  posts: BlogPostMeta[];
  /** Posts on this page, already sliced. */
  pagePosts: BlogPostMeta[];
  /** Position of the first post on this page in the full list. */
  pageStart: number;
  currentPage: number;
  totalPages: number;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
}

function blogPageHref(page: number) {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

/** Solid print-orange tag, as on the hero's dashboard cards. */
function PrintTag({ children }: { children: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium leading-none text-white"
      style={{ background: PRINT }}
    >
      {children}
    </span>
  );
}

/**
 * Every post shows its generated paper cover, all at the same 16:9 size.
 * `bleed` runs it edge to edge in a split card: at least 16:9, stretched to
 * the height of the text beside it, with the card's own corners.
 */
function PostCover({
  post,
  priority = false,
  sizes,
  bleed = false,
}: {
  post: BlogPostMeta;
  priority?: boolean;
  sizes: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden ring-1 ring-inset ring-[#141414]/10",
        bleed ? "lg:h-full lg:self-stretch" : "rounded-[12px]",
        post.bannerImage && !bleed ? "bg-[#0b0b0b]" : "bg-[#f4efe7]",
      )}
    >
      <Image
        src={post.bannerImage || blogCoverUrl(post.slug, post.updatedDate)}
        alt={`${post.title} cover`}
        fill
        priority={priority}
        sizes={sizes}
        className={`${post.bannerImage && !bleed ? "object-contain" : "object-cover"} transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transform-none`}
      />
    </div>
  );
}

function ReadArrow() {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
      style={{ background: PRINT }}
    >
      <ArrowUpRight weight="bold" className="size-3.5" />
    </span>
  );
}

function PostMeta({ post, number }: { post: BlogPostMeta; number: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px] font-medium">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <PrintTag>{tagLabel(post.tags[0] ?? "Journal")}</PrintTag>
        <time dateTime={post.date} className={MUTED}>
          {formatDate(post.date)}
        </time>
        <span aria-hidden className={FAINT}>
          ·
        </span>
        <span className={cn("tabular-nums", MUTED)}>
          {post.readingTimeMinutes} min read
        </span>
      </span>
      <span className={cn("shrink-0 tabular-nums", FAINT)}>
        No. {String(number).padStart(2, "0")}
      </span>
    </div>
  );
}

function FeaturedPost({
  post,
  number,
}: {
  post: BlogPostMeta;
  number: number;
}) {
  return (
    <div className="relative mt-14">
      <Link
        href={`/blog/${post.slug}`}
        className="group grid overflow-hidden rounded-[16px] bg-white shadow-[0_30px_60px_-44px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/[0.06] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      >
        <PostCover
          post={post}
          priority
          bleed
          sizes="(max-width: 1024px) 100vw, 720px"
        />
        <div className="flex min-w-0 flex-col p-5 sm:p-7 lg:p-9">
          <PostMeta post={post} number={number} />
          <h2 className="mt-6 text-[26px] font-medium leading-[1.15] tracking-[-0.045em] transition-colors group-hover:text-[#f97316] md:text-[34px]">
            <NumericText>{post.title}</NumericText>
          </h2>
          <p
            className={cn("mt-4 line-clamp-3 text-[16px] leading-[1.6]", MUTED)}
          >
            {post.description}
          </p>
          <div
            className={cn(
              "mt-auto flex items-center justify-between gap-4 border-t pt-5 text-[13px] font-medium",
              LINE,
            )}
          >
            <Authors authors={post.authors} prefix="By " />
            <span className="inline-flex items-center gap-3">
              Read article
              <ReadArrow />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Team photos for named authors; the Studio1 mark for the team byline. */
const AUTHOR_PHOTO: Record<string, string> = {
  "Amitesh Anand": "/assets/amitesh.webp",
  "Arindam Majumder": "/assets/arindam-nobg.webp",
};

function Authors({
  authors,
  prefix = "",
}: {
  authors: string[];
  prefix?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex shrink-0 -space-x-1.5">
        {authors.map((name) => (
          <span
            key={name}
            className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-white"
          >
            {AUTHOR_PHOTO[name] ? (
              <Image
                src={AUTHOR_PHOTO[name]}
                alt=""
                fill
                sizes="24px"
                className="object-cover object-top"
              />
            ) : (
              <Logo className="size-4" />
            )}
          </span>
        ))}
      </span>
      <span className={cn("truncate", MUTED)}>
        {prefix}
        {authors.join(", ")}
      </span>
    </span>
  );
}

function PostCard({ post, number }: { post: BlogPostMeta; number: number }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn("group flex min-w-0 flex-col p-2", CELL, "rounded-[16px]")}
    >
      <PostCover
        post={post}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
      />
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <PostMeta post={post} number={number} />
        <h3 className="mt-4 line-clamp-2 text-[20px] font-medium leading-[1.22] tracking-[-0.035em] transition-colors group-hover:text-[#f97316]">
          <NumericText>{post.title}</NumericText>
        </h3>
        <p className={cn("mt-3 line-clamp-2 text-[15px] leading-[1.6]", MUTED)}>
          {post.description}
        </p>
        <div
          className={cn(
            "mt-auto flex items-center justify-between gap-4 border-t pt-4 text-[13px] font-medium",
            LINE,
          )}
        >
          <Authors authors={post.authors} />
          <ReadArrow />
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages < 2) return null;
  const step =
    "flex size-11 items-center justify-center rounded-full text-[14px] font-medium tabular-nums transition-colors";
  const idle = "bg-white/70 ring-1 ring-inset ring-[#141414]/10 hover:bg-white";
  const arrow = (page: number, label: string, icon: React.ReactNode) =>
    page >= 1 && page <= totalPages ? (
      <Link
        href={blogPageHref(page)}
        aria-label={label}
        className={cn(step, idle)}
      >
        {icon}
      </Link>
    ) : (
      <span
        aria-hidden
        className={cn(step, "opacity-30 ring-1 ring-inset ring-[#141414]/10")}
      >
        {icon}
      </span>
    );

  return (
    <nav
      aria-label="Blog pagination"
      className="mt-14 flex items-center justify-center gap-2"
    >
      {arrow(
        currentPage - 1,
        "Previous page",
        <ArrowLeft weight="bold" className="size-4" />,
      )}
      {Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        const isCurrent = page === currentPage;
        return (
          <Link
            key={page}
            href={blogPageHref(page)}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(step, !isCurrent && idle)}
            style={isCurrent ? { background: INK, color: PAPER } : undefined}
          >
            {page}
          </Link>
        );
      })}
      {arrow(
        currentPage + 1,
        "Next page",
        <ArrowRight weight="bold" className="size-4" />,
      )}
    </nav>
  );
}

/** Blog index in the paper design: printed header, featured article, ruled card grid. */
export function PaperBlogIndex({
  posts,
  pagePosts,
  pageStart,
  currentPage,
  totalPages,
}: PaperBlogIndexProps) {
  const [featured, ...rest] = pagePosts;
  const showFeatured = currentPage === 1 && Boolean(featured);
  const gridPosts = showFeatured ? rest : pagePosts;
  const gridStart = pageStart + (showFeatured ? 1 : 0);
  // "No." counts posts in publishing order (oldest is No. 01), as on the covers.

  const topics = new Set(
    posts.flatMap((post) => post.tags.map((tag) => tag.toLowerCase())),
  );
  const avgRead = posts.length
    ? Math.round(
        posts.reduce((sum, post) => sum + post.readingTimeMinutes, 0) /
          posts.length,
      )
    : 0;
  const stats = [
    { value: posts.length, label: "Articles published" },
    { value: topics.size, label: "Topics covered" },
    { value: avgRead, suffix: " min", label: "Average read" },
  ];

  return (
    <div className="overflow-x-clip">
      <PaperSection tone="paper" className="pb-10 pt-32 md:pb-14 md:pt-40">
        <Container>
          <IndexBar
            index={1}
            name="Journal"
            aside={
              posts[0]
                ? `Last updated ${formatDate(posts[0].updatedDate || posts[0].date)}`
                : undefined
            }
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
            <h1 className="text-[44px] font-medium leading-[1.08] tracking-[-0.055em] sm:text-[60px] lg:text-[76px]">
              <span className="bg-white px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                Developer marketing
              </span>
              <br />& tech <Accent>blog</Accent>
            </h1>
            <div className="flex flex-col items-start gap-6 lg:pb-3">
              <p
                className={cn(
                  "max-w-[440px] text-[16px] leading-[1.6] sm:text-[17px]",
                  MUTED,
                )}
              >
                Practical guides on technical content, developer relations,
                documentation, developer experience, and growth for SaaS, AI,
                and devtool teams.
              </p>
              <a
                href="/feed.xml"
                className="group inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-[var(--p-fg)] px-6 text-[15px] font-medium transition-colors hover:bg-[var(--p-fg)] hover:text-[var(--p-bg)]"
              >
                <RssSimple
                  weight="bold"
                  className="size-4"
                  style={{ color: PRINT }}
                />
                Subscribe via RSS
              </a>
            </div>
          </div>

          <div className={cn("mt-12 sm:grid-cols-3", GRID)}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "flex items-end justify-between gap-4 px-6 py-5",
                  CELL,
                )}
              >
                <span className="text-[34px] font-medium leading-none tracking-[-0.045em]">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </span>
                <span
                  className={cn("text-right text-[13px] font-medium", MUTED)}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {showFeatured && featured ? (
            <FeaturedPost post={featured} number={posts.length} />
          ) : null}
        </Container>
      </PaperSection>

      <PaperSection tone="paper" className="pt-6 md:pt-10">
        <Container>
          <IndexBar
            index={2}
            name="All articles"
            aside={
              totalPages > 1
                ? `Page ${currentPage} of ${totalPages}`
                : `${posts.length} articles`
            }
          />
          <SectionHead
            title={
              <>
                Notes from the <Accent>studio floor</Accent>
              </>
            }
            action={
              <OutlineLink href="/case-studies">
                See the work behind them
              </OutlineLink>
            }
            actionEnd
          />
          <div className={cn("mt-10 sm:grid-cols-2 lg:grid-cols-3", GRID)}>
            {gridPosts.map((post, index) => (
              <PostCard
                key={post.slug}
                post={post}
                number={posts.length - (gridStart + index)}
              />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </Container>
      </PaperSection>

      <PaperCta
        index={3}
        title="Want Content Developers Actually Read?"
        description="We write, film and ship technical content for devtools. Let's plan what your audience needs next."
      />
    </div>
  );
}
