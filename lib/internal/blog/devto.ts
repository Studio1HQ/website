import matter from "gray-matter";
import { blogCoverUrl } from "@/lib/blog-cover";
import { baseUrl } from "@/lib/site";

/*
 * Studio1 posts on DEV (dev.to), for Blog → External: turning a live post
 * into a DEV draft whose canonical URL points back to studio1hq.com, and
 * reading the DEV account's articles. Pure: no network, no env, no files.
 * The API calls are in lib/internal/blog/devto-api.ts.
 */

/** What POST https://dev.to/api/articles takes, inside `{ article: … }`. */
export type DevDraft = {
  title: string;
  body_markdown: string;
  published: false;
  canonical_url: string;
  /** Left out when the post has none; DEV then writes one from the body. */
  description?: string;
  tags: string[];
  main_image?: string;
  organization_id?: number;
};

/** One article on the DEV account, cleaned from DEV's JSON. */
export type DevArticle = {
  id: number;
  title: string;
  /** The article on dev.to; null when DEV sent something that isn't a dev.to link. */
  url: string | null;
  published: boolean;
  publishedAt: string | null;
  reactions: number;
  comments: number;
  views: number;
  /** The Studio1 post this is a copy of (its canonical URL), else null. */
  slug: string | null;
};

/** DEV limits (Forem's article and tag rules). */
const MAX_TAGS = 4;
const MAX_TAG_LENGTH = 30;
const MAX_TITLE = 128;
const MAX_DESCRIPTION = 170;

const SITE_HOSTS = new Set(["studio1hq.com", "www.studio1hq.com"]);

/** Where a post lives on the site: its canonical URL. */
export function canonicalUrl(slug: string) {
  return `${baseUrl}/blog/${slug}`;
}

/**
 * The post slug in a studio1hq.com blog URL ("https://studio1hq.com/blog/x/"
 * → "x"), else null. Matches DEV articles to the posts they copy.
 */
export function canonicalSlug(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!SITE_HOSTS.has(parsed.hostname)) return null;
  return parsed.pathname.match(/^\/blog\/([a-z0-9-]{1,120})\/?$/)?.[1] ?? null;
}

/**
 * DEV tags: at most four, lowercase letters and digits only (DEV refuses
 * hyphens, so "ai-agents" becomes "aiagents"), no repeats. Takes a list or
 * a comma-separated string, like the posts' frontmatter.
 */
export function devTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  const tags = raw
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => item.split(","))
    .map((tag) =>
      tag
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, MAX_TAG_LENGTH),
    )
    .filter(Boolean);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

/** A root-relative path ("/blog/x", not "//cdn…") made absolute against the site. */
const absolute = (value: string) =>
  value.startsWith("/") && !value.startsWith("//")
    ? `${baseUrl}${value}`
    : value;

