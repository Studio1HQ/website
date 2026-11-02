import type { CaseStudyMeta, CaseStudyMetric } from "@/lib/case-studies";
import { CaseStudyHighlightStats } from "@/components/case-studies/case-study-highlight-stats";
import { cn } from "@/lib/utils";

type CaseStudyHighlightsProps = {
  study: CaseStudyMeta;
  className?: string;
};

function dedupeMetrics(metrics: CaseStudyMetric[]) {
  const seen = new Set<string>();

  return metrics.filter((metric) => {
    const key = `${metric.value}\0${metric.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Highlight below the case study header — verified metrics only (up to 3).
 * Studies without metrics render proof panels (quote + outcomes) in this
 * slot via CaseStudyLayout instead.
 */
export function CaseStudyHighlights({
  study,
  className,
}: CaseStudyHighlightsProps) {
  const metrics = dedupeMetrics(study.metrics).slice(0, 3);

  if (metrics.length === 0) return null;

  return (
    <div className={cn(className)}>
      <CaseStudyHighlightStats metrics={metrics} client={study.client} />
    </div>
  );
}
