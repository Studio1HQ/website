import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import {
  getCaseStudyBySlug,
  getCaseStudyCoverAlt,
  getCaseStudySlugs,
  getRelatedCaseStudies,
} from "@/lib/case-studies";
import { CaseStudyLayout } from "@/components/case-studies/case-study-layout";
import { caseStudyMdxComponents } from "@/components/case-studies/mdx";
import {
  absoluteImageUrl,
  articlePageMetadata,
  baseUrl,
  localizedBreadcrumbJsonLd,
  ORGANIZATION_ID,
} from "@/lib/seo";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug, DEFAULT_LOCALE);
  if (!study) {
    return { title: "Not found" };
  }

  return articlePageMetadata({
    title: study.title,
    description: study.description,
    path: `/case-studies/${slug}`,
    locale: DEFAULT_LOCALE,
    keywords: study.tags,
    image: study.cover,
    imageAlt: getCaseStudyCoverAlt(study),
    publishedTime: study.date,
    tags: study.tags,
  });
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug, DEFAULT_LOCALE);
  if (!study) notFound();

  const related = getRelatedCaseStudies(slug, 3, DEFAULT_LOCALE);
  // Counts and ranks ("2K+", "#3"), not worded results like "Hackathons".
  const resultNumbers = study.metrics.filter((metric) =>
    /^[~#]?\d/.test(metric.value),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.description,
    datePublished: study.date,
    about: {
      "@type": "Organization",
      name: study.client,
      ...(study.website ? { url: study.website } : {}),
    },
    // Verified result numbers, so answer engines can quote them directly.
    ...(resultNumbers.length
      ? {
          abstract: resultNumbers
            .map((metric) => `${metric.value} ${metric.label}`)
            .join("; "),
        }
      : {}),
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": localizedUrl(`/case-studies/${slug}`, DEFAULT_LOCALE, baseUrl),
    },
    image: {
      "@type": "ImageObject",
      url: absoluteImageUrl(study.cover),
      caption: getCaseStudyCoverAlt(study),
    },
    keywords: study.tags.join(", "),
    articleSection: "Case Studies",
  };

  const breadcrumbSchema = localizedBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Case Studies", path: "/case-studies" },
    { name: study.title, path: `/case-studies/${slug}` },
  ], DEFAULT_LOCALE);

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
      <CaseStudyLayout study={study} related={related}>
        <MDXRemote
          source={study.content}
          components={caseStudyMdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </CaseStudyLayout>
    </>
  );
}
