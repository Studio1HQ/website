import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { NumericText } from "@/components/ui/num";
import { Reveal } from "@/components/case-studies/case-visual";
import type { CaseStudyMeta } from "@/lib/case-studies";

type RelatedCaseStudiesProps = {
  studies: CaseStudyMeta[];
};

const WELL = "bg-[#f4efe7] ring-1 ring-inset ring-[#141414]/[0.06]";

const RIM =
  "flex size-[68px] items-center justify-center rounded-full bg-white p-[7px] shadow-[0_14px_24px_-14px_rgba(20,20,20,0.35)] ring-1 ring-inset ring-[#141414]/[0.07]";

/** One related study: Studio1 and the client, paired, then the story. */
function RelatedCard({ study }: { study: CaseStudyMeta }) {
  const logo = getClientLogo(study.slug);
  // The headline result, numbers first
  const metric =
    study.metrics.find((m) => /^[0-9~<>]/.test(m.value)) ?? study.metrics[0];
  // The category's lead phrase, e.g. "Technical SEO"
  const topic = study.category.split(/\s*(?:&|,|·)\s*/)[0];

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="group flex h-full flex-col rounded-[6px] bg-[#fbf9f5] p-2 shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/[0.07] transition-[background-color,box-shadow] duration-500 hover:bg-[#f4efe7] hover:shadow-[0_36px_70px_-44px_rgba(20,20,20,0.55)]"
    >
      {/* Studio1 and the client, overlapping; closer on hover */}
      <div
        className={`relative flex h-[148px] flex-col items-center justify-center rounded-[6px] ${WELL}`}
      >
        <div className="flex items-center">
          <span
            className={`${RIM} relative z-[1] translate-x-[6px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[12px] motion-reduce:transform-none`}
          >
            <span className="flex size-full items-center justify-center rounded-full bg-white">
              <Image
                src="/assets/site/studio1-logo.svg"
                alt=""
                width={30}
                height={30}
                unoptimized
                className="size-[30px]"
              />
            </span>
          </span>
          <span
            className={`${RIM} relative z-[2] -translate-x-[6px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-[12px] motion-reduce:transform-none`}
          >
            <span className="relative block size-full overflow-hidden rounded-full bg-white">
              {logo ? (
                <Image
                  src={logo.icon}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : null}
            </span>
          </span>
        </div>
        <p className="mt-2.5 text-[12px] font-medium text-[#141414]/55">
          Studio1 <span className="text-[#141414]/30">×</span> {study.client}
        </p>
      </div>

      {/* The story in brief: what, the headline, the result */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <p className="text-[12px] font-medium text-[#c2410c]">{topic}</p>
        <h3 className="mt-1.5 text-[16.5px] font-medium leading-[1.3] tracking-[-0.025em] text-[#141414]">
          <NumericText>{study.title}</NumericText>
        </h3>
        {metric ? (
          <p className="mt-2.5 line-clamp-2 text-[13px] leading-[1.5] text-[#141414]/55">
            <span className="font-semibold text-[#ea580c]">{metric.value}</span>{" "}
            {metric.label}
          </p>
        ) : null}
        <div className="min-h-5 flex-1" />
        <div className="flex items-center justify-between border-t border-[#141414]/[0.08] pt-3.5">
          <span className="text-[13px] font-medium text-[#141414]/75 transition-colors duration-300 group-hover:text-[#141414]">
            Read the story
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#141414] text-white transition-[transform,background-color] duration-300 group-hover:rotate-45 group-hover:bg-[#f97316] motion-reduce:transform-none">
            <ArrowUpRight weight="bold" className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** "More case studies" strip shown after the article body. */
export function RelatedCaseStudies({ studies }: RelatedCaseStudiesProps) {
  if (studies.length === 0) return null;

  return (
    <section className="mt-20 border-t border-[#141414]/10 pt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[28px] font-medium tracking-[-0.045em] text-[#141414] md:text-[32px]">
          More <span className="text-[#f97316]">case studies</span>
        </h2>
        <Link
          href="/case-studies"
          className="group/all hidden items-center gap-1.5 text-[13.5px] font-medium text-[#141414]/60 transition-colors hover:text-[#141414] sm:inline-flex"
        >
          All case studies
          <ArrowUpRight
            weight="bold"
            className="size-3.5 transition-transform duration-300 group-hover/all:-translate-y-0.5 group-hover/all:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {studies.map((study, i) => (
          <Reveal key={study.slug} index={i} className="h-full">
            <RelatedCard study={study} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
