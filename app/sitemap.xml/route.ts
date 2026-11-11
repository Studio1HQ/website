import { AGENCIES_CHECKED } from "@/data/agencies";
import { COMPARISONS } from "@/data/comparisons";
import { OSS_SNAPSHOT_DATE } from "@/data/oss";
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

/**
 * Last real content change per page (YYYY-MM-DD). Update the date when you
 * change a page's copy, so crawlers and AI search see honest freshness.
 */
const PAGE_LAST_MODIFIED: Record<string, string> = {
  "/": "2026-11-10",
  "/technical-content-marketing": "2026-10-30",
  "/developer-documentation-dx-audit": "2026-10-29",
  "/developer-video-production": "2026-11-08",
  "/developer-relations-growth-campaigns": "2026-11-08",
  "/about-us": "2026-11-10",
  "/product": "2026-11-02",
  "/case-studies": "2026-11-10",
  "/services": "2026-11-10",
  "/github-growth-agency": "2026-11-10",
  "/product-launch-service": "2026-11-10",
  "/aeo-agency": "2026-11-10",
  "/reddit-marketing-agency": "2026-11-10",
  "/developer-content-distribution": "2026-11-10",
  "/careers": "2026-11-11",
  "/devrel-jobs": "2026-11-10",
  "/team": "2026-11-08",
  "/events": "2026-11-07",
  "/calendar": "2026-11-07",
  "/brand": "2026-11-07",
};
const STATIC_LAST_MODIFIED = "2026-11-09";
const lastModified = (path: string) =>
  PAGE_LAST_MODIFIED[path] ?? STATIC_LAST_MODIFIED;
const LEGAL_LAST_MODIFIED = "2026-11-09";
const GROWTH_PAGES_LAST_MODIFIED = "2026-10-29";
const DEVREL_COHORT_LAST_MODIFIED = "2026-11-02";
const INFLUENCER_PAGE_LAST_MODIFIED = "2026-11-09";

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
      lastModified: lastModified(path),
      priority: path === "/" ? 1.0 : 0.8,
      localized: true,
    }),
  );

  const englishOnlyPaths: SitemapEntry[] = [
    {
      path: "/services",
      lastModified: PAGE_LAST_MODIFIED["/services"] ?? GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/github-growth-agency",
      lastModified: PAGE_LAST_MODIFIED["/github-growth-agency"] ?? GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/product-launch-service",
      lastModified: PAGE_LAST_MODIFIED["/product-launch-service"] ?? GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/aeo-agency",
      lastModified: PAGE_LAST_MODIFIED["/aeo-agency"] ?? GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/reddit-marketing-agency",
      lastModified: PAGE_LAST_MODIFIED["/reddit-marketing-agency"] ?? GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/developer-content-distribution",
      lastModified: PAGE_LAST_MODIFIED["/developer-content-distribution"] ?? GROWTH_PAGES_LAST_MODIFIED,
      priority: 0.9,
    },
    {
      path: "/influencer-marketing-agency",
      lastModified: INFLUENCER_PAGE_LAST_MODIFIED,
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
      lastModified: lastModified("/case-studies"),
      priority: 0.8,
    },
    { path: "/careers", lastModified: lastModified("/careers"), priority: 0.8 },
    {
      path: "/devrel-jobs",
      lastModified: lastModified("/devrel-jobs"),
      priority: 0.8,
    },
    {
      path: "/devrel-cohort",
      lastModified: DEVREL_COHORT_LAST_MODIFIED,
      priority: 0.8,
    },
    { path: "/oss", lastModified: OSS_SNAPSHOT_DATE, priority: 0.8 },
    {
      path: "/blog",
      // The blog index changes whenever a post is published or updated.
      lastModified:
        getAllPosts()
          .map((post) => post.updatedDate)
          .sort()
          .at(-1) ?? STATIC_LAST_MODIFIED,
      priority: 0.8,
    },
    { path: "/brand", lastModified: lastModified("/brand"), priority: 0.6 },
    { path: "/team", lastModified: lastModified("/team"), priority: 0.7 },
    { path: "/events", lastModified: lastModified("/events"), priority: 0.7 },
    {
      path: "/calendar",
      lastModified: lastModified("/calendar"),
      priority: 0.5,
    },
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
