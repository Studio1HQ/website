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
    return extractText(
      (children as { props: { children?: ReactNode } }).props.children,
    );
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
    // A glassy rim with the image set into it, like the cards around it
    <figure className="not-prose my-10 w-fit max-w-full rounded-[6px] bg-white/55 p-2 shadow-[0_30px_60px_-44px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="w-fit max-w-full overflow-hidden rounded-[6px] bg-[#f1ece4] shadow-[inset_0_0_0_1px_rgba(20,20,20,0.06)] [&_img]:block">
        {children}
      </div>
      {caption ? (
        <figcaption className="px-2 pb-1 pt-2.5 text-center text-[12.5px] font-medium text-[#141414]/55">
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
      className="block h-auto w-auto max-w-full bg-[#f4efe7]"
    />
  );
}

function CaseStudyH2({ children, ...props }: ComponentPropsWithoutRef<"h2">) {
  const id = props.id || slugify(extractText(children));
  return (
    <h2
      id={id}
      className="mb-5 mt-16 scroll-mt-32 border-t border-[#141414]/10 pt-10 text-[26px] font-medium tracking-[-0.04em] text-[#141414] md:text-[30px]"
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
      className="mb-3 mt-10 scroll-mt-32 text-[20px] font-medium tracking-[-0.03em] text-[#141414] md:text-[22px]"
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
