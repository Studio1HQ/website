"use client";

import { ArrowUpRight, CaretDown, ListNumbers } from "@phosphor-icons/react";
import type { FAQItem } from "@/components/landing/faq";
import type { Agency } from "@/data/agencies";
import { cn } from "@/lib/utils";
import { Container } from "@/components/home/ui";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import {
  Accent,
  CELL,
  GRID,
  IndexBar,
  LINE,
  MUTED,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { PRINT } from "@/components/paper/paper-hero";
import { BrandMark, brandId } from "./brand-mark";

type AgencyListPageProps = {
  studio1: Agency;
  agencies: Agency[];
  generalists: Agency[];
  listSources: string[];
  checked: string;
  faqs: FAQItem[];
};

function formatChecked(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Pricing with a figure in it ("From $9K a month") is published. */
const isPublicPrice = (pricing: string) => /\d/.test(pricing);

const domainOf = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");

/** Small tag on Studio1's entries: it's our list, so say so where it shows. */
function OursTag() {
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white"
      style={{ background: PRINT }}
    >
      That&apos;s us
    </span>
  );
}

function AgencyCard({
  agency,
  number,
  ours = false,
}: {
  agency: Agency;
  number: number;
  ours?: boolean;
}) {
  const priced = isPublicPrice(agency.pricing);

  return (
    <article
      id={brandId(agency.name)}
      className={cn("flex scroll-mt-28 flex-col p-6 md:p-8", CELL)}
      style={ours ? { boxShadow: `inset 0 0 0 1.5px ${PRINT}` } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark name={agency.name} ours={ours} size={48} />
          <div className="min-w-0">
            <p className={cn("text-[12px] font-medium tabular-nums", MUTED)}>
              No. {String(number).padStart(2, "0")}
            </p>
            <h3 className="flex flex-wrap items-center gap-2 text-[24px] font-medium leading-tight tracking-[-0.035em]">
              {agency.name}
              {ours ? <OursTag /> : null}
            </h3>
          </div>
        </div>
        <a
          href={agency.url}
          target={ours ? undefined : "_blank"}
          rel={ours ? undefined : "noopener noreferrer nofollow"}
          aria-label={`${agency.name} website`}
          className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#f4efe7] px-3.5 text-[13px] font-medium ring-1 ring-inset ring-[#141414]/10 transition-colors hover:bg-white max-sm:hidden"
        >
          {domainOf(agency.url)}
          <ArrowUpRight
            weight="bold"
            className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
            style={{ color: PRINT }}
          />
        </a>
      </div>

      <p className="mt-5 text-[16px] leading-[1.6] text-[#141414]/75">
        {agency.focus}
      </p>

      <ul
        role="list"
        aria-label="Services"
        className="mb-6 mt-5 flex flex-wrap gap-1.5"
      >
        {agency.services.map((service) => (
          <li
            key={service}
            className="rounded-full bg-[#f4efe7] px-3 py-1 text-[12.5px] font-medium text-[#141414]/70 ring-1 ring-inset ring-[#141414]/10"
          >
            {service}
          </li>
        ))}
      </ul>

      {/* Pinned to the bottom so the facts line up across a row of cards */}
      <dl
        className={cn(
          "mt-auto grid gap-3 border-t border-dashed pt-5 text-[14px]",
          LINE,
        )}
      >
        {(
          [
            ["Best for", agency.bestFor],
            ["Clients", agency.clients],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[88px_1fr]">
            <dt className="font-medium">{label}</dt>
            <dd className={MUTED}>{value}</dd>
          </div>
        ))}
        <div className="grid gap-1 sm:grid-cols-[88px_1fr]">
          <dt className="font-medium">Pricing</dt>
          <dd
            className={cn(
              "font-medium",
              priced ? "text-[#141414]" : "text-[#141414]/45",
            )}
          >
            {agency.pricing}
          </dd>
        </div>
      </dl>

      <a
        href={agency.url}
        target={ours ? undefined : "_blank"}
        rel={ours ? undefined : "noopener noreferrer nofollow"}
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium sm:hidden"
      >
        {domainOf(agency.url)}
        <ArrowUpRight
          weight="bold"
          className="size-3"
          style={{ color: PRINT }}
        />
      </a>
    </article>
  );
}

/*
 * Below md the table restacks: each row becomes a block with its answers
 * labelled from data-label. Explicit roles keep it a table for screen readers
 * once the display changes.
 */
const STACK_CELL =
  "max-md:block max-md:px-0 max-md:py-1.5 max-md:before:mb-1 max-md:before:block max-md:before:text-[11.5px] max-md:before:font-medium max-md:before:uppercase max-md:before:tracking-[0.1em] max-md:before:text-[#141414]/45 max-md:before:content-[attr(data-label)]";

export function AgencyListPage({
  studio1,
  agencies,
  generalists,
  listSources,
  checked,
  faqs,
}: AgencyListPageProps) {
  const checkedLabel = formatChecked(checked);
  const ranked = [studio1, ...agencies];

  return (
    <div className="overflow-x-clip">
      <PaperPageHeader className="pb-6 pt-36 md:pb-10 md:pt-44">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <PaperEyebrow
            icon={<ListNumbers weight="duotone" className="size-4" />}
          >
            Guide, updated {checkedLabel}
          </PaperEyebrow>
          <h1 className="mt-7 max-w-[980px] text-[40px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[60px] lg:text-[72px]">
            Best developer marketing <Accent>agencies</Accent>
          </h1>
          <p className="mt-6 max-w-[700px] text-[16px] leading-[1.6] text-[#141414]/60 sm:text-[18px]">
            {/* One string: as JSX text the space after the count was lost
                in compilation ("8agencies") */}
            {`${ranked.length} agencies that market developer tools: what each one does, who it fits, named clients, and public pricing. We're Studio1, so we list ourselves first. Every other entry comes from the agency's own website, checked ${checkedLabel}.`}
          </p>

          {/* Jump straight to any agency */}
          <nav aria-label="Agencies on this page" className="mt-10">
            {/* Narrow enough to wrap the eight chips as two even rows */}
            <ul
              role="list"
              className="mx-auto flex max-w-[600px] flex-wrap justify-center gap-2"
            >
              {ranked.map((agency, index) => (
                <li key={agency.name}>
                  <a
                    href={`#${brandId(agency.name)}`}
                    className="group inline-flex h-11 items-center gap-2.5 rounded-full bg-white/80 py-1 pl-1 pr-4 text-[14px] font-medium ring-1 ring-inset ring-[#141414]/10 transition-colors hover:bg-white"
                  >
                    <BrandMark
                      name={agency.name}
                      ours={index === 0}
                      size={34}
                      className="rounded-full"
                    />
                    {agency.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </PaperPageHeader>

      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <IndexBar
            index={1}
            name="At a glance"
            aside={`${ranked.filter((agency) => isPublicPrice(agency.pricing)).length} of ${ranked.length} publish prices`}
          />
          <div
            className={cn("mt-8 overflow-x-auto rounded-[6px]", CELL)}
            role="region"
            aria-label="Developer marketing agencies at a glance"
            tabIndex={0}
          >
            <table
              role="table"
              className="w-full border-collapse text-left text-[15px] max-md:block md:min-w-[640px]"
            >
              <thead role="rowgroup" className="max-md:hidden">
                <tr role="row" className={cn("border-b", LINE)}>
                  {["Agency", "Best for", "Pricing"].map((label) => (
                    <th
                      key={label}
                      role="columnheader"
                      scope="col"
                      className="px-5 py-4 text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/55"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody role="rowgroup" className="max-md:block">
                {ranked.map((agency, index) => {
                  const ours = index === 0;
                  return (
                    <tr
                      key={agency.name}
                      role="row"
                      className={cn(
                        "border-b transition-colors last:border-b-0 hover:bg-white/60 max-md:block max-md:px-5 max-md:py-4",
                        LINE,
                        ours && "bg-[rgba(249,115,22,0.05)]",
                      )}
                    >
                      <th
                        role="rowheader"
                        scope="row"
                        className="px-5 py-4 align-top font-medium max-md:block max-md:px-0 max-md:pb-2 max-md:pt-0"
                      >
                        <a
                          href={`#${brandId(agency.name)}`}
                          className="group inline-flex items-center gap-3"
                        >
                          <span
                            className={cn(
                              "w-5 text-[12px] tabular-nums",
                              MUTED,
                            )}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <BrandMark name={agency.name} ours={ours} size={28} />
                          <span className="whitespace-nowrap underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-[#f97316]">
                            {agency.name}
                          </span>
                          {ours ? <OursTag /> : null}
                        </a>
                      </th>
                      <td
                        role="cell"
                        data-label="Best for"
                        className={cn("px-5 py-4 align-top", MUTED, STACK_CELL)}
                      >
                        {agency.bestFor}
                      </td>
                      <td
                        role="cell"
                        data-label="Pricing"
                        className={cn(
                          "px-5 py-4 align-top font-medium",
                          isPublicPrice(agency.pricing)
                            ? "text-[#141414]"
                            : "text-[#141414]/45",
                          STACK_CELL,
                        )}
                      >
                        {agency.pricing}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Container>
      </PaperSection>

      <PaperSection tone="paper" className="!pt-6 md:!pt-10">
        <Container>
          <IndexBar index={2} name="The agencies" />
          <SectionHead
            title={
              <>
                Each agency, in <Accent>detail</Accent>
              </>
            }
            description="Services, fit, clients, and pricing as each agency describes them. Where pricing isn't published, we say so."
          />
          <div className={cn("mt-10 lg:grid-cols-2", GRID)}>
            {ranked.map((agency, index) => (
              <AgencyCard
                key={agency.name}
                agency={agency}
                number={index + 1}
                ours={index === 0}
              />
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-2 border-t border-dashed border-[#141414]/15 pt-10 md:flex-row md:items-end md:justify-between">
            <h3 className="text-[26px] font-medium tracking-[-0.035em]">
              Also on many <Accent>lists</Accent>
            </h3>
            <p className={cn("max-w-[560px] text-[15px] leading-[1.6]", MUTED)}>
              These two appear often, but describe themselves as content and SEO
              agencies for B2B SaaS in general rather than developer
              specialists.
            </p>
          </div>
          <div className={cn("mt-8 lg:grid-cols-2", GRID)}>
            {generalists.map((agency, index) => (
              <AgencyCard
                key={agency.name}
                agency={agency}
                number={ranked.length + index + 1}
              />
            ))}
          </div>

          <div className={cn("mt-10 p-6 md:p-8", CELL)}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-10">
              <p className="text-[20px] font-medium tracking-[-0.03em]">
                How we picked
              </p>
              <p className={cn("text-[14.5px] leading-[1.65]", MUTED)}>
                We counted how often each agency is named across{" "}
                {listSources.length} published lists of developer marketing and
                technical content agencies, and kept the developer-focused ones
                named most often. Most of those lists are written by an agency
                that ranks itself first, and so is this one. If a detail is out
                of date, email{" "}
                <a
                  href="mailto:contact@studio1hq.com"
                  className="font-medium text-[#141414] underline decoration-[#141414]/25 underline-offset-4 hover:decoration-[#f97316]"
                >
                  contact@studio1hq.com
                </a>{" "}
                and we&apos;ll fix it.
              </p>
            </div>
            <details className={cn("group mt-6 border-t pt-5", LINE)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                The {listSources.length} lists we counted
                <CaretDown
                  weight="bold"
                  className="size-4 transition-transform group-open:rotate-180"
                  style={{ color: PRINT }}
                />
              </summary>
              <ol className="mt-5 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                {listSources.map((href, index) => (
                  <li key={href} className="flex min-w-0 gap-2">
                    <span className={cn("w-5 shrink-0 tabular-nums", MUTED)}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="truncate text-[#141414]/70 underline decoration-[#141414]/20 underline-offset-4 transition-colors hover:text-[#141414] hover:decoration-[#f97316]"
                    >
                      {href.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </Container>
      </PaperSection>

      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={3}
            subtitle="Common questions about hiring a developer marketing agency."
            items={faqs}
          />
        </Container>
      </PaperSection>

      <PaperCta
        index={4}
        title="Want to See If We're the Right Fit?"
        description="Tell us what you're building, and we'll say honestly whether Studio1 or another agency is the better choice."
      />
    </div>
  );
}
