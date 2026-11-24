import type { Metadata } from "next";
import { Tag } from "@/components/internal/icons";
import {
  formatDay,
  formatMoney,
  todayKey,
} from "@/lib/internal/community/schema";
import { one } from "@/lib/internal/community/stats";
import {
  loadChannels,
  loadInfluencers,
  loadRates,
  requireInfluencers,
} from "@/lib/internal/influencers/data";
import {
  byValue,
  formatCount,
  rateLines,
} from "@/lib/internal/influencers/rules";
import {
  PLATFORMS,
  formatInfo,
  formatLabel,
  formatsFor,
  isPlatform,
  type Platform,
} from "@/lib/internal/influencers/schema";
import { Card, EmptyState, Notice, PageHeader } from "@/components/internal/ui";
import {
  Muted,
  RowLink,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import {
  InfluencerTabs,
  PATH,
  Per1k,
  PlatformPill,
  filterItems,
  platformFilterItems,
} from "@/components/internal/influencers/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";

export const metadata: Metadata = { title: "Rate cards" };

const HERE = `${PATH}/rates`;

export default async function InfluencerRatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [, params] = await Promise.all([requireInfluencers(), searchParams]);
  const [influencers, channels, rates] = await Promise.all([
    loadInfluencers(),
    loadChannels(),
    loadRates(),
  ]);
  const platform = isPlatform(one(params.platform))
    ? (one(params.platform) as Platform)
    : null;
  const picked = formatInfo(one(params.format));
  const format = picked && picked.platform === platform ? picked.value : null;

  const link = (change: {
    platform?: string | null;
    format?: string | null;
  }) => {
    const next = new URLSearchParams();
    const nextPlatform =
      change.platform === undefined ? platform : change.platform;
    if (nextPlatform) next.set("platform", nextPlatform);
    // A format belongs to its platform: changing the platform drops it.
    const nextFormat =
      change.platform !== undefined
        ? null
        : change.format === undefined
          ? format
          : change.format;
    if (nextFormat) next.set("format", nextFormat);
    return `${HERE}${next.size ? `?${next}` : ""}`;
  };

  const header = (
    <PageHeader
      eyebrow="Workspaces"
      title="Influencers"
      description="Everyone's prices side by side. Pick a platform and a format to see who charges what, and who gives the most views for the money."
    />
  );
  if (!influencers.ok || !rates.ok) {
    return (
      <>
        {header}
        <Notice tone="warning">
          {!influencers.ok
            ? influencers.message
            : !rates.ok
              ? rates.message
              : ""}
        </Notice>
      </>
    );
  }

  const people = new Map(
    influencers.rows.map((influencer) => [influencer.id, influencer]),
  );
  const rows = rateLines(rates.rows, channels.ok ? channels.rows : [])
    .filter(
      (line) =>
        (!platform || line.platform === platform) &&
        (!format || line.format === format) &&
        // Someone marked "Don't use" isn't an option to compare.
        people.get(line.influencer_id)?.status !== "avoid",
    )
    .sort(byValue);
  const today = todayKey();

  return (
    <>
      {header}
      <InfluencerTabs active="rates" />
      {!channels.ok ? (
        <div className="mb-5">
          <Notice tone="warning">
            The channels couldn&apos;t be loaded, so the price for 1k views is
            missing. Reload in a minute.
          </Notice>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="Platform"
          items={platformFilterItems(PLATFORMS, platform, (value) =>
            link({ platform: value }),
          )}
        />
        {platform && formatsFor(platform).length > 1 ? (
          <FilterDropdown
            label="Format"
            items={filterItems(
              "Every format",
              formatsFor(platform),
              format,
              (value) => link({ format: value }),
            )}
          />
        ) : null}
      </div>

      {!rows.length ? (
        <Card>
          <EmptyState
            icon={<Tag size={20} />}
            title={rates.rows.length ? "No prices for that" : "No prices yet"}
          >
            {rates.rows.length
              ? "Nobody on the roster has quoted for this yet. Try another platform or format."
              : "Open an influencer and add what they charge: a quote tweet, a LinkedIn post, a sponsored section. Every price shows up here to compare."}
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card>
            <Table
              head={
                <>
                  <th>Influencer</th>
                  <th>What for</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Usual views</th>
                  <th className="text-right">Per 1k views</th>
                  <th>Quoted</th>
                  <th>Covers</th>
                </>
              }
            >
              {rows.map((line) => {
                const influencer = people.get(line.influencer_id);
                return (
                  <tr key={line.id} className={rowClass}>
                    <td className="max-w-[14rem]">
                      <RowLink
                        href={`${PATH}/${line.influencer_id}`}
                        sub={influencer?.topics}
                      >
                        {influencer?.name ?? "Someone"}
                      </RowLink>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <PlatformPill platform={line.platform} />
                        {formatLabel(line.format)}
                      </span>
                    </td>
                    <td className="text-right font-medium tabular-nums">
                      {formatMoney(line.price, line.currency)}
                    </td>
                    <td className="text-right tabular-nums">
                      {line.expectedViews === null ? (
                        <Muted>—</Muted>
                      ) : (
                        formatCount(line.expectedViews)
                      )}
                    </td>
                    <td className="text-right">
                      <Per1k value={line.per1k} currency={line.currency} />
                    </td>
                    <td className="whitespace-nowrap text-[var(--i-muted)]">
                      {line.quoted_on ? formatDay(line.quoted_on, today) : "—"}
                    </td>
                    <td className="max-w-[16rem]">
                      {line.details ? (
                        <span className="line-clamp-2">{line.details}</span>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>
          <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-[var(--i-faint)]">
            Per 1k views is the price divided by the views their posts usually
            get on that platform, so it only shows for their own posts (a post,
            a thread, a quote tweet, a video). A retweet, a comment, a like or a
            save rides on someone else&apos;s post, so there&apos;s no honest
            number for it. Cheapest views come first; prices in different
            currencies aren&apos;t converted.
          </p>
        </>
      )}
    </>
  );
}
