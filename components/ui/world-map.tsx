"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import DottedMap from "dotted-map/without-countries";
// Grid precomputed with getMapJSON({ height: 100, grid: "diagonal" });
// generating it in the browser blocks the main thread for ~2s on phones.
import worldGrid from "@/data/world-dotted-map.json";
import Image from "next/image";
import { useTheme } from "@wrksz/themes/client";
import { cn } from "@/lib/utils";
import { MAP_FLAGS } from "@/components/ui/map-flags";

type WorldMapLocation = {
  lat: number;
  lng: number;
  label?: string;
  labelOffset?: { x: number; y: number };
};

export type WorldMapDot = {
  start: WorldMapLocation;
  end: WorldMapLocation;
  /** When true, the draw animation travels from end → start. */
  reverse?: boolean;
};

type WorldMapProps = {
  dots?: WorldMapDot[];
  lineColor?: string;
  showLabels?: boolean;
  animationDuration?: number;
  loop?: boolean;
  className?: string;
  /** "dark" forces the dark rendering regardless of the site theme. */
  tone?: "auto" | "dark";
  /** Label of a location to emphasise (e.g. hovered in a list elsewhere). */
  activeLabel?: string | null;
  onLocationHover?: (label: string | null) => void;
  /** Draw round country flags (Studio1 mark for India) instead of dots. */
  showFlags?: boolean;
};

const STUDIO1_MARK =
  "M0 35C0 16.6807 14.0744 1.64844 32 0.126953V141H51.0523C52.4308 137.344 54.7446 133.689 57.9938 130.033C61.1446 126.508 64.6892 123.44 68.6277 120.829C72.5662 118.349 76.3569 116.782 80 116.129V86.7544C75.4708 87.9292 71.3846 89.6919 67.7415 92.0415C64 94.5225 60.7508 97.46 57.9938 100.854C56.5345 102.72 55.2545 104.659 54.1539 106.671V0H125C144.33 0 160 15.6699 160 35V125C160 144.33 144.33 160 125 160H124V18H104.948C103.569 21.6816 101.255 25.3628 98.0062 29.0444C94.8554 32.5942 91.3108 35.6841 87.3723 38.314C83.4338 40.812 79.6431 42.3896 76 43.0474V72.6304C80.5292 71.4473 84.6154 69.6724 88.2585 67.3057C92 64.8076 95.2492 61.8491 98.0062 58.4307C99.4655 56.5513 100.745 54.5986 101.846 52.5723V160H35C15.67 160 0 144.33 0 125V35Z";

/** Round flag badge (r = 1.35 map units), white ring; India shows the Studio1 mark. */
function FlagMarker({ x, y, label, index }: { x: number; y: number; label: string; index: number }) {
  const r = 1.35;
  const clipId = `flag-clip-${index}`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={x} cy={y} r={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {label === "India" ? (
          <>
            <circle cx={x} cy={y} r={r} fill="#0b0807" />
            <path
              d={STUDIO1_MARK}
              fill="url(#flag-mark-grad)"
              fillRule="evenodd"
              transform={`translate(${x - r * 0.62} ${y - r * 0.62}) scale(${(r * 1.24) / 160})`}
            />
          </>
        ) : (
          <g transform={`translate(${x - r} ${y - r}) scale(${(r * 2) / 10})`}>{MAP_FLAGS[label]}</g>
        )}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="0.22" />
    </g>
  );
}

type Point = { x: number; y: number };

function createCurvedPath(start: Point, end: Point) {
  const midX = (start.x + end.x) / 2;
  const dx = Math.abs(start.x - end.x);
  const dy = Math.abs(start.y - end.y);
  const arcHeight = Math.max(8, Math.min(16, (dx + dy) * 0.07));
  const midY = Math.min(start.y, end.y) - arcHeight;
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
}

