import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NumericText } from "@/components/ui/num";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { GRAIN, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { ResultsPanel } from "@/components/case-studies/results-panel";
import {
  CaseStudyProof,
  CaseStudyScope,
  CaseStudySnapshot,
} from "@/components/case-studies/case-study-detail-panels";
import { TableOfContents } from "@/components/case-studies/table-of-contents";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { CaseStory } from "@/components/case-studies/case-story";
import { RelatedCaseStudies } from "@/components/case-studies/related-case-studies";
import type { CaseStudyMeta } from "@/lib/case-studies";

type CaseStudyLayoutProps = {
  study: CaseStudyMeta;
  related: CaseStudyMeta[];
  children: ReactNode;
};

/** Shared measure for every block on the page, one left edge, top to bottom. */
const COLUMN = "max-w-[52rem]";

/**
 * Case study detail layout.
 *
 * Single left-aligned column with a fixed right-rail table of contents.
 * Everything shares one left edge and one measure, so the page reads as a
 * continuous document rather than a stack of differently-sized bands.
 *
 * Verified metrics sit below the header when present. Studies without metrics
 * open with the testimonial + outcome proof panels instead; with metrics,
 * those panels stay after the narrative.
 */
export function CaseStudyLayout({
  study,
  related,
  children,
}: CaseStudyLayoutProps) {
  const logo = getClientLogo(study.slug);
  const hasMetrics = study.metrics.length > 0;

  return (
    <div style={PAPER_SCOPE}>
      <TableOfContents client={{ name: study.client, logo: logo?.icon }} />

      <article>
        <PaperPageHeader className="pb-10 pt-32 md:pb-12 md:pt-40">
          <div className="mx-auto w-full max-w-7xl px-4">
            <Link
              href="/case-studies"
              className="group inline-flex items-center gap-2 text-[13px] font-medium text-[#141414]/60 transition-colors hover:text-[#141414]"
            >
              <ArrowLeft
                weight="bold"
                className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transform-none"
              />
              All case studies
            </Link>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,52rem)_minmax(0,300px)] lg:items-end lg:justify-between">
              <div className={COLUMN}>
                {/* Client: the exact mark, name, and where the work sat */}
                <div className="inline-flex items-center gap-3 rounded-[6px] bg-white/55 p-1.5 pr-4 shadow-[0_14px_30px_-24px_rgba(20,20,20,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80 backdrop-blur-xl">
                  {logo ? (
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-[6px] bg-white ring-1 ring-inset ring-[#141414]/[0.06]">
                      <Image
                        src={logo.icon}
                        alt={`${study.client} logo`}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-[#141414]">
                      {study.client}
                    </p>
                    {study.industry ? (
                      <p className="mt-0.5 text-[12px] text-[#141414]/55">
                        {study.industry}
                      </p>
                    ) : null}
                  </div>
                </div>

                {study.category ? (
                  <p
                    className="mt-8 text-[12px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: PRINT }}
                  >
                    {study.category}
                  </p>
                ) : null}

                <h1 className="mt-3 text-[34px] font-medium leading-[1.14] tracking-[-0.05em] md:text-[46px] lg:text-[56px]">
                  <span>
                    <NumericText>{study.title}</NumericText>
                  </span>
                </h1>

                <p className="mt-6 max-w-[680px] text-[17px] leading-[1.6] text-[#141414]/60 sm:text-[18px]">
                  {study.description}
                </p>
              </div>

              {/* The results, beside the headline */}
              {hasMetrics ? (
                <ResultsPanel
                  client={study.client}
                  metrics={study.metrics}
                  logo={logo?.icon}
                />
              ) : null}
            </div>
          </div>
        </PaperPageHeader>

        {/* Body sheet; the header carries its own grain. */}
        <div className="relative isolate">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:pt-6">
            {/* Single measure for highlights, prose, and credentials. */}
            <div className={COLUMN}>
              {/*
            With metrics: verified results sit under the header; proof panels
            stay after the narrative. Without metrics: testimonial + outcomes
            move up so the page still opens with proof, not a blank gap.
          */}
              {hasMetrics ? null : <CaseStudyProof study={study} />}

              <CaseStudySnapshot study={study} />
              <CaseStudyScope study={study} />

              {/* The engagement as a four-chapter story */}
              <CaseStory study={study} />

              {/* Narrative: max-w-none so width comes from the column wrapper, not prose defaults. */}
              <div
                data-mdx-content
                className="prose prose-neutral mt-16 max-w-none prose-headings:scroll-mt-32 prose-headings:font-medium prose-headings:tracking-[-0.035em] prose-headings:text-[var(--p-fg)] prose-h2:text-[30px] prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-[var(--home-ink-soft)] prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 prose-a:underline-offset-4 hover:prose-a:decoration-primary prose-blockquote:border-l-[#f97316] prose-strong:font-semibold prose-strong:text-[var(--p-fg)] prose-code:before:content-none prose-code:after:content-none prose-li:text-[17px] prose-li:leading-[1.7] prose-li:text-[var(--home-ink-soft)] prose-li:marker:text-[#f97316] prose-hr:border-[var(--p-line)] prose-th:text-[var(--p-fg)] prose-td:text-[var(--home-ink-soft)]"
              >
                {children}
              </div>

              {hasMetrics ? <CaseStudyProof study={study} /> : null}

              {/* Credentials */}
              {study.services.length > 0 || study.website ? (
                <div className="mt-16 flex flex-wrap items-start justify-between gap-6 border-t border-[var(--p-line)] pt-8">
                  {study.services.length > 0 ? (
                    <div className="min-w-0">
                      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--p-muted)]">
                        What we did
                      </p>
                      <p className="text-[15px] font-medium text-[var(--p-fg)]">
                        {study.services.join(" · ")}
                      </p>
                    </div>
                  ) : null}

                  {study.website ? (
                    <a
                      href={study.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-[var(--p-fg)] px-4 text-[14px] font-medium text-[var(--p-fg)] transition-colors hover:bg-[var(--p-fg)] hover:text-[var(--p-bg)]"
                    >
                      Visit {study.client}
                      <ArrowUpRight
                        weight="bold"
                        className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                      />
                    </a>
                  ) : null}
                </div>
              ) : null}

              {/*
            End-of-case-study sentinel. The fixed table of contents watches this
            element and releases once it reaches the rail, so the rail stays with
            the reader through the narrative AND the credentials, then steps
            aside for the related strip, which isn't part of the study.
          */}
              <div aria-hidden data-mdx-end />
            </div>

            {/* More studies run the full width of the page */}
            <RelatedCaseStudies studies={related} />
          </div>
        </div>
      </article>
    </div>
  );
}
