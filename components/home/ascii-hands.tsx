"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTime,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";
import { ParticleHand } from "./particle-hand";

/** Rendered width (css px) of each hand per breakpoint. */
function useHandWidth() {
  const [width, setWidth] = useState(340);
  useEffect(() => {
    const xl = window.matchMedia("(min-width: 1280px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const update = () => setWidth(xl.matches ? 420 : lg.matches ? 340 : 240);
    update();
    xl.addEventListener("change", update);
    lg.addEventListener("change", update);
    return () => {
      xl.removeEventListener("change", update);
      lg.removeEventListener("change", update);
    };
  }, []);
  return width;
}

/**
 * Creation-of-Adam hands either side of the glass logo, built from dither
 * particles. Scrolling the section in makes them stream in and assemble
 * (wrist first, pointing finger last) while the hand reaches and turns toward
 * the logo, as if handing it over. Scrolling away (or back up) scatters them.
 */
function Hand({
  side,
  width,
  color,
  still: forceStill = false,
}: {
  side: "left" | "right";
  width: number;
  color?: string;
  /** Fully formed and motionless, regardless of scroll. */
  still?: boolean;
}) {
  const reduceMotion = useReducedMotion() || forceStill;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Follows the scrollbar in both directions, softened by a slow, heavily
  // damped spring so the hands glide in rather than snap.
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.9 });
  const dir = side === "left" ? -1 : 1;

  // Vertical travel: the hands arrive from opposite heights (left from
  // below, right from above) and meet level with the logo at the centre.
  const rise = useTransform(smooth, [0, 0.36, 1], [dir * -60, 0, dir * 30]);
  // Idle float once they're in: a slow breathing drift, out of phase per side.
  const time = useTime();
  const float = useTransform(time, (t) => Math.sin(t / 1400 + (side === "left" ? 0 : Math.PI * 0.6)) * 7);
  const y = useTransform(() => rise.get() + float.get());

  // 0 -> 1 as the section rises to the centre, back toward 0 as it leaves.
  // Begins the moment the hands enter the viewport, then assembles slowly.
  // The hands are the motion, not the grain: they stay almost fully formed
  // and only shed a little texture at the very edges.
  const assembled = useTransform(smooth, [0, 0.22, 0.86, 1], [0.78, 1, 1, 0.82]);
  const still = useMotionValue(1);

  // Reach in from off to the side early in the scroll, settle by ~36%.
  const x = useTransform(smooth, [0, 0.36, 1], [dir * 260, 0, dir * 50]);
  const rotateY = useTransform(smooth, [0, 0.36, 1], [dir * 30, 0, dir * -12]);
  const rotate = useTransform(smooth, [0, 0.36, 1], [dir * -8, 0, dir * 6]);
  const scale = useTransform(smooth, [0, 0.36, 1], [0.9, 1, 0.94]);
  const opacity = useTransform(smooth, [0, 0.16, 0.92, 1], [0, 1, 1, 0.6]);
  const height = Math.round((width * (side === "left" ? 157 : 161)) / 305);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute top-1/2 hidden -translate-y-1/2 [perspective:700px] md:block",
        side === "left" ? "right-full mr-1" : "left-full ml-1",
      )}
    >
      <motion.div
        className={cn(
          // Arms dissolve toward the outer edge instead of ending in a hard cut.
          side === "left"
            ? "origin-right"
            : "origin-left",
        )}
        style={reduceMotion ? undefined : { x, y, rotateY, rotate, scale, opacity }}
      >
        <ParticleHand
          src={
            side === "left" ? "/assets/hand-left.png" : "/assets/hand-right.png"
          }
          width={width}
          height={height}
          progress={reduceMotion ? still : assembled}
          fingerAt={side === "left" ? "right" : "left"}
          color={color}
        />
      </motion.div>
    </div>
  );
}

export default function AsciiHands({
  color,
  still,
}: { color?: string; still?: boolean } = {}) {
  const width = useHandWidth();
  return (
    <div aria-hidden className="contents">
      <Hand side="left" width={width} color={color} still={still} />
      <Hand side="right" width={width} color={color} still={still} />
    </div>
  );
}
