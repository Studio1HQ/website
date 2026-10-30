import React, { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { highlight } from "sugar-high";
import { withNumericText } from "@/components/ui/num";

type HeadingProps = ComponentPropsWithoutRef<"h1">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type ListProps = ComponentPropsWithoutRef<"ul">;
type ListItemProps = ComponentPropsWithoutRef<"li">;
type AnchorProps = ComponentPropsWithoutRef<"a">;
type BlockquoteProps = ComponentPropsWithoutRef<"blockquote">;

export const mdxComponents = {
  h1: (props: HeadingProps) => (
    <h1 className="font-medium pt-12 mb-0 text-foreground" {...props} />
  ),
  h2: (props: HeadingProps) => (
    <h2 className="font-medium mt-8 mb-3 text-foreground" {...props} />
  ),
  h3: (props: HeadingProps) => (
    <h3 className="font-medium mt-8 mb-3 text-foreground" {...props} />
  ),
  h4: (props: HeadingProps) => (
    <h4 className="font-medium text-foreground" {...props} />
  ),
  p: (props: ParagraphProps) => (
    <p className="leading-snug text-foreground" {...props}>
      {withNumericText(props.children)}
    </p>
  ),
  ol: (props: ListProps) => (
    <ol className="list-decimal space-y-2 pl-6 text-foreground marker:font-medium marker:text-primary" {...props} />
  ),
  ul: (props: ListProps) => (
    <ul className="list-none space-y-2 pl-0 text-foreground [&>li]:relative [&>li]:pl-6 [&>li]:before:absolute [&>li]:before:left-1 [&>li]:before:top-[0.72em] [&>li]:before:size-1.5 [&>li]:before:rounded-full [&>li]:before:bg-primary [&>li]:before:content-['']" {...props} />
  ),
  li: (props: ListItemProps) => (
    <li className="pl-1 text-foreground" {...props}>
      {withNumericText(props.children)}
    </li>
  ),
  em: (props: ComponentPropsWithoutRef<"em">) => (
    <em className="font-medium text-foreground" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-medium text-foreground" {...props} />
  ),
  a: ({ href, children, ...props }: AnchorProps) => {
    const className =
      "font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary";
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={className} {...props}>
          {children}
        </Link>
      );
    }
    if (href?.startsWith("#")) {
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...props}
      >
        {children}
      </a>
    );
  },
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="overflow-x-auto rounded-lg border border-border bg-zinc-950 dark:bg-zinc-900 p-4 text-sm my-4 text-zinc-100"
      {...props}
    />
  ),
  code: ({ children, ...props }: ComponentPropsWithoutRef<"code">) => {
    const codeHTML = highlight(String(children ?? ""));
    return (
      <code
        dangerouslySetInnerHTML={{ __html: codeHTML }}
        className="text-zinc-100"
        {...props}
      />
    );
  },
  Table: ({ data }: { data?: { headers: string[]; rows: string[][] } }) => {
    if (!data?.headers?.length) return null;
    return (
      <table className="w-full my-4 border-collapse text-sm text-foreground">
        <thead>
          <tr className="border-b border-border">
            {data.headers.map((header, index) => (
              <th key={index} className="p-2 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={index} className="border-b border-border/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-2">
                  {withNumericText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  blockquote: (props: BlockquoteProps) => (
    <blockquote
      className="not-prose my-8 rounded-r-2xl border-l-2 border-primary bg-primary/[0.05] py-4 pl-5 pr-5 text-[17px] italic leading-[1.7] text-[var(--home-ink)]"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div
      data-lenis-prevent
      className="not-prose s1-glass-card my-8 overflow-x-auto rounded-[18px]"
    >
      <table
        className="w-full min-w-[560px] border-collapse text-left text-[14px] leading-[1.55] text-[var(--home-ink)]"
        {...props}
      />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-black/[0.03] dark:bg-white/[0.04]" {...props} />
  ),
  tbody: (props: ComponentPropsWithoutRef<"tbody">) => (
    <tbody {...props} />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => (
    <tr className="border-b border-[var(--home-line)] transition-colors last:border-b-0 hover:bg-primary/[0.04]" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="whitespace-nowrap border-b border-[var(--home-line)] px-5 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--home-ink-soft)]"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="px-5 py-3.5 align-top text-[var(--home-ink-soft)] first:font-medium first:text-[var(--home-ink)] [&_a]:text-primary" {...props}>
      {withNumericText(props.children)}
    </td>
  ),
};

declare global {
  type MDXProvidedComponents = typeof mdxComponents;
}

export function useMDXComponents(): MDXProvidedComponents {
  return mdxComponents;
}
