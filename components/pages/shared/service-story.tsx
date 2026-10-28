"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CaretRight,
  ChatCircleText,
  Code,
  Compass,
  FileText,
  FilmSlate,
  Flag,
  Gauge,
  GithubLogo,
  ListBullets,
  ListChecks,
  MagnifyingGlass,
  Megaphone,
  PaperPlaneTilt,
  PencilSimple,
  PencilSimpleLine,
  PuzzlePiece,
  RocketLaunch,
  Sparkle,
  Television,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import {
  CELL,
  CountUp,
  IndexBar,
  InkLogo,
  SectionHead,
} from "@/components/paper/paper-sections";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { PaperCaseStudyCard } from "@/components/pages/shared/paper-service-kit";
import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";
import { trustedbyLogo } from "@/constants/data";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * Service page blocks, laid out as one quiet product story: a centred hero
 * with an arch, a logo strip, alternating offer rows beside product-style
 * visuals, the workflow as tall cards, one proof panel and a closing prompt.
 * All copy comes from the page.
 */

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Brand gradient for the accent words in headlines. */
const GRADIENT_TEXT =
  "bg-[linear-gradient(100deg,#fe3c34_0%,#f97316_45%,#fb8a1e_100%)] bg-clip-text text-transparent";

/**
 * Card reveal: each card rises out of a soft blur as it enters the screen,
 * staggered across a row, and plays again whenever it comes back into view.
 */
function cardReveal(reduceMotion: boolean | null, column: number) {
  return {
    initial: reduceMotion
      ? false
      : { opacity: 0, y: 48, scale: 0.97, filter: "blur(12px)" },
    whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    viewport: { once: false, margin: "0px 0px -12% 0px" },
    transition: { duration: 0.9, ease: EASE, delay: column * 0.08 },
  } as const;
}

type Indexed = { index?: number; name?: string };

/** Paper section: grain, and the landing's printed index line on top. */
function Band({
  id,
  index,
  name,
  className,
  children,
}: Indexed & {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <section
      id={id}
      className={cn(
        "relative isolate scroll-mt-24 overflow-clip text-[#141414]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      {/* One reveal per section, the same as the landing's PaperSection */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {index && name ? (
          <Container>
            <IndexBar index={index} name={name} />
          </Container>
        ) : null}
        {children}
      </motion.div>
    </section>
  );
}

/**
 * Marks the given phrases with an orange highlighter that sweeps in from the
 * left, a beat after the headline lands.
 */
