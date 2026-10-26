"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const EASE = [0.16, 1, 0.3, 1] as const;

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Award laurel: solid lens-shaped leaf pairs along an arc, each set a hair
 * off the stem so the silhouette stays crisp at small sizes. */
const LAUREL = (() => {
  const cx = 31;
  const cy = 29;
  const r = 23;
  const pairs = 7;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const start = rad(120); // base of the branch
  const end = rad(228); // tip
  const spread = rad(32); // how far leaves fan off the stem
  const length = 11.5;
  const width = 3.1;
  const gap = 1.1;
  // Pointed at both ends, base at the origin, pointing along +x.
  const leaf = `M0 0 Q ${length * 0.5} ${-width * 1.15} ${length} 0 Q ${length * 0.5} ${width * 1.15} 0 0 Z`;
  const leaves: { x: number; y: number; deg: number; scale: number }[] = [];

  for (let i = 0; i < pairs; i++) {
    const t = start + ((end - start) * i) / (pairs - 1);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    const tangent = Math.atan2(Math.cos(t), -Math.sin(t));
    const grow = 1 - (0.28 * i) / (pairs - 1); // taper toward the tip
    for (const [dir, size] of [
      [-1, 1], // outer leaf
      [1, 0.78], // inner leaf
    ] as const) {
      const angle = tangent + dir * spread;
      leaves.push({
        x: x + Math.cos(angle) * gap,
        y: y + Math.sin(angle) * gap,
        deg: (angle * 180) / Math.PI,
        scale: grow * size,
      });
    }
  }

  const ax = cx + r * Math.cos(start);
  const ay = cy + r * Math.sin(start);
  const bx = cx + r * Math.cos(end);
  const by = cy + r * Math.sin(end);
  return {
    leaf,
    leaves,
    stem: `M${(ax + 6).toFixed(2)} ${(ay + 3).toFixed(2)} Q ${(ax + 2).toFixed(2)} ${(ay + 1.2).toFixed(2)} ${ax.toFixed(2)} ${ay.toFixed(2)} A ${r} ${r} 0 0 1 ${bx.toFixed(2)} ${by.toFixed(2)}`,
    tip: { x: bx, y: by, deg: (Math.atan2(Math.cos(end), -Math.sin(end)) * 180) / Math.PI },
  };
})();

/** Half of an award laurel. */
function LaurelBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 60" fill="currentColor" aria-hidden className={className}>
      <path d={LAUREL.stem} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      {LAUREL.leaves.map((l, index) => (
        <path
          key={index}
          d={LAUREL.leaf}
          transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.deg.toFixed(1)}) scale(${l.scale.toFixed(2)})`}
        />
      ))}
      <path
        d={LAUREL.leaf}
        transform={`translate(${LAUREL.tip.x.toFixed(2)} ${LAUREL.tip.y.toFixed(2)}) rotate(${LAUREL.tip.deg.toFixed(1)}) scale(0.7)`}
      />
    </svg>
  );
}

/** Award-style label: laurel branches either side, fading hairlines beyond. */
export function LinedLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3 sm:gap-5", className)}>
      <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-30 sm:block" />
      <LaurelBranch className="h-12 w-[30px] shrink-0 opacity-95 sm:h-[58px] sm:w-9" />
      <p className="text-center text-[14px] font-medium leading-snug tracking-[-0.01em] opacity-90 sm:shrink-0 md:text-[15px]">
        {children}
      </p>
      <LaurelBranch className="h-12 w-[30px] shrink-0 -scale-x-100 opacity-95 sm:h-[58px] sm:w-9" />
      <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-30 sm:block" />
    </div>
  );
}

/** Small italic serif eyebrow above a heading. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-editorial text-[20px] leading-none opacity-60 md:text-[22px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Section header used across inner pages: serif eyebrow, large heading, muted lede. */
export function SectionIntro({
  eyebrow,
  title,
  accent,
  description,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Trailing words shown in the orange accent. */
  accent?: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-[820px] text-center", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-5 text-balance text-[34px] font-medium leading-[1.06] tracking-[-0.045em] text-[var(--home-ink)] sm:text-[48px] lg:text-[56px]">
        {title}
        {accent ? (
          <>
            {" "}
            <span className="s1-accent-text">{accent}</span>
          </>
        ) : null}
      </h2>
      {description ? (
        <p className="mx-auto mt-5 max-w-[620px] text-pretty text-[16px] leading-[1.6] text-[var(--home-ink-soft)] md:text-[17px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Frosted glass tile holding an icon, lit from above with a warm underglow. */
export function GlassIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center rounded-[6px]",
        "bg-gradient-to-b from-white/[0.16] to-white/[0.03] ring-1 ring-inset ring-white/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_28px_-10px_rgba(249,115,22,0.75)]",
        "text-[#fdba74] backdrop-blur-md [&_svg]:size-6",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Pill CTA with a round icon cap, in light (on dark) or dark (on light) tone. */
export function PillLink({
  href,
  children,
  tone = "light",
  external = false,
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "light" | "dark" | "brand";
  external?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-full pl-6 pr-1.5 text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-300",
        tone === "light" &&
          "s1-glass-btn-light text-white",
        tone === "dark" &&
          "bg-[var(--home-ink)] text-[var(--home-cream)] hover:opacity-90",
        tone === "brand" &&
          "s1-glass-btn text-white",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45",
          tone === "dark"
            ? "bg-[var(--home-cream)] text-[var(--home-ink)]"
            : "bg-white text-[#140e0a]",
        )}
      >
        <ArrowUpRight weight="bold" className="size-4" />
      </span>
    </a>
  );
}

/** Fade-up on first view. */
export function Rise({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
