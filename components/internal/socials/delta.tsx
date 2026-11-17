import { ArrowDown, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import { signed } from "@/lib/internal/socials/schema";
import { cn } from "@/lib/utils";

/**
 * "↑ +12 (2.5%) vs Oct 2026": a green up or amber down arrow carries the
 * direction, the number stays in ink. With nothing to compare yet it says
 * `first`. No hooks: safe in server and client components.
 */
export function Delta({
  gained,
  percent,
  since,
  first = "—",
  percentClassName,
  className,
}: {
  gained: number | null;
  percent: number | null;
  /** The month it's measured against, as in "vs Oct 2026". */
  since?: string | null;
  first?: string;
  /** Classes for the "(2.5%)", like hiding it where space is tight. */
  percentClassName?: string;
  className?: string;
}) {
  if (gained === null)
    return (
      <span className={cn("text-[var(--i-faint)]", className)}>{first}</span>
    );
  const Arrow = gained > 0 ? ArrowUp : gained < 0 ? ArrowDown : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        className,
      )}
    >
      {Arrow ? (
        <Arrow
          size={11}
          weight="bold"
          aria-hidden
          className={
            gained > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }
        />
      ) : null}
      <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
        {gained === 0 ? "No change" : signed(gained)}
      </span>
      {percent !== null && gained !== 0 ? (
        <span
          className={cn("tabular-nums text-[var(--i-muted)]", percentClassName)}
        >
          ({percent}%)
        </span>
      ) : null}
      {since ? <span className="text-[var(--i-faint)]">vs {since}</span> : null}
    </span>
  );
}
