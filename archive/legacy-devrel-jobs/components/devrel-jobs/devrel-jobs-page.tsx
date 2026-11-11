"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  Buildings,
  CalendarBlank,
  CaretDown,
  CurrencyDollar,
  GlobeHemisphereWest,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  RocketLaunch,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { NightEyebrow, NightHeader } from "@/components/shared/night-header";
import { Input } from "@/components/ui/input";
import { staggerChildren, itemVariants } from "@/lib/animations";
import {
  DEVREL_JOB_SUBMIT_URL,
  getDevRelJobCategories,
  getDevRelJobLevels,
  getDevRelJobLocations,
  getDevRelJobTypes,
  isNewDevRelJob,
  type DevRelJob,
  type DevRelJobCategory,
  type DevRelJobWorkplace,
} from "@/lib/devrel-jobs";
import {
} from "@/lib/shadows";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

/** Glass pill on the night header. */
const capsuleClassName =
  "inline-flex items-center gap-2 rounded-full border border-white/20 bg-[linear-gradient(160deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] px-4 py-2 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-14px_rgba(0,0,0,0.8)] backdrop-blur-xl";

/** Glass control surface for the toolbar (search + filters). */
const controlClassName =
  "border border-[var(--home-line)] bg-white/75 text-[var(--home-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const JOBS_PER_PAGE = 12;

const heroAnimation = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut" as const,
    },
  },
};

const workplaceIcons: Record<
  DevRelJobWorkplace,
  React.ComponentType<{ className?: string; weight?: "duotone" }>
> = {
  Remote: GlobeHemisphereWest,
  Hybrid: ArrowsClockwise,
  "On-site": Buildings,
  Unspecified: MapPin,
};

type FilterDropdownProps = {
  id: string;
  label: string;
  value: string | null;
  options: string[];
  allLabel: string;
  onChange: (value: string | null) => void;
  className?: string;
};

