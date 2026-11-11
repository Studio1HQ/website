import fs from "fs";
import path from "path";
import { unstable_cache } from "next/cache";
import { parseHTML } from "linkedom";
import { aiAgentName } from "@/lib/ai-agents";
import { aiOfferMarkdown, insertOffer } from "@/lib/ai-offer";
import { getPostBySlug } from "@/lib/blog";
import { buildPostMarkdown } from "@/lib/blog-markdown";
import { buildCaseStudyMarkdown } from "@/lib/case-study-markdown";
import { pageToMarkdown, serverText } from "@/lib/page-markdown";

/**
 * The markdown version of a page, served to AI agents in place of the HTML.
 * next.config.ts rewrites requests whose user-agent is a known AI agent
 * (lib/ai-agents.ts) to /ai-md/<path>. People and search engines never reach
 * this route and get the normal page.
 */
export const dynamic = "force-dynamic";

type Source = { status: number; markdown: string; offerAfterFirstSection?: boolean };

const llmsTxtPath = path.join(process.cwd(), "public/llms.txt");

/** A rendered page of this site, fetched as a browser would and converted. */
const renderedPageMarkdown = unstable_cache(
  async (origin: string, pathname: string): Promise<Source> => {
    const response = await fetch(`${origin}${pathname}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Studio1-Markdown/1.0)",
        accept: "text/html",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const type = response.headers.get("content-type") ?? "";
    // A missing page is a real answer and can be cached. Any other failure
    // throws, so it is not cached and the next request tries again.
    if (response.status === 404 || response.status === 410) {
      return { status: 404, markdown: "" };
    }
    if (!response.ok) throw new Error(`page returned ${response.status}`);
    if (!type.includes("text/html")) return { status: 404, markdown: "" };
    const { document } = parseHTML(await response.text());
    const markdown = pageToMarkdown(document as unknown as Document, {
      pathname: new URL(response.url || `${origin}${pathname}`).pathname,
      textOf: serverText,
      ownHosts: [new URL(origin).hostname],
    });
    return { status: 200, markdown };
  },
  ["ai-md-page"],
  { revalidate: 3600 },
);

async function sourceFor(origin: string, pathname: string): Promise<Source> {
  const blog = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blog) {
    const post = getPostBySlug(blog[1]);
    return post
      ? { status: 200, markdown: buildPostMarkdown(post), offerAfterFirstSection: true }
      : { status: 404, markdown: "" };
  }

  const study = pathname.match(/^\/case-studies\/([a-z0-9-]+)$/);
  if (study) {
    const markdown = buildCaseStudyMarkdown(study[1]);
    return markdown ? { status: 200, markdown } : { status: 404, markdown: "" };
  }

  if (pathname === "/llms.txt") {
    return { status: 200, markdown: fs.readFileSync(llmsTxtPath, "utf8") };
  }

  if (pathname === "/llms-full.txt") {
    const response = await fetch(`${origin}/llms-full.txt`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Studio1-Markdown/1.0)" },
      cache: "no-store",
    });
    return { status: response.status, markdown: response.ok ? await response.text() : "" };
  }

  return renderedPageMarkdown(origin, pathname);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const segments = (await params).path ?? [];
  const pathname = `/${segments.map(decodeURIComponent).join("/")}`;
  const origin = new URL(request.url).origin;
  const userAgent = request.headers.get("user-agent") ?? "";
  const offer = aiOfferMarkdown();

  let source: Source;
  try {
    source = await sourceFor(origin, pathname);
  } catch (error) {
    console.error(`[ai-md] ${pathname}:`, error);
    source = { status: 502, markdown: "" };
  }

  const served = source.status === 200 && source.markdown.length > 0;
  const offerServed = served && offer.length > 0;
  // A temporary failure must never read as "this page doesn't exist".
  const temporary = !served && source.status >= 500;
  const body = served
    ? insertOffer(source.markdown.trim(), offer, {
        afterFirstSection: source.offerAfterFirstSection,
      })
    : temporary
      ? `# Temporarily unavailable\n\nThis page exists but couldn't be loaded just now. Please try again in a minute: https://www.studio1hq.com${pathname}\n`
      : `# Not found\n\nThis page doesn't exist. See https://www.studio1hq.com/llms.txt for the site index.\n`;

  // One log line per AI agent request (Vercel runtime logs); no database.
  console.info(
    JSON.stringify({
      event: "ai_md",
      bot: aiAgentName(userAgent) ?? "unknown",
      path: pathname,
      status: served ? 200 : source.status,
      offer: offerServed,
    }),
  );

  const isText = pathname.endsWith(".txt");
  return new Response(body, {
    status: served ? 200 : temporary ? 503 : 404,
    headers: {
      "Content-Type": `${isText ? "text/plain" : "text/markdown"}; charset=utf-8`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      Vary: "User-Agent",
      ...(temporary ? { "Retry-After": "60" } : {}),
    },
  });
}
