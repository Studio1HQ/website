import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { GRAIN, PAPER_SCOPE } from "@/lib/paper";
import { CaseHero } from "@/components/case-studies/case-hero";
import { Reveal } from "@/components/case-studies/case-visual";
import { CaseStudyProof } from "@/components/case-studies/case-study-detail-panels";
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

  return (
    <div style={PAPER_SCOPE}>
      <article>
        <PaperPageHeader className="pb-10 pt-28 md:pb-12 md:pt-32">
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

            <div className="mt-8">
              <CaseHero study={study} logo={logo?.icon} />
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
            {/* The story fills the hero's width; on desktop it shares it with the rail */}
            <div className="xl:flex xl:gap-12">
              <div className="w-full min-w-0 flex-1">
                {/* The engagement as a four-chapter story */}
                <Reveal>
                  <CaseStory study={study} />
                </Reveal>

                {/* Narrative: max-w-none so width comes from the column wrapper, not prose defaults. */}
                <div
                  data-mdx-content
                  className="prose prose-neutral mt-16 max-w-none prose-headings:scroll-mt-32 prose-headings:font-medium prose-headings:tracking-[-0.035em] prose-headings:text-[var(--p-fg)] prose-h2:text-[30px] prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-[var(--home-ink-soft)] prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 prose-a:underline-offset-4 hover:prose-a:decoration-primary prose-blockquote:border-l-[#f97316] prose-strong:font-semibold prose-strong:text-[var(--p-fg)] prose-strong:underline prose-strong:decoration-[#f97316]/50 prose-strong:decoration-[1.5px] prose-strong:underline-offset-[5px] prose-code:before:content-none prose-code:after:content-none prose-li:text-[17px] prose-li:leading-[1.7] prose-li:text-[var(--home-ink-soft)] prose-li:marker:text-[#f97316] prose-hr:border-[var(--p-line)] prose-th:text-[var(--p-fg)] prose-td:text-[var(--home-ink-soft)]"
                >
                  {children}
                </div>

                <Reveal>
                  <CaseStudyProof study={study} />
                </Reveal>

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
            End-of-case-study sentinel: reading progress in the rail runs from
            the start of the narrative to here.
          */}
                <div aria-hidden data-mdx-end />
              </div>

              <TableOfContents
                client={{ name: study.client, logo: logo?.icon }}
              />
            </div>

            {/* More studies run the full width of the page */}
            <RelatedCaseStudies studies={related} />
          </div>
        </div>
      </article>
    </div>
  );
}
