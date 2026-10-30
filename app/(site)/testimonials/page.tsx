import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChartLineUp,
  Quotes,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import { Cursor, SelectionFrame } from "@/components/paper/paper-hero";
import {
  IndexBar,
  PaperCta,
  PaperSection,
} from "@/components/paper/paper-sections";
import { Container } from "@/components/home/ui";
import { homeTestimonials } from "@/data/home";
import { getAllCaseStudies, type CaseStudyMeta } from "@/lib/case-studies";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";
import { PAPER_SCOPE, PRINT } from "@/lib/paper";
import { breadcrumbJsonLd, ORGANIZATION_ID, pageMetadata } from "@/lib/seo";
import { baseUrl } from "@/lib/site";
import { COMPANY_MARKS, companyOf, titleOf } from "@/lib/testimonials";
import { cn } from "@/lib/utils";

const TITLE = "Client Testimonials: What Devtool Teams Say";
const DESCRIPTION =
  "What founders, DevRel leads, and marketers at Nebius, Jozu, Permit.io, Webcrumbs, and other devtool teams say about working with Studio1.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/testimonials",
    locale: DEFAULT_LOCALE,
    keywords: [
      "Studio1 reviews",
      "Studio1 testimonials",
      "DevRel agency reviews",
      "developer marketing agency reviews",
    ],
  });
}

const CARD = "rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10";
/** A quote's key line: ink text, each wrapped line underlined on its own. */
const MARK =
  "bg-transparent text-[#141414] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

/**
 * The orange pen curve of the About hero's CurvedUnderline, set as a
 * background instead of an SVG element: a key line runs over several lines,
 * and with box-decoration-break each line gets its own curve.
 */
function penUnderline(strokeWidth: number): CSSProperties {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 16" preserveAspectRatio="none"><path d="M4 5 C 80 15, 220 15, 296 4" fill="none" stroke="${PRINT}" stroke-width="${strokeWidth}" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0 100%",
    backgroundSize: "100% 0.34em",
    paddingBottom: "0.22em",
  };
}

/** The quote that opens the page, set large beside its case study's numbers. */
const FEATURED = "Dylan Bristot";
/** Faces in the header row on phones; the rest become a "+N". */
const MOBILE_FACES = 10;

/**
 * The line each quote is skimmed by, copied word for word from the quote in
 * data/home.tsx. A line that no longer matches simply isn't marked.
 */
const KEY_LINES: Record<string, string> = {
  "Jesse Williams":
    "Their contributions and work has helped us drive adoption and awareness with our audience.",
  "Dylan Bristot":
    "They're more than just contractors, they're an extension of our team.",
  "Paul Anthony Williams":
    "got the core value of our product quickly, and iterated well whenever we had feedback",
  "Sakshi Sen":
    "A few Reddit posts even went viral, bringing in solid traffic.",
  "Tanmay Sinha": "captured the core values of our product in the write up",
  "Nathan Telbert":
    "Their ability to create engaging content for developers has been a valuable addition to our educational content efforts.",
  "Saurav Jain":
    "write deeply technical articles that reaches to the right developer audiences",
  "Ivan Cordoba": "A key collaboration for Opire's growth.",
  "Gabriel L. Manor": "his work is astonishing",
  "Agita Jaunzeme": "Very fast, good-quality work, results!",
  "Marketa Cizmar": "The whole process was smooth!",
  "Julia Machado":
    "we wouldn't have achieved 3rd in our first launch ever and with almost zero preparation",
  "David Mython":
    "Arindam was responsive to feedback and helped us achieve those goals",
  "Cole Stark":
    "helped us to scale our Discord presence and overall community growth efforts",
  "Ferran Rodríguez":
    "one of the best experiences that I had collaborating with a technical writer",
  "Yi Wu":
    "they consistently produce insightful, in-depth technical content by truly understanding developers' needs",
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A case study's numbers that read as results ("300+", "16K+", "#3"). */
const numericMetrics = (study?: CaseStudyMeta) =>
  study?.metrics.filter((metric) => /^[#\d]/.test(metric.value)) ?? [];

/** Rough height in px of a wall card three to a row: chrome plus text lines. */
function estimateCardHeight(text: string, hasMetric: boolean) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  const lines = paragraphs.reduce(
    (sum, paragraph) => sum + Math.ceil(paragraph.length / 46),
    0,
  );
  return 170 + lines * 26 + (paragraphs.length - 1) * 12 + (hasMetric ? 56 : 0);
}

/**
 * Splits cards into columns of near-equal height: tallest first, each into
 * the shortest column so far. CSS multi-column can't split a card, so it left
 * one column far shorter.
 *
 * Each column is then ordered by height, alternating tallest-first and
 * shortest-first. Below xl the columns fold into a two-up grid of
 * equal-height rows, where neighbouring cards share a row: this keeps each
 * pair close in size, short meeting short at the seams between columns.
 */
function balancedColumns<T>(
  items: T[],
  count: number,
  height: (item: T) => number,
) {
  const columns = Array.from({ length: count }, () => ({
    entries: [] as { item: T; height: number }[],
    height: 0,
  }));
  const byHeight = items
    .map((item) => ({ item, height: height(item) }))
    .sort((a, b) => b.height - a.height);
  for (const entry of byHeight) {
    const shortest = columns.reduce((low, column) =>
      column.height < low.height ? column : low,
    );
    shortest.entries.push(entry);
    shortest.height += entry.height;
  }
  return columns.map((column, index) =>
    column.entries
      .sort((a, b) =>
        index % 2 === 0 ? b.height - a.height : a.height - b.height,
      )
      .map(({ item }) => item),
  );
}

/** A quote's paragraphs, with its key line marked. */
function QuoteText({
  text,
  keyLine,
  stroke = 2,
}: {
  text: string;
  keyLine?: string;
  /** Underline weight in px; heavier for the large featured quote. */
  stroke?: number;
}) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph, index) => {
      const at = keyLine ? paragraph.indexOf(keyLine) : -1;
      return (
        <p key={index} className={index ? "mt-3" : undefined}>
          {keyLine && at !== -1 ? (
            <>
              {paragraph.slice(0, at)}
              <mark className={MARK} style={penUnderline(stroke)}>
                {keyLine}
              </mark>
              {paragraph.slice(at + keyLine.length)}
            </>
          ) : (
            paragraph
          )}
        </p>
      );
    });
}

