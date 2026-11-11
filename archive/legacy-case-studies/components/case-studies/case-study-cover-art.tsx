import type { ReactNode } from "react";
import Image from "next/image";
import Logo from "@/components/ui/svgs/logo";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { cn } from "@/lib/utils";
import type { CaseStudyMeta } from "@/lib/case-studies";
import type { CardVariant } from "@/components/case-studies/case-study-card";

const TILE_SIZE: Record<CardVariant, string> = {
  featured: "size-20 md:size-24",
  default: "size-16 md:size-20",
  compact: "size-12 md:size-14",
};

const TILE_PAD: Record<CardVariant, string> = {
  featured: "p-1",
  default: "p-1",
  compact: "p-0.5",
};

const GAP: Record<CardVariant, string> = {
  featured: "gap-5 md:gap-6",
  default: "gap-4 md:gap-5",
  compact: "gap-3",
};

const NAME_SIZE: Record<CardVariant, string> = {
  featured: "text-2xl md:text-3xl",
  default: "text-xl md:text-2xl",
  compact: "text-base md:text-lg",
};

function CoverTile({
  variant,
  children,
}: {
  variant: CardVariant;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        TILE_SIZE[variant],
        TILE_PAD[variant],
        "flex shrink-0 items-center justify-center rounded-xl border-2 border-white/25 bg-white shadow-none",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Component-based case study cover art.
 *
 * Renders the Studio1 mark, the client's mark, and the client name directly
 * instead of a designed banner image. A new case study only needs a title
 * and a logo in `client-logos.ts`, sizing, contrast, and text truncation
 * are handled here so every card stays visually even.
 */
export function CaseStudyCoverArt({
  study,
  variant,
}: {
  study: CaseStudyMeta;
  variant: CardVariant;
}) {
  const logo = getClientLogo(study.slug);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(70%_70%_at_50%_38%,hsl(var(--primary)/0.16),transparent_72%),linear-gradient(180deg,hsl(var(--muted)/0.75),hsl(var(--background)))] px-6 text-center transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transform-none dark:bg-[radial-gradient(70%_70%_at_50%_38%,hsl(var(--primary)/0.22),transparent_72%),linear-gradient(180deg,hsl(var(--muted)/0.55),hsl(var(--background)))]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,transparent_42%,hsl(var(--background))_100%)] opacity-70"
      />

      <div className={cn("relative z-[1] flex items-center", GAP[variant])}>
        <CoverTile variant={variant}>
          <Logo className="size-full" />
        </CoverTile>
        <CoverTile variant={variant}>
          {logo ? (
            <Image
              src={logo.icon}
              alt=""
              width={96}
              height={96}
              className="size-full rounded-md object-contain"
            />
          ) : (
            <span className="font-inter text-2xl font-semibold text-neutral-900">
              {study.client.charAt(0)}
            </span>
          )}
        </CoverTile>
      </div>

      <p
        className={cn(
          "relative z-[1] mt-2.5 max-w-full truncate font-inter font-bold tracking-tight text-foreground md:mt-3",
          NAME_SIZE[variant],
        )}
        title={`Studio1 ${study.client}`}
      >
        Studio1 x {study.client}
      </p>
    </div>
  );
}
