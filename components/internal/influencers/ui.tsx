import type { ReactNode } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/internal/community/schema";
import {
  PLATFORMS,
  platformLabel,
  type Platform,
} from "@/lib/internal/influencers/schema";
import type { Result } from "@/lib/internal/influencers/rules";
import { formatCount } from "@/lib/internal/influencers/rules";
import {
  LinkTabs,
  Muted,
  Pill,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import { cn } from "@/lib/utils";

/** The pieces the Influencers pages share. Server-safe: nothing here needs the browser. */

export const PATH = "/internal/influencers";

export function InfluencerTabs({
  active,
}: {
  active: "roster" | "rates" | "results";
}) {
  return (
    <LinkTabs
      active={active}
      items={[
        { key: "roster", label: "Roster", href: PATH },
        { key: "rates", label: "Rate cards", href: `${PATH}/rates` },
        { key: "results", label: "What works", href: `${PATH}/results` },
      ]}
    />
  );
}

export function PlatformPill({
  platform,
  children,
}: {
  platform: Platform;
  children?: ReactNode;
}) {
  const option = PLATFORMS.find((item) => item.value === platform);
  return (
    <Pill tone={option?.tone ?? "stone"}>
      {children ?? platformLabel(platform)}
    </Pill>
  );
}

/** A row of filter links; the one that's on is raised. */
export function FilterLinks({
  label,
  items,
  className,
}: {
  label: string;
  items: { key: string; label: string; href: string; on: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-1", className)}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.on ? "true" : undefined}
          className={cn(
            "inline-flex h-8 items-center rounded-lg px-2.5 text-[12.5px]",
            item.on
              ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
              : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** "$12.50", for a thousand views. */
export function Per1k({
  value,
  currency,
}: {
  value: number | null;
  currency: string;
}) {
  if (value === null) return <Muted>—</Muted>;
  return <span className="tabular-nums">{formatMoney(value, currency)}</span>;
}

/** Posts added up by platform, format or creator, cheapest views first. */
export function ResultsTable({
  heading,
  rows,
  currency,
  best,
  name,
}: {
  heading: string;
  rows: readonly Result[];
  currency: string;
  /** The key of the row that did best, to mark it. */
  best?: string | null;
  name: (key: string) => ReactNode;
}) {
  return (
    <Table
      head={
        <>
          <th>{heading}</th>
          <th className="text-right">Posts</th>
          <th className="text-right">Spent</th>
          <th className="text-right">Views</th>
          <th className="text-right">Views a post</th>
          <th className="text-right">Per 1k views</th>
          <th className="text-right">Engagement</th>
          <th className="text-right">Clicks</th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.key} className={rowClass}>
          <td>
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate font-medium">
                {name(row.key)}
              </span>
              {best === row.key ? <Pill tone="emerald">Best</Pill> : null}
            </span>
          </td>
          <td className="text-right tabular-nums">{row.posts}</td>
          <td className="text-right tabular-nums">
            {row.paid ? formatMoney(row.spent, currency) : <Muted>—</Muted>}
          </td>
          <td className="text-right tabular-nums">
            {row.avgViews === null ? <Muted>—</Muted> : formatCount(row.views)}
          </td>
          <td className="text-right tabular-nums">
            {formatCount(row.avgViews)}
          </td>
          <td className="text-right">
            <Per1k value={row.per1k} currency={currency} />
          </td>
          <td className="text-right tabular-nums">
            {row.engagementRate === null ? (
              <Muted>—</Muted>
            ) : (
              `${row.engagementRate}%`
            )}
          </td>
          <td className="text-right tabular-nums">
            {row.clicks ? formatCount(row.clicks) : <Muted>—</Muted>}
          </td>
        </tr>
      ))}
    </Table>
  );
}
