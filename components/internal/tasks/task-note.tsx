"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A task's note under its title, for whoever checks the work: two lines,
 * and a click shows the rest when there's more.
 */
export function TaskNote({ text, className }: { text: string; className?: string }) {
  const body = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState(false);
  const [clipped, setClipped] = useState(false);

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
      {text}
    </span>
  );
  const look = "block w-full text-left text-[12px] leading-snug text-[var(--i-muted)]";

  if (!clipped && !full) return <p className={cn(look, className)}>{words}</p>;
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
