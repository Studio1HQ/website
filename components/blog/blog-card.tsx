import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { BlogPostMeta } from "@/lib/blog";
import { Num, NumericText } from "@/components/ui/num";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Glass blog card; `featured` lays it out wide with the image beside the copy. */
export function BlogCard({
  post,
  featured = false,
}: {
  post: BlogPostMeta;
  featured?: boolean;
}) {
  const label = post.tags[0] ?? "Article";
  const cardImage = post.bannerImage ?? "/opengraph-image.png";
  const cardImageAlt = post.bannerImage ? post.bannerImageAlt : "Studio1 technical blog";
  const hasUploadedBanner = Boolean(post.bannerImage);

  return (
    <Link
      href={`/blog/${post.slug}`}
      data-blog-card
      className={cn(
        "s1-glass-card group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] p-3 transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none",
        featured && "s1-glass-raised lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-4",
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[16px] bg-black ring-1 ring-black/5 dark:ring-white/10">
        <Image
          src={cardImage}
          alt={cardImageAlt}
          fill
          priority={featured}
          className={cn(
            "transition-transform duration-700 ease-out group-hover:scale-[1.03]",
            hasUploadedBanner ? "object-contain" : "object-cover",
          )}
          sizes={featured ? "(max-width: 1024px) 100vw, 720px" : "(max-width: 768px) 100vw, 420px"}
        />
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col p-4 pt-5", featured && "lg:p-8")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-[var(--home-ink-soft)]">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{label}</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>
            <Num>{post.readingTimeMinutes}</Num> min read
          </span>
        </div>
        <h2
          className={cn(
            "mt-4 font-medium leading-[1.2] tracking-[-0.035em] text-[var(--home-ink)] transition-colors group-hover:text-primary",
            featured ? "text-[24px] md:text-[34px]" : "line-clamp-2 text-[19px]",
          )}
        >
          <NumericText>{post.title}</NumericText>
        </h2>
        <p
          className={cn(
            "mt-3 text-[15px] leading-[1.6] text-[var(--home-ink-soft)]",
            featured ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          {post.description}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[13px] font-medium text-[var(--home-ink)] transition-colors group-hover:text-primary">
          Read article
          <ArrowUpRight weight="bold" className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
