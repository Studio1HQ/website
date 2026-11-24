import { cn } from "@/lib/utils";

/**
 * A monotone cubic path through the points (Fritsch–Carlson): a smooth line
 * that still passes through every count and never swings past them, so a
 * dip to zero doesn't draw as a dive below the axis.
 */
function smoothPath(xs: number[], ys: number[]) {
  const n = xs.length;
  const dx = xs.slice(1).map((x, i) => x - xs[i]);
  const slope = ys.slice(1).map((y, i) => (y - ys[i]) / dx[i]);
  const tangent = xs.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      tangent[i] = (3 / h) * a * slope[i];
      tangent[i + 1] = (3 / h) * b * slope[i];
    }
  }
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = xs[i] + dx[i] / 3;
    const c1y = ys[i] + (tangent[i] * dx[i]) / 3;
    const c2x = xs[i + 1] - dx[i] / 3;
    const c2y = ys[i + 1] - (tangent[i + 1] * dx[i]) / 3;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[i + 1].toFixed(1)}`;
  }
  return d;
}

/**
 * A small trend line for a dashboard card: a smooth accent line over a soft
 * fill that fades to nothing, the latest point marked. `label` says what it
 * shows ("Applications a day, last 14 days") for screen readers and on
 * hover.
 */
export function Sparkline({
  points,
  label,
  width = 240,
  height = 40,
  kind = "line",
  className,
}: {
  points: readonly number[];
  label: string;
  /** "bars" for small counts a day (a line through 0, 2, 0, 1 only zig-zags). */
  kind?: "line" | "bars";
  width?: number;
  height?: number;
  className?: string;
}) {
  // Nothing happened in the whole stretch: no graph (a flat line along the
  // bottom reads as broken), the card's own words say it.
  if (points.length < 2 || points.every((value) => value === 0)) return null;
  if (kind === "bars") {
    const max = Math.max(...points, 1);
    const gap = 2;
    const bar = (width - gap * (points.length - 1)) / points.length;
    const last = points.length - 1;
    return (
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" height={height} className={cn("block w-full", className)}>
        <title>{label}</title>
        {points.map((value, index) => {
          // an empty day still shows as a short stub, so the run of days reads
          const h = Math.max(2, (value / max) * height);
          return (
            <rect
              key={index}
              x={index * (bar + gap)}
              y={height - h}
              width={bar}
              height={h}
              rx={Math.min(2, bar / 2)}
              fill={index === last ? "var(--i-ink)" : value ? "color-mix(in srgb, var(--i-ink) 55%, transparent)" : "var(--i-line-strong)"}
            />
          );
        })}
      </svg>
    );
  }
  const pad = 4;
  const max = Math.max(...points, 1);
  const xs = points.map((_, index) => pad + (index * (width - 2 * pad)) / (points.length - 1));
  const ys = points.map((value) => height - pad - (value / max) * (height - 2 * pad));
  const line = smoothPath(xs, ys);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      height={height}
      className={cn("block w-full overflow-visible", className)}
    >
      <title>{label}</title>
      <path
        d={line}
        fill="none"
        stroke="var(--i-ink)"
        strokeOpacity={0.85}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
