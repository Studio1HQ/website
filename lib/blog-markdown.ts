import type { BlogPost } from "@/lib/blog";
import { baseUrl } from "@/lib/site";

/** Public URL of a post's Markdown version (served via a rewrite). */
export function postMarkdownUrl(slug: string) {
  return `${baseUrl}/blog/${slug}.md`;
}

/** Make site-relative links and images absolute so the file stands alone. */
export function absolutize(markdown: string) {
  return markdown.replace(
    /(!?\[[^\]]*\]\()(\/[^)\s]*)/g,
    (_, prefix: string, path: string) => `${prefix}${baseUrl}${path}`,
  );
}

/** `::youtube[url]` shortcodes become plain links in Markdown. */
function expandShortcodes(markdown: string) {
  return markdown.replace(/::youtube\[([^\]]+)\]/g, "[Watch on YouTube]($1)");
}

/**
 * A blog post as clean, self-contained Markdown for LLMs and AI tools:
 * YAML front matter (title, URL, dates, authors, tags), a TL;DR with key
 * takeaways, then the article body with absolute links.
 */
export function buildPostMarkdown(post: BlogPost): string {
  const url = `${baseUrl}/blog/${post.slug}`;
  const yaml = (value: string) => JSON.stringify(value);

  const frontMatter = [
    "---",
    `title: ${yaml(post.title)}`,
    `description: ${yaml(post.description)}`,
    `url: ${url}`,
    `markdown_url: ${postMarkdownUrl(post.slug)}`,
    `published: ${post.date}`,
    `updated: ${post.updatedDate}`,
    `authors: [${post.authors.map(yaml).join(", ")}]`,
    `tags: [${post.tags.map(yaml).join(", ")}]`,
    `reading_time_minutes: ${post.readingTimeMinutes}`,
    `publisher: "Studio1 (${baseUrl})"`,
    "---",
  ].join("\n");

  const summary = post.tldrSummary || post.description;
  // Auto-extracted takeaways can repeat the summary; keep only new points.
  const takeaways = post.keyTakeaways.filter(
    (takeaway) => takeaway.trim() !== summary.trim(),
  );
  const tldr = [
    "## TL;DR",
    "",
    summary,
    ...(takeaways.length
      ? ["", ...takeaways.map((takeaway) => `- ${takeaway}`)]
      : []),
  ].join("\n");

  const body = absolutize(expandShortcodes(post.content)).trim();

  return [
    frontMatter,
    "",
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    tldr,
    "",
    body,
    "",
    "---",
    "",
    `Source: [${post.title}](${url}), published by Studio1.`,
    "",
  ].join("\n");
}
