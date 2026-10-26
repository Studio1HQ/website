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
import { Num } from "@/components/ui/num";
import { Cursor, SelectionFrame } from "@/components/paper/paper-hero";
import { PaperCta } from "@/components/paper/paper-sections";
import type { BlogPostNavigation } from "@/lib/blog";
import { blogCoverUrl } from "@/lib/blog-cover";
import { tagLabel } from "@/lib/blog-tags";
import { GRAIN, INK, PAPER, PAPER_SCOPE, PRINT } from "@/lib/paper";

type PostLayoutProps = {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  /** The post's own banner; falls back to the generated paper cover. */
  bannerImage?: string;
  bannerImageAlt?: string;
  author: string;
  authors?: string[];
  tags: string[];
  slug: string;
  readingTimeMinutes?: number;
  shareUrl: string;
  markdownUrl: string;
  tldrSummary?: string;
  keyTakeaways?: string[];
  wordCount?: number;
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

/** White sheet with a hairline ring, as the landing page's cards. */
const sheet = "bg-white/80 ring-1 ring-inset ring-[#141414]/10";

/** Same width and gutters as the landing page's Container. */
const frame = "mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/**
 * Blog post in the paper design: a printed header with the cover framed full
 * width on top, then the article between a numbered "On this page" list (left)
 * and a details ledger with quick links (right). Below xl it collapses to one
 * column with a floating chapter pill.
 */
export function PostLayout({
  title,
  description,
  date,
  updatedDate,
  bannerImage,
  bannerImageAlt,
  author,
  authors,
  tags,
  slug,
  readingTimeMinutes,
  shareUrl,
  markdownUrl,
  tldrSummary,
  keyTakeaways = [],
  wordCount,
  navigation = { previous: null, next: null },
  children,
}: PostLayoutProps) {
  const showUpdatedDate = updatedDate && updatedDate !== date;
  const authorList = authors?.length ? authors : [author];
  const byline = authorList.join(", ");
  const summary = tldrSummary || description;
  const takeaways = keyTakeaways.filter(
    (item) => item.trim() !== summary.trim(),
  );
  const topic = tags[0] ? tagLabel(tags[0]) : "Journal";

  const details: [string, ReactNode][] = [
    ["Published", <time key="published" dateTime={date}>{formatDate(date)}</time>],
    ...(showUpdatedDate
      ? ([["Updated", <time key="updated" dateTime={updatedDate}>{formatDate(updatedDate)}</time>]] as [string, ReactNode][])
      : []),
    ...(readingTimeMinutes != null
      ? ([["Reading time", <><Num>{readingTimeMinutes}</Num> min</>]] as [string, ReactNode][])
      : []),
    ...(wordCount ? ([["Words", <Num key="words">{wordCount.toLocaleString("en-US")}</Num>]] as [string, ReactNode][]) : []),
    ["Topic", topic],
  ];

  return (
    <div style={PAPER_SCOPE}>
      <article className="relative isolate pt-20">
        {/* Paper grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />

        <header className={`${frame} pt-12 md:pt-16`}>
          <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-6 text-[13px] font-medium">
            <span className="flex min-w-0 items-center gap-3">
              <Link
                href="/blog"
                className="group inline-flex items-center gap-1.5 text-[var(--p-muted)] transition-colors hover:text-[var(--p-fg)]"
              >
                <ArrowLeft weight="bold" className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                Blog
              </Link>
              <span aria-hidden className="text-[var(--p-faint)]">/</span>
              <span className="truncate" style={{ color: PRINT }}>{topic}</span>
            </span>
            {readingTimeMinutes != null ? (
              <span className="hidden shrink-0 text-[var(--p-muted)] sm:block">
                <Num>{readingTimeMinutes}</Num> min read
              </span>
            ) : null}
          </nav>

          <h1 className="mt-8 max-w-[1040px] text-[36px] font-medium leading-[1.12] tracking-[-0.05em] sm:text-[50px] lg:text-[62px]">
            <span className="bg-white px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              {title}
            </span>
          </h1>
          <p className="mt-6 max-w-[720px] text-[17px] leading-[1.6] text-[var(--p-muted)] sm:text-[18px]">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-[var(--p-line)] pt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-[var(--p-muted)]">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full text-[11px] font-medium"
                style={{ background: INK, color: PAPER }}
              >
                {initials(authorList[0])}
              </span>
              <span className="font-medium text-[var(--p-fg)]">{byline}</span>
              <span aria-hidden className="text-[var(--p-faint)]">·</span>
              <time dateTime={date}>{formatDate(date)}</time>
            </div>
            {tags.length ? (
              <ul role="list" className="flex flex-wrap gap-1.5">
                {tags.map((tag, index) => (
                  <li
                    key={tag}
                    className={
                      index === 0
                        ? "px-2 py-1 text-[12px] font-medium leading-none text-white"
                        : `px-2 py-1 text-[12px] font-medium leading-none text-[var(--p-muted)] ${sheet}`
                    }
                    style={index === 0 ? { background: PRINT } : undefined}
                  >
                    {tagLabel(tag)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="relative mx-auto mt-12 w-full max-w-[920px]">
            <SelectionFrame label="cover-image" labelPosition="top-left" className="p-1.5">
              <figure className={`relative aspect-[16/9] overflow-hidden rounded-[6px] ${bannerImage ? "bg-[#0b0b0b]" : "bg-[#f4efe7]"} shadow-[0_30px_60px_-40px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/10`}>
                <Image
                  src={bannerImage || blogCoverUrl(slug, updatedDate || date)}
                  alt={bannerImage ? bannerImageAlt || title : ""}
                  fill
                  priority
                  className={bannerImage ? "object-contain" : "object-cover"}
                  sizes="(max-width: 960px) 100vw, 920px"
                />
              </figure>
            </SelectionFrame>
            <Cursor className="absolute -bottom-6 right-[10%] hidden md:block" />
          </div>
        </header>

        <div className={`${frame} pb-24 pt-14 md:pt-16 xl:grid xl:grid-cols-[230px_minmax(0,1fr)_230px] xl:gap-14`}>
          {/* Left: numbered chapters, the one being read opens (pinned) */}
          <aside className="hidden xl:block">
            <div data-lenis-prevent className="s1-scroll-none sticky top-28 max-h-[calc(100vh/var(--s1-zoom,1)_-_8rem)] overflow-y-auto pb-6">
              <OnThisPage />
            </div>
          </aside>

          {/* Centre: the article */}
          <div className="mx-auto w-full min-w-0 max-w-[760px]">
            <section
              aria-label="Article TL;DR"
              className={`p-6 md:p-8 ${sheet}`}
            >
              <span
                className="inline-flex px-1.5 py-1 text-[11px] font-medium uppercase leading-none tracking-[0.12em] text-white"
                style={{ background: PRINT }}
              >
                TL;DR
              </span>
              <p className="mt-4 text-[17px] leading-[1.6] text-[var(--p-fg)]">
                {summary}
              </p>
              {takeaways.length ? (
                <ul className="mt-5 space-y-2.5 border-t border-[var(--p-line)] pt-5">
                  {takeaways.map((takeaway) => (
                    <li
                      key={takeaway}
                      className="flex gap-3 text-[15px] leading-[1.6] text-[var(--p-muted)]"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 size-1.5 shrink-0"
                        style={{ background: PRINT }}
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
              className="prose prose-neutral mt-12 max-w-[720px] prose-headings:scroll-mt-28 prose-headings:font-medium prose-headings:tracking-[-0.035em] prose-headings:text-[var(--p-fg)] prose-h2:mb-5 prose-h2:mt-16 prose-h2:border-t prose-h2:border-[var(--p-line)] prose-h2:pt-10 prose-h2:text-[28px] prose-h2:leading-[1.2] md:prose-h2:text-[32px] prose-h3:mb-3 prose-h3:mt-10 prose-h3:text-[21px] prose-h3:leading-[1.3] prose-p:my-5 prose-p:text-[17.5px] prose-p:leading-[1.8] prose-p:text-[#141414]/[0.74] prose-a:font-medium prose-a:text-[#c2410c] prose-a:underline prose-a:decoration-[#f97316]/40 prose-a:decoration-[1.5px] prose-a:underline-offset-[5px] hover:prose-a:decoration-[#f97316] prose-blockquote:my-10 prose-blockquote:rounded-r-[14px] prose-blockquote:border-l-[3px] prose-blockquote:border-l-[#f97316] prose-blockquote:bg-white/70 prose-blockquote:py-4 prose-blockquote:pl-6 prose-blockquote:pr-5 prose-blockquote:font-medium prose-blockquote:not-italic prose-blockquote:text-[#141414] prose-strong:font-semibold prose-strong:text-[var(--p-fg)] prose-code:before:content-none prose-code:after:content-none prose-ol:my-6 prose-ul:my-6 prose-li:my-2 prose-li:text-[17.5px] prose-li:leading-[1.75] prose-li:text-[#141414]/[0.74] prose-li:marker:font-medium prose-li:marker:text-[#f97316] prose-img:rounded-none prose-hr:my-14 prose-hr:border-[var(--p-line)] prose-th:text-[var(--p-fg)] prose-td:text-[var(--home-ink-soft)]"
            >
              {children}
            </div>

            <div className="mt-12 xl:hidden">
              <PostShare url={shareUrl} title={title} />
            </div>

            {navigation.previous || navigation.next ? (
              <nav
                aria-label="Article navigation"
                className="mt-16 grid gap-2 md:grid-cols-2"
              >
                {navigation.previous ? (
                  <Link
                    href={`/blog/${navigation.previous.slug}`}
                    className={`group p-6 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-white ${sheet}`}
                  >
                    <p className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--p-muted)]">
                      <ArrowLeft
                        weight="bold"
                        className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                      />
                      Previous
                    </p>
                    <p className="mt-3 text-[17px] font-medium leading-snug tracking-[-0.02em] transition-colors group-hover:text-[#f97316]">
                      {navigation.previous.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
                {navigation.next ? (
                  <Link
                    href={`/blog/${navigation.next.slug}`}
                    className={`group p-6 text-right transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-white ${sheet}`}
                  >
                    <p className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--p-muted)]">
                      Next
                      <ArrowRight
                        weight="bold"
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      />
                    </p>
                    <p className="mt-3 text-[17px] font-medium leading-snug tracking-[-0.02em] transition-colors group-hover:text-[#f97316]">
                      {navigation.next.title}
                    </p>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </div>

          {/* Right: details ledger and quick links (pinned) */}
          <aside className="hidden xl:block">
            <div className="sticky top-28 flex flex-col gap-6">
              <dl className="rounded-[6px] bg-white/80 px-4 shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/[0.08] text-[12px]">
                {details.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 border-b border-[var(--p-line)] py-3 last:border-b-0"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--p-muted)]">{label}</dt>
                    <dd className="text-right font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-2">
                <a
                  href={markdownUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${sideLink} ${sheet} text-[var(--p-muted)] hover:text-[var(--p-fg)]`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="flex size-8 items-center justify-center rounded-full"
                      style={{ background: INK, color: PAPER }}
                    >
                      <MarkdownLogo weight="fill" className="size-4" />
                    </span>
                    <span>
                      View as{" "}
                      <span className="font-medium text-[var(--p-fg)]">
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
                  className={sideLink}
                  style={{ background: INK, color: PAPER }}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="flex size-8 items-center justify-center rounded-full text-white"
                      style={{ background: PRINT }}
                    >
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
          </aside>
        </div>

        {/* Below xl: floating chapter pill */}
        <ChapterRail readingTimeMinutes={readingTimeMinutes} variant="pill" />
      </article>

      <div className="border-t border-[var(--p-line)]">
        <PaperCta index={2} />
      </div>
    </div>
  );
}
