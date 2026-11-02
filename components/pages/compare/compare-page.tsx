"use client";

import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Lightning,
  Minus,
  Scales,
} from "@phosphor-icons/react";
import type { Comparison } from "@/data/comparisons";
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
import { PRINT, SelectionFrame } from "@/components/paper/paper-hero";
import { BrandMark } from "./brand-mark";

/** Faint orange wash that marks Studio1's column. */
const OURS = "bg-[rgba(249,115,22,0.05)]";

function formatChecked(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Rows answered "Yes..." or "Not.../No..." get a mark; the rest are prose. */
function verdictOf(text: string) {
  if (/^yes\b/i.test(text)) return "yes";
  if (/^(not|no)\b/i.test(text)) return "no";
  return null;
}

function Cell({ text }: { text: string }) {
  const verdict = verdictOf(text);
  return (
    <span className="flex gap-2.5">
      {verdict ? (
        <span
          aria-hidden
          className={cn(
            "mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full",
            verdict === "yes"
              ? "bg-[rgba(249,115,22,0.14)]"
              : "bg-[#141414]/[0.07]",
          )}
          style={verdict === "yes" ? { color: PRINT } : undefined}
        >
          {verdict === "yes" ? (
            <Check weight="bold" className="size-2.5" />
          ) : (
            <Minus weight="bold" className="size-2.5 text-[#141414]/45" />
          )}
        </span>
      ) : null}
      <span>{text}</span>
    </span>
  );
}

function ChooseList({
  name,
  items,
  ours = false,
}: {
  name: string;
  items: string[];
  ours?: boolean;
}) {
  return (
    <div
      className={cn("p-6 md:p-8", CELL)}
      style={ours ? { boxShadow: `inset 0 0 0 1.5px ${PRINT}` } : undefined}
    >
      <div className="flex items-center gap-3">
        <BrandMark name={name} ours={ours} size={36} />
        <h3 className="text-[22px] font-medium tracking-[-0.03em]">
          Choose {name} if
        </h3>
      </div>
      <ul role="list" className={cn("mt-6 divide-y", LINE)}>
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 py-4 text-[15px] leading-[1.6] first:pt-0 last:pb-0"
          >
            <Check
              weight="bold"
              className="mt-1 size-4 shrink-0"
              style={{ color: ours ? PRINT : undefined }}
            />
            <span className={MUTED}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/*
 * Below md the table restacks: each row becomes a block with its two answers
 * labelled from data-label. Explicit roles keep it a table for screen readers
 * once the display changes.
 */
const STACK_CELL =
  "max-md:block max-md:px-0 max-md:py-1.5 max-md:before:mb-1 max-md:before:block max-md:before:text-[11.5px] max-md:before:font-medium max-md:before:uppercase max-md:before:tracking-[0.1em] max-md:before:text-[#141414]/45 max-md:before:content-[attr(data-label)]";

export function ComparePage({ comparison }: { comparison: Comparison }) {
  const { competitor } = comparison;
  const checked = formatChecked(comparison.checked);

  return (
    <div className="overflow-x-clip">
      <PaperPageHeader className="pb-6 pt-36 md:pb-10 md:pt-44">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6">
          <PaperEyebrow icon={<Scales weight="duotone" className="size-4" />}>
            Comparison, checked {checked}
          </PaperEyebrow>

          {/* The two companies, as tiles on the design canvas */}
          <div className="mt-12 flex items-center gap-6 sm:gap-10" aria-hidden>
            <SelectionFrame
              label="studio1"
              labelPosition="top-left"
              className="p-1.5"
            >
              <BrandMark name="Studio1" ours size={76} />
            </SelectionFrame>
            <span className="flex size-11 items-center justify-center rounded-full bg-white text-[13px] font-medium uppercase tracking-[0.12em] text-[#141414]/60 ring-1 ring-inset ring-[#141414]/10">
              vs
            </span>
            <SelectionFrame label={competitor.toLowerCase()} className="p-1.5">
              <BrandMark name={competitor} size={76} />
            </SelectionFrame>
          </div>

          <h1 className="mt-12 text-[40px] font-medium leading-[1.06] tracking-[-0.05em] sm:text-[60px] lg:text-[72px]">
            Studio1 vs <Accent>{competitor}</Accent>
          </h1>

          {/* Answer first, for readers and for AI answers alike */}
          <div className="mt-10 w-full max-w-[860px] rounded-[6px] bg-white/80 p-6 text-left ring-1 ring-inset ring-[#141414]/10 md:p-8">
            <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">
              <Lightning
                weight="fill"
                className="size-4"
                style={{ color: PRINT }}
              />
              The short answer
            </p>
            <p className="mt-4 text-[17px] leading-[1.65] text-[#141414]/75 sm:text-[18px]">
              {comparison.shortAnswer}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                ["#side-by-side", "Side by side"],
                ["#choose", "Which to choose"],
                ["#sources", "Sources"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f4efe7] px-3.5 text-[13px] font-medium ring-1 ring-inset ring-[#141414]/10 transition-colors hover:bg-white"
                >
                  {label}
                  <ArrowDown
                    weight="bold"
                    className="size-3 transition-transform group-hover:translate-y-0.5"
                    style={{ color: PRINT }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </PaperPageHeader>

      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <div id="side-by-side" className="scroll-mt-28">
            <IndexBar
              index={1}
              name="Side by side"
              aside={`Checked ${checked}`}
            />
          </div>
          <SectionHead
            title={
              <>
                Services, team, and <Accent>pricing</Accent>
              </>
            }
            description={`${competitor}'s column comes from its own website, checked ${checked}. Where a service isn't listed there, we say so rather than guess.`}
          />
          <div
            className={cn("mt-10 overflow-x-auto rounded-[6px]", CELL)}
            role="region"
            aria-label={`Studio1 vs ${competitor} comparison table`}
            tabIndex={0}
          >
            <table
              role="table"
              className="w-full border-collapse text-left text-[15px] max-md:block md:min-w-[640px]"
            >
              <thead role="rowgroup" className="max-md:hidden">
                <tr role="row" className={cn("border-b", LINE)}>
                  <th
                    role="columnheader"
                    scope="col"
                    className="w-[24%] px-5 py-5 font-medium"
                  >
                    <span className="sr-only">Feature</span>
                  </th>
                  <th
                    role="columnheader"
                    scope="col"
                    className={cn("w-[38%] px-5 py-5 font-medium", OURS)}
                  >
                    <span className="flex items-center gap-2.5">
                      <BrandMark name="Studio1" ours size={26} />
                      Studio1
                    </span>
                  </th>
                  <th
                    role="columnheader"
                    scope="col"
                    className="w-[38%] px-5 py-5 font-medium"
                  >
                    <span className="flex items-center gap-2.5">
                      <BrandMark name={competitor} size={26} />
                      {competitor}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="max-md:block">
                {comparison.rows.map((row) => (
                  <tr
                    key={row.label}
                    role="row"
                    className={cn(
                      "border-b transition-colors last:border-b-0 hover:bg-white/60 max-md:block max-md:px-5 max-md:py-4",
                      LINE,
                    )}
                  >
                    <th
                      role="rowheader"
                      scope="row"
                      className="px-5 py-4 align-top text-[14.5px] font-medium max-md:block max-md:px-0 max-md:pb-2 max-md:pt-0 max-md:text-[16px]"
                    >
                      {row.label}
                    </th>
                    <td
                      role="cell"
                      data-label="Studio1"
                      className={cn(
                        "px-5 py-4 align-top leading-[1.55] md:bg-[rgba(249,115,22,0.05)]",
                        STACK_CELL,
                      )}
                    >
                      <Cell text={row.studio1} />
                    </td>
                    <td
                      role="cell"
                      data-label={competitor}
                      className={cn(
                        "px-5 py-4 align-top leading-[1.55]",
                        MUTED,
                        STACK_CELL,
                      )}
                    >
                      <Cell text={row.competitor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            id="choose"
            className={cn("mt-10 scroll-mt-28 md:grid-cols-2", GRID)}
          >
            <ChooseList name="Studio1" items={comparison.chooseStudio1} ours />
            <ChooseList name={competitor} items={comparison.chooseCompetitor} />
          </div>

          <div
            id="sources"
            className={cn(
              "mt-10 grid scroll-mt-28 gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-8",
              CELL,
            )}
          >
            <div>
              <p className="text-[15px] font-medium">Sources</p>
              <p className={cn("mt-2 text-[14px] leading-[1.6]", MUTED)}>
                We&apos;re Studio1, so read this with that in mind. Facts about{" "}
                {competitor} come only from its own pages, checked {checked}. If
                something has changed, email{" "}
                <a
                  href="mailto:contact@studio1hq.com"
                  className="font-medium text-[#141414] underline decoration-[#141414]/25 underline-offset-4 hover:decoration-[#f97316]"
                >
                  contact@studio1hq.com
                </a>{" "}
                and we&apos;ll update it.
              </p>
            </div>
            <ul
              role="list"
              className="flex flex-wrap content-start gap-2 md:justify-end"
            >
              {comparison.sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-[var(--p-fg)] px-3.5 text-[13px] font-medium transition-colors hover:bg-[var(--p-fg)] hover:text-[var(--p-bg)]"
                  >
                    {source.label}
                    <ArrowUpRight weight="bold" className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </PaperSection>

      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={2}
            subtitle={`Common questions about Studio1 and ${competitor}.`}
            items={comparison.faqs}
          />
        </Container>
      </PaperSection>

      <PaperCta
        index={3}
        title="Want to See If We're the Right Fit?"
        description="Tell us what you're building, and we'll say honestly whether Studio1 or another team is the better choice."
      />
    </div>
  );
}
