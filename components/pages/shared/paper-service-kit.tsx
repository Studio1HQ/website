"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, Plus } from "@phosphor-icons/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Accent,
  FAINT,
  IndexBar,
  MUTED,
  SectionHead,
} from "@/components/paper/paper-sections";
import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";
import type { ProcessStep } from "@/components/sections/process-scroller";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const pad2 = (value: number) => String(value).padStart(2, "0");

/* ------------------------------------------------------------------ */
/* Section header: printed index line, then the framed headline        */
/* ------------------------------------------------------------------ */

export function ServiceHead({
  index,
  name,
  title,
  accent,
  description,
  aside,
}: {
  index: number;
  name: string;
  title: ReactNode;
  /** Trailing words printed in orange. */
  accent?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <IndexBar index={index} name={name} aside={aside} />
      <SectionHead
        title={
          accent ? (
            <>
              {title} <Accent>{accent}</Accent>
            </>
          ) : (
            title
          )
        }
        description={description}
      />
    </>
  );
}

/** Small ink-on-paper chip, e.g. a badge or a format tag. */
export function PaperChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[6px] bg-[#141414]/[0.05] px-2.5 py-1 text-[12px] font-medium text-[#141414]/75">
      {children}
    </span>
  );
}

/** Bullet list with small print-orange squares. */
export function PaperPoints({
  points,
  className,
}: {
  points: ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {points.map((point, index) => (
        <li
          key={index}
          className="flex items-start gap-2.5 text-[14px] leading-snug text-[#141414]"
        >
          <span
            aria-hidden
            className="mt-[6px] size-1.5 shrink-0"
            style={{ background: PRINT }}
          />
          <span className="min-w-0">{point}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Case study proof card (paper)                                       */
/* ------------------------------------------------------------------ */

/** Inset "engraved" tile used for result numbers, as on the home page. */
const ENGRAVED =
  "rounded-[6px] bg-[#ece5da] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85),0_1px_0_rgba(255,255,255,0.95)]";

const CARD =
  "group relative isolate overflow-hidden rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/[0.08] shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[inset_0_1px_0_#fff,0_30px_60px_-34px_rgba(249,115,22,0.45)] motion-reduce:transform-none after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(120%_70%_at_50%_110%,rgba(249,115,22,0.20),transparent_70%)] after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100";

function TopHairline() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-8 top-0 h-px"
      style={{
        background: `linear-gradient(90deg, transparent, ${PRINT}, transparent)`,
      }}
    />
  );
}

function ReadLink() {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#141414]">
      Read case study
      <span className="flex size-7 items-center justify-center rounded-full text-[#141414]/60 ring-1 ring-inset ring-[#141414]/15 transition-colors duration-300 group-hover:bg-[#f97316] group-hover:text-white group-hover:ring-transparent">
        <ArrowRight
          weight="bold"
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </span>
  );
}

export function PaperCaseStudyCard({
  study,
  variant = "compact",
  density = "default",
}: {
  study: CaseStudyResultData;
  variant?: "featured" | "compact";
  density?: "default" | "dense";
}) {
  const dense = density === "dense";

  if (variant === "featured") {
    return (
      <Link
        href={study.href}
        className={cn("flex flex-col md:flex-row md:items-stretch", CARD)}
      >
        <TopHairline />
        <div
          className={cn(
            "flex flex-col justify-between border-b border-[#141414]/10 md:w-[42%] md:border-b-0 md:border-r",
            dense ? "gap-6 p-6 md:p-7" : "gap-8 p-6 md:p-9",
          )}
        >
          <div>
            <p className="flex items-center gap-2 text-[13px] font-medium text-[#141414]/60">
              <span
                aria-hidden
                className="size-1.5 shrink-0"
                style={{ background: PRINT }}
              />
              {study.category}
            </p>
            <p className="mt-3 text-[22px] font-medium tracking-[-0.035em] md:text-[26px]">
              {study.company}
            </p>
          </div>
          <div>
            <p
              className={cn(
                "font-medium leading-none tabular-nums tracking-[-0.05em]",
                dense
                  ? "text-[40px] md:text-[48px] lg:text-[56px]"
                  : "text-[44px] md:text-[56px] lg:text-[64px]",
              )}
              style={{ color: PRINT }}
            >
              {study.heroValue}
            </p>
            <p
              className={cn(
                "mt-3 max-w-[16rem] text-[14px] leading-snug",
                MUTED,
              )}
            >
              {study.heroLabel}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col justify-between",
            dense ? "gap-6 p-6 md:p-7" : "gap-8 p-6 md:p-9",
          )}
        >
          <div>
            <p
              className={cn(
                "max-w-xl font-normal leading-snug tracking-[-0.025em] text-[#141414]",
                dense
                  ? "text-[18px] md:text-[20px] lg:text-[22px]"
                  : "text-[19px] md:text-[22px] lg:text-[25px]",
              )}
            >
              {study.proof}
            </p>
            {study.stats?.length ? (
              <dl
                className={cn(
                  "grid grid-cols-1 gap-2 min-[420px]:grid-cols-3",
                  dense ? "mt-6" : "mt-8",
                )}
              >
                {study.stats.map((stat, index) => (
                  <div
                    key={`${stat.value}-${stat.label}-${index}`}
                    className={cn("min-w-0 p-3.5", ENGRAVED)}
                  >
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="text-[18px] font-medium leading-none tabular-nums tracking-[-0.04em] md:text-[20px]">
                      {stat.value}
                    </dd>
                    <span
                      className={cn(
                        "mt-1.5 block text-[12px] leading-snug",
                        MUTED,
                      )}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <ReadLink />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={study.href}
      className={cn("flex h-full flex-col p-6 sm:p-7", CARD)}
    >
      <TopHairline />
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-medium tracking-[-0.025em]">
            {study.company}
          </p>
          <p className={cn("mt-1 text-[13px]", MUTED)}>{study.category}</p>
        </div>
        <ArrowUpRight
          weight="bold"
          className="mt-1 size-4 shrink-0 text-[#141414]/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#141414]"
        />
      </div>
      <div className="mt-auto">
        <p
          className="text-[40px] font-medium leading-none tabular-nums tracking-[-0.05em] sm:text-[44px]"
          style={{ color: PRINT }}
        >
          {study.heroValue}
        </p>
        <p className="mt-2 text-[14px] font-medium text-[#141414]">
          {study.heroLabel}
        </p>
        <p className={cn("mt-4 text-[14px] leading-relaxed", MUTED)}>
          {study.proof}
        </p>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Process: orange panel and step cards inside one outer card          */
/* ------------------------------------------------------------------ */

const ORANGE_PANEL = {
  background:
    "linear-gradient(165deg, #fe3200 8%, #fc8c04 48%, rgba(242,138,111,0) 86%), linear-gradient(90deg, #fc8c04, #fc8c04)",
};

export function PaperServiceProcess({
  index,
  name = "Process",
  title,
  accent,
  description,
  steps,
  stepLabel = "Step",
}: {
  index: number;
  name?: string;
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  steps: ProcessStep[];
  stepLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <IndexBar index={index} name={name} />
      {/* One outer card; the orange panel and the step tray sit inside it */}
      <div className="mt-8 rounded-[6px] bg-white/70 p-2 shadow-[0_30px_60px_-44px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08] sm:p-2.5">
        <div className="grid gap-2 sm:gap-2.5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div
              className="relative isolate flex flex-col justify-between gap-10 overflow-hidden rounded-[4px] px-6 py-10 text-white md:px-10 md:py-12 lg:min-h-[440px]"
              style={ORANGE_PANEL}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
                style={{ backgroundImage: GRAIN }}
              />
              <h2 className="max-w-[520px] text-[32px] font-medium leading-[1.15] tracking-[-0.045em] sm:text-[40px] lg:text-[44px]">
                {title}
                {accent ? (
                  <>
                    {" "}
                    <span className="text-[#141414]">{accent}</span>
                  </>
                ) : null}
              </h2>
              <div>
                {description ? (
                  <p className="max-w-[420px] text-[16px] leading-relaxed text-white/90 md:text-[17px]">
                    {description}
                  </p>
                ) : null}
                <p className="mt-8 flex flex-wrap items-center gap-3 text-[13px] font-medium text-white/80">
                  <span className="tabular-nums">{pad2(steps.length)}</span>
                  <span className="h-px w-10 bg-white/50" />
                  {steps.map((step) => step.name).join(" · ")}
                </p>
              </div>
            </div>
          </div>

          {/* Engraved tray holding one white card per step */}
          <ol className="flex flex-col gap-2 rounded-[4px] bg-[#f3eee6] p-2 shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_#fff] sm:p-2.5">
            {steps.map((step, position) => {
              const StepIcon = step.icon;
              return (
                <motion.li
                  key={step.name}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="group rounded-[4px] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,20,0.06),0_10px_24px_-18px_rgba(20,20,20,0.35)] ring-1 ring-inset ring-[#141414]/[0.06] transition-shadow duration-500 hover:shadow-[0_1px_2px_rgba(20,20,20,0.06),0_16px_30px_-22px_rgba(20,20,20,0.35)] sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] text-[#141414] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10),inset_0_-1px_0_#fff,0_1px_0_#fff] transition-colors duration-500 group-hover:text-[#ea580c]">
                      <StepIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[12px] font-medium tabular-nums",
                          FAINT,
                        )}
                      >
                        {stepLabel} {pad2(position + 1)} / {pad2(steps.length)}
                      </p>
                      <h3 className="mt-0.5 text-[21px] font-medium leading-tight tracking-[-0.035em] md:text-[23px]">
                        {step.name}
                      </h3>
                    </div>
                  </div>
                  <p className={cn("mt-4 text-[15px] leading-[1.6]", MUTED)}>
                    {step.description}
                  </p>
                  <ul className="mt-5 grid gap-x-5 gap-y-2.5 rounded-[4px] bg-[#f8f6f2] p-4 shadow-[inset_0_2px_6px_rgba(20,20,20,0.07),inset_0_-1px_0_#fff] sm:grid-cols-2">
                    {step.details.map((detail, detailIndex) => (
                      <li
                        key={detailIndex}
                        className="flex items-start gap-2.5 text-[14px] font-medium leading-snug text-[#141414]"
                      >
                        <Check
                          weight="bold"
                          className="mt-[2px] size-4 shrink-0"
                          style={{ color: PRINT }}
                        />
                        <div className="min-w-0">{detail}</div>
                      </li>
                    ))}
                  </ul>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ (paper): same copy and JSON-LD as components/landing/faq        */
/* ------------------------------------------------------------------ */

type FaqEntry = { question: string; answer: string };

export function PaperServiceFaq({
  index,
  items,
  subtitle,
}: {
  index: number;
  items: FaqEntry[];
  subtitle?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <IndexBar index={index} name="FAQ" />
      {/* Head on top, then the questions one after another */}
      <SectionHead
        title={
          <>
            Frequently Asked <Accent>Questions</Accent>
          </>
        }
        description={
          subtitle ?? "Everything you need to know about working with Studio1."
        }
        actionEnd
        action={
          <a
            href="https://cal.com/studio1/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ background: INK, color: PAPER }}
          >
            Book a call
            <span
              className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
              style={{ background: PRINT }}
            >
              <ArrowUpRight weight="bold" className="size-4" />
            </span>
          </a>
        }
      />
      <div className="mt-10">
        {/* Questions in one white card, hairline rows */}
        <div className="min-w-0 rounded-[6px] bg-white/80 px-6 py-2 ring-1 ring-inset ring-[#141414]/10 sm:px-8">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, position) => (
              <AccordionItem
                key={item.question}
                value={`faq-${position}`}
                className="border-b border-[#141414]/10 last:border-b-0"
              >
                <AccordionTrigger
                  className={cn(
                    "group gap-5 py-5 text-left hover:no-underline sm:py-6",
                    "[&>svg]:hidden",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2",
                  )}
                >
                  <span className="w-7 shrink-0 text-[13px] font-medium tabular-nums text-[#141414]/35 transition-colors group-data-[state=open]:text-[#f97316]">
                    {pad2(position + 1)}
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-[#141414] transition-colors duration-200 group-hover:text-[#f97316] group-data-[state=open]:text-[#f97316] sm:text-[17px]">
                    {item.question}
                  </span>
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] text-[#141414]/55 shadow-[inset_0_2px_5px_rgba(20,20,20,0.10),inset_0_-1px_0_#fff] transition-colors group-data-[state=open]:bg-[#f97316] group-data-[state=open]:text-white group-data-[state=open]:shadow-none"
                  >
                    <Plus
                      weight="bold"
                      className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-45"
                    />
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    "max-w-[760px] pb-6 pl-12 pr-12 text-[15px] leading-[1.7]",
                    MUTED,
                  )}
                >
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </>
  );
}
