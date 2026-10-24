"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@wrksz/themes/client";
import { Moon, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Light/dark segmented control: both options always visible, a soft
 * highlight slides behind the active one.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const choose = (next: "light" | "dark") => {
    if ((next === "dark") === isDark) return;
    const root = document.documentElement;
    // Cross-fade colours instead of snapping
    root.classList.add("theme-switching");
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-switching"), 400);
  };

  const option =
    "relative z-[1] flex size-[30px] items-center justify-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full p-[3px]",
        "bg-black/[0.05] ring-1 ring-inset ring-black/[0.08]",
        "dark:bg-white/[0.06] dark:ring-white/10",
        className,
      )}
    >
      {/* Sliding highlight */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[3px] top-[3px] size-[30px] rounded-full transition-transform duration-500 ease-s1",
          "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)]",
          "dark:bg-white/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
          isDark ? "translate-x-[32px]" : "translate-x-0",
          !mounted && "opacity-0",
        )}
      />
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        aria-label="Light mode"
        onClick={() => choose("light")}
        className={cn(option, !isDark ? "text-foreground" : "text-foreground/45 hover:text-foreground/80")}
      >
        <Sun weight={isDark ? "regular" : "fill"} className="size-4" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        aria-label="Dark mode"
        onClick={() => choose("dark")}
        className={cn(option, isDark ? "text-foreground" : "text-foreground/45 hover:text-foreground/80")}
      >
        <Moon weight={isDark ? "fill" : "regular"} className="size-4" />
      </button>
    </div>
  );
}
