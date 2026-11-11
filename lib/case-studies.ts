import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { estimateReadingMinutes } from "@/lib/blog";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";

const caseStudiesDirectory = path.join(process.cwd(), "content/case-studies");
const caseStudyFilePattern = /\.mdx$/;

export type CaseStudyMetric = {
  value: string;
  label: string;
  /** Public source backing the number (docs page, post, chart). Real data only. */
  evidence?: string;
};

export type CaseStudyQuote = {
  text: string;
  author: string;
  role?: string;
  /** Public source for the quote (LinkedIn post, review, etc.). */
  source?: string;
  /** Optional author portrait path or URL. */
  avatar?: string;
};

export type CaseStudyMeta = {
  slug: string;
  /** Outcome-driven headline, e.g. "How Memori went from launch to 12,000+ GitHub stars". */
  title: string;
  client: string;
  /** Longer description used for SEO metadata. */
  description: string;
  /** One-sentence outcome summary shown on cards. Falls back to description. */
  summary: string;
  /** Short service tag, e.g. "Open-source Growth". */
  category: string;
  /** Fact-strip field, e.g. "LLM Infrastructure". */
  industry: string;
  /** Services Studio1 provided during the engagement. */
  services: string[];
  /** Client website or repo. */
  website: string;
  /** Optional human-readable engagement window. Only set when real. */
  timeline: string;
  /** Exactly one study should be featured on the listing page. */
  featured: boolean;
  date: string;
  /** Last content review (YYYY-MM-DD). Falls back to `date`. Feeds dateModified. */
  updatedDate: string;
  order: number;
  cover: string;
  tags: string[];
  /** Verified outcome numbers only: never invented. Max 3 rendered in highlights. */
  metrics: CaseStudyMetric[];
  /** Client or community quotes. Used in proof panels (top when no metrics). */
  quotes: CaseStudyQuote[];
  /** Qualitative outcomes for impact lists and metric-light studies. */
  outcomes: string[];
  /** Where the client stood before the work, in one or two sentences. Empty when not set. */
  challenge: string;
  /** What the engagement set out to do, as short lines. */
  goals: string[];
  /** Concrete things Studio1 shipped (not outcomes). Story falls back to services. */
  deliverables: string[];
  /** Theme-matched closing CTA line, e.g. "Need docs that convert developers?" */
  ctaHook: string;
  readingTimeMinutes: number;
};

export type CaseStudy = CaseStudyMeta & {
  content: string;
};

type Frontmatter = {
  title?: string;
  client?: string;
  description?: string;
  summary?: string;
  category?: string;
  industry?: string;
  services?: string[];
  website?: string;
  timeline?: string;
  featured?: boolean;
  date?: string;
  /** Optional in every locale; untranslated files fall back to `date`. */
  updatedDate?: string | Date;
  order?: number;
  cover?: string;
  tags?: string[];
  metrics?: CaseStudyMetric[];
  quotes?: CaseStudyQuote[];
  outcomes?: string[];
  challenge?: string;
  goals?: string[];
  deliverables?: string[];
  ctaHook?: string;
  /** Draft studies stay in the repo but are excluded from every public surface. */
  draft?: boolean;
};

function isDraft(data: Frontmatter) {
  return data.draft === true;
}

/** YAML may parse an unquoted date as a Date; normalise to YYYY-MM-DD. */
function toDateString(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim().split("T")[0];
  }
  return undefined;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      )
    : [];
}

function toMeta(slug: string, data: Frontmatter, content: string): CaseStudyMeta {
  const date =
    toDateString(data.date) ?? new Date().toISOString().split("T")[0];
  return {
    slug,
    title: data.title ?? "Untitled",
    client: data.client ?? data.title ?? "Untitled",
    description: data.description ?? "",
    summary: data.summary ?? data.description ?? "",
    category: data.category ?? "Case Study",
    industry: data.industry ?? "",
    services: Array.isArray(data.services) ? data.services : [],
    website: data.website ?? "",
    timeline: data.timeline ?? "",
    featured: data.featured === true,
    date,
    updatedDate: toDateString(data.updatedDate) ?? date,
    order: typeof data.order === "number" ? data.order : 999,
    cover: data.cover ?? "/opengraph-image.png",
    tags: Array.isArray(data.tags) ? data.tags : [],
    metrics: Array.isArray(data.metrics) ? data.metrics : [],
    // Drafts mark unapproved quotes with "[PLACEHOLDER"; never render those.
    quotes: Array.isArray(data.quotes)
      ? data.quotes.filter(
          (quote) => !`${quote.text} ${quote.author}`.includes("[PLACEHOLDER"),
        )
      : [],
    outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
    challenge: typeof data.challenge === "string" ? data.challenge.trim() : "",
    goals: toStringList(data.goals),
    deliverables: toStringList(data.deliverables),
    ctaHook: data.ctaHook ?? "",
    readingTimeMinutes: estimateReadingMinutes(content),
  };
}