function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const reduceMotion = useReducedMotion();
  if (!phrases.length) return <>{text}</>;
  const pattern = new RegExp(
    `(${phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  );
  return (
    <>
      {text.split(pattern).map((part, index) =>
        phrases.includes(part) ? (
          <motion.span
            key={index}
            className="rounded-[3px] bg-no-repeat px-0.5 font-medium text-[#141414] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
            style={{
              backgroundImage:
                "linear-gradient(transparent 55%, rgba(249,115,22,0.28) 55%, rgba(249,115,22,0.28) 92%, transparent 92%)",
              backgroundPosition: "0 0",
            }}
            initial={reduceMotion ? false : { backgroundSize: "0% 100%" }}
            animate={{ backgroundSize: "100% 100%" }}
            transition={{
              duration: 0.9,
              ease: EASE,
              delay: 0.6 + index * 0.12,
            }}
          >
            {part}
          </motion.span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function BookCall({
  label,
  tone = "ink",
}: {
  label: string;
  tone?: "ink" | "white";
}) {
  return (
    <a
      href="https://cal.com/studio1/collab"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative isolate inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none",
        tone === "ink"
          ? "shadow-[0_14px_30px_-16px_rgba(20,20,20,0.6)]"
          : "shadow-[0_14px_30px_-14px_rgba(120,40,0,0.55)]",
      )}
      style={
        tone === "ink"
          ? { background: INK, color: PAPER }
          : { background: "#fff", color: INK }
      }
    >
      {/* Light sweep that crosses the pill now and then */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span className="s1-cta-sheen absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </span>
      <span className="relative">{label}</span>
      <span
        className="relative flex size-9 items-center justify-center overflow-hidden rounded-full text-white shadow-[0_0_0_0_rgba(249,115,22,0.45)] transition-shadow duration-500 group-hover:shadow-[0_0_0_6px_rgba(249,115,22,0.18)]"
        style={{ background: PRINT }}
      >
        <ArrowUpRight
          weight="bold"
          className="size-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-5 group-hover:translate-x-5"
        />
        <ArrowUpRight
          weight="bold"
          className="absolute size-4 -translate-x-5 translate-y-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:translate-y-0"
        />
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: copy and stats on the left, a tall photo card on the right   */
/* ------------------------------------------------------------------ */

export type StoryStat = { value: string; label: string };

export function StoryHero({
  eyebrow,
  pill,
  titleAccent,
  titleRest,
  description,
  primaryCta,
  secondaryCta,
  secondaryHref = "#work",
  stats = [],
  photo,
  highlights = [],
}: {
  eyebrow: string;
  /** Short line in the pill beside the eyebrow tag. */
  pill: string;
  titleAccent: string;
  titleRest: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  secondaryHref?: string;
  stats?: StoryStat[];
  /** Real Studio1 photo shown inside the arch. */
  photo: { src: string; alt: string; position?: string };
  /** Phrases in the description to mark with the orange highlighter. */
  highlights?: string[];
}) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <PaperPageHeader className="pb-10 pt-[104px] md:pb-14 md:pt-[120px]">
      <ScrollEdgeBlur />
      {/* Warm wash behind the hero, fading into the page on every side */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(45% 55% at 78% 45%, rgba(251,150,60,0.28), transparent 70%), radial-gradient(35% 40% at 15% 20%, rgba(254,60,52,0.08), transparent 70%)",
        }}
      />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          {/* Copy */}
          <div id="overview" className="relative z-10">
            <motion.a
              {...enter(0)}
              href={secondaryHref}
              className="group inline-flex items-center gap-2.5 rounded-full bg-white/70 py-1 pl-1 pr-3.5 text-[13px] font-medium text-[#141414] shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/[0.08] transition-colors hover:bg-white"
            >
              <span
                className="rounded-full px-2.5 py-1 text-[12px] text-white"
                style={{ background: PRINT }}
              >
                {eyebrow}
              </span>
              {pill}
              <CaretRight
                weight="bold"
                className="size-3 text-[#f97316] transition-transform group-hover:translate-x-0.5"
              />
            </motion.a>

            <motion.h1
              {...enter(0.1)}
              className="mt-7 text-balance text-[44px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[58px] lg:text-[66px]"
            >
              <span className={GRADIENT_TEXT}>{titleAccent}</span> {titleRest}
            </motion.h1>
            <motion.p
              {...enter(0.15)}
              className="mt-6 max-w-[540px] text-[16px] leading-[1.65] text-[#141414]/65 md:text-[17px]"
            >
              <Highlighted text={description} phrases={highlights} />
            </motion.p>
            <motion.div
              {...enter(0.2)}
              className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4"
            >
              <BookCall label={primaryCta} />
              <a
                href={secondaryHref}
                className="text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
              >
                {secondaryCta}
              </a>
            </motion.div>

            {/* Stats as one quiet row under the actions */}
            {stats.length ? (
              <motion.dl
                {...enter(0.3)}
                className="mt-12 grid max-w-[560px] grid-cols-2 gap-y-6 border-t border-[#141414]/[0.1] pt-7 sm:grid-cols-4"
              >
                {stats.slice(0, 4).map((stat, index) => {
                  const plus = stat.value.endsWith("+");
                  const raw = plus ? stat.value.slice(0, -1) : stat.value;
                  return (
                    <div
                      key={stat.label}
                      className={cn(
                        "pr-4",
                        index > 0 &&
                          "sm:border-l sm:border-[#141414]/[0.08] sm:pl-5",
                      )}
                    >
                      <dd className="whitespace-nowrap text-[30px] font-medium leading-none tabular-nums tracking-[-0.05em]">
                        {/^\d+$/.test(raw) ? (
                          <CountUp value={Number(raw)} />
                        ) : (
                          raw
                        )}
                        {plus ? (
                          <span className="text-[#f97316]">+</span>
                        ) : null}
                      </dd>
                      <dt className="mt-2 text-[12.5px] leading-snug text-[#141414]/55">
                        {stat.label}
                      </dt>
                    </div>
                  );
                })}
              </motion.dl>
            ) : null}
          </div>

          {/* Photo: a tall card with a soft glow and a floating note */}
          <motion.div
            {...enter(0.2)}
            className="relative mx-auto w-full max-w-[520px] lg:mr-0"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-10 -z-10 rounded-[60px] blur-3xl"
              style={{
                background:
                  "radial-gradient(60% 60% at 55% 55%, rgba(249,140,60,0.45), transparent 75%)",
              }}
            />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[#f2c9a0] shadow-[0_40px_80px_-40px_rgba(120,40,0,0.55)] ring-1 ring-white/60">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 520px"
                className="object-cover"
                style={{ objectPosition: photo.position ?? "center" }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent"
              />
              <span className="absolute bottom-5 left-5 right-5 flex items-center gap-2 text-[13px] font-medium text-white">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: PRINT }}
                />
                {photo.alt}
              </span>
            </div>

            {/* The lead stat, printed orange, resting on the card's edge */}
            {stats[0] ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
                className="absolute -left-6 top-10 hidden rounded-[14px] px-5 py-4 text-white shadow-[0_24px_44px_-20px_rgba(194,65,12,0.7)] sm:block lg:-left-10"
                style={{ background: PRINT }}
              >
                <p className="text-[34px] font-medium leading-none tracking-[-0.05em]">
                  {stats[0].value}
                </p>
                <p className="mt-1.5 max-w-[150px] text-[12.5px] leading-snug text-white/85">
                  {stats[0].label}
                </p>
              </motion.div>
            ) : null}
          </motion.div>
        </div>
      </Container>
    </PaperPageHeader>
  );
}

/* ------------------------------------------------------------------ */
/* Logo strip                                                          */
/* ------------------------------------------------------------------ */

const STRIP = [
  "InsForge",
  "Weaviate",
  "Maxim AI",
  "Permit",
  "Memori",
  "CopilotKit",
  "Crawlee",
  "Tolgee",
];

export function StoryLogos() {
  const logos = STRIP.map((name) =>
    trustedbyLogo.find((item) => item.name === name),
  ).filter((item): item is (typeof trustedbyLogo)[number] => Boolean(item));

  return (
    <Band className="py-6">
      <Container>
        <p className="mb-6 text-center text-[13px] font-medium text-[#141414]/45">
          Trusted by developer-first teams we have worked with
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((item) => (
            <li key={item.name}>
              <InkLogo item={item} />
            </li>
          ))}
        </ul>
      </Container>
    </Band>
  );
}

/* ------------------------------------------------------------------ */
/* Offer rows: copy on one side, a product visual on the other          */
/* ------------------------------------------------------------------ */

export type StoryOffer = {
  icon: Icon;
  accent: string;
  rest?: string;
  badges: string[];
  description: string;
  features: string[];
  id?: string;
  anchorIds?: string[];
};

export function StoryRows({
  index,
  name = "What we offer",
  title,
  description,
  offers,
  id = "work",
}: Indexed & {
  title?: ReactNode;
  description?: string;
  offers: StoryOffer[];
  id?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Band id={id} index={index} name={name} className="py-12 md:py-16">
      <Container>
        {title ? <SectionHead title={title} description={description} /> : null}

        {/* Three tall cards, the middle one set lower, as on the live site */}
        <div className="relative mt-12 md:mt-14">
          <ol className="grid items-start gap-3 md:grid-cols-3">
            {offers.map((offer, position) => {
              const OfferIcon = offer.icon;
              return (
                <motion.li
                  key={offer.accent + position}
                  id={offer.id}
                  {...cardReveal(reduceMotion, position)}
                  className={cn(
                    "group relative isolate flex scroll-mt-28 flex-col overflow-hidden rounded-[6px] p-7 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 motion-reduce:transform-none md:p-8",
                    position === 0
                      ? "text-white shadow-[0_18px_40px_-30px_rgba(20,20,20,0.45)]"
                      : "bg-white/80 ring-1 ring-inset ring-[#141414]/10 hover:shadow-[0_20px_40px_-30px_rgba(20,20,20,0.35)]",
                    position % 3 === 1 && "md:mt-16",
                  )}
                  style={
                    position === 0
                      ? {
                          background:
                            "linear-gradient(160deg, #fe3c34 0%, #f97316 45%, #fb8a1e 100%)",
                        }
                      : undefined
                  }
                >
                  {position === 0 ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
                      style={{ backgroundImage: GRAIN }}
                    />
                  ) : (
                    /* Orange wash that rises from the bottom on hover */
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(120% 70% at 50% 110%, rgba(249,115,22,0.22), transparent 70%)",
                      }}
                    />
                  )}
                  {offer.anchorIds?.map((anchorId) => (
                    <span
                      key={anchorId}
                      id={anchorId}
                      className="absolute -top-28"
                    />
                  ))}
                  <div className="flex items-start justify-between">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-14 items-center justify-center rounded-[6px]",
                        position === 0
                          ? "bg-white/15 text-white shadow-[inset_0_3px_10px_rgba(120,30,0,0.35)]"
                          : "bg-[#f8f6f2] text-[#141414] shadow-[inset_0_5px_14px_rgba(20,20,20,0.13),inset_2px_0_8px_rgba(20,20,20,0.05),inset_0_1px_3px_rgba(20,20,20,0.12)] transition-colors duration-500 group-hover:text-[#ea580c]",
                      )}
                    >
                      <OfferIcon weight="regular" className="size-7" />
                    </span>
                    <span
                      className={cn(
                        "text-[13px] font-medium tabular-nums",
                        position === 0 ? "text-white/70" : "text-[#141414]/35",
                      )}
                    >
                      {position === 0 ? "Core service" : pad2(position + 1)}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-1.5">
                    {offer.badges.map((badge) => (
                      <span
                        key={badge}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[12px] font-medium",
                          position === 0
                            ? "bg-white/20 text-white"
                            : "bg-[#141414]/[0.05] text-[#141414]/70",
                        )}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-4 text-[34px] font-medium leading-[1.02] tracking-[-0.05em] md:text-[38px]">
                    <span
                      className={position === 0 ? undefined : GRADIENT_TEXT}
                    >
                      {offer.accent}
                    </span>
                    {offer.rest ? (
                      <>
                        <br />
                        {offer.rest}
                      </>
                    ) : null}
                  </h3>

                  <p
                    className={cn(
                      "mt-4 text-[15px] leading-[1.6]",
                      position === 0 ? "text-white/85" : "text-[#141414]/60",
                    )}
                  >
                    {offer.description}
                  </p>

                  <ul
                    className={cn(
                      "mt-6 flex flex-col gap-2.5 border-t pt-6",
                      position === 0
                        ? "border-white/25"
                        : "border-[#141414]/[0.08]",
                    )}
                  >
                    {offer.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          "flex items-start gap-3 text-[14.5px] leading-snug",
                          position === 0 ? "text-white" : "text-[#141414]/80",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-[7px] size-1.5 shrink-0",
                            position === 0 ? "bg-white" : "bg-[#f97316]",
                          )}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </Container>
    </Band>
  );
}

/* ------------------------------------------------------------------ */
/* Workflow cards                                                      */
/* ------------------------------------------------------------------ */

/* Thin icon per workflow step, picked from the step's own title. */
const STEP_ICONS: [RegExp, Icon][] = [
  [/shorts/i, FilmSlate],
  [/series/i, Television],
  [/demo|repo/i, GithubLogo],
  [/campaign/i, RocketLaunch],
  [/long-form|video/i, VideoCamera],
  [/packaging|publish/i, PaperPlaneTilt],
  [/topic/i, MagnifyingGlass],
  [/outline/i, ListBullets],
  [/draft|review/i, PencilSimpleLine],
  [/editing/i, PencilSimple],
  [/scratch/i, FileText],
  [/completeness/i, ListChecks],
  [/platform|dx/i, Gauge],
  [/feedback/i, ChatCircleText],
  [/implementation/i, Code],
  [/embedded/i, UsersThree],
  [/integration/i, PuzzlePiece],
  [/community|hackathon/i, Flag],
  [/influencer/i, Megaphone],
  [/leadership/i, Compass],
];

function StepGlyph({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const Glyph =
    STEP_ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? Sparkle;
  return <Glyph aria-hidden weight="light" className={className} />;
}

export type StoryStep = {
  title: string;
  description: string;
  points?: string[];
};

/* Real Studio1 event photos used in the step carousel. */
const CAROUSEL_PHOTOS = [
  "/case-studies/openlore/openlore-hackspire-talk.webp",
  "/case-studies/jozu/kubecon-jozu-booth.webp",
  "/case-studies/jozu/devfest-pune-2025.webp",
  "/case-studies/jozu/kubecon-jozu-team.webp",
  "/case-studies/jozu/devfest-jozu-booth.webp",
  "/case-studies/jozu/kubecon-india-2025.webp",
];

/* Card colours, cycled: print orange, white, warm sand. */
const CAROUSEL_TONES = [
  {
    card: "linear-gradient(160deg, #fe3c34 0%, #f97316 50%, #fb8a1e 100%)",
    ink: "#ffffff",
    soft: "rgba(255,255,255,0.82)",
    dot: "#ffffff",
  },
  {
    card: "#ffffff",
    ink: "#141414",
    soft: "rgba(20,20,20,0.62)",
    dot: "#f97316",
  },
  {
    card: "#efe6d8",
    ink: "#141414",
    soft: "rgba(20,20,20,0.62)",
    dot: "#f97316",
  },
];

/**
 * Desktop step carousel: the row of cards is pinned while you scroll and
 * slides across. The card in the middle sits flat and full size; the ones
 * either side tilt away, shrink a little and peek in from the edges.
 */
function StepCarousel({ steps }: { steps: StoryStep[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  // Hold the first card a moment, move through the rest, then rest on the
  // last card before the next section scrolls in.
  const travel = useTransform(scrollYProgress, [0.08, 0.86], [0, 1], {
    clamp: true,
  });
  const progress = useSpring(travel, {
    stiffness: 55,
    damping: 20,
    mass: 0.8,
    restDelta: 0.0002,
  });
  // As the section leaves, the whole stage eases back and fades out.
  const { scrollYProgress: leave } = useScroll({
    target: trackRef,
    offset: ["end end", "end start"],
  });
  const stageScale = useTransform(leave, [0, 0.6], [1, 0.9]);
  const stageOpacity = useTransform(leave, [0, 0.55], [1, 0]);
  const stageY = useTransform(leave, [0, 0.6], ["0vh", "-6vh"]);
  const last = Math.max(1, steps.length - 1);
  // The backdrop ribbon draws itself left to right with the cards.
  const ribbon = useTransform(progress, [0, 1], [0.18, 1]);

  return (
    <div
      ref={trackRef}
      className="relative mt-10 hidden lg:block"
      style={{ height: `${steps.length * 95 + 60}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        {/* Soft paper ribbon sweeping across behind the cards */}
        <motion.svg
          aria-hidden
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={reduceMotion ? undefined : { opacity: stageOpacity }}
        >
          <motion.path
            d="M -120 470 C 240 500 520 640 820 730 C 1060 800 1150 660 1200 470 C 1250 270 1360 130 1580 40"
            fill="none"
            stroke="#141414"
            strokeOpacity={0.045}
            strokeWidth={110}
            strokeLinecap="round"
            style={reduceMotion ? undefined : { pathLength: ribbon }}
          />
        </motion.svg>
        <motion.ol
          className="relative h-full w-full will-change-transform"
          style={
            reduceMotion
              ? undefined
              : { scale: stageScale, opacity: stageOpacity, y: stageY }
          }
        >
          {steps.map((step, position) => (
            <CarouselCard
              key={step.title}
              step={step}
              position={position}
              last={last}
              count={steps.length}
              progress={progress}
            />
          ))}
        </motion.ol>
      </div>
    </div>
  );
}

