"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

/*
 * One continuous paper-tone ribbon for the whole About Us page. It sweeps in
 * from beyond the right edge behind the intro video, slips out of the screen,
 * and runs down just outside the page. At each gap between sections it comes
 * back in, sweeps across, and leaves on the other side, so it is only ever
 * seen crossing open paper, never sitting behind cards. Its leading end
 * tracks the viewport and rewinds as you scroll back up.
 */

const CROSS = 170; // how far above/below a section boundary a crossing spans
const LEAD = 0.72; // the drawn end sits this far down the viewport
const STROKE = 92;

type Geometry = { width: number; height: number; d: string; stroke: number };

function buildGeometry(container: HTMLElement): Geometry | null {
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  if (!width || !height) return null;

  // Just outside the screen on either side, so runs between crossings hide.
  const left = -STROKE;
  const right = width + STROKE;

  // Section boundaries, skipping the header and the closing CTA.
  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>(
      ":scope > header, :scope > section",
    ),
  );
  const bounds = blocks.slice(1, -1).map((el) => el.offsetTop);
  if (!bounds.length) return null;

  // Hero: in from the right, behind the video, out on the left.
  const hero = blocks[0].offsetHeight;
  const pts: [number, number][] = [
    [right, hero * 0.24],
    [left, Math.min(hero * 0.86, bounds[0] - CROSS - 60)],
  ];
  let onRight = false;
  for (const y of bounds) {
    const x0 = onRight ? right : left;
    const x1 = onRight ? left : right;
    pts.push([x0, y - CROSS], [x1, y + CROSS]);
    onRight = !onRight;
  }

  // Vertical handles: straight runs down a margin, smooth S across a gap.
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const pull = (y1 - y0) * 0.55;
    d += ` C ${x0} ${y0 + pull} ${x1} ${y1 - pull} ${x1} ${y1}`;
  }
  return { width, height, d, stroke: STROKE };
}

/** Length along the path where it reaches a given y (y only ever grows). */
function lengthAtY(path: SVGPathElement, total: number, y: number) {
  let lo = 0;
  let hi = total;
  for (let i = 0; i < 22; i += 1) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).y < y) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function PageRibbon() {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const reduceMotion = useReducedMotion();
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const drawn = useMotionValue(0);
  const pathLength = useSpring(drawn, {
    stiffness: 120,
    damping: 28,
    mass: 0.5,
  });

  useEffect(() => {
    const container = ref.current?.parentElement;
    if (!container) return;
    const measure = () => setGeometry(buildGeometry(container));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const track = useCallback(() => {
    const path = pathRef.current;
    const box = ref.current;
    if (!path || !box) return;
    const total = path.getTotalLength();
    if (!total) return;
    const top = box.getBoundingClientRect().top;
    const y = window.innerHeight * LEAD - top;
    drawn.set(lengthAtY(path, total, y) / total);
  }, [drawn]);

  useEffect(() => {
    if (!geometry) return;
    track();
    window.addEventListener("scroll", track, { passive: true });
    window.addEventListener("resize", track);
    return () => {
      window.removeEventListener("scroll", track);
      window.removeEventListener("resize", track);
    };
  }, [geometry, track]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
    >
      {geometry ? (
        <svg
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          className="h-full w-full"
        >
          <motion.path
            ref={pathRef}
            d={geometry.d}
            fill="none"
            stroke="#141414"
            strokeOpacity={0.07}
            strokeWidth={geometry.stroke}
            strokeLinecap="round"
            style={reduceMotion ? undefined : { pathLength }}
          />
        </svg>
      ) : null}
    </div>
  );
}
