"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretUp, Check } from "@phosphor-icons/react";
import { EASE } from "@/components/home/ui";
import { cn } from "@/lib/utils";

type Chapter = { id: string; title: string };

/** Line in the viewport that counts as "where you are reading". */
const READING_LINE = 140;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Reads the article's h2 chapters and tracks, on every frame of scroll, which
 * chapter is being read, how far through it the reader is, and overall
 * progress through the article.
 */
function useChapterProgress() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [state, setState] = useState({
    active: 0,
    chapterProgress: 0,
    total: 0,
  });

  useEffect(() => {
    const article = document.querySelector("[data-mdx-content]");
    if (!article) return;
    // Posts written with only h3s use them as their chapters.
    setChapters(
      Array.from(
        article.querySelectorAll(article.querySelector("h2") ? "h2" : "h3"),
      )
        .filter((el) => el.id)
        .map((el) => ({ id: el.id, title: el.textContent ?? "" })),
    );
  }, []);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-mdx-content]");
    if (!article || chapters.length === 0) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const tops = chapters.map(({ id }) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      });
      const articleRect = article.getBoundingClientRect();
      const articleTop = articleRect.top + window.scrollY;
      const articleEnd = articleTop + articleRect.height;
      const line = window.scrollY + READING_LINE;

      let active = 0;
      tops.forEach((top, index) => {
        if (top <= line) active = index;
      });

      const start = tops[active];
      const end = tops[active + 1] ?? articleEnd;
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      const chapterProgress =
        line < tops[0] ? 0 : clamp((line - start) / Math.max(1, end - start));
      const total = clamp(
        (line - articleTop) / Math.max(1, articleEnd - articleTop),
      );

      setState((prev) =>
        prev.active === active &&
        Math.abs(prev.chapterProgress - chapterProgress) < 0.004 &&
        Math.abs(prev.total - total) < 0.004
          ? prev
          : { active, chapterProgress, total },
      );
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [chapters]);

  return { chapters, ...state };
}

