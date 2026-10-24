"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  CalendarBlank,
  CheckCircle,
  GlobeHemisphereWest,
  MapPin,
  PenNib,
  RocketLaunch,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { AboutRipple } from "@/components/magicui/about-ripple";
import Logo from "@/components/ui/svgs/logo";
import { NightEyebrow, NightHeader } from "@/components/shared/night-header";
import { staggerChildren, itemVariants } from "@/lib/animations";
import type { JobOpening } from "@/lib/careers";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

const perks = [
  { key: "remote", icon: GlobeHemisphereWest },
  { key: "developerFocused", icon: PenNib },
  { key: "smallTeam", icon: UsersThree },
];

const careerFilters = ["All", "Engineering", "Marketing", "Growth", "Other"] as const;

type CareerFilter = (typeof careerFilters)[number];

const capsuleClassName =
  "s1-glass-card inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-[var(--home-ink)]";

/** Glass pill on the night header. */
const nightCapsuleClassName =
  "inline-flex items-center gap-2 rounded-full border border-white/20 bg-[linear-gradient(160deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] px-4 py-2 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-14px_rgba(0,0,0,0.8)] backdrop-blur-xl";

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

function formatPostedDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    return "[&>svg]:text-red-500";
  }

  if (isOpeningSoon) {
    return "[&>svg]:text-amber-500";
  }

  return "[&>svg]:text-primary";
}

function JobCard({
  id,
  title,
  description,
  location,
  type,
  status,
  openings,
  postedDate,
  locale,
}: {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  status: string;
  openings: number;
  postedDate: string;
  locale: string;
}) {
  const t = useTranslations("CareersPage");
  const { isClosed, isOpeningSoon, isUnavailable, buttonLabel } =
    getJobAvailability(status);

  return (
    <article
      className={cn(
        "s1-glass-card group relative flex h-full min-h-[20rem] flex-col overflow-hidden rounded-[24px] p-7",
        "transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none",
      )}
    >

      <Link
        href={`/careers/${id}`}
        className="relative z-[1] flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-[var(--home-line)] bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[var(--home-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_14px_-8px_rgba(90,30,0,0.4)] backdrop-blur-md dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
              getStatusBadgeClassName(status),
            )}
          >
            <CheckCircle className="size-3.5" weight="fill" />
            {status}
          </span>
        </div>
        <h3 className="mt-4 text-[22px] font-medium leading-snug tracking-[-0.03em] text-[var(--home-ink)] transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[var(--home-ink-soft)]">
          {description}
        </p>

        <div className="mt-6 space-y-2.5 border-t border-[var(--home-line)] pt-5">
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--home-ink-soft)]">
            <UsersThree
              className="size-4 shrink-0 text-primary"
              weight="duotone"
            />
            <span>{t("openings", { count: openings })}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--home-ink-soft)]">
            <MapPin className="size-4 shrink-0 text-primary" weight="duotone" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--home-ink-soft)]">
            <Briefcase
              className="size-4 shrink-0 text-primary"
              weight="duotone"
            />
            <span>{type}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--home-ink-soft)]">
            <CalendarBlank
              className="size-4 shrink-0 text-primary"
              weight="duotone"
            />
            <span>
              {t("posted", { date: formatPostedDate(postedDate, locale) })}
            </span>
          </div>
        </div>
      </Link>

      <Link
        href={`/careers/${id}`}
        className={cn(
          "relative z-[2] mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-[13px] font-medium uppercase tracking-[0.06em]",
          isUnavailable
            ? cn(
                "border border-[var(--home-line)] text-[var(--home-ink-soft)] hover:text-[var(--home-ink)]",
                isOpeningSoon && "text-amber-700 dark:text-amber-300",
                isClosed && "text-red-600 dark:text-red-300",
              )
            : "s1-glass-btn text-white",
        )}
      >
        {isUnavailable ? buttonLabel : t("applyNow")}
        <ArrowRight
          className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none"
          weight="bold"
        />
      </Link>
    </article>
  );
}

type CareersPageProps = {
  jobOpenings: JobOpening[];
};

