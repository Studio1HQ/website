"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDots } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A flat light tint for the client header and the current stage
const WELL = "bg-[#f6f2ec] ring-1 ring-inset ring-[#141414]/[0.05]";

type TocEntry = {
  id: string;
  text: string;
  level: number;
};

type TableOfContentsProps = {
  /**
   * `"fixed"` (default): the case-study rail, sticky in its own column beside
   * the story, listing the main stages only.
   *
   * `"inline"`: renders as a normal in-flow block with no positioning of its
   * own, so a consumer's own wrapper (e.g. the blog sidebar's `sticky top-20`
   * flex column) controls placement.
   */
  variant?: "fixed" | "inline";
  /** Case-study rail only: the client shown at the top of the card. */
  client?: { name: string; logo?: StaticImageData };
};

/**
 * Table of contents, shared by the case-study page and blog posts.
 *
 * In `"fixed"` mode it sits in a column beside the story and sticks below the
 * navbar, so it holds one position while you read and stops where the study
 * ends, before the full-width sections that follow.
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

    let raf = 0;
    const update = () => {
      raf = 0;
      let current = headings[0].id;
      for (const { id, level } of headings) {
        // The pinned rail lists stages only, so track those
        if (variant === "fixed" && level !== 2) continue;
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
  }, [activeId, headings]);

  if (headings.length === 0) return null;

  if (variant === "fixed") {
    let chapter = 0;
    return (
      // Sticky in its own column: it stays in the same place beside the
      // story while you read, and stops where the study ends
      <nav
        aria-label="Table of contents"
        className="sticky top-28 hidden w-[300px] shrink-0 self-start xl:block"
      >
        <div>
          <div className="rounded-[6px] bg-white p-2 shadow-[0_24px_50px_-34px_rgba(20,20,20,0.5),0_2px_6px_-4px_rgba(20,20,20,0.12)] ring-1 ring-inset ring-[#141414]/[0.06]">
            {/* The client, and how far through their story you are */}
            <div className={cn("rounded-[6px] p-4", WELL)}>
              <div className="flex items-center gap-2.5">
                {client?.logo ? (
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-[6px] shadow-[0_4px_10px_-6px_rgba(20,20,20,0.5)]">
                    <Image
                      src={client.logo}
                      alt=""
                      fill
                      sizes="40px"
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

            <p className="px-3 pb-3 pt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
              On this page
            </p>
            <div data-lenis-prevent className="relative pb-1">
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
                {headings
                  .filter((heading) => heading.level === 2)
                  .map((heading) => {
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
                            "flex gap-2.5 rounded-[6px] px-3 py-3 leading-snug transition-colors duration-300",
                            heading.level === 2
                              ? "text-[14px]"
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
