"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDots, ListBullets } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A clean white plate for the client header and the current chapter
const WELL =
  "bg-white/85 shadow-[0_1px_2px_rgba(20,20,20,0.06),0_6px_14px_-10px_rgba(20,20,20,0.25)] ring-1 ring-inset ring-[#141414]/[0.05]";

type TocEntry = {
  id: string;
  text: string;
  level: number;
};

type TableOfContentsProps = {
  /**
   * `"fixed"` (default): case-study right-rail: pinned to the viewport in the
   * right gutter of the max-w-7xl container, with scroll-release at
   * `[data-mdx-end]`.
   *
   * `"inline"`: renders as a normal in-flow block with no positioning of its
   * own, so a consumer's own wrapper (e.g. the blog sidebar's `sticky top-20`
   * flex column) controls placement. Scroll-release is disabled: blog pages
   * have no `[data-mdx-end]` sentinel.
   */
  variant?: "fixed" | "inline";
  /** Case-study rail only: the client shown at the top of the card. */
  client?: { name: string; logo?: StaticImageData };
};

/**
 * Table of contents, shared by the case-study page and blog posts.
 *
 * In `"fixed"` mode it is positioned against the viewport rather than `sticky`
 * inside the content grid. The grid began below the hero and metric band, so a
 * sticky rail could only ever start mid-page; fixed positioning pins it to a
 * consistent offset from the top of the viewport instead. It sits in the right
 * gutter of the max-w-7xl container, so it never overlaps the left-aligned
 * prose column.
 *
 * In `"inline"` mode it does no positioning at all, see {@link TableOfContentsProps}.
 */
