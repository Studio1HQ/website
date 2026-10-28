import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { tagLabel } from "@/lib/blog-tags";
import { cn } from "@/lib/utils";

/**
 * Docs-style article index for the blog post sidebar: every post grouped by
 * its primary tag, with the current post marked.
 */
export function BlogSidebar({ currentSlug }: { currentSlug: string }) {
  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const post of getAllPosts()) {
    const key = tagLabel(post.tags[0] ?? "Articles");
    const list = groups.get(key) ?? [];
    list.push({ slug: post.slug, title: post.title });
    groups.set(key, list);
  }
  const ordered = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <nav aria-label="All articles" className="space-y-8">
      {ordered.map(([group, posts]) => (
        <div key={group}>
          <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--home-ink-soft)]">
            {group}
          </p>
          <ul className="space-y-0.5">
            {posts.map((post) => {
              const isCurrent = post.slug === currentSlug;
              return (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "group flex items-start gap-2.5 rounded-lg py-1.5 text-[13.5px] leading-snug transition-colors duration-200",
                      isCurrent
                        ? "font-medium text-[var(--home-ink)]"
                        : "text-[var(--home-ink-soft)] hover:text-[var(--home-ink)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-[7px] size-1.5 shrink-0 transition-colors",
                        isCurrent
                          ? "bg-[#f97316]"
                          : "bg-transparent group-hover:bg-[var(--home-line)]",
                      )}
                    />
                    <span className="line-clamp-2">{post.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
