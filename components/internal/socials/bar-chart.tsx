"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { axisNumber, gainTicks } from "@/lib/internal/socials/chart";
import { cn } from "@/lib/utils";

/**
 * One measure as bars, in the accent, on a recessive grid: months on the
 * Analytics card, or a month's days. Bars rise from zero (a loss hangs
 * below it, in grey); a gap is a period with no number. Hovering, or the
 * arrow keys once it's focused, reads a bar in a card beside it; with
 * `onPick`, clicking a bar (or Enter) chooses it, and `selected` marks the
 * chosen one on the axis.
 */

export type Bar = { key: string; value: number | null };

const TOP = 12;
const AXIS = 26;
const LEFT = 48;
const RIGHT = 12;
const TIP = 188;

export function BarChart({
  bars,
  name,
  height = 150,
  axisLabel,
  tick = axisNumber,
  tip,
  selected = null,
  onPick,
}: {
  bars: Bar[];
  /** What the chart shows, for screen readers. */
  name: string;
  height?: number;
  /** The label under each bar (some are skipped when they'd crowd). */
  axisLabel: (index: number) => string;
  tick?: (value: number) => string;
  /** The hover card for a bar; also read out for screen readers. */
  tip: (index: number) => {
    title: ReactNode;
    lines: ReactNode[];
    read: string;
  };
  selected?: number | null;
  onPick?: (index: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    setWidth(Math.round(node.clientWidth));
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const count = bars.length;
  const plotWidth = Math.max(width - LEFT - RIGHT, 40);
  const band = plotWidth / Math.max(count, 1);
  const x = (index: number) => LEFT + band * (index + 0.5);
  const values = bars.flatMap((bar) => (bar.value === null ? [] : [bar.value]));
  const ticks = gainTicks(values);
  const low = ticks[0];
  const high = ticks[ticks.length - 1];
  const y = (value: number) =>
    TOP + height - ((value - low) / (high - low || 1)) * height;
  const barWidth = Math.max(2, Math.min(28, band * 0.62));
  // A label every `every` bars, counted back from the last.
  const every = Math.max(1, Math.ceil(34 / band));

  function pointAt(event: MouseEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left) / band);
    return Math.min(count - 1, Math.max(0, index));
  }

  function step(event: KeyboardEvent<HTMLDivElement>) {
    if (!count) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const move = event.key === "ArrowLeft" ? -1 : 1;
      setHover((index) =>
        Math.min(count - 1, Math.max(0, (index ?? count - 1) + move)),
      );
    } else if (event.key === "Enter" && onPick && hover !== null) {
      event.preventDefault();
      onPick(hover);
    } else if (event.key === "Escape") setHover(null);
  }

  const card = hover === null ? null : tip(hover);
  const tipLeft =
    hover === null
      ? 0
      : x(hover) + 14 + TIP <= width
        ? x(hover) + 14
        : Math.max(0, x(hover) - 14 - TIP);

  return (
    <div
      ref={box}
      tabIndex={count ? 0 : -1}
      role="group"
      aria-label={`${name}. Use the left and right arrow keys to read each bar${onPick ? ", Enter to choose it" : ""}.`}
      onKeyDown={step}
      onFocus={() => setHover((index) => index ?? (count ? count - 1 : null))}
      onBlur={() => setHover(null)}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--i-accent-soft)]"
    >
      <svg
        width={width}
        height={TOP + height + AXIS}
        className="block"
        aria-hidden
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={width - RIGHT}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? "var(--i-line-strong)" : "var(--i-line)"}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              x={LEFT - 10}
              y={y(value)}
              dy="0.32em"
              textAnchor="end"
              className="fill-[var(--i-faint)] text-[11px] tabular-nums"
            >
              {tick(value)}
            </text>
          </g>
        ))}

        {bars.map((bar, index) => {
          const chosen = index === selected;
          const shown = (count - 1 - index) % every === 0 || chosen;
          return shown ? (
            <text
              key={bar.key}
              x={x(index)}
              y={TOP + height + 18}
              textAnchor="middle"
              className={cn(
                "text-[11px]",
                chosen
                  ? "fill-[var(--i-ink)] font-semibold"
                  : index === hover
                    ? "fill-[var(--i-ink)]"
                    : "fill-[var(--i-faint)]",
              )}
            >
              {axisLabel(index)}
            </text>
          ) : null;
        })}

        {bars.map((bar, index) => {
          if (bar.value === null) return null;
          const zero = y(0);
          const size = Math.max(Math.abs(zero - y(bar.value)), 2);
          const left = x(index) - barWidth / 2;
          const right = left + barWidth;
          const radius = Math.min(4, barWidth / 2, size);
          const up = bar.value >= 0;
          const end = up ? zero - size : zero + size;
          const d = up
            ? `M${left},${zero} V${end + radius} Q${left},${end} ${left + radius},${end} H${right - radius} Q${right},${end} ${right},${end + radius} V${zero} Z`
            : `M${left},${zero} V${end - radius} Q${left},${end} ${left + radius},${end} H${right - radius} Q${right},${end} ${right},${end - radius} V${zero} Z`;
          return (
            <path
              key={bar.key}
              d={d}
              fill={up ? "var(--i-bar)" : "var(--i-faint)"}
              opacity={hover === null || hover === index ? 1 : 0.45}
            />
          );
        })}

        {selected !== null && selected >= 0 && selected < count ? (
          <line
            x1={x(selected) - barWidth / 2}
            x2={x(selected) + barWidth / 2}
            y1={TOP + height + 25}
            y2={TOP + height + 25}
            stroke="var(--i-ink)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : null}

        {count ? (
          <rect
            x={LEFT}
            y={TOP}
            width={plotWidth}
            height={height + AXIS}
            fill="transparent"
            className={onPick ? "cursor-pointer" : undefined}
            onPointerMove={(event) => setHover(pointAt(event))}
            onPointerDown={(event) => setHover(pointAt(event))}
            onClick={(event) => onPick?.(pointAt(event))}
            onPointerLeave={() => setHover(null)}
          />
        ) : null}
      </svg>

      {card ? (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg bg-[var(--i-panel)] px-3 py-2 text-[12px] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
          style={{ left: tipLeft, width: TIP }}
        >
          <p className="text-[14px] font-semibold tabular-nums text-[var(--i-ink)]">
            {card.title}
          </p>
          {card.lines.map((line, index) => (
            <div key={index} className="mt-0.5 text-[var(--i-muted)]">
              {line}
            </div>
          ))}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {card?.read ?? ""}
      </p>
    </div>
  );
}
