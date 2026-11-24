"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up from zero when it first appears (about half a
 * second, easing out), then sits still. People who ask for less motion see
 * the number straight away; so do screen readers, which read the final value.
 */
export function CountUp({ value, duration = 650 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || value <= 0) return;
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span aria-label={value.toLocaleString("en-IN")} className="tabular-nums">
      <span aria-hidden>{shown.toLocaleString("en-IN")}</span>
    </span>
  );
}
