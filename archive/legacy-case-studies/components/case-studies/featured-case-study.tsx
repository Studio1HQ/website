import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import {
  CardMedia,
  ClientMark,
  cardFrame,
} from "@/components/case-studies/case-study-card";
import { getFeaturedCaseStudy } from "@/lib/case-studies";

/**
 * Featured case study, the largest size in the card system.
 *
 * Content left, artwork right. Carries a short metric row because it has the
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
      className={cardFrame("s1-glass-raised flex-col p-3 md:flex-row md:items-stretch")}
    >
      {/* Narrative */}
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-6 p-5 sm:p-7 lg:p-8">
        <div className="flex min-w-0 items-center gap-3">
          <ClientMark study={study} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--home-ink)]">
              {study.client}
            </p>
            <span className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-wider text-primary">
              {study.category}
            </span>
          </div>
        </div>

        <h2 className="text-[28px] font-medium leading-[1.12] tracking-[-0.04em] text-[var(--home-ink)] md:text-[36px]">
          <NumericText>{study.title}</NumericText>
        </h2>

        {metrics.length > 0 ? (
          <dl className="flex flex-wrap gap-x-10 gap-y-6 border-t border-[var(--home-line)] pt-6">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 max-w-[9rem]">
                <dt className="sr-only">{metric.label}</dt>
                <dd className="font-numeric text-2xl font-medium leading-none tracking-tight tabular-nums text-primary transition-colors duration-300 group-hover:text-primary1 md:text-3xl">
                  <NumericText>{metric.value}</NumericText>
                </dd>
                <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-[var(--home-ink-soft)]">
                  {metric.label}
                </p>
              </div>
            ))}
          </dl>
        ) : null}

        <span className="s1-glass-btn mt-auto inline-flex h-12 w-fit items-center gap-3 rounded-full pl-6 pr-1.5 text-[13px] font-medium uppercase tracking-[0.06em] text-white">
          Read the case study
          <span className="flex size-9 items-center justify-center rounded-full bg-white text-[#140e0a] transition-transform duration-300 group-hover:rotate-45 motion-reduce:transform-none">
            <ArrowUpRight weight="bold" className="size-4" />
          </span>
        </span>
      </div>

      {/* Artwork: stretches to narrative column height on md+ */}
      <div className="relative z-[1] flex min-h-0 min-w-0 items-stretch p-2 md:w-[min(45%,32rem)] md:shrink-0 lg:w-[min(48%,34rem)]">
        <CardMedia study={study} variant="featured" />
      </div>
    </Link>
  );
}
