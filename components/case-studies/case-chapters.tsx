"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
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
              ? "bg-[linear-gradient(155deg,#fb923c_0%,#f97316_45%,#ea580c_100%)] text-white"
              : WELL,
          )}
        >
          <p
            className={cn(
              "text-[11.5px] font-medium uppercase tracking-[0.14em]",
              study.metric ? "text-white/75" : "text-[#c2410c]",
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
            <blockquote>
              <p className="line-clamp-6 text-[17px] font-medium leading-[1.5] tracking-[-0.015em] text-[#141414]">
                &ldquo;{study.quote.text}&rdquo;
              </p>
              <footer className="mt-5 flex items-center gap-3">
                {study.quote.avatar ? (
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full shadow-[0_6px_14px_-8px_rgba(20,20,20,0.55)] ring-2 ring-white">
                    <Image
                      src={study.quote.avatar}
                      alt={study.quote.author}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#141414] text-[13px] font-semibold text-white ring-2 ring-white">
                    {study.quote.author
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-[#141414]">
                    {study.quote.author}
                  </span>
                  <span className="block truncate text-[12px] text-[#141414]/55">
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
                  className="flex gap-3 text-[14.5px] leading-[1.5] text-[#141414]/80"
                >
                  <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[#f97316]" />
                  {outcome}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[18px] font-medium leading-[1.45] tracking-[-0.015em] text-[#141414]/80">
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

/** The ribbon's x (0-80) at a given height (0-1000), for the tip dot. */
function ribbonX(y: number) {
  // Same sway as RIBBON, sampled as a smooth curve
  const points: [number, number][] = [
    [0, 32],
    [200, 60],
    [420, 8],
    [640, 62],
    [860, 14],
    [1000, 32],
  ];
  for (let i = 1; i < points.length; i += 1) {
    const [y1, x1] = points[i];
    const [y0, x0] = points[i - 1];
    if (y <= y1) {
      const t = (y - y0) / (y1 - y0);
      const ease = (1 - Math.cos(t * Math.PI)) / 2;
      return x0 + (x1 - x0) * ease;
    }
  }
  return 32;
}

export function CaseChapters({ acts }: { acts: Act[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // The orange reaches down to the middle of the screen, wherever you are
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const fill = useSpring(scrollYProgress, {
    // Tight enough to stay with a fast flick, soft enough to glide
    stiffness: 420,
    damping: 42,
    mass: 0.25,
    restDelta: 0.0005,
  });
  // Reveal the orange copy from the top down to the current point
  const clip = useTransform(fill, (v) => `inset(0 0 ${(1 - v) * 100}% 0)`);
  const tipTop = useTransform(fill, (v) => `${v * 100}%`);
  const tipLeft = useTransform(
    fill,
    (v) => `${(ribbonX(v * 1000) / 80) * 100}%`,
  );
  let number = 0;

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
        {/* The Studio1 mark riding the leading edge */}
        {reduceMotion ? null : (
          <motion.span
            className="absolute -ml-[17px] -mt-[17px] flex size-[36px] items-center justify-center rounded-[6px] bg-white/55 shadow-[0_12px_28px_-14px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(20,20,20,0.04)] ring-1 ring-inset ring-white/70 backdrop-blur-xl backdrop-saturate-150"
            style={{ top: tipTop, left: tipLeft }}
          >
            <Image
              src="/assets/studio1-logo.svg"
              alt=""
              width={20}
              height={20}
              unoptimized
              className="size-5"
            />
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
