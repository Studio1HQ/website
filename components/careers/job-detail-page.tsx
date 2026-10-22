"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  Clock,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { NightHeader } from "@/components/shared/night-header";
import type { JobDetail } from "@/lib/careers";
import {
  CAREERS_CONTACT_EMAIL,
  getJobApplicationMailto,
} from "@/lib/careers-mailto";
import { cn } from "@/lib/utils";

type JobDetailPageProps = {
  job: JobDetail;
  children: React.ReactNode;
};

function formatPostedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function JobDetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string; weight?: "duotone" | "bold" }>;
}) {
  return (
    <div className="border-b border-[var(--home-line)] py-3 last:border-b-0">
      <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--home-ink-soft)]">
        <Icon className="size-3.5 shrink-0" weight="duotone" />
        {label}
      </dt>
      <dd className="mt-1.5 text-[15px] font-medium text-[var(--home-ink)]">{value}</dd>
    </div>
  );
}

function getJobAvailability(status: string) {
  const normalizedStatus = status.toLowerCase();
  const isOpeningSoon = normalizedStatus.includes("soon");
  const isClosed = normalizedStatus.includes("closed");

  return {
    isClosed,
    isOpeningSoon,
    isUnavailable: isOpeningSoon || isClosed,
    buttonLabel: isClosed ? "Closed" : "Coming soon",
  };
}

function getStatusBadgeClassName(status: string) {
  const { isClosed, isOpeningSoon } = getJobAvailability(status);

  if (isClosed) {
    return "[&>svg]:text-red-400";
  }

  if (isOpeningSoon) {
    return "[&>svg]:text-amber-300";
  }

  return "[&>svg]:text-[#fdba74]";
}

function ApplyButton({
  className,
  href,
  label = "Apply",
  disabled = false,
}: {
  className?: string;
  href: string;
  label?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-[13px] font-medium uppercase tracking-[0.06em]";

  if (disabled) {
    return (
      <span
        aria-disabled
        className={cn(base, "cursor-not-allowed border border-[var(--home-line)] text-[var(--home-ink-soft)]", className)}
      >
        {label}
      </span>
    );
  }

  return (
    <a href={href} className={cn(base, "s1-glass-btn group text-white", className)}>
      {label}
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" weight="bold" />
    </a>
  );
}

export function JobDetailPage({ job, children }: JobDetailPageProps) {
  const applyMailto = getJobApplicationMailto(job);
  const openingsLabel =
    job.openings === 1 ? "1 opening" : `${job.openings} openings`;
  const { isUnavailable, buttonLabel } = getJobAvailability(job.status);

  return (
    <section className="overflow-x-clip bg-[var(--home-cream)] pb-24 text-[var(--home-ink)]">
      <NightHeader className="pb-16 pt-32 md:pb-20 md:pt-36">
        {/* Breadcrumb */}
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 text-[13px] text-white/55 sm:px-6 lg:px-8">
          <Link href="/careers" className="transition-colors hover:text-white">
            Careers
          </Link>
          <CaretRight className="size-3.5 shrink-0" weight="bold" />
          <span className="truncate font-medium text-white/85">{job.title}</span>
        </div>

        {/* Title band */}
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="text-[34px] font-medium leading-[1.08] tracking-[-0.045em] text-white sm:text-[46px] lg:text-[56px]">
              {job.title}
            </h1>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-white/60 sm:text-[15px]">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-white/85 backdrop-blur-md",
                  getStatusBadgeClassName(job.status),
                )}
              >
                <CheckCircle className="size-3.5" weight="fill" />
                {job.status}
              </span>
              <span aria-hidden className="text-white/20">
                |
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-[#fdba74]" weight="duotone" />
                {job.location}
              </span>
              <span aria-hidden className="text-white/20">
                |
              </span>
              <span>{job.type}</span>
              <span aria-hidden className="text-white/20">
                |
              </span>
              <span>{job.department}</span>
            </p>
          </div>
        </div>
      </NightHeader>

      {/* Two-column body */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12 lg:px-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article
          className={cn(
            "min-w-0",
            "prose prose-neutral max-w-none dark:prose-invert",
            "prose-headings:font-medium prose-headings:tracking-[-0.03em] prose-headings:text-[var(--home-ink)]",
            "prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-[24px] prose-h2:border-b prose-h2:border-[var(--home-line)] prose-h2:pb-3",
            "prose-p:text-[16px] prose-p:leading-[1.75] prose-p:text-[var(--home-ink-soft)] prose-li:text-[16px] prose-li:leading-[1.7] prose-li:text-[var(--home-ink-soft)] prose-strong:text-[var(--home-ink)] prose-a:text-primary",
          )}
        >
          {children}
        </article>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="s1-glass-card overflow-hidden rounded-[24px]">
            <div className="border-b border-[var(--home-line)] px-6 py-4">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--home-ink)]">
                Job details
              </h2>
            </div>

            <dl className="px-6">
              <JobDetailRow
                label="Status"
                value={job.status}
                icon={CheckCircle}
              />
              <JobDetailRow
                label="Openings"
                value={openingsLabel}
                icon={UsersThree}
              />
              <JobDetailRow
                label="Location"
                value={job.location}
                icon={MapPin}
              />
              <JobDetailRow label="Time type" value={job.type} icon={Clock} />
              <JobDetailRow
                label="Posted on"
                value={formatPostedDate(job.postedDate)}
                icon={CalendarBlank}
              />
            </dl>

            <div className="border-t border-[var(--home-line)] p-6">
              <ApplyButton
                className="w-full"
                href={applyMailto}
                label={isUnavailable ? buttonLabel : "Apply"}
                disabled={isUnavailable}
              />
              {!isUnavailable ? (
                <div className="mt-4 hidden rounded-2xl border border-[var(--home-line)] p-4 text-[12px] leading-relaxed text-[var(--home-ink-soft)] lg:block">
                  <p>
                    Or send your application to{" "}
                    <a
                      href={applyMailto}
                      className="font-medium text-[var(--home-ink)] underline-offset-4 hover:underline"
                    >
                      {CAREERS_CONTACT_EMAIL}
                    </a>
                    .
                  </p>
                  <p className="mt-2">
                    Subject:{" "}
                    <span className="font-medium text-[var(--home-ink)]">
                      Application: {job.applySubject}
                    </span>
                  </p>
                  <p className="mt-3 font-medium text-[var(--home-ink)]">
                    Include:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    <li>Resume or profile link</li>
                    <li>Relevant past work or portfolio links, if available</li>
                    <li>A short 1-week plan if you join Studio1</li>
                    <li>Why this role fits you</li>
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
