"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpenText,
  ChartLineUp,
  Code,
  Megaphone,
  PenNib,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { PRINT } from "@/lib/paper";

/*
 * Small motion details for the About Us hero: a curved underline, hover
 * drawings over the words of the second title line, icons inside the
 * description, and the "what we make" chips resting on the video's sides.
 */

const EASE = [0.65, 0, 0.35, 1] as const;

/** One smooth orange curve under a phrase, drawn on load. */
export function CurvedUnderline({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.16em] left-0 h-[0.26em] w-full overflow-visible"
      >
        <motion.path
          d="M4 5 C 80 15, 220 15, 296 4"
          fill="none"
          stroke={PRINT}
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.5 }}
        />
      </svg>
    </span>
  );
}

type Kind = "blog" | "video" | "initiative";

/** A crisp white icon for each kind of work, animated as it appears. */
function WordArt({ kind }: { kind: Kind }) {
  const line = {
    fill: "none",
    stroke: "#fff",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const write = (delay: number) => ({
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: 0.4, ease: EASE, delay },
  });
  if (kind === "blog") {
    // A page whose lines write themselves in.
    return (
      <svg viewBox="0 0 20 20" className="size-full">
        <rect x="4.5" y="3" width="11" height="14" rx="2" {...line} />
        <motion.path d="M7.5 7.5 H12.5" {...line} {...write(0.1)} />
        <motion.path d="M7.5 10.5 H12.5" {...line} {...write(0.25)} />
        <motion.path d="M7.5 13.5 H10.5" {...line} {...write(0.4)} />
      </svg>
    );
  }
  if (kind === "video") {
    // A play button that pops in, then a soft pulse.
    return (
      <svg viewBox="0 0 20 20" className="size-full">
        <motion.path
          d="M7.5 5.8 L 14.2 10 L 7.5 14.2 Z"
          fill="#fff"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.15, 1] }}
          style={{ transformOrigin: "10px 10px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
        />
      </svg>
    );
  }
  // A flag running up its pole.
  return (
    <svg viewBox="0 0 20 20" className="size-full">
      <path d="M6 16.5 V3.5" {...line} />
      <motion.path
        d="M6 4 C 8.5 2.8, 10.5 5.4, 14.5 4 V 9.5 C 10.5 10.9, 8.5 8.3, 6 9.5 Z"
        fill="#fff"
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
    </svg>
  );
}

const LABELS: Record<Kind, string> = {
  blog: "Technical blogs",
  video: "Video production",
  initiative: "DevRel initiatives",
};

