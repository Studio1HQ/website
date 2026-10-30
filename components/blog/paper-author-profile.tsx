"use client";

import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react";
import type { Author } from "@/lib/authors";
import type { BlogPostMeta } from "@/lib/blog";
import { cn } from "@/lib/utils";
import { Container } from "@/components/home/ui";
import { PostCard } from "@/components/blog/paper-blog-index";
import {
  Accent,
  CELL,
  GRID,
  IndexBar,
  MUTED,
  OutlineLink,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";

type PaperAuthorProfileProps = {
  author: Author;
  /** The author's posts, newest first, with their site-wide "No." number. */
  posts: { post: BlogPostMeta; number: number }[];
};

export function PaperAuthorProfile({ author, posts }: PaperAuthorProfileProps) {
  const [firstName, ...rest] = author.name.split(" ");
  const lastName = rest.join(" ");

  return (
    <div className="overflow-x-clip">
      <PaperSection tone="paper" className="pb-10 pt-32 md:pb-14 md:pt-40">
        <Container>
          <IndexBar
            index={1}
            name="Author"
            aside={`${posts.length} ${posts.length === 1 ? "article" : "articles"}`}
          />
          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-end md:gap-14">
            <div
              className={cn(
                "relative aspect-square w-44 overflow-hidden rounded-[16px] sm:w-52 md:w-full",
                CELL,
              )}
            >
              <Image
                src={author.image}
                alt={author.name}
                fill
                priority
                sizes="(max-width: 768px) 208px, 260px"
                className="object-cover object-top"
              />
            </div>
            <div className="flex flex-col items-start">
              <p className={cn("text-[14px] font-medium", MUTED)}>
                {author.jobTitle}, Studio1
              </p>
              <h1 className="mt-3 text-[44px] font-medium leading-[1.08] tracking-[-0.055em] sm:text-[60px] lg:text-[72px]">
                {firstName} {lastName ? <Accent>{lastName}</Accent> : null}
              </h1>
              <p
                className={cn(
                  "mt-6 max-w-[620px] text-[16px] leading-[1.6] sm:text-[17px]",
                  MUTED,
                )}
              >
                {author.bio}
              </p>
              <ul role="list" className="mt-7 flex flex-wrap gap-2">
                {author.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="group inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-[var(--p-fg)] px-4 text-[14px] font-medium transition-colors hover:bg-[var(--p-fg)] hover:text-[var(--p-bg)]"
                    >
                      {link.label}
                      <ArrowUpRight
                        weight="bold"
                        className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </PaperSection>

      <PaperSection tone="paper" className="pt-6 md:pt-10">
        <Container>
          <IndexBar index={2} name="Articles" />
          <SectionHead
            title={
              <>
                Articles by <Accent>{firstName}</Accent>
              </>
            }
            action={<OutlineLink href="/blog">All articles</OutlineLink>}
            actionEnd
          />
          {posts.length ? (
            <div className={cn("mt-10 sm:grid-cols-2 lg:grid-cols-3", GRID)}>
              {posts.map(({ post, number }) => (
                <PostCard key={post.slug} post={post} number={number} />
              ))}
            </div>
          ) : (
            <p className={cn("mt-10 text-[16px]", MUTED)}>
              New articles from {firstName} are on the way.
            </p>
          )}
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
