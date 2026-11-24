"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X } from "@/components/internal/icons";
import { Select } from "@/components/internal/select";
import { Kbd, buttonClass, inputClass } from "@/components/internal/ui";
import { MIN_SEARCH } from "@/lib/internal/tasks/search";
import { tasksHref } from "@/lib/internal/tasks/shared";
import { cn } from "@/lib/utils";

/**
 * The Search button on the Tasks page. It opens into a box ("/" opens it
 * too); results come a beat after typing stops, in place of the view, and
 * clearing the box goes back to the view it came from.
 */
export function TaskSearch({
  query,
  base,
}: {
  /** The search in the URL now ("" when there's none). */
  query: string;
  /** The page's other params (view, person, week, who), kept as they are. */
  base: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(query));
  const [value, setValue] = useState(query);
  const [busy, startNavigation] = useTransition();
  const box = useRef<HTMLInputElement>(null);
  /** The search this box last asked for, to tell its own results from the URL changing under it. */
  const [asked, setAsked] = useState(query);
  const [seen, setSeen] = useState(query);
  // A tab, the back button or the person picker changed the search: follow it.
  if (query !== seen) {
    setSeen(query);
    if (query !== asked) {
      setAsked(query);
      setValue(query);
      setOpen(Boolean(query));
    }
  }

  const go = (next: string) => {
    const trimmed = next.trim();
    const q = trimmed.length >= MIN_SEARCH ? trimmed : "";
    setAsked(q);
    startNavigation(() => router.replace(tasksHref({ ...base, q: q || null }), { scroll: false }));
  };

  // Search a beat after the last key; a word under two letters shows the view again.
  useEffect(() => {
    const q = value.trim();
    const wanted = q.length >= MIN_SEARCH ? q : "";
    if (wanted === query) return;
    const timer = setTimeout(() => go(value), 300);
    return () => clearTimeout(timer);
    // `go` is rebuilt each render from `base`; the value and the URL's search are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, query]);

  // "/" anywhere (but a field) opens the box.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || target.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => box.current?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setValue("");
    setOpen(false);
    if (query) go("");
  };

  if (!open) {
    return (
      <button
        type="button"
        className={buttonClass("secondary")}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => box.current?.focus());
        }}
        title="Search tasks ( / )"
      >
        <MagnifyingGlass size={15} /> Search
      </button>
    );
  }

  return (
    <div role="search" className="relative w-full sm:w-64">
      <MagnifyingGlass
        size={15}
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--i-faint)]",
          busy && "animate-pulse text-[var(--i-ink-2)]",
        )}
      />
      <input
        ref={box}
        type="search"
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          } else if (event.key === "Enter") {
            event.preventDefault();
            go(value);
          }
        }}
        onBlur={() => {
          if (!value.trim() && !query) setOpen(false);
        }}
        maxLength={80}
        placeholder="Search tasks, notes, clients…"
        aria-label="Search tasks"
        className={cn(inputClass("sm"), "h-9 w-full rounded-full pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value ? (
        <button
          type="button"
          onClick={close}
          aria-label="Clear the search"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--i-faint)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
        >
          <X size={13} />
        </button>
      ) : (
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block">
          <Kbd>/</Kbd>
        </span>
      )}
    </div>
  );
}

/** Whose tasks a search covers: the person shown, or everyone the viewer may see. */
export function SearchScope({ value, options }: { value: string; options: { value: string; label: string; href: string }[] }) {
  const router = useRouter();
  return (
    <Select
      aria-label="Whose tasks to search"
      size="sm"
      value={value}
      onChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) router.replace(option.href, { scroll: false });
      }}
      options={options.map((option) => ({ value: option.value, label: option.label }))}
      className="w-[12.5rem]"
    />
  );
}

/**
 * Opened from a search result: scrolls the week to that card and rings it
 * for a moment, so it's easy to spot among the others.
 */
export function FocusCard({ card }: { card: string }) {
  useEffect(() => {
    const element = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(card)}"]`);
    if (!element) return;
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    const ring = "0 0 0 2px var(--i-accent)";
    element.animate(
      [{ boxShadow: ring }, { boxShadow: ring, offset: 0.75 }, { boxShadow: "0 0 0 2px transparent" }],
      { duration: 2600, easing: "ease-out" },
    );
  }, [card]);
  return null;
}
