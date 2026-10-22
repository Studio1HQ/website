"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide inertial scrolling, so every scroll-linked animation glides in
 * both directions instead of stepping with each wheel tick. Off for anyone
 * who prefers reduced motion and on touch devices (native scrolling there).
 * Inner scroll areas opt out with `data-lenis-prevent`.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      anchors: { offset: -96 },
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
