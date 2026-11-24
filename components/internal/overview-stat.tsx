import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/internal/icons";
import { AREAS, type CardKey } from "@/components/internal/overview-areas";
import { cn } from "@/lib/utils";

/**
 * One area on the overview, kept to a glance: its name, the number that
 * matters, and one short line under it. A flagged line (at risk, blocked,
 * follow-ups due) reads in the accent colour. Charts, meters and the rest of
 * the facts live on the area's own page, a click away.
 */
export function OverviewStat({
  area,
  href,
  value,
  unit,
  note,
  flag = false,
}: {
  area: CardKey;
  href: string;
  value: ReactNode;
  unit: string;
  note?: ReactNode;
  /** The note is something to act on. */
  flag?: boolean;
}) {
  const IconComponent = AREAS[area].icon;
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] px-4 py-3 shadow-[var(--i-shadow-sm)] transition-colors hover:bg-[var(--i-hover)] dark:border-transparent dark:shadow-none"
    >
      <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--i-muted)]">
        <IconComponent size={14} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{AREAS[area].name}</span>
        <ArrowRight
          size={13}
          className="shrink-0 text-[var(--i-faint)] opacity-0 transition-opacity group-hover:opacity-100"
        />
      </span>
      <span className="mt-2 flex min-w-0 items-baseline gap-1.5">
        <span
          className={cn(
            "shrink-0 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums",
            value === "—" ? "text-[var(--i-faint)]" : null,
          )}
        >
          {value}
        </span>
        <span className="min-w-0 truncate text-[12.5px] text-[var(--i-muted)]">{unit}</span>
      </span>
      {note ? (
        <span
          className={cn(
            "mt-1.5 truncate text-[12px]",
            flag ? "text-[var(--i-accent-text)]" : "text-[var(--i-muted)]",
          )}
        >
          {note}
        </span>
      ) : null}
    </Link>
  );
}
