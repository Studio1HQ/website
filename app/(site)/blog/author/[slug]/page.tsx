import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperAuthorProfile } from "@/components/blog/paper-author-profile";
import { AUTHORS, authorPath, authorUrl, getAuthorBySlug } from "@/lib/authors";
import { getListedPosts } from "@/lib/blog";
import {
  authorPersonJsonLd,
  baseUrl,
  breadcrumbJsonLd,
  pageMetadata,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return AUTHORS.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: "Not found" };

  return pageMetadata({
    title: `${author.name}, ${author.jobTitle}`,
    description: author.bio,
    path: authorPath(author),
    keywords: [author.name, ...author.knowsAbout],
  });
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  // "No." matches the blog index: publishing order across all listed posts.
  const listed = getListedPosts();
  const posts = listed
    .map((post, index) => ({ post, number: listed.length - index }))
    .filter(({ post }) => post.authors.includes(author.name));

  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${authorUrl(author)}#profile`,
    url: authorUrl(author),
    name: `${author.name}, ${author.jobTitle} at Studio1`,
    inLanguage: "en",
    ...(posts[0] ? { dateModified: posts[0].post.updatedDate } : {}),
    mainEntity: authorPersonJsonLd(author),
    hasPart: posts.map(({ post }) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.date,
    })),
  };

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: author.name, path: authorPath(author) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PaperAuthorProfile author={author} posts={posts} />
    </>
  );
}
