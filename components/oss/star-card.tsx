"use client";

import { useId, useMemo, useRef, useState } from "react";
import { GithubLogo } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";
import { Cursor, SelectionFrame } from "@/components/paper/paper-hero";
import { AWESOME_REPO, AWESOME_STAR_HISTORY } from "@/data/oss";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const W = 320;
const H = 132;
const PAD = { top: 10, right: 10, bottom: 4, left: 0 };

const monthYear = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const number = new Intl.NumberFormat("en");

type Point = { date: string; stars: number; x: number; y: number };

/** The sampled star history, ending on today's live count. */
function useChart(stars: number, asOf: string) {
  return useMemo(() => {
    const history = [...AWESOME_STAR_HISTORY];
    const last = history[history.length - 1];
    if (stars >= last.stars && asOf > last.date) {
      history.push({ date: asOf, stars });
    }
    const t0 = Date.parse(history[0].date);
    const t1 = Date.parse(history[history.length - 1].date);
    const top = Math.max(...history.map((point) => point.stars));
    const yMax = Math.ceil(top / 5000) * 5000;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const points: Point[] = history.map((point) => ({
      ...point,
      x: PAD.left + ((Date.parse(point.date) - t0) / (t1 - t0)) * innerW,
      y: PAD.top + (1 - point.stars / yMax) * innerH,
    }));
    const line = points
      .map(
        (point, i) =>
          `${i ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" ");
    const base = H - PAD.bottom;
    const area = `${line} L${points[points.length - 1].x.toFixed(1)} ${base} L${points[0].x.toFixed(1)} ${base} Z`;
    const grid = [yMax / 2, yMax].map((value) => ({
      value,
      y: PAD.top + (1 - value / yMax) * innerH,
    }));
    return { points, line, area, grid, base };
  }, [stars, asOf]);
}

function StarChart({ stars, asOf }: { stars: number; asOf: string }) {
  const reduceMotion = useReducedMotion();
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const { points, line, area, grid, base } = useChart(stars, asOf);
  const [active, setActive] = useState<number | null>(null);
  const end = points[points.length - 1];
  const shown = active === null ? null : points[active];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - x) < Math.abs(points[nearest].x - x)) {
        nearest = i;
      }
    }
    setActive(nearest);
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-pan-y overflow-visible"
        role="img"
        aria-label={`GitHub stars for Awesome AI Apps, from ${monthYear.format(new Date(points[0].date))} to ${number.format(end.stars)} today`}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <motion.rect
              x={0}
              y={0}
              height={H}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: W }}
              transition={{ duration: 1.8, ease: EASE, delay: 0.5 }}
              width={W}
            />
          </clipPath>
        </defs>
        {grid.map((row) => (
          <g key={row.value}>
            <line
              x1={0}
              x2={W}
              y1={row.y}
              y2={row.y}
              stroke={INK}
              strokeOpacity={0.08}
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
            <text x={0} y={row.y - 4} className="fill-[#141414]/45 text-[9px]">
              {row.value / 1000}k
            </text>
          </g>
        ))}
        <line
          x1={0}
          x2={W}
          y1={base}
          y2={base}
          stroke={INK}
          strokeOpacity={0.14}
          vectorEffect="non-scaling-stroke"
        />
        <g clipPath={`url(#${clipId})`}>
          <path d={area} fill="#fdf0e4" />
          <path
            d={line}
            fill="none"
            stroke={INK}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        {shown ? (
          <g pointerEvents="none">
            <line
              x1={shown.x}
              x2={shown.x}
              y1={PAD.top - 6}
              y2={base}
              stroke={INK}
              strokeOpacity={0.3}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={shown.x}
              cy={shown.y}
              r={3.5}
              fill="#fff"
              stroke={INK}
              strokeWidth={1.5}
            />
          </g>
        ) : null}
        <motion.g
          initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 2.1 }}
          style={{ transformOrigin: `${end.x}px ${end.y}px` }}
        >
          <circle
            cx={end.x}
            cy={end.y}
            r={9}
            fill={PRINT}
            opacity={0.25}
            className="origin-center animate-ping [animation-duration:2.4s] [transform-box:fill-box] motion-reduce:hidden"
          />
          <circle cx={end.x} cy={end.y} r={4} fill={PRINT} />
        </motion.g>
      </svg>

      {/* Hover readout, in HTML so it stays crisp at any size. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-2 whitespace-nowrap bg-[#141414] px-2 py-1 text-[11px] font-medium leading-none text-[#f4efe7] transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{
          left: `${((shown?.x ?? 0) / W) * 100}%`,
          transform: `translateX(${(shown?.x ?? 0) > W * 0.7 ? "-100%" : (shown?.x ?? 0) < W * 0.2 ? "0" : "-50%"})`,
        }}
      >
        {shown ? (
          <>
            {shown === end ? "Today" : monthYear.format(new Date(shown.date))}
            <span className="text-[#f4efe7]/50"> · </span>
            <span className="tabular-nums">
              {number.format(shown.stars)}
            </span>{" "}
            stars
          </>
        ) : null}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-[#141414]/55">
        <span>{monthYear.format(new Date(points[0].date))}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/**
 * Hero card for Awesome AI Apps: the star count, its full history as a
 * sparkline (ink line, orange end dot) and three small stats, framed like a
 * selected layer in a design file.
 */
export function StarCard({
  stars,
  forks,
  contributors,
  apps,
  asOf,
  live,
}: {
  stars: number;
  forks: number;
  contributors: number;
  apps: number;
  asOf: string;
  live: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="relative mx-auto w-full min-w-0 max-w-[520px] lg:mr-0"
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: EASE, delay: 0.25 }}
    >
      <SelectionFrame label="card-awesome-ai-apps" className="p-1.5">
        <a
          href={`https://github.com/${AWESOME_REPO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-white p-5 shadow-[0_1px_0_rgba(27,23,20,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.12)] sm:p-6"
        >
          <span className="flex items-center justify-between gap-4">
            <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/60">
              GitHub stars
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#141414]/60">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  live ? "" : "opacity-40",
                )}
                style={{ background: live ? "#1a7f37" : INK }}
              />
              {live ? "Live from GitHub" : "Snapshot"}
            </span>
          </span>
          <span className="mt-4 flex items-end justify-between gap-4">
            <span className="text-[44px] font-medium leading-none tracking-[-0.045em] tabular-nums sm:text-[52px]">
              {number.format(stars)}
            </span>
            <span className="mb-1 flex min-w-0 items-center gap-1.5 text-[13px] text-[#141414]/60">
              <GithubLogo
                weight="fill"
                className="size-4 shrink-0 text-[#141414]"
              />
              <span className="truncate">
                Arindam200 /{" "}
                <span className="font-medium text-[#141414] underline decoration-[#141414]/20 underline-offset-4 transition-colors group-hover:decoration-[#c2410c]">
                  awesome-ai-apps
                </span>
              </span>
            </span>
          </span>

          <div className="mt-7">
            <StarChart stars={stars} asOf={asOf} />
          </div>

          <span className="mt-6 grid grid-cols-3 border-t border-[#141414]/10 pt-4">
            {[
              { label: "Forks", value: number.format(forks) },
              { label: "Apps", value: String(apps) },
              { label: "Contributors", value: String(contributors) },
            ].map((item, index) => (
              <span
                key={item.label}
                className={cn(
                  "flex flex-col gap-1",
                  index > 0 && "border-l border-[#141414]/10 pl-4",
                )}
              >
                <span className="text-[11px] text-[#141414]/55">
                  {item.label}
                </span>
                <span className="text-[20px] font-medium leading-none tracking-[-0.03em] tabular-nums">
                  {item.value}
                  {item.label === "Contributors" ? (
                    <span style={{ color: PRINT }}>+</span>
                  ) : null}
                </span>
              </span>
            ))}
          </span>
        </a>
      </SelectionFrame>
      <Cursor
        className="absolute -bottom-9 -left-6 size-7 sm:-left-8"
        color={INK}
      />
    </motion.div>
  );
}
