import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChartLineUp,
  Check,
  GithubLogo,
  Megaphone,
  Package,
  SealCheck,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import { SelectionFrame } from "@/components/paper/paper-hero";
import {
  Accent,
  IndexBar,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { Container } from "@/components/home/ui";
import { getClientLogo } from "@/components/case-studies/client-logos";
import {
  getAllCaseStudies,
  type CaseStudyMeta,
  type CaseStudyMetric,
} from "@/lib/case-studies";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";
import { GRAIN, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { breadcrumbJsonLd, ORGANIZATION_ID, pageMetadata } from "@/lib/seo";
import { baseUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

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

const CARD = "rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10";
/** The paper sections' hover lift, for cards that are links. */
const LIFT =
  "transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_40px_-28px_rgba(20,20,20,0.45)] motion-reduce:transform-none";
/** Makes a card's one link cover the whole card; other links sit above it. */
const STRETCH = "after:absolute after:inset-0";
const KICKER =
  "text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/45";

/** What a number measures, read off its label. */
const KINDS = {
  stars: { name: "GitHub stars", icon: GithubLogo },
  reach: { name: "Reach", icon: Megaphone },
  rank: { name: "Rankings", icon: TrendUp },
  shipped: { name: "Shipped", icon: Package },
};

function kindOf(metric: CaseStudyMetric): keyof typeof KINDS {
  if (/github stars/i.test(metric.label)) return "stars";
  if (/impressions|reach/i.test(metric.label)) return "reach";
  if (/google|rank|trending/i.test(metric.label)) return "rank";
  return "shipped";
}

/**
 * The starting point of a star count, when its label gives one:
 * "GitHub stars, up from about 300 in five weeks" -> "~300".
 */
function startOf(metric: CaseStudyMetric) {
  if (kindOf(metric) !== "stars") return null;
  const from = metric.label.match(/up from (about |~)?([\d,]+)/i);
  if (from) return `${from[1] ? "~" : ""}${from[2]}`;
  return /from launch/i.test(metric.label) ? "0" : null;
}

/** "12,000+" -> 12000, "16K+" -> 16000. */
function countOf(value: string) {
  const match = value.match(/^~?([\d,.]+)\s*([KM])?/i);
  if (!match) return 0;
  const scale = { K: 1e3, M: 1e6 }[match[2]?.toUpperCase() ?? ""] ?? 1;
  return parseFloat(match[1].replace(/,/g, "")) * scale;
}

function numericMetrics(study: CaseStudyMeta) {
  return study.metrics.filter((metric) => isNumeric(metric.value));
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Client logo, pressed into a small paper tile. */
function ClientMark({
  slug,
  size = 40,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const logo = getClientLogo(slug);
  if (!logo) return null;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]",
        className,
      )}
      style={{ width: size, height: size, padding: Math.round(size * 0.15) }}
    >
      <Image
        src={logo.icon}
        alt=""
        sizes={`${size}px`}
        className="size-full rounded-[4px] object-contain mix-blend-multiply"
      />
    </span>
  );
}

function SourceLink({
  metric,
  className,
}: {
  metric: CaseStudyMetric;
  className?: string;
}) {
  if (!metric.evidence) return null;
  return (
    <a
      href={metric.evidence}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "relative z-10 inline-flex h-7 w-fit items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-medium text-[#141414] ring-1 ring-inset ring-[#141414]/10 transition-colors hover:ring-[#f97316]",
        className,
      )}
    >
      <SealCheck
        aria-hidden
        weight="fill"
        className="size-3.5"
        style={{ color: PRINT }}
      />
      Source
      <span className="sr-only">
        {" "}
        for {metric.value} {metric.label}
      </span>
      <ArrowUpRight aria-hidden weight="bold" className="size-3" />
    </a>
  );
}

