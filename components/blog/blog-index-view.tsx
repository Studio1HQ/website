import { PaperBlogIndex } from "@/components/blog/paper-blog-index";
import { getListedPosts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";
import { absoluteImageUrl, breadcrumbJsonLd } from "@/lib/seo";

export const POSTS_PER_BLOG_PAGE = 10;

type BlogIndexViewProps = {
  currentPage?: number;
};

export function getBlogPageCount() {
  return Math.max(1, Math.ceil(getListedPosts().length / POSTS_PER_BLOG_PAGE));
}

function pageHref(page: number) {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

export function BlogIndexView({ currentPage = 1 }: BlogIndexViewProps) {
  const posts = getListedPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_BLOG_PAGE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (safePage - 1) * POSTS_PER_BLOG_PAGE;
  const paginatedPosts = posts.slice(
    pageStart,
    pageStart + POSTS_PER_BLOG_PAGE,
  );
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