/** Root-relative links and images in prose that isn't code. */
function absoluteProse(text: string) {
  return (
    text
      // [text](/x), ![alt](/x), [text](</x y>)
      .replace(/(\]\(\s*<?)\/(?!\/)/g, `$1${baseUrl}/`)
      // [id]: /x  (reference definitions)
      .replace(/^( {0,3}\[[^\]\n]+\]:[ \t]*<?)\/(?!\/)/gm, `$1${baseUrl}/`)
      // src="/x", href='/x'
      .replace(/\b(src|href)=(["'])\/(?!\/)/gi, `$1=$2${baseUrl}/`)
  );
}

/** Inline code spans: a run of backticks to the same run, within one paragraph. */
const INLINE_CODE = /(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\1(?!`)/g;

function absoluteOutsideInlineCode(text: string) {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    out += absoluteProse(text.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return out + absoluteProse(text.slice(last));
}

/**
 * Makes root-relative links and images absolute against studio1hq.com, so
 * they work on DEV: Markdown links, images and reference definitions, and
 * src/href attributes in HTML. Absolute URLs, #anchors, fenced code blocks
 * (``` and ~~~, indented too, as in list items) and inline `code` stay as
 * they are.
 */
export function absoluteLinks(markdown: string) {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let prose: string[] = [];
  let fence: { char: string; size: number } | null = null;
  const flush = () => {
    if (prose.length) out.push(absoluteOutsideInlineCode(prose.join("\n")));
    prose = [];
  };
  for (const line of lines) {
    if (fence) {
      out.push(line);
      const close = line.match(/^[ \t]*(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.size)
        fence = null;
      continue;
    }
    const open = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (
      open &&
      !(
        open[1][0] === "`" &&
        line.slice(line.indexOf(open[1]) + open[1].length).includes("`")
      )
    ) {
      flush();
      out.push(line);
      fence = { char: open[1][0], size: open[1].length };
      continue;
    }
    prose.push(line);
  }
  flush();
  return out.join("\n");
}

/** Letters and digits only, lowercase: compares a heading with the title. */
const plain = (value: string) =>
  value
    .replace(/[*_`~[\]()]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** DEV shows the title above the body, so a first "# Title" would show it twice. */
function withoutTitleHeading(body: string, title: string) {
  const match = body.match(/^\s*#[ \t]+(.+?)[ \t#]*(?:\n|$)/);
  return match && plain(match[1]) === plain(title)
    ? body.slice(match[0].length)
    : body;
}

/** A frontmatter date as YYYY-MM-DD, or "" when there isn't one. */
function day(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : "";
}

/** Cuts at a word near `max` and adds an ellipsis. */
function cap(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const oneLine = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/**
 * A live post's file (frontmatter and Markdown) as a DEV draft: never
 * published, with the canonical URL on studio1hq.com so search engines
 * credit the original. The cover is the post's banner image, or the cover
 * the site draws for it when it has none.
 */
export function devDraft(
  source: string,
  slug: string,
  options: { organizationId?: number | null } = {},
): DevDraft {
  const { data, content } = matter(source);
  const title = oneLine(data.title) || slug;
  let body = withoutTitleHeading(content, title)
    .replace(/^\s*\n/, "")
    .trimEnd();
  // DEV reads a body that starts with "---" as frontmatter: start with the other rule.
  body = body.replace(/^ {0,3}-{3,}[ \t]*(?=\n|$)/, "***");
  const banner =
    typeof data.bannerImage === "string" ? data.bannerImage.trim() : "";
  const updated = day(data.updatedDate) || day(data.date);
  const draft: DevDraft = {
    title: cap(title, MAX_TITLE),
    body_markdown: `${absoluteLinks(body)}\n`,
    published: false,
    canonical_url: canonicalUrl(slug),
    tags: devTags(data.tags),
    main_image: absolute(banner || blogCoverUrl(slug, updated || undefined)),
  };
  const description = oneLine(data.description);
  if (description) draft.description = cap(description, MAX_DESCRIPTION);
  if (options.organizationId) draft.organization_id = options.organizationId;
  return draft;
}

/* ------------------------------------------------------------ reading DEV */

const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;

/** The path of a dev.to link ("/studio1/my-post-1a2b"), or null for anything else. */
export function devPath(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "dev.to")
      return null;
    const path = parsed.pathname.replace(/\/+$/, "");
    return isDevPath(path) ? path : null;
  } catch {
    return null;
  }
}

/** "/account/article-slug": what devPath returns and the page trusts in a link. */
export function isDevPath(path: unknown): path is string {
  return (
    typeof path === "string" && /^\/[\w.-]{1,80}\/[\w.%-]{1,250}$/.test(path)
  );
}

/** Where to edit an article on DEV. */
export function devEditUrl(path: string) {
  return `https://dev.to${path}/edit`;
}

/** DEV's `GET /api/articles/me/all` items, cleaned; anything without an id is dropped. */
export function readDevArticles(json: unknown): DevArticle[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item): DevArticle[] => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "number") return [];
    const path = devPath(row.url);
    const published = row.published === true;
    const publishedAt =
      published && typeof row.published_at === "string" && row.published_at
        ? row.published_at
        : null;
    return [
      {
        id: row.id,
        title: oneLine(row.title) || "Untitled",
        url: path ? `https://dev.to${path}` : null,
        published,
        publishedAt,
        reactions: count(
          row.public_reactions_count ?? row.positive_reactions_count,
        ),
        comments: count(row.comments_count),
        views: count(row.page_views_count),
        slug: canonicalSlug(row.canonical_url),
      },
    ];
  });
}

/** Reactions, comments and views over the published articles, like DEV's dashboard. */
export function devTotals(articles: readonly DevArticle[]) {
  const totals = {
    reactions: 0,
    comments: 0,
    views: 0,
    published: 0,
    drafts: 0,
    studio1Views: 0,
  };
  for (const article of articles) {
    if (!article.published) {
      totals.drafts += 1;
      continue;
    }
    totals.published += 1;
    totals.reactions += article.reactions;
    totals.comments += article.comments;
    totals.views += article.views;
    if (article.slug) totals.studio1Views += article.views;
  }
  return totals;
}

export const DEV_SORTS = [
  { key: "new", label: "Newest" },
  { key: "views", label: "Most views" },
  { key: "reactions", label: "Most reactions" },
  { key: "comments", label: "Most comments" },
] as const;
export type DevSort = (typeof DEV_SORTS)[number]["key"];

export function devSort(value: unknown): DevSort {
  return DEV_SORTS.find((item) => item.key === value)?.key ?? "new";
}

/** Newest first (drafts, newest made, above the published), or by a number, highest first. */
export function sortDevArticles(
  articles: readonly DevArticle[],
  sort: DevSort = "new",
) {
  const newest = (a: DevArticle, b: DevArticle) => {
    if (a.published !== b.published) return a.published ? 1 : -1;
    const byDate = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    return byDate || b.id - a.id;
  };
  return [...articles].sort((a, b) =>
    sort === "new" ? newest(a, b) : b[sort] - a[sort] || newest(a, b),
  );
}

/** Live posts with no DEV article pointing back at them. */
export function notOnDev<T extends { slug: string }>(
  posts: readonly T[],
  articles: readonly DevArticle[],
) {
  const copied = new Set(
    articles.map((article) => article.slug).filter(Boolean),
  );
  return posts.filter((post) => !copied.has(post.slug));
}
