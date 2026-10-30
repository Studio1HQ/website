"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/ui/svgs/logo";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Plus,
  RedditLogo,
} from "@phosphor-icons/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Accent,
  FAINT,
  IndexBar,
  MUTED,
  SectionHead,
} from "@/components/paper/paper-sections";
import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";
import type { ProcessStep } from "@/components/sections/process-scroller";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";
import { BrandText, ClientMark } from "@/components/pages/shared/brand-text";
import { cn } from "@/lib/utils";

const pad2 = (value: number) => String(value).padStart(2, "0");

/* ------------------------------------------------------------------ */
/* Section header: printed index line, then the framed headline        */
/* ------------------------------------------------------------------ */

export function ServiceHead({
  index,
  name,
  title,
  accent,
  description,
  aside,
}: {
  index: number;
  name: string;
  title: ReactNode;
  /** Trailing words printed in orange. */
  accent?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <IndexBar index={index} name={name} aside={aside} />
      <SectionHead
        title={
          accent ? (
            <>
              {title} <Accent>{accent}</Accent>
            </>
          ) : (
            title
          )
        }
        description={description}
      />
    </>
  );
}

/** Small ink-on-paper chip, e.g. a badge or a format tag. */
export function PaperChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[6px] bg-[#141414]/[0.05] px-2.5 py-1 text-[12px] font-medium text-[#141414]/75">
      {children}
    </span>
  );
}

