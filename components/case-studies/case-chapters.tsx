"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ChapterStudy = {
  slug: string;
  client: string;
  category: string;
  industry: string;
  title: string;
  summary: string;
  logo?: StaticImageData;
  /** The headline result, or null when the study has no numbers. */
  metric: { value: string; label: string } | null;
  quote: {
    text: string;
    author: string;
    role?: string;
    avatar?: string;
  } | null;
  /** What changed, in short lines; told when there is no number or quote. */
  outcomes: string[];
  services: string[];
};

export type Act = {
  numeral: string;
  title: string;
  lede: string;
  studies: ChapterStudy[];
};

const WELL =
  "bg-[#f1ece4] shadow-[inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06),inset_0_-1px_0_rgba(255,255,255,0.8)]";

const EASE = [0.16, 1, 0.3, 1] as const;

/** One client's chapter: the problem in a line, the work, the result. */
function Chapter({
  study,
  number,
  flip,
}: {
  study: ChapterStudy;
  number: number;
  flip: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      data-chapter={number - 1}
      initial={reduceMotion ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <Link
        href={`/case-studies/${study.slug}`}
        className={cn(
          "group grid gap-3 rounded-[6px] bg-white/60 p-3 shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/[0.06] transition-[background-color,box-shadow] duration-500 hover:bg-white/90 hover:shadow-[0_40px_70px_-44px_rgba(194,65,12,0.35)]",
          flip
            ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]"
            : "md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]",
        )}
      >
        {/* The story */}
        <div className={cn("flex flex-col p-5 md:p-8", flip && "md:order-2")}>
          <div className="flex items-center gap-3">
            {study.logo ? (
              <span className="relative size-11 shrink-0 overflow-hidden rounded-[6px]">
                <Image
                  src={study.logo}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-[-0.01em]">
                {study.client}
              </p>
              <p className="truncate text-[12px] text-[#141414]/50">
                {study.industry}
              </p>
            </div>
            <span className="ml-auto text-[28px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#141414]/15 transition-colors duration-500 group-hover:text-[#f97316]/60">
              {String(number).padStart(2, "0")}
            </span>
          </div>

          <h3 className="mt-7 text-[24px] font-medium leading-[1.2] tracking-[-0.035em] md:text-[28px]">
            {study.title}
          </h3>
          <p className="mt-4 text-[15.5px] leading-[1.65] text-[#141414]/62">
            {study.summary}
          </p>

          <ul className="mt-6 flex flex-wrap gap-1.5">
            {study.services.slice(0, 4).map((service) => (
              <li
                key={service}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium text-[#141414]/70",
                  WELL,
                )}
              >
                {service}
              </li>
            ))}
          </ul>

          <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[14px] font-medium">
            Read the story
            <span className="flex size-8 items-center justify-center rounded-full bg-[#141414] text-white transition-[transform,background-color] duration-300 group-hover:rotate-45 group-hover:bg-[#f97316]">
              <ArrowUpRight weight="bold" className="size-3.5" />
            </span>
          </span>
        </div>

        {/* The value: the result, or the client's words */}
        <div
          className={cn(
            "relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[6px] p-6",
            flip && "md:order-1",
            study.metric
              ? "bg-[#f97316] text-white"
              : "bg-[#141414] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
          )}
        >
          <p
            className={cn(
              "text-[11.5px] font-medium uppercase tracking-[0.14em]",
              study.metric ? "text-white/75" : "text-[#fb923c]",
            )}
          >
            {study.metric
              ? "The result"
              : study.quote
                ? "In their words"
                : "What changed"}
          </p>
          {study.metric ? (
            <div>
              <p
                className={cn(
                  "font-medium leading-[0.92] tracking-[-0.055em]",
                  /^[0-9~<>]/.test(study.metric.value)
                    ? "text-[48px] md:text-[56px]"
                    : "text-[30px] md:text-[34px]",
                )}
              >
                {study.metric.value}
              </p>
              <p className="mt-3 max-w-[260px] text-[14px] leading-snug text-white/85">
                {study.metric.label}
              </p>
            </div>
          ) : study.quote ? (
            <blockquote className="relative">
              <span
                aria-hidden
                className="font-accent block text-[64px] leading-[0.6] text-[#f97316]"
              >
                &ldquo;
              </span>
              <p className="mt-2 line-clamp-6 text-[17px] font-medium leading-[1.5] tracking-[-0.015em] text-white">
                {study.quote.text}
              </p>
              <footer className="mt-5 flex items-center gap-3">
                {study.quote.avatar ? (
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full shadow-[0_6px_14px_-8px_rgba(20,20,20,0.55)] ring-2 ring-white/20">
                    <Image
                      src={study.quote.avatar}
                      alt={study.quote.author}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white ring-2 ring-white/20">
                    {study.quote.author
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-white">
                    {study.quote.author}
                  </span>
                  <span className="block truncate text-[12px] text-white/55">
                    {study.quote.role ?? study.client}
                  </span>
                </span>
              </footer>
            </blockquote>
          ) : study.outcomes.length ? (
            <ul className="mt-5 space-y-3">
              {study.outcomes.slice(0, 3).map((outcome) => (
                <li
                  key={outcome}
                  className="flex gap-3 text-[14.5px] leading-[1.5] text-white/85"
                >
                  <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[#f97316]" />
                  {outcome}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[18px] font-medium leading-[1.45] tracking-[-0.015em] text-white/85">
              {study.category}
            </p>
          )}
          {study.logo && study.metric ? (
            <span className="pointer-events-none absolute -bottom-8 -right-8 size-40 rotate-[-12deg] overflow-hidden rounded-[6px]">
              <Image
                src={study.logo}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
              />
            </span>
          ) : study.logo ? (
            <span className="pointer-events-none absolute -right-6 -top-6 size-28 rotate-[12deg] overflow-hidden rounded-[6px] opacity-25">
              <Image
                src={study.logo}
                alt=""
                fill
                sizes="112px"
                className="object-cover"
              />
            </span>
          ) : null}
        </div>
      </Link>
    </motion.article>
  );
}

/**
 * The case studies as one story in three acts. Each act opens with a title
 * card; its clients follow as chapters. A soft orange ribbon on the left
 * is drawn as you read through the acts.
 */
/** The ribbon's path: a slow sway down the left edge (80 x 1000 box). */
const RIBBON =
  "M 32 0 C 32 80, 60 120, 60 200 S 8 320, 8 420 S 62 560, 62 640 S 14 780, 14 860 S 32 960, 32 1000";

export function CaseChapters({ acts }: { acts: Act[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // The orange reaches down to the middle of the screen, wherever you are.
  // Measured from on-screen boxes (not useScroll's layout offsets), so it
  // stays right under the large-screen `zoom` on <body> in every browser.
  const progress = useMotionValue(0);
  const fill = useSpring(progress, {
    // Tight enough to stay with a fast flick, soft enough to glide
    stiffness: 420,
    damping: 42,
    mass: 0.25,
    restDelta: 0.0005,
  });
  // Reveal the orange copy from the top down to the current point
  const clip = useTransform(fill, (v) => `inset(0 0 ${(1 - v) * 100}% 0)`);
  const tipTop = useTransform(fill, (v) => `${v * 100}%`);
  let number = 0;

  // The study being read: the last chapter whose top has passed mid-screen
  const studies = acts.flatMap((act) => act.studies);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const root = ref.current;
      if (!root) return;
      const mid = window.innerHeight / 2;
      // Progress: 0 when the top of the chapters reaches mid-screen,
      // 1 when their bottom does.
      const box = root.getBoundingClientRect();
      progress.set(
        box.height > 0
          ? Math.min(1, Math.max(0, (mid - box.top) / box.height))
          : 0,
      );
      const cards = root.querySelectorAll("[data-chapter]");
      let at = 0;
      cards.forEach((card, i) => {
        if (card.getBoundingClientRect().top <= mid) at = i;
      });
      setCurrent(at);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Cards and images settle after load, which moves everything below them
    const resize = new ResizeObserver(schedule);
    if (ref.current) resize.observe(ref.current);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress]);
  const reading = studies[current];

  const band = (stroke: string, opacity: number, width: number) => (
    <svg
      aria-hidden
      viewBox="0 0 80 1000"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full overflow-visible"
    >
      <path
        d={RIBBON}
        fill="none"
        stroke={stroke}
        strokeOpacity={opacity}
        strokeWidth={width}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );

  return (
    <div ref={ref} className="relative lg:pl-24">
      {/* The ribbon: a soft band swaying down beside the chapters. The
          orange part tracks your reading position exactly. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 top-0 hidden w-20 lg:block"
      >
        <svg aria-hidden className="absolute size-0">
          <defs>
            <linearGradient id="chapter-ribbon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fb923c" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
        {/* The full path, faint */}
        {band("#141414", 0.07, 6)}
        {/* The read part, in orange, revealed down to where you are */}
        <motion.div
          className="absolute inset-0"
          style={{ clipPath: reduceMotion ? "none" : clip }}
        >
          {band("url(#chapter-ribbon)", 1, 6)}
        </motion.div>
        {/* Studio1 + the study being read, riding the leading edge */}
        {reduceMotion ? null : (
          <motion.span
            // Fixed across the rail, so it covers the ribbon wherever it sways and
            // never reaches the cards; only its height follows the scroll
            className="absolute left-[36px] -ml-[46px] -mt-[22px] flex items-center gap-1.5 rounded-[6px] bg-[#fbf9f5] p-1.5 shadow-[0_14px_30px_-14px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80"
            style={{ top: tipTop }}
          >
            <span className="relative flex size-8 items-center justify-center rounded-[6px] bg-white ring-1 ring-[#141414]/[0.08]">
              <Image
                src="/assets/site/studio1-logo.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                className="size-5"
              />
            </span>
            <X aria-hidden weight="bold" className="size-3 text-[#f97316]" />
            <span className="relative size-8 overflow-hidden rounded-[6px] bg-white ring-1 ring-[#141414]/[0.08]">
              <AnimatePresence initial={false}>
                {reading?.logo ? (
                  <motion.span
                    key={reading.slug}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <Image
                      src={reading.logo}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </span>
          </motion.span>
        )}
      </div>

      <div className="space-y-24 md:space-y-32">
        {acts.map((act) => (
          <section key={act.numeral} aria-label={act.title}>
            {/* Act title card */}
            <motion.header
              className="relative mb-10 max-w-[760px]"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#c2410c]">
                Act {act.numeral}
              </p>
              <h2 className="mt-3 text-[34px] font-medium leading-[1.08] tracking-[-0.05em] md:text-[48px]">
                {act.title}
              </h2>
              <p className="mt-4 max-w-[600px] text-[16px] leading-[1.6] text-[#141414]/60 md:text-[17px]">
                {act.lede}
              </p>
            </motion.header>

            <div className="space-y-4">
              {act.studies.map((study) => {
                number += 1;
                return (
                  <Chapter
                    key={study.slug}
                    study={study}
                    number={number}
                    flip={number % 2 === 0}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
