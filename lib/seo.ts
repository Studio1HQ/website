import type { Metadata } from "next";
import { baseUrl } from "@/lib/site";
import {
  AUTHORS,
  TEAM_AUTHOR,
  authorPersonId,
  authorUrl,
  getAuthorByName,
  type Author,
} from "@/lib/authors";
import {
  DEFAULT_LOCALE,
  hasLocalizedAlternates,
  localeMeta,
  languageAlternates,
  localizedUrl,
  type Locale,
} from "@/lib/i18n";
import { HOME_OG_ALT, HOME_OG_IMAGE, OG_SIZE, ogImageUrl } from "@/lib/og";

export { baseUrl };

/** The homepage share card, also the fallback for pages without their own. */
export const DEFAULT_OG_IMAGE = HOME_OG_IMAGE;
export const DEFAULT_OG_IMAGE_ALT = HOME_OG_ALT;

const defaultOgImageUrl = `${baseUrl}${DEFAULT_OG_IMAGE}`;

export const defaultOgImages = [
  {
    url: defaultOgImageUrl,
    ...OG_SIZE,
    alt: DEFAULT_OG_IMAGE_ALT,
    type: "image/png",
  },
];

/** og:image and twitter:image for a 1200x630 share card. */
function shareImages(url: string, alt: string, size: { width: number; height: number } = OG_SIZE) {
  const image = { url: absoluteImageUrl(url), ...size, alt, type: "image/png" };
  return {
    openGraph: [image],
    twitter: [{ url: image.url, alt }],
  };
}

/** Link previews show about 125 characters before cutting a description off. */
const SOCIAL_DESCRIPTION_MAX = 125;

/**
 * The meta description shortened for og:description and twitter:description,
 * so link previews end on a whole sentence (or the statement before a colon)
 * instead of being cut mid-word. Search snippets keep the full description.
 */
export function socialDescription(description: string) {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= SOCIAL_DESCRIPTION_MAX) return text;
  const head = text.slice(0, SOCIAL_DESCRIPTION_MAX);

  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  if (sentenceEnd >= 50) return text.slice(0, sentenceEnd + 1);

  const clauseEnd = Math.max(head.lastIndexOf(": "), head.lastIndexOf(" — "), head.lastIndexOf(" - "));
  if (clauseEnd >= 50) return `${text.slice(0, clauseEnd).trimEnd()}.`;

  const words = head.slice(0, head.lastIndexOf(" ")).replace(/[\s,;:–—-]+$/, "");
  return `${words}…`;
}

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

export function pageUrl(path: string): string {
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
  // Titles that already name Studio1 (e.g. "Studio1 vs Draft.dev") skip the
  // " | Studio1" suffix, so the brand never appears twice. See serpTitle.
  const { meta: metaTitle, full: brandedTitle } = serpTitle(title);
  const images = shareImages(ogImageUrl(title, path), `${title} | Studio1`);
  const shareDescription = socialDescription(description);

  return {
    title: metaTitle,
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
      description: shareDescription,
      url,
      siteName: "Studio1",
      locale: localeMeta[locale].htmlLang.replace("-", "_"),
      type,
      images: images.openGraph,
    },
    twitter: {
      title: brandedTitle,
      card: "summary_large_image",
      description: shareDescription,
      images: images.twitter,
      creator: "@Studio1HQ",
    },
  };
}

/** 60 characters with " | Studio1", the most a search result shows. */
export const HOME_TITLE = "DevRel and Developer Marketing Agency for Devtools";
export const HOME_DESCRIPTION =
  "Studio1 is a DevRel and developer marketing agency for devtool, AI, and open-source teams: technical content, docs, video, launches, and GitHub growth.";
/** Written for link previews, which show about 125 characters. */
export const HOME_SOCIAL_DESCRIPTION =
  "DevRel and developer marketing for devtool, AI, and open-source teams: content, docs, video, launches, and GitHub growth.";

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
  const images = shareImages(HOME_OG_IMAGE, HOME_OG_ALT);
  const shareDescription =
    description === HOME_DESCRIPTION ? HOME_SOCIAL_DESCRIPTION : socialDescription(description);

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
      description: shareDescription,
      url,
      siteName: "Studio1",
      locale: localeMeta[locale].htmlLang.replace("-", "_"),
      type: "website",
      images: images.openGraph,
    },
    twitter: {
      title: brandedTitle,
      card: "summary_large_image",
      description: shareDescription,
      images: images.twitter,
      creator: "@Studio1HQ",
    },
  };
}

/** Google shows about 60 characters of a title before cutting it off. */
const SERP_TITLE_LIMIT = 60;

/**
 * Adds " | Studio1" only when the result still fits in a search result, so a
 * long title is never cut off just to make room for the brand.
 */
/**
 * The final <title>, always returned as `absolute`: a section layout that sets
 * its own title (blog, case studies, careers…) stops the root "%s | Studio1"
 * template from reaching the pages under it, so the suffix is added here.
 * Titles that already name Studio1, or would pass the SERP limit, stay as is.
 */
