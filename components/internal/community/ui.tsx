import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar, Card, Notice, inputClass } from "@/components/internal/ui";
import {
  COMMUNITY_MIGRATION_HINT,
  daysBetween,
  formatDay,
  labelOf,
  ownerName,
  relativeDay,
  todayKey,
  toneOf,
  type Option,
  type Tone,
} from "@/lib/internal/community/schema";

/* Presentational pieces for the community pages (no hooks). */

export const TONES: Record<Tone, { dot: string; badge: string }> = {
  orange: {
    dot: "bg-orange-500",
    badge:
      "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/25",
  },
  sky: {
    dot: "bg-sky-500",
    badge:
      "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25",
  },
  violet: {
    dot: "bg-violet-500",
    badge:
      "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/25",
  },
  amber: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25",
  },
  emerald: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25",
  },
  rose: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25",
  },
  stone: {
    dot: "bg-stone-400",
    badge:
      "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-500/10 dark:text-stone-300 dark:ring-stone-500/25",
  },
};

export function Pill({
  tone = "stone",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset",
        TONES[tone].badge,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", TONES[tone].dot)}
      />
      {children}
    </span>
  );
}

/** A status pill from one of the option lists in schema.ts. */
export function OptionPill({
  list,
  value,
}: {
  list: readonly Option[];
  value: string | null | undefined;
}) {
  if (!value) return <span className="text-[var(--i-faint)]">—</span>;
  return <Pill tone={toneOf(list, value)}>{labelOf(list, value)}</Pill>;
}

export function Owner({
  owner,
  size = 20,
}: {
  owner: string | null | undefined;
  size?: 20 | 24 | 28;
}) {
  if (!owner) return <span className="text-[var(--i-faint)]">No owner</span>;
  const name = ownerName(owner);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" title={owner}>
      <Avatar
        name={name}
        email={owner.includes("@") ? owner : ""}
        size={size}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** A due or follow-up date: red when past, amber within three days. */
export function DueDate({
  day,
  done = false,
  today = todayKey(),
  quiet = false,
}: {
  day: string | null | undefined;
  done?: boolean;
  today?: string;
  /** Plain text instead of a chip. */
  quiet?: boolean;
}) {
  if (!day) return <span className="text-[var(--i-faint)]">—</span>;
  const diff = daysBetween(today, day);
  const tone = done
    ? "plain"
    : diff < 0
      ? "late"
      : diff <= 3
        ? "soon"
        : "plain";
  return (
    <span
      title={relativeDay(day, today)}
      className={cn(
        "whitespace-nowrap tabular-nums",
        !quiet &&
          tone !== "plain" &&
          "rounded-md px-1.5 py-0.5 text-[12px] font-medium",
        tone === "late" &&
          (quiet
            ? "text-rose-700 dark:text-rose-300"
            : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"),
        tone === "soon" &&
          (quiet
            ? "text-amber-700 dark:text-amber-300"
            : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"),
      )}
    >
      {tone === "late"
        ? `${formatDay(day, today)} · late`
        : diff === 0
          ? "Today"
          : diff === 1
            ? "Tomorrow"
            : formatDay(day, today)}
    </span>
  );
}

export function Stat({
  label,
  value,
  note,
  accent = false,
  href,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        "h-full px-4 py-3.5 sm:px-5 sm:py-4",
        href && "transition-colors hover:border-[var(--i-line-strong)]",
      )}
    >
      <p className="truncate text-[12px] text-[var(--i-muted)] sm:text-[12.5px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 truncate text-[22px] font-medium leading-none tabular-nums tracking-[-0.02em] sm:text-[26px]",
          accent && "text-[var(--i-accent-text)]",
        )}
      >
        {value}
      </p>
      {note ? (
        <p className="mt-2 truncate text-[12.5px] text-[var(--i-faint)]">
          {note}
        </p>
      ) : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** A thin progress bar; turns rose when over 100%. */
export function Meter({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  return (
    <span
      className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--i-track)]"
      role="img"
      aria-label={label ?? `${Math.round(ratio * 100)}%`}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          ratio > 1 ? "bg-rose-500" : "bg-[var(--i-bar)]",
        )}
        style={{
          width: `${Math.min(100, Math.max(ratio > 0 ? 3 : 0, ratio * 100))}%`,
        }}
      />
    </span>
  );
}

export type TabItem = {
  key: string;
  label: string;
  count?: number;
  href: string;
};

/** Link tabs with counts, like the pipelines' status tabs. */
export function LinkTabs({
  items,
  active,
}: {
  items: TabItem[];
  active: string;
}) {
  return (
    <nav
      aria-label="Views"
      className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {items.map((item) => {
        const on = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors",
              on
                ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
                : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "tabular-nums",
                  on ? "text-[var(--i-muted)]" : "text-[var(--i-faint)]",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** A GET search box that keeps the page's other filters. */
export function SearchBox({
  action,
  value,
  placeholder,
  keep = {},
}: {
  action: string;
  value: string;
  placeholder: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="min-w-[200px] flex-1 sm:max-w-xs"
    >
      {Object.entries(keep).map(([name, keepValue]) =>
        keepValue ? (
          <input key={name} type="hidden" name={name} value={keepValue} />
        ) : null,
      )}
      <input
        type="search"
        name="q"
        defaultValue={value}
        placeholder={placeholder}
        aria-label={placeholder}
        className={inputClass("sm")}
      />
    </form>
  );
}

/**
 * Shown when part of a page's data didn't load (or was cut short), so
 * nobody takes a missing number for a real zero.
 */
export function LoadNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-5">
      <Notice tone="warning">
        Some of the community data couldn&apos;t be loaded, so numbers and lists
        on this page may be missing or too low. Reload in a minute.
      </Notice>
    </div>
  );
}

export function MigrationNotice({
  message = COMMUNITY_MIGRATION_HINT,
}: {
  message?: string;
}) {
  return <Notice tone="warning">{message}</Notice>;
}

/** A plain table shell; rows are <tr> children. */
export function Table({
  head,
  children,
  className,
}: {
  head: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
            {head}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-2.5 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** A table row that opens a detail page, with a real link in its first cell. */
export const rowClass =
  "align-middle transition-colors hover:bg-[var(--i-hover)]";

export function RowLink({
  href,
  children,
  sub,
}: {
  href: string;
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <Link href={href} className="group block min-w-0">
      <span className="block truncate font-medium text-[var(--i-ink)] group-hover:text-[var(--i-accent-text)]">
        {children}
      </span>
      {sub ? (
        <span className="mt-0.5 block truncate text-[12px] text-[var(--i-muted)]">
          {sub}
        </span>
      ) : null}
    </Link>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-[var(--i-muted)]">{children}</span>;
}