function localeDirectory(locale: Locale) {
  return path.join(caseStudiesDirectory, locale);
}

function getLocaleCaseStudyFiles(locale: Locale) {
  const directory = localeDirectory(locale);
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((fileName) => caseStudyFilePattern.test(fileName))
    .sort();
}

export function validateLocalizedCaseStudies() {
  const sourceFiles = getLocaleCaseStudyFiles(DEFAULT_LOCALE);
  if (sourceFiles.length === 0) {
    throw new Error(
      `Missing localized case study files in ${localeDirectory(DEFAULT_LOCALE)}`,
    );
  }

  for (const locale of LOCALES) {
    const files = getLocaleCaseStudyFiles(locale);
    const missing = sourceFiles.filter((fileName) => !files.includes(fileName));
    if (missing.length > 0) {
      throw new Error(
        `Missing ${locale} case study translations: ${missing.join(", ")}`,
      );
    }
  }
}

export function getAllCaseStudies(locale: Locale = DEFAULT_LOCALE): CaseStudyMeta[] {
  validateLocalizedCaseStudies();
  const directory = localeDirectory(locale);
  const fileNames = fs
    .readdirSync(directory)
    .filter((fileName) => caseStudyFilePattern.test(fileName));
  const studies = fileNames.flatMap((fileName) => {
    const slug = fileName.replace(/\.mdx$/, "");
    const fileContents = fs.readFileSync(
      path.join(directory, fileName),
      "utf8",
    );
    const { data, content } = matter(fileContents);
    if (isDraft(data as Frontmatter)) return [];
    return [toMeta(slug, data as Frontmatter, content)];
  });
  return studies.sort((a, b) => a.order - b.order);
}

export function getFeaturedCaseStudy(locale: Locale = DEFAULT_LOCALE): CaseStudyMeta | null {
  const studies = getAllCaseStudies(locale);
  return studies.find((s) => s.featured) ?? studies[0] ?? null;
}

export function getRelatedCaseStudies(
  slug: string,
  limit = 3,
  locale: Locale = DEFAULT_LOCALE,
): CaseStudyMeta[] {
  const studies = getAllCaseStudies(locale);
  const currentIndex = studies.findIndex((s) => s.slug === slug);

  if (currentIndex === -1) {
    return studies.slice(0, limit);
  }

  return studies
    .slice(currentIndex + 1)
    .concat(studies.slice(0, currentIndex))
    .slice(0, limit);
}

export function getCaseStudyBySlug(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): CaseStudy | null {
  validateLocalizedCaseStudies();
  const fullPath = path.join(localeDirectory(locale), `${slug}.mdx`);
  if (!fs.existsSync(fullPath)) return null;
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  if (isDraft(data as Frontmatter)) return null;
  return { ...toMeta(slug, data as Frontmatter, content), content };
}

export function getCaseStudySlugs(): string[] {
  return getAllCaseStudies(DEFAULT_LOCALE).map((s) => s.slug);
}

/** Descriptive alt text for case study cover images in cards, OG, and JSON-LD. */
export function getCaseStudyCoverAlt(
  study: Pick<CaseStudyMeta, "client" | "title" | "category">,
): string {
  return `${study.client} case study cover: ${study.title}`;
}

const GENERIC_IMAGE_ALT = /^(image|photo|picture|screenshot|img)$/i;

/** Human-readable fallback from a CDN or local image path. */
export function humanizeImageSrc(src: string): string {
  const filename = src.split("?")[0]?.split("/").pop() ?? "image";
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prefer explicit alt; fall back to a humanized filename when missing or generic. */
export function resolveCaseStudyImageAlt(
  alt: string | undefined,
  src: string | undefined,
): string {
  const trimmed = alt?.trim();
  if (trimmed && !GENERIC_IMAGE_ALT.test(trimmed)) {
    return trimmed;
  }
  if (src) {
    return humanizeImageSrc(src);
  }
  return "Case study illustration";
}