function CarouselCard({
  step,
  position,
  last,
  count,
  progress,
}: {
  step: StoryStep;
  position: number;
  last: number;
  count: number;
  progress: MotionValue<number>;
}) {
  // How far this card is from the centre, in cards (0 = centred).
  const offset = useTransform(progress, (value) => position - value * last);
  // Next cards wait at the bottom-left, passed ones lift away to the top-right.
  const x = useTransform(offset, (value) => `${-value * 64}vw`);
  const y = useTransform(offset, (value) => `${value * 16}vh`);
  // The card nearest the centre always sits on top.
  const zIndex = useTransform(offset, (value) =>
    Math.round(100 - Math.abs(value) * 10),
  );
  const rotate = useTransform(offset, [-1, 0, 1], [6, 0, -6]);
  const scale = useTransform(offset, [-1, 0, 1], [0.86, 1, 0.86]);
  const opacity = useTransform(
    offset,
    [-1.6, -1, 0, 1, 1.6],
    [0, 0.55, 1, 0.55, 0],
  );
  // Side cards out of focus. Stepped, so the blur only redraws a few times.
  const blur = useTransform(offset, (value) => {
    const level = Math.min(3, Math.round(Math.abs(value) * 3));
    return level ? `blur(${level * 1.5}px)` : "none";
  });
  const tone = CAROUSEL_TONES[position % CAROUSEL_TONES.length];

  return (
    <motion.li
      className="absolute inset-y-0 left-[19vw] my-auto h-fit w-[62vw] max-w-[1080px] rounded-[28px] p-4 will-change-transform [backface-visibility:hidden]"
      style={{
        rotate,
        scale,
        x,
        y,
        opacity,
        zIndex,
        filter: blur,
        background: tone.card,
        boxShadow: "0 50px 90px -60px rgba(60,20,0,0.55)",
      }}
    >
      <div className="grid min-h-[min(520px,62svh)] grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] gap-10">
        <div className="relative overflow-hidden rounded-[20px]">
          <Image
            src={CAROUSEL_PHOTOS[position % CAROUSEL_PHOTOS.length]}
            alt=""
            fill
            sizes="34vw"
            className="object-cover"
          />
          <span className="absolute left-4 top-4 flex size-12 items-center justify-center rounded-full bg-white/90 text-[#141414] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur">
            <StepGlyph title={step.title} className="size-6" />
          </span>
        </div>
        <div className="flex flex-col py-8 pr-8" style={{ color: tone.ink }}>
          <p
            className="text-[14px] font-medium tabular-nums"
            style={{ color: tone.soft }}
          >
            {pad2(position + 1)} / {pad2(count)}
          </p>
          <h3 className="mt-5 text-[clamp(28px,2.6vw,40px)] font-medium leading-[1.08] tracking-[-0.045em]">
            {step.title}
          </h3>
          <p
            className="mt-5 text-[clamp(15px,1.15vw,17px)] leading-[1.6]"
            style={{ color: tone.soft }}
          >
            {step.description}
          </p>
          {step.points?.length ? (
            <ul className="mt-auto flex flex-col gap-2.5 pt-8">
              {step.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-[14.5px] leading-snug"
                >
                  <span
                    aria-hidden
                    className="mt-[7px] size-1.5 shrink-0 rounded-full"
                    style={{ background: tone.dot }}
                  />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function StoryCards({
  index,
  name = "How it works",
  title,
  description,
  steps,
  id = "workflow",
}: Indexed & {
  title: ReactNode;
  description?: string;
  steps: StoryStep[];
  id?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Band id={id} index={index} name={name} className="py-12 md:py-16">
      <Container>
        <SectionHead title={title} description={description} />
      </Container>

      <StepCarousel steps={steps} />

      <Container>
        {/* Phones and tablets: rows of cards */}
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:hidden">
          {steps.map((step, position) => (
            <motion.li
              key={step.title}
              {...cardReveal(reduceMotion, position % 3)}
              className={cn(
                "lg:col-span-2",
                steps.length % 3 === 2 &&
                  position >= steps.length - 2 &&
                  "lg:col-span-3",
                steps.length % 3 === 1 &&
                  position === steps.length - 1 &&
                  "lg:col-span-6",
              )}
            >
              {/* Hover: the card lifts and an orange glow fills it */}
              <div className="group relative isolate flex h-full flex-col overflow-hidden rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_24px_44px_-30px_rgba(234,88,12,0.55)] motion-reduce:transform-none md:p-8">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(180deg, #fbc99b 0%, #f9a55a 22%, #fb8a1e 55%, #ff4d0d 100%)",
                  }}
                />
                {/* One thin ink icon names the step; the copy sits at the foot */}
                <StepGlyph
                  title={step.title}
                  className="size-7 text-[#141414] transition-colors duration-500 group-hover:text-white"
                />
                <div className="mt-auto flex flex-col pt-14 transition-colors duration-500 group-hover:text-white">
                  <h3 className="text-[20px] font-medium leading-[1.25] tracking-[-0.03em]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[#141414]/60 transition-colors duration-500 group-hover:text-white/90">
                    {step.description}
                  </p>
                  {step.points?.length ? (
                    <ul className="mt-6 flex flex-col gap-2 border-t border-[#141414]/[0.08] pt-5 transition-colors duration-500 group-hover:border-white/30">
                      {step.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-3 text-[14px] leading-snug text-[#141414]/75 transition-colors duration-500 group-hover:text-white/90"
                        >
                          <span
                            aria-hidden
                            className="mt-[6px] size-1.5 shrink-0 bg-[#f97316] transition-colors duration-500 group-hover:bg-white"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </Container>
    </Band>
  );
}

/**
 * Fills the empty half of a proof row: a link to every case study, with a
 * case-study screenshot tilted and half cropped off the card's corner.
 */
function MoreProofCard() {
  return (
    <Link
      href="/case-studies"
      className="group relative isolate flex min-h-[300px] flex-col overflow-hidden rounded-[6px] bg-[#efe8dd] p-7 shadow-[inset_0_3px_10px_rgba(20,20,20,0.08)] ring-1 ring-inset ring-[#141414]/[0.06] sm:p-8"
    >
      <p className="text-[13px] font-medium text-[#141414]/50">More proof</p>
      <p className="mt-3 max-w-[260px] text-[26px] font-medium leading-[1.15] tracking-[-0.04em]">
        Developer adoption, <span className={GRADIENT_TEXT}>case by case</span>
      </p>
      <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[14px] font-medium text-[#141414]">
        View all case studies
        <ArrowRight
          weight="bold"
          className="size-4 text-[#f97316] transition-transform duration-500 group-hover:translate-x-1"
        />
      </span>
      {/* Half-cropped screenshot sliding out of the corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-12 w-[58%] rotate-[-6deg] overflow-hidden rounded-[6px] bg-white p-1.5 shadow-[0_30px_60px_-30px_rgba(20,20,20,0.5)] ring-1 ring-[#141414]/[0.06] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:rotate-[-3deg]"
      >
        <Image
          src="/case-studies/nebius/workshop-dublin-poster.webp"
          alt=""
          width={640}
          height={420}
          className="aspect-[4/3] w-full rounded-[4px] object-cover object-top"
        />
      </span>
    </Link>
  );
}

/**
 * Soft blur along the bottom of the screen: content coming up from below
 * sharpens as it scrolls into view. Stacked layers make the blur ramp up
 * smoothly toward the edge.
 */
export function ScrollEdgeBlur() {
  // Hidden over the hero; fades in once the page has scrolled past it.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const update = () => setShown(window.scrollY > window.innerHeight * 0.7);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const layers = [
    { blur: 1, from: 0, to: 30 },
    { blur: 3, from: 15, to: 50 },
    { blur: 6, from: 35, to: 75 },
    { blur: 12, from: 55, to: 100 },
  ];
  if (!mounted) return null;
  return createPortal(
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 h-28 transition-opacity duration-700 md:h-36",
        shown ? "opacity-100" : "opacity-0",
      )}
    >
      {layers.map((layer) => (
        <div
          key={layer.blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            maskImage: `linear-gradient(to bottom, transparent ${layer.from}%, #000 ${layer.to}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${layer.from}%, #000 ${layer.to}%)`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f4efe7]/20 to-[#f4efe7]/70" />
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Proof: one featured case study, then the rest in pairs              */
/* ------------------------------------------------------------------ */

export function StoryProof({
  index,
  name = "Proof",
  label = "View all case studies",
  title,
  description,
  studies,
  id = "proof",
}: Indexed & {
  label?: string;
  title: string;
  description?: string;
  studies: CaseStudyResultData[];
  id?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [featured, ...rest] = studies;
  return (
    <Band id={id} index={index} name={name} className="py-12 md:py-16">
      <Container>
        <SectionHead
          title={title}
          description={description}
          action={
            <Link
              href="/case-studies"
              className="group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5"
              style={{ background: INK, color: PAPER }}
            >
              {label}
              <ArrowRight
                weight="bold"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          }
        />
        <div className="mt-10 grid gap-2">
          {featured ? (
            <motion.div {...cardReveal(reduceMotion, 0)}>
              <PaperCaseStudyCard
                study={featured}
                variant="featured"
                density="dense"
              />
            </motion.div>
          ) : null}
          {rest.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {rest.map((study, position) => (
                <motion.div
                  key={study.href}
                  {...cardReveal(reduceMotion, position % 2)}
                >
                  <PaperCaseStudyCard study={study} position={position} />
                </motion.div>
              ))}
              {rest.length % 2 === 1 ? (
                <motion.div {...cardReveal(reduceMotion, 1)}>
                  <MoreProofCard />
                </motion.div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </Band>
  );
}
