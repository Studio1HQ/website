"use client";

import { CaseStudyResult, type CaseStudyResultData } from "@/components/case-studies/case-study-result";
import { Container, Rise, SectionIntro } from "@/components/home/ui";
import { cn } from "@/lib/utils";

type ServiceDetailItem = {
  title: string;
  description: string;
  points?: string[];
};

type ServiceDetailSectionProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  items: ServiceDetailItem[];
  columns?: "two" | "three";
};

function ServiceDetailCard({ item, index }: { item: ServiceDetailItem; index: number }) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article className="s1-glass-card group relative flex h-full flex-col rounded-[24px] p-7 transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none md:p-8">
      <span className="font-numeric text-[44px] font-medium leading-none tracking-[-0.04em] text-primary tabular-nums">
        {number}
      </span>
      <h3 className="mt-6 text-[20px] font-medium leading-snug tracking-[-0.025em] text-[var(--home-ink)]">
        {item.title}
      </h3>
      <p className="mt-3 text-[15px] leading-[1.6] text-[var(--home-ink-soft)]">{item.description}</p>

      {item.points?.length ? (
        <div className="mt-auto pt-7">
          <ul className="space-y-2.5 border-t border-[var(--home-line)] pt-5">
            {item.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[14px] leading-snug text-[var(--home-ink)]">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function ServiceDetailSection({
  id = "scope",
  eyebrow,
  title,
  description,
  items,
  columns = "three",
}: ServiceDetailSectionProps) {
  return (
    <section id={id} className="relative scroll-mt-28 py-24 md:py-32">
      <Container>
        <Rise>
          <SectionIntro eyebrow={eyebrow} title={title} description={description} />
        </Rise>

        <div
          className={cn(
            "mt-14 grid items-stretch gap-5 md:mt-16",
            columns === "two" ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {items.map((item, index) => (
            <Rise key={item.title} delay={(index % 3) * 0.08} className="h-full">
              <ServiceDetailCard item={item} index={index} />
            </Rise>
          ))}
        </div>
      </Container>
    </section>
  );
}

type ServiceProofSectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  study: CaseStudyResultData;
};

export function ServiceProofSection({
  eyebrow = "Proof",
  title,
  description,
  study,
}: ServiceProofSectionProps) {
  return (
    <section className="relative py-24 md:py-32">
      <Container className="max-w-[1180px]">
        <Rise>
          <SectionIntro eyebrow={eyebrow} title={title} description={description} />
        </Rise>
        <Rise className="mt-14 md:mt-16">
          <CaseStudyResult study={study} variant="featured" />
        </Rise>
      </Container>
    </section>
  );
}
