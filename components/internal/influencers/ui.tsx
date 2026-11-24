import type { ReactNode } from "react";
import {
  EnvelopeSimple,
  Globe,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  YoutubeLogo,
} from "@/components/internal/icons";
import { formatMoney } from "@/lib/internal/community/schema";
import {
  nicheLabel,
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
import { safeUrl } from "@/components/internal/ui";
import type { FilterOption } from "@/components/internal/influencers/filter-dropdown";
import { cn } from "@/lib/utils";

/** The pieces the Influencers pages share. Server-safe: nothing here needs the browser. */

export const PATH = "/influencers";

export function InfluencerTabs({
  active,
}: {
  active: "roster" | "newsletters" | "rates" | "results";
}) {
  return (
    <LinkTabs
      active={active}
      items={[
        { key: "roster", label: "Roster", href: PATH },
        { key: "newsletters", label: "Newsletters", href: `${PATH}/newsletters` },
        { key: "rates", label: "Rate cards", href: `${PATH}/rates` },
        { key: "results", label: "What works", href: `${PATH}/results` },
      ]}
    />
  );
}

/** Each platform's mark in its brand colour, so a row of them reads at a glance. */
const ICONS: Record<Platform, { icon: typeof XLogo; className: string }> = {
  x: { icon: XLogo, className: "text-[var(--i-ink)]" },
  linkedin: { icon: LinkedinLogo, className: "text-[#0A66C2] dark:text-[#4c9ee8]" },
  youtube: { icon: YoutubeLogo, className: "text-[#FF0000] dark:text-[#ff4d4d]" },
  instagram: { icon: InstagramLogo, className: "text-[#E1306C] dark:text-[#f0628f]" },
  newsletter: { icon: EnvelopeSimple, className: "text-amber-600 dark:text-amber-400" },
  other: { icon: Globe, className: "text-[var(--i-muted)]" },
};

export function PlatformIcon({
  platform,
  size = 14,
  className,
}: {
  platform: Platform;
  size?: number;
  className?: string;
}) {
  const { icon: Icon, className: colour } = ICONS[platform] ?? ICONS.other;
  return (
    <Icon
      size={size}
      weight="fill"
      aria-hidden
      className={cn("shrink-0", colour, className)}
    />
  );
}

/**
 * A platform's logo and name (or what's passed in, like a follower count).
 * With `href`, it opens their profile in a new tab.
 */
export function PlatformPill({
  platform,
  children,
  href,
}: {
  platform: Platform;
  children?: ReactNode;
  href?: string | null;
}) {
  const className =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--i-panel)] px-2 py-0.5 text-[12px] font-medium text-[var(--i-ink)] ring-1 ring-inset ring-[var(--i-line)]";
  const body = (
    <>
      <PlatformIcon platform={platform} size={13} />
      {children ?? platformLabel(platform)}
    </>
  );
  const url = href ? safeUrl(href) : null;
  if (!url) return <span className={className}>{body}</span>;
  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={`Open on ${platformLabel(platform)}`}
      className={cn(className, "hover:ring-[var(--i-line-strong)]")}
    >
      {body}
    </a>
  );
}

/** A creator's niches, as quiet chips. */
export function NicheChips({ niches, max }: { niches: readonly string[]; max?: number }) {
  if (!niches.length) return null;
  const shown = max ? niches.slice(0, max) : niches;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((niche) => (
        <span
          key={niche}
          className="inline-flex items-center whitespace-nowrap rounded-md bg-[var(--i-sunken)] px-1.5 py-0.5 text-[11.5px] text-[var(--i-ink-2)]"
        >
          {nicheLabel(niche)}
        </span>
      ))}
      {max && niches.length > max ? (
        <span className="px-0.5 text-[11.5px] text-[var(--i-faint)]">+{niches.length - max}</span>
      ) : null}
    </span>
  );
}

/**
 * A filter's choices for FilterDropdown, "any" first: `anyLabel` is that
 * first choice's name ("Any niche").
 */
export function filterItems<T extends string>(
  anyLabel: string,
  options: readonly { value: T; label: string; note?: string }[],
  current: T | null,
  href: (value: T | null) => string,
): FilterOption[] {
  return [
    { key: "any", label: anyLabel, href: href(null), on: current === null },
    ...options.map((option) => ({
      key: option.value,
      label: option.label,
      note: option.note,
      href: href(option.value),
      on: option.value === current,
    })),
  ];
}

/** The platform filter's items, each with its logo. */
export function platformFilterItems(
  platforms: readonly { value: Platform; label: string }[],
  current: Platform | null,
  href: (platform: Platform | null) => string,
): FilterOption[] {
  return [
    { key: "all", label: "Every platform", href: href(null), on: current === null },
    ...platforms.map((option) => ({
      key: option.value,
      label: option.label,
      href: href(option.value),
      on: option.value === current,
      icon: <PlatformIcon platform={option.value} size={14} />,
    })),
  ];
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
