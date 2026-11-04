"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChartBar,
  Compass,
  Handshake,
  ListChecks,
  MagnifyingGlass,
  Megaphone,
  PencilSimpleLine,
  RocketLaunch,
  SealCheck,
  Strategy,
  UsersThree,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import { DeparturesBoard } from "@/components/hackathons/departures-board";
import {
  LiveSpotlight,
  type Spotlight,
} from "@/components/hackathons/spotlight";
import { TrackRecord } from "@/components/hackathons/track-record";
import type { PastPartnership } from "@/data/hackathons";
import type { IndiaMap } from "@/lib/india-map";
import {
  Accent,
  CELL,
  FAINT,
  IndexBar,
  MUTED,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import {
  HackathonCardLink,
  HackathonFaqList,
  InkPill,
  RULED_LINES,
  Underlined,
  pad,
} from "@/components/hackathons/hackathon-ui";
import type { HackathonFaq, HackathonFormat } from "@/data/hackathons";
import {
  FORMAT_LABEL,
  type HackathonCard,
  type HackathonStatus,
} from "@/lib/hackathons";
import { GRAIN, INK, PAPER, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const PARTNER_CALL = "https://cal.com/studio1/collab";

type HackathonsPageProps = {
  cards: HackathonCard[];
  /** The live event, else the next one; null when nothing is scheduled. */
  spotlight: Spotlight | null;
  /** Hackathons Studio1 partnered on before, with their map. */
  track: { partnerships: PastPartnership[]; map: IndiaMap };
  /** Prize money across live and upcoming events, formatted. */
  openPrizes: string;
};

/* ------------------------------------------------------------------ */
/* Hero: headline, then every event on a split-flap departures board  */
/* ------------------------------------------------------------------ */

function BrowseButton() {
  const reduceMotion = useReducedMotion();
  const ease = [0.65, 0, 0.35, 1] as const;
  return (
    <motion.a
      href="#hackathons"
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
        Browse hackathons
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

function HackathonsHero({ cards, spotlight, openPrizes }: HackathonsPageProps) {
  const reduceMotion = useReducedMotion();
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
      <div aria-hidden className={RULED_LINES} />

      <Container className="pb-20 pt-32 md:pt-40 lg:pb-24">
        <div
          className={cn(
            "grid gap-x-16 gap-y-12",
            spotlight &&
              "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center",
          )}
        >
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
              Studio1 Hackathons
              <span aria-hidden className="text-[#141414]/30">
                —
              </span>
              <span className="text-[#141414]/60">
                Online · In person · Hybrid
              </span>
            </p>
            <h1 className="mt-8 text-[44px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] xl:text-[76px]">
              Your next build
              <br />
              is <Underlined>boarding</Underlined>
              <span style={{ color: PRINT }}>.</span>
            </h1>
            <p className="mt-8 max-w-[460px] text-[16px] leading-[1.7] text-[#141414]/70 sm:text-[17px]">
              Weekend sprints and month-long challenges with devtool, AI, and
              open-source teams. Pick a departure, register, finish the pre-hack
              tasks, and you&apos;re ready to ship.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-5">
              <BrowseButton />
              <a
                href="#partners"
                className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
              >
                or host one with us
                <ArrowUpRight
                  weight="bold"
                  className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </div>

          {spotlight ? <LiveSpotlight spotlight={spotlight} /> : null}
        </div>

        <motion.div
          className="mt-14 md:mt-16"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        >
          <DeparturesBoard cards={cards} openPrizes={openPrizes} />
        </motion.div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Every hackathon, filterable                                    */
/* ------------------------------------------------------------------ */

type StatusFilter = HackathonStatus | "all";
type FormatFilter = HackathonFormat | "all";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
  { key: "all", label: "Any format" },
  { key: "online", label: FORMAT_LABEL.online },
  { key: "in-person", label: FORMAT_LABEL["in-person"] },
  { key: "hybrid", label: FORMAT_LABEL.hybrid },
];

function HackathonDirectory({ cards }: { cards: HackathonCard[] }) {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [query, setQuery] = useState("");

  const search = query.trim().toLowerCase();
  const matchesSearch = (card: HackathonCard) =>
    !search ||
    [card.name, card.tagline, card.summary, card.location]
      .join(" ")
      .toLowerCase()
      .includes(search);
  const matchesFormat = (card: HackathonCard) =>
    format === "all" || card.format === format;
  const matchesStatus = (card: HackathonCard, key: StatusFilter) =>
    key === "all" || card.status === key;

  const shown = cards.filter(
    (card) =>
      matchesStatus(card, status) && matchesFormat(card) && matchesSearch(card),
  );

  const filtered = status !== "all" || format !== "all" || search !== "";
  const reset = () => {
    setStatus("all");
    setFormat("all");
    setQuery("");
  };

  return (
    <PaperSection id="hackathons" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={1}
          name="Hackathons"
          aside={`${cards.length} events · newest first`}
        />
        <SectionHead
          title={
            <>
              Every Studio1 hackathon, <Accent>in one place</Accent>
            </>
          }
          description="Live and upcoming events come first. Past events stay up with their tracks, rules, and prizes."
        />

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label="Filter hackathons by status"
            className="flex flex-wrap gap-2"
          >
            {STATUS_FILTERS.map(({ key, label }) => {
              // Counts respect the other filters, so they match what you'd see.
              const total = cards.filter(
                (card) =>
                  matchesStatus(card, key) &&
                  matchesFormat(card) &&
                  matchesSearch(card),
              ).length;
              const active = key === status;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] px-5 text-[14px] font-medium transition-colors duration-300",
                    active
                      ? "border-[#141414] bg-[#141414] text-[#f4efe7]"
                      : "border-[#141414]/20 hover:border-[#141414] hover:bg-white",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      active ? "text-[#f97316]" : FAINT,
                    )}
                  >
                    {pad(total)}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block w-full lg:w-[320px]">
            <span className="sr-only">Search hackathons</span>
            <MagnifyingGlass
              weight="bold"
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#141414]/45"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hackathons"
              className="h-11 w-full rounded-full bg-white/80 pl-11 pr-4 text-[14px] outline-none ring-1 ring-inset ring-[#141414]/15 transition-shadow placeholder:text-[#141414]/40 focus:bg-white focus:ring-2 focus:ring-[#f97316] [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
        </div>

        <div
          role="group"
          aria-label="Filter hackathons by format"
          className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-[13px] font-medium"
        >
          <span className={cn("mr-2", MUTED)}>Format</span>
          {FORMAT_FILTERS.map(({ key, label }) => {
            const active = key === format;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFormat(key)}
                aria-pressed={active}
                className={cn(
                  "rounded-[4px] px-2.5 py-1.5 transition-colors",
                  active
                    ? "bg-white text-[#141414] ring-1 ring-inset ring-[#141414]/15"
                    : "text-[#141414]/55 hover:text-[#141414]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {shown.length > 0 ? (
          <motion.ul
            key={`${status}-${format}-${search}`}
            role="list"
            className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {shown.map((card) => (
              <motion.li
                key={card.slug}
                className="min-w-0"
                variants={{
                  hidden: reduceMotion ? {} : { opacity: 0, y: 14 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: EASE },
                  },
                }}
              >
                <HackathonCardLink card={card} />
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <div
            className={cn(
              "mt-8 flex flex-col items-center gap-5 px-6 py-14 text-center",
              CELL,
            )}
          >
            <p className="text-[18px] font-medium tracking-[-0.02em]">
              No hackathons match those filters.
            </p>
            {filtered ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-5 text-[14px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7]"
              >
                <X weight="bold" className="size-3.5" />
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — How it works, for participants                                 */
/* ------------------------------------------------------------------ */

const PARTICIPANT_STEPS: { icon: Icon; title: string; description: string }[] =
  [
    {
      icon: Compass,
      title: "Pick a hackathon",
      description:
        "Choose a live or upcoming event, and the track that fits what you want to build.",
    },
    {
      icon: PencilSimpleLine,
      title: "Register",
      description:
        "Fill in the form on the event page: who you are, your team, and the track you're aiming for.",
    },
    {
      icon: ListChecks,
      title: "Finish the pre-hack tasks",
      description:
        "Join the Discord, run the partner quickstart, read the rules. Tick each one off on the event page.",
    },
    {
      icon: RocketLaunch,
      title: "Build and submit",
      description:
        "Build during the event window, then submit your repo, demo video, and write-up before the deadline.",
    },
  ];

function ParticipantSteps() {
  return (
    <PaperSection id="how-it-works" tone="paper" className="!pt-0">
      <Container>
        <IndexBar index={2} name="How it works" aside="For participants" />
        <SectionHead
          title={
            <>
              From sign-up to <Accent>ready to build</Accent>
            </>
          }
          description="Every Studio1 hackathon runs the same way, so you always know what comes next."
        />
        <ol className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PARTICIPANT_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li
                key={step.title}
                className={cn("flex flex-col gap-10 p-6", CELL)}
              >
                <span className="flex items-start justify-between">
                  <span
                    className="flex size-11 items-center justify-center text-[#f4efe7]"
                    style={{ background: INK }}
                  >
                    <StepIcon className="size-5" />
                  </span>
                  <span
                    className="text-[13px] font-medium tabular-nums"
                    style={{ color: PRINT }}
                  >
                    {pad(index + 1)}
                  </span>
                </span>
                <span className="block">
                  <span className="block text-[20px] font-medium leading-tight tracking-[-0.03em]">
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      "mt-2 block text-[14.5px] leading-[1.55]",
                      MUTED,
                    )}
                  >
                    {step.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <div
          className="mt-2 flex items-center gap-3 rounded-[6px] px-6 py-5 text-[15px] font-medium text-white"
          style={{ background: PRINT }}
        >
          <SealCheck weight="fill" className="size-5 shrink-0" />
          All tasks ticked off? You&apos;re ready to go.
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — For partners (night band)                                      */
/* ------------------------------------------------------------------ */

const PARTNER_DELIVERABLES: {
  icon: Icon;
  title: string;
  description: string;
}[] = [
  {
    icon: Strategy,
    title: "Challenge design",
    description:
      "Tracks, starter repos, and judging criteria built around your product, so every project uses it.",
  },
  {
    icon: Megaphone,
    title: "Developer promotion",
    description:
      "Launch posts, community pushes, and creator shoutouts that bring builders to the event.",
  },
  {
    icon: ListChecks,
    title: "Onboarding tasks",
    description:
      "Pre-hack tasks walk every participant through your quickstart before kickoff.",
  },
  {
    icon: UsersThree,
    title: "Mentors and judging",
    description:
      "Office hours, Discord support, and a judging panel that includes your team.",
  },
  {
    icon: SealCheck,
    title: "Submission review",
    description:
      "Every entry checked against the rules, scored, and shortlisted for your judges.",
  },
  {
    icon: ChartBar,
    title: "Post-event report",
    description:
      "Registrations, activations, projects, and the docs issues participants hit, in one report.",
  },
];

const PARTNER_TIERS: {
  name: string;
  line: string;
  includes: string[];
  featured?: boolean;
}[] = [
  {
    name: "Host partner",
    line: "Your product is the hackathon.",
    includes: [
      "Event named and themed around your product",
      "Every track built on your product",
      "Seats on the judging panel",
      "Full post-event report",
      "Content made from winning projects",
    ],
    featured: true,
  },
  {
    name: "Track sponsor",
    line: "Your product gets its own track.",
    includes: [
      "One track and its prize",
      "A starter repo for the track",
      "Judging for your track",
      "Track-level report",
    ],
  },
  {
    name: "Community partner",
    line: "Bring your community to build.",
    includes: [
      "Your logo on the event page",
      "Co-promotion to your members",
      "Optional community prize",
    ],
  },
];

function PartnerSection() {
  return (
    <PaperSection id="partners" tone="night" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={4}
          name="For partners"
          aside="Devtool, AI, and open-source teams"
        />
        <SectionHead
          title={
            <>
              Put your product in <Accent>builders&apos; hands</Accent>
            </>
          }
          description="Host a Studio1 hackathon and developers spend a weekend, or a month, building with your product. We run it end to end."
          action={
            <InkPill href={PARTNER_CALL} external tone="paper">
              Partner with us
            </InkPill>
          }
        />

        <ul
          role="list"
          className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PARTNER_DELIVERABLES.map((item, index) => {
            const ItemIcon = item.icon;
            return (
              <li
                key={item.title}
                className="flex flex-col gap-8 rounded-[6px] bg-[#1d1d1d] p-6 ring-1 ring-inset ring-white/10"
              >
                <span className="flex items-start justify-between">
                  <span
                    className="flex size-11 items-center justify-center text-white"
                    style={{ background: PRINT }}
                  >
                    <ItemIcon className="size-5" />
                  </span>
                  <span className="text-[12px] font-medium tabular-nums text-[#f4efe7]/35">
                    {pad(index + 1)}
                  </span>
                </span>
                <span className="block">
                  <span className="block text-[19px] font-medium leading-tight tracking-[-0.03em]">
                    {item.title}
                  </span>
                  <span className="mt-2 block text-[14.5px] leading-[1.55] text-[#f4efe7]/60">
                    {item.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-14 flex items-center gap-3 text-[13px] font-medium">
          <Handshake
            weight="bold"
            className="size-4"
            style={{ color: PRINT }}
          />
          Ways to partner
        </div>
        <ul role="list" className="mt-5 grid gap-2 lg:grid-cols-3">
          {PARTNER_TIERS.map((tier) => (
            <li
              key={tier.name}
              className={cn(
                "relative isolate flex flex-col overflow-hidden rounded-[6px] p-6 md:p-7",
                tier.featured
                  ? "text-white"
                  : "bg-[#f4efe7] text-[#141414] ring-1 ring-inset ring-white/10",
              )}
              style={tier.featured ? { background: PRINT } : undefined}
            >
              {tier.featured ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 opacity-40 mix-blend-multiply"
                  style={{ backgroundImage: GRAIN }}
                />
              ) : null}
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.16em]",
                  tier.featured ? "text-white/80" : "text-[#141414]/55",
                )}
              >
                {tier.name}
              </p>
              <p className="mt-4 text-[24px] font-medium leading-[1.15] tracking-[-0.04em]">
                {tier.line}
              </p>
              <ul
                role="list"
                className={cn(
                  "mt-6 space-y-2.5 border-t pt-5 text-[14.5px]",
                  tier.featured ? "border-white/30" : "border-[#141414]/10",
                )}
              >
                {tier.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-[7px] size-1.5 shrink-0"
                      style={{ background: tier.featured ? "#fff" : PRINT }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — FAQ                                                            */
/* ------------------------------------------------------------------ */

// DRAFT copy: confirm the policy answers before the route goes public.
const HUB_FAQS: HackathonFaq[] = [
  {
    question: "Who can join a Studio1 hackathon?",
    answer:
      "Any developer, student, or designer. Some events are built for beginners; each event page says who it's for.",
  },
  {
    question: "Is it free to take part?",
    answer:
      "Yes. Hackathons are free for participants. Partners fund the prizes.",
  },
  {
    question: "Do I register once for every hackathon?",
    answer:
      "No. Each hackathon has its own registration form and pre-hack tasks on its event page.",
  },
  {
    question: "Can I join from anywhere?",
    answer:
      "Online events are open worldwide, subject to local laws for prize payouts. In-person and hybrid events list their city on the event page.",
  },
  {
    question: "How does a company partner on a hackathon?",
    answer:
      "Book a call. We scope the format, tracks, and prizes around your product, then run promotion, onboarding, judging, and the report.",
  },
  {
    question: "What do partners get after the event?",
    answer:
      "A report with registrations, activations, submitted projects, and the docs and onboarding issues participants hit, plus the right to feature winning projects with credit.",
  },
];

export function HackathonsPage(props: HackathonsPageProps) {
  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      <HackathonsHero {...props} />
      <HackathonDirectory cards={props.cards} />
      <ParticipantSteps />
      <TrackRecord
        index={3}
        partnerships={props.track.partnerships}
        map={props.track.map}
      />
      <PartnerSection />
      <PaperSection id="faq" tone="paper">
        <Container>
          <IndexBar index={5} name="FAQ" />
          <SectionHead
            title={
              <>
                Questions, <Accent>answered</Accent>
              </>
            }
            description="For participants and for teams thinking about hosting one."
          />
          <HackathonFaqList items={HUB_FAQS} />
        </Container>
      </PaperSection>
      <PaperCta
        index={6}
        title="Want to Host the Next One?"
        description="Tell us about your product and who should build with it. We'll design the hackathon around it."
      />
    </div>
  );
}
