"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef, type PointerEvent } from "react";

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * Theme-aware premium card surface with a cursor-follow edge light.
 *
 * Light: near-white (background -> accent, both light tokens) with a soft
 * neutral shadow. Dark: subtle top light over the dark background.
 * A warm brand glow and the cursor interaction live in CursorGlowCardEffects.
 */
export const cursorGlowCardClassName = cn(
  "group relative isolate overflow-hidden",
  "bg-gradient-to-b from-background to-accent/40 dark:from-white/[0.05] dark:to-background",
  "border border-border/70 dark:border-white/[0.09]",
  "shadow-[0_12px_30px_-18px_rgba(0,0,0,0.30)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_32px_-22px_rgba(0,0,0,0.85)]",
  "transition-[transform,border-color,box-shadow] duration-500 ease-out",
  "hover:-translate-y-1 hover:border-primary/30 dark:hover:border-white/[0.15]",
  "hover:shadow-[0_20px_44px_-20px_rgba(0,0,0,0.34)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_26px_50px_-26px_rgba(0,0,0,0.9)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
);

export function useCursorGlow<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  const onPointerMove = useCallback((e: PointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  return { ref, onPointerMove };
}

type CursorGlowCardEffectsProps = {
  roundedClassName?: string;
};

export function CursorGlowCardEffects({
  roundedClassName = "rounded-[6px]",
}: CursorGlowCardEffectsProps) {
  return (
    <>
      {/* static warm brand glow — subtle in both themes */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 82% at 88% -14%, hsl(var(--primary) / 0.08), transparent 52%)",
        }}
      />
      {/* material grain */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04] mix-blend-overlay dark:opacity-[0.06]"
        style={{ backgroundImage: `url("${GRAIN}")` }}
      />
      {/* cursor-follow surface glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(300px circle at var(--mx,50%) var(--my,0%), hsl(var(--primary) / 0.10), transparent 62%)",
        }}
      />
      {/* cursor-follow edge light (glows only on the 1px border) */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] p-px opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 motion-reduce:hidden",
          roundedClassName,
        )}
        style={{
          background:
            "radial-gradient(240px circle at var(--mx,50%) var(--my,0%), hsl(var(--primary1) / 0.9), hsl(var(--primary) / 0.35) 22%, transparent 46%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
        }}
      />
    </>
  );
}