/** Bullet list with small print-orange squares. */
export function PaperPoints({
  points,
  className,
}: {
  points: ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {points.map((point, index) => (
        <li
          key={index}
          className="flex items-start gap-2.5 text-[14px] leading-snug text-[#141414]"
        >
          <span
            aria-hidden
            className="mt-[6px] size-1.5 shrink-0"
            style={{ background: PRINT }}
          />
          <span className="min-w-0">{point}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Case study proof card (paper)                                       */
/* ------------------------------------------------------------------ */

/** Inset "engraved" tile used for result numbers, as on the home page. */
const ENGRAVED =
  "rounded-[6px] bg-[#ece5da] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]";

const CARD =
  "group relative isolate overflow-hidden rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/[0.08] shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[inset_0_1px_0_#fff,0_30px_60px_-34px_rgba(249,115,22,0.45)] motion-reduce:transform-none after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(120%_70%_at_50%_110%,rgba(249,115,22,0.20),transparent_70%)] after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100";

/** A real image from each client's case study, for the featured banner. */
const CASE_ART: Record<string, string> = {
  "entelligence-ai":
    "/case-studies/entelligence-ai/openclaw-technical-deep-dive.webp",
  memori: "/case-studies/memori/memori-reddit-launch-stats.png",
  nebius: "/case-studies/nebius/workshop-dublin-poster.webp",
  litellm: "/case-studies/litellm/github-guides-activity.webp",
  tensorlake: "/case-studies/tensorlake/tensorlake-home.webp",
  jozu: "/case-studies/jozu/kubecon-jozu-booth.webp",
  openlore: "/case-studies/openlore/openlore-hackspire-talk.webp",
  corsair: "/case-studies/corsair/github-readme.webp",
};

/* Banner colours, cycled across the smaller cards. */
const CASE_TONES = [
  {
    bg: "#141414",
    ink: "#f4efe7",
    soft: "rgba(244,239,231,0.7)",
    pill: "#f4efe7",
    pillInk: "#141414",
  },
  {
    bg: "#ece2d3",
    ink: "#141414",
    soft: "rgba(20,20,20,0.62)",
    pill: "#141414",
    pillInk: "#f4efe7",
  },
];

function CasePill({
  bg,
  ink,
  company,
}: {
  bg: string;
  ink: string;
  company: string;
}) {
  return (
    <span
      className="inline-flex h-10 items-center gap-2 rounded-full pl-5 pr-1.5 text-[14px] font-medium transition-transform duration-300 group-hover:-translate-y-0.5"
      style={{ background: bg, color: ink }}
    >
      Read case study
      <span
        className="flex size-7 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
        style={{ background: PRINT }}
      >
        <ArrowUpRight weight="bold" className="size-3.5" />
      </span>
      <span className="sr-only">: {company}</span>
    </span>
  );
}

/** Logo tile that breaks out of the banner's top edge. */
function PoppingMark({ href }: { href: string }) {
  return (
    <span className="absolute -top-7 right-7 rotate-[6deg] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:rotate-[2deg]">
      <ClientMark
        href={href}
        className="size-16 rounded-[14px] bg-white p-2.5 shadow-[0_18px_34px_-16px_rgba(20,20,20,0.55)]"
      />
    </span>
  );
}

/**
 * The case image in a clean white frame: client logo and name in the
 * header, a small Studio1 badge on the right, the image below.
 */
function CaseFrame({
  study,
  art,
  imageHeight,
}: {
  study: CaseStudyResultData;
  art?: string;
  imageHeight: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[10px] bg-white p-1.5 text-[#141414] shadow-[0_30px_60px_-34px_rgba(60,20,0,0.55)] ring-1 ring-[#141414]/[0.05] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1">
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <ClientMark href={study.href} className="size-6 rounded-[5px] p-0.5" />
        <span className="truncate text-[12.5px] font-medium">
          {study.company}
        </span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-[#f97316] py-0.5 pl-1 pr-2 text-[10.5px] font-medium text-white">
          <Logo className="size-3.5 brightness-0 invert" />
          Studio1
        </span>
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-[6px] bg-[#f6f2ec]",
          imageHeight === "100%" && "min-h-0 flex-1",
        )}
        style={imageHeight === "100%" ? undefined : { height: imageHeight }}
      >
        {art ? (
          <Image
            src={art}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover object-left-top"
          />
        ) : (
          <span className="absolute inset-x-0 top-5 flex justify-center">
            <ClientMark href={study.href} className="size-16 bg-white p-2.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/** The study's stats as tidy chips inside the card's text column. */
function CaseChips({
  stats,
  dark,
}: {
  stats?: CaseStudyResultData["stats"];
  /** Chips on a dark or orange card. */
  dark?: boolean;
}) {
  if (!stats?.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {stats.slice(0, 3).map((stat, index) => (
        <li
          key={`${stat.value}-${index}`}
          className={cn(
            "flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[12.5px] font-medium ring-1 ring-inset backdrop-blur-md",
            dark
              ? "bg-white/12 text-white ring-white/20"
              : "bg-white/70 text-[#141414] ring-[#141414]/[0.06]",
          )}
        >
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              dark ? "bg-white text-[#141414]" : "bg-[#141414] text-white",
            )}
          >
            {stat.value}
          </span>
          {stat.label}
        </li>
      ))}
    </ul>
  );
}

/** One stat chip set across the image frame's edge, half on each side. */
function EdgeChip({
  stat,
  className,
}: {
  stat?: NonNullable<CaseStudyResultData["stats"]>[number];
  className?: string;
}) {
  if (!stat) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-10 hidden items-center gap-2 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 text-[12.5px] font-medium text-[#141414] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_30px_-14px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-white/70 backdrop-blur-md transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 md:flex",
        className,
      )}
    >
      <span className="rounded-full bg-[#f97316] px-2.5 py-0.5 text-[11px] font-semibold text-white">
        {stat.value}
      </span>
      {stat.label}
    </span>
  );
}

export function PaperCaseStudyCard({
  study,
  variant = "compact",
  position = 0,
}: {
  study: CaseStudyResultData;
  variant?: "featured" | "compact";
  density?: "default" | "dense";
  /** Index among the smaller cards, to alternate their colour. */
  position?: number;
}) {
  const slug = study.href.split("/").filter(Boolean).pop() ?? "";
  const art = CASE_ART[slug];

  if (variant === "featured") {
    return (
      <Link
        href={study.href}
        className="group relative isolate mt-8 grid overflow-visible rounded-[10px] text-white md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        style={{
          background:
            "linear-gradient(140deg, #fe3c34 0%, #f97316 55%, #fb8a1e 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[10px] opacity-30 mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        {/* Large, faint Reddit marks in the background, where the reach came from */}
        {/reddit/i.test(study.heroLabel) ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[10px]"
          >
            <RedditLogo
              weight="fill"
              className="absolute -bottom-16 left-[30%] size-[300px] -rotate-[12deg] text-white/[0.09]"
            />
            <RedditLogo
              weight="fill"
              className="absolute -left-10 top-[38%] size-[150px] rotate-[10deg] text-white/[0.07]"
            />
            <RedditLogo
              weight="fill"
              className="absolute left-[44%] top-6 size-[90px] rotate-[18deg] text-white/[0.08]"
            />
          </span>
        ) : null}
        <div className="relative flex flex-col gap-6 p-7 md:p-10">
          <p className="text-[13px] font-medium text-white/75">
            {study.company} · {study.category}
          </p>
          <h3 className="text-[clamp(38px,4.4vw,64px)] font-normal leading-[1] tracking-[-0.05em]">
            {study.heroValue}
            <span className="mt-2 block text-[clamp(22px,2.2vw,32px)] leading-[1.15] tracking-[-0.035em] text-white/95">
              <BrandText text={study.heroLabel} color="#ffffff" />
            </span>
          </h3>
          <p className="max-w-[520px] text-[15.5px] leading-[1.6] text-white/85">
            {study.proof}
          </p>
          <CaseChips stats={study.stats?.slice(1)} dark />
          <div className="mt-auto pt-2">
            <CasePill bg="#141414" ink="#f4efe7" company={study.company} />
          </div>
        </div>

        {/* Case image, running off the card's right edge */}
        <div className="relative min-h-[320px] md:min-h-0">
          <div className="absolute inset-0 overflow-hidden rounded-b-[10px] md:rounded-l-none md:rounded-r-[10px]">
            <div className="absolute inset-y-10 left-5 w-[118%] md:left-2">
              <CaseFrame study={study} art={art} imageHeight="100%" />
            </div>
          </div>
          <PoppingMark href={study.href} />
          <EdgeChip stat={study.stats?.[0]} className="-left-10 bottom-16" />
        </div>
      </Link>
    );
  }

  const tone = CASE_TONES[position % CASE_TONES.length];
  return (
    <Link
      href={study.href}
      className="group relative isolate mt-8 flex h-full min-h-[420px] flex-col gap-6 overflow-visible rounded-[10px] p-7 ring-1 ring-inset ring-[#141414]/[0.06] md:p-9"
      style={{ background: tone.bg, color: tone.ink }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[10px] opacity-25 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      <PoppingMark href={study.href} />
      <div className="relative grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="flex flex-col gap-6">
          <p className="text-[13px] font-medium" style={{ color: tone.soft }}>
            {study.company} · {study.category}
          </p>
          <h3 className="text-[clamp(34px,3.6vw,52px)] font-normal leading-[1] tracking-[-0.05em]">
            {study.heroValue}
            <span className="mt-2 block text-[clamp(19px,1.7vw,24px)] leading-[1.2] tracking-[-0.03em]">
              <BrandText text={study.heroLabel} />
            </span>
          </h3>
          <p className="text-[15px] leading-[1.6]" style={{ color: tone.soft }}>
            {study.proof}
          </p>
          <CaseChips
            stats={study.stats?.slice(1)}
            dark={tone.bg === "#141414"}
          />
          <div className="mt-auto pt-2">
            <CasePill
              bg={tone.pill}
              ink={tone.pillInk}
              company={study.company}
            />
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="relative -mr-9 overflow-hidden rounded-r-[10px]">
            <div className="w-[108%]">
              <CaseFrame study={study} art={art} imageHeight="210px" />
            </div>
          </div>
          <EdgeChip stat={study.stats?.[0]} className="-bottom-4 -left-8" />
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Process: orange panel and step cards inside one outer card          */
/* ------------------------------------------------------------------ */

const ORANGE_PANEL = {
  background:
    "linear-gradient(165deg, #fe3200 8%, #fc8c04 48%, rgba(242,138,111,0) 86%), linear-gradient(90deg, #fc8c04, #fc8c04)",
};

/** Real Studio1 event photos behind the process scene, one per step. */
const STORY_PHOTOS = [
  "/case-studies/openlore/openlore-hackspire-talk.webp",
  "/case-studies/jozu/devfest-jozu-booth.webp",
  "/case-studies/jozu/kubecon-jozu-booth.webp",
  "/case-studies/jozu/devfest-pune-2025.webp",
  "/case-studies/jozu/kubecon-india-2025.webp",
];

const STORY_EASE = [0.16, 1, 0.3, 1] as const;

/** Sweeps an orange highlighter across one phrase of a sentence. */
function UnderlinedPhrase({
  text,
  phrase,
  reduceMotion,
}: {
  text: string;
  phrase?: string;
  reduceMotion: boolean | null;
}) {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (!phrase || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <motion.span
        className="rounded-[3px] bg-no-repeat px-0.5 text-[#141414] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        style={{
          backgroundImage:
            "linear-gradient(transparent 52%, rgba(249,115,22,0.24) 52%, rgba(249,115,22,0.24) 94%, transparent 94%)",
          backgroundPosition: "0 0",
        }}
        initial={reduceMotion ? false : { backgroundSize: "0% 100%" }}
        animate={{ backgroundSize: "100% 100%" }}
        transition={{ duration: 0.8, ease: STORY_EASE, delay: 0.25 }}
      >
        {phrase}
      </motion.span>
      {text.slice(at + phrase.length)}
    </>
  );
}

/**
 * Step marker. Passed steps show a quiet check, the active step is filled
 * orange with a soft breathing halo and a ring that fills as you scroll
 * through it, upcoming steps are a thin grey outline.
 */
function StepRing({
  progress,
  position,
  count,
  on,
  done,
}: {
  progress: MotionValue<number>;
  position: number;
  count: number;
  on: boolean;
  done: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const fill = useTransform(
    progress,
    [position / count, (position + 1) / count],
    [0.04, 1],
    { clamp: true },
  );
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center">
      {/* Breathing halo on the active step */}
      {on && !reduceMotion ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(249,115,22,0.18)" }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
      <svg
        aria-hidden
        viewBox="0 0 36 36"
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke={done ? "rgba(249,115,22,0.55)" : "rgba(20,20,20,0.2)"}
          strokeWidth="1.75"
          className="transition-[stroke] duration-500"
        />
        {on ? (
          <motion.circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke={PRINT}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ pathLength: fill }}
          />
        ) : null}
      </svg>
      {/* Inner disc */}
      <motion.span
        className="relative flex size-7 items-center justify-center rounded-full text-[11px] font-medium tabular-nums"
        initial={false}
        animate={
          on
            ? { backgroundColor: PRINT, color: "#ffffff", scale: 1 }
            : {
                backgroundColor: "rgba(255,255,255,0)",
                color: done ? PRINT : "rgba(20,20,20,0.38)",
                scale: 0.92,
              }
        }
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {done ? (
          <Check weight="bold" className="size-3.5" />
        ) : (
          pad2(position + 1)
        )}
      </motion.span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Line art for the process scene                                      */
/* ------------------------------------------------------------------ */

/** One background curve per step; same commands, so they morph smoothly. */
const STORY_LINES = [
  "M-40 760 C 260 560, 420 820, 640 560 S 980 80, 1260 220",
  "M-40 620 C 220 760, 480 700, 700 420 S 1000 200, 1260 360",
  "M-40 420 C 300 300, 520 640, 760 520 S 1040 640, 1260 460",
  "M-40 300 C 240 160, 460 480, 680 380 S 960 760, 1260 640",
  "M-40 540 C 280 700, 500 260, 720 300 S 1020 520, 1260 120",
];

/**
 * Desktop process: a pinned scene that steps through the process as you
 * scroll. The step list on the left fills an orange bar through the active
 * step, the centre is a blurred event photo holding a clean working card,
 * and the right column names the step and explains it.
 */
function ProcessStory({
  title,
  accent,
  description,
  steps,
  stepLabel,
}: {
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  steps: ProcessStep[];
  stepLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  // A spring over the scroll position keeps every moving part smooth.
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });
  // The step changes on the raw scroll, so it never lags behind.
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(
      steps.length - 1,
      Math.max(0, Math.floor(value * steps.length)),
    );
    setActive((current) => (current === next ? current : next));
  });
  // The background line draws itself and drifts as you scroll.
  const lineShift = useTransform(progress, [0, 1], [40, -40]);

  const jump = (position: number) => {
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const span = track.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + (span * (position + 0.5)) / steps.length,
      behavior: "smooth",
    });
  };

  const step = steps[active];
  const StepIcon = step.icon;
  const swap = {
    initial: reduceMotion ? false : { opacity: 0, scale: 0.985 },
    animate: { opacity: 1, scale: 1 },
    exit: reduceMotion ? undefined : { opacity: 0, scale: 1.01 },
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] as const },
  };

  return (
    <div
      ref={trackRef}
      className="relative mt-8 hidden lg:block"
      style={{ height: `${steps.length * 130 + 40}vh` }}
    >
      <div className="sticky top-0 h-[100svh]">
        {/* Soft textured band behind the scene, a new curve for each step */}
        <motion.svg
          aria-hidden
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
          className="pointer-events-none absolute -inset-x-[20vw] inset-y-0 -z-10 h-full w-[calc(100%+40vw)]"
          style={{ y: lineShift }}
        >
          <motion.path
            fill="none"
            stroke="rgba(20,20,20,0.045)"
            strokeWidth="150"
            strokeLinecap="round"
            initial={false}
            animate={{ d: STORY_LINES[active % STORY_LINES.length] }}
            transition={{ duration: 1.8, ease: [0.45, 0, 0.2, 1] }}
          />
        </motion.svg>

        <div className="grid h-full grid-cols-[minmax(0,0.75fr)_minmax(0,1.2fr)_minmax(0,0.95fr)] gap-12 py-[12svh] xl:gap-16">
          {/* Left: headline, then the step list */}
          <div className="self-start pt-2">
            {/* Same highlighted heading as the other sections */}
            <h2 className="text-[30px] font-medium leading-[1.2] tracking-[-0.045em] xl:text-[34px]">
              <span>
                {title}
                {accent ? (
                  <>
                    {" "}
                    <Accent>{accent}</Accent>
                  </>
                ) : null}
              </span>
            </h2>
            <ol className="relative mt-10 flex flex-col gap-1">
              {steps.map((item, position) => {
                const on = position === active;
                return (
                  <li key={item.name} className="relative">
                    <button
                      type="button"
                      onClick={() => jump(position)}
                      className="relative flex w-full items-center gap-4 py-2 text-left"
                    >
                      <StepRing
                        progress={progress}
                        position={position}
                        count={steps.length}
                        on={on}
                        done={position < active}
                      />
                      <span
                        className={cn(
                          "text-[17px] tracking-[-0.02em] transition-colors duration-500",
                          on
                            ? "font-medium text-[#141414]"
                            : "text-[#141414]/40 hover:text-[#141414]/70",
                        )}
                      >
                        {item.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Centre: a blurred event photo holding the working card */}
          <div className="relative isolate h-full overflow-hidden rounded-[10px] bg-[#1b120c] shadow-[0_50px_90px_-50px_rgba(60,20,0,0.65)]">
            <AnimatePresence initial={false}>
              <motion.div
                key={`photo-${active}`}
                className="absolute inset-0 -z-10"
                initial={reduceMotion ? false : { opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1.02 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              >
                <Image
                  src={STORY_PHOTOS[active % STORY_PHOTOS.length]}
                  alt=""
                  fill
                  sizes="600px"
                  className="object-cover blur-[6px] brightness-[0.62] saturate-[1.15]"
                />
              </motion.div>
            </AnimatePresence>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(80% 60% at 30% 100%, rgba(249,115,22,0.35), transparent 70%), linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.35))",
              }}
            />

            <div className="absolute inset-0 grid place-items-center px-8">
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  {...swap}
                  className="col-start-1 row-start-1 w-full max-w-[400px] overflow-hidden rounded-[8px] bg-white text-[#141414] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.55)]"
                >
                  <ul className="flex flex-col gap-2 px-5 pb-4 pt-5">
                    {step.details.map((detail, detailIndex) => (
                      <motion.li
                        key={detailIndex}
                        initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: STORY_EASE,
                          delay: 0.2 + detailIndex * 0.08,
                        }}
                        className="flex items-start gap-2.5 text-[14px] leading-snug"
                      >
                        <Check
                          weight="bold"
                          className="mt-[2px] size-3.5 shrink-0"
                          style={{ color: PRINT }}
                        />
                        <div className="min-w-0">{detail}</div>
                      </motion.li>
                    ))}
                  </ul>
                  {/* Toolbar row, like a composer */}
                  <div className="flex items-center gap-3 border-t border-[#141414]/[0.07] px-4 py-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#141414]/[0.06]">
                      <StepIcon className="size-4" />
                    </span>
                    <span className="text-[13px] font-medium text-[#141414]/70">
                      {step.name}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 text-[12px] text-[#141414]/40">
                      {stepLabel} {pad2(active + 1)}
                      <ArrowRight
                        weight="bold"
                        className="size-3.5 text-[#f97316]"
                      />
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress pill */}
            <div className="absolute inset-x-0 bottom-7 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 ring-1 ring-inset ring-white/20 backdrop-blur-md">
                {steps.map((item, position) => (
                  <span
                    key={item.name}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      position === active ? "w-5 bg-white" : "w-1 bg-white/40",
                    )}
                  />
                ))}
              </span>
            </div>
          </div>

          {/* Right: what this step is */}
          <div className="self-center">
            <div className="grid">
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  {...swap}
                  className="col-start-1 row-start-1"
                >
                  <h3 className="text-[36px] font-normal leading-[1.08] tracking-[-0.045em] xl:text-[42px]">
                    {step.name}
                  </h3>
                  <p className="mt-6 text-[16.5px] leading-[1.65] text-[#141414]/80">
                    <UnderlinedPhrase
                      text={step.description}
                      phrase={step.highlight}
                      reduceMotion={reduceMotion}
                    />
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            {description ? (
              <p className="mt-10 text-[13.5px] leading-relaxed text-[#141414]/45">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaperServiceProcess({
  index,
  name = "Process",
  title,
  accent,
  description,
  steps,
  stepLabel = "Step",
}: {
  index: number;
  name?: string;
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  steps: ProcessStep[];
  stepLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <IndexBar index={index} name={name} />
      <ProcessStory
        title={title}
        accent={accent}
        description={description}
        steps={steps}
        stepLabel={stepLabel}
      />
      {/* Phones and tablets: the orange panel and step cards in one outer card */}
      <div className="mt-8 rounded-[6px] lg:hidden bg-white/70 p-2 shadow-[0_30px_60px_-44px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08] sm:p-2.5">
        <div className="grid gap-2 sm:gap-2.5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div
              className="relative isolate flex flex-col justify-between gap-10 overflow-hidden rounded-[4px] px-6 py-10 text-white md:px-10 md:py-12 lg:min-h-[440px]"
              style={ORANGE_PANEL}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
                style={{ backgroundImage: GRAIN }}
              />
              <h2 className="max-w-[520px] text-[32px] font-medium leading-[1.15] tracking-[-0.045em] sm:text-[40px] lg:text-[44px]">
                {title}
                {accent ? (
                  <>
                    {" "}
                    <span className="text-[#141414]">{accent}</span>
                  </>
                ) : null}
              </h2>
              <div>
                {description ? (
                  <p className="max-w-[420px] text-[16px] leading-relaxed text-white/90 md:text-[17px]">
                    {description}
                  </p>
                ) : null}
                <p className="mt-8 flex flex-wrap items-center gap-3 text-[13px] font-medium text-white/80">
                  <span className="tabular-nums">{pad2(steps.length)}</span>
                  <span className="h-px w-10 bg-white/50" />
                  {steps.map((step) => step.name).join(" · ")}
                </p>
              </div>
            </div>
          </div>

          {/* Engraved tray holding one white card per step */}
          <ol className="flex flex-col gap-2 rounded-[4px] bg-[#f3eee6] p-2 shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)] sm:p-2.5">
            {steps.map((step, position) => {
              const StepIcon = step.icon;
              return (
                <motion.li
                  key={step.name}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: 48, scale: 0.97, filter: "blur(12px)" }
                  }
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  viewport={{ once: false, margin: "0px 0px -12% 0px" }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="group rounded-[4px] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,20,0.06),0_10px_24px_-18px_rgba(20,20,20,0.35)] ring-1 ring-inset ring-[#141414]/[0.06] transition-shadow duration-500 hover:shadow-[0_1px_2px_rgba(20,20,20,0.06),0_16px_30px_-22px_rgba(20,20,20,0.35)] sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] text-[#141414] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)] transition-colors duration-500 group-hover:text-[#ea580c]">
                      <StepIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[12px] font-medium tabular-nums",
                          FAINT,
                        )}
                      >
                        {stepLabel} {pad2(position + 1)} / {pad2(steps.length)}
                      </p>
                      <h3 className="mt-0.5 text-[21px] font-medium leading-tight tracking-[-0.035em] md:text-[23px]">
                        {step.name}
                      </h3>
                    </div>
                  </div>
                  <p className={cn("mt-4 text-[15px] leading-[1.6]", MUTED)}>
                    {step.description}
                  </p>
                  <ul className="mt-5 grid gap-x-5 gap-y-2.5 rounded-[4px] bg-[#f8f6f2] p-4 shadow-[inset_0_2px_6px_rgba(20,20,20,0.07)] sm:grid-cols-2">
                    {step.details.map((detail, detailIndex) => (
                      <li
                        key={detailIndex}
                        className="flex items-start gap-2.5 text-[14px] font-medium leading-snug text-[#141414]"
                      >
                        <Check
                          weight="bold"
                          className="mt-[2px] size-4 shrink-0"
                          style={{ color: PRINT }}
                        />
                        <div className="min-w-0">{detail}</div>
                      </li>
                    ))}
                  </ul>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ (paper): same copy and JSON-LD as components/landing/faq        */
/* ------------------------------------------------------------------ */

type FaqEntry = { question: string; answer: string };

export function PaperServiceFaq({
  index,
  items,
  subtitle,
}: {
  index: number;
  items: FaqEntry[];
  subtitle?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <IndexBar index={index} name="FAQ" />
      {/* Head on top, then the questions one after another */}
      <SectionHead
        title={
          <>
            Frequently Asked <Accent>Questions</Accent>
          </>
        }
        description={
          subtitle ?? "Everything you need to know about working with Studio1."
        }
        actionEnd
        action={
          <a
            href="https://cal.com/studio1/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ background: INK, color: PAPER }}
          >
            Book a call
            <span
              className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
              style={{ background: PRINT }}
            >
              <ArrowUpRight weight="bold" className="size-4" />
            </span>
          </a>
        }
      />
      <div className="mt-10">
        {/* Questions in one white card, hairline rows */}
        <div className="min-w-0 rounded-[6px] bg-white/80 px-6 py-2 ring-1 ring-inset ring-[#141414]/10 sm:px-8">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, position) => (
              <AccordionItem
                key={item.question}
                value={`faq-${position}`}
                className="border-b border-[#141414]/10 last:border-b-0"
              >
                <AccordionTrigger
                  className={cn(
                    "group gap-5 py-5 text-left hover:no-underline sm:py-6",
                    "[&>svg]:hidden",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2",
                  )}
                >
                  <span className="w-7 shrink-0 text-[13px] font-medium tabular-nums text-[#141414]/35 transition-colors group-data-[state=open]:text-[#f97316]">
                    {pad2(position + 1)}
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-[#141414] transition-colors duration-200 group-hover:text-[#f97316] group-data-[state=open]:text-[#f97316] sm:text-[17px]">
                    {item.question}
                  </span>
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#f8f6f2] text-[#141414]/55 shadow-[inset_0_2px_5px_rgba(20,20,20,0.10)] transition-colors group-data-[state=open]:bg-[#f97316] group-data-[state=open]:text-white group-data-[state=open]:shadow-none"
                  >
                    <Plus
                      weight="bold"
                      className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-45"
                    />
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    "max-w-[760px] pb-6 pl-12 pr-12 text-[15px] leading-[1.7]",
                    MUTED,
                  )}
                >
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </>
  );
}
