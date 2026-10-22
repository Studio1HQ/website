import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDots,
  MarkdownLogo,
} from "@phosphor-icons/react/dist/ssr";
import { PostShare } from "@/components/blog/post-share";
import { PostAiActions } from "@/components/blog/post-ai-actions";
import { ChapterRail } from "@/components/blog/chapter-rail";
import { OnThisPage } from "@/components/blog/on-this-page";
import { BlogSidebar } from "@/components/blog/blog-sidebar";
import { Num } from "@/components/ui/num";
import { NightHeader } from "@/components/shared/night-header";
import type { BlogPostNavigation } from "@/lib/blog";

type PostLayoutProps = {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  author: string;
  authors?: string[];
  tags: string[];
  bannerImage?: string;
  bannerImageAlt?: string;
  readingTimeMinutes?: number;
  shareUrl: string;
  markdownUrl: string;
  tldrSummary?: string;
  keyTakeaways?: string[];
  navigation?: BlogPostNavigation;
  children: ReactNode;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}

const sideLink =
  "group flex h-11 items-center justify-between rounded-full pl-1.5 pr-4 text-[13px] transition-transform duration-300 hover:-translate-y-0.5";

/**
 * Docs-style blog post: pinned article index on the left, the article in the
 * centre (night header glow behind the title), and a pinned "On this page"
 * list with quick links on the right. Below xl it collapses to one column with
 * a floating chapter pill.
 */
