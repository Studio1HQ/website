"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Num } from "@/components/ui/num";
import { cn } from "@/lib/utils";

export type CaseStudyResultStat = {
  value: string;
  label: string;
};

export type CaseStudyResultData = {
  company: string;
  category: string;
  href: string;
  heroValue: string;
  heroLabel: string;
  proof: string;
  stats?: CaseStudyResultStat[];
};

type CaseStudyResultProps = {
  study: CaseStudyResultData;
  variant?: "featured" | "compact";
  density?: "default" | "dense";
  className?: string;
};

const cardSurface =
  "s1-glass-card group relative overflow-hidden rounded-[24px] transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none";

export function CaseStudyResult({
  study,
  variant = "compact",
  density = "default",
  className,
}: CaseStudyResultProps) {
  const isDense = density === "dense";

  if (variant === "featured") {
    return (
      <Link
        href={study.href}
        className={cn("flex flex-col md:flex-row md:items-stretch", cardSurface, className)}
      >

        <div
          className={cn(
            "relative z-[2] flex flex-col justify-between border-b border-[var(--home-line)] md:w-[42%] md:border-b-0 md:border-r",
            isDense
              ? "gap-4 p-5 md:p-6 lg:p-7"
              : "gap-6 p-6 md:p-8 lg:p-10",
          )}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--home-ink-soft)]">
              {study.category}
            </p>
            <p className="mt-3 text-[22px] font-medium tracking-[-0.03em] text-[var(--home-ink)] md:text-[26px]">
              {study.company}
            </p>
          </div>

          <div>
            <p
              className={cn(
                "font-numeric font-medium tabular-nums leading-none tracking-[-0.04em] text-primary",
                isDense
                  ? "text-4xl md:text-5xl lg:text-6xl"
                  : "text-5xl md:text-6xl lg:text-7xl",
              )}
            >
              <Num>{study.heroValue}</Num>
            </p>
            <p className="mt-3 max-w-[16rem] text-sm leading-snug text-[var(--home-ink-soft)]">
              {study.heroLabel}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "relative z-[2] flex flex-1 flex-col justify-between",
            isDense
              ? "gap-5 p-5 md:p-6 lg:p-7"
              : "gap-8 p-6 md:p-8 lg:p-10",
          )}
        >
          <div>
            <p
              className={cn(
                "max-w-xl font-normal leading-snug tracking-[-0.025em] text-[var(--home-ink)]",
                isDense
                  ? "text-lg md:text-xl lg:text-[1.4rem]"
                  : "text-xl md:text-2xl lg:text-[1.65rem] lg:leading-snug",
              )}
            >
              {study.proof}
            </p>

            {study.stats && study.stats.length > 0 ? (
              <dl
                className={cn(
                  "grid grid-cols-3 gap-4 border-t border-[var(--home-line)]",
                  isDense ? "mt-5 pt-5" : "mt-8 pt-6",
                )}
              >
                {study.stats.map((stat, index) => (
                  <div
                    key={`${stat.value}-${stat.label}-${index}`}
                    className="min-w-0"
                  >
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-numeric text-lg font-semibold tabular-nums leading-none md:text-xl">
                      <Num>{stat.value}</Num>
                    </dd>
                    <span className="mt-1.5 block text-[11px] leading-snug text-[var(--home-ink-soft)] md:text-xs">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--home-ink-soft)] transition-colors group-hover:text-primary">
            Read case study
            <ArrowRight
              weight="bold"
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={study.href}
      className={cn("flex h-full flex-col p-6 sm:p-7", cardSurface, className)}
    >

      <div className="relative z-[1] mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-medium tracking-[-0.02em] text-[var(--home-ink)]">
            {study.company}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--home-ink-soft)]">
            {study.category}
          </p>
        </div>
        <ArrowRight
          weight="bold"
          className="mt-1 size-4 shrink-0 text-[var(--home-ink-soft)] transition-all group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>

      <div className="relative z-[1] mt-auto">
        <p className="font-numeric text-4xl font-medium tabular-nums leading-none tracking-tight text-primary sm:text-[2.75rem]">
          <Num>{study.heroValue}</Num>
        </p>
        <p className="mt-2 text-sm text-[var(--home-ink-soft)]">{study.heroLabel}</p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--home-ink-soft)]">
          {study.proof}
        </p>
      </div>
    </Link>
  );
}
