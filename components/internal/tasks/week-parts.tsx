import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@/components/internal/icons";
import { cn } from "@/lib/utils";
import { dayLabel } from "@/lib/internal/team/shared";
import { statusLabel, type SnapshotItem } from "@/lib/internal/tasks/shared";
import { barShares, share } from "@/lib/internal/tasks/views";
import { Card, CardTitle, ExternalLink, buttonClass, iconButtonClass } from "@/components/internal/ui";
import { Pill } from "@/components/internal/community/ui";

/*
 * Presentational pieces the Week, Month and Team views share: the period
 * switcher, the stat tiles, the work bars and the done / still-open lists.
 * Plain links and markup (no hooks), so they render on the server.
 */

/** ‹ label › plus a "This week/month" link when looking at another one. No › past the current period. */
export function PeriodSwitcher({
  label,
  sub,
  previous,
  next,
  current,
  currentLabel,
  noun,
}: {
  label: string;
  sub?: string;
  previous: string;
  /** Null on the current period: nothing after it to show. */
  next: string | null;
  /** The link back to the current period; null when already on it. */
  current: string | null;
  currentLabel: string;
  /** "week" / "month", for the arrows' labels. */
  noun: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={previous} aria-label={`Previous ${noun}`} className={iconButtonClass()}>
        <CaretLeft size={15} />
      </Link>
      {next ? (
        <Link href={next} aria-label={`Next ${noun}`} className={iconButtonClass()}>
          <CaretRight size={15} />
        </Link>
      ) : (
        <span aria-hidden className={cn(iconButtonClass(), "pointer-events-none opacity-40")}>
          <CaretRight size={15} />
        </span>
      )}
      <span className="ml-1.5 min-w-[8.5rem] leading-tight">
        <span className="block text-[15px] font-medium tabular-nums">{label}</span>
        {sub ? <span className="mt-0.5 block text-[12px] text-[var(--i-muted)]">{sub}</span> : null}
      </span>
      {current ? (
        <Link href={current} className={buttonClass("secondary", "sm")}>
          {currentLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StatTile({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] text-[var(--i-muted)]">{label}</p>
      <p className="mt-1 text-[20px] font-medium leading-none tabular-nums tracking-[-0.01em]">{value}</p>
      {note ? <p className="mt-1 truncate text-[11.5px] text-[var(--i-faint)]">{note}</p> : null}
    </div>
  );
}

/** A row of stat tiles in a card: two across on phones, up to five from md. */
export function StatsRow({ children }: { children: ReactNode }) {
  return (
    <Card className="mb-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 p-5 sm:grid-cols-3 md:grid-cols-5">{children}</div>
    </Card>
  );
}

function things(count: number) {
  return `${count} thing${count === 1 ? "" : "s"}`;
}

/** Studio1 vs client work as one split bar, with the two counts. */
export function SplitBar({ studio, client }: { studio: number; client: number }) {
  const total = studio + client;
  const clientShare = share(client, total);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-[var(--i-ink)]" />
          Studio1 <span className="tabular-nums text-[var(--i-muted)]">{studio}</span>
        </span>
        <span className="flex items-center gap-1.5">
          Clients <span className="tabular-nums text-[var(--i-muted)]">{client}</span>
          <span aria-hidden className="size-2 rounded-full bg-[var(--i-accent)]" />
        </span>
      </div>
      <div
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--i-sunken)]"
        role="img"
        aria-label={total ? `${100 - clientShare}% Studio1, ${clientShare}% clients` : "Nothing done yet"}
      >
        {total ? (
          <>
            <span className="h-full bg-[var(--i-ink)]" style={{ width: `${100 - clientShare}%` }} />
            <span className="h-full bg-[var(--i-accent)]" style={{ width: `${clientShare}%` }} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export type WorkRow = { key: string; label: string; client: boolean; count: number };

/** Things done per "for" (a Studio1 area or a client), biggest first. */
export function ForBars({ rows }: { rows: readonly WorkRow[] }) {
  if (!rows.length) return <p className="text-[12.5px] text-[var(--i-faint)]">Nothing done yet.</p>;
  const widths = barShares(rows.map((row) => row.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--i-muted)]">{things(row.count)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--i-sunken)]">
            <div
              className={cn("h-full rounded-full", row.client ? "bg-[var(--i-accent)]" : "bg-[var(--i-ink-2)]")}
              style={{ width: `${widths[index]}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Done items grouped by what they were for, biggest first. */
export function workRows(items: readonly Pick<SnapshotItem, "for">[]): WorkRow[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.for, (counts.get(item.for) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, client: !label.startsWith("Studio1"), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** The work card: the Studio1/clients split and the per-"for" bars, by things done. */
export function WorkCard({ rows, title = "Where the work went" }: { rows: readonly WorkRow[]; title?: string }) {
  const client = rows.filter((row) => row.client).reduce((sum, row) => sum + row.count, 0);
  const studio = rows.reduce((sum, row) => sum + row.count, 0) - client;
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="space-y-5 p-5">
        <SplitBar studio={studio} client={client} />
        <ForBars rows={rows} />
      </div>
    </Card>
  );
}

const SOURCE: Record<SnapshotItem["source"], string> = {
  task: "Task",
  deliverable: "Client deliverable",
  community: "Community task",
};

/** One done or open item: title, where it counts, and its state. */
function ItemRow({ item, showDay }: { item: SnapshotItem; showDay: boolean }) {
  const where = item.status ?? (item.column ? statusLabel(item.column) : null);
  return (
    <li className="flex flex-col gap-1 px-5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-snug">
          {item.url ? <ExternalLink href={item.url}>{item.title}</ExternalLink> : item.title}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-[var(--i-muted)]">
          {item.for} · {SOURCE[item.source]}
        </p>
        {item.blocked ? (
          <p className="mt-1 text-[12px] text-rose-700 dark:text-rose-300">
            Blocked{item.reason ? `: ${item.reason}` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[12px] text-[var(--i-muted)]">
        {showDay && item.day ? <span className="tabular-nums">{dayLabel(item.day)}</span> : null}
        {!showDay && where ? <Pill tone={item.blocked ? "rose" : item.column === "review" ? "violet" : item.column === "doing" ? "sky" : "stone"}>{where}</Pill> : null}
        {!showDay && item.due_on ? <span className="tabular-nums">Due {dayLabel(item.due_on)}</span> : null}
      </div>
    </li>
  );
}

/** A card listing done items (with the day) or open ones (with where they stand). */
export function ItemsCard({
  title,
  items,
  kind,
  empty,
  limit = 40,
}: {
  title: string;
  items: readonly SnapshotItem[];
  kind: "done" | "open";
  empty: string;
  limit?: number;
}) {
  return (
    <Card>
      <CardTitle action={<span className="text-[12px] tabular-nums text-[var(--i-faint)]">{items.length}</span>}>{title}</CardTitle>
      {items.length ? (
        <ul className="divide-y divide-[var(--i-line)]">
          {items.slice(0, limit).map((item, index) => (
            <ItemRow key={`${item.source}-${item.title}-${index}`} item={item} showDay={kind === "done"} />
          ))}
          {items.length > limit ? (
            <li className="px-5 py-2.5 text-[12px] text-[var(--i-faint)]">…and {items.length - limit} more</li>
          ) : null}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[12.5px] text-[var(--i-faint)]">{empty}</p>
      )}
    </Card>
  );
}

/** "Leave" / "Half day" next to a day, from attendance. */
export function DayMarkPill({ kind }: { kind: "work" | "half_day" | "leave" | undefined }) {
  if (kind === "leave") return <Pill tone="amber">Leave</Pill>;
  if (kind === "half_day") return <Pill tone="sky">Half day</Pill>;
  return null;
}
