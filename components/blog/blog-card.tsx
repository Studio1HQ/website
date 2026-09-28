import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { BlogPostMeta } from "@/lib/blog";
import { Num, NumericText } from "@/components/ui/num";
import {
  glassCardEdgeHighlight,
  glassCardFrame,
  glassCardHoverWash,
} from "@/lib/shadows";
import { cn } from "@/lib/utils";

export function BlogCard({ post }: { post: BlogPostMeta }) {
  const label = post.tags[0] ?? "Article";
  const cardImage = post.bannerImage ?? "/opengraph-image.png";
  const cardImageAlt = post.bannerImage ? post.bannerImageAlt : "Studio1 technical blog";

  return (
    <Link
      href={`/blog/${post.slug}`}
      data-blog-card
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-3 sm:aspect-square",
        glassCardFrame,
        "transition-all duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none",
      )}
    >
      <div aria-hidden className={glassCardEdgeHighlight} />
      <div aria-hidden className={glassCardHoverWash} />

      <div className="relative z-[1] w-full">
        <div
          data-blog-card-media
          className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,hsl(var(--muted)/0.62),hsl(var(--background)),hsl(var(--primary)/0.08))] p-2 ring-1 ring-inset ring-foreground/[0.07] dark:bg-[linear-gradient(135deg,hsl(var(--muted)/0.22),hsl(var(--background)),hsl(var(--primary)/0.1))] dark:ring-white/[0.07]"
        >
          <div className="relative h-full w-full overflow-hidden rounded-lg bg-background/70 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/5 dark:bg-background/45 dark:ring-white/10">
            <Image
              src={cardImage}
              alt={cardImageAlt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 32rem"
            />
          </div>
          <span
            className="sr-only"
            role="img"
            aria-label={cardImageAlt}
          />
        </div>
      </div>
      <div className="relative z-[1] flex min-w-0 flex-1 items-start justify-between gap-4 p-4 pt-5">
        <div className="min-w-0">
          <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-primary">
            {label} · <time dateTime={post.date}>{post.date}</time> ·{" "}
            <Num>{post.readingTimeMinutes}</Num> min read
          </span>
          <h2 className="mt-2 line-clamp-2 font-inter text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary md:text-lg">
            <NumericText>{post.title}</NumericText>
          </h2>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.description}
          </p>
        </div>

        <ArrowUpRight
          weight="bold"
          className="mt-6 size-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:group-hover:text-primary motion-reduce:transform-none"
        />
      </div>
    </Link>
  );
}
