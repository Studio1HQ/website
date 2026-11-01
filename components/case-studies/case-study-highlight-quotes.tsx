import type { CaseStudyQuote as CaseStudyQuoteData } from "@/lib/case-studies";
import { cn } from "@/lib/utils";
import { CaseStudyQuote } from "@/components/case-studies/case-study-quote";

type CaseStudyHighlightQuotesProps = {
  quote: CaseStudyQuoteData;
  client: string;
  /** When true, eyebrow reflects outcome highlights instead of client quotes. */
  fromOutcomes?: boolean;
  className?: string;
};

/** Shared surface with CaseStudyHighlightStats: an engraved well in a glassy rim. */
export const caseStudyHighlightCardClassName =
  "relative rounded-[6px] bg-[#f1ece4] shadow-[0_0_0_6px_rgba(255,255,255,0.62),0_0_0_7px_rgba(20,20,20,0.04),0_30px_60px_-40px_rgba(20,20,20,0.45),inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06),inset_0_-1px_0_rgba(255,255,255,0.8)] px-5 py-5 text-[#141414] md:px-7 md:py-7";

/**
 * Single editorial pull quote when a study has no verified metrics.
 */
export function CaseStudyHighlightQuotes({
  quote,
  client,
  fromOutcomes = false,
  className,
}: CaseStudyHighlightQuotesProps) {
  return (
    <section
      aria-label="Client highlight"
      className={cn(caseStudyHighlightCardClassName, className)}
    >
      <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-[#c2410c]">
        {fromOutcomes ? `Key outcome with ${client}` : `What ${client} said`}
      </p>

      <CaseStudyQuote
        variant="pull"
        author={quote.author}
        role={quote.role}
        source={quote.source}
        avatar={quote.avatar}
      >
        {quote.text}
      </CaseStudyQuote>
    </section>
  );
}
