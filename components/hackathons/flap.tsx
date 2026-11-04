"use client";

import { cn } from "@/lib/utils";

/**
 * One split-flap tile: dark card, a hinge across the middle, a character
 * in mono. Size comes from the `--cw` CSS variable on an ancestor, so the
 * board and the countdown can use the same tile at different scales.
 */

export type FlapTone = "default" | "live" | "call" | "muted";

/**
 * Keyframes for a tile flipping down from its hinge. Render once (as a
 * <style> tag) in any component that uses `flipOnChange`. CSS rather than
 * motion so server-rendered tiles animate reliably after hydration.
 */
export const FLAP_KEYFRAMES =
  "@keyframes s1-flap{from{transform:rotateX(-75deg);opacity:.35}to{transform:rotateX(0);opacity:1}}";

const TONE_TEXT: Record<FlapTone, string> = {
  default: "text-[#f4efe7]",
  live: "text-[#f97316]",
  call: "text-[#fbbf24]",
  muted: "text-[#f4efe7]/55",
};

export function FlapTile({
  char,
  tone = "default",
  /** Flip the new character down from the hinge whenever it changes. */
  flipOnChange = false,
  className,
}: {
  char: string;
  tone?: FlapTone;
  flipOnChange?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex h-[calc(var(--cw)*1.5)] w-[calc(var(--cw)-2px)] shrink-0 items-center justify-center overflow-hidden rounded-[2px] bg-[#1c1c1c] font-mono text-[length:calc(var(--cw)*0.8)] font-semibold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-1px_0_rgba(0,0,0,0.7)] [perspective:240px]",
        className,
      )}
    >
      {/* Upper flap catches a little more light */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.035]" />
      {/* Keyed by character, so each change remounts and replays the flip */}
      <span
        key={flipOnChange ? char : undefined}
        className={cn(
          "relative",
          TONE_TEXT[tone],
          flipOnChange &&
            "inline-block [animation:s1-flap_280ms_cubic-bezier(0.3,1.4,0.5,1)_both] [transform-origin:50%_0%] motion-reduce:[animation:none]",
        )}
      >
        {char}
      </span>
      {/* The hinge between the two flaps */}
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/80" />
    </span>
  );
}
