import Link from "next/link";
import { CaretLeft, CaretRight } from "@/components/internal/icons";
import {
  monthLabel,
  shiftMonth,
  thisMonth,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";

/**
 * Previous / this / next month links for a page with `?month=YYYY-MM`.
 * Server component: `href` builds each month's link.
 */
export function CycleMonthNav({
  month,
  href,
  className,
}: {
  month: string;
  href: (month: string) => string;
  className?: string;
}) {
  const current = thisMonth();
  const arrow =
    "flex size-8 items-center justify-center rounded-md text-[var(--i-muted)] transition-colors hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]";
  return (
    <nav
      aria-label="Month"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] p-0.5 shadow-[var(--i-shadow-sm)]",
        className,
      )}
    >
      <Link
        href={href(shiftMonth(month, -1))}
        className={arrow}
        aria-label={`Back to ${monthLabel(shiftMonth(month, -1))}`}
      >
        <CaretLeft size={14} />
      </Link>
      {/* Grows when the nav is stretched, so the arrows sit at the ends. */}
      <span className="min-w-[8.5rem] flex-1 px-1 text-center text-[13px] font-medium tabular-nums">
        {monthLabel(month)}
      </span>
      <Link
        href={href(shiftMonth(month, 1))}
        className={arrow}
        aria-label={`On to ${monthLabel(shiftMonth(month, 1))}`}
      >
        <CaretRight size={14} />
      </Link>
      {month !== current ? (
        <Link
          href={href(current)}
          className="ml-0.5 inline-flex h-8 items-center rounded-md px-2.5 text-[12.5px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
        >
          This month
        </Link>
      ) : null}
    </nav>
  );
}
