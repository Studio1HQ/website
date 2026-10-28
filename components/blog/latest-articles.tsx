import Image from "next/image";
import Link from "next/link";
import type { BlogPostMeta } from "@/lib/blog";
import { blogCoverUrl } from "@/lib/blog-cover";
import { tagLabel } from "@/lib/blog-tags";
import Logo from "@/components/ui/svgs/logo";

/** Team photos for named authors; the Studio1 mark for the team byline. */
const AUTHOR_PHOTO: Record<string, string> = {
  "Amitesh Anand": "/assets/amitesh.webp",
  "Arindam Majumder": "/assets/arindam-nobg.webp",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * "Check out our latest articles": three posts as centred editorial cards,
 * cover on top, then the topic, the title, and the byline row.
 */
export function LatestArticles({ posts }: { posts: BlogPostMeta[] }) {
  if (!posts.length) return null;
  return (
    <section className="mx-auto w-full max-w-[1300px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <h2 className="text-center text-[34px] font-medium leading-[1.1] tracking-[-0.045em] text-[#141414] md:text-[46px]">
        Check out our <span style={{ color: "#f97316" }}>latest articles</span>
      </h2>

      <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {posts.map((post) => {
          const author = post.authors[0] ?? post.author;
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col items-center text-center"
            >
              <div
                className={`relative aspect-[16/10] w-full overflow-hidden rounded-[16px] ${post.bannerImage ? "bg-[#0b0b0b]" : "bg-[#f4efe7]"} shadow-[0_24px_50px_-36px_rgba(20,20,20,0.55)]`}
              >
                <Image
                  src={
                    post.bannerImage ||
                    blogCoverUrl(post.slug, post.updatedDate)
                  }
                  alt={`${post.title} cover`}
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className={`${post.bannerImage ? "object-contain" : "object-cover"} transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transform-none`}
                />
              </div>

              <span className="mt-6 rounded-[4px] bg-[#141414]/[0.06] px-2.5 py-1 text-[11.5px] font-medium uppercase tracking-[0.1em] text-[#141414]/70">
                {post.tags[0] ? tagLabel(post.tags[0]) : "Journal"}
              </span>

              <h3 className="mt-4 line-clamp-2 max-w-[360px] text-[21px] font-medium leading-[1.25] tracking-[-0.03em] text-[#141414] transition-colors group-hover:text-[#f97316]">
                {post.title}
              </h3>

              <div className="mt-5 flex items-center gap-2.5 text-[13px] text-[#141414]/55">
                <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#f4efe7]">
                  {AUTHOR_PHOTO[author] ? (
                    <Image
                      src={AUTHOR_PHOTO[author]}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover object-top"
                    />
                  ) : (
                    <Logo className="size-4" />
                  )}
                </span>
                <span className="font-medium text-[#141414]/80">{author}</span>
                <span aria-hidden>·</span>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span className="ml-1 rounded-[4px] bg-[#141414]/[0.06] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]">
                  {post.readingTimeMinutes} min
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
