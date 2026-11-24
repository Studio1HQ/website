"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "@/components/internal/icons";
import { noteParts } from "@/lib/internal/tasks/note-links";
import { cn } from "@/lib/utils";

/**
 * A task's note under its title, for whoever checks the work: two lines,
 * and a click shows the rest when there's more. Links show by a short name
 * ("Notion · Backlink Plan", "Google Doc") and open in a new tab.
 */
export function TaskNote({ text, className }: { text: string; className?: string }) {
  const body = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState(false);
  const [clipped, setClipped] = useState(false);
  const parts = useMemo(() => noteParts(text), [text]);
  const linked = parts.some((part) => "url" in part);

  useLayoutEffect(() => {
    const element = body.current;
    if (!element || full) return;
    const check = () => setClipped(element.scrollHeight > element.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
    // `clipped` too: it swaps the wrapper, which remounts the measured span.
  }, [text, full, clipped]);

  const words = (
    <span ref={body} className={cn("block whitespace-pre-line break-words", !full && "line-clamp-2")}>
      {parts.map((part, index) =>
        "url" in part ? (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noreferrer"
            title={part.url}
            data-note-link
            onClick={(event) => event.stopPropagation()}
            className="inline-flex max-w-full items-baseline gap-0.5 font-medium text-[var(--i-ink-2)] underline decoration-[var(--i-line-strong)] underline-offset-2 hover:text-[var(--i-accent-text)] hover:decoration-current"
          >
            <span className="truncate">{part.label}</span>
            <ArrowUpRight size={10} className="shrink-0 self-center" aria-hidden />
          </a>
        ) : (
          part.text
        ),
      )}
    </span>
  );
  const look = "block w-full text-left text-[12px] leading-snug text-[var(--i-muted)]";

  if (!clipped && !full) return <p className={cn(look, className)}>{words}</p>;
  // With links inside, the note can't be one button: a small More / Less does the opening.
  if (linked) {
    return (
      <div className={cn(look, className)}>
        {words}
        <button
          type="button"
          onClick={() => setFull((open) => !open)}
          aria-expanded={full}
          className="mt-0.5 text-[11px] text-[var(--i-faint)] hover:text-[var(--i-ink-2)]"
        >
          {full ? "Less" : "More"}
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setFull((open) => !open)}
      aria-expanded={full}
      title={full ? "Show less" : "Show the whole note"}
      className={cn(look, "hover:text-[var(--i-ink-2)]", className)}
    >
      {words}
    </button>
  );
}
