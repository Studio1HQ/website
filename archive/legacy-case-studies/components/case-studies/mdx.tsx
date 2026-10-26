import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CaseStudyQuote } from "@/components/case-studies/case-study-quote";
import { TweetEmbed } from "@/components/case-studies/tweet-embed";
import { resolveCaseStudyImageAlt } from "@/lib/case-studies";
import { mdxComponents } from "@/mdx-components";

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
    return extractText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function Frame({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure className="not-prose my-10 w-fit max-w-full overflow-hidden rounded-xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--muted)/0.5),hsl(var(--background)),hsl(var(--primary)/0.06))] p-2 shadow-[0_18px_52px_-36px_rgba(0,0,0,0.55)] dark:border-white/[0.08] dark:bg-[linear-gradient(135deg,hsl(var(--muted)/0.18),hsl(var(--background)),hsl(var(--primary)/0.08))]">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="size-2 rounded-full bg-primary/70" />
        <span className="size-2 rounded-full bg-primary/35" />
        <span className="size-2 rounded-full bg-muted-foreground/25" />
      </div>
      <div className="w-fit max-w-full overflow-hidden rounded-lg border border-border/60 bg-background/80 dark:border-white/[0.08] dark:bg-background/45">
        {children}
      </div>
      {caption ? (
        <figcaption className="px-1 pt-2 text-center text-xs font-medium text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Lays out Frames side by side, e.g. a before/after pair. Stacks on mobile. */
function FrameRow({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-10 grid items-start gap-4 sm:grid-cols-2 [&>figure]:my-0 [&>figure]:w-full">
      {children}
    </div>
  );
}

function CaseStudyImage({
  src,
  alt,
  title,
  ...props
}: ComponentPropsWithoutRef<"img"> & { "data-path"?: string }) {
  if (!src) return null;
  const resolvedSrc = typeof src === "string" ? src : undefined;
  const resolvedAlt = resolveCaseStudyImageAlt(alt, resolvedSrc);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={resolvedSrc}
      alt={resolvedAlt}
      title={title ?? undefined}
      loading="lazy"
      decoding="async"
      className="block h-auto w-auto max-w-full bg-muted/20"
    />
  );
}

function CaseStudyH2({ children, ...props }: ComponentPropsWithoutRef<"h2">) {
  const id = props.id || slugify(extractText(children));
  return (
    <h2
      id={id}
      className="font-inter font-semibold mt-12 mb-4 text-xl md:text-2xl text-foreground scroll-mt-24"
      {...props}
    >
      {children}
    </h2>
  );
}

function CaseStudyBlockquote({
  children,
}: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <figure className="not-prose my-10">
      <CaseStudyQuote>{children}</CaseStudyQuote>
    </figure>
  );
}

type PullQuoteProps = {
  children: ReactNode;
  author?: string;
  role?: string;
  source?: string;
};

function PullQuote({ children, author, role, source }: PullQuoteProps) {
  return (
    <figure className="not-prose my-12">
      <CaseStudyQuote
        variant="pull"
        author={author}
        role={role}
        source={source}
      >
        {children}
      </CaseStudyQuote>
    </figure>
  );
}

function CaseStudyH3({ children, ...props }: ComponentPropsWithoutRef<"h3">) {
  const id = props.id || slugify(extractText(children));
  return (
    <h3
      id={id}
      className="font-inter font-medium mt-8 mb-3 text-lg text-foreground scroll-mt-24"
      {...props}
    >
      {children}
    </h3>
  );
}

export const caseStudyMdxComponents = {
  ...mdxComponents,
  h2: CaseStudyH2,
  h3: CaseStudyH3,
  blockquote: CaseStudyBlockquote,
  PullQuote,
  Frame,
  FrameRow,
  TweetEmbed,
  img: CaseStudyImage,
};
