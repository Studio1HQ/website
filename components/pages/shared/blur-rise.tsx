"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";

/**
 * Service-page card reveal: fades up out of a soft blur each time it scrolls
 * into view, including on the way back up.
 */
export function BlurRise({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={
        reduceMotion ? false : { opacity: 0, y: 48, scale: 0.97, filter: "blur(12px)" }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: false, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Orange wash that rises from a card's bottom edge on hover. */
export function HoverWash() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 120%, rgba(249,115,22,0.18), transparent 70%)",
      }}
    />
  );
}
