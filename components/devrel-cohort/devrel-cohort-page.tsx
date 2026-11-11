"use client";

import {
  ArrowArcRight,
  ArrowUpRight,
  ArrowsLeftRight,
  ChatsCircle,
  Check,
  Code,
  Compass,
  FlagPennant,
  FolderOpen,
  GitBranch,
  GraduationCap,
  Handshake,
  Info,
  PaperPlaneTilt,
  PenNib,
  RocketLaunch,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import Logo from "@/components/ui/svgs/logo";
import { Hanging } from "@/components/careers/careers-extras";
import { SeeRolesButton, Underlined } from "@/components/careers/careers-page";
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
} from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import { CohortApplicationForm } from "@/components/devrel-cohort/application-form";
import {
  COHORT,
  COHORT_FAQS,
  COHORT_WEEKS,
  type CohortStatus,
} from "@/data/devrel-cohort";
import { CAREERS_CONTACT_EMAIL } from "@/lib/careers-mailto";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Glass card and engraved well, as on the careers page. */
const GLASS_CARD =
  "rounded-[6px] bg-[#fbf9f5] shadow-[0_20px_44px_-34px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.06]";
const WELL =
  "bg-[#f1ece4] shadow-[inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06),inset_0_-1px_0_rgba(255,255,255,0.8)]";
const INSET_WHITE =
  "bg-white shadow-[inset_0_2px_6px_rgba(20,20,20,0.06),inset_0_1px_2px_rgba(20,20,20,0.05)]";

const pad = (value: number) => String(value).padStart(2, "0");

const STATUS_LABEL: Record<CohortStatus, string> = {
  open: "Applications open",
  soon: "Applications open soon",
  closed: "Applications closed",
};

