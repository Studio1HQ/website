import type { Metadata } from "next";
import { baseUrl } from "@/lib/site";
import {
  DEFAULT_LOCALE,
  hasLocalizedAlternates,
  localeMeta,
  languageAlternates,
  localizedUrl,
  type Locale,
} from "@/lib/i18n";

export { baseUrl };

export const DEFAULT_OG_IMAGE = "/opengraph-image.png";
export const DEFAULT_OG_IMAGE_ALT =
  "Studio1 - Technical Content and Developer Growth Services";

const defaultOgImageUrl = `${baseUrl}${DEFAULT_OG_IMAGE}`;

export const defaultOgImages = [
  {
    url: defaultOgImageUrl,
    width: 1200,
    height: 630,
    alt: DEFAULT_OG_IMAGE_ALT,
  },
];

export function absoluteImageUrl(image?: string): string {
  if (!image) return defaultOgImageUrl;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  return `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}`;
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function pageUrl(path: string): string {
  const normalized = normalizePath(path);
  return normalized === "" ? baseUrl : `${baseUrl}${normalized}`;
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  keywords?: string[];
  type?: "website" | "article";
  rssPath?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  locale = DEFAULT_LOCALE,
  keywords,
  type = "website",
  rssPath,
}: PageMetadataOptions): Metadata {
  const url = localizedUrl(path, locale, baseUrl);
  const brandedTitle = `${title} | Studio1`;

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: url,
      ...(hasLocalizedAlternates(path)
        ? { languages: languageAlternates(path, baseUrl) }
        : {}),
      ...(rssPath
        ? { types: { "application/rss+xml": pageUrl(rssPath) } }
        : {}),
    },
    openGraph: {
      title: brandedTitle,
      description,
      url,
      siteName: "Studio1",
      locale: localeMeta[locale].htmlLang.replace("-", "_"),
      type,
      images: [...defaultOgImages],
    },
    twitter: {
      title: brandedTitle,
      card: "summary_large_image",
      description,
      images: [defaultOgImageUrl],
      creator: "@Studio1HQ",
    },
  };
}

const HOME_TITLE = "Technical Content & Developer Growth Agency for DevTools";
const HOME_DESCRIPTION =
  "Studio1 is a technical content and developer growth partner for SaaS and devtool teams. We produce tutorials, docs, videos, launches, and developer programs that drive adoption.";

export function homePageMetadata({
  title = HOME_TITLE,
  description = HOME_DESCRIPTION,
  locale = DEFAULT_LOCALE,
}: {
  title?: string;
  description?: string;
  locale?: Locale;
} = {}): Metadata {
  const brandedTitle = `${title} | Studio1`;
  const url = localizedUrl("/", locale, baseUrl);

  return {
    title: {
      absolute: brandedTitle,
    },
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates("/", baseUrl),
    },
    openGraph: {
      title: brandedTitle,
      description,
      url,
      siteName: "Studio1",
      locale: localeMeta[locale].htmlLang.replace("-", "_"),
      type: "website",
      images: [...defaultOgImages],
    },
    twitter: {
      title: brandedTitle,
      card: "summary_large_image",
      description,
      images: [defaultOgImageUrl],
      creator: "@Studio1HQ",
    },
  };
}

export function articlePageMetadata({
  title,
  description,
  path,
  locale = DEFAULT_LOCALE,
  keywords,
  image,
  imageAlt,
  publishedTime,
  modifiedTime,
  author,
  authors,
  tags,
}: {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  authors?: string[];
  tags?: string[];
}): Metadata {
  const url = localizedUrl(path, locale, baseUrl);
  const ogImage = absoluteImageUrl(image);
  const ogImageAlt = imageAlt?.trim() || title;
  const brandedTitle = `${title} | Studio1`;
  const authorList = authors?.length ? authors : author ? [author] : [];

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: brandedTitle,
      description,
      url,
      siteName: "Studio1",
      type: "article",
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authorList.length ? { authors: authorList } : {}),
      ...(tags?.length ? { tags } : {}),
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [ogImage],
      creator: "@Studio1HQ",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function localizedBreadcrumbJsonLd(
  items: { name: string; path: string }[],
  locale: Locale = DEFAULT_LOCALE,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: localizedUrl(item.path, locale, baseUrl),
    })),
  };
}

export function stripMarkdownForSchema(value: string) {
  return value
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_#[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function jobPostingJsonLd(job: {
  title: string;
  description: string;
  content: string;
  location: string;
  type: string;
  status: string;
  postedDate: string;
  id: string;
  isRemote: boolean;
  applyUrl: string;
}) {
  const normalizedStatus = job.status?.toLowerCase() ?? "";
  const isUnavailable =
    normalizedStatus.includes("soon") || normalizedStatus.includes("closed");
  const employmentType = job.type.toLowerCase().includes("contract")
    ? "CONTRACTOR"
    : "INTERN";

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: stripMarkdownForSchema(job.content || job.description),
    datePosted: job.postedDate,
    employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: "Studio1",
      sameAs: baseUrl,
      logo: `${baseUrl}/icon.png`,
    },
    identifier: {
      "@type": "PropertyValue",
      name: "Studio1",
      value: job.id,
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: "India",
    },
    ...(job.isRemote ? { jobLocationType: "TELECOMMUTE" } : {}),
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "IN",
      },
    },
    directApply: !isUnavailable,
    url: pageUrl(`/careers/${job.id}`),
    ...(!isUnavailable ? { applicationContact: job.applyUrl } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Studio1",
    url: baseUrl,
    description: HOME_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: "Studio1",
      url: baseUrl,
      logo: `${baseUrl}/icon.png`,
    },
  };
}

export function softwareApplicationJsonLd(product: {
  name: string;
  description: string;
  url: string;
  category: string;
  statusLabel: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.description,
    url: product.url,
    applicationCategory: product.category,
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability:
        product.statusLabel === "Upcoming"
          ? "https://schema.org/PreOrder"
          : "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: "Studio1",
      url: baseUrl,
    },
  };
}