/** Round company logo, or the company's initial when there is none. */
function CompanyMark({ company, size }: { company: string; size: number }) {
  const mark = COMPANY_MARKS[company];
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-[#141414]/10",
        !mark && "bg-[#141414] text-[11px] font-semibold text-white",
      )}
      style={{ width: size, height: size }}
    >
      {mark ? (
        <Image
          src={mark}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        company.charAt(0)
      )}
    </span>
  );
}

function Author({
  name,
  role,
  avatar,
  large = false,
}: {
  name: string;
  role: string;
  avatar: string;
  large?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Image
        src={avatar}
        alt={`${name} portrait`}
        width={112}
        height={112}
        sizes={large ? "56px" : "40px"}
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white shadow-[0_6px_16px_-8px_rgba(20,20,20,0.5)]",
          large ? "size-14" : "size-10",
        )}
      />
      <span className="min-w-0">
        <cite
          className={cn(
            "flex items-center gap-1.5 font-medium not-italic",
            large ? "text-[17px]" : "text-[15px]",
          )}
        >
          {name}
          <SealCheck
            weight="fill"
            aria-label="Verified client"
            className="size-4 shrink-0 text-[#1d9bf0]"
          />
        </cite>
        <span className="block truncate text-[13px] text-[#141414]/55">
          {titleOf(role)}
        </span>
      </span>
    </span>
  );
}

