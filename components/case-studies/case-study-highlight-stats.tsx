import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { caseStudyHighlightCardClassName } from "@/components/case-studies/case-study-highlight-quotes";
import { NumericText } from "@/components/ui/num";
import type { CaseStudyMetric } from "@/lib/case-studies";
import { cn } from "@/lib/utils";

type CaseStudyHighlightStatsProps = {
  metrics: CaseStudyMetric[];
  client: string;
  className?: string;
};
function StatValue({
  metric,
  className,
}: {
  metric: CaseStudyMetric;
  className: string;
}) {
  const value = (
    <span className={className}>
      <NumericText>{metric.value}</NumericText>
    </span>
  );

  if (!metric.evidence) return value;

  return (
    <Link
      href={metric.evidence}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-start gap-1.5 transition-opacity hover:opacity-80"
    >
      {value}
      <ArrowUpRight
        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
        aria-label="View source"
      />
    </Link>
  );
}

/**
 * Verified metrics in the same highlight-card language as client quotes.
 * Headline metric leads; supporting metrics sit beside it at a quieter weight.
 */
export function CaseStudyHighlightStats({
  metrics,
  client,
  className,
}: CaseStudyHighlightStatsProps) {
  if (metrics.length === 0) return null;

  const [headline, ...supporting] = metrics;

  return (
    <section
      aria-label="Verified results"
      className={cn(caseStudyHighlightCardClassName, className)}
    >
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-primary dark:text-primary/70">
        Results with {client}
      </p>

      <dl className="flex flex-col gap-y-8 md:flex-row md:flex-nowrap md:items-start md:gap-x-8 md:gap-y-0 lg:gap-x-10">
        <div className="min-w-0 md:flex-1">
          <dt className="sr-only">{headline.label}</dt>
          <dd>
            <StatValue
              metric={headline}
              className="font-numeric text-4xl font-medium leading-none tracking-tight tabular-nums text-primary sm:text-5xl md:text-6xl"
            />
          </dd>
          <p className="mt-2.5 max-w-[14rem] text-xs leading-snug text-muted-foreground md:max-w-none">
            {headline.label}
          </p>
        </div>

        {supporting.map((metric, index) => (
          <div
            key={`${metric.value}-${metric.label}`}
            className={cn(
              "min-w-0 md:flex-1",
              index === 0 && "md:pl-8",
              index === 1 && "md:pl-12",
            )}
          >
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <StatValue
                metric={metric}
                className="font-numeric text-2xl font-semibold leading-none tabular-nums text-foreground md:text-3xl"
              />
            </dd>
            <p className="mt-2.5 max-w-[12rem] text-xs leading-snug text-muted-foreground md:max-w-none">
              {metric.label}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
