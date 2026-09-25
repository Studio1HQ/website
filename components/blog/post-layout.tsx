import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PostShare } from "@/components/blog/post-share";
import { TableOfContents } from "@/components/case-studies/table-of-contents";
import { Num } from "@/components/ui/num";
import type { BlogPostNavigation } from "@/lib/blog";

type PostLayoutProps = {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  author: string;
  authors?: string[];
  tags: string[];
  readingTimeMinutes?: number;
  shareUrl: string;
  keyTakeaways?: string[];
  navigation?: BlogPostNavigation;
  children: ReactNode;
};

export function PostLayout({
  title,
  description,
  date,
  updatedDate,
  author,
  authors,
  tags,
  readingTimeMinutes,
  shareUrl,
  keyTakeaways = [],
  navigation = { previous: null, next: null },
  children,
}: PostLayoutProps) {
  const showUpdatedDate = updatedDate && updatedDate !== date;
  const byline = authors?.length ? authors.join(", ") : author;

  return (
    <article className="relative mx-auto max-w-7xl px-4 py-12 md:py-20">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-10 mb-10 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Our Blog
      </Link>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="max-w-4xl">
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
              <time dateTime={date}>{date}</time>
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
                    Updated <time dateTime={updatedDate}>{updatedDate}</time>
                  </span>
                </>
              ) : null}
            </div>
            <h1 className="mb-4 font-inter text-3xl font-normal leading-[1.15] tracking-tight md:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm mb-4">By {byline}</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </header>

          <section
            aria-label="Article summary"
            className="not-prose mb-10 rounded-lg border border-border/70 bg-muted/35 p-5"
          >
            <h2 className="mb-3 font-inter text-base font-semibold text-foreground">
              Quick Answer
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {keyTakeaways.length ? (
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                {keyTakeaways.map((takeaway) => (
                  <li key={takeaway} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 rounded-full bg-primary" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div
            data-mdx-content
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-p:leading-relaxed prose-li:leading-relaxed"
          >
            {children}
          </div>

          <div className="xl:hidden">
            <PostShare url={shareUrl} title={title} />
          </div>

          {(navigation.previous || navigation.next) ? (
            <nav
              aria-label="Article navigation"
              className="not-prose mt-14 grid gap-4 border-t border-border pt-10 md:grid-cols-2"
            >
              {navigation.previous ? (
                <Link
                  href={`/blog/${navigation.previous.slug}`}
                  className="group rounded-lg border border-border/80 bg-background/80 p-4 transition-colors hover:border-primary"
                >
                  <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Previous
                  </p>
                  <h2 className="font-inter text-sm font-semibold leading-snug">
                    {navigation.previous.title}
                  </h2>
                </Link>
              ) : (
                <span />
              )}
              {navigation.next ? (
                <Link
                  href={`/blog/${navigation.next.slug}`}
                  className="group rounded-lg border border-border/80 bg-background/80 p-4 text-right transition-colors hover:border-primary"
                >
                  <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Next
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </p>
                  <h2 className="font-inter text-sm font-semibold leading-snug">
                    {navigation.next.title}
                  </h2>
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}

        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-20 flex flex-col gap-10">
            <TableOfContents variant="inline" />
            <PostShare url={shareUrl} title={title} variant="sidebar" />
          </div>
        </aside>
      </div>
    </article>
  );
}
