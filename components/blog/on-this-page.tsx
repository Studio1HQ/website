"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** `index` is the heading's position: ids can repeat (an FAQ question that
 * echoes a chapter title), so tracking goes by position, not id. */
type Entry = {
  id: string;
  text: string;
  level: 2 | 3;
  index: number;
  el: HTMLElement;
};
type Section = Entry & { children: Entry[] };

const READING_LINE = 140;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "On this page" list for blog posts: numbered h2 chapters on a hairline
 * track. Only the chapter being read opens to show its h3s, and an orange
 * marker slides to the heading in view, plus overall %.
 */
export function OnThisPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const article = document.querySelector("[data-mdx-content]");
    if (!article) return;
    // Posts written with only h3s use them as their chapters.
    const flat = !article.querySelector("h2");
    setEntries(
      Array.from(article.querySelectorAll<HTMLElement>("h2, h3"))
        .filter((el) => el.id)
        .map((el, index) => ({
          id: el.id,
          text: el.textContent ?? "",
          level: flat || el.tagName === "H2" ? 2 : 3,
          index,
          el,
        })),
    );
  }, []);

  // h3s before the first h2 have no chapter to open under, so they are left out.
  const sections = useMemo(() => {
    const list: Section[] = [];
    for (const entry of entries) {
      if (entry.level === 2) list.push({ ...entry, children: [] });
      else list.at(-1)?.children.push(entry);
    }
    return list;
  }, [entries]);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-mdx-content]");
    if (!article || entries.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = 0;
      for (const entry of entries) {
        if (entry.el.getBoundingClientRect().top <= READING_LINE)
          current = entry.index;
      }
      setActive(current);
      const rect = article.getBoundingClientRect();
      const p = (READING_LINE - rect.top) / Math.max(1, rect.height);
      setProgress(Math.min(1, Math.max(0, p)));
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
  }, [entries]);

  // Chapters open and close as you read, so the marker follows the list's size too.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => {
      const link = list.querySelector<HTMLElement>(`a[data-index="${active}"]`);
      if (link) setMarker({ top: link.offsetTop, height: link.offsetHeight });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, sections]);

  if (sections.length === 0) return null;

  const jump = (entry: Entry) => (event: React.MouseEvent) => {
    event.preventDefault();
    entry.el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="On this page">
      <div className="flex items-baseline justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--p-muted)]">
        <p>On this page</p>
        <p className="flex items-center gap-2 tabular-nums">
          {Math.round(progress * 100)}%{/* Reading progress ring */}
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-[18px] -rotate-90"
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="rgba(20,20,20,0.1)"
              strokeWidth="2"
            />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
              className="transition-[stroke-dashoffset] duration-150 ease-out"
            />
          </svg>
        </p>
      </div>
      {/* Progress line with a circle pointer riding its leading edge */}
      <div className="relative mb-5 mt-3 h-px bg-[var(--p-line)]">
        <div
          className="h-px bg-[#f97316] transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f97316] bg-white shadow-[0_0_0_3px_rgba(249,115,22,0.15)] transition-[left] duration-150 ease-out"
          style={{ left: `clamp(5px, ${progress * 100}%, calc(100% - 5px))` }}
        />
      </div>

      <div className="relative">
        <span
          aria-hidden
          className="absolute bottom-0 left-0 top-0 w-px bg-[var(--p-line)]"
        />
        {marker ? (
          <span
            aria-hidden
            className="absolute left-0 w-[2px] bg-[#f97316] transition-[top,height] duration-300 ease-out"
            style={{ top: marker.top, height: marker.height }}
          />
        ) : null}
        <ol ref={listRef}>
          {sections.map((section, index) => {
            const isOpen =
              section.index === active ||
              section.children.some((child) => child.index === active);
            return (
              <li key={section.index}>
                <a
                  href={`#${section.id}`}
                  data-index={section.index}
                  onClick={jump(section)}
                  className={cn(
                    "flex gap-2.5 py-1.5 pl-4 text-[13px] leading-snug transition-colors duration-300",
                    isOpen
                      ? "font-medium text-[var(--p-fg)]"
                      : "text-[var(--p-muted)] hover:text-[var(--p-fg)]",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      isOpen ? "text-[#f97316]" : "text-[var(--p-faint)]",
                    )}
                  >
                    {pad(index + 1)}
                  </span>
                  <span>{section.text}</span>
                </a>
                {section.children.length ? (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    inert={!isOpen}
                  >
                    <ol className="overflow-hidden">
                      {section.children.map((child) => (
                        <li key={child.index}>
                          <a
                            href={`#${child.id}`}
                            data-index={child.index}
                            onClick={jump(child)}
                            className={cn(
                              "block py-1 pl-[2.65rem] text-[12.5px] leading-snug transition-colors duration-300",
                              child.index === active
                                ? "text-[var(--p-fg)]"
                                : "text-[var(--p-muted)] hover:text-[var(--p-fg)]",
                            )}
                          >
                            {child.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
