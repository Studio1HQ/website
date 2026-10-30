import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePage } from "@/components/pages/compare/compare-page";
import { COMPARISONS, getComparison } from "@/data/comparisons";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";
import { PAPER_SCOPE } from "@/lib/paper";
import { breadcrumbJsonLd, ORGANIZATION_ID, pageMetadata } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISONS.map((comparison) => ({ slug: comparison.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) return { title: "Not found" };

  return pageMetadata({
    title: comparison.title,
    description: comparison.description,
    path: `/compare/${comparison.slug}`,
    locale: DEFAULT_LOCALE,
    keywords: comparison.keywords,
  });
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) notFound();

  const path = `/compare/${comparison.slug}`;
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: comparison.title,
    description: comparison.description,
    url: localizedUrl(path, DEFAULT_LOCALE, baseUrl),
    dateModified: comparison.checked,
    publisher: { "@id": ORGANIZATION_ID },
    about: [
      { "@id": ORGANIZATION_ID },
      {
        "@type": "Organization",
        name: comparison.competitor,
        url: comparison.competitorUrl,
      },
    ],
  };

  return (
    <div style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: `Studio1 vs ${comparison.competitor}`, path },
            ]),
          ),
        }}
      />
      <ComparePage comparison={comparison} />
    </div>
  );
}
