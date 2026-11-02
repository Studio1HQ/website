"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Mode = "human" | "machine";

const SITE = "https://www.studio1hq.com";

/** An absolute link to the live site, without query strings. */
function toUrl(href: string) {
  const url = new URL(href, SITE);
  if (url.hostname === window.location.hostname)
    return `${SITE}${url.pathname}`;
  url.search = "";
  return url.href;
}

/** Text of an element with whitespace collapsed. */
const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

/**
 * Turns the page the visitor is on into plain markdown: headings, paragraphs,
 * lists, quotes, code, figures and links, in reading order. Navigation, the
 * footer, decoration and anything hidden are left out.
 */
function pageToMarkdown(pathname: string) {
  const root =
    document.querySelector<HTMLElement>("main") ??
    document.querySelector<HTMLElement>("#__next") ??
    document.body;
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (line: string) => {
    if (!line || seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  };

  const skip = (el: Element) =>
    el.closest(
      "nav, footer, header[data-site-header], [aria-hidden='true'], script, style, noscript, [data-machine-view]",
    ) !== null;

  // Only start at the page's first heading: everything before it is chrome.
  const firstHeading = root.querySelector("h1");
  let started = !firstHeading;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode as Element | null;
  while (node) {
    const el = node as HTMLElement;
    if (el === firstHeading) started = true;
    if (started && !skip(el)) {
      const tag = el.tagName;
      const text = clean(el.innerText);
      if (/^H[1-6]$/.test(tag) && text) {
        push(`${"#".repeat(Number(tag[1]))} ${text}`);
      } else if (tag === "P" && text && !el.closest("li, blockquote")) {
        push(text);
      } else if (tag === "LI" && text && !el.querySelector("li")) {
        const link = el.querySelector("a[href]");
        const href = link?.getAttribute("href");
        push(
          href && !href.startsWith("#")
            ? `- [${text}](${toUrl(href)})`
            : `- ${text}`,
        );
      } else if (tag === "BLOCKQUOTE" && text) {
        push(`> ${text}`);
      } else if (tag === "PRE" && text) {
        push("```\n" + (el.innerText ?? "").trim() + "\n```");
      } else if (tag === "IMG") {
        const alt = clean(el.getAttribute("alt"));
        if (alt) push(`![${alt}]`);
      } else if (tag === "A" && !el.closest("p, li, h1, h2, h3, h4, h5, h6")) {
        const href = el.getAttribute("href");
        if (text && href && !href.startsWith("#") && text.length < 80) {
          push(`- [${text}](${toUrl(href)})`);
        }
      } else if (tag === "DT" && text) {
        const value = clean(el.nextElementSibling?.textContent);
        push(`- **${text}:** ${value}`);
      }
    }
    node = walker.nextNode() as Element | null;
  }

  const title = clean(document.title);
  const description = clean(
    document.querySelector('meta[name="description"]')?.getAttribute("content"),
  );
  const url = `${SITE}${pathname}`;

  return [
    "---",
    `title: ${title}`,
    `url: ${url}`,
    description ? `description: ${description}` : "",
    "source: Studio1 (studio1hq.com)",
    "site_index: https://www.studio1hq.com/llms.txt",
    "sitemap: https://www.studio1hq.com/sitemap.xml",
    "---",
    "",
    lines
      .map((line, k) =>
        k > 0 && line.startsWith("- ") && lines[k - 1].startsWith("- ")
          ? `\n${line}`
          : `\n\n${line}`,
      )
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  ]
    .filter((line, i) => line !== "" || i > 7)
    .join("\n");
}

/** Professional syntax colouring for the machine/LLM markdown view. */
function MarkdownLine({ line, index, mt }: { line: string; index: number; mt: string }) {
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

  return (
    <motion.div
      className={mt}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index * 0.01, 0.55),
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {node}
    </motion.div>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const open = useCallback(() => {
    setMarkdown(pageToMarkdown(pathname ?? "/"));
    setMode("machine");
  }, [pathname]);

  // Leaving the page or pressing Escape returns to the human view.
  useEffect(() => setMode("human"), [pathname]);
  useEffect(() => {
    if (mode !== "machine") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMode("human");
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
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
      <div
        role="radiogroup"
        aria-label="View this page as"
        className="relative inline-flex items-center rounded-full bg-[#eeebe6] p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.9)]"
      >
        {(["human", "machine"] as const).map((value) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => (value === "machine" ? open() : setMode("human"))}
              className="relative px-5 py-[7px] text-[10.5px] font-bold uppercase tracking-[0.16em]"
            >
              {active ? (
                <motion.span
                  layoutId="machine-toggle-chip"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 28,
                    mass: 0.8,
                  }}
                />
              ) : null}
              <motion.span
                className="relative"
                animate={{ color: active ? "#1a1a1a" : "#b0a99e" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {value}
              </motion.span>
            </button>
          );
        })}
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {mode === "machine" ? (
                <motion.div
                  data-machine-view
                  role="dialog"
                  aria-modal="true"
                  aria-label="Machine-readable version of this page"
                  className="fixed inset-0 z-[2000] flex flex-col bg-[#f8f7f5] text-neutral-800"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{
                    duration: 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* The page, as plain text */}
                  <div
                    data-lenis-prevent
                    className="flex-1 overflow-y-auto px-6 pb-28 pt-12 sm:px-10 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-300"
                  >
                    <pre className="mx-auto max-w-[760px] whitespace-pre-wrap break-words font-mono text-[13.5px] leading-[1.85]">
                      {(() => {
                        const isHeading  = (l: string) => /^#{1,6} /.test(l);
                        const isFront    = (l: string) => /^(---|[a-z_]+: )/.test(l);
                        const isList     = (l: string) => /^- /.test(l);
                        const isBlank    = (l: string) => !l.trim();

                        let animIdx = 0;
                        return lines.reduce<React.ReactNode[]>((acc, line, i) => {
                          // Skip blank lines — they drive spacing on the next token
                          if (isBlank(line)) return acc;

                          const prev     = lines.slice(0, i).reverse().find(l => !isBlank(l)) ?? "";
                          const prevRaw  = i > 0 ? lines[i - 1] : "";
                          const afterGap = isBlank(prevRaw);

                          let mt = "";
                          if (i === 0 || (isFront(line) && isFront(prev) && !afterGap)) {
                            mt = "mt-[3px]";                  // tight front-matter rows
                          } else if (isHeading(line)) {
                            mt = acc.length === 0 ? "" : "mt-10"; // big breath before headings
                          } else if (isList(line) && isList(prev) && !afterGap) {
                            mt = "mt-[5px]";                  // snug list items
                          } else if (afterGap) {
                            mt = "mt-5";                      // paragraph gap
                          } else {
                            mt = "mt-[3px]";                  // consecutive body
                          }

                          acc.push(
                            <MarkdownLine key={i} line={line} index={animIdx++} mt={mt} />
                          );
                          return acc;
                        }, []);
                      })()}
                    </pre>
                  </div>

                  {/* Bottom fade + floating toggle */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0">
                    <div className="h-28 bg-gradient-to-t from-[#f8f7f5] via-[#f8f7f5]/80 to-transparent" />
                    <div className="flex justify-center pb-8 -mt-20 pointer-events-auto">
                      <div className="inline-flex items-center rounded-full bg-[#eeebe6] p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.9),0_8px_32px_rgba(0,0,0,0.10)]">
                        <button
                          type="button"
                          onClick={() => setMode("human")}
                          className="relative px-5 py-[7px] text-[10.5px] font-bold uppercase tracking-[0.16em]"
                        >
                          <motion.span
                            className="relative"
                            animate={{ color: "#b0a99e" }}
                            whileHover={{ color: "#6b6560" }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                          >
                            Human
                          </motion.span>
                        </button>
                        <span className="relative inline-flex items-center rounded-full bg-white px-5 py-[7px] text-[10.5px] font-bold uppercase tracking-[0.16em] text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]">
                          Machine
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
