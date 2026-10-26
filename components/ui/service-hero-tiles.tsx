"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Code, PenNib } from "@phosphor-icons/react";
import { iconVariants, createFloatingAnimation } from "@/lib/animations";
import { floatingTileSurface } from "@/lib/shadows";
import { cn } from "@/lib/utils";

const tileBase =
  "pointer-events-none absolute hidden lg:flex size-14 items-center justify-center rounded-[6px]";

type ServiceHeroTilesProps = {
  /** Icons default to the landing hero's Code / PenNib pair. */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

/**
 * Orange glowing floating tiles that flank the headline, the same
 * `floatingTileSurface` treatment used on the landing hero, adapted to the
 * shared service-hero layout. Positioned inside a centered max-w-7xl overlay
 * so they hug the content on wide screens instead of the raw viewport edges.
 */
export function ServiceHeroTiles({
  leftIcon = <Code className="size-6 drop-shadow-sm" weight="bold" />,
  rightIcon = <PenNib className="size-6 drop-shadow-sm" weight="bold" />,
}: ServiceHeroTilesProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] mx-auto h-full w-full max-w-7xl px-4">
      <motion.div
        variants={iconVariants}
        initial="hidden"
        whileInView="visible"
        animate={createFloatingAnimation(0, -12)}
        viewport={{ once: false, amount: 0.2 }}
        className={cn(
          floatingTileSurface,
          tileBase,
          "top-[13rem] left-[1rem] lg:left-[3rem] xl:left-[5rem]",
        )}
      >
        {leftIcon}
      </motion.div>
      <motion.div
        variants={iconVariants}
        initial="hidden"
        whileInView="visible"
        animate={createFloatingAnimation(1, 12)}
        viewport={{ once: false, amount: 0.2 }}
        className={cn(
          floatingTileSurface,
          tileBase,
          "top-[15.5rem] right-[1rem] lg:right-[3rem] xl:right-[5rem]",
        )}
      >
        {rightIcon}
      </motion.div>
    </div>
  );
}
