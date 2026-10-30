import { AGENCIES_CHECKED } from "@/data/agencies";
import { COMPARISONS } from "@/data/comparisons";
import { AUTHORS, authorPath } from "@/lib/authors";
import { getAllPosts } from "@/lib/blog";
import { getAllCaseStudies } from "@/lib/case-studies";
import { getJobOpenings } from "@/lib/careers";
import {
  LOCALIZED_PUBLIC_PATHS,
  LOCALES,
  languageAlternates,
  localizedUrl,
  type Locale,
} from "@/lib/i18n";
import { baseUrl } from "@/lib/site";

type SitemapEntry = {
  path: string;
  lastModified: string;
  priority: number;
  localized?: boolean;
};

const STATIC_LAST_MODIFIED = "2026-08-12";
const LEGAL_LAST_MODIFIED = "2025-01-15";
const GROWTH_PAGES_LAST_MODIFIED = "2026-10-29";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(entry: SitemapEntry, locale: Locale) {
  const links = entry.localized
    ? Object.entries(languageAlternates(entry.path, baseUrl))
        .map(
          ([hreflang, href]) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(
              hreflang,
            )}" href="${escapeXml(href)}" />`,
        )
        .join("\n")
    : "";

  return `  <url>
    <loc>${escapeXml(localizedUrl(entry.path, locale, baseUrl))}</loc>
    <lastmod>${escapeXml(entry.lastModified)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
${links ? `${links}\n` : ""}  </url>`;
}

export async function GET() {
  const localizedStaticPaths: SitemapEntry[] = LOCALIZED_PUBLIC_PATHS.map(
    (path) => ({
      path,
      lastModified: STATIC_LAST_MODIFIED,
      priority: path === "/" ? 1.0 : 0.8,
      localized: true,
    }),
  );

  const englishOnlyPaths: SitemapEntry[] = [
    {
      path: "/services",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/github-growth-agency",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/product-launch-service",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/aeo-agency",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/reddit-marketing-agency",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/developer-content-distribution",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/best-developer-marketing-agencies",
      lastModified: AGENCIES_CHECKED,
      priority: 0.7,
    },
    ...COMPARISONS.map((comparison) => ({
      path: `/compare/${comparison.slug}`,
      lastModified: comparison.checked,
      priority: 0.7,
    })),
    {
      path: "/testimonials",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.6,
    },
    {
      path: "/results",
      lastModified: GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.8,
    },
    {
      path: "/case-studies",
      lastModified: STATIC_LAST_MODIFIED,
      priority: 0.8,
    },
    { path: "/careers", lastModified: STATIC_LAST_MODIFIED, priority: 0.8 },
    {
      path: "/devrel-jobs",
      lastModified: STATIC_LAST_MODIFIED,
      priority: 0.8,
    },
    { path: "/blog", lastModified: STATIC_LAST_MODIFIED, priority: 0.8 },
    { path: "/terms", lastModified: LEGAL_LAST_MODIFIED, priority: 0.5 },
    { path: "/privacy", lastModified: LEGAL_LAST_MODIFIED, priority: 0.5 },
    ...getJobOpenings("en").map((job) => ({
      path: `/careers/${job.id}`,
      lastModified: job.postedDate,
      priority: 0.7,
    })),
    ...getAllCaseStudies("en").map((study) => ({
      path: `/case-studies/${study.slug}`,
      lastModified: study.date,
      priority: 0.7,
    })),
    ...getAllPosts().map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: post.updatedDate,
      priority: 0.7,
    })),
    ...AUTHORS.map((author) => ({
      path: authorPath(author),
      lastModified:
        getAllPosts().find((post) => post.authors.includes(author.name))
          ?.updatedDate ?? STATIC_LAST_MODIFIED,
      priority: 0.6,
    })),
  ];

  const localizedEntries = localizedStaticPaths
    .flatMap((entry) => LOCALES.map((locale) => urlEntry(entry, locale)))
    .join("\n");

  const englishOnlyEntries = englishOnlyPaths
    .map((entry) => urlEntry(entry, "en"))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[localizedEntries, englishOnlyEntries].filter(Boolean).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
