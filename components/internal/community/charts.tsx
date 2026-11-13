import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Small charts for the community analytics, in plain HTML and SVG with no
 * client code: hover and keyboard focus show a tooltip through CSS, and
 * every chart has a table view. One accent (the dashboard's orange) for
 * the series that matters; a neutral gray for context.
 */

/** Rounds a maximum up to 1, 2, 2.5 or 5 × 10^n for clean axis ticks. */
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * power) return step * power;
  }
  return 10 * power;
}

/** Axis ticks: full numbers under 10,000, then 10K, 1.2M. */
export function compact(value: number) {
  if (Math.abs(value) < 10_000)
    return Math.round(value).toLocaleString("en-IN");
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const ACCENT = "bg-[var(--i-bar)]";
const CONTEXT = "bg-[var(--i-line-strong)]";

function Tooltip({
  children,
  align,
}: {
  children: ReactNode;
  align: "left" | "center" | "right";
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max min-w-[7.5rem] rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] px-2.5 py-2 text-left text-[12px] leading-snug shadow-[var(--i-shadow-pop)] group-hover:block group-focus-visible:block",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "left" && "left-0",
        align === "right" && "right-0",
      )}
    >
      {children}
    </span>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; tone: "accent" | "context" }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--i-muted)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-2.5 rounded-[3px]",
              item.tone === "accent" ? ACCENT : CONTEXT,
            )}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** A "Show as table" view under a chart. */