function KindTag({
  metric,
  dark = false,
}: {
  metric: CaseStudyMetric;
  dark?: boolean;
}) {
  const { name, icon: Icon } = KINDS[kindOf(metric)];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset",
        dark
          ? "text-[#f4efe7]/75 ring-[#f4efe7]/15"
          : "bg-[#f4efe7] text-[#141414]/65 ring-[#141414]/[0.08]",
      )}
    >
      <Icon aria-hidden weight="bold" className="size-3.5" />
      {name}
    </span>
  );
}

/**
 * "~300 -> 2K+": the start of a star count, faint, before the result. Pass the
 * line height with the size in className: tailwind-merge drops a base leading
 * once a text size follows it.
 */
function MetricValue({
  metric,
  className,
  startClassName,
}: {
  metric: CaseStudyMetric;
  className?: string;
  startClassName?: string;
}) {
  const start = startOf(metric);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5">
      {start ? (
        <span
          className={cn(
            "flex items-center gap-2 font-medium tracking-[-0.04em]",
            startClassName,
          )}
        >
          <span className="sr-only">From </span>
          {start}
          <ArrowRight aria-hidden weight="bold" className="size-[0.7em]" />
          <span className="sr-only"> to </span>
        </span>
      ) : null}
      <span className={cn("font-medium tracking-[-0.055em]", className)}>
        {metric.value}
      </span>
    </span>
  );
}

/** One line of outcome, ticked in orange. */
function Outcomes({ items }: { items: string[] }) {
  return (
    <ul role="list" className="space-y-3">
      {items.map((outcome) => (
        <li
          key={outcome}
          className="flex gap-3 text-[15px] leading-[1.55] text-[#141414]/75"
        >
          <span
            aria-hidden
            className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[rgba(249,115,22,0.14)]"
            style={{ color: PRINT }}
          >
            <Check weight="bold" className="size-2.5" />
          </span>
          {outcome}
        </li>
      ))}
    </ul>
  );
}

