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

/** Shared surface with CaseStudyHighlightStats: a flat white card with a hairline. */
export const caseStudyHighlightCardClassName =
  "relative rounded-[6px] bg-[#fbf9f5] ring-1 ring-inset ring-[#141414]/[0.07] shadow-[0_1px_0_rgba(20,20,20,0.04),0_22px_44px_-32px_rgba(20,20,20,0.35)] px-5 py-5 text-[#141414] md:px-7 md:py-7";

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
