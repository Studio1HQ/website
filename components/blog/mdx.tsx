import { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { mdxComponents } from "@/mdx-components";
import { CodeBlock } from "@/components/blog/code-block";
import { withNumericText } from "@/components/ui/num";

const youtubeLinePattern =
  /^(\s*)(?:(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<>]+)|::youtube\[([^\]]+)\])\s*$/gm;

function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host !== "youtube.com" && host !== "m.youtube.com") return null;

    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const [kind, id] = url.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(kind)) return id ?? null;
  } catch {
    return null;
  }

  return null;
}

function getYouTubeEmbedUrl(value: string): string | null {
  const videoId = getYouTubeVideoId(value);
  if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Rewrites the "## Frequently asked questions" chapter (one "### question"
 * per item) into an accordion; the h2 stays so the chapter keeps its TOC entry.
 */
function wrapFaqSection(content: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    /^##\s+(frequently asked questions|faqs?)\s*$/i.test(line.trim()),
  );
  if (start < 0) return content;
  let end = lines.findIndex((line, i) => i > start && /^##\s/.test(line));
  if (end < 0) end = lines.length;

  const body = lines.slice(start + 1, end);
  const first = body.findIndex((line) => /^###\s/.test(line));
  if (first < 0) return content;

  const items: string[] = [];
  let question = "";
  let answer: string[] = [];
  const flush = () => {
    if (!question) return;
    items.push(
      // next-mdx-remote drops {expressions}, so the question goes in as a plain string.
      `<BlogFaqItem question="${question.replace(/"/g, "”")}">\n\n${answer.join("\n").trim()}\n\n</BlogFaqItem>`,
    );
  };
  for (const line of body.slice(first)) {
    const match = line.match(/^###\s+(.*)$/);
    if (match) {
      flush();
      question = match[1].trim();
      answer = [];
    } else {
      answer.push(line);
    }
  }
  flush();

  return [
    ...lines.slice(0, start + 1),
    ...body.slice(0, first),
    `<BlogFaq>\n\n${items.join("\n\n")}\n\n</BlogFaq>`,
    "",
    ...lines.slice(end),
  ].join("\n");
}

export function transformBlogMdxContent(content: string): string {
  return wrapFaqSection(content).replace(
    youtubeLinePattern,
    (match, indent, url, shortcodeUrl) => {
      const source = (url || shortcodeUrl || "").trim();
      const embedUrl = getYouTubeEmbedUrl(source);
      if (!embedUrl) return match;

      return `${indent}<YouTubeEmbed url={${JSON.stringify(embedUrl)}} />`;
    },
  );
}

function BlogFaq({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-8 border-t border-[#141414]/10">
      {children}
    </div>
  );
}

/** One question: hairline row, plus that turns into a cross when open. */
function BlogFaqItem({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-[#141414]/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium leading-snug tracking-[-0.02em] text-[#141414] transition-colors duration-200 hover:text-[#f97316] group-open:text-[#f97316] md:text-[20px] [&::-webkit-details-marker]:hidden">
        {question}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="size-5 shrink-0 text-[#141414]/45 transition-transform duration-300 ease-out group-open:rotate-45 group-open:text-[#f97316]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M10 2.5v15M2.5 10h15" />
        </svg>
      </summary>
      <div className="pb-6 pr-10 text-[16.5px] leading-[1.75] text-[#141414]/70 [&_a]:font-medium [&_a]:text-[#c2410c] [&_a]:underline [&_a]:decoration-[#f97316]/40 [&_a]:underline-offset-4 [&_p+p]:mt-4">
        {children}
      </div>
    </details>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText(
      (children as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

function BlogH2({ children, ...props }: ComponentPropsWithoutRef<"h2">) {
  const id = props.id || slugify(extractText(children));
  return (
    <h2
      id={id}
      className="font-medium mt-8 mb-3 text-foreground scroll-mt-24"
      {...props}
    >
      {children}
    </h2>
  );
}

function BlogH3({ children, ...props }: ComponentPropsWithoutRef<"h3">) {
  const id = props.id || slugify(extractText(children));
  return (
    <h3
      id={id}
      className="font-medium mt-8 mb-3 text-foreground scroll-mt-24"
      {...props}
    >
      {children}
    </h3>
  );
}

function BlogImage({
  src,
  alt,
  title,
  ...props
}: ComponentPropsWithoutRef<"img">) {
  if (!src || typeof src !== "string") return null;

  return (
    <figure className="not-prose mx-auto my-12 w-fit max-w-full overflow-hidden rounded-[6px] bg-white p-2 shadow-[0_24px_50px_-34px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08]">
      <div className="w-fit max-w-full overflow-hidden rounded-[6px] bg-[#f4efe7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...props}
          src={src}
          alt={alt ?? ""}
          title={title ?? undefined}
          loading="lazy"
          decoding="async"
          className="block h-auto w-auto max-w-full"
        />
      </div>
      {title ? (
        <figcaption className="px-2 pb-1 pt-3 text-center text-[13px] leading-relaxed text-[#141414]/55">
          {title}
        </figcaption>
      ) : null}
    </figure>
  );
}

function isWhitespaceNode(node: ReactNode) {
  return typeof node === "string" && node.trim() === "";
}

function isOnlyBlogImage(children: ReactNode) {
  const nodes = (Array.isArray(children) ? children : [children]).filter(
    (node) => !isWhitespaceNode(node),
  );

  return (
    nodes.length === 1 &&
    isValidElement(nodes[0]) &&
    nodes[0].type === BlogImage
  );
}

function BlogParagraph(props: ComponentPropsWithoutRef<"p">) {
  if (isOnlyBlogImage(props.children)) {
    return <>{props.children}</>;
  }

  const Paragraph = mdxComponents.p;
  return <Paragraph {...props} />;
}

function BlogCode({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className={[
        className,
        "rounded-[6px] bg-white px-1.5 py-0.5 font-mono text-[0.86em] text-[#c2410c] ring-1 ring-inset ring-[#141414]/[0.08]",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </code>
  );
}

function BlogPre({ children }: ComponentPropsWithoutRef<"pre">) {
  const child =
    children && typeof children === "object" && "props" in children
      ? (children as { props?: { children?: ReactNode; className?: string } })
      : null;
  const code = String(child?.props?.children ?? "").replace(/\n$/, "");
  const language =
    child?.props?.className?.replace(/^language-/, "").trim() || "text";

  return <CodeBlock code={code} language={language} />;
}

function YouTubeEmbed({ url }: { url: string }) {
  return (
    <figure className="not-prose mx-auto my-12 w-full overflow-hidden rounded-[6px] bg-white p-2 shadow-[0_24px_50px_-34px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08]">
      <div className="aspect-video w-full overflow-hidden rounded-[6px] bg-[#141414]">
        <iframe
          src={url}
          title="YouTube video player"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </figure>
  );
}

/* Tables print like a spec sheet on the paper page: white sheet, cream header
   ruled off in ink, hairline columns, and a first column that stays put while
   wide tables scroll sideways. */
function BlogTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <figure
      data-blog-table
      className="not-prose relative my-12 before:absolute before:-top-[22px] before:left-0 before:bg-[#f97316] before:px-1.5 before:py-[3px] before:text-[11px] before:font-medium before:leading-none before:text-white"
    >
      <div
        data-lenis-prevent
        className="overflow-x-auto rounded-[6px] bg-white ring-1 ring-inset ring-[#141414]/10"
      >
        <table
          className="w-full min-w-[560px] border-collapse text-left text-[14px] leading-[1.55] text-[#141414]"
          {...props}
        />
      </div>
    </figure>
  );
}

function BlogTableHead(props: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className="border-b-[1.5px] border-[#141414] bg-[#f4efe7]"
      {...props}
    />
  );
}

function BlogTableRow(props: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className="group/row border-b border-[#141414]/10 last:border-b-0 [&>*:first-child]:sticky [&>*:first-child]:left-0 [&>*:first-child]:z-[1]"
      {...props}
    />
  );
}

function BlogTableHeader(props: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className="border-l border-[#141414]/10 bg-[#f4efe7] px-4 py-3 align-bottom text-[11px] font-medium uppercase tracking-[0.12em] text-[#141414]/55 first:border-l-0"
      {...props}
    />
  );
}

function BlogTableCell(props: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className="border-l border-[#141414]/10 bg-white px-4 py-3.5 align-top tabular-nums text-[#141414]/70 transition-colors first:border-l-0 first:font-medium first:text-[#141414] group-hover/row:bg-[#fdf6ef] [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-4 [&_code]:whitespace-nowrap [&_code]:bg-[#f4efe7] [&_code]:text-[12.5px] [&_strong]:font-medium [&_strong]:text-[#141414]"
      {...props}
    >
      {withNumericText(props.children)}
    </td>
  );
}

export const blogMdxComponents = {
  ...mdxComponents,
  h2: BlogH2,
  h3: BlogH3,
  p: BlogParagraph,
  img: BlogImage,
  code: BlogCode,
  pre: BlogPre,
  table: BlogTable,
  thead: BlogTableHead,
  tr: BlogTableRow,
  th: BlogTableHeader,
  td: BlogTableCell,
  YouTubeEmbed,
  BlogFaq,
  BlogFaqItem,
};
