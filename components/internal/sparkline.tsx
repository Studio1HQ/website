import { ArrowDown, ArrowUp, Minus } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * A small line of counts over time for a dashboard card: the shape in a
 * quiet tone, the latest point in the accent. `label` says what it shows
 * ("Applications a day, last 14 days") for screen readers and on hover.
 */
export function Sparkline({
  points,
  label,
  width = 84,
  height = 28,
  className,
}: {
  points: readonly number[];
  label: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (points.length < 2) return null;
  const pad = 3;
  const max = Math.max(...points, 1);
  const x = (index: number) => pad + (index * (width - 2 * pad)) / (points.length - 1);
  const y = (value: number) => height - pad - (value / max) * (height - 2 * pad);
  const line = points.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <title>{label}</title>
      <polygon
        points={`${x(0).toFixed(1)},${height - pad} ${line} ${x(last).toFixed(1)},${height - pad}`}
        fill="var(--i-faint)"
        opacity={0.12}
      />
      <polyline points={line} fill="none" stroke="var(--i-faint)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(points[last])} r={3} fill="var(--i-accent)" stroke="var(--i-panel)" strokeWidth={1.5} />
    </svg>
  );
}

/**
 * Up or down against the stretch before: a green up arrow, a red down
 * arrow, or a dash for no change, with the difference and what it's against
 * ("last week"). The arrow carries the colour; the words stay readable.
 */
export function Trend({ delta, against }: { delta: number; against: string }) {
  const IconComponent = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <IconComponent
        size={12}
        weight="bold"
        aria-hidden
        className={
          delta > 0
            ? "text-emerald-600 dark:text-emerald-400"
            : delta < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-[var(--i-faint)]"
        }
      />
      <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
        {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "Same"}
      </span>
      <span>{delta === 0 ? `as ${against}` : `vs ${against}`}</span>
    </span>
  );
}