function scrollToChapter(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Rolling two-digit counter for the active chapter number. */
function ChapterNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="relative inline-flex h-[1em] overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduceMotion ? false : { y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={reduceMotion ? undefined : { y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="block leading-none"
        >
          {pad(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Pinned chapter rail for blog posts. Desktop: a glass rail beside the
 * article showing every chapter with its own progress line. Smaller screens:
 * a floating glass pill at the bottom with the current chapter, which opens
 * the full chapter list.
 */
export function ChapterRail({
  readingTimeMinutes,
  variant = "full",
}: {
  readingTimeMinutes?: number;
  /** "pill": only the small-screen floating pill (desktop uses OnThisPage). */
  variant?: "full" | "pill";
}) {
  const { chapters, active, chapterProgress, total } = useChapterProgress();
  const [open, setOpen] = useState(false);
  const minutesLeft = useMemo(
    () =>
      readingTimeMinutes
        ? Math.max(0, Math.ceil(readingTimeMinutes * (1 - total)))
        : null,
    [readingTimeMinutes, total],
  );

  if (chapters.length === 0) return null;

  const list = (onPick?: () => void) => (
    <ol className="relative space-y-0.5">
      {chapters.map((chapter, index) => {
        const done = index < active;
        const isActive = index === active;
        const fill = done ? 1 : isActive ? chapterProgress : 0;
        return (
          <li key={`${chapter.id}-${index}`} className="relative">
            {isActive ? (
              <motion.span
                layoutId={onPick ? "chapter-active-sheet" : "chapter-active"}
                className="absolute inset-0 rounded-xl bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_-12px_rgba(90,30,0,0.45)] ring-1 ring-[var(--home-line)]"
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              />
            ) : null}
            <a
              href={`#${chapter.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToChapter(chapter.id);
                onPick?.();
              }}
              className="relative flex gap-3 rounded-xl py-2.5 pl-2.5 pr-3"
            >
              {/* Per-chapter progress line */}
              <span
                aria-hidden
                className="relative mt-0.5 w-[3px] shrink-0 self-stretch overflow-hidden rounded-full bg-[var(--home-line)]"
              >
                <span
                  className="absolute inset-x-0 top-0 rounded-full bg-primary transition-[height] duration-150 ease-out"
                  style={{ height: `${fill * 100}%` }}
                />
              </span>
              <span
                className={cn(
                  "mt-px w-5 shrink-0 text-[11px] font-medium tabular-nums transition-colors duration-300",
                  isActive ? "text-primary" : "text-[var(--home-ink-soft)]",
                  !isActive && !done && "opacity-70",
                )}
              >
                {done ? (
                  <Check weight="bold" className="mt-0.5 size-3 text-primary" />
                ) : (
                  pad(index + 1)
                )}
              </span>
              <span
                className={cn(
                  "text-[13px] leading-snug transition-colors duration-300",
                  isActive
                    ? "font-medium text-[var(--home-ink)]"
                    : done
                      ? "text-[var(--home-ink-soft)]"
                      : "text-[var(--home-ink-soft)] hover:text-[var(--home-ink)]",
                )}
              >
                {chapter.title}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  const header = (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--home-ink-soft)]">
          Chapter
        </p>
        <p className="mt-1.5 flex items-baseline gap-1.5 text-[28px] font-medium leading-none tracking-[-0.04em] text-[var(--home-ink)]">
          <ChapterNumber value={active + 1} />
          <span className="text-[14px] font-normal tracking-normal text-[var(--home-ink-soft)]">
            / {pad(chapters.length)}
          </span>
        </p>
      </div>
      <div className="text-right">
        {minutesLeft != null ? (
          <p className="mt-0.5 text-[11px] text-[var(--home-ink-soft)]">
            {minutesLeft > 0 ? `${minutesLeft} min left` : "Finished"}
          </p>
        ) : null}
      </div>
    </div>
  );

  const totalBar = (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--home-line)]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#fdba74] via-primary to-[#c2410c] transition-[width] duration-150 ease-out"
        style={{ width: `${total * 100}%` }}
      />
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Chapters"
        className={cn(
          "hidden bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10",
          variant === "full" && "xl:block",
        )}
      >
        {header}
        <div className="mt-4">{totalBar}</div>
        <div
          data-lenis-prevent
          className="-mx-1.5 mt-4 max-h-[calc(100vh/var(--s1-zoom,1)_-_20rem)] overflow-y-auto pr-0.5"
        >
          {list()}
        </div>
      </nav>

      {/* Small screens: floating chapter pill */}
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-16 xl:hidden">
        <div className="w-full max-w-md">
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.3, ease: EASE }}
                data-lenis-prevent
                className="bg-white ring-1 ring-inset ring-[#141414]/10 shadow-[0_24px_40px_-28px_rgba(20,20,20,0.45)] mb-2 max-h-[60vh] overflow-y-auto p-4"
              >
                {header}
                <div className="mt-3">{totalBar}</div>
                <div className="-mx-1.5 mt-3">{list(() => setOpen(false))}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="bg-white ring-1 ring-inset ring-[#141414]/10 shadow-[0_24px_40px_-28px_rgba(20,20,20,0.45)] relative flex w-full items-center gap-3 overflow-hidden rounded-full py-2.5 pl-4 pr-3 text-left"
          >
            <span className="text-[12px] font-medium tabular-nums text-primary">
              <ChapterNumber value={active + 1} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--home-ink)]">
              {chapters[active]?.title}
            </span>
            <CaretUp
              weight="bold"
              className={cn(
                "size-3.5 text-[var(--home-ink-soft)] transition-transform duration-300",
                open && "rotate-180",
              )}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--home-line)]"
            >
              <span
                className="block h-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${total * 100}%` }}
              />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

/** A thin orange line along the top of the page that fills as you read. */
export function ReadingLine() {
  const { total } = useChapterProgress();
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[3px]"
    >
      <div
        className="h-full origin-left bg-[#f97316] transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${total})` }}
      />
    </div>
  );
}
