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

/**
 * "On this page" list for blog posts: h2 chapters as dots on a hairline
 * track. Dots fill orange as you read; the chapter being read opens to show
 * its h3s.
 */
const WELL =
  "bg-white/70 shadow-[0_10px_24px_-20px_rgba(20,20,20,0.35)] ring-1 ring-[#141414]/[0.06] backdrop-blur-xl backdrop-saturate-150";

export function OnThisPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);
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

  // Chapters already reached; their dots are filled orange.
  const reached = sections.filter((section) => section.index <= active).length;

  return (
    <nav
      aria-label="On this page"
      className={`rounded-[14px] ${WELL} px-4 py-4`}
    >
      <p className="mb-3 text-[11.5px] text-[#141414]/50">On this page</p>

      <ol ref={listRef} className="relative">
        {/* The track the dots sit on, filling orange down to where you are */}
        <span
          aria-hidden
          className="absolute bottom-3 left-[4px] top-3 w-px bg-[#141414]/[0.12]"
        />
        {marker ? (
          <span
            aria-hidden
            className="absolute left-[4px] top-3 w-px bg-[#f97316] transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ height: Math.max(0, marker.top + marker.height / 2 - 12) }}
          />
        ) : null}
        {sections.map((section, index) => {
          const isOpen =
            section.index === active ||
            section.children.some((child) => child.index === active);
          const filled = index < reached;
          return (
            <li key={section.index}>
              <a
                href={`#${section.id}`}
                data-index={section.index}
                onClick={jump(section)}
                className={cn(
                  "relative flex gap-3 py-1.5 text-[13px] leading-snug transition-colors duration-300",
                  isOpen
                    ? "font-medium text-[#141414]"
                    : "text-[#141414]/55 hover:text-[#141414]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative mt-[5px] size-[9px] shrink-0 rounded-full border-[1.5px] transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    filled
                      ? "border-[#f97316] bg-[#f97316]"
                      : "border-[#141414]/25 bg-white",
                    isOpen &&
                      "scale-110 shadow-[0_0_0_4px_rgba(249,115,22,0.16)]",
                  )}
                />
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
                            "block py-1 pl-[21px] text-[12.5px] leading-snug transition-colors duration-300",
                            child.index === active
                              ? "text-[#141414]"
                              : "text-[#141414]/50 hover:text-[#141414]",
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
    </nav>
  );
}