export function PostLayout({
  title,
  description,
  date,
  updatedDate,
  author,
  authors,
  tags,
  bannerImage,
  bannerImageAlt,
  readingTimeMinutes,
  shareUrl,
  markdownUrl,
  tldrSummary,
  keyTakeaways = [],
  navigation = { previous: null, next: null },
  children,
}: PostLayoutProps) {
  const showUpdatedDate = updatedDate && updatedDate !== date;
  const byline = authors?.length ? authors.join(", ") : author;
  const summary = tldrSummary || description;
  const takeaways = keyTakeaways.filter(
    (item) => item.trim() !== summary.trim(),
  );
  const currentSlug = shareUrl.split("/").filter(Boolean).pop() ?? "";

  return (
    <article className="bg-[var(--home-cream)] pt-20 text-[var(--home-ink)]">
      <div className="mx-auto w-full max-w-[1680px] xl:grid xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* Left: every article, grouped by topic (pinned) */}
        <aside className="hidden border-r border-[var(--home-line)] xl:block">
          <div data-lenis-prevent className="s1-scroll-quiet sticky top-20 h-[calc(100vh/var(--s1-zoom,1)_-_5rem)] overflow-y-auto px-7 pb-10">
            {/* Always-available back button, pinned while the list scrolls */}
            <div className="sticky top-0 z-10 -mx-7 mb-6 bg-gradient-to-b from-[var(--home-cream)] from-75% to-transparent px-7 pb-5 pt-8">
              <Link
                href="/blog"
                className="s1-glass-card group inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-4 text-[13px] font-medium text-[var(--home-ink)] transition-colors hover:text-primary"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--home-ink)] text-[var(--home-cream)] transition-transform duration-300 group-hover:-translate-x-0.5">
                  <ArrowLeft weight="bold" className="size-3.5" />
                </span>
                Back to Our Blog
              </Link>
            </div>
            <BlogSidebar currentSlug={currentSlug} />
          </div>
        </aside>

        {/* Centre: the article */}
        <div className="min-w-0">
          <NightHeader className="pb-28 pt-14 md:pb-32 md:pt-16">
            <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6 lg:px-10">
              <Link
                href="/blog"
                className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-white/60 transition-colors hover:text-white xl:hidden"
              >
                <ArrowLeft weight="bold" className="size-3.5" />
                Back to Our Blog
              </Link>

              <ul role="list" className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[12px] font-medium text-white/85 backdrop-blur-sm"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <h1 className="mt-6 text-[34px] font-medium leading-[1.08] tracking-[-0.045em] sm:text-[44px] lg:text-[52px]">
                {title}
              </h1>
              <p className="mt-5 max-w-[680px] text-[17px] leading-[1.6] text-white/65">
                {description}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/55">
                <span className="text-white/85">By {byline}</span>
                <span aria-hidden>·</span>
                <time dateTime={date}>{formatDate(date)}</time>
                {readingTimeMinutes != null ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      <Num>{readingTimeMinutes}</Num> min read
                    </span>
                  </>
                ) : null}
                {showUpdatedDate ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      Updated{" "}
                      <time dateTime={updatedDate}>
                        {formatDate(updatedDate)}
                      </time>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </NightHeader>

          <div className="mx-auto w-full max-w-[860px] px-4 pb-24 sm:px-6 lg:px-10">
            {bannerImage ? (
              <figure className="relative -mt-16 overflow-hidden rounded-[22px] bg-black shadow-[0_40px_100px_-40px_rgba(0,0,0,0.6)] ring-1 ring-black/10 md:-mt-20 dark:ring-white/10">
                <div className="relative aspect-[16/9]">
                  <Image
                    src={bannerImage}
                    alt={bannerImageAlt || title}
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 900px) 100vw, 860px"
                  />
                </div>
              </figure>
            ) : null}

            <section
              aria-label="Article TL;DR"
              className="s1-glass-card mt-10 rounded-[22px] p-6 md:p-8"
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-primary">
                TL;DR
              </p>
              <p className="mt-3 text-[17px] leading-[1.6] text-[var(--home-ink)]">
                {summary}
              </p>
              {takeaways.length ? (
                <ul className="mt-5 space-y-2.5 border-t border-[var(--home-line)] pt-5">
                  {takeaways.map((takeaway) => (
                    <li
                      key={takeaway}
                      className="flex gap-3 text-[15px] leading-[1.6] text-[var(--home-ink-soft)]"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <PostAiActions
              markdownUrl={markdownUrl}
              title={title}
              className="mt-6"
            />

            <div
              data-mdx-content
              className="prose prose-neutral mt-12 max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-medium prose-headings:tracking-[-0.035em] prose-headings:text-[var(--home-ink)] prose-h2:mb-5 prose-h2:mt-16 prose-h2:text-[30px] prose-h3:mt-10 prose-h3:text-[22px] prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-[var(--home-ink-soft)] prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 prose-a:underline-offset-4 hover:prose-a:decoration-primary prose-strong:text-[var(--home-ink)] prose-code:before:content-none prose-code:after:content-none prose-li:text-[17px] prose-li:leading-[1.7] prose-li:text-[var(--home-ink-soft)] prose-img:rounded-2xl prose-th:text-[var(--home-ink)] prose-td:text-[var(--home-ink-soft)]"
            >
              {children}
            </div>

            <div className="mt-12 xl:hidden">
              <PostShare url={shareUrl} title={title} />
            </div>

            {navigation.previous || navigation.next ? (
              <nav
                aria-label="Article navigation"
                className="mt-16 grid gap-4 md:grid-cols-2"
              >
                {navigation.previous ? (
                  <Link
                    href={`/blog/${navigation.previous.slug}`}
                    className="s1-glass-card group rounded-[20px] p-6 transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <p className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--home-ink-soft)]">
                      <ArrowLeft
                        weight="bold"
                        className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                      />
                      Previous
                    </p>
                    <p className="mt-3 text-[17px] font-medium leading-snug tracking-[-0.02em] text-[var(--home-ink)] group-hover:text-primary">
                      {navigation.previous.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
                {navigation.next ? (
                  <Link
                    href={`/blog/${navigation.next.slug}`}
                    className="s1-glass-card group rounded-[20px] p-6 text-right transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <p className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--home-ink-soft)]">
                      Next
                      <ArrowRight
                        weight="bold"
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      />
                    </p>
                    <p className="mt-3 text-[17px] font-medium leading-snug tracking-[-0.02em] text-[var(--home-ink)] group-hover:text-primary">
                      {navigation.next.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </div>
        </div>

        {/* Right: on this page + quick links (pinned) */}
        <aside className="hidden border-l border-[var(--home-line)] xl:block">
          <div className="sticky top-20 flex h-[calc(100vh/var(--s1-zoom,1)_-_5rem)] flex-col">
            {/* The list scrolls on its own; the actions below stay pinned */}
            <div data-lenis-prevent className="s1-scroll-none min-h-0 flex-1 overflow-y-auto px-7 pb-10 pt-10 [mask-image:linear-gradient(to_bottom,black_calc(100%-56px),transparent)]">
              <OnThisPage />
            </div>
            <div className="flex shrink-0 flex-col gap-5 px-7 pb-8 pt-2">
              <div className="flex flex-col gap-2">
                <a
                  href={markdownUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${sideLink} s1-glass-card text-[var(--home-ink-soft)] hover:text-[var(--home-ink)]`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[var(--home-ink)] text-[var(--home-cream)]">
                      <MarkdownLogo weight="fill" className="size-4" />
                    </span>
                    <span>
                      View as{" "}
                      <span className="font-medium text-[var(--home-ink)]">
                        Markdown
                      </span>
                    </span>
                  </span>
                  <ArrowUpRight
                    weight="bold"
                    className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
                <a
                  href="https://cal.com/studio1/collab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${sideLink} s1-glass-btn text-white`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-inset ring-white/30">
                      <CalendarDots weight="bold" className="size-4" />
                    </span>
                    <span className="font-medium">Book a strategy call</span>
                  </span>
                  <ArrowUpRight
                    weight="bold"
                    className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
              </div>
              <PostShare url={shareUrl} title={title} variant="sidebar" />
            </div>
          </div>
        </aside>
      </div>

      {/* Below xl: floating chapter pill */}
      <ChapterRail readingTimeMinutes={readingTimeMinutes} variant="pill" />
    </article>
  );
}
