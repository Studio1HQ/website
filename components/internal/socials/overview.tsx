"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ArrowUpRight } from "@/components/internal/icons";
import { monthLabel } from "@/lib/internal/clients/schema";
import {
  axisMonth,
  axisNumber,
  gainTicks,
  lineTicks,
} from "@/lib/internal/socials/chart";
import {
  signed,
  type ChartPoint,
  type OverviewSeries,
} from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";
import { Card, buttonClass } from "@/components/internal/ui";
import { Delta } from "@/components/internal/socials/delta";
import {
  AudienceLogo,
  PlatformLogo,
} from "@/components/internal/socials/platform-logo";

/**
 * Social growth at a glance: a strip of compact stats (the total audience,
 * then each platform) over one chart. Picking a stat puts it on the chart,
 * as its count month by month or what it gained each month. One series at a
 * time, in the accent, so there's no colour key to learn. The month-by-month
 * table under it is the same numbers in full.
 */

type Mode = "count" | "gained";

const counts = new Intl.NumberFormat("en-US");
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function SocialsOverview({ series }: { series: OverviewSeries[] }) {
  const [active, setActive] = useState(series[0]?.key);
  const [mode, setMode] = useState<Mode>("count");
  const current = series.find((item) => item.key === active) ?? series[0];
  if (!current) return null;

  const first = current.points[0];
  const last = current.points[current.points.length - 1];
  const range =
    first && last && first.month !== last.month
      ? `${monthLabel(first.month, true)} – ${monthLabel(last.month, true)}`
      : last
        ? monthLabel(last.month, true)
        : "";

  return (
    <Card className="mb-4 overflow-hidden">
      <div className="overflow-hidden border-b border-[var(--i-line)]">
        <div
          role="group"
          aria-label="What the chart shows"
          className="-mb-px -mr-px grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]"
        >
          {series.map((item) => (
            <Stat
              key={item.key}
              item={item}
              selected={item.key === current.key}
              onSelect={() => setActive(item.key)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-1 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">
            {current.platform ? current.label : "Total audience"}
            <span className="font-normal text-[var(--i-muted)]">
              {" "}
              ·{" "}
              {mode === "count"
                ? current.platform
                  ? current.unit
                  : "followers and subscribers"
                : "gained each month"}
            </span>
          </p>
          {range ? (
            <p className="mt-0.5 text-[12px] text-[var(--i-faint)]">{range}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {current.href ? (
            <a
              href={current.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("ghost", "sm")}
            >
              Open {current.label} <ArrowUpRight size={12} />
            </a>
          ) : null}
          <div
            role="group"
            aria-label="Chart view"
            className="inline-flex rounded-lg bg-[var(--i-hover)] p-0.5 ring-1 ring-inset ring-[var(--i-line)]"
          >
            {(
              [
                ["count", capital(current.unit)],
                ["gained", "Net new"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[13px] transition-colors",
                  mode === value
                    ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] dark:bg-white/[0.14] dark:shadow-none"
                    : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <GrowthChart
        key={`${current.key}-${mode}`}
        points={current.points}
        mode={mode}
        name={current.platform ? current.label : "Total audience"}
        unit={current.unit}
      />
    </Card>
  );
}

/** One stat in the strip; pressing it puts it on the chart. */
function Stat({
  item,
  selected,
  onSelect,
}: {
  item: OverviewSeries;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative min-w-0 border-b border-r border-[var(--i-line)] px-4 py-3.5 text-left transition-colors focus-visible:z-[1]",
        selected ? "bg-[var(--i-hover)]" : "hover:bg-[var(--i-hover)]",
      )}
    >
      <span className="flex items-center gap-2">
        {item.platform ? (
          <PlatformLogo platform={item.platform} size={20} />
        ) : (
          <AudienceLogo size={20} />
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--i-muted)]">
          {item.label}
        </span>
        {item.share !== null ? (
          <span
            title="Share of the total audience"
            className="text-[11.5px] tabular-nums text-[var(--i-faint)]"
          >
            {item.share}%
          </span>
        ) : null}
      </span>
      <span className="mt-2.5 block truncate text-[22px] font-medium leading-none tracking-[-0.02em] text-[var(--i-ink)]">
        {counts.format(item.value)}
      </span>
      <span className="mt-2 block truncate text-[11.5px]">
        <Delta
          gained={item.gained}
          percent={item.percent}
          since={item.since ? monthLabel(item.since, true) : null}
          first="First month logged"
        />
      </span>
      {selected ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--i-accent)]"
        />
      ) : null}
    </button>
  );
}

const PLOT = 180;
const TOP = 12;
const AXIS = 28;
const LEFT = 48;
const RIGHT = 20;
const TIP = 176;

/**
 * The chart: the count as a 2px line (end and hovered month dotted), or the
 * gain as bars from zero (losses below it, in grey). A crosshair snaps to
 * the nearest month; the arrow keys step through months when it's focused.
 */
function GrowthChart({
  points,
  mode,
  name,
  unit,
}: {
  points: ChartPoint[];
  mode: Mode;
  name: string;
  unit: string;
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

  const count = points.length;
  const plotWidth = Math.max(width - LEFT - RIGHT, 40);
  const band = plotWidth / Math.max(count, 1);
  const x = (index: number) => LEFT + band * (index + 0.5);
  const gains = points.flatMap((point) =>
    point.gained === null ? [] : [point.gained],
  );
  const ticks =
    mode === "count"
      ? lineTicks(points.map((point) => point.value))
      : gainTicks(gains);
  const low = ticks[0];
  const high = ticks[ticks.length - 1];
  const y = (value: number) =>
    TOP + PLOT - ((value - low) / (high - low || 1)) * PLOT;
  const every = band < 46 ? 2 : 1;
  const height = TOP + PLOT + AXIS;

  const empty =
    mode === "count"
      ? count < 2
        ? count
          ? "One month logged so far. The line starts with next month's numbers."
          : "Nothing logged yet."
        : null
      : gains.length
        ? null
        : "Net new shows from the second month logged.";

  function pick(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left) / band);
    setHover(Math.min(count - 1, Math.max(0, index)));
  }

  function step(event: KeyboardEvent<HTMLDivElement>) {
    if (!count) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const move = event.key === "ArrowLeft" ? -1 : 1;
      setHover((index) =>
        Math.min(count - 1, Math.max(0, (index ?? count - 1) + move)),
      );
    } else if (event.key === "Escape") setHover(null);
  }

  const hovered = hover === null ? null : points[hover];
  const tipLeft =
    hover === null
      ? 0
      : x(hover) + 14 + TIP <= width
        ? x(hover) + 14
        : Math.max(0, x(hover) - 14 - TIP);
  const reading = hovered
    ? mode === "count"
      ? `${monthLabel(hovered.month)}: ${counts.format(hovered.value)} ${unit}`
      : `${monthLabel(hovered.month)}: ${hovered.gained === null ? "nothing to compare" : signed(hovered.gained)}`
    : "";

  const line = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`,
    )
    .join(" ");
  const barWidth = Math.min(24, band * 0.56);

  return (
    <div
      ref={box}
      tabIndex={count ? 0 : -1}
      role="group"
      aria-label={`${name}, month by month. Use the left and right arrow keys to read each month.`}
      onKeyDown={step}
      onFocus={() => setHover((index) => index ?? (count ? count - 1 : null))}
      onBlur={() => setHover(null)}
      className="relative mb-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--i-accent-soft)]"
    >
      <svg width={width} height={height} className="block" aria-hidden>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LEFT}
              x2={width - RIGHT}
              y1={y(tick)}
              y2={y(tick)}
              stroke={
                mode === "gained" && tick === 0
                  ? "var(--i-line-strong)"
                  : "var(--i-line)"
              }
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              x={LEFT - 10}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-[var(--i-faint)] text-[11px] tabular-nums"
            >
              {axisNumber(tick)}
            </text>
          </g>
        ))}

        {points.map((point, index) =>
          (count - 1 - index) % every === 0 ? (
            <text
              key={point.month}
              x={x(index)}
              y={TOP + PLOT + 19}
              textAnchor="middle"
              className={cn(
                "text-[11px]",
                index === hover
                  ? "fill-[var(--i-ink)]"
                  : "fill-[var(--i-faint)]",
              )}
            >
              {axisMonth(point.month, index === 0)}
            </text>
          ) : null,
        )}

        {mode === "count" ? (
          <>
            {hover !== null ? (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={TOP}
                y2={TOP + PLOT}
                stroke="var(--i-line-strong)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ) : null}
            {count > 1 ? (
              <path
                d={line}
                fill="none"
                stroke="var(--i-accent)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {count && hover !== count - 1 ? (
              <text
                x={x(count - 1)}
                y={y(points[count - 1].value) - 12}
                textAnchor={count > 1 ? "end" : "middle"}
                dx={count > 1 ? 6 : 0}
                className="fill-[var(--i-ink)] text-[11.5px] font-medium tabular-nums"
              >
                {counts.format(points[count - 1].value)}
              </text>
            ) : null}
            {points.map((point, index) =>
              index === count - 1 || index === hover ? (
                <circle
                  key={point.month}
                  cx={x(index)}
                  cy={y(point.value)}
                  r={4.5}
                  fill="var(--i-accent)"
                  stroke="var(--i-panel)"
                  strokeWidth={2}
                />
              ) : null,
            )}
          </>
        ) : (
          points.map((point, index) => {
            if (point.gained === null) return null;
            const zero = y(0);
            const end = y(point.gained);
            const size = Math.max(Math.abs(zero - end), 2);
            const left = x(index) - barWidth / 2;
            const right = left + barWidth;
            const radius = Math.min(4, barWidth / 2, size);
            const up = point.gained >= 0;
            const tip = up ? zero - size : zero + size;
            const d = up
              ? `M${left},${zero} V${tip + radius} Q${left},${tip} ${left + radius},${tip} H${right - radius} Q${right},${tip} ${right},${tip + radius} V${zero} Z`
              : `M${left},${zero} V${tip - radius} Q${left},${tip} ${left + radius},${tip} H${right - radius} Q${right},${tip} ${right},${tip - radius} V${zero} Z`;
            return (
              <path
                key={point.month}
                d={d}
                fill={up ? "var(--i-bar)" : "var(--i-faint)"}
                opacity={hover === null || hover === index ? 1 : 0.45}
              />
            );
          })
        )}

        {count ? (
          <rect
            x={LEFT}
            y={TOP}
            width={plotWidth}
            height={PLOT}
            fill="transparent"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHover(null)}
          />
        ) : null}
      </svg>

      {empty ? (
        <p
          className="pointer-events-none absolute text-center text-[12px] text-[var(--i-faint)]"
          style={{
            left: LEFT,
            right: RIGHT,
            top:
              mode === "count" && count ? TOP + PLOT - 28 : TOP + PLOT / 2 - 24,
          }}
        >
          {empty}
        </p>
      ) : null}

      {hovered ? (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-lg bg-[var(--i-panel)] px-3 py-2 text-[12px] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
          style={{ left: tipLeft, width: TIP }}
        >
          <p className="text-[14px] font-semibold tabular-nums text-[var(--i-ink)]">
            {mode === "count"
              ? counts.format(hovered.value)
              : hovered.gained === null
                ? "—"
                : signed(hovered.gained)}
          </p>
          <p className="mt-0.5 text-[var(--i-muted)]">
            {mode === "count" ? capital(unit) : "Net new"},{" "}
            {monthLabel(hovered.month, true)}
          </p>
          {mode === "count" && hovered.gained !== null ? (
            <p className="mt-1">
              <Delta gained={hovered.gained} percent={hovered.percent} />
            </p>
          ) : null}
          {mode === "gained" && hovered.percent !== null ? (
            <p className="mt-1 text-[var(--i-faint)]">
              {hovered.percent}% on the month before
            </p>
          ) : null}
          {mode === "gained" && hovered.gained === null ? (
            <p className="mt-1 text-[var(--i-faint)]">First month logged</p>
          ) : null}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {reading}
      </p>
    </div>
  );
}
