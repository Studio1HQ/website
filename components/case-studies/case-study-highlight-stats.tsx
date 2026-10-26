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
        className="mt-1 size-4 shrink-0 text-[#141414]/45 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
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
      <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-[#c2410c]">
        Results with {client}
      </p>

      <dl
        className={cn(
          "grid grid-cols-1 gap-2.5",
          metrics.length === 2 && "sm:grid-cols-2",
          metrics.length >= 3 && "sm:grid-cols-3",
        )}
      >
        <div className="min-w-0 rounded-[14px] bg-[#ece5da] p-4 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(255,255,255,0.95)] md:p-5">
          <dt className="sr-only">{headline.label}</dt>
          <dd>
            <StatValue
              metric={headline}
              className="font-numeric text-[34px] font-medium leading-none tracking-[-0.045em] tabular-nums text-[#f97316] md:text-[44px]"
            />
          </dd>
          <p className="mt-2.5 text-[13px] leading-snug text-[#141414]/60">
            {headline.label}
          </p>
        </div>

        {supporting.map((metric) => (
          <div
            key={`${metric.value}-${metric.label}`}
            className="min-w-0 rounded-[14px] bg-[#ece5da] p-4 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(255,255,255,0.95)] md:p-5"
          >
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <StatValue
                metric={metric}
                className="font-numeric text-[28px] font-medium leading-none tracking-[-0.045em] tabular-nums text-[#141414] md:text-[34px]"
              />
            </dd>
            <p className="mt-2.5 text-[13px] leading-snug text-[#141414]/60">
              {metric.label}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
