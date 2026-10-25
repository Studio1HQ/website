"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  MapPin,
  PaperPlaneTilt,
  Scissors,
  UsersThree,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/svgs/logo";
import { Container, EASE } from "@/components/home/ui";
import {
  Cursor,
  GRAIN,
  INK,
  PAPER,
  PRINT,
} from "@/components/paper/paper-hero";
import {
  Accent,
  CELL,
  FAINT,
  IndexBar,
  MUTED,
  PaperSection,
  SectionHead,
  Selected,
} from "@/components/paper/paper-sections";
import type { JobOpening } from "@/lib/careers";
import {
  CAREERS_CONTACT_EMAIL,
  getJobApplicationMailto,
} from "@/lib/careers-mailto";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Roles, teams and status                                             */
/* ------------------------------------------------------------------ */

export type Availability = "open" | "soon" | "closed";

export function availabilityOf(status: string): Availability {
  const normalized = status.toLowerCase();
  if (normalized.includes("closed")) return "closed";
  if (normalized.includes("soon")) return "soon";
  return "open";
}

/** Departments grouped into the teams a candidate would join. */
const TEAMS = [
  { key: "engineering", label: "Engineering", departments: ["Engineering"] },
  {
    key: "growth",
    label: "Growth & DevRel",
    departments: ["Growth", "Founder's Office"],
  },
  {
    key: "marketing",
    label: "Content & Marketing",
    departments: ["Marketing"],
  },
] as const;

type TeamKey = (typeof TEAMS)[number]["key"] | "all";

function inTeam(job: JobOpening, team: TeamKey) {
  if (team === "all") return true;
  const departments: readonly string[] =
    TEAMS.find((item) => item.key === team)?.departments ?? [];
  return departments.includes(job.department);
}

/** The open-pitch email: resume, proof of work and a one-page pitch. */
const PITCH_MAILTO = getJobApplicationMailto({
  title: "Open pitch",
  department: "Open pitch",
  applySubject: "Open pitch",
});

function formatPostedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Open roles first, then the ones opening soon, each in file order. */
export function byAvailability(a: JobOpening, b: JobOpening) {
  const rank = (job: JobOpening) =>
    availabilityOf(job.status) === "open" ? 0 : 1;
  return rank(a) - rank(b) || a.order - b.order;
}

/** Small square status chip, printed like the hero's "growing" tag. */
export function StatusChip({ availability }: { availability: Availability }) {
  if (availability === "open") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-1.5 py-[3px] text-[11px] font-medium leading-none text-white"
        style={{ background: PRINT }}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
          <span className="relative size-1.5 rounded-full bg-white" />
        </span>
        Open
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-[3px] text-[11px] font-medium leading-none ring-1 ring-inset",
        availability === "soon"
          ? "text-[#141414] ring-[#141414]/30"
          : "text-[#141414]/45 ring-[#141414]/15",
      )}
    >
      {availability === "soon" ? "Opening soon" : "Closed"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: headline left, a taped-up "Now hiring" flyer right            */
/* ------------------------------------------------------------------ */

/**
 * Primary CTA, built like the home page's call button: on hover the
 * orange dot behind the arrow floods the whole pill and the arrow drops.
 */
function SeeRolesButton({ label }: { label: string }) {
  const reduceMotion = useReducedMotion();
  const ease = [0.65, 0, 0.35, 1] as const;
  return (
    <motion.a
      href="#open-roles"
      initial="rest"
      animate="rest"
      whileHover={reduceMotion ? undefined : "hover"}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      className="relative isolate inline-flex h-14 items-center gap-4 overflow-hidden rounded-full pl-8 pr-2 text-[16px] font-medium text-[#f4efe7]"
      style={{ background: INK }}
    >
      <motion.span
        className="relative"
        variants={{ rest: { x: 0 }, hover: { x: -4 } }}
        transition={{ duration: 0.5, ease }}
      >
        {label}
      </motion.span>
      <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full">
        <motion.span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full"
          style={{ background: PRINT }}
          variants={{ rest: { scale: 1 }, hover: { scale: 14 } }}
          transition={{ duration: 0.7, ease }}
        />
        <motion.span
          variants={{ rest: { y: 0 }, hover: { y: [0, 16, -16, 0] } }}
          transition={{ duration: 0.6, ease, times: [0, 0.45, 0.46, 1] }}
        >
          <ArrowDown weight="bold" className="size-[18px] text-white" />
        </motion.span>
      </span>
    </motion.a>
  );
}

/** A word underlined by a hand-drawn orange stroke that draws in once. */
function Underlined({ children }: { children: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.08em] left-0 h-[0.22em] w-full overflow-visible"
      >
        <motion.path
          d="M2 8 C 40 3, 90 3, 120 6 S 175 10, 198 4"
          fill="none"
          stroke={PRINT}
          strokeWidth="5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.4 }}
        />
      </svg>
    </span>
  );
}

