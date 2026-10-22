import type { ReactNode } from "react";
import { MAP_FLAGS } from "@/components/ui/map-flags";
import { cn } from "@/lib/utils";

const star = (cx: number, cy: number, r: number, fill: string, rotate = 0) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2 + rotate;
    const radius = i % 2 === 0 ? r : r * 0.4;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={points} fill={fill} />;
};

/** Simplified flags in a 10x10 box, one per site locale. */
const FLAGS: Record<string, ReactNode> = {
  en: MAP_FLAGS.USA,
  fr: MAP_FLAGS.France,
  es: (
    <>
      <rect width="10" height="10" fill="#aa151b" />
      <rect y="2.5" width="10" height="5" fill="#f1bf00" />
    </>
  ),
  hi: (
    <>
      <rect width="10" height="3.34" fill="#ff9933" />
      <rect y="3.33" width="10" height="3.34" fill="#fff" />
      <rect y="6.66" width="10" height="3.34" fill="#138808" />
      <circle cx="5" cy="5" r="1.15" fill="none" stroke="#000080" strokeWidth="0.35" />
      <circle cx="5" cy="5" r="0.25" fill="#000080" />
    </>
  ),
  zh: (
    <>
      <rect width="10" height="10" fill="#ee1c25" />
      {star(3, 3.2, 1.6, "#ffff00")}
      {star(5.6, 1.6, 0.5, "#ffff00", 0.4)}
      {star(6.6, 2.9, 0.5, "#ffff00", 0.9)}
      {star(6.6, 4.5, 0.5, "#ffff00", 0)}
      {star(5.6, 5.8, 0.5, "#ffff00", 0.4)}
    </>
  ),
};

/**
 * Round SVG flag for a locale. Emoji flags don't render on Windows (they fall
 * back to letters like "US"), so the switcher uses these instead.
 */
export function LocaleFlag({ locale, className }: { locale: string; className?: string }) {
  const flag = FLAGS[locale];
  if (!flag) return null;
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className={cn("size-[18px] shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15", className)}
    >
      <defs>
        <clipPath id={`flag-clip-${locale}`}>
          <circle cx="5" cy="5" r="5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-clip-${locale})`}>{flag}</g>
    </svg>
  );
}
