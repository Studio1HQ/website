import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { CaseStudyCoverArt } from "@/components/case-studies/case-study-cover-art";
import { cn } from "@/lib/utils";
import type { CaseStudyMeta } from "@/lib/case-studies";

/**
 * Case-study card system.
 *
 * Deliberately spare: artwork, category, headline, arrow. No summary, no tag
 * row, no separate metric block, the headlines already carry their numbers
 * ("...to 12,000+ GitHub stars"), so a metric underneath only repeated the
 * title. Detail belongs on the case study itself, not the index.
 *
 * Imagery is inset inside the card rather than bleeding to its edges, and
 * shown at 16/10 instead of a 3/1 letterbox, the old strip cropped roughly a
 * third off 16:9 sources, which is what made the art look poor.
 */

export type CardVariant = "featured" | "default" | "compact";

/** Shared frame: theme glass surface + one hover language across all sizes. */
export function cardFrame(extra?: string) {
  return cn(
    "s1-glass-card group relative flex min-w-0 overflow-hidden rounded-[22px]",
    "transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none",
    extra,
  );
}

export function ClientMark({
  study,
  size = "md",
  frosted = false,
}: {
  study: CaseStudyMeta;
  size?: "sm" | "md" | "lg";
  frosted?: boolean;
}) {
  const logo = getClientLogo(study.slug);
  if (!logo) return null;

  const tile = { sm: "size-10", md: "size-12", lg: "size-14" }[size];
  const pad = { sm: "p-1", md: "p-1.5", lg: "p-1.5" }[size];

  return (
    <div
      className={cn(
        tile,
        pad,
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg transition-all duration-500",
        frosted
          ? cn(
              "bg-background/90 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)] ring-1 ring-black/10 backdrop-blur-md",
              "dark:bg-background/80 dark:ring-white/15",
              "group-hover:ring-primary/35 group-hover:shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.35)]",
            )
          : "border border-border/60 bg-background/70 backdrop-blur-md group-hover:border-primary/30",
      )}
    >
      <Image
        src={logo.icon}
        alt={`${study.client} logo`}
        width={48}
        height={48}
        className="size-full scale-110 rounded-md object-contain"
      />
    </div>
  );
}

/**
 * Card artwork.
 *
 * Inset with rounded corners and a hairline ring so it reads as a deliberate
 * plate. The plate itself is a live component (`CaseStudyCoverArt`), not a
 * designed banner image, so every card renders at identical quality and a
 * new case study only needs a title + logo to look right.
 */
export function CardMedia({
  study,
  variant,
}: {
  study: CaseStudyMeta;
  variant: CardVariant;
}) {
  const containerClass =
    variant === "featured"
      ? "aspect-[16/9] p-3 md:aspect-auto md:h-full md:min-h-0 md:p-4"
      : variant === "compact"
        ? "aspect-[16/9] p-2"
        : "aspect-[16/9] p-3";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,hsl(var(--muted)/0.62),hsl(var(--background)),hsl(var(--primary)/0.08))] ring-1 ring-inset ring-foreground/[0.07] dark:bg-[linear-gradient(135deg,hsl(var(--muted)/0.22),hsl(var(--background)),hsl(var(--primary)/0.1))] dark:ring-white/[0.07]",
        containerClass,
      )}
    >
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-background/70 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/5 dark:bg-background/45 dark:ring-white/10">
        <CaseStudyCoverArt study={study} variant={variant} />
      </div>
    </div>
  );
}

/** Standard listing card, used in the /case-studies grid. */
export function CaseStudyCard({
  study,
  variant = "default",
}: {
  study: CaseStudyMeta;
  variant?: Exclude<CardVariant, "featured">;
}) {
  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className={cardFrame("flex-col items-stretch p-3")}
    >
      <CardMedia study={study} variant={variant} />

      <div className="relative z-[1] flex min-w-0 flex-1 items-start justify-between gap-4 p-4 pt-5">
        <div className="min-w-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
            {study.category}
          </span>
          <h3 className="mt-2 line-clamp-2 text-[18px] font-medium leading-snug tracking-[-0.025em] text-[var(--home-ink)] transition-colors group-hover:text-primary md:text-[19px]">
            <NumericText>{study.title}</NumericText>
          </h3>
        </div>

        <ArrowUpRight
          weight="bold"
          className="mt-6 size-4 shrink-0 text-[var(--home-ink-soft)] group-hover:text-primary transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:group-hover:text-primary motion-reduce:transform-none"
        />
      </div>
    </Link>
  );
}

/** Compact card, used in the "More case studies" strip after an article. */
export function CaseStudyCardCompact({ study }: { study: CaseStudyMeta }) {
  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className={cardFrame("flex-col items-stretch p-2.5")}
    >
      <CardMedia study={study} variant="compact" />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col p-3 pt-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
          {study.category}
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-medium leading-snug tracking-[-0.02em] text-[var(--home-ink)]">
          <NumericText>{study.title}</NumericText>
        </h3>
      </div>
    </Link>
  );
}
