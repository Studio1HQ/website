import { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { mdxComponents } from "@/mdx-components";
import { CodeBlock } from "@/components/blog/code-block";

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
      className="not-prose mx-auto my-10 w-fit max-w-full overflow-hidden rounded-xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--muted)/0.5),hsl(var(--background)),hsl(var(--primary)/0.06))] p-2 shadow-[0_18px_52px_-36px_rgba(0,0,0,0.55)] dark:border-white/[0.08] dark:bg-[linear-gradient(135deg,hsl(var(--muted)/0.18),hsl(var(--background)),hsl(var(--primary)/0.08))]"
    >
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="size-2 rounded-full bg-primary/70" />
        <span className="size-2 rounded-full bg-primary/35" />
        <span className="size-2 rounded-full bg-muted-foreground/25" />
      </div>
      <div className="w-fit max-w-full overflow-hidden rounded-lg border border-border/60 bg-background/80 dark:border-white/[0.08] dark:bg-background/45">
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

export const blogMdxComponents = {
  ...mdxComponents,
  h2: BlogH2,
  h3: BlogH3,
  p: BlogParagraph,
  img: BlogImage,
  code: BlogCode,
  pre: BlogPre,
};