function formatDate(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const START_LABEL = formatDate(COHORT.startDate) || "Announced soon";
const APPLY_BY_LABEL = formatDate(COHORT.applyBy) || "Rolling";

const APPLY_SUBJECT = `Application: DevRel ${COHORT.edition}`;

/** The application, pre-filled: who you are, your work and why DevRel. */
const APPLY_MAILTO = `mailto:${CAREERS_CONTACT_EMAIL}?subject=${encodeURIComponent(
  APPLY_SUBJECT,
)}&body=${encodeURIComponent(
  "Hi Studio1 team,\n\nI would like to apply for the DevRel Cohort.\n\nAbout me (LinkedIn / GitHub / X):\n\nSomething I built, wrote or recorded:\n\nWhy I want to work in DevRel:\n\nOne developer tool I love, and why:\n\n",
)}`;

/** A link to apply: the pre-filled email unless another href is given. */
function ApplyLink({
  href = APPLY_MAILTO,
  className,
  style,
  children,
}: {
  href?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}

/** Ink pill with an orange arrow disc, as used across the paper pages. */
function ApplyPill({
  label = "Apply now",
  tone = "ink",
  href,
}: {
  label?: string;
  tone?: "ink" | "paper";
  href?: string;
}) {
  return (
    <ApplyLink
      href={href}
      className="group inline-flex h-12 items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
      style={
        tone === "ink"
          ? { background: INK, color: PAPER }
          : { background: PAPER, color: INK }
      }
    >
      {label}
      <span
        className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
        style={{ background: PRINT }}
      >
        <ArrowUpRight weight="bold" className="size-4" />
      </span>
    </ApplyLink>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: headline left, a cohort badge on a lanyard right              */
/* ------------------------------------------------------------------ */

/** One icon per week on the badge track, in program order. */
const WEEK_ICONS: Icon[] = [Compass, Code, VideoCamera, RocketLaunch];

/** Seconds before the badge track draws: after the badge drops and settles. */
const TRACK_DELAY = 1.4;

/** A conference-style participant badge, hung from the careers lanyard. */
function CohortBadge() {
  const reduceMotion = useReducedMotion();
  const details = [
    ["Starts", START_LABEL],
    ["Format", COHORT.format],
    ["Length", "4 weeks"],
    ["Apply by", APPLY_BY_LABEL],
  ];

  return (
    <div className="relative w-full overflow-hidden bg-white text-[#141414] shadow-[0_44px_80px_-44px_rgba(20,20,20,0.55)] ring-1 ring-inset ring-[#141414]/[0.08]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div className="relative px-6 pb-6 pt-11 sm:px-8">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-[#141414]/55">
          <span>Studio1 / DevRel Cohort</span>
          <span className="tabular-nums">{COHORT.edition}</span>
        </div>

        <p className="mt-8 text-[13px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
          Hello, I&apos;m
        </p>
        {/* The name line, waiting for the participant's name */}
        <div className="mt-2 flex items-end gap-1.5 border-b-[1.5px] border-dashed border-[#141414]/25 pb-2">
          <span className="text-[44px] font-medium leading-none tracking-[-0.06em] text-[#141414]/20">
            you
          </span>
          <motion.span
            aria-hidden
            className="mb-1.5 h-9 w-[3px]"
            style={{ background: PRINT }}
            animate={reduceMotion ? undefined : { opacity: [1, 1, 0, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              times: [0, 0.5, 0.5, 1],
            }}
          />
        </div>
        <p className="mt-3 text-[15px] font-medium tracking-[-0.02em]">
          Developer Advocate{" "}
          <span className="text-[#141414]/45">(in training)</span>
        </p>

        {/* The four weeks as one track: the line draws in once the badge
            settles, lighting each week's node as it passes */}
        <div className="mt-7">
          <div className="flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.14em]">
            <span className="text-[#141414]/40">Your four weeks</span>
            <span className="flex items-center gap-1" style={{ color: PRINT }}>
              <FlagPennant aria-hidden weight="fill" className="size-3" />
              Demo day
            </span>
          </div>
          <ol
            aria-label="Program weeks"
            className="relative mt-3.5 grid grid-cols-4"
          >
            <span
              aria-hidden
              className="absolute inset-x-[12.5%] top-[17px] h-[2px] rounded-full bg-[#141414]/10"
            />
            <motion.span
              aria-hidden
              className="absolute inset-x-[12.5%] top-[17px] h-[2px] origin-left rounded-full"
              style={{ background: PRINT }}
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, ease: EASE, delay: TRACK_DELAY }}
            />
            {COHORT_WEEKS.map((week, index) => {
              const Glyph = WEEK_ICONS[index] ?? Compass;
              return (
                <li
                  key={week.theme}
                  className="relative flex flex-col items-center text-center"
                >
                  <motion.span
                    className="flex size-9 items-center justify-center rounded-full bg-white ring-[1.5px] ring-inset ring-[#f97316] shadow-[0_0_0_4px_#ffffff,0_6px_14px_-8px_rgba(249,115,22,0.7)]"
                    style={{ color: PRINT }}
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 18,
                      delay: TRACK_DELAY + index * 0.36,
                    }}
                  >
                    <Glyph aria-hidden weight="bold" className="size-4" />
                  </motion.span>
                  <span className="mt-2.5 text-[10px] font-semibold uppercase tabular-nums tracking-[0.12em] text-[#141414]/40">
                    Week {index + 1}
                  </span>
                  <span className="mt-0.5 text-[13px] font-medium leading-tight tracking-[-0.01em]">
                    {week.short}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#141414]/40">
                {label}
              </dt>
              <dd className="mt-0.5 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Role band along the foot, printed orange */}
      <div
        className="relative isolate flex items-center justify-between overflow-hidden px-6 py-4 text-white sm:px-8"
        style={{ background: PRINT }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        <span className="text-[22px] font-semibold uppercase leading-none tracking-[0.12em]">
          Participant
        </span>
        <Logo className="size-9 shrink-0 brightness-0 invert" />
      </div>
    </div>
  );
}

function CohortHero() {
  const facts = [
    ["4 wks", "Live, hands-on program"],
    ["4", "Portfolio pieces you ship"],
    [`Top ${COHORT.interviewSlots}`, "Interviewed at Studio1"],
    ["35+", "Devtool teams we've shipped for"],
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_bottom,rgba(20,20,20,0.06)_1px,transparent_1px)] [background-size:100%_48px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]"
      />

      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-16 gap-y-20 pb-20 pt-32 md:pt-40 lg:min-h-[calc(100svh/var(--s1-zoom,1))] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-16">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium">
            <span className="relative flex size-2">
              {COHORT.status === "open" ? (
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:hidden"
                  style={{ background: PRINT }}
                />
              ) : null}
              <span
                className="relative size-2 rounded-full"
                style={{
                  background:
                    COHORT.status === "closed" ? "rgba(20,20,20,0.3)" : PRINT,
                }}
              />
            </span>
            {STATUS_LABEL[COHORT.status]}
            <span aria-hidden className="text-[#141414]/30">
              —
            </span>
            <span className="text-[#141414]/60">DevRel {COHORT.edition}</span>
          </p>

          <h1 className="mt-8 text-[44px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] xl:text-[80px]">
            Learn DevRel by
            <br />
            <Underlined>doing</Underlined> the work
            <span style={{ color: PRINT }}>.</span>
          </h1>

          <p className="mt-8 max-w-[680px] text-[16px] leading-[1.7] text-[#141414]/70 sm:text-[17px]">
            A month-long, hands-on cohort run by the Studio1 team. You learn
            what developer relations really looks like, from tutorials and demos
            to docs, video, community and launches, and you ship real work every
            week. The strongest participants get interviews at Studio1 and
            referrals to teams in our partner network.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-5">
            <SeeRolesButton label="Apply to the cohort" href="#apply" />
            <a
              href="#curriculum"
              className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
            >
              or see the curriculum
              <ArrowUpRight
                weight="bold"
                className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>

          <motion.dl
            className={cn(
              "mt-14 grid max-w-[680px] grid-cols-2 gap-2 p-2 sm:grid-cols-4",
              GLASS_CARD,
            )}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
          >
            {facts.map(([value, label], index) => (
              <motion.div
                key={label}
                className={cn("rounded-[6px] px-4 py-4", WELL)}
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.97 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.6, ease: EASE },
                  },
                }}
              >
                <dd
                  className="whitespace-nowrap text-[26px] font-medium leading-none tracking-[-0.05em] tabular-nums md:text-[30px]"
                  style={index === 2 ? { color: PRINT } : undefined}
                >
                  {value}
                </dd>
                <dt className={cn("mt-2 text-[12.5px] leading-snug", MUTED)}>
                  {label}
                </dt>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        {/* Below lg the badge sits under the copy: clip the lanyard at the
            top of its own row so it doesn't cross the text, and shrink the
            fixed-width badge to fit narrow phones. */}
        <div className="max-lg:pt-[150px] max-lg:[clip-path:inset(0_-100vw_-100vw_-100vw)] max-[440px]:[zoom:0.85]">
          <Hanging>
            <CohortBadge />
          </Hanging>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — About the cohort: sticky headline, numbered pillars            */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {
    title: "Learn what the job really is",
    description:
      "DevRel is teaching, building in public, community and product feedback. You see how each part works at real devtool companies, and how teams measure it.",
  },
  {
    title: "Ship real work every week",
    description:
      "Every week ends with something public: a teardown, a tutorial with a repo, a demo video, a launch plan. Each one is reviewed by people who do this for a living.",
  },
  {
    title: "Get in front of teams that hire",
    description: `The top ${COHORT.interviewSlots} participants get interview opportunities at Studio1. We also refer strong participants to devtool, AI and open-source companies in our partner network.`,
  },
  {
    title: "Learn alongside a selected group",
    description:
      "Seats go to people we select, so feedback stays personal and you meet peers breaking into DevRel at the same time as you.",
  },
];

const SKILLS = [
  "Tutorials",
  "Demo apps",
  "Docs",
  "Video",
  "Community",
  "Launches",
  "Metrics",
  "Product feedback",
];

function AboutCohort() {
  return (
    <PaperSection id="about" tone="paper">
      <Container>
        <IndexBar
          index={1}
          name="About the cohort"
          aside={`4 weeks · ${COHORT.format}`}
        />
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
              A month to learn the job <Accent>DevRel teams hire for</Accent>
            </h2>
            <div
              className={cn(
                "mt-6 max-w-[480px] space-y-4 text-[16px] leading-[1.65]",
                MUTED,
              )}
            >
              <p>
                Developer relations is how developer-tool companies earn
                developers&apos; trust: teaching, building in public, writing
                docs people can follow, showing up in communities and bringing
                feedback back to the product team.
              </p>
              <p>
                Most people learn it by accident, one blog post or meetup talk
                at a time. The Studio1 DevRel Cohort teaches it on purpose, in
                four weeks, with the team that does this work every day for
                devtool, AI and open-source companies.
              </p>
            </div>
            <ul role="list" className="mt-8 flex max-w-[460px] flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full bg-white/70 px-3 py-1 text-[12px] font-medium ring-1 ring-inset ring-[#141414]/10"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>

          <ol className="grid gap-3">
            {PILLARS.map((pillar, index) => (
              <motion.li
                key={pillar.title}
                className={cn("group p-2", GLASS_CARD)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: EASE, delay: index * 0.05 }}
              >
                <div
                  className={cn(
                    "grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 rounded-[6px] p-5 md:grid-cols-[60px_minmax(0,1fr)] md:p-6",
                    INSET_WHITE,
                  )}
                >
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-[6px] text-[15px] font-medium tabular-nums text-[#141414]/40 transition-colors duration-500 group-hover:text-[#f97316] md:size-[52px]",
                      WELL,
                    )}
                  >
                    {pad(index + 1)}
                  </span>
                  <div>
                    <h3 className="text-[21px] font-medium leading-tight tracking-[-0.035em] md:text-[24px]">
                      {pillar.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-2.5 max-w-[520px] text-[15px] leading-[1.6]",
                        MUTED,
                      )}
                    >
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Curriculum: one row per week, topics and what you ship         */
/* ------------------------------------------------------------------ */

function Curriculum() {
  const reduceMotion = useReducedMotion();
  return (
    <PaperSection id="curriculum" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar index={2} name="Curriculum" aside="One theme a week" />
        <SectionHead
          title={
            <>
              Four weeks, four <Accent>things you ship</Accent>
            </>
          }
          description="Each week pairs live sessions with a real assignment. By demo day you have a body of public work, not a certificate."
        />

        <ol className="relative mt-12 grid gap-3">
          {COHORT_WEEKS.map((week, index) => (
            <motion.li
              key={week.theme}
              className={cn("p-2", GLASS_CARD)}
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <div
                className={cn(
                  "grid gap-6 rounded-[6px] p-5 md:p-7 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-10",
                  INSET_WHITE,
                )}
              >
                {/* Week number and theme */}
                <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                  <span
                    className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[6px] text-[18px] font-semibold tabular-nums text-white"
                    style={{
                      background:
                        "linear-gradient(150deg,#fb923c,#f97316 50%,#ea580c)",
                    }}
                  >
                    W{index + 1}
                  </span>
                  <div>
                    <p
                      className="text-[11px] font-medium uppercase tracking-[0.14em]"
                      style={{ color: PRINT }}
                    >
                      Week {pad(index + 1)}
                    </p>
                    <p className="mt-1 text-[15px] font-medium">{week.theme}</p>
                  </div>
                </div>

                {/* What it covers */}
                <div>
                  <h3 className="text-[22px] font-medium leading-tight tracking-[-0.035em] md:text-[26px]">
                    {week.title}
                  </h3>
                  <ul role="list" className="mt-4 space-y-2.5">
                    {week.topics.map((topic) => (
                      <li
                        key={topic}
                        className={cn(
                          "flex gap-3 text-[15px] leading-[1.55]",
                          MUTED,
                        )}
                      >
                        <Check
                          aria-hidden
                          weight="bold"
                          className="mt-[5px] size-3.5 shrink-0"
                          style={{ color: PRINT }}
                        />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* The week's deliverable */}
                <div
                  className={cn(
                    "flex flex-col justify-between gap-5 rounded-[6px] p-5",
                    WELL,
                  )}
                >
                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#141414]/55">
                      <ArrowArcRight
                        aria-hidden
                        weight="bold"
                        className="size-3.5"
                        style={{ color: PRINT }}
                      />
                      You ship
                    </p>
                    <p className="mt-3 text-[15px] font-medium leading-[1.5] tracking-[-0.01em]">
                      {week.ship}
                    </p>
                  </div>
                  {index === COHORT_WEEKS.length - 1 ? (
                    <span
                      className="inline-flex w-fit items-center gap-1.5 px-1.5 py-[3px] text-[11px] font-medium leading-none text-white"
                      style={{ background: PRINT }}
                    >
                      Demo day
                    </span>
                  ) : null}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — After the cohort: interviews, referrals, portfolio             */
/* ------------------------------------------------------------------ */

const OUTCOMES: { icon: Icon; title: string; description: string }[] = [
  {
    icon: Handshake,
    title: "Partner referrals",
    description:
      "Studio1 works with devtool, AI and open-source companies. When they hire for DevRel, we refer participants whose work fits the role.",
  },
  {
    icon: FolderOpen,
    title: "A public portfolio",
    description:
      "Four pieces of work you keep: a product teardown, a tutorial with a repo, a demo video and a launch plan.",
  },
  {
    icon: ChatsCircle,
    title: "Practitioner feedback",
    description:
      "Reviews on every assignment from people who ship DevRel work for clients every week.",
  },
  {
    icon: UsersThree,
    title: "Peers in the field",
    description:
      "A group of people breaking into DevRel at the same time as you, to share notes and openings with.",
  },
];

function Outcomes() {
  return (
    <PaperSection id="outcomes" tone="paper">
      <Container>
        <IndexBar
          index={3}
          name="After the cohort"
          aside="Interviews · Referrals · Portfolio"
        />
        <SectionHead
          title={
            <>
              Where the cohort can <Accent>take you</Accent>
            </>
          }
          description="Demo day isn't the finish line. It's where we see who is ready for a DevRel role, at Studio1 or with a team we know."
        />

        <div className="mt-12 grid gap-2 lg:grid-cols-3 lg:grid-rows-2">
          {/* The headline outcome, printed on the brand orange */}
          <motion.div
            className="relative isolate flex flex-col justify-between overflow-hidden rounded-[6px] p-7 text-white md:p-9 lg:row-span-2"
            style={{ background: PRINT }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-40 mix-blend-multiply"
              style={{ backgroundImage: GRAIN }}
            />
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
              <span>Interviews at Studio1</span>
              <Logo className="size-8 brightness-0 invert" />
            </div>
            <div className="mt-12">
              <p className="text-[18px] font-medium text-white/85">Top</p>
              <p className="text-[96px] font-medium leading-[0.85] tracking-[-0.07em] tabular-nums md:text-[120px]">
                {COHORT.interviewSlots}
              </p>
              <p className="mt-6 max-w-[340px] text-[16px] leading-[1.55] text-white/90">
                The strongest participants are invited to interview with the
                Studio1 team. We plan to hire from the cohort, so this is a real
                shot at a DevRel role.
              </p>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
                Based on your four weeks of work and demo day
              </p>
            </div>
          </motion.div>

          {OUTCOMES.map(({ icon: Glyph, title, description }, index) => (
            <motion.div
              key={title}
              className={cn("flex flex-col gap-5 p-6 md:p-7", CELL)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.7,
                ease: EASE,
                delay: 0.08 * (index + 1),
              }}
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-[6px] text-[#f97316]",
                  WELL,
                )}
              >
                <Glyph weight="duotone" className="size-5" />
              </span>
              <div>
                <h3 className="text-[20px] font-medium leading-tight tracking-[-0.035em]">
                  {title}
                </h3>
                <p className={cn("mt-2 text-[14.5px] leading-[1.6]", MUTED)}>
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The honest small print */}
        <div className="mt-6 flex gap-4 rounded-[6px] border-[1.5px] border-dashed border-[#141414]/20 p-5 md:items-center md:p-6">
          <Info
            aria-hidden
            weight="duotone"
            className="size-5 shrink-0 md:size-6"
            style={{ color: PRINT }}
          />
          <p className={cn("text-[14.5px] leading-[1.6]", MUTED)}>
            <span className="font-medium text-[#141414]">
              Not a job guarantee.
            </span>{" "}
            Interviews and referrals are earned through the work you ship in the
            cohort. Hiring depends on open roles and on each company&apos;s own
            process.
          </p>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Who should apply                                               */
/* ------------------------------------------------------------------ */

const PROFILES: { icon: Icon; title: string; description: string }[] = [
  {
    icon: Code,
    title: "Developers who like explaining things",
    description: "You answer questions in Discord before anyone asks you to.",
  },
  {
    icon: PenNib,
    title: "Technical writers who want to build more",
    description: "You write well and want to ship the demo, not just the post.",
  },
  {
    icon: GraduationCap,
    title: "Students and new grads who build in public",
    description: "Side projects, hackathons, a blog nobody asked you to start.",
  },
  {
    icon: GitBranch,
    title: "Open-source contributors and organizers",
    description: "You run a meetup, maintain a repo or help a community grow.",
  },
  {
    icon: ArrowsLeftRight,
    title: "Engineers moving into DevRel",
    description: "You've shipped product and want a role closer to developers.",
  },
];

const LOOK_FOR = [
  [
    "Proof over polish",
    "Something you built, wrote or recorded, even if it's small.",
  ],
  [
    "Comfort with code",
    "You can read docs, run a project and debug your way through a setup.",
  ],
  ["Curiosity", "You try new developer tools, AI and open source for fun."],
  [
    "Clear communication",
    "You can explain a technical idea in writing or on camera.",
  ],
  [
    "Time to show up",
    COHORT.commitment
      ? `About ${COHORT.commitment} for live sessions and the weekly assignment.`
      : "For live sessions and the weekly assignment, all four weeks.",
  ],
];

function WhoShouldApply() {
  return (
    <PaperSection id="who" tone="paper">
      <Container>
        <IndexBar
          index={4}
          name="Who should apply"
          aside="No DevRel experience needed"
        />
        <SectionHead
          title={
            <>
              Built for people who <Accent>already help developers</Accent>,
              officially or not
            </>
          }
          description="You don't need the title yet. You need to like code, like people and want to do both for a living."
        />

        <div className="mt-12 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ul role="list" className="grid gap-2 sm:grid-cols-2">
            {PROFILES.map(({ icon: Glyph, title, description }, index) => (
              <li
                key={title}
                className={cn(
                  "flex gap-4 p-5",
                  CELL,
                  index === PROFILES.length - 1 && "sm:col-span-2",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-[6px] text-[#f97316]",
                    WELL,
                  )}
                >
                  <Glyph weight="duotone" className="size-[18px]" />
                </span>
                <div>
                  <h3 className="text-[16px] font-medium leading-snug tracking-[-0.02em]">
                    {title}
                  </h3>
                  <p className={cn("mt-1 text-[14px] leading-[1.55]", MUTED)}>
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className={cn("p-2", GLASS_CARD)}>
            <div
              className={cn("h-full rounded-[6px] p-6 md:p-7", INSET_WHITE)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#141414]/55">
                What we look for
              </p>
              <ol className="mt-5 space-y-4">
                {LOOK_FOR.map(([title, detail], index) => (
                  <li key={title} className="flex gap-3.5">
                    <span
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-[10px] font-semibold tabular-nums text-white"
                      style={{ background: PRINT }}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[15.5px] font-medium tracking-[-0.01em]">
                        {title}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[14px] leading-[1.55]",
                          MUTED,
                        )}
                      >
                        {detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — How selection works: a timeline that draws in                  */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    when: "Now",
    title: "Apply",
    description:
      "Send your profile, links to your work and a few lines on why you want to do DevRel.",
  },
  {
    when: "After you apply",
    title: "We read every application",
    description:
      "The team reviews each one and looks closely at the work you link to.",
  },
  {
    when: "If shortlisted",
    title: "A short chat",
    description:
      "A quick conversation so we can confirm the fit and that the timing works for you.",
  },
  {
    when: `Starts: ${START_LABEL}`,
    title: "Join the cohort",
    description:
      "Selected participants get the schedule, the community invite and their first assignment.",
  },
];

function Selection() {
  const reduceMotion = useReducedMotion();
  return (
    <PaperSection id="selection" tone="paper">
      <Container>
        <IndexBar
          index={5}
          name="How selection works"
          aside={
            COHORT.seats > 0
              ? `${COHORT.seats} seats · Apply by ${APPLY_BY_LABEL}`
              : `Apply by: ${APPLY_BY_LABEL}`
          }
        />
        <SectionHead
          title={
            <>
              A short process, built around <Accent>your work</Accent>
            </>
          }
          description="Seats are limited, so we pick participants on what they have already made, not on titles or degrees."
        />

        <motion.ol
          className="relative mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={{ visible: { transition: { staggerChildren: 0.35 } } }}
        >
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              className={cn("relative flex flex-col p-2", GLASS_CARD)}
              variants={{
                hidden: reduceMotion ? {} : { opacity: 0, y: 24 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, ease: EASE },
                },
              }}
            >
              <div
                className={cn(
                  "flex h-full flex-col rounded-[6px] p-5",
                  INSET_WHITE,
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "relative flex size-11 items-center justify-center overflow-hidden rounded-[6px] text-[14px] font-semibold tabular-nums",
                      WELL,
                    )}
                  >
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 bg-[#f97316]"
                      variants={{
                        hidden: reduceMotion ? {} : { opacity: 0, scale: 0.4 },
                        visible: {
                          opacity: 1,
                          scale: 1,
                          transition: {
                            duration: 0.5,
                            ease: EASE,
                            delay: 0.25,
                          },
                        },
                      }}
                    />
                    <span className="relative text-white">{index + 1}</span>
                  </span>
                  {index < STEPS.length - 1 ? (
                    <motion.span
                      aria-hidden
                      className="hidden h-px flex-1 origin-left bg-[#f97316]/50 lg:ml-4 lg:block"
                      variants={{
                        hidden: reduceMotion ? {} : { scaleX: 0 },
                        visible: {
                          scaleX: 1,
                          transition: {
                            duration: 0.6,
                            ease: EASE,
                            delay: 0.45,
                          },
                        },
                      }}
                    />
                  ) : null}
                </div>
                <p
                  className="mt-6 text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: PRINT }}
                >
                  {step.when}
                </p>
                <h3 className="mt-2 text-[19px] font-medium leading-tight tracking-[-0.035em]">
                  {step.title}
                </h3>
                <p className={cn("mt-2 text-[14px] leading-[1.6]", MUTED)}>
                  {step.description}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 06 — FAQ                                                            */
/* ------------------------------------------------------------------ */

function CohortFaq() {
  return (
    <PaperSection id="faq" tone="paper">
      <Container>
        <PaperServiceFaq
          index={6}
          items={COHORT_FAQS}
          subtitle="What to expect from the cohort, the selection and what comes after."
          action={<ApplyPill label="Apply now" href="#apply" />}
        />
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 07 — Apply (night band): the form, or the application as an email   */
/* ------------------------------------------------------------------ */

const APPLY_PARTS = [
  ["About you", "Your LinkedIn, GitHub or X, whichever shows you best."],
  [
    "Something you made",
    "A repo, demo, blog post, talk or video. Small is fine.",
  ],
  ["Why DevRel", "A few lines on why you want to do this work."],
  ["A tool you love", "One developer tool you'd happily teach, and why."],
];

/** The application drafted as an email: the fallback when the form is off. */
function EmailDraft() {
  return (
    <div className="relative">
      <div className="bg-[var(--p-card)] ring-1 ring-inset ring-white/10">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-2.5 rounded-full bg-white/15" />
          ))}
          <span className={cn("ml-3 text-[12px]", MUTED)}>New application</span>
        </div>
        <dl className="border-b border-white/10 px-5 text-[13px]">
          <div className="flex gap-3 border-b border-white/10 py-3">
            <dt className={cn("w-16 shrink-0", FAINT)}>To</dt>
            <dd className="truncate font-medium">{CAREERS_CONTACT_EMAIL}</dd>
          </div>
          <div className="flex gap-3 py-3">
            <dt className={cn("w-16 shrink-0", FAINT)}>Subject</dt>
            <dd className="truncate font-medium">{APPLY_SUBJECT}</dd>
          </div>
        </dl>
        <ol className="space-y-4 px-5 py-6">
          {APPLY_PARTS.map(([title, detail], index) => (
            <li key={title} className="flex gap-3.5">
              <span
                className="mt-1 flex size-5 shrink-0 items-center justify-center text-[10px] font-semibold tabular-nums text-white"
                style={{ background: PRINT }}
              >
                {index + 1}
              </span>
              <span>
                <span className="block text-[15px] font-medium">{title}</span>
                <span className={cn("block text-[13px] leading-[1.5]", MUTED)}>
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
          <span className={cn("text-[12px]", FAINT)}>
            We read every application
          </span>
          <ApplyLink
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white transition-[filter] hover:brightness-110"
            style={{ background: PRINT }}
          >
            Send
            <PaperPlaneTilt weight="fill" className="size-3.5" />
          </ApplyLink>
        </div>
      </div>
      <Cursor
        color={PAPER}
        className="pointer-events-none absolute -bottom-5 right-12 hidden sm:block"
      />
    </div>
  );
}

const HEADLINES = {
  open: ["Ready to start?", `Apply for ${COHORT.edition}.`],
  soon: ["Applications open soon.", "Get on the list."],
  closed: ["Applications are closed.", "Join the next one."],
} as const;

function ApplyCta({ applicationsEnabled }: { applicationsEnabled: boolean }) {
  const open = COHORT.status === "open";
  const showForm = open && applicationsEnabled;
  const [line1, line2] = HEADLINES[COHORT.status];
  return (
    <PaperSection id="apply" tone="night" className="scroll-mt-24">
      <Container>
        <IndexBar index={7} name="Apply" aside={CAREERS_CONTACT_EMAIL} />
        <div
          className={cn(
            "mt-8 grid gap-12",
            showForm
              ? "items-start lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
              : "items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20",
          )}
        >
          <div className={showForm ? "lg:sticky lg:top-28" : undefined}>
            <h2 className="text-[34px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[48px] lg:text-[60px]">
              {line1}
              <br />
              <Accent>{line2}</Accent>
            </h2>
            <p
              className={cn(
                "mt-6 max-w-[440px] text-[16px] leading-[1.6]",
                MUTED,
              )}
            >
              {!open
                ? "Send us your details and we'll reach out when applications open."
                : showForm
                  ? "It takes about five minutes. Tell us who you are, show us something you made and tell us why DevRel."
                  : "It takes about ten minutes. Tell us who you are, show us something you made and tell us why DevRel."}
            </p>
            {showForm ? null : (
              <div className="mt-9">
                <ApplyPill
                  tone="paper"
                  label={open ? "Apply to the cohort" : "Get notified"}
                />
              </div>
            )}
            <dl className="mt-10 grid max-w-[440px] grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6 text-[14px]">
              <div>
                <dt className={cn("text-[12px]", FAINT)}>Starts</dt>
                <dd className="mt-1 font-medium">{START_LABEL}</dd>
              </div>
              <div>
                <dt className={cn("text-[12px]", FAINT)}>Apply by</dt>
                <dd className="mt-1 font-medium">{APPLY_BY_LABEL}</dd>
              </div>
              <div>
                <dt className={cn("text-[12px]", FAINT)}>Length</dt>
                <dd className="mt-1 font-medium">4 weeks</dd>
              </div>
              <div>
                <dt className={cn("text-[12px]", FAINT)}>Format</dt>
                <dd className="mt-1 font-medium">{COHORT.format}</dd>
              </div>
            </dl>
          </div>

          {showForm ? <CohortApplicationForm /> : <EmailDraft />}
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** The DevRel Cohort page, set in the home page's paper design tokens. */
export function DevRelCohortPage({
  applicationsEnabled,
}: {
  /** Show the on-page form; otherwise applications go by email. */
  applicationsEnabled: boolean;
}) {
  return (
    <div className="overflow-x-clip">
      <CohortHero />
      <AboutCohort />
      <Curriculum />
      <Outcomes />
      <WhoShouldApply />
      <Selection />
      <CohortFaq />
      <ApplyCta applicationsEnabled={applicationsEnabled} />
    </div>
  );
}
