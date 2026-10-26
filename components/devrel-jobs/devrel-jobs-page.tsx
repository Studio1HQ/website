"use client";

import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import {
  ArrowSquareOut,
  ArrowUpRight,
  ArrowsClockwise,
  Buildings,
  CalendarBlank,
  CaretDown,
  Check,
  CurrencyDollar,
  GlobeHemisphereWest,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  RocketLaunch,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Container, EASE } from "@/components/home/ui";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import {
  Accent,
  CELL,
  FAINT,
  IndexBar,
  MUTED,
  PaperSection,
} from "@/components/paper/paper-sections";
import { Input } from "@/components/ui/input";
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
import { GRAIN, INK, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

const JOBS_PER_PAGE = 12;

/** White pill on the paper header, holding one hero stat. */
const statPillClassName =
  "inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[13px] font-medium text-[#141414] ring-1 ring-inset ring-[#141414]/10";

/** Outline pill used for pagination and secondary actions. */
const outlinePillClassName =
  "inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-[#141414]/20 px-5 text-[14px] font-medium text-[#141414] transition-colors duration-300 hover:border-[#141414] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/50 disabled:pointer-events-none disabled:opacity-40";

const workplaceIcons: Record<
  DevRelJobWorkplace,
  React.ComponentType<{ className?: string; weight?: "bold" | "duotone" }>
> = {
  Remote: GlobeHemisphereWest,
  Hybrid: ArrowsClockwise,
  "On-site": Buildings,
  Unspecified: MapPin,
};

/** Fade-and-rise variants that collapse to a plain fade-free state under reduced motion. */
function useRiseVariants() {
  const reduceMotion = useReducedMotion();
  return {
    list: {
      hidden: {},
      visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } },
    },
    item: {
      hidden: reduceMotion ? {} : { opacity: 0, y: 14 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: EASE },
      },
    },
  };
}

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
  const isActive = value !== null;

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

  const optionClassName = (selected: boolean) =>
    cn(
      "flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-[#141414] transition-colors hover:bg-[#141414]/[0.05]",
      selected && "bg-[#f97316]/10",
    );

  return (
    <div ref={menuRef} className={cn("relative min-w-0", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-full border-[1.5px] px-4 text-[13px] font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/50",
          isActive
            ? "border-[#141414] bg-[#141414] text-[#f4efe7]"
            : "border-[#141414]/20 bg-white/60 text-[#141414] hover:border-[#141414] hover:bg-white",
        )}
      >
        <span className="truncate">{value ?? allLabel}</span>
        <CaretDown
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            isActive ? "text-[#f97316]" : "text-[#141414]/50",
            isOpen && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 max-h-72 w-full min-w-48 overflow-y-auto rounded-[16px] bg-white p-1.5 shadow-[0_24px_40px_-24px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/10"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className={optionClassName(value === null)}
          >
            {allLabel}
            {value === null ? (
              <Check
                aria-hidden
                weight="bold"
                className="size-3.5 shrink-0"
                style={{ color: PRINT }}
              />
            ) : null}
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
              className={optionClassName(value === option)}
            >
              <span className="truncate">{option}</span>
              {value === option ? (
                <Check
                  aria-hidden
                  weight="bold"
                  className="size-3.5 shrink-0"
                  style={{ color: PRINT }}
                />
              ) : null}
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

/** One listing, printed as a white row card like the careers role rows. */
function JobRow({ job, locale }: { job: DevRelJob; locale: string }) {
  const t = useTranslations("DevRelJobsPage");
  const WorkplaceIcon = workplaceIcons[job.workplace];
  const isNew = isNewDevRelJob(job);
  const [hasLogoError, setHasLogoError] = useState(false);

  return (
    <article className="relative min-w-0">
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${job.title} at ${job.company}`}
        className={cn(
          "group relative isolate grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 gap-y-4 overflow-hidden p-5 outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/50 md:p-6 lg:grid-cols-[44px_minmax(0,1fr)_230px_auto] lg:items-center lg:gap-x-6 [&>*]:relative",
          CELL,
        )}
      >
        {/* Hover: an orange wash rises from the right edge */}
        <span
          aria-hidden
          className="pointer-events-none !absolute inset-0 -z-[5] translate-x-8 opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:translate-x-0"
          style={{
            background:
              "radial-gradient(40% 140% at 104% 50%, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0) 70%)",
          }}
        />

        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white p-2 ring-1 ring-inset ring-[#141414]/10"
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
            <span className="text-lg font-semibold" style={{ color: PRINT }}>
              {job.company.charAt(0)}
            </span>
          )}
        </span>

        <div className="min-w-0">
          <p
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium",
              MUTED,
            )}
          >
            <span className="truncate text-[#141414]">{job.company}</span>
            <span aria-hidden className={FAINT}>
              ·
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin weight="bold" className="size-3.5 shrink-0 opacity-60" />
              <span className="truncate">{job.location}</span>
            </span>
          </p>
          <h3 className="mt-1.5 text-[19px] font-medium leading-tight tracking-[-0.035em] md:text-[21px]">
            {job.title}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#141414]/[0.05] px-2.5 py-1 text-[12px] font-medium text-[#141414]/80">
              {job.category}
            </span>
            {isNew ? (
              <span
                className="inline-flex items-center px-1.5 py-[3px] text-[11px] font-medium leading-none text-white"
                style={{ background: PRINT }}
              >
                {t("newBadge")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="col-span-2 flex items-end justify-between gap-4 border-t border-[#141414]/[0.1] pt-4 lg:col-span-2 lg:border-t-0 lg:pt-0">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] font-medium lg:w-[230px] lg:flex-col">
            <span className="inline-flex items-center gap-2">
              <WorkplaceIcon
                className="size-3.5 shrink-0 text-[#f97316]"
                weight="bold"
              />
              {job.workplace}
            </span>
            {job.salary ? (
              <span className="inline-flex items-center gap-2">
                <CurrencyDollar
                  className="size-3.5 shrink-0 opacity-60"
                  weight="bold"
                />
                {job.salary}
              </span>
            ) : null}
            <span className={cn("inline-flex items-center gap-2", MUTED)}>
              <CalendarBlank
                className="size-3.5 shrink-0 opacity-80"
                weight="bold"
              />
              {formatPostedDate(job.postedDate, locale)}
            </span>
          </div>
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-300 group-hover:rotate-45 group-hover:!bg-[#f97316] motion-reduce:group-hover:rotate-0"
            style={{ background: isNew ? PRINT : INK }}
          >
            <ArrowUpRight weight="bold" className="size-4" />
          </span>
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
  const reduceMotion = useReducedMotion();
  const rise = useRiseVariants();
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
  }, [
    jobs,
    query,
    selectedCategory,
    selectedType,
    selectedLocation,
    selectedLevel,
  ]);

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedCategory !== null ||
    selectedType !== null ||
    selectedLocation !== null ||
    selectedLevel !== null;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredJobs.length / JOBS_PER_PAGE),
  );
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

  const stats = [
    { icon: Megaphone, label: t("statsRoles", { count: jobs.length }) },
    { icon: Buildings, label: t("statsCompanies", { count: companyCount }) },
    { icon: ArrowsClockwise, label: t("statsUpdated") },
  ];

  return (
    <div style={PAPER_SCOPE} className="overflow-x-clip">
      {/* Hero */}
      <PaperPageHeader className="pb-14 pt-36 md:pb-20 md:pt-44">
        <Container>
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={rise.list}
          >
            <motion.div variants={rise.item} className="flex justify-center">
              <PaperEyebrow
                icon={<RocketLaunch weight="duotone" className="size-4" />}
              >
                {t("badge")}
              </PaperEyebrow>
            </motion.div>

            <motion.h1
              className="mt-7 text-[40px] font-medium leading-[1.04] tracking-[-0.055em] sm:text-[60px] md:text-[72px]"
              variants={rise.item}
            >
              {t("titlePrefix")} <Accent>{t("titleHighlight")}</Accent>
            </motion.h1>

            <motion.ul
              role="list"
              className="mt-9 flex flex-wrap items-center justify-center gap-2.5"
              variants={rise.item}
            >
              {stats.map(({ icon: StatIcon, label }) => (
                <li key={label} className={statPillClassName}>
                  <StatIcon
                    weight="duotone"
                    className="size-4 shrink-0"
                    style={{ color: PRINT }}
                  />
                  {label}
                </li>
              ))}
            </motion.ul>
          </motion.div>
        </Container>
      </PaperPageHeader>

      {/* Jobs */}
      <PaperSection
        id="devrel-jobs"
        tone="paper"
        className="scroll-mt-28 !pt-6 pb-24 md:!pt-8 md:pb-28"
      >
        <Container>
          <IndexBar index={1} name={t("badge")} aside={t("statsUpdated")} />

          {/* Sticky toolbar */}
          <div className="sticky top-24 z-30 mt-6">
            <div className="rounded-[20px] bg-[#f4efe7]/90 p-2.5 ring-1 ring-inset ring-[#141414]/10 backdrop-blur-xl sm:p-3">
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
                <div className="relative min-w-0">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-4 top-1/2 z-[1] size-4 -translate-y-1/2 text-[#141414]/50"
                    weight="bold"
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
                    className="h-11 rounded-full border-0 bg-white pl-10 pr-10 text-[14px] text-[#141414] shadow-none ring-1 ring-inset ring-[#141414]/[0.12] placeholder:text-[#141414]/45 focus-visible:ring-2 focus-visible:ring-[#f97316]/50 focus-visible:ring-offset-0"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label={t("clearFilters")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#141414]/45 transition-colors hover:text-[#141414]"
                    >
                      <XCircle className="size-4" weight="fill" />
                    </button>
                  ) : null}
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                  <FilterDropdown
                    id="job-category"
                    label={t("categoryFilter")}
                    value={selectedCategory}
                    options={categories}
                    allLabel={t("allCategories")}
                    onChange={(value) => {
                      setSelectedCategory(value as DevRelJobCategory | null);
                      setPage(1);
                    }}
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
              </div>
            </div>
          </div>

          <div className="mb-4 mt-6 flex min-h-8 flex-wrap items-center justify-between gap-3">
            <p
              aria-live="polite"
              className={cn("text-[13px] font-medium tabular-nums", MUTED)}
            >
              {t("showing", {
                shown: filteredJobs.length,
                total: jobs.length,
              })}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#141414] underline decoration-[#141414]/25 decoration-2 underline-offset-[5px] transition-colors hover:decoration-[#f97316]"
              >
                {t("clearFilters")}
              </button>
            ) : null}
          </div>

          {filteredJobs.length > 0 ? (
            <>
              <motion.ul
                key={gridKey}
                role="list"
                className="grid w-full gap-2"
                initial="hidden"
                animate="visible"
                variants={rise.list}
              >
                {paginatedJobs.map((job) => (
                  <motion.li
                    key={job.id}
                    className="min-w-0"
                    variants={rise.item}
                  >
                    <JobRow job={job} locale={locale} />
                  </motion.li>
                ))}
              </motion.ul>
              {totalPages > 1 ? (
                <nav
                  aria-label={t("pagination")}
                  className="mt-10 flex flex-wrap items-center justify-center gap-3"
                >
                  <button
                    type="button"
                    className={outlinePillClassName}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("previousPage")}
                  </button>
                  <span
                    className={cn(
                      "px-2 text-[13px] font-medium tabular-nums",
                      MUTED,
                    )}
                  >
                    {t("pageOf", { page: currentPage, total: totalPages })}
                  </span>
                  <button
                    type="button"
                    className={outlinePillClassName}
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
            <div
              className={cn(
                "flex flex-col items-center gap-5 px-6 py-14 text-center hover:translate-y-0",
                CELL,
              )}
            >
              <span
                className="flex size-12 items-center justify-center rounded-full text-[#f4efe7]"
                style={{ background: INK }}
              >
                <MagnifyingGlass className="size-5" weight="bold" />
              </span>
              <div>
                <p className="text-[20px] font-medium tracking-[-0.035em]">
                  {t("emptyTitle")}
                </p>
                <p className={cn("mt-1.5 text-[15px]", MUTED)}>
                  {t("emptyDescription")}
                </p>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={outlinePillClassName}
                >
                  {t("clearFilters")}
                </button>
              ) : null}
            </div>
          )}

          {/* Submit CTA */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="relative isolate mt-16 overflow-hidden rounded-[24px] bg-white/80 p-7 shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08] sm:p-10 md:mt-20 lg:p-12"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-25 mix-blend-multiply"
              style={{ backgroundImage: GRAIN }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(249,115,22,0.18),transparent)]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${PRINT}, transparent)`,
              }}
            />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
              <div>
                <h2 className="text-[30px] font-medium leading-[1.1] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
                  {t("submitTitle")}
                </h2>
                <p
                  className={cn(
                    "mt-4 max-w-[560px] text-[15px] leading-[1.6] sm:text-[16px]",
                    MUTED,
                  )}
                >
                  {t("submitDescription")}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <a
                  href={DEVREL_JOB_SUBMIT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-[#f4efe7] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
                  style={{ background: INK }}
                >
                  {t("submitCta")}
                  <span
                    className="flex size-9 items-center justify-center rounded-full text-white"
                    style={{ background: PRINT }}
                  >
                    <ArrowSquareOut weight="bold" className="size-4" />
                  </span>
                </a>
                <p className={cn("text-[12px]", MUTED)}>{t("submitNote")}</p>
              </div>
            </div>
          </motion.div>
        </Container>
      </PaperSection>
    </div>
  );
}
