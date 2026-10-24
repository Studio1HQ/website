"use client";

import { useRef, type ComponentType } from "react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Compass, PenNib, RocketLaunch, type IconProps } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, Rise } from "./ui";

type StageKey = "discover" | "engage" | "adopt";

/**
 * Stages placed along the desktop path. `at` is how far along the path
 * (0-1) the line reaches the stage; positions are % of the 1300x900 canvas.
 */
const STAGES: {
  key: StageKey;
  icon: ComponentType<IconProps>;
  at: number;
  left: string;
  top: string;
  tilt: number;
}[] = [
  { key: "discover", icon: Compass, at: 0.08, left: "4%", top: "5%", tilt: -3 },
  { key: "engage", icon: PenNib, at: 0.58, left: "47%", top: "38%", tilt: 2.5 },
  { key: "adopt", icon: RocketLaunch, at: 0.86, left: "6%", top: "71%", tilt: -2.5 },
];

/**
 * One winding stroke threaded through the gaps between the stages:
 * in from the top right, a loop on the left, then out to the bottom right.
 */
const PATH =
  "M 1250 60 C 1100 120 900 180 760 260 C 600 350 420 330 330 380 C 230 435 250 540 330 545 C 420 550 430 440 340 420 C 260 402 300 600 540 650 C 760 690 1000 650 1110 720 C 1180 765 1225 795 1245 820";

function Sticker({
  icon: Icon,
  rotate,
  className,
}: {
  icon: ComponentType<IconProps>;
  rotate?: MotionValue<number> | number;
  className?: string;
}) {
  return (
    <motion.span
      aria-hidden
      style={{ rotate }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[26%] bg-gradient-to-b from-[#fb923c] to-[#c2410c] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_30px_-14px_rgba(194,65,12,0.75)]",
        className,
      )}
    >
      <Icon weight="regular" className="size-[52%]" />
    </motion.span>
  );
}

/** Mobile path: crosses the gutter centre at each stage (0, 1/3, 2/3) and swings between. */
const MOBILE_PATH =
  "M18 0 C 34 111, 2 222, 18 333 C 34 444, 2 555, 18 666 C 34 777, 2 888, 18 1000";

/** Stage marker that lights up when the drawing line reaches it. */
function StageDot({ progress, at }: { progress: MotionValue<number>; at: number }) {
  const lit = useTransform(progress, [at - 0.02, at + 0.04], [0, 1]);
  const scale = useTransform(progress, [at - 0.02, at + 0.04, at + 0.1], [0.8, 1.2, 1]);
  return (
    <motion.span
      aria-hidden
      className="absolute left-[8px] top-[12px] size-5 -translate-y-1/2 rounded-full border-[4px] border-[var(--home-cream)] bg-[var(--home-trail)]"
      style={{ scale }}
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-primary shadow-[0_0_0_5px_rgba(249,115,22,0.2)]"
        style={{ opacity: lit }}
      />
    </motion.span>
  );
}

/** Small "Step 01" label that sits above each stage title. */
function StepPill({ index }: { index: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.12em] text-primary ring-1 ring-inset ring-primary/20">
      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
      Step {String(index + 1).padStart(2, "0")}
    </span>
  );
}

function StageTitle({
  index,
  label,
  icon,
  rotate,
}: {
  index: number;
  label: string;
  icon: ComponentType<IconProps>;
  rotate?: MotionValue<number> | number;
}) {
  return (
    <div>
      <StepPill index={index} />
      <h3 className="mt-4 flex items-center gap-[0.25em] whitespace-nowrap text-[clamp(40px,5.2vw,76px)] font-medium leading-none tracking-[-0.05em] text-[var(--home-ink)]">
        <Sticker icon={icon} rotate={rotate} className="size-[0.82em]" />
        <span>{label}</span>
      </h3>
    </div>
  );
}

function Caption({ children, tilt }: { children: string; tilt: number }) {
  return (
    <p
      className="s1-glass-card mt-5 max-w-[360px] rounded-[18px] px-6 py-4 text-[15px] leading-[1.55] tracking-[-0.02em] text-[var(--home-ink-soft)] dark:[background:rgba(23,18,15,0.94)]"
      data-tilt={tilt}
    >
      {children}
    </p>
  );
}

/** A stage on the desktop canvas, revealed when the line reaches it. */
function CanvasStage({
  stage,
  index,
  progress,
  label,
  description,
}: {
  stage: (typeof STAGES)[number];
  index: number;
  progress: MotionValue<number>;
  label: string;
  description: string;
}) {
  const opacity = useTransform(progress, [stage.at - 0.1, stage.at], [0, 1]);
  const y = useTransform(progress, [stage.at - 0.1, stage.at], [24, 0]);
  const rotate = useTransform(
    progress,
    [stage.at - 0.1, stage.at, stage.at + 0.06],
    [-12, 4, 0],
  );

  return (
    <motion.div
      className="absolute"
      style={{ left: stage.left, top: stage.top, opacity, y }}
    >
      <StageTitle index={index} label={label} icon={stage.icon} rotate={rotate} />
      <div className="pl-[clamp(60px,9vw,130px)]">
        <Caption tilt={stage.tilt}>{description}</Caption>
      </div>
    </motion.div>
  );
}

