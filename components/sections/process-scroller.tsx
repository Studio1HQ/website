"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type Variants,
} from "motion/react";
import { Check } from "@phosphor-icons/react";
import { Num } from "../ui/num";
import { cn } from "@/lib/utils";

export interface ProcessStep {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  details: React.ReactNode[];
  /** Phrase in the description to underline. */
  highlight?: string;
}

interface ProcessScrollerProps {
  steps: ProcessStep[];
  /** Label shown next to step numbers, e.g. "Step", "Week", "Phase" */
  stepLabel?: string;
  /**
   * Section heading rendered inside the pinned viewport on desktop (so it
   * stays visible while scrubbing) and above the stacked list elsewhere.
   */
  heading?: React.ReactNode;
}

const EASE_OUT: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Scroll distance per step while the deck is pinned. */
const STEP_SCROLL_VH = 100;

/** Fixed navbar clearance — keep in sync with sticky `top-*` below. */
const STICKY_TOP_PX = 96;

/** Decorative ticks rendered between step ticks on the timeline rail. */
const SUB_TICKS_PER_GAP = 2;

const pad2 = (value: number) => String(value).padStart(2, "0");

type TimelineNode =
  { type: "main"; index: number } | { type: "sub"; index: number };

const processCardSurface =
  "s1-glass-card s1-glass-raised group relative min-h-[22rem] overflow-hidden rounded-[6px]";

