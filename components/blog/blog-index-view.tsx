import { PaperBlogIndex } from "@/components/blog/paper-blog-index";
import { getListedPosts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";
import {
  absoluteImageUrl,
  articleAuthorsJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";

/**
 * Page 1 shows a featured post above a 3-column grid of 9, so it takes 10.
 * Later pages are grid only, so 9 fills three full rows with no orphan card.
 */
const FIRST_PAGE_POSTS = 10;
export const POSTS_PER_BLOG_PAGE = 9;

/** Number of pages needed for `count` posts. */
function pageCountFor(count: number) {
  if (count <= FIRST_PAGE_POSTS) return 1;
  return 1 + Math.ceil((count - FIRST_PAGE_POSTS) / POSTS_PER_BLOG_PAGE);
}

/** Index of the first post on `page` (1-based). */
function pageStartFor(page: number) {
  return page === 1 ? 0 : FIRST_PAGE_POSTS + (page - 2) * POSTS_PER_BLOG_PAGE;
}

type BlogIndexViewProps = {
  currentPage?: number;
};

export function getBlogPageCount() {
  return pageCountFor(getListedPosts().length);
}

function pageHref(page: number) {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

export function BlogIndexView({ currentPage = 1 }: BlogIndexViewProps) {
  const posts = getListedPosts();
  const totalPages = pageCountFor(posts.length);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = pageStartFor(safePage);
  const paginatedPosts = posts.slice(
    pageStart,
    pageStart + (safePage === 1 ? FIRST_PAGE_POSTS : POSTS_PER_BLOG_PAGE),
  );
  const currentUrl = `${baseUrl}${pageHref(safePage)}`;

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${baseUrl}/blog#blog`,
    name: "Studio1 Developer Marketing & Tech Blog",
    description:
      "Practical articles on developer marketing, technical content, documentation, developer experience, and growth for devtool, AI, and open-source teams.",
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
      author: articleAuthorsJsonLd(post.authors),
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PaperBlogIndex
        posts={posts}
        pagePosts={paginatedPosts}
        pageStart={pageStart}
        currentPage={safePage}
        totalPages={totalPages}
      />
    </>
  );
}
