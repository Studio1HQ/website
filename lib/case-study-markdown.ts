import { absolutize } from "@/lib/blog-markdown";
import { getCaseStudyBySlug } from "@/lib/case-studies";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { baseUrl } from "@/lib/site";

/** Case study MDX as plain Markdown: images become ![alt](src), other tags go. */
export function caseStudyMarkdown(content: string): string {
  const withImages = content.replace(/<img\b[^>]*>/g, (tag) => {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    const alt = tag.match(/\balt="([^"]*)"/)?.[1] ?? "";
    return src ? `![${alt}](${src})` : "";
  });
  return absolutize(
    withImages
      .replace(/<\/?[A-Za-z][^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

/** One published case study as a standalone Markdown document, or null. */
export function buildCaseStudyMarkdown(
  slug: string,
  afterSummary?: string,
): string | null {
  const study = getCaseStudyBySlug(slug, DEFAULT_LOCALE);
  if (!study) return null;
  const url = `${baseUrl}/case-studies/${study.slug}`;
  const yaml = (value: string) => JSON.stringify(value);
  return [
    "---",
    `title: ${yaml(study.title)}`,
    `description: ${yaml(study.description)}`,
    `url: ${url}`,
    "page_type: Case study",
    `client: ${yaml(study.client)}`,
    "publisher: Studio1 (https://www.studio1hq.com)",
    "site_index: https://www.studio1hq.com/llms.txt",
    "---",
    "",
    `# ${study.title}`,
    "",
    `> ${study.description}`,
    "",
    afterSummary?.trim() ? `${afterSummary.trim()}\n` : "",
    caseStudyMarkdown(study.content),
    "",
  ].join("\n");
}
