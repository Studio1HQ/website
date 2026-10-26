import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { CaseStudyCoverArt } from "@/components/case-studies/case-study-cover-art";
import { cn } from "@/lib/utils";
import { PRINT } from "@/lib/paper";
import type { CaseStudyMeta } from "@/lib/case-studies";

/**
 * Case-study card system, in the paper design.
 *
 * Deliberately spare: artwork, category, headline, arrow. No summary, no tag
 * row, no separate metric block, the headlines already carry their numbers
 * ("...to 12,000+ GitHub stars"), so a metric underneath only repeated the
 * title. Detail belongs on the case study itself, not the index.
 *
 * Cards are the home page's white sheets: rounded, a hairline ink ring, an
 * orange hairline along the top edge, and the artwork engraved into the card.
 */

export type CardVariant = "featured" | "default" | "compact";

/** Shared frame: white paper sheet + one hover language across all sizes. */
export function cardFrame(extra?: string) {
  return cn(
    "group relative isolate flex min-w-0 overflow-hidden rounded-[6px] bg-white/80 text-[#141414] ring-1 ring-inset ring-[#141414]/[0.08]",
    "shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)]",
    "transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[inset_0_1px_0_#fff,0_30px_60px_-34px_rgba(249,115,22,0.45)]",
    "motion-reduce:transform-none motion-reduce:transition-none",
    extra,
  );
}

/** Orange hairline along the top edge of a card, as on the home page. */
export function CardHairline() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-8 top-0 z-[2] h-px"
      style={{
        background: `linear-gradient(90deg, transparent, ${PRINT}, transparent)`,
      }}
    />
  );
}

/** Small orange disc with an arrow, turning on hover. */
export function CardArrow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45 motion-reduce:transform-none",
        className,
      )}
      style={{ background: PRINT }}
    >
      <ArrowUpRight weight="bold" className="size-3.5" />
    </span>
  );
}

/** Category label: a soft orange pill. */
export function CategoryPill({ children }: { children: string }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#c2410c]">
      {children}
    </span>
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

  const tile = { sm: "size-10", md: "size-11", lg: "size-12" }[size];
  const pad = { sm: "p-1", md: "p-1.5", lg: "p-1.5" }[size];

  return (
    <div
      className={cn(
        tile,
        pad,
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#f8f6f2] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_#fff,0_1px_0_#fff] transition-shadow duration-500",
        frosted && "shadow-[0_8px_20px_-12px_rgba(20,20,20,0.45)]",
      )}
    >
      <Image
        src={logo.icon}
        alt={`${study.client} logo`}
        width={48}
        height={48}
        className="size-full scale-110 rounded-md object-contain mix-blend-multiply"
      />
    </div>
  );
}

/**
 * Card artwork.
 *
 * Engraved into the card (the home page's pressed result boxes) with the
 * live cover plate inset on top, so every card renders at identical quality
 * and a new case study only needs a title + logo to look right.
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
      ? "aspect-[16/9] p-2.5 md:aspect-auto md:h-full md:min-h-0 md:p-3"
      : variant === "compact"
        ? "aspect-[16/9] p-2"
        : "aspect-[16/9] p-2.5";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[6px] bg-[#ece5da] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(255,255,255,0.95)]",
        containerClass,
      )}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-[#fbf8f3] shadow-[0_14px_30px_-22px_rgba(20,20,20,0.5)] ring-1 ring-[#141414]/[0.06]">
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
      className={cardFrame("h-full flex-col items-stretch p-3")}
    >
      <CardHairline />
      <CardMedia study={study} variant={variant} />

      <div className="relative z-[1] flex min-w-0 flex-1 items-start justify-between gap-4 p-4 pt-5 md:p-5 md:pt-6">
        <div className="min-w-0">
          <CategoryPill>{study.category}</CategoryPill>
          <h3 className="mt-3 line-clamp-2 text-[19px] font-medium leading-[1.25] tracking-[-0.035em] text-[#141414] md:text-[22px]">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1.5px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1.5px]">
              <NumericText>{study.title}</NumericText>
            </span>
          </h3>
        </div>

        <CardArrow className="mt-1" />
      </div>
    </Link>
  );
}

/** Compact card, used in the "More case studies" strip after an article. */
export function CaseStudyCardCompact({ study }: { study: CaseStudyMeta }) {
  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className={cardFrame(
        "h-full flex-col items-stretch rounded-[6px] p-2.5",
      )}
    >
      <CardHairline />
      <CardMedia study={study} variant="compact" />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col p-3 pt-4">
        <span className="text-[12px] font-medium text-[#c2410c]">
          {study.category}
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-[15.5px] font-medium leading-snug tracking-[-0.025em] text-[#141414] transition-colors group-hover:text-[#c2410c]">
          <NumericText>{study.title}</NumericText>
        </h3>
      </div>
    </Link>
  );
}
