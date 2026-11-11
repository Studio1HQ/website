"use client";

import { motion, useReducedMotion } from "motion/react";
import { PlayCircle, type Icon } from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { GRAIN } from "@/lib/paper";
import { cn } from "@/lib/utils";
import {
  Cursor,
  PrintBlock,
  SelectionFrame,
} from "@/components/paper/paper-hero";

/**
 * An icon tile printed on paper: a square in brand orange (or ink) with a
 * fine print grid and grain, a light top edge, and a white glyph.
 */
export function Icon3D({
  icon: Glyph,
  className,
  ink = false,
}: {
  icon: Icon;
  className?: string;
  ink?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative isolate flex aspect-square items-center justify-center overflow-hidden rounded-[6px] shadow-[0_18px_30px_-16px_rgba(20,20,20,0.5),0_0_0_3px_rgba(255,255,255,0.8),inset_0_1px_0_rgba(255,255,255,0.35)]",
        ink
          ? "bg-[linear-gradient(150deg,#3a3a3a,#141414)]"
          : "bg-[#f97316]",
        className,
      )}
    >
      {/* Print grid and grain */}
      <span className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:16.66%_16.66%]" />
      <span
        className="absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <Glyph weight="bold" className="size-[46%] text-white" />
    </span>
  );
}

const ARROWS: {
  id: string;
  icon: Icon;
  spot: string;
  from: { x: number; y: number };
  delay: number;
}[] = [
  {
    id: "a1",
    icon: PlayCircle,
    spot: "right-[5%] top-[16%] w-14 rotate-[3deg]",
    from: { x: 60, y: -30 },
    delay: 0.6,
  },
];

/** A frosted glass label tab with an ink or orange icon tile. */
export function GlassTab({
  icon: Glyph,
  label,
  ink,
  className,
}: {
  icon: Icon;
  label: string;
  ink?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 rounded-[6px] bg-[#fbf9f5] py-2 pl-2 pr-4 text-[13px] font-medium text-[#141414] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_16px_32px_-20px_rgba(20,20,20,0.45)] ring-1 ring-[#141414]/[0.06]",
        className,
      )}
    >
      <span
        className="flex size-7 items-center justify-center rounded-[6px] text-[#f4efe7]"
        style={{ background: ink ? "#141414" : "#f97316" }}
      >
        <Glyph weight="regular" className="size-4" />
      </span>
      {label}
    </span>
  );
}

/** 3D arrows that glide in from the page edges toward the hero, then rest. */
export function HeroArrows() {
  const reduceMotion = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[1] hidden lg:block"
    >
      {/* Still layers, like the home hero's canvas artefacts */}
      <div className="absolute left-[3%] top-[14%] -rotate-[3deg]">
        <SelectionFrame
          label="studio1-mark"
          labelPosition="top-left"
          className="p-1.5"
        >
          <PrintBlock className="flex size-[104px] items-center justify-center rounded-[6px] xl:size-[120px]">
            <Logo className="size-[62%] brightness-0 invert" />
          </PrintBlock>
        </SelectionFrame>
        <Cursor className="absolute -bottom-7 -right-5" />
      </div>
      {ARROWS.map((arrow) => (
        <motion.div
          key={arrow.id}
          className={cn("absolute", arrow.spot)}
          initial={reduceMotion ? false : { opacity: 0, ...arrow.from }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 1.4,
            ease: [0.16, 1, 0.3, 1],
            delay: arrow.delay,
          }}
        >
          <Icon3D icon={arrow.icon} className="w-full" />
        </motion.div>
      ))}
    </div>
  );
}