function serpTitle(title: string) {
  if (title.includes("Studio1")) {
    return { meta: { absolute: title }, full: title };
  }
  const branded = `${title} | Studio1`;
  return branded.length <= SERP_TITLE_LIMIT
    ? { meta: { absolute: branded }, full: branded }
    : { meta: { absolute: title }, full: title };
}

export function articlePageMetadata({
  title,
  description,
  path,
  locale = DEFAULT_LOCALE,
  keywords,
  image,
  imageAlt,
  imageWidth = OG_SIZE.width,
  imageHeight = OG_SIZE.height,
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
  imageWidth?: number;
  imageHeight?: number;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  authors?: string[];
  tags?: string[];
}): Metadata {
  const url = localizedUrl(path, locale, baseUrl);
  // Pages without a share image of their own get a generated card.
  const ogImageAlt = imageAlt?.trim() || title;
  const images = shareImages(image ?? ogImageUrl(title, path), ogImageAlt, {
    width: imageWidth,
    height: imageHeight,
  });
  const shareDescription = socialDescription(description);
  const { meta: metaTitle, full: brandedTitle } = serpTitle(title);
  const authorList = authors?.length ? authors : author ? [author] : [];
  // Named authors link to their profile page (rel="author", article:author).
  const authorRefs = authorList.map((name) => {
    const profile = getAuthorByName(name);
    return profile ? { name, url: authorUrl(profile) } : { name };
  });

  return {
    title: metaTitle,
    description,
    ...(keywords?.length ? { keywords } : {}),
    ...(authorRefs.length ? { authors: authorRefs } : {}),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: brandedTitle,
      description: shareDescription,
      url,
      siteName: "Studio1",
      type: "article",
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authorRefs.length
        ? { authors: authorRefs.map((ref) => ref.url ?? ref.name) }
        : {}),
      ...(tags?.length ? { tags } : {}),
      images: images.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description: shareDescription,
      images: images.twitter,
      creator: "@Studio1HQ",
    },
  };
}

/** Full Person node for an author, as on their profile page. */
export function authorPersonJsonLd(author: Author) {
  return {
    "@type": "Person",
    "@id": authorPersonId(author),
    name: author.name,
    url: authorUrl(author),
    image: absoluteImageUrl(author.image),
    jobTitle: author.jobTitle,
    description: author.bio,
    worksFor: { "@id": ORGANIZATION_ID },
    knowsAbout: author.knowsAbout,
    sameAs: author.links.map((link) => link.href),
  };
}

/**
 * Article author nodes: named authors point at their profile's Person node,
 * the team byline at the Studio1 Organization.
 */
export function articleAuthorsJsonLd(names: string[]) {
  return names.map((name) => {
    if (name === TEAM_AUTHOR) {
      return {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "Studio1",
        url: baseUrl,
      };
    }
    const author = getAuthorByName(name);
    return author
      ? {
          "@type": "Person",
          "@id": authorPersonId(author),
          name: author.name,
          url: authorUrl(author),
        }
      : { "@type": "Person", name };
  });
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
  const jobType = job.type.toLowerCase();
  const employmentType = jobType.includes("full-time")
    ? "FULL_TIME"
    : jobType.includes("contract")
      ? "CONTRACTOR"
      : jobType.includes("intern")
        ? "INTERN"
        : jobType.includes("part-time")
          ? "PART_TIME"
          : "OTHER";

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

/** Stable id so every page's schema points at the same Organization node. */
export const ORGANIZATION_ID = `${baseUrl}/#organization`;

export const ORGANIZATION_DESCRIPTION =
  "Studio1 (studio1hq.com) is a DevRel and developer marketing agency for devtool, AI, and open-source teams. We ship technical content, docs and DX audits, developer videos, launches, GitHub growth, and community programs that drive developer adoption. Studio1 also maintains the open-source Awesome AI Apps collection and Awesome LLM Benchmarks.";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "Studio1",
    legalName: "STUDI01HQ PRIVATE LIMITED",
    alternateName: "Studio1HQ",
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/icon.png`,
    },
    description: ORGANIZATION_DESCRIPTION,
    email: "contact@studio1hq.com",
    knowsAbout: [
      "Developer relations",
      "Developer marketing",
      "Technical content marketing",
      "GitHub growth",
      "Open-source marketing",
      "Developer documentation",
      "Developer experience audits",
      "Developer video production",
      "Product launches for developer tools",
    ],
    founder: AUTHORS.map((author) => ({
      "@type": "Person",
      "@id": authorPersonId(author),
      name: author.name,
      url: authorUrl(author),
      jobTitle: author.jobTitle,
      sameAs: author.links.map((link) => link.href),
    })),
    sameAs: [
      "https://x.com/Studio1HQ",
      "https://www.linkedin.com/company/studio1hq/",
      "https://github.com/Studio1HQ",
      "https://www.youtube.com/@studio1hq",
      "https://dev.to/studio1hq",
      "https://www.instagram.com/studio1_hq/",
    ],
  };
}

export function serviceJsonLd({
  name,
  description,
  path,
  serviceType,
}: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: "Worldwide",
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Developer tool, AI, and open-source companies",
    },
    url: pageUrl(path),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Studio1",
    url: baseUrl,
    description: HOME_DESCRIPTION,
    publisher: { "@id": ORGANIZATION_ID },
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
