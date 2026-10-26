import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import { DitherField } from "@/components/home/dither-field";
import {
  CardHairline,
  CardMedia,
  CategoryPill,
  ClientMark,
  cardFrame,
} from "@/components/case-studies/case-study-card";
import { getFeaturedCaseStudy } from "@/lib/case-studies";
import { INK, PAPER, PRINT } from "@/lib/paper";

/**
 * Featured case study, the largest size in the card system.
 *
 * Content left, artwork right, on the home page's white featured-case sheet.
 * Carries a short metric row, engraved into the card, because it has the
 * room; the standard cards do not, since their headlines already state the
 * number. No summary paragraph and no tag row: this is an index, not a page.
 */
export function FeaturedCaseStudy() {
  const study = getFeaturedCaseStudy();
  if (!study) return null;

  const metrics = study.metrics.slice(0, 3);

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className={cardFrame("flex-col p-3 md:flex-row md:items-stretch")}
    >
      {/* Still orange halftone, fading out from the top-left corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[6px]"
      >
        <DitherField
          still
          pattern="halftone"
          fade="left"
          cell={8}
          size={3}
          strength={1.6}
          className="absolute left-0 top-0 h-[150px] w-[240px] -scale-x-100 [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_70%)]"
        />
      </span>
      <CardHairline />

      {/* Narrative */}
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-7 lg:p-9">
        <div className="flex min-w-0 items-center gap-3">
          <ClientMark study={study} size="lg" frosted />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#141414]">
              {study.client}
            </p>
            <span className="mt-1 block min-w-0">
              <CategoryPill>{study.category}</CategoryPill>
            </span>
          </div>
        </div>

        <h2 className="text-[28px] font-medium leading-[1.12] tracking-[-0.045em] text-[#141414] md:text-[38px]">
          <NumericText>{study.title}</NumericText>
        </h2>

        {metrics.length > 0 ? (
          <dl className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-w-0 rounded-[6px] bg-[#ece5da] p-3.5 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(255,255,255,0.95)]"
              >
                <dt className="sr-only">{metric.label}</dt>
                <dd
                  className="font-numeric text-[24px] font-medium leading-none tracking-[-0.045em] tabular-nums md:text-[28px]"
                  style={{ color: PRINT }}
                >
                  <NumericText>{metric.value}</NumericText>
                </dd>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-[#141414]/60">
                  {metric.label}
                </p>
              </div>
            ))}
          </dl>
        ) : null}

        <span
          className="mt-auto inline-flex h-12 w-fit items-center gap-3 rounded-full pl-6 pr-1.5 text-[14px] font-medium"
          style={{ background: INK, color: PAPER }}
        >
          Read the case study
          <span
            className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45 motion-reduce:transform-none"
            style={{ background: PRINT }}
          >
            <ArrowUpRight weight="bold" className="size-4" />
          </span>
        </span>
      </div>

      {/* Artwork: stretches to narrative column height on md+ */}
      <div className="relative z-[1] flex min-h-0 min-w-0 items-stretch p-1 md:w-[min(45%,32rem)] md:shrink-0 md:p-2 lg:w-[min(48%,34rem)]">
        <CardMedia study={study} variant="featured" />
      </div>
    </Link>
  );
}
