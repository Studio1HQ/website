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

export function transformBlogMdxContent(content: string): string {
  return content.replace(youtubeLinePattern, (match, indent, url, shortcodeUrl) => {
    const source = (url || shortcodeUrl || "").trim();
    const embedUrl = getYouTubeEmbedUrl(source);
    if (!embedUrl) return match;

    return `${indent}<YouTubeEmbed url={${JSON.stringify(embedUrl)}} />`;
  });
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
    <figure
      className="not-prose mx-auto my-10 w-fit max-w-full overflow-hidden rounded-xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--muted)/0.5),hsl(var(--background)),hsl(var(--primary)/0.06))] p-2 shadow-[0_18px_52px_-36px_rgba(0,0,0,0.55)]"
    >
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="size-2 rounded-full bg-primary/70" />
        <span className="size-2 rounded-full bg-primary/35" />
        <span className="size-2 rounded-full bg-muted-foreground/25" />
      </div>
      <div className="w-fit max-w-full overflow-hidden rounded-lg border border-border/60 bg-background/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...props}
          src={src}
          alt={alt ?? ""}
          title={title ?? undefined}
          loading="lazy"
          decoding="async"
          className="block h-auto w-auto max-w-full bg-muted/20"
        />
      </div>
      {title ? (
        <figcaption className="px-1 pt-3 text-center text-xs leading-relaxed text-muted-foreground">
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

function BlogCode({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className={[
        className,
        "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground",
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
    <figure className="not-prose mx-auto my-10 w-full overflow-hidden rounded-xl border border-border/70 bg-background shadow-[0_18px_52px_-36px_rgba(0,0,0,0.55)]">
      <div className="aspect-video w-full bg-muted">
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
        className="overflow-x-auto bg-white ring-1 ring-inset ring-[#141414]/10"
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
  return <thead className="border-b-[1.5px] border-[#141414] bg-[#f4efe7]" {...props} />;
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
};
