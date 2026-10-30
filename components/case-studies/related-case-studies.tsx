import { CaseStudyCardCompact } from "@/components/case-studies/case-study-card";
import type { CaseStudyMeta } from "@/lib/case-studies";

type RelatedCaseStudiesProps = {
  studies: CaseStudyMeta[];
};

/** "More case studies" strip shown after the article body. */
export function RelatedCaseStudies({ studies }: RelatedCaseStudiesProps) {
  if (studies.length === 0) return null;

  return (
    <section className="mt-16 max-w-4xl border-t border-[#141414]/10 pt-12">
      <h2 className="text-[28px] font-medium tracking-[-0.045em] text-[#141414] md:text-[32px]">
        More <span className="text-[#f97316]">case studies</span>
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => (
          <CaseStudyCardCompact key={study.slug} study={study} />
        ))}
      </div>
    </section>
  );
}