export function TableOfContents({
  variant = "fixed",
  client,
}: TableOfContentsProps = {}) {
  const [progress, setProgress] = useState(0);
  const [headings, setHeadings] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [released, setReleased] = useState(false);
  // The rail waits until the story begins, then slides in and stays
  const [arrived, setArrived] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{
    top: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const article = document.querySelector("[data-mdx-content]");
    if (!article) return;

    const elements = article.querySelectorAll("h2, h3");
    const entries: TocEntry[] = Array.from(elements)
      .filter((el) => el.id)
      .map((el) => ({
        id: el.id,
        text: el.textContent ?? "",
        level: el.tagName === "H2" ? 2 : 3,
      }));

    setHeadings(entries);
  }, []);

  // Track the heading closest above the reading line so the active item
  // always moves in document order, even on fast scrolls.
  useEffect(() => {
    if (headings.length === 0) return;

    // Rail top offset (top-32 = 8rem = 128px) plus a little breathing room,
    // so the rail clears the narrative before the related strip reaches it.
    const RELEASE_LINE = 160;

    let raf = 0;
    const update = () => {
      raf = 0;
      let current = headings[0].id;
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) {
          current = id;
        }
      }
      setActiveId(current);

      // How far through the study the reader is, top of the story to the end
      const article = document.querySelector("[data-mdx-content]");
      const finish = document.querySelector("[data-mdx-end]");
      if (article && finish) {
        const start = article.getBoundingClientRect().top + window.scrollY;
        const end = finish.getBoundingClientRect().top + window.scrollY;
        const read =
          (window.scrollY + window.innerHeight * 0.4 - start) /
          Math.max(1, end - start);
        setProgress(Math.round(Math.min(1, Math.max(0, read)) * 100));
      }

      // The rail appears when the story starts and stays pinned through the
      // narrative. Once the story ends it tucks into a small button at the
      // far right edge, so the contents stay one hover away on a long page
      // without covering the full-width sections below.
      if (variant === "fixed") {
        const start =
          document.querySelector("[data-story-start]") ??
          document.querySelector("[data-mdx-content]");
        setArrived(start ? start.getBoundingClientRect().top <= 220 : true);
        const story = document.querySelector("[data-mdx-content]");
        if (story) {
          setReleased(story.getBoundingClientRect().bottom <= RELEASE_LINE);
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [headings, variant]);

  // Position the sliding indicator over the active link.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !activeId) return;
    const link = list.querySelector(`a[href="#${CSS.escape(activeId)}"]`);
    if (link instanceof HTMLElement) {
      setIndicator({ top: link.offsetTop, height: link.offsetHeight });
    }
  }, [activeId, headings, released]);

  if (headings.length === 0) return null;

  if (variant === "fixed") {
    let chapter = 0;
    return (
      <nav
        aria-label="Table of contents"
        aria-hidden={!arrived}
        className={cn(
          "group/toc fixed z-30 hidden xl:block",
          released
            ? // Tucked away: a small button on the far right edge
              "right-4 top-1/2 -translate-y-1/2"
            : // Pinned in the right gutter of the max-w-7xl (80rem) container
              "right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] top-28 w-64",
          "transition-opacity duration-500 ease-out motion-reduce:transition-none",
          arrived
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        {released ? (
          <button
            type="button"
            aria-label={`Contents, ${progress}% read`}
            className="relative flex size-12 items-center justify-center rounded-full bg-white/70 text-[#141414] shadow-[0_14px_30px_-16px_rgba(20,20,20,0.5),inset_0_1px_0_#fff] ring-1 ring-inset ring-white/80 backdrop-blur-xl transition-transform duration-300 hover:scale-105"
          >
            {/* Reading progress round the edge */}
            <svg
              aria-hidden
              viewBox="0 0 48 48"
              className="absolute inset-0 size-full -rotate-90"
            >
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="#141414"
                strokeOpacity="0.08"
                strokeWidth="2"
              />
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${((progress / 100) * 138.2).toFixed(1)} 138.2`}
              />
            </svg>
            <ListBullets weight="bold" className="size-[18px]" />
          </button>
        ) : null}
        <div
          className={cn(
            released &&
              "pointer-events-none absolute right-full top-1/2 w-[268px] -translate-y-1/2 translate-x-2 pr-3 opacity-0 transition-[opacity,transform] duration-300 group-focus-within/toc:pointer-events-auto group-focus-within/toc:translate-x-0 group-focus-within/toc:opacity-100 group-hover/toc:pointer-events-auto group-hover/toc:translate-x-0 group-hover/toc:opacity-100",
          )}
        >
          <div className="rounded-[6px] bg-white/55 p-2 shadow-[0_24px_50px_-34px_rgba(20,20,20,0.5),0_2px_6px_-4px_rgba(20,20,20,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/70 backdrop-blur-xl backdrop-saturate-150">
            {/* The client, and how far through their story you are */}
            <div className={cn("rounded-[6px] p-3", WELL)}>
              <div className="flex items-center gap-2.5">
                {client?.logo ? (
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-[6px] shadow-[0_4px_10px_-6px_rgba(20,20,20,0.5)]">
                    <Image
                      src={client.logo}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight text-[#141414]">
                    {client?.name ?? "Case study"}
                  </p>
                  <p className="text-[11px] text-[#141414]/50">Case study</p>
                </div>
                <span className="text-[12px] font-medium tabular-nums text-[#141414]/70">
                  {progress}%
                </span>
              </div>
              <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[#141414]/[0.07] shadow-[inset_0_1px_2px_rgba(20,20,20,0.12)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#fb923c,#ea580c)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <p className="px-3 pb-2 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
              On this page
            </p>
            <div
              data-lenis-prevent
              className="relative max-h-[46vh] overflow-y-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {indicator ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 rounded-[6px] transition-[top,height] duration-300 ease-out motion-reduce:transition-none",
                    WELL,
                  )}
                  style={{ top: indicator.top, height: indicator.height }}
                />
              ) : null}
              <ul ref={listRef} className="relative">
                {headings.map((heading) => {
                  if (heading.level === 2) chapter += 1;
                  const active = activeId === heading.id;
                  return (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(heading.id);
                          if (el) {
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                            setActiveId(heading.id);
                          }
                        }}
                        className={cn(
                          "flex gap-2.5 rounded-[6px] px-3 py-[7px] leading-snug transition-colors duration-300",
                          heading.level === 2
                            ? "text-[13px]"
                            : "pl-[38px] text-[12.5px]",
                          active
                            ? "font-medium text-[#141414]"
                            : "text-[#141414]/55 hover:text-[#141414]",
                        )}
                      >
                        {heading.level === 2 ? (
                          <span
                            className={cn(
                              "w-4 shrink-0 text-[11px] font-medium tabular-nums leading-[1.6] transition-colors duration-300",
                              active ? "text-[#ea580c]" : "text-[#141414]/30",
                            )}
                          >
                            {String(chapter).padStart(2, "0")}
                          </span>
                        ) : null}
                        <span className="line-clamp-2">{heading.text}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <a
            href="https://cal.com/studio1/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-2 flex items-center gap-3 rounded-[6px] bg-[#141414] p-2 pr-4 text-[13px] font-medium text-white shadow-[0_16px_30px_-18px_rgba(20,20,20,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-[#262626]"
          >
            {/* The calendar; on hover the Studio1 mark slides in and merges */}
            <span className="relative flex h-8 w-8 shrink-0 items-center transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-[46px] motion-reduce:transition-none">
              <span className="relative z-[1] flex size-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
                <CalendarDots weight="bold" className="size-4" />
              </span>
              <span
                aria-hidden
                className="absolute left-0 z-[2] flex size-8 translate-x-[22px] scale-75 items-center justify-center rounded-full bg-white opacity-0 shadow-[0_0_0_2px_#141414] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[14px] group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none"
              >
                <Image
                  src="/assets/studio1-logo.svg"
                  alt=""
                  width={18}
                  height={18}
                  unoptimized
                  className="size-[18px]"
                />
              </span>
            </span>
            <span className="flex-1">Book a strategy call</span>
            <ArrowUpRight
              weight="bold"
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </nav>
    );
  }

  return (
    // In-flow block; the consumer's wrapper owns positioning.
    <nav aria-label="Table of contents" className="block w-full">
      <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-[#141414]/55">
        On this page
      </p>

      <div data-lenis-prevent className="relative max-h-[60vh] overflow-y-auto">
        {indicator ? (
          <span
            aria-hidden
            className="absolute -left-px w-0.5 rounded-full bg-[#f97316] transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ top: indicator.top, height: indicator.height }}
          />
        ) : null}
        <ul ref={listRef} className="space-y-1 border-l border-[#141414]/12">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(heading.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveId(heading.id);
                  }
                }}
                className={cn(
                  "block py-1 text-[13px] leading-snug transition-colors duration-300",
                  heading.level === 2 ? "pl-4" : "pl-7",
                  activeId === heading.id
                    ? "font-medium text-[#141414]"
                    : "text-[#141414]/55 hover:text-[#141414]",
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
