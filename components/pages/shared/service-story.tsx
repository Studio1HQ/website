"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
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
        initial={
          reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(10px)" }
        }
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: false, amount: 0.12 }}
        transition={{ duration: 1, ease: EASE }}
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
/* Hero: pill, centred headline, then an arch holding the canvas        */
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
    <PaperPageHeader className="pb-6 pt-[88px] md:pb-8 md:pt-[96px]">
      <Container>
        {/* One engraved panel holds the headline and the photo arch */}
        <div className="relative isolate flex min-h-[600px] flex-col px-4 pt-10 md:pt-12">
          {/* Panel colour, its left and right edges fading into the page */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -inset-x-4 -z-10 md:-inset-x-16"
            style={{
              background:
                "radial-gradient(55% 38% at 50% 0%, rgba(251,138,30,0.30) 0%, rgba(251,170,110,0.14) 45%, transparent 75%), radial-gradient(30% 22% at 50% 0%, rgba(254,60,52,0.16), transparent 70%), linear-gradient(180deg, #faf6f0 0%, #f7efe5 45%, #f9e2cf 80%, #fbd5bb 100%)",
              maskImage:
                "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 12%)",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 12%)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
          <div
            id="overview"
            className="relative z-10 flex flex-col items-center text-center"
          >
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
              className="mt-7 max-w-[1040px] text-balance text-[46px] font-medium leading-[1.02] tracking-[-0.055em] sm:text-[64px] lg:text-[76px]"
            >
              <span className={GRADIENT_TEXT}>{titleAccent}</span> {titleRest}
            </motion.h1>
            <motion.p
              {...enter(0.15)}
              className="mt-5 max-w-[620px] text-balance text-[16px] leading-[1.6] text-[#141414]/65 md:text-[18px]"
            >
              <Highlighted text={description} phrases={highlights} />
            </motion.p>
            <motion.div
              {...enter(0.2)}
              className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-4"
            >
              <BookCall label={primaryCta} />
              <a
                href={secondaryHref}
                className="text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
              >
                {secondaryCta}
              </a>
            </motion.div>
          </div>

          {/* The arch: a real photo, edges melting into a warm blur */}
          <motion.div
            {...enter(0.2)}
            className="relative mx-auto mt-9 flex w-full max-w-[1180px] flex-col md:mt-10"
          >
            {/* Golden glow bleeding out from the rim */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-x-8 -top-8 bottom-0 -z-10 [border-radius:50%_50%_0_0/100%_100%_0_0] blur-3xl"
              style={{
                background:
                  "radial-gradient(60% 70% at 50% 60%, rgba(240,180,100,0.85), rgba(250,200,150,0.4) 60%, transparent 80%)",
              }}
            />
            <div
              className="relative isolate h-[460px] overflow-hidden [border-radius:50%_50%_0_0/100%_100%_0_0] sm:h-[560px] md:h-[660px]"
              style={{
                background:
                  "radial-gradient(80% 90% at 50% 100%, #f2a866 0%, #f6c48f 55%, #f9dcbc 100%)",
              }}
            >
              {/* Sharp photo, fading out toward the edges */}
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority
                sizes="(max-width: 1120px) 100vw, 1120px"
                className="-z-10 object-cover [mask-image:radial-gradient(90%_100%_at_50%_95%,black_68%,transparent_100%)]"
                style={{ objectPosition: photo.position ?? "center" }}
              />
              {/* Warm halo on the rim */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 [border-radius:50%_50%_0_0/100%_100%_0_0] shadow-[inset_0_0_50px_14px_rgba(247,205,155,0.65)]"
              />
              {/* Caption: where the photo was taken */}
              <span className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white/80 px-3.5 py-1.5 text-[12.5px] font-medium text-[#141414] shadow-[0_8px_24px_-12px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-white/70 backdrop-blur-md md:inline-flex">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: PRINT }}
                />
                {photo.alt}
              </span>
            </div>
          </motion.div>
        </div>

        {stats.length ? (
          <motion.dl
            {...enter(0.3)}
            className={cn(
              "mt-2 grid grid-cols-2 gap-2",
              stats.length === 3 && "md:grid-cols-3",
              stats.length >= 4 && "md:grid-cols-4",
            )}
          >
            {/* Stat cards in the landing's style; the first one is printed orange */}
            {stats.map((stat, index) => {
              const isPrint = index === 0;
              const plus = stat.value.endsWith("+");
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "relative isolate flex min-h-[132px] flex-col justify-between gap-6 overflow-hidden rounded-[6px] p-6 ring-1 ring-inset transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 motion-reduce:transform-none md:p-7",
                    isPrint
                      ? "text-white ring-transparent"
                      : "bg-white/80 ring-[#141414]/10 hover:shadow-[0_24px_44px_-30px_rgba(234,88,12,0.55)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(120%_70%_at_50%_110%,rgba(249,115,22,0.20),transparent_70%)] after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100",
                  )}
                  style={isPrint ? { background: PRINT } : undefined}
                >
                  <dd className="whitespace-nowrap text-[36px] font-medium leading-[0.95] tabular-nums tracking-[-0.05em] md:text-[44px]">
                    {plus ? stat.value.slice(0, -1) : stat.value}
                    {plus ? (
                      <span className={isPrint ? undefined : "text-[#f97316]"}>
                        +
                      </span>
                    ) : null}
                  </dd>
                  <dt
                    className={cn(
                      "text-[14px] leading-snug",
                      isPrint ? "text-white/85" : "text-[#141414]/55",
                    )}
                  >
                    {stat.label}
                  </dt>
                </div>
              );
            })}
          </motion.dl>
        ) : null}
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
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
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
                <li
                  key={offer.accent + position}
                  id={offer.id}
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
                          ? "bg-white/15 text-white shadow-[inset_0_3px_10px_rgba(120,30,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.3)]"
                          : "bg-[#f8f6f2] text-[#141414] shadow-[inset_0_5px_14px_rgba(20,20,20,0.13),inset_2px_0_8px_rgba(20,20,20,0.05),inset_0_1px_3px_rgba(20,20,20,0.12),inset_0_-2px_0_#fff,0_1px_0_#fff] transition-colors duration-500 group-hover:text-[#ea580c]",
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
                </li>
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
  return (
    <Band id={id} index={index} name={name} className="py-12 md:py-16">
      <Container>
        <SectionHead title={title} description={description} />

        {/* Rows of three, as on the live site; a short last row widens to fill */}
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {steps.map((step, position) => (
            <li
              key={step.title}
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
            </li>
          ))}
        </ol>
      </Container>
    </Band>
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
            <PaperCaseStudyCard
              study={featured}
              variant="featured"
              density="dense"
            />
          ) : null}
          {rest.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {rest.map((study) => (
                <PaperCaseStudyCard key={study.href} study={study} />
              ))}
            </div>
          ) : null}
        </div>
      </Container>
    </Band>
  );
}
