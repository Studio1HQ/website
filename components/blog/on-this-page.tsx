"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Entry = { id: string; text: string; level: 2 | 3 };

const READING_LINE = 140;

/**
 * "On this page" list for blog posts: h2/h3 entries on a hairline track, with
 * an orange marker that slides to the section being read, plus overall %.
 */
export function OnThisPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState("");
  const [progress, setProgress] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const article = document.querySelector("[data-mdx-content]");
    if (!article) return;
    setEntries(
      Array.from(article.querySelectorAll("h2, h3"))
        .filter((el) => el.id)
        .map((el) => ({ id: el.id, text: el.textContent ?? "", level: el.tagName === "H2" ? 2 : 3 })),
    );
  }, []);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-mdx-content]");
    if (!article || entries.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = entries[0].id;
      for (const { id } of entries) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= READING_LINE) current = id;
      }
      setActiveId(current);
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

  useEffect(() => {
    const link = listRef.current?.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`);
    if (link) setMarker({ top: link.offsetTop, height: link.offsetHeight });
  }, [activeId, entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="On this page">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-[var(--home-ink)]">On this page</p>
        <p className="text-[11px] tabular-nums text-[var(--home-ink-soft)]">{Math.round(progress * 100)}%</p>
      </div>
      <div className="relative">
        <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-[var(--home-line)]" />
        {marker ? (
          <span
            aria-hidden
            className="absolute left-0 w-[2px] rounded-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.6)] transition-[top,height] duration-300 ease-out"
            style={{ top: marker.top, height: marker.height }}
          />
        ) : null}
        <ol ref={listRef} className="space-y-0.5">
          {entries.map((entry, index) => {
            const isActive = entry.id === activeId;
            return (
              <li key={`${entry.id}-${index}`}>
                <a
                  href={`#${entry.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "block py-1.5 text-[13px] leading-snug transition-colors duration-300",
                    entry.level === 2 ? "pl-4" : "pl-7 text-[12.5px]",
                    isActive
                      ? "font-medium text-[var(--home-ink)]"
                      : "text-[var(--home-ink-soft)] hover:text-[var(--home-ink)]",
                  )}
                >
                  {entry.text}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