function FilterDropdown({
  id,
  label,
  value,
  options,
  allLabel,
  onChange,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className={cn("relative min-w-0", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-3 rounded-full px-4 text-[13px] font-medium transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0",
          controlClassName,
        )}
      >
        <span className="truncate">{value ?? allLabel}</span>
        <CaretDown
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-[var(--home-ink-soft)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={label}
          className="s1-glass-card s1-glass-raised absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full min-w-48 overflow-hidden rounded-2xl p-1.5"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className={cn(
              "flex w-full rounded-xl px-3 py-2 text-left text-[13px] text-[var(--home-ink)] transition-colors hover:bg-primary/10 hover:text-primary",
              value === null && "bg-primary/10 text-primary",
            )}
          >
            {allLabel}
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full rounded-xl px-3 py-2 text-left text-[13px] text-[var(--home-ink)] transition-colors hover:bg-primary/10 hover:text-primary",
                value === option && "bg-primary/10 text-primary",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatPostedDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function JobCard({ job, locale }: { job: DevRelJob; locale: string }) {
  const t = useTranslations("DevRelJobsPage");
  const WorkplaceIcon = workplaceIcons[job.workplace];
  const isNew = isNewDevRelJob(job);
  const [hasLogoError, setHasLogoError] = useState(false);

  return (
    <article
      className={cn(
        "s1-glass-card group relative flex h-full flex-col overflow-hidden rounded-[24px]",
        "transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none",
      )}
    >

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${job.title} at ${job.company}`}
        className="relative z-[1] flex flex-1 flex-col rounded-[24px] p-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2 ring-1 ring-black/5 dark:ring-white/10"
          >
            {job.logo && !hasLogoError ? (
              <span className="relative block size-7">
                <Image
                  src={job.logo}
                  alt=""
                  fill
                  sizes="28px"
                  unoptimized
                  className="object-contain"
                  onError={() => setHasLogoError(true)}
                />
              </span>
            ) : (
              <span className="font-primary text-lg font-semibold text-primary">
                {job.company.charAt(0)}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--home-ink)]">
              {job.company}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--home-ink-soft)]">
              <MapPin className="size-3.5 shrink-0" weight="duotone" />
              <span className="truncate">{job.location}</span>
            </p>
          </div>
          <ArrowSquareOut
            className="size-4.5 shrink-0 text-[var(--home-ink-soft)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none"
            weight="duotone"
          />
        </div>

        <h3 className="mt-5 text-[19px] font-medium leading-snug tracking-[-0.025em] text-[var(--home-ink)] transition-colors group-hover:text-primary">
          {job.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium text-[var(--home-ink)] border border-[var(--home-line)] bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_14px_-8px_rgba(90,30,0,0.4)] backdrop-blur-md dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            {job.category}
          </span>
          {isNew ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-primary border border-[var(--home-line)] bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_14px_-8px_rgba(90,30,0,0.4)] backdrop-blur-md dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              {t("newBadge")}
            </span>
          ) : null}
        </div>

        <div className="mt-auto">
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--home-line)] pt-4 text-xs font-medium text-[var(--home-ink-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <WorkplaceIcon
                className="size-4 shrink-0 text-primary"
                weight="duotone"
              />
              {job.workplace}
            </span>
            {job.salary ? (
              <span className="inline-flex items-center gap-1.5">
                <CurrencyDollar
                  className="size-4 shrink-0 text-primary"
                  weight="duotone"
                />
                {job.salary}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank
                className="size-4 shrink-0 text-primary"
                weight="duotone"
              />
              {formatPostedDate(job.postedDate, locale)}
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}

type DevRelJobsPageProps = {
  jobs: DevRelJob[];
};

export function DevRelJobsPage({ jobs }: DevRelJobsPageProps) {
  const t = useTranslations("DevRelJobsPage");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<DevRelJobCategory | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const categories = useMemo(() => getDevRelJobCategories(jobs), [jobs]);
  const types = useMemo(() => getDevRelJobTypes(jobs), [jobs]);
  const locations = useMemo(() => getDevRelJobLocations(jobs), [jobs]);
  const levels = useMemo(() => getDevRelJobLevels(jobs), [jobs]);
  const companyCount = useMemo(
    () => new Set(jobs.map((job) => job.company)).size,
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobs.filter((job) => {
      if (selectedCategory && job.category !== selectedCategory) return false;
      if (selectedType && job.type !== selectedType) return false;
      if (selectedLocation && job.location !== selectedLocation) return false;
      if (selectedLevel && job.level !== selectedLevel) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        job.title,
        job.company,
        job.location,
        job.category,
        ...job.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [jobs, query, selectedCategory, selectedType, selectedLocation, selectedLevel]);

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedCategory !== null ||
    selectedType !== null ||
    selectedLocation !== null ||
    selectedLevel !== null;

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE,
  );

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory(null);
    setSelectedType(null);
    setSelectedLocation(null);
    setSelectedLevel(null);
    setPage(1);
  };

  const gridKey = `${query}-${selectedCategory ?? "all"}-${selectedType ?? "all"}-${selectedLocation ?? "all"}-${selectedLevel ?? "all"}-${currentPage}`;

  return (
    <section className="overflow-x-clip bg-[var(--home-cream)] text-[var(--home-ink)]">
      {/* Hero */}
      <NightHeader className="pb-20 pt-40 md:pb-28 md:pt-48">
        <section className="relative flex flex-col px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <motion.div variants={itemVariants} className="flex justify-center">
              <NightEyebrow icon={<RocketLaunch weight="duotone" className="size-4 text-[#fdba74]" />}>
                {t("badge")}
              </NightEyebrow>
            </motion.div>

            <motion.h1
              className="mt-7 text-[40px] font-medium leading-[1.04] tracking-[-0.05em] text-white sm:text-[60px] md:text-[72px]"
              variants={itemVariants}
            >
              {t("titlePrefix")}{" "}
              <span className="s1-accent-text">{t("titleHighlight")}</span>
            </motion.h1>

            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
              variants={itemVariants}
            >
              <span className={capsuleClassName}>
                <Megaphone
                  weight="duotone"
                  className="size-4 shrink-0 text-[#fdba74]"
                />
                {t("statsRoles", { count: jobs.length })}
              </span>
              <span className={capsuleClassName}>
                <Buildings
                  weight="duotone"
                  className="size-4 shrink-0 text-[#fdba74]"
                />
                {t("statsCompanies", { count: companyCount })}
              </span>
              <span className={capsuleClassName}>
                <ArrowsClockwise
                  weight="duotone"
                  className="size-4 shrink-0 text-[#fdba74]"
                />
                {t("statsUpdated")}
              </span>
            </motion.div>
          </motion.div>
        </section>
      </NightHeader>

      <div className="relative mx-auto max-w-7xl">
        {/* Jobs */}
        <motion.section
          id="devrel-jobs"
          className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-28 pt-12 sm:px-6 md:pt-16 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={staggerChildren}
        >
          {/* Sticky toolbar */}
          <motion.div
            variants={itemVariants}
            className="sticky top-24 z-30 mx-auto mb-8 w-full max-w-4xl"
          >
            <div className="relative mx-auto w-full">
              <div className="relative mx-auto min-w-0 w-full max-w-xl">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-4 top-1/2 z-[1] size-4 -translate-y-1/2 text-[var(--home-ink-soft)]"
                  weight="duotone"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchLabel")}
                  className={cn("h-11 rounded-full pl-10 pr-10 text-[14px] placeholder:text-[var(--home-ink-soft)] focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0", controlClassName)}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("clearFilters")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--home-ink-soft)] transition-colors hover:text-[var(--home-ink)]"
                  >
                    <XCircle className="size-4" weight="fill" />
                  </button>
                ) : null}
              </div>

              <div className="mx-auto mt-3 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <FilterDropdown
                  id="job-category"
                  label={t("categoryFilter")}
                  value={selectedCategory}
                  options={categories}
                  allLabel={t("allCategories")}
                  onChange={(value) =>
                    {
                      setSelectedCategory(value as DevRelJobCategory | null);
                      setPage(1);
                    }
                  }
                  className="w-full"
                />

                <FilterDropdown
                  id="job-type"
                  label={t("typeFilter")}
                  value={selectedType}
                  options={types}
                  allLabel={t("allTypes")}
                  onChange={(value) => {
                    setSelectedType(value);
                    setPage(1);
                  }}
                  className="w-full"
                />
                <FilterDropdown
                  id="job-location"
                  label={t("locationFilter")}
                  value={selectedLocation}
                  options={locations}
                  allLabel={t("allLocations")}
                  onChange={(value) => {
                    setSelectedLocation(value);
                    setPage(1);
                  }}
                  className="w-full"
                />
                <FilterDropdown
                  id="job-level"
                  label={t("levelFilter")}
                  value={selectedLevel}
                  options={levels}
                  allLabel={t("allLevels")}
                  onChange={(value) => {
                    setSelectedLevel(value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mx-auto mt-2 h-8 rounded-full px-3 text-xs font-medium text-[var(--home-ink-soft)] transition-colors hover:text-primary"
                >
                  {t("clearFilters")}
                </button>
              ) : null}
            </div>
          </motion.div>

          <motion.p
            variants={itemVariants}
            aria-live="polite"
            className="mb-5 text-sm font-medium text-[var(--home-ink-soft)]"
          >
            {t("showing", {
              shown: filteredJobs.length,
              total: jobs.length,
            })}
          </motion.p>

          {filteredJobs.length > 0 ? (
            <>
              <motion.div
                key={gridKey}
                className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="visible"
                variants={staggerChildren}
              >
                {paginatedJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    className="min-w-0"
                    variants={itemVariants}
                  >
                    <JobCard job={job} locale={locale} />
                  </motion.div>
                ))}
              </motion.div>
              {totalPages > 1 ? (
                <nav
                  aria-label={t("pagination")}
                  className="mt-8 flex items-center justify-center gap-3"
                >
                  <button
                    type="button"
                    className="s1-glass-card inline-flex h-10 items-center rounded-full px-5 text-[13px] font-medium text-[var(--home-ink)] transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("previousPage")}
                  </button>
                  <span className="text-sm font-medium text-[var(--home-ink-soft)]">
                    {t("pageOf", { page: currentPage, total: totalPages })}
                  </span>
                  <button
                    type="button"
                    className="s1-glass-card inline-flex h-10 items-center rounded-full px-5 text-[13px] font-medium text-[var(--home-ink)] transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    {t("nextPage")}
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <MagnifyingGlass
                className="size-10 text-[var(--home-ink-soft)]"
                weight="duotone"
              />
              <div>
                <p className="text-[20px] font-medium tracking-[-0.025em] text-[var(--home-ink)]">
                  {t("emptyTitle")}
                </p>
                <p className="mt-1 text-sm text-[var(--home-ink-soft)]">
                  {t("emptyDescription")}
                </p>
              </div>
              {hasActiveFilters ? (
                <button type="button" onClick={clearFilters} className="s1-glass-card inline-flex h-10 items-center rounded-full px-5 text-[13px] font-medium text-[var(--home-ink)] transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40">
                  {t("clearFilters")}
                </button>
              ) : null}
            </div>
          )}

          {/* Submit CTA */}
          <motion.div
            variants={itemVariants}
            className={cn(
              "s1-glass-card relative mt-16 overflow-hidden rounded-[28px] p-8 text-center sm:p-12",
            )}
          >
            <div className="relative z-[1] mx-auto flex max-w-2xl flex-col items-center">
              <h2 className="text-[28px] font-medium tracking-[-0.04em] text-[var(--home-ink)] sm:text-[36px]">
                {t("submitTitle")}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[var(--home-ink-soft)] sm:text-[16px]">
                {t("submitDescription")}
              </p>
              <a
                href={DEVREL_JOB_SUBMIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="s1-glass-btn group mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-medium uppercase tracking-[0.06em] text-white"
              >
                {t("submitCta")}
                <ArrowSquareOut className="size-4" weight="bold" />
              </a>
              <p className="mt-3 text-xs text-[var(--home-ink-soft)]">
                {t("submitNote")}
              </p>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </section>
  );
}