/** Tabs on the flyer: current roles to pull, plus one already torn off. */
const FLYER_TABS = 5;

/**
 * Notice-board flyer printed on the brand orange. Every tear-off tab is a
 * current role and links to it; closed roles leave a tab already torn off.
 */
function HiringFlyer({ jobs }: { jobs: JobOpening[] }) {
  const reduceMotion = useReducedMotion();
  const current = jobs
    .filter((job) => availabilityOf(job.status) !== "closed")
    .sort(byAvailability);
  const hasClosed = jobs.some((job) => availabilityOf(job.status) === "closed");
  const tabs = current.slice(0, hasClosed ? FLYER_TABS - 1 : FLYER_TABS);
  const tornAt = hasClosed ? Math.min(1, tabs.length) : -1;

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[420px] lg:mr-4"
      initial={reduceMotion ? false : { opacity: 0, y: 40, rotate: -7 }}
      animate={{ opacity: 1, y: 0, rotate: -2.5 }}
      transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
    >
      {/* Tape holding the flyer to the page */}
      <span
        aria-hidden
        className="absolute -top-4 left-1/2 z-10 h-8 w-32 -translate-x-1/2 rotate-[4deg] bg-[#f4efe7]/75 shadow-[0_2px_6px_-2px_rgba(20,20,20,0.25)] ring-1 ring-[#141414]/[0.06]"
      />

      <div
        className="relative isolate overflow-hidden text-white shadow-[0_44px_80px_-44px_rgba(90,25,0,0.75)]"
        style={{ background: PRINT }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        <div className="px-6 pb-7 pt-9 sm:px-8">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
            <span>Studio1 / Careers</span>
            <span className="tabular-nums">No. {pad(current.length)}</span>
          </div>
          <div className="mt-7 flex items-end justify-between gap-4">
            <p className="text-[64px] font-medium leading-[0.86] tracking-[-0.065em] sm:text-[84px]">
              Now
              <br />
              hiring.
            </p>
            <Logo className="mb-2 size-14 shrink-0 brightness-0 invert sm:size-16" />
          </div>
          <p className="mt-7 max-w-[310px] text-[15px] leading-[1.5] text-white/90">
            Builders, writers and advocates who make developer products easy to
            understand.
          </p>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
            Remote · India · Reply in ~1 week
          </p>
        </div>
        {/* Cut line */}
        <div className="relative border-t-[1.5px] border-dashed border-white/60">
          <Scissors
            aria-hidden
            weight="fill"
            className="absolute -top-[9px] left-4 size-4 -scale-x-100 px-0.5 text-white"
            style={{ background: PRINT }}
          />
        </div>
      </div>

      {/* Tear-off tabs, one per role */}
      <ul role="list" aria-label="Current roles" className="flex">
        {Array.from({ length: tabs.length + (tornAt >= 0 ? 1 : 0) }).map(
          (_, slot) => {
            if (slot === tornAt) {
              return (
                <li key="torn" aria-hidden className="flex-1">
                  {/* Only a ragged stub is left of this one */}
                  <span
                    className="block h-2.5 w-full"
                    style={{
                      background: PRINT,
                      clipPath:
                        "polygon(0 0,100% 0,100% 60%,88% 100%,72% 55%,58% 95%,40% 50%,26% 100%,12% 60%,0 90%)",
                    }}
                  />
                </li>
              );
            }
            const job = tabs[slot > tornAt && tornAt >= 0 ? slot - 1 : slot];
            const open = availabilityOf(job.status) === "open";
            return (
              <li key={job.id} className="min-w-0 flex-1">
                <Link
                  href={`/careers/${job.id}`}
                  className="group/tab relative isolate block h-[216px] origin-top border-r border-dashed border-white/50 text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-y-1.5 hover:rotate-[5deg] focus-visible:rotate-[5deg] focus-visible:outline-none motion-reduce:transform-none"
                  style={{ background: PRINT }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 opacity-40 mix-blend-multiply"
                    style={{ backgroundImage: GRAIN }}
                  />
                  <span className="flex h-full rotate-180 items-center justify-end gap-2.5 py-3.5 [writing-mode:vertical-rl]">
                    <span className="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                      {job.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.14em]",
                        open ? "text-white" : "text-white/60",
                      )}
                    >
                      {open ? "● Open" : "Soon"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          },
        )}
      </ul>

      {/* A cursor about to pull one */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-9 left-[38%]"
      >
        <Cursor />
        <span
          className="absolute left-7 top-6 whitespace-nowrap px-1.5 py-[3px] text-[11px] font-medium leading-none text-white"
          style={{ background: INK }}
        >
          take one
        </span>
      </div>
    </motion.div>
  );
}

function CareersHero({ jobs }: { jobs: JobOpening[] }) {
  const t = useTranslations("CareersPage");
  const open = jobs.filter((job) => availabilityOf(job.status) === "open");
  const soon = jobs.filter((job) => availabilityOf(job.status) === "soon");

  const facts = [
    [pad(open.length), "Open now"],
    [pad(soon.length), "Opening soon"],
    ["~1 wk", "Typical reply time"],
    ["35+", "Teams we've shipped for"],
  ];

  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      {/* Faint ruled lines, like the sheet the flyer is pinned to */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_bottom,rgba(20,20,20,0.06)_1px,transparent_1px)] [background-size:100%_48px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]"
      />

      <Container className="grid items-center gap-x-16 gap-y-20 pb-20 pt-32 md:pt-40 lg:min-h-[calc(100svh/var(--s1-zoom,1))] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-16">
        <div>
          <p className="flex items-center gap-3 text-[13px] font-medium">
            <span className="relative flex size-2">
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:hidden"
                style={{ background: PRINT }}
              />
              <span
                className="relative size-2 rounded-full"
                style={{ background: PRINT }}
              />
            </span>
            {t("badge")}
            <span aria-hidden className="text-[#141414]/30">
              —
            </span>
            <span className="text-[#141414]/60">{t("perks.remote")}</span>
          </p>

          <h1 className="mt-8 text-[44px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] xl:text-[80px]">
            {t("titlePrefix")}
            <br />
            <Underlined>{t("titleHighlight")}</Underlined> {t("titleSuffix")}
            <span style={{ color: PRINT }}>.</span>
          </h1>

          <p className="mt-8 max-w-[520px] text-[16px] leading-[1.6] text-[#141414]/70 sm:text-[18px]">
            {t("description")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-5">
            <SeeRolesButton label="See open roles" />
            <a
              href={PITCH_MAILTO}
              className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
            >
              or pitch us a role
              <ArrowUpRight
                weight="bold"
                className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>

          {/* Ruled fact row */}
          <dl className="mt-14 grid grid-cols-2 border-t border-[#141414]/[0.14] sm:grid-cols-4">
            {facts.map(([value, label], index) => (
              <div
                key={label}
                className={cn(
                  "border-b border-[#141414]/[0.14] py-4 pr-4 sm:border-b-0",
                  index > 0 && "sm:border-l sm:pl-5",
                  index % 2 === 1 && "border-l pl-5 sm:pl-5",
                )}
              >
                <dd
                  className="text-[30px] font-medium leading-none tracking-[-0.05em] tabular-nums md:text-[34px]"
                  style={index === 0 ? { color: PRINT } : undefined}
                >
                  {value}
                </dd>
                <dt className={cn("mt-2 text-[13px]", MUTED)}>{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <HiringFlyer jobs={jobs} />
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Open roles (paper)                                             */
/* ------------------------------------------------------------------ */

export function RoleRow({ job, index }: { job: JobOpening; index: number }) {
  const availability = availabilityOf(job.status);
  return (
    <Link
      href={`/careers/${job.id}`}
      className={cn(
        "group relative isolate grid gap-x-6 gap-y-4 overflow-hidden p-5 md:p-6 lg:grid-cols-[44px_minmax(0,1fr)_220px_170px_auto] lg:items-center [&>*]:relative",
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
        className={cn(
          "hidden text-[13px] font-medium tabular-nums lg:block",
          availability === "open" ? "text-[#f97316]" : FAINT,
        )}
      >
        {pad(index + 1)}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-[20px] font-medium leading-tight tracking-[-0.035em] md:text-[22px]">
            {job.title}
          </h3>
          <span className="lg:hidden">
            <StatusChip availability={availability} />
          </span>
        </div>
        <p
          className={cn(
            "mt-1.5 line-clamp-2 max-w-[60ch] text-[14px] leading-[1.55]",
            MUTED,
          )}
        >
          {job.description}
        </p>
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] font-medium lg:flex-col">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Team</dt>
          <UsersThree weight="bold" className="size-3.5 shrink-0 opacity-60" />
          <dd>{job.department}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin weight="bold" className="size-3.5 shrink-0 opacity-60" />
          <dd>{job.location}</dd>
        </div>
      </dl>

      <dl className="hidden flex-col gap-1.5 text-[13px] lg:flex">
        <div>
          <dt className="sr-only">Type</dt>
          <dd className="font-medium">{job.type}</dd>
        </div>
        <div>
          <dt className="sr-only">Posted</dt>
          <dd className={MUTED}>
            Posted {formatPostedDate(job.postedDate)}
            {job.openings > 1 ? ` · ${job.openings} seats` : ""}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-4 lg:justify-end">
        <span className="hidden lg:inline-flex">
          <StatusChip availability={availability} />
        </span>
        <span className={cn("text-[13px] font-medium lg:hidden", MUTED)}>
          {job.type}
        </span>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-300 group-hover:rotate-45"
          style={{ background: availability === "open" ? PRINT : INK }}
        >
          <ArrowUpRight weight="bold" className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function OpenRoles({
  jobs,
  team,
  onTeam,
}: {
  jobs: JobOpening[];
  team: TeamKey;
  onTeam: (team: TeamKey) => void;
}) {
  const t = useTranslations("CareersPage");
  const reduceMotion = useReducedMotion();
  const current = jobs.filter((job) => availabilityOf(job.status) !== "closed");
  const closed = jobs.filter((job) => availabilityOf(job.status) === "closed");
  // Open roles first, then the ones opening soon, each in file order.
  const shown = current
    .filter((job) => inTeam(job, team))
    .sort((a, b) => {
      const rank = (job: JobOpening) =>
        availabilityOf(job.status) === "open" ? 0 : 1;
      return rank(a) - rank(b) || a.order - b.order;
    });
  const openCount = current.filter(
    (job) => availabilityOf(job.status) === "open",
  ).length;

  const filters: { key: TeamKey; label: string }[] = [
    { key: "all", label: t("allDepartments") },
    ...TEAMS.map(({ key, label }) => ({ key, label })),
  ];

  return (
    <PaperSection id="open-roles" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={1}
          name="Open roles"
          aside={`${openCount} open · ${current.length - openCount} opening soon`}
        />
        <SectionHead
          title={
            <>
              Roles we&apos;re <Accent>hiring for</Accent> right now
            </>
          }
          description={t("applicationNote")}
        />

        <div
          role="group"
          aria-label="Filter roles by team"
          className="mt-10 flex flex-wrap gap-2"
        >
          {filters.map(({ key, label }) => {
            const count = current.filter((job) => inTeam(job, key)).length;
            const isActive = key === team;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTeam(key)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] px-5 text-[14px] font-medium transition-colors duration-300",
                  isActive
                    ? "border-[#141414] bg-[#141414] text-[#f4efe7]"
                    : "border-[#141414]/20 hover:border-[#141414] hover:bg-white",
                )}
              >
                {label}
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    isActive ? "text-[#f97316]" : FAINT,
                  )}
                >
                  {pad(count)}
                </span>
              </button>
            );
          })}
        </div>

        {shown.length > 0 ? (
          <motion.ul
            key={team}
            role="list"
            className="mt-6 grid gap-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {shown.map((job, index) => (
              <motion.li
                key={job.id}
                className="relative min-w-0"
                variants={{
                  hidden: reduceMotion ? {} : { opacity: 0, y: 14 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: EASE },
                  },
                }}
              >
                {index === 0 && availabilityOf(job.status) === "open" ? (
                  <Selected label="row / role-open" />
                ) : null}
                <RoleRow job={job} index={index} />
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <div
            className={cn(
              "mt-6 flex flex-col items-center gap-5 px-6 py-14 text-center",
              CELL,
            )}
          >
            <p className="text-[18px] font-medium tracking-[-0.03em]">
              No roles on this team right now.
            </p>
            <a
              href={PITCH_MAILTO}
              className="group inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-5 text-[14px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7]"
            >
              Pitch us a role
              <ArrowUpRight
                weight="bold"
                className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        )}

        {closed.length > 0 ? (
          <p
            className={cn(
              "mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]",
              MUTED,
            )}
          >
            <span className="font-medium">Recently closed</span>
            <span aria-hidden className={FAINT}>
              —
            </span>
            {closed.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.id}`}
                className="underline decoration-[var(--p-line)] underline-offset-4 transition-colors hover:text-[var(--p-fg)] hover:decoration-[#f97316]"
              >
                {job.title}
              </Link>
            ))}
          </p>
        ) : null}
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Why Studio1 (paper): sticky headline, ruled principles         */
/* ------------------------------------------------------------------ */

const PRINCIPLES = [
  {
    title: "Real work from week one",
    description:
      "Demos, tutorials, docs, videos and launches for Studio1, Raah, AssetSnip and client products across AI, devtools and open source.",
  },
  {
    title: "Proof over pedigree",
    description:
      "We hire on what you have built, written or shipped. Repos, live demos, blogs and videos count for more than titles.",
  },
  {
    title: "Learn new tools fast",
    description:
      "New frameworks, SDKs, APIs and agent tools land every week. You learn them quickly enough to explain them accurately.",
  },
  {
    title: "Small team, real ownership",
    description:
      "A remote-first team based in India. You own your work early and work directly with the people making the calls.",
  },
];

const WORK_TYPES = [
  "AI-agent demos",
  "Tutorials",
  "Docs",
  "Videos",
  "Launches",
  "Community",
  "Sample apps",
];

function WhyStudio1() {
  const t = useTranslations("CareersPage");
  return (
    <PaperSection id="why-studio1" tone="paper">
      <Container>
        <IndexBar
          index={2}
          name="Why Studio1"
          aside={`${t("perks.developerFocused")} · ${t("perks.smallTeam")}`}
        />
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
              <span className="bg-[var(--p-card)] px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                Work on products <Accent>developers actually use</Accent>
              </span>
            </h2>
            <p
              className={cn(
                "mt-6 max-w-[440px] text-[16px] leading-[1.6]",
                MUTED,
              )}
            >
              You get the ownership to build, write, record and experiment, and
              to ship work developers can actually use.
            </p>
            <ul role="list" className="mt-8 flex max-w-[460px] flex-wrap gap-2">
              {WORK_TYPES.map((type) => (
                <li
                  key={type}
                  className="rounded-full bg-white/70 px-3 py-1 text-[12px] font-medium ring-1 ring-inset ring-[#141414]/10"
                >
                  {type}
                </li>
              ))}
            </ul>
          </div>

          <ol className="border-b border-[#141414]/[0.14]">
            {PRINCIPLES.map((principle, index) => (
              <li
                key={principle.title}
                className="group grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 border-t border-[#141414]/[0.14] py-8 md:grid-cols-[84px_minmax(0,1fr)] md:py-10"
              >
                <span className="text-[34px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#141414]/20 transition-colors duration-500 group-hover:text-[#f97316] md:text-[44px]">
                  {pad(index + 1)}
                </span>
                <div>
                  <h3 className="text-[22px] font-medium leading-tight tracking-[-0.035em] md:text-[28px]">
                    {principle.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-3 max-w-[520px] text-[15px] leading-[1.6]",
                      MUTED,
                    )}
                  >
                    {principle.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — How hiring works (paper): a timeline that draws in             */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    when: "Today",
    title: "Pick a role, read its brief",
    description:
      "Each role has its own application instructions. Following them carefully is the first thing we look at.",
  },
  {
    when: "Same email",
    title: "Send proof, not just a resume",
    description:
      "Your resume, links to real work like repos, demos, blogs or videos, and the short plan or doc the role asks for.",
  },
  {
    when: "Within ~1 week",
    title: "We read every application",
    description:
      "A small team reviews each one. If there is a fit, you will usually hear back within a week.",
  },
  {
    when: "If it's a fit",
    title: "Talk to the team",
    description:
      "We set up a conversation about the role, the work and how you would start.",
  },
];

function HiringProcess() {
  const reduceMotion = useReducedMotion();
  return (
    <PaperSection id="process" tone="paper">
      <Container>
        <IndexBar index={3} name="How hiring works" aside="Four steps" />
        <SectionHead
          title={
            <>
              A short process, built around <Accent>real work</Accent>
            </>
          }
          description="No trick questions and no endless rounds. Show us what you can do, and we will tell you quickly if it is a fit."
        />

        <ol className="relative mt-14 grid gap-10 lg:grid-cols-4 lg:gap-6">
          {/* The track: a hairline that fills with orange as it scrolls in */}
          <span
            aria-hidden
            className="absolute left-[21px] top-0 h-full w-px bg-[#141414]/[0.14] lg:left-0 lg:top-[21px] lg:h-px lg:w-full"
          />
          <motion.span
            aria-hidden
            className="absolute left-[21px] top-0 h-full w-px origin-top lg:left-0 lg:top-[21px] lg:h-px lg:w-full lg:origin-left"
            style={{ background: PRINT }}
            initial={reduceMotion ? false : { scaleX: 0, scaleY: 0 }}
            whileInView={{ scaleX: 1, scaleY: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
          />
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-x-5 lg:block"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: 0.7,
                ease: EASE,
                delay: 0.2 + index * 0.25,
              }}
            >
              <span
                className="relative flex size-11 items-center justify-center text-[13px] font-medium tabular-nums text-[#f4efe7]"
                style={{ background: index === STEPS.length - 1 ? PRINT : INK }}
              >
                {pad(index + 1)}
              </span>
              <div className="lg:mt-7 lg:pr-6">
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: PRINT }}
                >
                  {step.when}
                </p>
                <h3 className="mt-2 text-[20px] font-medium leading-tight tracking-[-0.035em]">
                  {step.title}
                </h3>
                <p className={cn("mt-2 text-[14px] leading-[1.6]", MUTED)}>
                  {step.description}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Open pitch (night band): the email to send, drafted            */
/* ------------------------------------------------------------------ */

const PITCH_PARTS = [
  ["Resume or profile", "Where you have worked and what you did there."],
  ["Proof of past work", "Repos, demos, blogs, docs or videos you made."],
  ["A one-page pitch", "The role you would create and why Studio1 needs it."],
  ["What you would do first", "Your first moves if you joined tomorrow."],
];

function PitchCta() {
  return (
    <PaperSection id="pitch" tone="night">
      <Container>
        <IndexBar index={4} name="Open pitch" aside={CAREERS_CONTACT_EMAIL} />
        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h2 className="text-[34px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[48px] lg:text-[60px]">
              Don&apos;t see your role?
              <br />
              <Accent>Pitch us one.</Accent>
            </h2>
            <p
              className={cn(
                "mt-6 max-w-[440px] text-[16px] leading-[1.6]",
                MUTED,
              )}
            >
              Tell us what you would build, write or run for developer products,
              and why Studio1 is the place to do it.
            </p>
            <a
              href={PITCH_MAILTO}
              className="group mt-9 inline-flex h-12 items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5"
              style={{ background: PAPER, color: INK }}
            >
              Write your pitch
              <span
                className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
                style={{ background: PRINT }}
              >
                <ArrowUpRight weight="bold" className="size-4" />
              </span>
            </a>
          </div>

          {/* The pitch, drafted as an email */}
          <div className="relative">
            <div className="bg-[var(--p-card)] ring-1 ring-inset ring-white/10">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="size-2.5 rounded-full bg-white/15"
                  />
                ))}
                <span className={cn("ml-3 text-[12px]", MUTED)}>
                  New message
                </span>
              </div>
              <dl className="border-b border-white/10 px-5 text-[13px]">
                <div className="flex gap-3 border-b border-white/10 py-3">
                  <dt className={cn("w-16 shrink-0", FAINT)}>To</dt>
                  <dd className="truncate font-medium">
                    {CAREERS_CONTACT_EMAIL}
                  </dd>
                </div>
                <div className="flex gap-3 py-3">
                  <dt className={cn("w-16 shrink-0", FAINT)}>Subject</dt>
                  <dd className="truncate font-medium">
                    Application: Open pitch
                  </dd>
                </div>
              </dl>
              <ol className="space-y-4 px-5 py-6">
                {PITCH_PARTS.map(([title, detail], index) => (
                  <li key={title} className="flex gap-3.5">
                    <span
                      className="mt-1 flex size-5 shrink-0 items-center justify-center text-[10px] font-semibold tabular-nums text-white"
                      style={{ background: PRINT }}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[15px] font-medium">
                        {title}
                      </span>
                      <span
                        className={cn("block text-[13px] leading-[1.5]", MUTED)}
                      >
                        {detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <span className={cn("text-[12px]", FAINT)}>
                  Reply in about 1 week if there is a fit
                </span>
                <a
                  href={PITCH_MAILTO}
                  className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white transition-[filter] hover:brightness-110"
                  style={{ background: PRINT }}
                >
                  Send
                  <PaperPlaneTilt weight="fill" className="size-3.5" />
                </a>
              </div>
            </div>
            <Cursor
              color={PAPER}
              className="pointer-events-none absolute -bottom-5 right-12 hidden sm:block"
            />
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type CareersPageProps = {
  jobOpenings: JobOpening[];
};

/** The careers page, set in the home page's paper design tokens. */
export function CareersPage({ jobOpenings }: CareersPageProps) {
  const [team, setTeam] = useState<TeamKey>("all");

  return (
    <div className="overflow-x-clip">
      <CareersHero jobs={jobOpenings} />
      <OpenRoles jobs={jobOpenings} team={team} onTeam={setTeam} />
      <WhyStudio1 />
      <HiringProcess />
      <PitchCta />
    </div>
  );
}
