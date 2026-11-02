"use client";

import { motion, useReducedMotion } from "motion/react";
import { PlayCircle, type Icon } from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { cn } from "@/lib/utils";
import {
  Cursor,
  PrintBlock,
  SelectionFrame,
} from "@/components/paper/paper-hero";

/**
 * A 3D icon tile in the brand orange: a lit rounded face on an extruded base,
 * with a white glyph for what Studio1 makes (videos, docs, DevRel).
 */
export function Icon3D({
  icon: Glyph,
  className,
}: {
  icon: Icon;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("relative block aspect-square", className)}>
      {/* thin extruded base and a soft contact shadow */}
      <span className="absolute inset-0 translate-y-[6%] rounded-[30%] bg-[#c2410c] shadow-[0_18px_26px_-14px_rgba(120,40,0,0.5)]" />
      {/* lit face: gentle top-left light, hairline highlight on the rim */}
      <span className="absolute inset-0 flex items-center justify-center rounded-[30%] bg-[linear-gradient(150deg,#fdba74_0%,#f97316_45%,#ea580c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_0_0_1px_rgba(255,255,255,0.18),inset_0_-6px_10px_rgba(124,45,18,0.22)]">
        <Glyph
          weight="bold"
          className="size-[42%] text-white drop-shadow-[0_1px_1px_rgba(124,45,18,0.35)]"
        />
      </span>
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
        "flex items-center gap-2.5 rounded-[14px] bg-white/45 py-2 pl-2 pr-4 text-[13px] font-medium text-[#141414] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_16px_32px_-20px_rgba(20,20,20,0.45)] ring-1 ring-[#141414]/[0.06] backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
    >
      <span
        className="flex size-7 items-center justify-center rounded-[8px] text-[#f4efe7]"
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
          <PrintBlock className="flex size-[104px] items-center justify-center rounded-[14px] xl:size-[120px]">
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
