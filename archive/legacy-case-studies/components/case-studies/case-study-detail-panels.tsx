import Link from "next/link";
import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { caseStudyHighlightCardClassName } from "@/components/case-studies/case-study-highlight-quotes";
import { CaseStudyQuote } from "@/components/case-studies/case-study-quote";
import { NumericText } from "@/components/ui/num";
import type { CaseStudyMeta } from "@/lib/case-studies";
import { cn } from "@/lib/utils";

type CaseStudyDetailPanelsProps = {
  study: CaseStudyMeta;
};

const quietPanel =
  "s1-glass-card rounded-[22px]";

export function CaseStudySnapshot({ study }: CaseStudyDetailPanelsProps) {
  const snapshot = [
    ["Client", study.client],
    ["Focus", study.category],
    ["Market", study.industry],
  ].filter(([, value]) => value);

  return (
    <section className={cn("mt-12 overflow-hidden", quietPanel)}>
      <div className="grid grid-cols-1 divide-y divide-[var(--home-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {snapshot.map(([label, value]) => (
          <div key={label} className="px-4 py-4 sm:px-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-sm font-medium leading-snug text-foreground">
              <NumericText>{value}</NumericText>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CaseStudyScope({ study }: CaseStudyDetailPanelsProps) {
  if (study.services.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            Studio1 scope
          </p>
          <h2 className="mt-2 text-[22px] font-medium tracking-[-0.03em] sm:text-[26px]">
            Engagement focus
          </h2>
        </div>
        {study.website ? (
          <Link
            href={study.website}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Visit {study.client}
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {study.services.map((service) => (
          <span
            key={service}
            className="s1-glass-card rounded-full px-3.5 py-2 text-sm font-medium text-[var(--home-ink)]"
          >
            {service}
          </span>
        ))}
      </div>
    </section>
  );
}

export function CaseStudyProof({ study }: CaseStudyDetailPanelsProps) {
  const quote = study.quotes[0];
  const outcomes = study.outcomes.slice(0, 5);
  const hasBoth = Boolean(quote) && outcomes.length > 0;

  if (!quote && outcomes.length === 0) return null;

  const quotePanel = quote ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
        Client testimonial
      </p>
      <CaseStudyQuote
        variant="pull"
        compact
        pinFooter
        author={quote.author}
        role={quote.role}
        source={quote.source}
        avatar={quote.avatar}
      >
        {quote.text}
      </CaseStudyQuote>
    </div>
  ) : null;

  const outcomesPanel =
    outcomes.length > 0 ? (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          Outcome highlights
        </p>
        <ul className="mt-4 space-y-3">
          {outcomes.map((outcome) => (
            <li key={outcome} className="flex gap-2.5">
              <CheckCircle
                className="mt-0.5 size-4 shrink-0 text-primary"
                weight="fill"
              />
              <span className="text-sm leading-relaxed text-muted-foreground">
                <NumericText>{outcome}</NumericText>
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  // Single surface, split horizontally when both panels exist.
  if (hasBoth) {
    return (
      <section
        aria-label="Client proof"
        className={cn(
          "not-prose mt-14 overflow-hidden",
          caseStudyHighlightCardClassName,
          "!p-0",
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-[var(--home-line)]">
          <div className="flex flex-col border-b border-[var(--home-line)] p-5 md:border-b-0 md:p-6">
            {quotePanel}
          </div>
          <div className="flex flex-col p-5 md:p-6">{outcomesPanel}</div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Client proof"
      className={cn("not-prose mt-14", caseStudyHighlightCardClassName)}
    >
      {quotePanel}
      {outcomesPanel}
    </section>
  );
}