export function CareersPage({ jobOpenings }: CareersPageProps) {
  const t = useTranslations("CareersPage");
  const locale = useLocale();
  const [selectedFilter, setSelectedFilter] = useState<CareerFilter>("All");

  const filteredJobs = jobOpenings
    .filter((job) => {
      const { isClosed } = getJobAvailability(job.status);

      if (selectedFilter === "All") return !isClosed;
      if (selectedFilter === "Other") {
        return (
          isClosed ||
          !["Engineering", "Marketing", "Growth", "Founder's Office"].includes(
            job.department,
          )
        );
      }
      if (isClosed) return false;
      if (selectedFilter === "Growth") {
        return (
          job.department === "Growth" || job.department === "Founder's Office"
        );
      }

      return job.department === selectedFilter;
    })
    .sort((a, b) => {
      const aUnavailable = getJobAvailability(a.status).isUnavailable;
      const bUnavailable = getJobAvailability(b.status).isUnavailable;

      if (aUnavailable !== bUnavailable) {
        return aUnavailable ? 1 : -1;
      }

      return a.order - b.order;
    });

  return (
    <section className="overflow-x-clip bg-[var(--home-cream)] text-[var(--home-ink)]">
      <NightHeader className="pb-24 md:pb-32">
        <div className="relative mx-auto max-w-7xl">
          <motion.div
            className="mt-20 flex h-[40rem] max-h-fit w-full flex-col"
            initial="hidden"
            animate="visible"
            variants={heroAnimation}
          >
            {/* `dark` scopes the ripple's theme colours so it reads on the night header. */}
            <div className="dark relative h-full w-full">
              <AboutRipple mainCircleSize={310} numCircles={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="s1-glass-dark z-[30] flex items-center justify-center rounded-3xl p-3 drop-shadow-[0_0px_25px_rgba(249,115,22,0.45)]">
                  <Logo className="size-12 sm:size-16 md:size-24" />
                </div>
                <span className="text-2xl font-medium tracking-[-0.03em] text-white">
                  Studio1
                </span>
              </div>
            </div>
          </motion.div>

          {/* Hero */}
          <section className="relative flex max-h-fit flex-col px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto -mb-40 max-w-3xl -translate-y-40 text-center"
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
                className="mt-7 text-[40px] font-medium leading-[1.06] tracking-[-0.05em] text-white sm:text-[56px] md:text-[68px]"
                variants={itemVariants}
              >
                {t("titlePrefix")}{" "}
                <span className="s1-accent-text">{t("titleHighlight")}</span>{" "}
                {t("titleSuffix")}
              </motion.h1>

              <motion.p
                className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.6] text-white/60 sm:text-[18px]"
                variants={itemVariants}
              >
                {t("description")}
              </motion.p>

              <motion.div
                className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
                variants={itemVariants}
              >
                {perks.map((perk) => (
                  <span key={perk.key} className={nightCapsuleClassName}>
                    <perk.icon
                      weight="duotone"
                      className="size-4 shrink-0 text-[#fdba74]"
                    />
                    {t(`perks.${perk.key}`)}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </section>
        </div>
      </NightHeader>

      <div className="relative mx-auto max-w-7xl">
        {/* Open positions */}
        <motion.section
          id="open-positions"
          className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-28 pt-16 sm:px-6 md:pt-20 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          variants={staggerChildren}
        >
          {jobOpenings.length > 0 ? (
            <motion.div
              className="mb-8 flex flex-wrap items-center justify-center gap-2"
              variants={itemVariants}
            >
              {careerFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={cn(
                    capsuleClassName,
                    "cursor-pointer transition-opacity duration-200",
                    selectedFilter === filter
                      ? "s1-glass-btn text-white"
                      : "opacity-80 hover:opacity-100",
                  )}
                >
                  {filter === "All" ? t("allDepartments") : filter}
                </button>
              ))}
            </motion.div>
          ) : null}

          {filteredJobs.length > 0 ? (
            <>
              <motion.div
                key={selectedFilter}
                className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="visible"
                variants={staggerChildren}
              >
                {filteredJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    className="min-w-0"
                    variants={itemVariants}
                  >
                    <JobCard
                      id={job.id}
                      title={job.title}
                      description={job.description}
                      location={job.location}
                      type={job.type}
                      status={job.status}
                      openings={job.openings}
                      postedDate={job.postedDate}
                      locale={locale}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.p
                className="mx-auto mt-12 max-w-2xl text-center text-[16px] leading-[1.6] text-[var(--home-ink-soft)] sm:text-[17px]"
                variants={itemVariants}
              >
                {t("applicationNote")}
              </motion.p>
            </>
          ) : (
            <p className="text-center text-[15px] text-[var(--home-ink-soft)]">
              {t("empty")}
            </p>
          )}
        </motion.section>
      </div>
    </section>
  );
}
