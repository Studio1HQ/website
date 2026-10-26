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
  "rounded-[24px] bg-white/80 shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08]";

export function CaseStudySnapshot({ study }: CaseStudyDetailPanelsProps) {
  const snapshot = [
    ["Client", study.client],
    ["Focus", study.category],
    ["Market", study.industry],
  ].filter(([, value]) => value);

  return (
    <section className={cn("mt-12 overflow-hidden", quietPanel)}>
      <div className="grid grid-cols-1 divide-y divide-[#141414]/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {snapshot.map(([label, value]) => (
          <div key={label} className="px-4 py-4 sm:px-5">
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#141414]/55">
              {label}
            </p>
            <p className="mt-2 text-[15px] font-medium leading-snug text-[#141414]">
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
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#c2410c]">
            Studio1 scope
          </p>
          <h2 className="mt-2 text-[24px] font-medium tracking-[-0.04em] text-[#141414] sm:text-[28px]">
            Engagement focus
          </h2>
        </div>
        {study.website ? (
          <Link
            href={study.website}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-[#141414]/60 transition-colors hover:text-[#141414]"
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
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-[13.5px] font-medium text-[#141414] ring-1 ring-inset ring-[#141414]/10"
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-[#f97316]"
            />
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
      <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-[#c2410c]">
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
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#c2410c]">
          Outcome highlights
        </p>
        <ul className="mt-4 space-y-3">
          {outcomes.map((outcome) => (
            <li key={outcome} className="flex gap-2.5">
              <CheckCircle
                className="mt-0.5 size-4 shrink-0 text-[#f97316]"
                weight="fill"
              />
              <span className="text-[15px] leading-relaxed text-[#141414]/65">
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
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-[#141414]/10">
          <div className="flex flex-col border-b border-[#141414]/10 p-5 md:border-b-0 md:p-6">
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
