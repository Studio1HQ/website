"use client";

import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";
import { Container, Rise } from "@/components/home/ui";
import { CELL, MUTED, PaperSection } from "@/components/paper/paper-sections";
import {
  PaperCaseStudyCard,
  PaperPoints,
  ServiceHead,
} from "@/components/pages/shared/paper-service-kit";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

type ServiceDetailItem = {
  title: string;
  description: string;
  points?: string[];
};

type ServiceDetailSectionProps = {
  id?: string;
  /** Position in the page's printed section index. */
  index?: number;
  eyebrow: string;
  title: string;
  description: string;
  items: ServiceDetailItem[];
  columns?: "two" | "three";
};

function ServiceDetailCard({
  item,
  index,
}: {
  item: ServiceDetailItem;
  index: number;
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden p-6 md:p-7",
        CELL,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-[13px] font-medium tabular-nums"
          style={{ color: PRINT }}
        >
          {number}
        </span>
        <span aria-hidden className="h-px flex-1 bg-[#141414]/10" />
      </div>
      <h3 className="mt-6 text-[20px] font-medium leading-snug tracking-[-0.03em]">
        {item.title}
      </h3>
      <p className={cn("mt-3 text-[15px] leading-[1.6]", MUTED)}>
        {item.description}
      </p>

      {item.points?.length ? (
        <div className="mt-auto pt-7">
          <PaperPoints
            points={item.points}
            className="border-t border-[#141414]/10 pt-5"
          />
        </div>
      ) : null}
    </article>
  );
}

export function ServiceDetailSection({
  id = "scope",
  index = 3,
  eyebrow,
  title,
  description,
  items,
  columns = "three",
}: ServiceDetailSectionProps) {
  return (
    <PaperSection id={id} tone="paper" className="scroll-mt-28">
      <Container>
        <ServiceHead
          index={index}
          name={eyebrow}
          title={title}
          description={description}
        />

        <div
          className={cn(
            "mt-10 grid items-stretch gap-2",
            columns === "two"
              ? "md:grid-cols-2"
              : "md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {items.map((item, position) => (
            <Rise
              key={item.title}
              delay={(position % 3) * 0.08}
              className="h-full"
            >
              <ServiceDetailCard item={item} index={position} />
            </Rise>
          ))}
        </div>
      </Container>
    </PaperSection>
  );
}

type ServiceProofSectionProps = {
  /** Position in the page's printed section index. */
  index?: number;
  eyebrow?: string;
  title: string;
  description: string;
  study: CaseStudyResultData;
};

export function ServiceProofSection({
  index = 5,
  eyebrow = "Proof",
  title,
  description,
  study,
}: ServiceProofSectionProps) {
  return (
    <PaperSection tone="paper">
      <Container>
        <ServiceHead
          index={index}
          name={eyebrow}
          aside={study.company}
          title={title}
          description={description}
        />
        <div className="mt-10">
          <PaperCaseStudyCard study={study} variant="featured" />
        </div>
      </Container>
    </PaperSection>
  );
}
