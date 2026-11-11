"use client";
import {
  CursorGlowCardEffects,
  cursorGlowCardClassName,
  useCursorGlow,
} from "@/components/ui/cursor-glow-card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const Version1 = ({
  title,
  description,
  tags,
  hrefLink,
}: {
  title: string;
  description?: string;
  tags: string[];
  hrefLink: string;
}) => {
  const { ref, onPointerMove } = useCursorGlow<HTMLAnchorElement>();

  return (
    <Link
      ref={ref}
      href={hrefLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      onPointerMove={onPointerMove}
      className={cn(
        cursorGlowCardClassName,
        "flex h-72 w-full flex-col rounded-[6px]",
      )}
    >
      <CursorGlowCardEffects roundedClassName="rounded-[6px]" />

      <div className="relative z-[2] flex flex-1 flex-col p-6">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span
            aria-hidden
            className="size-[5px] rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]"
          />
          Blog
        </span>

        <h3 className="mt-5 line-clamp-2 font-inter text-lg font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4 dark:border-white/[0.08]">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {tags.map((item) => (
              <span
                key={item}
                className="rounded-md border border-border/70 bg-foreground/[0.03] px-2.5 py-1 text-[11px] font-medium capitalize tracking-wide text-foreground/75 dark:border-white/[0.09] dark:bg-white/[0.04]"
              >
                {item.replaceAll("-", " ")}
              </span>
            ))}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-muted-foreground transition-colors duration-300 group-hover:text-primary1 motion-reduce:transition-none">
            Read article
            <ArrowRight className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </span>
        </div>
      </div>
    </Link>
  );
};
