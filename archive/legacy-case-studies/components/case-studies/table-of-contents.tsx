"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
}: TableOfContentsProps = {}) {
  const [headings, setHeadings] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [released, setReleased] = useState(false);
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

      // Release the rail once the end of the case study reaches it. The
      // sentinel sits after the credentials and before the related strip, so
      // the rail stays for all study content and steps aside for the footer
      // sections that follow. Only the fixed rail can overlap what follows it,
      // so inline consumers skip this entirely.
      if (variant === "fixed") {
        const end = document.querySelector("[data-mdx-end]");
        setReleased(
          end ? end.getBoundingClientRect().top <= RELEASE_LINE : false,
        );
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

  return (
    <nav
      aria-label="Table of contents"
      aria-hidden={variant === "fixed" ? released : undefined}
      className={cn(
        variant === "fixed"
          ? [
              "fixed top-32 z-30 hidden w-52 xl:block",
              // Pin to the right gutter of the max-w-7xl (80rem) container.
              "right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]",
              "transition-opacity duration-300 ease-out motion-reduce:transition-none",
              released
                ? "pointer-events-none opacity-0"
                : "pointer-events-auto opacity-100",
            ]
          : // In-flow block; the consumer's wrapper owns positioning.
            "block w-full",
      )}
    >
      <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        On this page
      </p>

      <div data-lenis-prevent className="relative max-h-[60vh] overflow-y-auto">
        {indicator ? (
          <span
            aria-hidden
            className="absolute -left-px w-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ top: indicator.top, height: indicator.height }}
          />
        ) : null}
        <ul ref={listRef} className="space-y-1 border-l border-border">
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
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
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
