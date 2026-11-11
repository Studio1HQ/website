"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  Compass,
  Flag,
  Rocket,
  TrendUp,
  type Icon,
} from "@phosphor-icons/react";
import type { CaseStudyMeta } from "@/lib/case-studies";
import { NumericText } from "@/components/ui/num";
import { cn } from "@/lib/utils";

const WELL =
  "bg-[#f1ece4] shadow-[inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06),inset_0_-1px_0_rgba(255,255,255,0.8)]";

const CHAPTER_COUNT: Record<number, string> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
};

type Chapter = {
  icon: Icon;
  eyebrow: string;
  title: string;
  body: ReactNode;
};

/** One chapter: its dot fills and its card sharpens as the line reaches it. */
function ChapterRow({
  chapter,
  index,
  count,
  progress,
}: {
  chapter: Chapter;
  index: number;
  count: number;
  progress: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const at = index / count;
  const lit = useTransform(progress, [at, at + 0.12], [0, 1]);
  const fade = useTransform(lit, [0, 1], [0.45, 1]);
  const ChapterIcon = chapter.icon;
  return (
    <motion.li
      className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-x-5 pb-10 last:pb-0 md:grid-cols-[52px_minmax(0,1fr)] md:gap-x-7"
      style={reduceMotion ? undefined : { opacity: fade }}
    >
      {/* Marker: engraved, then filled orange as the story reaches it */}
      <span
        className={cn(
          "relative z-[1] flex size-11 items-center justify-center overflow-hidden rounded-full md:size-[52px]",
          WELL,
        )}
      >
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-[#f97316]"
          style={{ opacity: reduceMotion ? 1 : lit }}
        />
        <ChapterIcon
          weight="bold"
          className="relative size-[18px] text-white mix-blend-normal"
        />
      </span>

      <div className="pt-1.5">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#c2410c]">
          Chapter {String(index + 1).padStart(2, "0")} · {chapter.eyebrow}
        </p>
        <h3 className="mt-2 text-[24px] font-medium leading-[1.2] tracking-[-0.035em] md:text-[28px]">
          {chapter.title}
        </h3>
        <div className="mt-4">{chapter.body}</div>
      </div>
    </motion.li>
  );
}

/**
 * The engagement told as a short story in up to four chapters: where the
 * client stood (`challenge`), what we set out to do (`goals`), what we
 * shipped (`deliverables`, else `services`), and what changed (`metrics`).
 * A chapter is left out when its field is empty, so a heading never sits
 * over content that does not match it. A line runs down the left and fills
 * as you read; each chapter lights up when the line reaches it.
 */
export function CaseStory({ study }: { study: CaseStudyMeta }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.5,
  });

  const shipped = study.deliverables.length
    ? study.deliverables
    : study.services;

  // Each chapter only renders when the study has the data its heading
  // promises. The hero already shows the description, outcomes and quote,
  // so the story never reuses them.
  const chapters: Chapter[] = [];

  if (study.challenge) {
    chapters.push({
      icon: Compass,
      eyebrow: "The starting point",
      title: `Where ${study.client} stood`,
      body: (
        <>
          {study.industry ? (
            <span
              className={cn(
                "mb-3 inline-flex rounded-full px-3 py-1 text-[12px] font-medium text-[#141414]/70",
                WELL,
              )}
            >
              {study.industry}
            </span>
          ) : null}
          <p className="max-w-[640px] text-[16px] leading-[1.7] text-[#141414]/65">
            <NumericText>{study.challenge}</NumericText>
          </p>
        </>
      ),
    });
  }

  if (study.goals.length) {
    chapters.push({
      icon: Flag,
      eyebrow: "The purpose",
      title: "What we set out to do together",
      body: (
        <ul className="max-w-[640px] space-y-2.5">
          {study.goals.map((goal) => (
            <li
              key={goal}
              className="flex gap-3 text-[16px] leading-[1.6] text-[#141414]/65"
            >
              <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-[#f97316]" />
              <span>
                <NumericText>{goal}</NumericText>
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (shipped.length) {
    chapters.push({
      icon: Rocket,
      eyebrow: "The journey",
      title: "What we shipped",
      body: (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shipped.slice(0, 6).map((item) => (
            <li
              key={item}
              className={cn(
                "flex gap-3 rounded-[6px] p-4 text-[14.5px] leading-[1.55] text-[#141414]/80",
                WELL,
              )}
            >
              <span className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-[#f97316]" />
              <span>
                <NumericText>{item}</NumericText>
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  // Studies without metrics already list their outcomes in the hero's
  // "What changed" panel, so the story ends at the work.
  if (study.metrics.length) {
    chapters.push({
      icon: TrendUp,
      eyebrow: "The value",
      title: "What changed",
      body: (
        <dl className="grid gap-2 sm:grid-cols-3">
          {study.metrics.slice(0, 3).map((metric, i) => (
            <div key={metric.label} className={cn("rounded-[6px] p-4", WELL)}>
              <dd
                className={cn(
                  "text-[30px] font-medium leading-none tracking-[-0.05em] tabular-nums md:text-[34px]",
                  i === 0 ? "text-[#ea580c]" : "text-[#141414]",
                )}
              >
                {metric.value}
              </dd>
              <dt className="mt-2 text-[12.5px] leading-snug text-[#141414]/60">
                {metric.label}
              </dt>
            </div>
          ))}
        </dl>
      ),
    });
  }

  if (chapters.length === 0) return null;

  return (
    <section
      aria-label={`The ${study.client} story`}
      id="case-story"
      data-story-start
      className="mt-16 rounded-[6px] bg-[#fbf9f5] p-6 shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80 md:p-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#141414]/[0.08] pb-6">
        <h2 className="text-[26px] font-medium leading-tight tracking-[-0.04em] md:text-[32px]">
          The <span className="text-[#ea580c]">{study.client}</span> story
        </h2>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
          {CHAPTER_COUNT[chapters.length] ?? chapters.length}{" "}
          {chapters.length === 1 ? "chapter" : "chapters"} ·{" "}
          {study.services.length} services
        </p>
      </div>
      <ol ref={ref} className="relative mt-10">
        {/* The line the story travels along */}
        <span
          aria-hidden
          className="absolute bottom-6 left-[21px] top-6 w-[2px] rounded-full bg-[#141414]/[0.08] md:left-[25px]"
        />
        <motion.span
          aria-hidden
          className="absolute left-[21px] top-6 w-[2px] origin-top rounded-full bg-[linear-gradient(180deg,#fb923c,#ea580c)] md:left-[25px]"
          style={{
            bottom: 24,
            scaleY: reduceMotion ? 1 : progress,
          }}
        />
        {chapters.map((chapter, index) => (
          <ChapterRow
            key={chapter.eyebrow}
            chapter={chapter}
            index={index}
            count={chapters.length}
            progress={progress}
          />
        ))}
      </ol>
    </section>
  );
}
