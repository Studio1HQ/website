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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { staggerChildren, itemVariants } from "@/lib/animations";
import type { JobOpening } from "@/lib/careers";
import {
  glassCardEdgeHighlight,
  glassCardFrame,
  glassCardHoverWash,
  sideBeamGlowLeftMuted,
  sideBeamGlowRightMuted,
} from "@/lib/shadows";
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
  "rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground border border-border/40 dark:border-white/15 bg-white/55 dark:bg-white/[0.08] backdrop-blur-md shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.32)] dark:shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.22)]";

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
    return "border-red-400/45 bg-red-400/10 text-red-700 dark:text-red-300";
  }

  if (isOpeningSoon) {
    return "border-yellow-400/45 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300";
  }

  return "border-green-500/35 bg-green-500/10 text-green-700 dark:text-green-300";
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
        "group relative flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl p-6",
        glassCardFrame,
        "transition-all duration-500 ease-out hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none",
      )}
    >
      <div aria-hidden className={glassCardEdgeHighlight} />
      <div aria-hidden className={glassCardHoverWash} />

      <Link
        href={`/careers/${id}`}
        className="relative z-[1] flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              getStatusBadgeClassName(status),
            )}
          >
            <CheckCircle className="size-3.5" weight="fill" />
            {status}
          </span>
        </div>
        <h3 className="mt-3 font-inter text-xl font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 space-y-2.5 border-t border-border/50 pt-5 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
            <UsersThree
              className="size-4 shrink-0 text-primary"
              weight="duotone"
            />
            <span>{t("openings", { count: openings })}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" weight="duotone" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
            <Briefcase
              className="size-4 shrink-0 text-primary"
              weight="duotone"
            />
            <span>{type}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
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

      <Button
        variant={isUnavailable ? "outline" : "gradient"}
        size="cta"
        className={cn(
          "relative z-[2] mt-6 w-fit",
          isOpeningSoon &&
            "border-amber-400/35 bg-amber-400/10 text-amber-800 hover:bg-amber-400/15 dark:text-amber-200",
          isClosed &&
            "border-red-400/35 bg-red-400/10 text-red-700 hover:bg-red-400/15 dark:text-red-300",
        )}
        asChild
      >
        <Link href={`/careers/${id}`}>
          {isUnavailable ? buttonLabel : t("applyNow")}
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none"
            weight="bold"
          />
        </Link>
      </Button>
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
    <section className="overflow-x-hidden">
      <div className="relative mx-auto max-w-7xl">
        <div aria-hidden className={sideBeamGlowLeftMuted} />
        <div aria-hidden className={sideBeamGlowRightMuted} />

        <motion.div
          className="mt-20 flex h-[40rem] max-h-fit w-full flex-col"
          initial="hidden"
          animate="visible"
          variants={heroAnimation}
        >
          <div className="relative h-full w-full">
            <AboutRipple mainCircleSize={310} numCircles={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="z-[30] flex items-center justify-center rounded-3xl border-2 border-accent/40 bg-background/60 p-3 backdrop-blur-sm drop-shadow-[0_0px_25px_hsl(var(--primary))]">
                <Logo className="size-12 sm:size-16 md:size-24" />
              </div>
              <span className="font-primary text-2xl font-semibold tracking-tight">
                Studio1
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hero */}
        <section className="relative flex max-h-fit flex-col px-4 pb-8 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-3xl -translate-y-40 text-center"
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <motion.div variants={itemVariants}>
              <Badge className="mx-auto mb-6 flex w-fit items-center gap-2 bg-[color-mix(in_hsl,hsl(var(--primary-surface))_85%,hsl(var(--primary))_15%)] pb-1 hover:bg-[color-mix(in_hsl,hsl(var(--primary-surface))_85%,hsl(var(--primary))_15%)] dark:hover:bg-primary">
                <RocketLaunch className="size-4" weight="fill" />
                {t("badge")}
              </Badge>
            </motion.div>

            <motion.h1
              className="font-primary text-4xl font-normal tracking-tight sm:text-5xl md:text-6xl"
              variants={itemVariants}
            >
              {t("titlePrefix")}{" "}
              <span className="serif-accent bg-gradient-to-br from-primary via-primary1 to-primary bg-clip-text font-accent font-normal italic text-transparent">
                {t("titleHighlight")}
              </span>{" "}
              {t("titleSuffix")}
            </motion.h1>

            <motion.p
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              variants={itemVariants}
            >
              {t("description")}
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
              variants={itemVariants}
            >
              {perks.map((perk) => (
                <span key={perk.key} className={capsuleClassName}>
                  <perk.icon
                    weight="fill"
                    className="size-4 shrink-0 text-primary"
                  />
                  {t(`perks.${perk.key}`)}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Open positions */}
        <motion.section
          id="open-positions"
          className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-24 pt-0 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          variants={staggerChildren}
        >
          {jobOpenings.length > 0 ? (
            <motion.div
              className="mb-6 flex flex-wrap items-center justify-center gap-2"
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
                      ? "border-primary/40 bg-primary/10"
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
                className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
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
                className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg"
                variants={itemVariants}
              >
                {t("applicationNote")}
              </motion.p>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
        </motion.section>
      </div>
    </section>
  );
}
