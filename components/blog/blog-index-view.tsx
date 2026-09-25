import Link from "next/link";
import { Newspaper } from "@phosphor-icons/react/dist/ssr";
import { BlogCard } from "@/components/blog/blog-card";
import { Badge } from "@/components/ui/badge";
import { getAllPosts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";
import { absoluteImageUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  sideBeamGlowLeftSubtle,
  sideBeamGlowRightSubtle,
} from "@/lib/shadows";

export const POSTS_PER_BLOG_PAGE = 10;

type BlogIndexViewProps = {
  currentPage?: number;
};

export function getBlogPageCount() {
  return Math.max(1, Math.ceil(getAllPosts().length / POSTS_PER_BLOG_PAGE));
}

function pageHref(page: number) {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

export function BlogIndexView({ currentPage = 1 }: BlogIndexViewProps) {
  const posts = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_BLOG_PAGE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (safePage - 1) * POSTS_PER_BLOG_PAGE;
  const paginatedPosts = posts.slice(pageStart, pageStart + POSTS_PER_BLOG_PAGE);
  const currentUrl = `${baseUrl}${pageHref(safePage)}`;

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${baseUrl}/blog#blog`,
    name: "Studio1 Developer Marketing & Tech Blog",
    description:
      "Practical articles on developer marketing, technical content, documentation, developer experience, and growth for SaaS, AI, and devtool teams.",
    url: `${baseUrl}/blog`,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Studio1",
      url: baseUrl,
      logo: `${baseUrl}/icon.png`,
    },
    about: [
      "developer marketing",
      "developer relations",
      "technical content",
      "developer experience",
      "API documentation",
      "DevRel strategy",
    ].map((name) => ({
      "@type": "Thing",
      name,
    })),
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.date,
      dateModified: post.updatedDate,
      author: post.authors.map((author) => ({
        "@type": author === "Studio1 Team" ? "Organization" : "Person",
        name: author,
      })),
      image: absoluteImageUrl(post.socialImage),
      keywords: post.tags.join(", "),
    })),
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Studio1 Blog",
    description:
      "Articles and insights on developer tools, technical writing, DevRel strategies, and developer marketing from the Studio1 team.",
    url: currentUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Studio1",
      url: baseUrl,
    },
    mainEntity: blogJsonLd,
    hasPart: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Developer Marketing & Tech Blog", path: "/blog" },
  ]);

  return (
    <section className="relative mx-auto mt-24 flex max-w-7xl flex-col px-4 pb-24">
      <div aria-hidden className={sideBeamGlowLeftSubtle} />
      <div aria-hidden className={sideBeamGlowRightSubtle} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <div className="z-20 mt-20 text-center">
        <Badge className="mx-auto mb-6 flex w-fit items-center gap-2 bg-[color-mix(in_hsl,hsl(var(--primary-surface))_85%,hsl(var(--primary))_15%)] pb-1 hover:bg-[color-mix(in_hsl,hsl(var(--primary-surface))_85%,hsl(var(--primary))_15%)] dark:hover:bg-primary">
          <Newspaper className="size-5" weight="fill" />
          Our Blog
        </Badge>
        <h1 className="mb-5 font-primary text-4xl font-normal tracking-tight sm:text-6xl">
          Developer Marketing & Tech{" "}
          <span className="serif-accent bg-gradient-to-br from-primary via-primary1 to-primary bg-clip-text font-accent font-normal italic text-transparent">
            Blog
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
          Practical guides on technical content, developer relations,
          documentation, developer experience, and growth for SaaS, AI, and
          devtool teams.
        </p>
      </div>
      <div className="z-20 mx-auto mt-16 grid w-full max-w-5xl min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
        {paginatedPosts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>
      {totalPages > 1 ? (
        <nav
          aria-label="Blog pagination"
          className="z-20 mt-12 flex items-center justify-center gap-2"
        >
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;
            const isCurrent = page === safePage;

            return (
              <Link
                key={page}
                href={pageHref(page)}
                aria-current={isCurrent ? "page" : undefined}
                className={[
                  "flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {page}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </section>
  );
}
