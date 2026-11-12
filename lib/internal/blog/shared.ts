/**
 * The dashboard blog's shared pieces: statuses, the post shape, and the
 * checks a post must pass before it's published. Plain data and pure
 * functions, safe for client components; the editor runs the same checks
 * live that the server runs again on Publish.
 */

export const BLOG_STATUSES = ["draft", "in_review", "changes_requested", "approved", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const STATUS_INFO: Record<BlogStatus, { label: string; tone: "neutral" | "accent" | "warning" | "success" | "live" }> = {
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "accent" },
  changes_requested: { label: "Changes requested", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  published: { label: "Live", tone: "live" },
};

/** What the editor changes. Everything else on a post is workflow. */
export type BlogFields = {
  title: string;
  seo_title: string;
  slug: string;
  description: string;
  tldr_summary: string;
  tldr_bullets: string[];
  tags: string[];
  authors: string[];
  publish_date: string | null;
  unlisted: boolean;
  cover_art: string | null;
  banner_image: string | null;
  banner_image_alt: string | null;
  body: string;
};

export const FIELD_KEYS = [
  "title",
  "seo_title",
  "slug",
  "description",
  "tldr_summary",
  "tldr_bullets",
  "tags",
  "authors",
  "publish_date",
  "unlisted",
  "cover_art",
  "banner_image",
  "banner_image_alt",
  "body",
] as const satisfies readonly (keyof BlogFields)[];

export type BlogPostRow = BlogFields & {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  status: BlogStatus;
  reviewers: string[];
  extra_frontmatter: Record<string, unknown>;
  source_path: string | null;
  source_sha: string | null;
  published_at: string | null;
  published_by: string | null;
  published_commit: string | null;
};

export type BlogEventKind = "comment" | "review_requested" | "changes_requested" | "approved" | "published";

export type BlogEvent = {
  id: string;
  post_id: string;
  created_at: string;
  actor: string;
  kind: BlogEventKind;
  body: string;
  /** The text a comment is about, selected in the editor. */
  quote?: string | null;
  /** A reply's thread: the id of the thread's first comment. */
  parent_id?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

/** A comment and its replies, oldest first. */
export type CommentThread = { root: BlogEvent; replies: BlogEvent[] };

/** Groups comments into threads; replies whose thread is gone are dropped. */
export function commentThreads(events: readonly BlogEvent[]): CommentThread[] {
  const threads = new Map<string, CommentThread>();
  for (const event of events) {
    if (event.kind === "comment" && !event.parent_id) threads.set(event.id, { root: event, replies: [] });
  }
  for (const event of events) {
    if (event.kind === "comment" && event.parent_id) threads.get(event.parent_id)?.replies.push(event);
  }
  return [...threads.values()];
}

/** Quotes are kept short: one or two sentences is plenty to point at. */
export const MAX_QUOTE = 300;

export function cleanQuote(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_QUOTE) : "";
}

/**
 * Finds a quote in a run of text pieces (the editor's text nodes), ignoring
 * whitespace, which differs between a selection's text and the nodes (line
 * breaks between paragraphs). Returns where it starts and ends as
 * [piece, offset] pairs, the end offset exclusive, or null when it isn't there.
 */
export function locateQuote(pieces: readonly string[], quote: string) {
  const needle = quote.replace(/\s+/g, "");
  if (!needle) return null;
  let squashed = "";
  const at: [number, number][] = [];
  pieces.forEach((piece, index) => {
    for (let offset = 0; offset < piece.length; offset++) {
      if (/\s/.test(piece[offset])) continue;
      squashed += piece[offset];
      at.push([index, offset]);
    }
  });
  const found = squashed.indexOf(needle);
  if (found < 0) return null;
  const [startPiece, startOffset] = at[found];
  const [endPiece, endOffset] = at[found + needle.length - 1];
  return { start: [startPiece, startOffset] as const, end: [endPiece, endOffset + 1] as const };
}


/** "arindam.majumder@…" → "Arindam Majumder". */
export function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Where uploaded draft images are served from (app/internal/blog-media). */
export const MEDIA_PREFIX = "/internal/blog-media/";

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** Tags are kebab-case, like the rest of the blog: "Open Source" → "open-source". */
export function normalizeTag(value: string) {
  return slugify(value);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Check = { id: string; level: "error" | "warning"; message: string };

/** Markdown images: ![alt](src "title"). */
const IMAGE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

export function bodyImages(body: string) {
  return [...body.matchAll(IMAGE)].map((match) => ({ alt: match[1].trim(), src: match[2] }));
}

function words(body: string) {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Everything a post needs before it goes live. Errors block Publish;
 * warnings are house style and SEO advice the reviewer can overrule.
 * `takenSlugs` are other posts' slugs, live or in the dashboard.
 */
export function postChecks(post: BlogFields, takenSlugs: readonly string[] = []): Check[] {
  const checks: Check[] = [];
  const add = (id: string, level: Check["level"], message: string) => checks.push({ id, level, message });
  const title = post.title.trim();
  const seo = post.seo_title.trim();
  const description = post.description.trim();
  const body = post.body.trim();

  if (!title) add("title", "error", "Add a title.");
  if (!post.slug) add("slug", "error", "Add a URL slug.");
  else if (!SLUG_PATTERN.test(post.slug)) add("slug", "error", "The URL slug can only use lowercase letters, numbers and hyphens.");
  else if (takenSlugs.includes(post.slug)) add("slug", "error", `Another post already uses /blog/${post.slug}. Pick a different slug.`);

  if (seo.length > 60) add("seo_title", "error", `The SEO title is ${seo.length} characters. Keep it to 60 or fewer.`);
  else if (!seo && title.length > 60) add("seo_title", "error", `The title is ${title.length} characters, too long for Google. Add an SEO title of 60 or fewer.`);

  if (!description) add("description", "error", "Add an SEO description (50 to 160 characters).");
  else if (description.length < 50 || description.length > 160) {
    add("description", "error", `The SEO description is ${description.length} characters. Write 50 to 160.`);
  } else if (description.length < 140) {
    add("description", "warning", `The SEO description is ${description.length} characters. 140 to 160 works best in Google.`);
  }

  if (post.tags.length === 0) add("tags", "error", "Add at least one tag. The first one is the post's topic label.");
  else if (post.tags.length < 3 || post.tags.length > 6) {
    add("tags", "warning", `${post.tags.length} tag${post.tags.length === 1 ? "" : "s"}. Use 3 to 6.`);
  }
  if (post.authors.length === 0) add("authors", "error", "Add at least one author.");

  if (!body) add("body", "error", "The post is empty.");
  else {
    const count = words(body);
    if (count < 300) add("length", "warning", `The post is ${count} words. Most posts that rank are well over 300.`);
    if (/^#\s/m.test(body)) add("h1", "warning", "The title already shows at the top. Use ## for section headings, not #.");
    const images = bodyImages(body);
    const missingAlt = images.filter((image) => !image.alt).length;
    if (missingAlt) add("alt", "error", `${missingAlt} image${missingAlt === 1 ? " has" : "s have"} no alt text. Click the image and describe it.`);
    if (images.some((image) => /^attachment:|notion\.so|notion-static|secure\.notion/i.test(image.src))) {
      add("notion-images", "error", "Some images point at Notion and will break. Upload them with the image button instead.");
    } else if (images.some((image) => /^https?:\/\//i.test(image.src) && !image.src.includes("studio1hq.com"))) {
      add("external-images", "warning", "Some images are hosted on another site and could disappear. Upload them instead.");
    }
    if (!/\]\((?:\/(?!\/)|https?:\/\/(?:www\.)?studio1hq\.com)/.test(body)) {
      add("internal-link", "warning", "Link to at least one Studio1 service page or related post.");
    }
    // Raw HTML could run scripts on the site (writers can be outside the team).
    const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    const html = [...prose.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>\n]*>/g)]
      .map((match) => match[1].toLowerCase())
      .filter((tag) => !["br", "sup", "sub", "kbd"].includes(tag));
    if (html.length) {
      add("html", "error", `Raw HTML isn't allowed in posts (<${html[0]}>). Use the editor's formatting, or put code in a code block.`);
    }
    if (/[–—]/.test(body) || /[–—]/.test(title) || /[–—]/.test(description)) {
      add("dashes", "warning", "House style: no em or en dashes (— –). Use a colon, comma or full stop.");
    }
  }
  if (post.banner_image && !post.banner_image_alt?.trim()) {
    add("banner-alt", "error", "Describe the uploaded cover image (alt text).");
  }
  return checks;
}

/**
 * The post as frontmatter + Markdown, the way content/blog files look.
 * Values are written as JSON strings, which are valid YAML.
 */
export function toMdx(
  post: BlogFields,
  meta: { date: string; updatedDate: string; extra?: Record<string, unknown> },
) {
  const lines: string[] = [];
  const put = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (!value.length) return;
      lines.push(`${key}:`, ...value.map((item) => `  - ${JSON.stringify(item)}`));
    } else if (typeof value === "string") {
      lines.push(`${key}: ${/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  };
  put("title", post.title.trim());
  put("seoTitle", post.seo_title.trim());
  put("slug", post.slug);
  put("description", post.description.trim());
  put("tldrSummary", post.tldr_summary.trim());
  put("tldrBullets", post.tldr_bullets.map((bullet) => bullet.trim()).filter(Boolean));
  put("date", meta.date);
  put("updatedDate", meta.updatedDate);
  lines.push("draft: false");
  if (post.unlisted) lines.push("unlisted: true");
  put("authors", post.authors);
  put("tags", post.tags);
  put("coverArt", post.cover_art);
  put("bannerImage", post.banner_image);
  if (post.banner_image) put("bannerImageAlt", post.banner_image_alt?.trim());
  for (const [key, value] of Object.entries(meta.extra ?? {})) put(key, value);
  return `---\n${lines.join("\n")}\n---\n${post.body.trim()}\n`;
}

/** Frontmatter keys the editor owns; anything else is kept as is. */
export const MANAGED_FRONTMATTER = new Set([
  "title",
  "seoTitle",
  "slug",
  "description",
  "tldrSummary",
  "tldrBullets",
  "date",
  "updatedDate",
  "draft",
  "unlisted",
  "authors",
  "author",
  "tags",
  "coverArt",
  "bannerImage",
  "bannerImageAlt",
]);

/** Today in India, as YYYY-MM-DD, for publish dates. */
export function todayIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