export function TableView({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-3 text-[12.5px]">
      <summary className="cursor-pointer select-none text-[var(--i-muted)] hover:text-[var(--i-ink)]">
        Show as table
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--i-line)]">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-[var(--i-sunken)] text-[var(--i-muted)]">
            <tr>
              {head.map((cell, index) => (
                <th
                  key={cell}
                  className={cn(
                    "px-3 py-1.5 font-normal",
                    index > 0 && "text-right",
                  )}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row[0])}
                className="border-t border-[var(--i-line)]"
              >
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={cn(
                      "px-3 py-1.5",
                      index > 0 && "text-right tabular-nums",
                    )}
                  >
                    {typeof cell === "number"
                      ? cell.toLocaleString("en-IN")
                      : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export type ColumnGroup = { key: string; label: string; values: number[] };

/**
 * Columns per period, one or two series side by side. The last series is
 * the accent; earlier ones are context gray.
 */
export function ColumnChart({
  groups,
  series,
  height = 168,
  format = (value: number) => value.toLocaleString("en-IN"),
}: {
  groups: ColumnGroup[];
  series: string[];
  height?: number;
  format?: (value: number) => string;
}) {
  const max = niceMax(Math.max(0, ...groups.flatMap((group) => group.values)));
  // Whole numbers only: a 0.5 or 2.5 gridline would round to a wrong label.
  const ticks = Number.isInteger(max / 2) ? [0, max / 2, max] : [0, max];
  const tone = (index: number) =>
    index === series.length - 1 ? ACCENT : CONTEXT;
  return (
    <div>
      <div className="relative" style={{ height }}>
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute inset-x-0 flex items-center"
            style={{ bottom: `${(tick / max) * 100}%` }}
          >
            <span className="w-9 -translate-y-px pr-2 text-right text-[11px] leading-none tabular-nums text-[var(--i-faint)]">
              {compact(tick)}
            </span>
            <span className="h-px flex-1 bg-[var(--i-line)]" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-9 right-0 flex items-end">
          {groups.map((group, index) => {
            const align =
              index < 2
                ? "left"
                : index > groups.length - 3
                  ? "right"
                  : "center";
            const empty = group.values.every((value) => value === 0);
            return (
              <div
                key={group.key}
                tabIndex={0}
                aria-label={`${group.label}: ${series.map((name, at) => `${name} ${format(group.values[at] ?? 0)}`).join(", ")}`}
                className="group relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-sm outline-none hover:bg-[var(--i-hover)] focus-visible:bg-[var(--i-hover)]"
              >
                {group.values.map((value, at) => (
                  <span
                    key={at}
                    aria-hidden
                    className={cn("block rounded-t-[4px]", tone(at))}
                    style={{
                      height:
                        value > 0 ? `max(2px, ${(value / max) * 100}%)` : 0,
                      width: `min(${series.length > 1 ? 12 : 24}px, ${series.length > 1 ? 34 : 60}%)`,
                    }}
                  />
                ))}
                <Tooltip align={align}>
                  <span className="mb-1 block text-[var(--i-muted)]">
                    {group.label}
                  </span>
                  {empty ? (
                    <span className="block text-[var(--i-muted)]">
                      Nothing this month
                    </span>
                  ) : (
                    [...series.keys()].reverse().map((at) => (
                      <span
                        key={series[at]}
                        className="flex items-center gap-2"
                      >
                        <span
                          aria-hidden
                          className={cn("h-0.5 w-3 rounded-full", tone(at))}
                        />
                        <strong className="font-medium tabular-nums text-[var(--i-ink)]">
                          {format(group.values[at] ?? 0)}
                        </strong>
                        <span className="text-[var(--i-muted)]">
                          {series[at]}
                        </span>
                      </span>
                    ))
                  )}
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-9 mt-1.5 flex">
        {groups.map((group, index) => (
          <span
            key={group.key}
            className={cn(
              "flex-1 text-center text-[11px] text-[var(--i-faint)]",
              // Every other label when space is tight.
              groups.length > 8 && index % 2 === 1 && "invisible sm:visible",
            )}
          >
            {group.label.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export type Point = { label: string; value: number };

/** A single-series line for one channel, with a hover readout per point. */
export function Sparkline({
  points,
  height = 56,
}: {
  points: Point[];
  height?: number;
}) {
  if (points.length === 0) return <div style={{ height }} />;
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || Math.max(1, high * 0.1);
  const floor = Math.max(0, low - span * 0.15);
  const top = high + span * 0.15;
  const x = (index: number) =>
    points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
  const y = (value: number) =>
    100 - ((value - floor) / (top - floor || 1)) * 100;
  const path = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(index).toFixed(2)},${y(point.value).toFixed(2)}`,
    )
    .join(" ");
  const last = points[points.length - 1];
  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <path
          d={`${path} L${x(points.length - 1)},100 L${x(0)},100 Z`}
          fill="var(--i-bar)"
          opacity={0.1}
        />
        <path
          d={path}
          fill="none"
          stroke="var(--i-bar)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--i-bar)] ring-2 ring-[var(--i-panel)]"
        style={{ left: `${x(points.length - 1)}%`, top: `${y(last.value)}%` }}
      />
      <div className="absolute inset-0 flex">
        {points.map((point, index) => (
          <span
            key={`${point.label}-${index}`}
            tabIndex={0}
            aria-label={`${point.label}: ${point.value.toLocaleString("en-IN")}`}
            className="group relative flex-1 outline-none"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-1/2 hidden w-px bg-[var(--i-line-strong)] group-hover:block group-focus-visible:block"
            />
            <Tooltip
              align={
                index < points.length / 3
                  ? "left"
                  : index > (points.length * 2) / 3
                    ? "right"
                    : "center"
              }
            >
              <strong className="block font-medium tabular-nums text-[var(--i-ink)]">
                {point.value.toLocaleString("en-IN")}
              </strong>
              <span className="text-[var(--i-muted)]">{point.label}</span>
            </Tooltip>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Named rows, each with a bar against the longest and a figure. */
export function BarList({
  rows,
  empty = "Nothing yet.",
}: {
  rows: {
    key: string;
    label: ReactNode;
    value: number;
    figure: ReactNode;
    note?: ReactNode;
  }[];
  empty?: string;
}) {
  if (!rows.length)
    return <p className="text-[13px] text-[var(--i-muted)]">{empty}</p>;
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="text-[13px]">
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="shrink-0 tabular-nums">
              {row.figure}
              {row.note ? (
                <span className="ml-1.5 text-[12px] text-[var(--i-muted)]">
                  {row.note}
                </span>
              ) : null}
            </span>
          </span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--i-track)]">
            <span
              className={cn("block h-full rounded-full", ACCENT)}
              style={{
                width:
                  row.value > 0 ? `max(3px, ${(row.value / max) * 100}%)` : 0,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
