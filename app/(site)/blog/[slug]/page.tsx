import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import { PostLayout } from "@/components/blog/post-layout";
import { blogMdxComponents } from "@/components/blog/mdx";
import {
  absoluteImageUrl,
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

  return articlePageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${slug}`,
    keywords: post.tags,
    image: post.socialImage,
    imageAlt: post.bannerImageAlt,
    publishedTime: post.date,
    modifiedTime: post.updatedDate,
    authors: post.authors,
    tags: post.tags,
  });
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
    author: post.authors.map((author) => ({
      "@type": author === "Studio1 Team" ? "Organization" : "Person",
      name: author,
      url: baseUrl,
    })),
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
      width: 1200,
      height: 630,
      caption: post.bannerImageAlt,
    },
    keywords: post.tags.join(", "),
    articleSection: post.tags,
    wordCount: post.content.split(/\s+/).filter(Boolean).length,
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
        readingTimeMinutes={post.readingTimeMinutes}
        shareUrl={`${baseUrl}/blog/${slug}`}
        keyTakeaways={post.keyTakeaways}
        navigation={post.navigation}
      >
        <MDXRemote
          source={post.content}
          components={blogMdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </PostLayout>
    </>
  );
}