export default function Process() {
  const t = useTranslations("DeveloperJourney");
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: canvasScroll } = useScroll({
    target: canvasRef,
    offset: ["start 80%", "end 95%"],
  });
  const { scrollYProgress: listScroll } = useScroll({
    target: listRef,
    offset: ["start 80%", "end 60%"],
  });
  const canvasProgress = useSpring(canvasScroll, { stiffness: 70, damping: 24, mass: 0.6 });
  const listProgress = useSpring(listScroll, { stiffness: 70, damping: 24, mass: 0.6 });
  const drawn = reduceMotion ? 1 : canvasProgress;
  const endDot = useTransform(canvasProgress, [0.94, 1], [0, 1]);
  const fullProgress = useMotionValue(1);

  return (
    <section
      id="how-it-works"
      className="overflow-hidden bg-[var(--home-cream)] py-24 text-[var(--home-ink)] md:py-32"
    >
      <Container>
        <Rise className="mx-auto max-w-[900px] text-center">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="mt-6 text-[38px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[56px] lg:text-[68px]">
            {t("titlePrefix")}{" "}
            <span className="font-editorial text-primary">{t("titleHighlight")}</span>{" "}
            {t("titleSuffix")}
          </h2>
          <p className="mx-auto mt-6 max-w-[560px] text-[16px] leading-[1.6] text-[var(--home-ink-soft)] sm:text-[17px]">
            {t("description")}
          </p>
        </Rise>

        {/* Desktop: one winding path across the canvas */}
        <div
          ref={canvasRef}
          className="relative mx-auto mt-16 hidden aspect-[1300/900] w-full max-w-[1300px] xl:block"
        >
          <svg
            aria-hidden
            viewBox="0 0 1300 900"
            className="absolute inset-0 size-full overflow-visible"
            fill="none"
          >
            <defs>
              <linearGradient id="process-stroke" x1="0" y1="0" x2="1300" y2="900" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fb923c" />
                <stop offset="1" stopColor="#c2410c" />
              </linearGradient>
              <filter id="process-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <path d={PATH} stroke="var(--home-trail)" strokeWidth="5" strokeLinecap="round" />
            {/* soft glow under the drawn line */}
            <motion.path
              d={PATH}
              stroke="#f97316"
              strokeOpacity="0.35"
              strokeWidth="14"
              strokeLinecap="round"
              filter="url(#process-glow)"
              style={{ pathLength: drawn }}
            />
            <motion.path
              d={PATH}
              stroke="url(#process-stroke)"
              strokeWidth="5"
              strokeLinecap="round"
              style={{ pathLength: drawn }}
            />
            <circle cx="1250" cy="60" r="7" fill="#fb923c" />
            <motion.g style={{ opacity: reduceMotion ? 1 : endDot }}>
              <circle cx="1245" cy="820" r="18" fill="#f97316" fillOpacity="0.18" />
              <circle cx="1245" cy="820" r="9" fill="#c2410c" />
            </motion.g>
          </svg>

          {STAGES.map((stage, index) => (
            <CanvasStage
              key={stage.key}
              stage={stage}
              index={index}
              progress={reduceMotion ? fullProgress : canvasProgress}
              label={t(`stages.${stage.key}.title`)}
              description={t(`stages.${stage.key}.description`)}
            />
          ))}
        </div>

        {/* Phones and tablets: the same journey running down the page */}
        <div ref={listRef} className="relative mx-auto mt-14 max-w-[640px] xl:hidden">
          {/* The same winding line as desktop, snaking down the gutter */}
          <svg
            aria-hidden
            viewBox="0 0 36 1000"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 top-[12px] h-[calc(100%-12px)] w-9 overflow-visible"
            fill="none"
          >
            <path d={MOBILE_PATH} stroke="var(--home-trail)" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <motion.path
              d={MOBILE_PATH}
              stroke="#f97316"
              strokeOpacity="0.35"
              strokeWidth="12"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              filter="url(#process-glow-m)"
              style={{ pathLength: reduceMotion ? 1 : listProgress }}
            />
            <motion.path
              d={MOBILE_PATH}
              stroke="url(#process-stroke-m)"
              strokeWidth="4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ pathLength: reduceMotion ? 1 : listProgress }}
            />
            <defs>
              <linearGradient id="process-stroke-m" x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fb923c" />
                <stop offset="1" stopColor="#c2410c" />
              </linearGradient>
              <filter id="process-glow-m" x="-200%" y="-10%" width="500%" height="120%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
          </svg>

          <ol className="space-y-14 sm:space-y-16">
            {STAGES.map((stage, index) => (
              <li key={stage.key} className="relative pl-12 sm:pl-14">
                <StageDot
                  progress={reduceMotion ? fullProgress : listProgress}
                  at={index / STAGES.length}
                />
                <Rise>
                  <StepPill index={index} />
                  <h3 className="mt-3 flex flex-wrap items-center gap-3 text-[38px] font-medium leading-none tracking-[-0.05em] text-[var(--home-ink)] sm:text-[56px]">
                    <Sticker icon={stage.icon} className="size-[0.82em]" />
                    <span>{t(`stages.${stage.key}.title`)}</span>
                  </h3>
                  <Caption tilt={stage.tilt}>{t(`stages.${stage.key}.description`)}</Caption>
                </Rise>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
