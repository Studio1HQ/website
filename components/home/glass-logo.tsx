"use client";

import { useId, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

const MARK_PATH =
  "M0 35C0 16.6807 14.0744 1.64844 32 0.126953V141H51.0523C52.4308 137.344 54.7446 133.689 57.9938 130.033C61.1446 126.508 64.6892 123.44 68.6277 120.829C72.5662 118.349 76.3569 116.782 80 116.129V86.7544C75.4708 87.9292 71.3846 89.6919 67.7415 92.0415C64 94.5225 60.7508 97.46 57.9938 100.854C56.5345 102.72 55.2545 104.659 54.1539 106.671V0H125C144.33 0 160 15.6699 160 35V125C160 144.33 144.33 160 125 160H124V18H104.948C103.569 21.6816 101.255 25.3628 98.0062 29.0444C94.8554 32.5942 91.3108 35.6841 87.3723 38.314C83.4338 40.812 79.6431 42.3896 76 43.0474V72.6304C80.5292 71.4473 84.6154 69.6724 88.2585 67.3057C92 64.8076 95.2492 61.8491 98.0062 58.4307C99.4655 56.5513 100.745 54.5986 101.846 52.5723V160H35C15.67 160 0 144.33 0 125V35Z";

/** Thickness of the glass block (px) and the slice positions through it. */
const DEPTH = 30;
const SLICES = Array.from(
  { length: 13 },
  (_, i) => -DEPTH / 2 + (DEPTH * (i + 0.5)) / 13,
);

/** One glass face of the block: translucent body, inner glow, rim, sheen. */
function GlassFace({
  id,
  sheenX,
  reduceMotion,
}: {
  id: string;
  sheenX: MotionValue<number>;
  reduceMotion: boolean;
}) {
  return (
    <svg
      viewBox="-6 -6 172 172"
      className="absolute inset-0 size-full overflow-visible"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FE3C34" />
          <stop offset="1" stopColor="#FE8B4B" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#93c5fd" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="0.7" stopColor="#f0abfc" />
          <stop offset="1" stopColor="#fdba74" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={MARK_PATH} fillRule="evenodd" />
        </clipPath>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        {/* warm light caught inside the glass */}
        <path
          d={MARK_PATH}
          fill={`url(#${id}-glow)`}
          opacity="0.55"
          filter={`url(#${id}-blur)`}
          transform="translate(6 8)"
        />
        <rect x="0" y="0" width="160" height="160" fill={`url(#${id}-body)`} />
        {/* sheen travels across with scroll */}
        <motion.g style={reduceMotion ? undefined : { x: sheenX }}>
          <rect
            x="-40"
            y="-20"
            width="240"
            height="200"
            fill={`url(#${id}-sheen)`}
            transform="rotate(-20 80 80)"
          />
        </motion.g>
      </g>
      {/* iridescent rim + inner edge highlight */}
      <path
        d={MARK_PATH}
        fill="none"
        fillRule="evenodd"
        stroke={`url(#${id}-rim)`}
        strokeWidth="2.2"
        strokeOpacity="0.95"
      />
      <path
        d={MARK_PATH}
        fill="none"
        fillRule="evenodd"
        stroke="#fff"
        strokeWidth="0.8"
        strokeOpacity="0.7"
        transform="translate(1.2 1.2) scale(0.985)"
      />
    </svg>
  );
}

/**
 * The Studio1 mark as a thick glass block: two glass faces with a stack of
 * slices between them for the sides, an iridescent rim and a sheen that
 * slides across with scroll.
 * The whole mark tilts in 3D with scroll and reverses when scrolling up.
 */
export default function GlassLogo() {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });
  // Coin-like turn: a full revolution as the logo crosses the screen,
  // face-on when centred, reversing when scrolling back up.
  const rotateY = useTransform(progress, [0, 0.5, 1], [-180, 0, 180]);
  const rotateX = useTransform(progress, [0, 0.5, 1], [10, 0, -10]);
  const sheenX = useTransform(progress, [0.1, 0.9], [-140, 140]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative mx-auto size-[132px] drop-shadow-[0_24px_40px_rgba(90,30,0,0.3)] [perspective:900px] dark:drop-shadow-[0_24px_40px_rgba(0,0,0,0.7)] sm:size-[152px]"
    >
      <div className="absolute inset-x-3 -bottom-5 h-7 rounded-[50%] bg-[radial-gradient(ellipse,rgba(234,88,12,0.35),transparent_70%)] blur-md" />
      <motion.div
        className="relative size-full will-change-transform [transform-style:preserve-3d]"
        style={reduceMotion ? undefined : { rotateX, rotateY }}
      >
        {/* Body of the block: thin glass slices stacked through the depth,
            so the sides read as solid glass while it turns */}
        {SLICES.map((z) => (
          <svg
            key={z}
            viewBox="-6 -6 172 172"
            className="absolute inset-0 size-full overflow-visible"
            style={{ transform: `translateZ(${z}px)` }}
          >
            <path
              d={MARK_PATH}
              fillRule="evenodd"
              className="fill-white/[0.05] stroke-white/40 dark:fill-white/[0.03] dark:stroke-white/25"
              strokeWidth="1.6"
            />
          </svg>
        ))}

        {/* Back face */}
        <div
          className="absolute inset-0"
          style={{ transform: `translateZ(${-DEPTH / 2}px) rotateY(180deg)` }}
        >
          <GlassFace
            id={`${id}-b`}
            sheenX={sheenX}
            reduceMotion={!!reduceMotion}
          />
        </div>
        {/* Front face */}
        <div
          className="absolute inset-0"
          style={{ transform: `translateZ(${DEPTH / 2}px)` }}
        >
          <GlassFace
            id={`${id}-f`}
            sheenX={sheenX}
            reduceMotion={!!reduceMotion}
          />
        </div>
      </motion.div>
    </div>
  );
}