function pointKey(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function WorldMap({
  dots = [],
  lineColor = "currentColor",
  showLabels = true,
  animationDuration = 2,
  loop = true,
  className,
  tone = "auto",
  activeLabel = null,
  onLocationHover,
  showFlags = false,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = tone === "dark" || (mounted && resolvedTheme === "dark");
  // Loops on phones too; the grid is precomputed, so this is cheap.
  const shouldLoop = loop && !reduceMotion;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setReduceMotion(motionQuery.matches);
      setIsMobile(mobileQuery.matches);
    };

    update();
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", update);
      mobileQuery.addEventListener("change", update);
    } else {
      motionQuery.addListener(update);
      mobileQuery.addListener(update);
    }

    return () => {
      if (typeof motionQuery.removeEventListener === "function") {
        motionQuery.removeEventListener("change", update);
        mobileQuery.removeEventListener("change", update);
      } else {
        motionQuery.removeListener(update);
        mobileQuery.removeListener(update);
      }
    };
  }, []);

  const map = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => new DottedMap({ map: worldGrid as any }),
    [],
  );

  const svgMap = useMemo(
    () =>
      map.getSVG({
        radius: isDark ? 0.22 : 0.25,
        // Neutral land dots (Studio1 ink / gray scale)
        color: isDark ? "rgba(242, 242, 242, 0.26)" : "rgba(10, 10, 10, 0.42)",
        shape: "circle",
        backgroundColor: "transparent",
      }),
    [map, isDark],
  );

  const { mapWidth, mapHeight } = useMemo(() => {
    const match = svgMap.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    return {
      mapWidth: match ? Number(match[1]) : 198,
      mapHeight: match ? Number(match[2]) : 100,
    };
  }, [svgMap]);

  const projectPoint = (lat: number, lng: number): Point => {
    const pin = map.getPin({ lat, lng });
    if (!pin) {
      return { x: mapWidth / 2, y: mapHeight / 2 };
    }
    return { x: pin.x, y: pin.y };
  };

  const uniquePoints = useMemo(() => {
    const seen = new Map<
      string,
      WorldMapLocation
    >();

    for (const dot of dots) {
      const startKey = pointKey(dot.start.lat, dot.start.lng);
      const endKey = pointKey(dot.end.lat, dot.end.lng);
      if (!seen.has(startKey)) seen.set(startKey, dot.start);
      if (!seen.has(endKey)) seen.set(endKey, dot.end);
    }

    return Array.from(seen.values());
  }, [dots]);

  const staggerDelay = 0.3;
  const totalAnimationTime = dots.length * staggerDelay + animationDuration;
  const pauseTime = 2;
  const fullCycleDuration = totalAnimationTime + pauseTime;

  return (
    <div
      className={cn(
        "relative aspect-[2/1] w-full overflow-hidden rounded-[10px] font-secondary md:aspect-[2.5/1] lg:aspect-[2/1]",
        className,
      )}
    >
      <Image
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="pointer-events-none h-full w-full select-none object-fill [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_74%)] dark:opacity-80 dark:[mask-image:radial-gradient(ellipse_at_center,black_48%,transparent_82%)]"
        alt="world map"
        height={495}
        width={1056}
        draggable={false}
        unoptimized
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="pointer-events-auto absolute inset-0 h-full w-full select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.35" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="flag-mark-grad" x1="0" y1="80" x2="160" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FE3C34" />
            <stop offset="1" stopColor="#FE8B4B" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          const path = createCurvedPath(startPoint, endPoint);
          const reverse = dot.reverse ?? false;
          const startTime = (i * staggerDelay) / fullCycleDuration;
          const endTime =
            (i * staggerDelay + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;
          const loopTransition = {
            duration: fullCycleDuration,
            times: [0, startTime, endTime, resetTime, 1] as number[],
            ease: "easeInOut" as const,
            repeat: Infinity,
            repeatDelay: 0,
          };

          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={isDark ? "0.35" : "0.42"}
                strokeLinecap="round"
                initial={{ pathLength: 0, pathOffset: reverse ? 1 : 0 }}
                animate={
                  shouldLoop
                    ? reverse
                      ? {
                          pathLength: [0, 0, 1, 1, 0],
                          pathOffset: [1, 1, 0, 0, 1],
                        }
                      : { pathLength: [0, 0, 1, 1, 0], pathOffset: [0, 0, 0, 0, 0] }
                    : reverse
                      ? { pathLength: 1, pathOffset: 0 }
                      : { pathLength: 1, pathOffset: 0 }
                }
                transition={
                  shouldLoop
                    ? loopTransition
                    : {
                        duration: reduceMotion ? 0 : animationDuration,
                        delay: i * staggerDelay,
                        ease: "easeInOut",
                      }
                }
              />

              {shouldLoop ? (
                <motion.circle
                  r={isDark ? "1" : "1.15"}
                  fill={lineColor}
                  initial={{
                    offsetDistance: reverse ? "100%" : "0%",
                    opacity: 0,
                  }}
                  animate={{
                    offsetDistance: reverse
                      ? [null, "100%", "0%", "0%", "100%"]
                      : [null, "0%", "100%", "100%", "0%"],
                    opacity: [0, 0, 1, 0, 0],
                  }}
                  transition={loopTransition}
                  style={{
                    offsetPath: `path('${path}')`,
                  }}
                />
              ) : null}
            </g>
          );
        })}

        {uniquePoints.map((point, i) => {
          const projected = projectPoint(point.lat, point.lng);
          const label = point.label || `Location ${i + 1}`;
          const labelOffset = point.labelOffset ?? { x: 0, y: -3.35 };
          const labelX = projected.x + labelOffset.x;
          const labelY = projected.y + labelOffset.y;

          return (
            <g key={`point-${pointKey(point.lat, point.lng)}`}>
              <motion.g
                onHoverStart={() => {
                  setHoveredLocation(label);
                  onLocationHover?.(label);
                }}
                onHoverEnd={() => {
                  setHoveredLocation(null);
                  onLocationHover?.(null);
                }}
                className="cursor-pointer"
                whileHover={isMobile ? undefined : { scale: 1.25 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {showFlags && (label === "India" || MAP_FLAGS[label]) ? (
                  <FlagMarker x={projected.x} y={projected.y} label={label} index={i} />
                ) : (
                  <circle
                    cx={projected.x}
                    cy={projected.y}
                    r={isDark ? "0.9" : "1.05"}
                    fill={lineColor}
                    filter="url(#glow)"
                  />
                )}
                {showFlags ? null : (
                <circle
                  cx={projected.x}
                  cy={projected.y}
                  r="2.6"
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="0.3"
                  style={{
                    opacity: activeLabel === label || hoveredLocation === label ? 1 : 0,
                    transition: "opacity 250ms ease",
                  }}
                />
                )}
                {shouldLoop && !showFlags ? (
                  <circle
                    cx={projected.x}
                    cy={projected.y}
                    r={isDark ? "0.9" : "1.05"}
                    fill={lineColor}
                    opacity={isDark ? "0.5" : "0.65"}
                  >
                    <animate
                      attributeName="r"
                      from={isDark ? "0.9" : "1.05"}
                      to={isDark ? "3.2" : "3.6"}
                      dur="2s"
                      begin={`${(i % 4) * 0.25}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from={isDark ? "0.55" : "0.65"}
                      to="0"
                      dur="2s"
                      begin={`${(i % 4) * 0.25}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ) : null}
              </motion.g>

              {showLabels && point.label ? (
                <motion.g
                  initial={{ opacity: 0, y: 1 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 * i + 0.2, duration: 0.4 }}
                  className="pointer-events-none"
                >
                  <rect
                    x={labelX - point.label.length * 0.56 - 1.6}
                    y={labelY - 2}
                    width={point.label.length * 1.12 + 3.2}
                    height="4"
                    rx="2"
                    ry="2"
                    className={
                      activeLabel === label || hoveredLocation === label
                        ? "fill-primary stroke-primary"
                        : tone === "dark"
                          ? "fill-[rgba(18,13,11,0.82)] stroke-[rgba(255,255,255,0.16)]"
                          : "fill-s1-bg stroke-s1-line-strong"
                    }
                    style={{ transition: "fill 250ms ease" }}
                    strokeWidth="0.12"
                  />
                  <text
                    x={labelX}
                    y={labelY + 0.1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={
                      activeLabel === label || hoveredLocation === label
                        ? "fill-white"
                        : tone === "dark"
                          ? "fill-[rgba(255,255,255,0.88)]"
                          : "fill-s1-ink"
                    }
                    style={{ fontSize: "2.15px", fontWeight: 500, letterSpacing: "0.01em" }}
                  >
                    {point.label}
                  </text>
                </motion.g>
              ) : null}
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {hoveredLocation ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 rounded-[6px] border border-s1-line bg-s1-bg px-3 py-2 text-sm font-medium text-s1-ink shadow-s1-overlay sm:hidden"
          >
            {hoveredLocation}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
