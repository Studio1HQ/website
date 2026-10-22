import Link from "next/link";
import { Newspaper } from "@phosphor-icons/react/dist/ssr";
import { BlogCard } from "@/components/blog/blog-card";
import { NightEyebrow, NightHeader } from "@/components/shared/night-header";
import { getAllPosts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";
import { absoluteImageUrl, breadcrumbJsonLd } from "@/lib/seo";

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

  const [featured, ...rest] = paginatedPosts;
  const showFeatured = safePage === 1 && Boolean(featured);
  const gridPosts = showFeatured ? rest : paginatedPosts;

  return (
    <div className="bg-[var(--home-cream)] text-[var(--home-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Night header, same language as the homepage hero */}
      <NightHeader className="pb-28 pt-40 md:pb-36 md:pt-48">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <NightEyebrow icon={<Newspaper weight="duotone" className="size-4 text-[#fdba74]" />}>
            Our Blog
          </NightEyebrow>
          <h1 className="mt-7 text-[40px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]">
            Developer Marketing & Tech <span className="s1-accent-text">Blog</span>
          </h1>
          <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-white/60 sm:text-[18px]">
            Practical guides on technical content, developer relations,
            documentation, developer experience, and growth for SaaS, AI, and
            devtool teams.
          </p>
        </div>
      </NightHeader>

      <section className="relative mx-auto w-full max-w-[1300px] px-4 pb-28 sm:px-6 lg:px-8">
        {showFeatured && featured ? (
          <div className="-mt-16 md:-mt-20">
            <BlogCard post={featured} featured />
          </div>
        ) : null}

        <div
          className={
            showFeatured
              ? "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              : "-mt-16 grid gap-6 sm:grid-cols-2 md:-mt-20 lg:grid-cols-3"
          }
        >
          {gridPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {totalPages > 1 ? (
          <nav aria-label="Blog pagination" className="mt-14 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              const isCurrent = page === safePage;
              return (
                <Link
                  key={page}
                  href={pageHref(page)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={
                    isCurrent
                      ? "s1-glass-btn flex size-11 items-center justify-center rounded-full text-[14px] font-medium text-white"
                      : "s1-glass-card flex size-11 items-center justify-center rounded-full text-[14px] font-medium text-[var(--home-ink)] transition-colors hover:text-primary"
                  }
                >
                  {page}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
