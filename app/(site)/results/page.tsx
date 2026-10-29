import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import { IndexBar, PaperCta, PaperSection } from "@/components/paper/paper-sections";
import { Container } from "@/components/home/ui";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { getAllCaseStudies, type CaseStudyMeta } from "@/lib/case-studies";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";
import { PAPER_SCOPE, PRINT } from "@/lib/paper";
import { breadcrumbJsonLd, ORGANIZATION_ID, pageMetadata } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

const TITLE = "Results: GitHub Stars, Rankings, and Reach";
const DESCRIPTION =
  "Every Studio1 result in one place, with sources: 12,000+ GitHub stars for Memori, 300 to 2,000 for Corsair in five weeks, 16K+ for Nebius, and more.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/results",
    locale: DEFAULT_LOCALE,
    keywords: [
      "GitHub stars growth results",
      "developer marketing results",
      "DevRel agency results",
      "open source growth case studies",
    ],
  });
}

/** Counts, ranks, and multiples ("12,000+", "#3", "~300"), not worded results. */
const isNumeric = (value: string) => /^[~#]?\d/.test(value);

const CARD =
  "rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10";

function numericMetrics(study: CaseStudyMeta) {
  return study.metrics.filter((metric) => isNumeric(metric.value));
}

export default function ResultsPage() {
  // Studies with hard numbers lead; the rest keep their case-study order.
  const studies = getAllCaseStudies(DEFAULT_LOCALE)
    .map((study, position) => ({ study, position }))
    .sort(
      (a, b) =>
        Number(numericMetrics(b.study).length > 0) -
          Number(numericMetrics(a.study).length > 0) ||
        a.position - b.position,
    )
    .map(({ study }) => study);

  const headline = studies.flatMap((study) => {
    const [first] = numericMetrics(study);
    return first ? [{ study, metric: first }] : [];
  });

  const updated = studies.reduce(
    (latest, study) => (study.date > latest ? study.date : latest),
    "",
  );

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: localizedUrl("/results", DEFAULT_LOCALE, baseUrl),
    dateModified: updated,
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: studies.map((study, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: localizedUrl(`/case-studies/${study.slug}`, DEFAULT_LOCALE, baseUrl),
        name: study.title,
        ...(numericMetrics(study).length
          ? {
              description: numericMetrics(study)
                .map((metric) => `${metric.value} ${metric.label}`)
                .join("; "),
            }
          : {}),
      })),
    },
  };

  return (
    <div style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Results", path: "/results" },
            ]),
          ),
        }}
      />

      <PaperPageHeader className="pb-4 pt-36 md:pb-8 md:pt-44">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <PaperEyebrow icon={<ChartLineUp weight="duotone" className="size-4" />}>
            Results
          </PaperEyebrow>
          <h1 className="mt-7 text-[40px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]">
            Developer growth <span style={{ color: PRINT }}>results</span>,
            with sources
          </h1>
          <p className="mt-6 max-w-[640px] text-[16px] leading-[1.6] text-[#141414]/60 sm:text-[18px]">
            Every number from our case studies in one place: GitHub stars,
            search rankings, and community reach. Each one links to its case
            study, and to a public source where one exists.
          </p>
          {updated ? (
            <p className="mt-4 text-[13px] font-medium text-[#141414]/45">
              Last updated <time dateTime={updated}>{updated}</time>
            </p>
          ) : null}
        </div>
      </PaperPageHeader>

      {/* Headline numbers: the lead result from each engagement */}
      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <IndexBar index={1} name="Headline numbers" />
          <ul
            role="list"
            className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
          >
            {headline.map(({ study, metric }, position) => (
              <li key={study.slug} className="min-w-0">
                <Link
                  href={`/case-studies/${study.slug}`}
                  className={`group flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-white ${CARD}`}
                >
                  <div>
                    <p
                      className="text-[40px] font-medium leading-none tracking-[-0.05em] tabular-nums"
                      style={position === 0 ? { color: PRINT } : undefined}
                    >
                      {metric.value}
                    </p>
                    <p className="mt-3 text-[14px] leading-snug text-[#141414]/60">
                      {metric.label}
                    </p>
                  </div>
                  <p className="flex items-center gap-1.5 text-[14px] font-medium">
                    {study.client}
                    <ArrowUpRight
                      weight="bold"
                      className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: PRINT }}
                    />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </PaperSection>

      {/* Every engagement: all metrics with sources, then the written outcomes */}
      <PaperSection tone="paper" className="!pt-0">
        <Container>
          <IndexBar index={2} name="By client" />
          <div className="mt-8 grid gap-2">
            {studies.map((study) => {
              const logo = getClientLogo(study.slug);
              return (
                <article
                  key={study.slug}
                  id={study.slug}
                  className={`grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${CARD}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] p-1.5 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]">
                          <Image
                            src={logo.icon}
                            alt=""
                            className="size-full rounded-md object-contain mix-blend-multiply"
                          />
                        </span>
                      ) : null}
                      <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#141414]/45">
                        {study.client}
                        {study.industry ? ` · ${study.industry}` : ""}
                      </p>
                    </div>
                    <h2 className="mt-4 text-[24px] font-medium leading-[1.2] tracking-[-0.03em] md:text-[28px]">
                      <Link
                        href={`/case-studies/${study.slug}`}
                        className="transition-colors hover:text-[#c2410c]"
                      >
                        {study.title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-[15px] leading-[1.6] text-[#141414]/60">
                      {study.summary}
                    </p>

                    {study.metrics.length ? (
                      <dl className="mt-6 border-b border-[#141414]/[0.12]">
                        {study.metrics.map((metric) => (
                          <div
                            key={metric.label}
                            className="grid grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] items-baseline gap-x-5 border-t border-[#141414]/[0.12] py-3"
                          >
                            <dt className="text-[20px] font-medium leading-none tracking-[-0.04em] tabular-nums">
                              {metric.value}
                            </dt>
                            <dd className="text-[14px] leading-snug text-[#141414]/65">
                              {metric.label}
                              {metric.evidence ? (
                                <>
                                  {" "}
                                  <a
                                    href={metric.evidence}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="whitespace-nowrap font-medium text-[#c2410c] underline decoration-[#c2410c]/30 underline-offset-[3px] hover:decoration-[#c2410c]"
                                  >
                                    Source
                                  </a>
                                </>
                              ) : null}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>

                  {study.outcomes.length ? (
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#141414]/45">
                        Outcomes
                      </h3>
                      <ul role="list" className="mt-4 space-y-3">
                        {study.outcomes.map((outcome) => (
                          <li
                            key={outcome}
                            className="flex gap-3 text-[15px] leading-[1.55] text-[#141414]/75"
                          >
                            <span
                              aria-hidden
                              className="mt-[0.6em] size-1.5 shrink-0 rounded-full"
                              style={{ background: PRINT }}
                            />
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </Container>
      </PaperSection>

      <PaperCta
        title="Want Results Like These?"
        description="Every number on this page started with one call. Share your goals and we will map what moves adoption for you."
      />
    </div>
  );
}
