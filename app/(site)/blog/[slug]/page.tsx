import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import {
  countBlogWords,
  getLatestPosts,
  getPostBySlug,
  getPostSlugs,
} from "@/lib/blog";
import { PostLayout } from "@/components/blog/post-layout";
import { postMarkdownUrl } from "@/lib/blog-markdown";
import { BLOG_COVER_SIZE } from "@/lib/blog-cover";
import {
  blogMdxComponents,
  transformBlogMdxContent,
} from "@/components/blog/mdx";
import { remarkSafeMdx } from "@/lib/internal/blog/safe-mdx";
import {
  absoluteImageUrl,
  articleAuthorsJsonLd,
  articlePageMetadata,
  baseUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Not found" };
  }

  const metadata = articlePageMetadata({
    title: post.seoTitle,
    description: post.description,
    path: `/blog/${slug}`,
    keywords: post.tags,
    image: post.ogImage,
    imageAlt: `${post.title} cover`,
    publishedTime: post.date,
    modifiedTime: post.updatedDate,
    authors: post.authors,
    tags: post.tags,
  });

  // Advertise the Markdown version for LLMs and AI tools.
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: { "text/markdown": postMarkdownUrl(slug) },
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updatedDate,
    author: articleAuthorsJsonLd(post.authors),
    publisher: {
      "@type": "Organization",
      name: "Studio1",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${slug}`,
    },
    image: {
      "@type": "ImageObject",
      url: absoluteImageUrl(post.socialImage),
      width: BLOG_COVER_SIZE.width,
      height: BLOG_COVER_SIZE.height,
      caption: `${post.title} cover`,
    },
    keywords: post.tags.join(", "),
    articleSection: post.tags,
    wordCount: countBlogWords(post.content),
    inLanguage: "en",
    isAccessibleForFree: true,
    abstract: post.description,
    articleBody: post.plainText,
    about: post.tags.map((tag) => ({
      "@type": "Thing",
      name: tag,
    })),
  };

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Our Blog", path: "/blog" },
    { name: post.title, path: `/blog/${slug}` },
  ]);
  const faqSchema = post.faqs.length ? faqPageJsonLd(post.faqs) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      <PostLayout
        title={post.title}
        description={post.description}
        date={post.date}
        updatedDate={post.updatedDate}
        author={post.author}
        authors={post.authors}
        tags={post.tags}
        slug={slug}
        bannerImage={post.bannerImage}
        bannerImageAlt={post.bannerImageAlt}
        readingTimeMinutes={post.readingTimeMinutes}
        wordCount={countBlogWords(post.content)}
        shareUrl={`${baseUrl}/blog/${slug}`}
        markdownUrl={postMarkdownUrl(slug)}
        tldrSummary={post.tldrSummary}
        keyTakeaways={post.keyTakeaways}
        navigation={post.navigation}
        latest={getLatestPosts(slug, 3)}
      >
        <MDXRemote
          source={transformBlogMdxContent(post.content)}
          components={blogMdxComponents}
          // Posts are Markdown only: any HTML, component or code in a file is
          // dropped, except the FAQ and YouTube components the blog writes itself.
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, [remarkSafeMdx, { generated: true }]],
            },
          }}
        />
      </PostLayout>
    </>
  );
}