function ProcessDeckCard({
  step,
  stepLabel,
  index,
  count,
}: {
  step: ProcessStep;
  stepLabel: string;
  index: number;
  count: number;
}) {
  return (
    <div className={processCardSurface}>

      <div className="deck-content relative z-[1] flex h-full flex-col p-7 transition-opacity duration-500 xl:p-8">
        <div className="flex items-center justify-between">
          <span className="font-numeric text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            {stepLabel} <Num>{pad2(index + 1)}</Num>{" "}
            <span className="text-[var(--home-ink-soft)]/50">
              / <Num>{pad2(count)}</Num>
            </span>
          </span>
          <step.icon className="size-[18px] text-[var(--home-ink-soft)]/60 transition-colors duration-500 group-hover:text-primary" />
        </div>

        <h3 className="mt-3 text-[32px] font-medium tracking-[-0.04em] text-[var(--home-ink)]">
          {step.name}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--home-ink-soft)]">
          {step.description}
        </p>

        <ul className="mt-6 border-t border-[var(--home-line)]">
          {step.details.map((detail, detailIndex) => (
            <li
              key={detailIndex}
              className="flex items-start gap-3 border-b border-[var(--home-line)] py-3 last:border-b-0"
            >
              <Check
                weight="bold"
                className="mt-[3px] size-4 shrink-0 text-primary"
              />
              <div className="text-[14px] font-medium leading-snug text-[var(--home-ink)]">
                {detail}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop: scroll-driven card deck with timeline rail                 */
/* ------------------------------------------------------------------ */

const deckTween = {
  duration: 0.75,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const ProcessDeck: React.FC<{
  steps: ProcessStep[];
  stepLabel: string;
  heading?: React.ReactNode;
}> = ({ steps, stepLabel, heading }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const count = Math.max(steps.length, 1);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    // Pin point = navbar clearance. Progress 0 at pin → always opens on step 01.
    offset: [`start ${STICKY_TOP_PX}px`, "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    // Hold step 01 through the first slice so arriving at the section
    // never lands mid-deck from scroll momentum / offset quirks.
    const p = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
    const intro = 1 / (count + 1);
    const next =
      p <= intro
        ? 0
        : Math.min(
            count - 1,
            Math.floor(((p - intro) / (1 - intro)) * count),
          );
    setActive((prev) => (next === prev ? prev : next));
  });

  const scrollToStep = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const sticky = track.firstElementChild as HTMLElement | null;
      const stickyHeight = sticky?.offsetHeight ?? window.innerHeight;
      const range = Math.max(track.offsetHeight - stickyHeight, 1);
      const top = track.getBoundingClientRect().top + window.scrollY;
      const intro = 1 / (count + 1);
      const progress =
        index <= 0 ? intro * 0.5 : intro + ((index + 0.5) / count) * (1 - intro);
      window.scrollTo({
        top: top + progress * range,
        behavior: "smooth",
      });
    },
    [count],
  );

  const timelineNodes = useMemo(() => {
    const nodes: TimelineNode[] = [];
    steps.forEach((_, index) => {
      nodes.push({ type: "main", index });
      if (index < steps.length - 1) {
        for (let sub = 1; sub <= SUB_TICKS_PER_GAP; sub++) {
          nodes.push({
            type: "sub",
            index: index + sub / (SUB_TICKS_PER_GAP + 1),
          });
        }
      }
    });
    return nodes;
  }, [steps]);

  return (
    <div
      ref={trackRef}
      className="relative w-full"
      style={{ height: `${count * STEP_SCROLL_VH}vh` }}
    >
      <div
        className="sticky flex w-full flex-col items-center pt-4 pb-6"
        style={{ top: STICKY_TOP_PX }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="flex w-full flex-col items-center gap-3 xl:gap-4"
        >
          {heading && <div className="w-full">{heading}</div>}

          <div className="mt-5 flex w-full max-w-4xl items-center justify-center gap-10 xl:mt-6 xl:gap-14">
            {/* Card deck */}
            {/* Horizontal deck: upcoming steps peek out to the right; on each
                step the front card glides off to the left and the next one
                slides forward into its place. */}
            <div className="relative flex h-[26rem] min-w-0 flex-1 items-center justify-center">
              {steps.map((step, index) => {
                const offset = index - active;
                const isPast = index < active;
                const visibleBehind = offset <= 2;
                return (
                  <motion.div
                    key={step.name}
                    aria-hidden={index !== active}
                    className={cn(
                      "absolute w-[30rem] max-w-full xl:w-[33rem]",
                      // Cards waiting behind show only their glass, never text
                      // bleeding through the front card.
                      index !== active && "[&_.deck-content]:opacity-0",
                    )}
                    initial={false}
                    animate={{
                      x: isPast ? "-62%" : offset * 34,
                      scale: isPast ? 0.94 : 1 - offset * 0.05,
                      opacity: isPast ? 0 : visibleBehind ? 1 - offset * 0.32 : 0,
                      filter: isPast ? "blur(10px)" : `blur(${offset > 0 ? 1.5 : 0}px)`,
                    }}
                    transition={deckTween}
                    style={{
                      zIndex: count - index,
                      pointerEvents: index === active ? "auto" : "none",
                    }}
                  >
                  <ProcessDeckCard
                    step={step}
                    stepLabel={stepLabel}
                    index={index}
                    count={count}
                  />
                </motion.div>
                );
              })}
            </div>

            {/* Timeline rail */}
            <div
              className="relative z-10 flex shrink-0 flex-col items-end py-2"
              role="group"
              aria-label="Process steps"
              onMouseLeave={() => setHoverIndex(null)}
            >
              {timelineNodes.map((node) => {
                if (node.type === "main") {
                  const index = node.index;
                  const isActive = index === active;
                  const isLabelVisible =
                    hoverIndex === index || (hoverIndex === null && isActive);
                  return (
                    <button
                      key={`main-${index}`}
                      type="button"
                      onMouseEnter={() => setHoverIndex(index)}
                      onFocus={() => setHoverIndex(index)}
                      onBlur={() => setHoverIndex(null)}
                      onClick={() => scrollToStep(index)}
                      aria-label={`${stepLabel} ${index + 1}: ${steps[index].name}`}
                      aria-current={isActive ? "step" : undefined}
                      className="group relative flex w-24 items-center justify-end py-[3px] focus-visible:outline-none"
                    >
                      {isLabelVisible && (
                        <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2">
                          <motion.span
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.18, ease: EASE_OUT }}
                            className="block whitespace-nowrap text-[11px] font-medium text-[var(--home-ink-soft)]"
                          >
                            {steps[index].name}
                          </motion.span>
                        </span>
                      )}
                      <span className="block h-[3px] w-6 rounded-full bg-foreground/25 transition-colors duration-300 group-hover:bg-foreground/40 group-focus-visible:ring-2 group-focus-visible:ring-primary/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background" />
                    </button>
                  );
                }

                return (
                  <div
                    key={`sub-${node.index}`}
                    aria-hidden
                    className="flex w-24 cursor-pointer justify-end py-[3px]"
                    onMouseEnter={() => setHoverIndex(node.index)}
                    onClick={() => scrollToStep(Math.round(node.index))}
                  >
                    <span className="block h-[3px] w-6 rounded-full bg-foreground/20" />
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Stacked layout: mobile and reduced motion                           */
/* ------------------------------------------------------------------ */

const stackItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASE_OUT,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const stackDetailVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

const ProcessStack: React.FC<{
  steps: ProcessStep[];
  stepLabel: string;
  animate: boolean;
}> = ({ steps, stepLabel, animate }) => (
  <ol className="mx-auto w-full max-w-2xl list-none divide-y divide-[var(--home-line)]">
    {steps.map((step, index) => (
      <motion.li
        key={step.name}
        className="py-10 first:pt-0 last:pb-0"
        initial={animate ? "hidden" : false}
        whileInView={animate ? "show" : undefined}
        viewport={{ once: true, margin: "-60px" }}
        variants={animate ? stackItemVariants : undefined}
      >
        <span className="font-numeric text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          {stepLabel} <Num>{pad2(index + 1)}</Num>
        </span>
        <h3 className="mt-2.5 text-[26px] font-medium tracking-[-0.035em] text-[var(--home-ink)]">
          {step.name}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--home-ink-soft)]">
          {step.description}
        </p>

        <ul className="mt-6 space-y-3">
          {step.details.map((detail, detailIndex) => (
            <motion.li
              key={detailIndex}
              variants={animate ? stackDetailVariants : undefined}
              className="flex items-start gap-3"
            >
              <Check
                weight="bold"
                className="mt-[3px] size-4 shrink-0 text-primary"
              />
              <div className="text-[14px] font-medium leading-snug text-[var(--home-ink)]">
                {detail}
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.li>
    ))}
  </ol>
);

/**
 * Process section as a scroll-driven card deck. The section pins while
 * scrolling: each scroll increment brings the next step's card to the top
 * of a 3D stack, sending completed cards toward the viewer. The timeline
 * rail mirrors progress and jumps to a step on click. Small screens and
 * reduced-motion users get a plain stacked list.
 */
export const ProcessScroller: React.FC<ProcessScrollerProps> = ({
  steps,
  stepLabel = "Step",
  heading,
}) => {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="w-full">
        {heading && <div className="mb-6 w-full">{heading}</div>}
        <ProcessStack steps={steps} stepLabel={stepLabel} animate={false} />
      </div>
    );
  }

  return (
    <>
      <div className="w-full lg:hidden">
        {heading && <div className="mb-6 w-full">{heading}</div>}
        <ProcessStack steps={steps} stepLabel={stepLabel} animate />
      </div>
      <div className="hidden w-full lg:block">
        <ProcessDeck steps={steps} stepLabel={stepLabel} heading={heading} />
      </div>
    </>
  );
};