/** A word that turns orange on hover with a small dark tooltip below it. */
function HoverWord({ word, kind }: { word: string; kind: Kind }) {
  const reduceMotion = useReducedMotion();
  const [hover, setHover] = useState(false);
  return (
    <span
      className="relative inline-block cursor-default transition-colors duration-300"
      style={hover ? { color: PRINT } : undefined}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {word}
      {/* Plain wrapper owns the centring; motion owns the animated transform */}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2">
        <AnimatePresence>
          {hover && !reduceMotion ? (
            <motion.span
              aria-hidden
              className="relative flex items-center gap-2 whitespace-nowrap rounded-full bg-[#141414] py-[3px] pl-[3px] pr-3 text-[12.5px] font-medium leading-none tracking-[-0.01em] text-[#f4efe7] shadow-[0_14px_30px_-12px_rgba(20,20,20,0.55)]"
              initial={{ opacity: 0, y: -6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="flex size-6 items-center justify-center rounded-full p-[5px]"
                style={{ background: PRINT }}
              >
                <WordArt kind={kind} />
              </span>
              {LABELS[kind]}
              {/* small caret pointing up at the word */}
              <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-[#141414]" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
    </span>
  );
}

const WORDS: Record<string, Kind> = {
  Blog: "blog",
  Video: "video",
  Initiative: "initiative",
};

/**
 * The second title line: the Studio1 mark, then the words. Hovering Blog,
 * Video or Initiative shows a small drawing of that kind of work.
 */
export function HoverLine({ children }: { children: string }) {
  const parts = children.split(/(Blog|Video|Initiative)/);
  return (
    <span className="mt-1 block font-normal text-[#141414]/80 lg:whitespace-nowrap">
      <Logo className="mr-[0.26em] inline-block size-[0.72em] -translate-y-[0.06em] align-middle" />
      {parts.map((part, k) =>
        WORDS[part] ? (
          <HoverWord key={k} word={part} kind={WORDS[part]} />
        ) : (
          part
        ),
      )}
    </span>
  );
}

/** Phrases in the description that get a small orange icon before them. */
const MARKS: [string, Icon][] = [
  ["developer communities", UsersThree],
  ["engagement", ChartLineUp],
  ["DevRel", Megaphone],
  ["technical content", Code],
];

/**
 * The description with a small orange icon set inline before each key
 * phrase; the icons pop in one after another on load.
 */
export function MarkedDescription({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();
  const pattern = new RegExp(`(${MARKS.map(([phrase]) => phrase).join("|")})`);
  const parts = text.split(pattern);
  let count = 0;
  return (
    <>
      {parts.map((part, k) => {
        const mark = MARKS.find(([phrase]) => phrase === part);
        if (!mark) return part;
        const Glyph = mark[1];
        const order = count++;
        return (
          <span key={k} className="whitespace-nowrap">
            <motion.span
              aria-hidden
              className="mr-[0.22em] inline-flex -translate-y-[0.06em] align-middle"
              initial={
                reduceMotion ? false : { scale: 0.4, opacity: 0, rotate: -12 }
              }
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.6 + order * 0.12,
              }}
            >
              <Glyph
                weight="bold"
                className="size-[1em]"
                style={{ color: PRINT }}
              />
            </motion.span>
            <span className="font-medium text-[#141414]/85">{part}</span>
          </span>
        );
      })}
    </>
  );
}

const MAKES: {
  icon: Icon;
  label: string;
  note: string;
  side: "left" | "right";
  top: string;
}[] = [
  {
    icon: BookOpenText,
    label: "Docs",
    note: "15+ docs audits",
    side: "left",
    top: "28%",
  },
  {
    icon: Megaphone,
    label: "DevRel",
    note: "10+ high-impact events",
    side: "left",
    top: "68%",
  },
  {
    icon: PenNib,
    label: "Tutorials",
    note: "300+ tutorials & guides",
    side: "right",
    top: "32%",
  },
  {
    icon: VideoCamera,
    label: "Videos",
    note: "Demos · Tutorials · Shorts",
    side: "right",
    top: "72%",
  },
];

/** "What we make" chips, resting half on, half off the video card's sides. */
export function EdgeChips() {
  const reduceMotion = useReducedMotion();
  return (
    <>
      {MAKES.map(({ icon: Glyph, label, note, side, top }, index) => (
        <span
          key={label}
          className={
            side === "left"
              ? "absolute left-0 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
              : "absolute right-0 z-10 hidden -translate-y-1/2 translate-x-1/2 lg:block"
          }
          style={{ top }}
        >
          <motion.span
            className="flex items-center gap-3 whitespace-nowrap rounded-[10px] bg-white/85 py-2.5 pl-2.5 pr-4 shadow-[inset_0_1px_0_#fff,0_18px_36px_-20px_rgba(20,20,20,0.5)] ring-1 ring-[#141414]/[0.07] backdrop-blur-xl"
            initial={
              reduceMotion
                ? false
                : { opacity: 0, x: side === "left" ? -20 : 20 }
            }
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.3 + index * 0.1,
            }}
          >
            <span className="flex size-9 items-center justify-center rounded-[8px] bg-[linear-gradient(150deg,#fdba74_0%,#f97316_45%,#ea580c_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_16px_-8px_rgba(194,65,12,0.6)]">
              <Glyph weight="bold" className="size-4" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[14px] font-medium tracking-[-0.01em] text-[#141414]">
                {label}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-[#141414]/55">
                {note}
              </span>
            </span>
          </motion.span>
        </span>
      ))}
    </>
  );
}
