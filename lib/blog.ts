import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DEFAULT_AUTHOR = "Amitesh Anand";
const DEFAULT_POST_IMAGE = "/opengraph-image.png";
const postsDirectory = path.join(process.cwd(), "content/blog");

const WORDS_PER_MINUTE = 350;

/** Reading-time estimate from rendered prose, excluding markdown structure. */
export function estimateReadingMinutes(content: string): number {
  const words = stripBlogMarkdown(content)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedDate: string;
  draft: boolean;
  author: string;
  authors: string[];
  tags: string[];
  image: string;
  imageAlt: string;
  bannerImage?: string;
  bannerImageAlt: string;
  socialImage: string;
  readingTimeMinutes: number;
};

type Frontmatter = {
  slug?: string;
  title?: string;
  description?: string;
  date?: string;
  updatedDate?: string;
  draft?: boolean;
  author?: string;
  authors?: string[];
  tags?: string[];
  image?: string;
  imageAlt?: string;
  bannerImage?: string;
  bannerImageAlt?: string;
};

export type BlogPostNavigation = {
  previous: BlogPostMeta | null;
  next: BlogPostMeta | null;
};

export type BlogFaq = {
  question: string;
  answer: string;
};

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripBlogMarkdown(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\|.*\|$/gm, " ")
    .replace(/^[-*]\s+/gm, "")
    .split("\n")
    .map(stripInlineMarkdown)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractKeyTakeaways(
  content: string,
  description: string,
): string[] {
  const lines = content.split("\n");
  const tldrIndex = lines.findIndex((line) =>
    /^#{2,3}\s+tl;?dr\s*$/i.test(line.trim()),
  );

  if (tldrIndex >= 0) {
    const takeaways: string[] = [];
    for (const line of lines.slice(tldrIndex + 1)) {
      const trimmed = line.trim();
      if (/^#{2,3}\s+/.test(trimmed)) break;
      const match = trimmed.match(/^[-*]\s+(.+)/);
      if (match?.[1]) takeaways.push(stripInlineMarkdown(match[1]));
    }
    if (takeaways.length) return takeaways.slice(0, 4);
  }

  const plainText = stripBlogMarkdown(content);
  const sentences = plainText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return [description, ...sentences].filter(Boolean).slice(0, 3);
}

export function extractFaqs(content: string): BlogFaq[] {
  const lines = content.split("\n");
  const faqIndex = lines.findIndex((line) =>
    /^#{2,3}\s+faq\s*$/i.test(line.trim()),
  );

  if (faqIndex < 0) return [];

  const faqs: BlogFaq[] = [];
  for (const line of lines.slice(faqIndex + 1)) {
    const trimmed = line.trim();
    if (/^#{2,3}\s+/.test(trimmed)) break;
    if (!trimmed.startsWith("|") || /^ *\|? *---/.test(trimmed)) continue;

    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(stripInlineMarkdown);

    if (
      cells.length >= 2 &&
      cells[0].toLowerCase() !== "question" &&
      cells[1].toLowerCase() !== "answer"
    ) {
      faqs.push({ question: cells[0], answer: cells[1] });
    }
  }

  return faqs;
}

function postMetaFromFile(fileName: string): BlogPostMeta {
  const fileSlug = fileName.replace(/\.mdx$/, "");
  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const d = data as Frontmatter;
  const slug = normalizeSlug(d.slug) ?? fileSlug;
  const title = d.title ?? "Untitled";
  const date = d.date ?? new Date().toISOString().split("T")[0];
  const authors = normalizeAuthors(d.authors, d.author);
  const image = d.image ?? DEFAULT_POST_IMAGE;
  const bannerImage = d.bannerImage?.trim() || undefined;
  const draft = isDraft(d);

  return {
    slug,
    title,
    description: d.description ?? "",
    date,
    updatedDate: d.updatedDate ?? date,
    draft,
    author: authors.join(", "),
    authors,
    tags: Array.isArray(d.tags) ? d.tags : [],
    image,
    imageAlt: d.imageAlt ?? title,
    bannerImage,
    bannerImageAlt: d.bannerImageAlt ?? d.imageAlt ?? title,
    socialImage: bannerImage ?? DEFAULT_POST_IMAGE,
    readingTimeMinutes: estimateReadingMinutes(content),
  };
}

function normalizeAuthors(authors?: string[], author?: string): string[] {
  const source = Array.isArray(authors) && authors.length ? authors : [author];
  const cleaned = source
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return cleaned.length ? cleaned : [DEFAULT_AUTHOR];
}

function normalizeSlug(slug?: string): string | undefined {
  const trimmed = slug?.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed ?? "")
    ? trimmed
    : undefined;
}

function isDraft(data: Frontmatter): boolean {
  return data.draft === true;
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];
  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((f) => f.endsWith(".mdx"));
  const posts = fileNames.map(postMetaFromFile).filter((post) => !post.draft);
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export type BlogPost = {
  slug: string;
  content: string;
  title: string;
  description: string;
  date: string;
  updatedDate: string;
  draft: boolean;
  author: string;
  authors: string[];
  tags: string[];
  image: string;
  imageAlt: string;
  bannerImage?: string;
  bannerImageAlt: string;
  socialImage: string;
  readingTimeMinutes: number;
  keyTakeaways: string[];
  faqs: BlogFaq[];
  latestPosts: BlogPostMeta[];
  navigation: BlogPostNavigation;
  plainText: string;
};

export function getPostBySlug(slug: string): BlogPost | null {
  const fileName = getAllPostFileNames().find((name) => {
    const fileSlug = name.replace(/\.mdx$/, "");
    if (fileSlug === slug) return true;

    const fullPath = path.join(postsDirectory, name);
    const { data } = matter(fs.readFileSync(fullPath, "utf8"));
    return normalizeSlug((data as Frontmatter).slug) === slug;
  });

  if (!fileName) return null;

  const fullPath = path.join(postsDirectory, fileName);
  if (!fs.existsSync(fullPath)) return null;
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const d = data as Frontmatter;
  if (isDraft(d)) return null;

  const title = d.title ?? "Untitled";
  const date = d.date ?? "";
  const tags = Array.isArray(d.tags) ? d.tags : [];
  const description = d.description ?? "";
  const authors = normalizeAuthors(d.authors, d.author);
  const image = d.image ?? DEFAULT_POST_IMAGE;
  const bannerImage = d.bannerImage?.trim() || undefined;
  return {
    slug,
    content,
    title,
    description,
    date,
    updatedDate: d.updatedDate ?? date,
    draft: false,
    author: authors.join(", "),
    authors,
    tags,
    image,
    imageAlt: d.imageAlt ?? title,
    bannerImage,
    bannerImageAlt: d.bannerImageAlt ?? d.imageAlt ?? title,
    socialImage: bannerImage ?? DEFAULT_POST_IMAGE,
    readingTimeMinutes: estimateReadingMinutes(content),
    keyTakeaways: extractKeyTakeaways(content, description),
    faqs: extractFaqs(content),
    latestPosts: getLatestPosts(slug),
    navigation: getPostNavigation(slug),
    plainText: stripBlogMarkdown(content),
  };
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

function getAllPostFileNames(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".mdx"));
}

export function getRelatedPosts(
  slug: string,
  tags: string[],
  limit = 3,
): BlogPostMeta[] {
  const tagSet = new Set(tags);
  return getAllPosts()
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      score: post.tags.filter((tag) => tagSet.has(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map(({ post }) => post);
}

export function getLatestPosts(slug?: string, limit = 5): BlogPostMeta[] {
  return getAllPosts()
    .filter((post) => post.slug !== slug)
    .slice(0, limit);
}

export function getPostNavigation(slug: string): BlogPostNavigation {
  const posts = getAllPosts();
  const index = posts.findIndex((post) => post.slug === slug);

  if (index < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  };
}