export default function TestimonialsPage() {
  const studies = getAllCaseStudies(DEFAULT_LOCALE);

  const testimonials = homeTestimonials.map((person) => {
    const company = companyOf(person.role);
    const study = studies.find((entry) =>
      normalize(company).includes(normalize(entry.client)),
    );
    return { person, company, study };
  });
  const featured =
    testimonials.find(({ person }) => person.name === FEATURED) ??
    testimonials[0];
  const rest = testimonials.filter((entry) => entry !== featured);
  const wall = balancedColumns(rest, 3, ({ person, study }) =>
    estimateCardHeight(person.content, numericMetrics(study).length > 0),
  );
  const companyCount = new Set(testimonials.map(({ company }) => company)).size;
  const studyCount = new Set(
    testimonials.flatMap(({ study }) => (study ? [study.slug] : [])),
  ).size;

  // Plain page markup only: Google treats reviews a business publishes about
  // itself as self-serving, so no Review or AggregateRating schema here.
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: localizedUrl("/testimonials", DEFAULT_LOCALE, baseUrl),
    about: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };

  return (
    <div style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Testimonials", path: "/testimonials" },
            ]),
          ),
        }}
      />

      <PaperPageHeader className="pb-4 pt-36 md:pb-8 md:pt-44">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <PaperEyebrow icon={<Quotes weight="duotone" className="size-4" />}>
            Testimonials
          </PaperEyebrow>
          <h1 className="mt-7 text-[40px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]">
            What devtool teams <span style={{ color: PRINT }}>say</span>
          </h1>
          <p className="mt-6 max-w-[640px] text-[16px] leading-[1.6] text-[#141414]/60 sm:text-[18px]">
            {testimonials.length} founders, DevRel leads, and marketers on
            working with Studio1, in their own words. Where we wrote up the
            work, each quote links to its case study.
          </p>
          {/* Every voice on the page, as one row of faces (phones show the
              first few and a count, so the row fits the screen) */}
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <span className="flex -space-x-2.5" aria-hidden>
              {testimonials.map(({ person }, index) => (
                <Image
                  key={person.name}
                  src={person.avatar}
                  alt=""
                  width={72}
                  height={72}
                  sizes="36px"
                  className={cn(
                    "relative size-9 rounded-full object-cover ring-2 ring-[#f4efe7]",
                    index >= MOBILE_FACES && "max-sm:hidden",
                  )}
                  style={{ zIndex: testimonials.length - index }}
                />
              ))}
              {testimonials.length > MOBILE_FACES ? (
                <span className="relative flex size-9 items-center justify-center rounded-full bg-[#141414] text-[12px] font-medium text-[#f4efe7] ring-2 ring-[#f4efe7] sm:hidden">
                  +{testimonials.length - MOBILE_FACES}
                </span>
              ) : null}
            </span>
            <span className="text-[14px] font-medium tracking-[-0.01em] text-[#141414]/70">
              {companyCount} devtool teams
              <span className="mx-2 text-[#141414]/25">/</span>
              {studyCount} case studies
            </span>
          </div>
        </div>
      </PaperPageHeader>

      {/* 01: one voice, set large, beside the numbers from its case study */}
      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <IndexBar index={1} name="Featured" aside={featured.company} />
          <div className="mt-8 grid gap-2 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <figure className="relative flex flex-col">
              <SelectionFrame
                label="quote / featured"
                labelPosition="top-left"
                className="flex flex-1 flex-col justify-between gap-10 bg-white/60 p-6 md:p-10"
              >
                <blockquote className="text-[20px] font-medium leading-[1.4] tracking-[-0.035em] text-[#141414]/75 sm:text-[22px] lg:text-[25px]">
                  <Quotes
                    aria-hidden
                    weight="fill"
                    className="mb-5 size-9"
                    style={{ color: PRINT }}
                  />
                  <QuoteText
                    text={featured.person.content}
                    keyLine={KEY_LINES[featured.person.name]}
                    stroke={3}
                  />
                </blockquote>
                <figcaption className="flex flex-wrap items-center justify-between gap-4">
                  <Author {...featured.person} large />
                  <span className="flex items-center gap-2 text-[14px] font-medium">
                    <CompanyMark company={featured.company} size={24} />
                    {featured.company}
                  </span>
                </figcaption>
              </SelectionFrame>
              <Cursor className="absolute -bottom-7 right-[12%] hidden lg:block" />
            </figure>

            {featured.study ? (
              <aside
                className={cn("flex flex-col p-6 md:p-8", CARD)}
                aria-label={`${featured.study.client} case study`}
              >
                <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">
                  <ChartLineUp
                    weight="bold"
                    className="size-4"
                    style={{ color: PRINT }}
                  />
                  From the case study
                </p>
                <dl className="mt-6 divide-y divide-dashed divide-[#141414]/15">
                  {numericMetrics(featured.study)
                    .slice(0, 3)
                    .map((metric) => (
                      // Label first for screen readers, number on top on screen
                      <div
                        key={metric.label}
                        className="flex flex-col-reverse gap-2 py-4 first:pt-0"
                      >
                        <dt className="text-[14px] leading-snug text-[#141414]/60">
                          {metric.label}
                        </dt>
                        <dd className="text-[34px] font-medium leading-none tracking-[-0.045em] tabular-nums">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                </dl>
                {/* What the work covered, from the case study */}
                <ul
                  role="list"
                  aria-label="What we did"
                  className="mt-auto flex flex-wrap gap-1.5 pt-6"
                >
                  {featured.study.services.slice(0, 6).map((service) => (
                    <li
                      key={service}
                      className="rounded-full bg-[#f4efe7] px-3 py-1 text-[12.5px] font-medium text-[#141414]/70 ring-1 ring-inset ring-[#141414]/10"
                    >
                      {service}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/case-studies/${featured.study.slug}`}
                  className="group mt-6 inline-flex h-12 items-center justify-between gap-3 rounded-full bg-[#141414] py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-[#f4efe7]"
                >
                  Read the {featured.study.client} case study
                  <span
                    className="flex size-9 items-center justify-center rounded-full text-white"
                    style={{ background: PRINT }}
                  >
                    <ArrowUpRight
                      weight="bold"
                      className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </aside>
            ) : null}
          </div>
        </Container>
      </PaperSection>

      {/* 02: everyone else. Three balanced columns on wide screens whose
          last cards stretch so the wall ends on one line; below that the
          columns dissolve (display: contents) into an even grid. */}
      <PaperSection tone="paper" className="!pt-6 md:!pt-10">
        <Container>
          <IndexBar
            index={2}
            name="In their words"
            aside={`${rest.length} more voices`}
          />
          <div
            className={cn(
              "mt-8 grid gap-2 md:grid-cols-2 xl:grid-cols-3",
              // An odd card out in the two-up grid takes the full row
              rest.length % 2 === 1 &&
                "md:[&>ul:last-child>li:last-child]:col-span-2 xl:[&>ul:last-child>li:last-child]:col-span-1",
            )}
          >
            {wall.map((column, columnIndex) => (
              <ul
                key={columnIndex}
                role="list"
                className="contents xl:flex xl:flex-col xl:gap-2"
              >
                {column.map(({ person, company, study }) => {
                  const metric = numericMetrics(study)[0];
                  return (
                    <li key={person.name} className="flex xl:last:flex-1">
                      <figure
                        className={cn("flex flex-1 flex-col gap-6 p-6", CARD)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2.5 text-[14px] font-medium">
                            <CompanyMark company={company} size={24} />
                            <span className="truncate">{company}</span>
                          </span>
                          {study ? (
                            <Link
                              href={`/case-studies/${study.slug}`}
                              className="group inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f4efe7] px-2.5 py-1 text-[12.5px] font-medium ring-1 ring-inset ring-[#141414]/10 transition-colors hover:bg-white"
                            >
                              Case study
                              <ArrowUpRight
                                weight="bold"
                                className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                                style={{ color: PRINT }}
                              />
                            </Link>
                          ) : null}
                        </div>
                        <blockquote className="text-[15.5px] leading-[1.65] text-[#141414]/65">
                          <QuoteText
                            text={person.content}
                            keyLine={KEY_LINES[person.name]}
                          />
                        </blockquote>
                        {metric ? (
                          <p className="-mt-1 flex items-baseline gap-2 border-t border-dashed border-[#141414]/15 pt-4 text-[13px] leading-snug text-[#141414]/60">
                            <span
                              className="shrink-0 text-[17px] font-medium tracking-[-0.03em] tabular-nums"
                              style={{ color: PRINT }}
                            >
                              {metric.value}
                            </span>
                            {metric.label}
                          </p>
                        ) : null}
                        {/* Pinned to the bottom when the card stretches */}
                        <figcaption className="mt-auto">
                          <Author {...person} />
                        </figcaption>
                      </figure>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>

          {/* Where to go for the work behind the words */}
          <div className="mt-10 grid gap-2 md:grid-cols-2">
            {[
              {
                href: "/case-studies",
                label: "Case studies",
                text: "How the work was done, client by client.",
              },
              {
                href: "/results",
                label: "Results",
                text: "The numbers behind the work, with sources.",
              },
            ].map(({ href, label, text }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center justify-between gap-6 p-6 transition-colors hover:bg-white md:p-7",
                  CARD,
                )}
              >
                <span>
                  <span className="block text-[20px] font-medium tracking-[-0.03em]">
                    {label}
                  </span>
                  <span className="mt-1 block text-[14.5px] text-[#141414]/60">
                    {text}
                  </span>
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#141414] transition-colors group-hover:bg-[#141414] group-hover:text-[#f4efe7]">
                  <ArrowUpRight weight="bold" className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </PaperSection>

      <PaperCta
        index={3}
        title="Want Results Like These?"
        description="Technical content, DevRel, launches, and GitHub growth for developer tools."
      />
    </div>
  );
}
