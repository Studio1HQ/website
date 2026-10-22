import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import { cn } from "@/lib/utils";

export type CaseStudyQuoteProps = {
  children: ReactNode;
  author?: string;
  role?: string;
  source?: string;
  avatar?: string;
  /** Larger treatment for hero-style pull quotes. */
  variant?: "inline" | "pull";
  /** Tighter type for half-width proof panels. */
  compact?: boolean;
  /** Pin attribution footer to the bottom of a flex parent (e.g. proof cards). */
  pinFooter?: boolean;
  className?: string;
};

/**
 * Attributed client quote for case study pages and MDX.
 * One focal quote per use: serif accent mark, quiet attribution footer.
 */
export function CaseStudyQuote({
  children,
  author,
  role,
  source,
  avatar,
  variant = "inline",
  compact = false,
  pinFooter = false,
  className,
}: CaseStudyQuoteProps) {
  const isPull = variant === "pull";

  const quoteBody =
    typeof children === "string" ? (
      <NumericText>{children}</NumericText>
    ) : (
      children
    );

  const attribution =
    author || role ? (
      <footer
        className={cn(
          "flex items-center gap-3 border-t",
          isPull
            ? cn(
                "border-primary/15 pt-3.5 dark:border-primary/20",
                pinFooter ? "mt-auto" : "mt-4",
              )
            : "mt-5 border-border/50 pt-4 dark:border-white/[0.06]",
        )}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={author ? `${author}` : "Quote author"}
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover ring-2 ring-background dark:ring-white/10"
          />
        ) : null}
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-nowrap">
          {author ? (
            <cite
              className={cn(
                "font-primary font-medium not-italic text-foreground",
                isPull ? "text-base md:text-[1.0625rem]" : "text-[0.9375rem]",
              )}
            >
              {author}
            </cite>
          ) : null}
          {role ? (
            <span
              className={cn(
                "font-secondary text-muted-foreground",
                isPull ? "text-base md:text-[1.0625rem]" : "text-[0.9375rem]",
              )}
            >
              <span className="serif-accent font-accent text-foreground/75">
                {role}
              </span>
            </span>
          ) : null}
        </div>
        {source ? (
          <Link
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group shrink-0 inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-primary",
              isPull ? "text-sm" : "text-xs",
            )}
          >
            View source
            <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </Link>
        ) : null}
      </footer>
    ) : null;

  return (
    <blockquote
      className={cn(
        "not-prose relative border-none p-0",
        isPull ? "max-w-none" : "my-8",
        pinFooter && "flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      <span
        className={cn(
          "font-accent pointer-events-none select-none leading-none",
          isPull
            ? compact
              ? "block text-5xl text-primary/45 dark:text-primary/30"
              : "block text-6xl text-primary/45 md:text-7xl dark:text-primary/30"
            : "relative text-[2.75rem] text-primary/35 dark:text-primary/20",
        )}
        aria-hidden
      >
        &ldquo;
      </span>

      <p
        className={cn(
          "relative font-secondary text-foreground/90",
          isPull
            ? compact
              ? "-mt-3 pl-0.5 text-[1.0625rem] font-medium leading-snug md:text-lg"
              : "-mt-4 pl-0.5 text-[1.25rem] font-medium leading-snug md:-mt-5 md:text-[1.5rem] lg:text-[1.625rem]"
            : "-mt-1 text-base leading-relaxed sm:text-[1.0625rem] md:leading-[1.65]",
        )}
      >
        {quoteBody}
      </p>

      {attribution}
    </blockquote>
  );
}