function StudyHeader({
  study,
  size = 44,
}: {
  study: CaseStudyMeta;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <ClientMark slug={study.slug} size={size} />
      <div className="min-w-0">
        <p className="text-[15px] font-medium tracking-[-0.01em]">
          {study.client}
        </p>
        {study.industry ? (
          <p className="truncate text-[13px] text-[#141414]/50">
            {study.industry}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CaseStudyLink({ study }: { study: CaseStudyMeta }) {
  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="group inline-flex h-10 w-fit items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-4 text-[14px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7]"
    >
      Read the case study
      <span className="sr-only">: {study.client}</span>
      <ArrowUpRight
        aria-hidden
        weight="bold"
        className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** An engagement with hard numbers: the numbers as tiles, then outcomes. */
function NumbersStudy({ study }: { study: CaseStudyMeta }) {
  const lead = numericMetrics(study)[0];
  return (
    <article
      id={study.slug}
      className={cn(
        "grid scroll-mt-28 gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12",
        CARD,
      )}
    >
      <div className="flex min-w-0 flex-col">
        <StudyHeader study={study} />
        <h3 className="mt-6 text-[24px] font-medium leading-[1.2] tracking-[-0.035em] md:text-[28px]">
          <Link
            href={`/case-studies/${study.slug}`}
            className="transition-colors hover:text-[#c2410c]"
          >
            {study.title}
          </Link>
        </h3>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#141414]/60">
          {study.summary}
        </p>
        {study.services.length ? (
          <ul role="list" className="mt-5 flex flex-wrap gap-1.5">
            {study.services.map((service) => (
              <li
                key={service}
                className="rounded-full bg-[#f4efe7] px-2.5 py-1 text-[12px] font-medium text-[#141414]/60 ring-1 ring-inset ring-[#141414]/[0.08]"
              >
                {service}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="min-w-0 lg:row-span-2">
        <ul role="list" className="grid gap-2 sm:grid-cols-3">
          {study.metrics.map((metric) => {
            const numeric = isNumeric(metric.value);
            return (
              <li
                key={metric.label}
                className="flex flex-col rounded-[6px] bg-[#f4efe7]/70 p-4 ring-1 ring-inset ring-[#141414]/[0.06]"
              >
                {/* the lead number in orange, as on its headline card */}
                <MetricValue
                  metric={metric}
                  className={cn(
                    numeric
                      ? "text-[32px] leading-none"
                      : "text-[19px] leading-[1.15]",
                    metric === lead && "text-[#f97316]",
                  )}
                  startClassName="text-[16px] text-[#141414]/40"
                />
                <p className="mt-2.5 text-[13px] leading-snug text-[#141414]/60">
                  {metric.label}
                </p>
                {metric.evidence ? (
                  <div className="mt-auto pt-4">
                    <SourceLink metric={metric} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className={cn("mt-8", KICKER)}>Outcomes</p>
        <div className="mt-4">
          <Outcomes items={study.outcomes} />
        </div>
      </div>

      {/* After the outcomes on phones; under the summary on desktop */}
      <div className="lg:col-start-1 lg:row-start-2 lg:self-end">
        <CaseStudyLink study={study} />
      </div>
    </article>
  );
}

/** An engagement measured in outcomes rather than a single number. */
function OutcomesStudy({ study }: { study: CaseStudyMeta }) {
  return (
    <article
      id={study.slug}
      className={cn("flex scroll-mt-28 flex-col p-6 md:p-8", CARD)}
    >
      <StudyHeader study={study} size={40} />
      <h3 className="mt-5 text-[21px] font-medium leading-[1.25] tracking-[-0.03em]">
        <Link
          href={`/case-studies/${study.slug}`}
          className="transition-colors hover:text-[#c2410c]"
        >
          {study.title}
        </Link>
      </h3>
      {study.metrics.length ? (
        <dl className="mt-5 divide-y divide-[#141414]/[0.08] rounded-[6px] bg-[#f4efe7]/70 px-4 ring-1 ring-inset ring-[#141414]/[0.06]">
          {study.metrics.map((metric) => (
            <div
              key={metric.label}
              className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[136px_minmax(0,1fr)] sm:items-baseline"
            >
              <dt className="text-[15px] font-medium tracking-[-0.02em]">
                {metric.value}
              </dt>
              <dd className="text-[13px] leading-snug text-[#141414]/60">
                {metric.label}
                {metric.evidence ? (
                  <SourceLink metric={metric} className="ml-2 align-middle" />
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-6">
        <Outcomes items={study.outcomes} />
      </div>
      <div className="mt-auto pt-8">
        <CaseStudyLink study={study} />
      </div>
    </article>
  );
}

export default function ResultsPage() {
  // Studies with hard numbers lead; the rest keep their case-study order.
  const studies = getAllCaseStudies(DEFAULT_LOCALE)
    .map((study, position) => ({ study, position }))
    .sort(
      (a, b) =>
        Number(numericMetrics(b.study).length > 0) -
          Number(numericMetrics(a.study).length > 0) || a.position - b.position,
    )
    .map(({ study }) => study);

  const withNumbers = studies.filter((study) => numericMetrics(study).length);
  const inOutcomes = studies.filter((study) => !numericMetrics(study).length);

  const headline = withNumbers.map((study) => ({
    study,
    metric: numericMetrics(study)[0],
  }));
  const [lead, ...rest] = headline;

  const updated = studies.reduce(
    (latest, study) => (study.date > latest ? study.date : latest),
    "",
  );

  // Totals for the header, added up from the numbers below
  const starCounts = studies.flatMap((study) =>
    numericMetrics(study).filter((metric) => kindOf(metric) === "stars"),
  );
  const totalStars = starCounts.reduce(
    (sum, metric) => sum + countOf(metric.value),
    0,
  );
  const hardNumbers = withNumbers.reduce(
    (sum, study) => sum + numericMetrics(study).length,
    0,
  );
  const tallies = [
    ...(totalStars
      ? [
          {
            value: `${totalStars.toLocaleString("en-US")}+`,
            label: `GitHub stars across ${starCounts.length} open-source projects`,
          },
        ]
      : []),
    {
      value: String(hardNumbers),
      label: `hard numbers from ${withNumbers.length} engagements`,
    },
    {
      value: String(studies.length),
      label: "client engagements, each written up in full",
    },
  ];

  // Fill the headline grid's last row: four across, the lead card two wide
  const lastSpan = cn(
    rest.length % 2 === 1 && "sm:col-span-2",
    {
      0: rest.length % 2 === 1 && "lg:col-span-1",
      1: "lg:col-span-4",
      2: "lg:col-span-3",
      3: "lg:col-span-2",
    }[(rest.length + 2) % 4],
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
        url: localizedUrl(
          `/case-studies/${study.slug}`,
          DEFAULT_LOCALE,
          baseUrl,
        ),
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

      <PaperPageHeader className="pb-6 pt-36 md:pb-10 md:pt-44">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <PaperEyebrow
            icon={<ChartLineUp weight="duotone" className="size-4" />}
          >
            {updated ? (
              <span>
                Results, updated{" "}
                <time dateTime={updated}>{formatDate(updated)}</time>
              </span>
            ) : (
              "Results"
            )}
          </PaperEyebrow>
          <h1 className="mt-7 text-[40px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]">
            Developer growth <Accent>results</Accent>, with sources
          </h1>
          <p className="mt-6 max-w-[640px] text-[16px] leading-[1.6] text-[#141414]/60 sm:text-[18px]">
            Every number from our case studies in one place: GitHub stars,
            search rankings, and community reach. Each one links to its case
            study, and to a public source where one exists.
          </p>

          {/* The page in three numbers, added up from the cards below */}
          <ul
            role="list"
            className={cn(
              "mt-12 grid w-full max-w-[980px] text-left max-sm:divide-y sm:divide-x divide-[#141414]/10",
              CARD,
              tallies.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
            )}
          >
            {tallies.map((tally, index) => (
              <li key={tally.label} className="flex flex-col p-6 md:p-7">
                <span className="flex items-end justify-between gap-4">
                  <span
                    className="text-[40px] font-medium leading-none tracking-[-0.055em] md:text-[46px]"
                    style={index === 0 ? { color: PRINT } : undefined}
                  >
                    {tally.value}
                  </span>
                  {index === tallies.length - 1 ? (
                    <span aria-hidden className="mb-1 flex -space-x-2">
                      {studies.slice(0, 6).map((study) => (
                        <ClientMark
                          key={study.slug}
                          slug={study.slug}
                          size={28}
                          className="ring-2 ring-white"
                        />
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className="mt-3 text-[14px] leading-snug text-[#141414]/60">
                  {tally.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PaperPageHeader>

      {/* 01: the lead number from each engagement that has one */}
      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <IndexBar
            index={1}
            name="Headline numbers"
            aside={`${headline.length} engagements`}
          />
          <SectionHead
            title={
              <>
                The lead number from <Accent>each engagement</Accent>
              </>
            }
            description="One number per client: the one its case study leads with. Open any card for the full story and the work behind it."
          />
          <ul
            role="list"
            className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
          >
            {lead ? (
              <li className="min-w-0 sm:col-span-2">
                <SelectionFrame
                  label="lead result"
                  labelPosition="top-left"
                  className="h-full"
                >
                  <div className="group relative isolate flex h-full min-h-[300px] flex-col overflow-hidden bg-[#141414] p-6 text-[#f4efe7] md:p-8">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] mix-blend-screen"
                      style={{ backgroundImage: GRAIN }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-[15px] font-medium">
                        <ClientMark slug={lead.study.slug} size={32} />
                        {lead.study.client}
                      </span>
                      <KindTag metric={lead.metric} dark />
                    </div>
                    <p className="mt-auto pt-12">
                      <MetricValue
                        metric={lead.metric}
                        className="text-[64px] leading-none text-[#f97316] sm:text-[88px]"
                        startClassName="text-[28px] text-[#f4efe7]/40 sm:text-[36px]"
                      />
                    </p>
                    <p className="mt-4 max-w-[420px] text-[16px] leading-snug text-[#f4efe7]/70">
                      {lead.metric.label}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#f4efe7]/15 pt-5">
                      <Link
                        href={`/case-studies/${lead.study.slug}`}
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 text-[14px] font-medium",
                          STRETCH,
                        )}
                      >
                        {lead.study.title}
                        <ArrowUpRight
                          aria-hidden
                          weight="bold"
                          className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          style={{ color: PRINT }}
                        />
                      </Link>
                      <SourceLink metric={lead.metric} />
                    </div>
                  </div>
                </SelectionFrame>
              </li>
            ) : null}
            {rest.map(({ study, metric }, index) => (
              <li
                key={study.slug}
                className={cn(
                  "group relative flex min-w-0 flex-col p-6 sm:min-h-[260px]",
                  CARD,
                  LIFT,
                  index === rest.length - 1 && lastSpan,
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5 text-[14px] font-medium">
                    <ClientMark slug={study.slug} size={28} />
                    <span className="truncate">{study.client}</span>
                  </span>
                  <KindTag metric={metric} />
                </div>
                <p className="mt-auto pt-8 sm:pt-10">
                  <MetricValue
                    metric={metric}
                    className="text-[44px] leading-none"
                    startClassName="text-[20px] text-[#141414]/35"
                  />
                </p>
                <p className="mt-3 text-[14px] leading-snug text-[#141414]/60 sm:min-h-[2.75em]">
                  {metric.label}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#141414]/[0.08] pt-4">
                  <Link
                    href={`/case-studies/${study.slug}`}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 text-[13px] font-medium",
                      STRETCH,
                    )}
                  >
                    Case study
                    <span className="sr-only">: {study.client}</span>
                    <ArrowUpRight
                      aria-hidden
                      weight="bold"
                      className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: PRINT }}
                    />
                  </Link>
                  <SourceLink metric={metric} />
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </PaperSection>

      {/* 02: every engagement, numbers first, then the ones told in outcomes */}
      <PaperSection tone="paper" className="!pt-0">
        <Container>
          <IndexBar
            index={2}
            name="By client"
            aside={`${studies.length} engagements`}
          />
          <SectionHead
            title={
              <>
                Every engagement, <Accent>number by number</Accent>
              </>
            }
            description="The numbers each case study reports, with a public source where one exists, and what changed for the team."
          />

          <nav aria-label="Jump to a client" className="mt-10">
            <ul
              role="list"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {studies.map((study) => (
                <li key={study.slug} className="shrink-0">
                  <a
                    href={`#${study.slug}`}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-white/80 pl-1.5 pr-3.5 text-[13px] font-medium ring-1 ring-inset ring-[#141414]/10 transition-colors hover:bg-white hover:ring-[#141414]/25"
                  >
                    <ClientMark
                      slug={study.slug}
                      size={24}
                      className="rounded-full"
                    />
                    {study.client}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 grid gap-2">
            {withNumbers.map((study) => (
              <NumbersStudy key={study.slug} study={study} />
            ))}
          </div>

          {inOutcomes.length ? (
            <>
              <div className="mt-16 grid gap-3 border-t border-[#141414]/[0.12] pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-12">
                <h3 className="text-[26px] font-medium leading-[1.2] tracking-[-0.04em] md:text-[32px]">
                  Measured in <Accent>outcomes</Accent>
                </h3>
                <p className="max-w-[440px] text-[15px] leading-[1.6] text-[#141414]/60 md:justify-self-end">
                  Docs, DevRel, and SEO work where the result is what changed
                  for developers, not a single number.
                </p>
              </div>
              <div className="mt-8 grid gap-2 md:grid-cols-2">
                {inOutcomes.map((study) => (
                  <OutcomesStudy key={study.slug} study={study} />
                ))}
              </div>
            </>
          ) : null}
        </Container>
      </PaperSection>

      <PaperCta
        index={3}
        title="Want Results Like These?"
        description="Every number on this page started with one call. Share your goals and we will map what moves adoption for you."
      />
    </div>
  );
}
