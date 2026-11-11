"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { pageToMarkdown } from "@/lib/page-markdown";

type Mode = "human" | "machine";

/** The bits of the site's smooth-scroll instance this view needs. */
type LenisLike = {
  stop: () => void;
  start: () => void;
  resize: () => void;
  scrollTo: (
    target: number,
    options?: { immediate?: boolean; force?: boolean },
  ) => void;
};

/** The rise into the machine view: quick to start, long soft landing. */
const RISE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;
/** Going back is quicker, so the page returns without a wait. */
const FALL = { duration: 0.28, ease: [0.4, 0, 1, 1] } as const;

/** Professional syntax colouring for the machine/LLM markdown view. */
function MarkdownLine({
  line,
  index,
  mt,
}: {
  line: string;
  index: number;
  mt: string;
}) {
  const node = (() => {
    // YAML front-matter divider
    if (/^---/.test(line))
      return <span className="text-neutral-300 tracking-widest">{line}</span>;

    // YAML key: value
    if (/^[a-z_]+: /.test(line)) {
      const [key, ...rest] = line.split(": ");
      return (
        <>
          <span className="text-neutral-400 italic">{key}:</span>{" "}
          <span className="text-neutral-600">{rest.join(": ")}</span>
        </>
      );
    }

    // Headings — weight and size scale with level
    const hMatch = line.match(/^(#{1,6}) (.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = [
        "text-[15px] font-bold tracking-tight text-neutral-900",
        "text-[14px] font-semibold text-neutral-800",
        "text-[13.5px] font-semibold text-neutral-700",
        "text-[13px] font-medium text-neutral-600",
        "text-[13px] font-medium text-neutral-500",
        "text-[13px] font-medium text-neutral-500",
      ];
      return (
        <>
          <span className="mr-2 text-neutral-300">{hMatch[1]}</span>
          <span className={sizes[level - 1]}>{hMatch[2]}</span>
        </>
      );
    }

    // Fenced code delimiter
    if (/^```/.test(line))
      return <span className="text-neutral-300">{line}</span>;

    // Blockquote
    if (/^>/.test(line))
      return <span className="text-neutral-500 italic">{line}</span>;

    // Lines with markdown links [text](url)
    const parts = line.split(/(\[[^\]]+\]\([^)]+\))/g);
    return (
      <>
        {parts.map((part, k) => {
          const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (!m)
            return (
              <span key={k} className="text-neutral-700">
                {part}
              </span>
            );
          return (
            <span key={k}>
              <span className="text-neutral-900 font-medium">[{m[1]}]</span>
              <span className="text-neutral-400">({m[2]})</span>
            </span>
          );
        })}
      </>
    );
  })();

  // Only the first screenful eases in; the rest is simply there, so long
  // pages open as fast as short ones.
  if (index > 28) return <div className={mt}>{node}</div>;
  return (
    <motion.div
      className={mt}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: 0.12 + index * 0.012,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {node}
    </motion.div>
  );
}

/** The chip's glide: quick to leave, settling softly with no bounce. */
const GLIDE = { type: "spring", bounce: 0, duration: 0.5 } as const;

/**
 * The Human / Machine switch. Both halves are the same width, so one white
 * chip slides between them; the labels cross-fade as it passes.
 */
function ModeSwitch({
  value,
  onChange,
  floating = false,
}: {
  value: Mode;
  onChange: (next: Mode) => void;
  floating?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="View this page as"
      className={cn(
        "relative grid grid-cols-2 rounded-full bg-[#eeebe6] p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.9)]",
        floating && "shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.9),0_10px_32px_rgba(0,0,0,0.12)]",
      )}
    >
      <motion.span
        aria-hidden
        className="absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
        initial={false}
        // One clean glide, no bounce
        animate={{ x: value === "machine" ? "100%" : "0%" }}
        transition={GLIDE}
      />
      {(["human", "machine"] as const).map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => (active ? undefined : onChange(option))}
            className="group/mode relative w-[104px] rounded-full py-[8px] text-center text-[10.5px] font-semibold uppercase tracking-[0.16em] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[#f97316]/40 [&:not([aria-checked=true])]:hover:opacity-80"
          >
            <motion.span
              className="relative"
              initial={false}
              animate={{ color: active ? "#141414" : "#a8a196" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {option}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Footer switch between the normal site (Human) and a plain-text version of
 * the current page (Machine), the way an agent or LLM would read it.
 */
export function MachineToggle() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("human");
  const [markdown, setMarkdown] = useState("");
  const [copied, setCopied] = useState(false);
  // One chip position for both copies of the switch, so they glide as one.
  const [chip, setChip] = useState<Mode>("human");
  useEffect(() => setChip(mode), [mode]);
  // Where the switch sits on screen when Machine is picked: the machine view
  // draws its copy at exactly that spot, so the switch never moves.
  const switchRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const open = useCallback(() => {
    setMarkdown(
      pageToMarkdown(document, {
        pathname: pathname ?? "/",
        ownHosts: [window.location.hostname],
      }),
    );
    setMode("machine");
  }, [pathname]);

  // Leaving the page or pressing Escape returns to the human view.
  useEffect(() => {
    setMode("human");
    setPin(null);
  }, [pathname]);
  useEffect(() => {
    if (mode !== "machine") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMode("human");
    };
    document.addEventListener("keydown", onKey);
    // Lock the page without the scrollbar vanishing, so nothing shifts
    // sideways, and pause smooth scrolling so it cannot drift while hidden.
    const root = document.documentElement;
    const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
    const y = window.scrollY;
    lenis?.stop();
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = "";
      root.style.scrollbarGutter = "";
      // Back exactly where the reader was, with smooth scrolling in step
      window.scrollTo(0, y);
      lenis?.resize();
      lenis?.scrollTo(y, { immediate: true, force: true });
      lenis?.start();
    };
  }, [mode]);

  const lines = useMemo(() => markdown.split("\n"), [markdown]);
  const words = useMemo(
    () => markdown.split(/\s+/).filter(Boolean).length,
    [markdown],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  };

  return (
    <>
      <div ref={switchRef} className="inline-flex">
        <ModeSwitch
          value={chip}
          onChange={(next) => {
            if (next !== "machine") return setMode("human");
            const box = switchRef.current?.getBoundingClientRect();
            setPin(box ? { left: box.left, top: box.top } : null);
            setChip("machine");
            open();
          }}
        />
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {mode === "machine" ? (
                <motion.div
                  key="machine-view"
                  data-machine-view
                  role="dialog"
                  aria-modal="true"
                  aria-label="Machine-readable version of this page"
                  className="fixed inset-0 z-[2000] flex flex-col bg-[#f8f7f5] text-neutral-800"
                  initial={{ y: 28, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: RISE }}
                  exit={{ y: 16, opacity: 0, transition: FALL }}
                  style={{ willChange: "transform, opacity" }}
                >
                  {/* The page, as plain text */}
                  <div
                    data-lenis-prevent
                    className="flex-1 overflow-y-auto px-6 pb-28 pt-12 [scrollbar-width:none] sm:px-10 [&::-webkit-scrollbar]:hidden"
                  >
                    <pre className="mx-auto max-w-[760px] whitespace-pre-wrap break-words font-mono text-[13.5px] leading-[1.85]">
                      {(() => {
                        const isHeading = (l: string) => /^#{1,6} /.test(l);
                        const isFront = (l: string) =>
                          /^(---|[a-z_]+: )/.test(l);
                        const isList = (l: string) => /^- /.test(l);
                        const isBlank = (l: string) => !l.trim();

                        let animIdx = 0;
                        return lines.reduce<React.ReactNode[]>(
                          (acc, line, i) => {
                            // Skip blank lines — they drive spacing on the next token
                            if (isBlank(line)) return acc;

                            const prev =
                              lines
                                .slice(0, i)
                                .reverse()
                                .find((l) => !isBlank(l)) ?? "";
                            const prevRaw = i > 0 ? lines[i - 1] : "";
                            const afterGap = isBlank(prevRaw);

                            let mt = "";
                            if (
                              i === 0 ||
                              (isFront(line) && isFront(prev) && !afterGap)
                            ) {
                              mt = "mt-[3px]"; // tight front-matter rows
                            } else if (isHeading(line)) {
                              mt = acc.length === 0 ? "" : "mt-10"; // big breath before headings
                            } else if (
                              isList(line) &&
                              isList(prev) &&
                              !afterGap
                            ) {
                              mt = "mt-[5px]"; // snug list items
                            } else if (afterGap) {
                              mt = "mt-5"; // paragraph gap
                            } else {
                              mt = "mt-[3px]"; // consecutive body
                            }

                            acc.push(
                              <MarkdownLine
                                key={i}
                                line={line}
                                index={animIdx++}
                                mt={mt}
                              />,
                            );
                            return acc;
                          },
                          [],
                        );
                      })()}
                    </pre>
                  </div>

                  {/* Bottom fade so the text runs out softly */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8f7f5] via-[#f8f7f5]/80 to-transparent" />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted && mode === "machine"
        ? createPortal(
            <div
              className={cn(
                "fixed z-[2002]",
                !pin && "bottom-8 left-1/2 -translate-x-1/2",
              )}
              style={pin ? { left: pin.left, top: pin.top } : undefined}
            >
              <ModeSwitch
                floating
                value={chip}
                onChange={(next) => {
                  if (next !== "human") return;
                  // Glide back first, then let the page return
                  setChip("human");
                  window.setTimeout(() => setMode("human"), 160);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
