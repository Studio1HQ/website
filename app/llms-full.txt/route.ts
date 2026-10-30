import fs from "fs";
import path from "path";
import { getPostBySlug, type BlogPost } from "@/lib/blog";
import { absolutize, buildPostMarkdown } from "@/lib/blog-markdown";
import { getAllCaseStudies, getCaseStudyBySlug } from "@/lib/case-studies";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { baseUrl } from "@/lib/site";

// llms.txt plus the full text of every case study and on-topic guide.
export const dynamic = "force-static";

const llmsTxtPath = path.join(process.cwd(), "public/llms.txt");

/** Posts listed under "## Guides" in llms.txt, the curated on-topic set. */
function guideSlugs(llmsTxt: string): string[] {
  const section = llmsTxt.split(/^## Guides$/m)[1]?.split(/^## /m)[0] ?? "";
  return [...section.matchAll(/\/blog\/([a-z0-9-]+)\)/g)].map(
    (match) => match[1],
  );
}

/** Case study MDX as plain Markdown: images become ![alt](src), other tags go. */
function caseStudyMarkdown(content: string): string {
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

export async function GET() {
  const llmsTxt = fs.readFileSync(llmsTxtPath, "utf8").trim();

  const studies = getAllCaseStudies(DEFAULT_LOCALE).flatMap((meta) => {
    const study = getCaseStudyBySlug(meta.slug, DEFAULT_LOCALE);
    if (!study) return [];
    const url = `${baseUrl}/case-studies/${study.slug}`;
    return [
      [
        `## ${study.title}`,
        "",
        `URL: ${url}`,
        `Client: ${study.client}`,
        "",
        `> ${study.description}`,
        "",
        caseStudyMarkdown(study.content),
      ].join("\n"),
    ];
  });

  const posts = guideSlugs(llmsTxt)
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is BlogPost => Boolean(post))
    .map((post) => buildPostMarkdown(post).trim());

  const body = [
    llmsTxt,
    "",
    "# Case studies (full text)",
    "",
    studies.join("\n\n---\n\n"),
    "",
    "# Guides (full text)",
    "",
    posts.join("\n\n"),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
