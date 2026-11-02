import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  GithubLogo,
  RedditLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { NumericText } from "@/components/ui/num";
import { ResultsPanel } from "@/components/case-studies/results-panel";
import type { CaseStudyMeta } from "@/lib/case-studies";
import { CaseVisual, Rise } from "@/components/case-studies/case-visual";
import { PRINT } from "@/lib/paper";

/** Platforms worth showing large behind the outcomes, when named. */
const PLATFORMS: [RegExp, Icon][] = [
  [/github|star/i, GithubLogo],
  [/reddit|upvote/i, RedditLogo],
  [/youtube|video/i, YoutubeLogo],
];

const GLASS =
  "rounded-[6px] bg-white/60 shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80 backdrop-blur-xl";

/**
 * The case study hero as a bento: the work's cover on the left, the
 * headline in the middle with what changed beneath it, and the results and
 * services on the right.
 */
export function CaseHero({
  study,
  logo,
}: {
  study: CaseStudyMeta;
  logo?: StaticImageData;
}) {
  const quote = study.quotes[0];
  const outcomes = study.outcomes.slice(0, 3);
  const marks = PLATFORMS.filter(([test]) =>
    outcomes.some((outcome) => test.test(outcome)),
  ).map(([, mark]) => mark);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12 xl:grid-rows-[auto_auto]">
      {/* The artwork: drawn, not a screenshot */}
      <Rise index={0} className="xl:col-span-4 xl:row-span-2">
        <CaseVisual
          client={study.client}
          industry={study.industry}
          logo={logo}
          services={study.services}
        />
      </Rise>

      {/* The headline */}
      <Rise
        index={1}
        className={`relative flex flex-col p-6 md:p-8 xl:col-span-5 ${GLASS}`}
      >
        {study.category ? (
          <p
            className="text-[11.5px] font-medium uppercase tracking-[0.14em]"
            style={{ color: PRINT }}
          >
            {study.category}
          </p>
        ) : null}
        <h1 className="mt-4 text-[30px] font-medium leading-[1.08] tracking-[-0.05em] md:text-[40px]">
          <NumericText>{study.title}</NumericText>
        </h1>
        <p className="mt-4 text-[15.5px] leading-[1.6] text-[#141414]/60">
          <NumericText className="font-medium text-[#141414] underline decoration-[#f97316] decoration-[1.5px] underline-offset-[5px]">
            {study.description}
          </NumericText>
        </p>
        <a
          href="#case-story"
          aria-label="Read the story"
          className="group absolute right-4 top-4 flex size-9 items-center justify-center rounded-[6px] bg-[#141414] text-white transition-colors hover:bg-[#f97316]"
        >
          <ArrowDown
            weight="bold"
            className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
          />
        </a>
      </Rise>

      {/* The results, or the client's words */}
      <Rise index={2} className="xl:col-span-3">
        {study.metrics.length ? (
          <ResultsPanel
            client={study.client}
            metrics={study.metrics}
            logo={logo}
          />
        ) : quote ? (
          <figure className="flex h-full flex-col justify-between rounded-[6px] bg-[linear-gradient(155deg,#fb923c_0%,#f97316_45%,#ea580c_100%)] p-6 text-white shadow-[0_34px_60px_-30px_rgba(234,88,12,0.6)]">
            <blockquote className="line-clamp-6 text-[16px] font-medium leading-[1.5]">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              {quote.avatar ? (
                <span className="relative size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white/60">
                  <Image
                    src={quote.avatar}
                    alt={quote.author}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </span>
              ) : null}
              <span className="min-w-0 text-[12.5px] leading-snug">
                <span className="block font-semibold">{quote.author}</span>
                {quote.role ? (
                  <span className="block truncate text-white/80">
                    {quote.role}
                  </span>
                ) : null}
              </span>
            </figcaption>
          </figure>
        ) : null}
      </Rise>

      {/* What changed, as rows */}
      {outcomes.length ? (
        <Rise
          index={3}
          className={`relative isolate flex flex-col overflow-hidden p-2 xl:col-span-5 ${GLASS}`}
        >
          {/* The platforms the results came from, large and quiet behind */}
          {marks.map((Mark, i) => (
            <Mark
              key={i}
              aria-hidden
              weight="fill"
              className={`pointer-events-none absolute -z-10 text-[#141414]/[0.045] ${
                i === 0
                  ? "-bottom-10 -right-6 size-48 rotate-[-8deg]"
                  : "-bottom-8 right-48 size-28 rotate-[10deg]"
              }`}
            />
          ))}
          <p className="px-4 pb-1 pt-3 text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
            What changed
          </p>
          <ul className="flex flex-1 flex-col justify-around divide-y divide-[#141414]/[0.07]">
            {outcomes.map((outcome) => (
              <li
                key={outcome}
                className="flex items-start gap-3 px-4 py-3 text-[14px] leading-[1.5] text-[#141414]/80"
              >
                <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[#f97316]" />
                <span className="min-w-0 flex-1">
                  <NumericText>{outcome}</NumericText>
                </span>
              </li>
            ))}
          </ul>
        </Rise>
      ) : null}

      {/* What we did, and the way back to every study */}
      <Rise
        index={4}
        className={`flex flex-col justify-between gap-5 p-5 md:col-span-2 xl:col-span-3 ${GLASS}`}
      >
        <div>
          <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
            What we did
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {study.services.map((service) => (
              <li
                key={service}
                className="rounded-[6px] bg-[#f1ece4] px-2.5 py-1 text-[12px] font-medium text-[#141414]/75 shadow-[inset_0_1px_3px_rgba(20,20,20,0.08),inset_0_-1px_0_rgba(255,255,255,0.8)]"
              >
                {service}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/case-studies"
          className="group flex items-center justify-between border-t border-[#141414]/[0.08] pt-4 text-[13.5px] font-medium text-[#141414]"
        >
          All case studies
          <span className="flex size-8 items-center justify-center rounded-[6px] bg-[#141414] text-white transition-colors group-hover:bg-[#f97316]">
            <ArrowUpRight
              weight="bold"
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </Rise>
    </div>
  );
}
