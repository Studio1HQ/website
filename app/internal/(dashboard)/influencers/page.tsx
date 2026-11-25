import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus } from "@/components/internal/icons";
import { saveInfluencer } from "@/app/internal/(dashboard)/influencers/actions";
import { formatMoney } from "@/lib/internal/community/schema";
import { matches, one } from "@/lib/internal/community/stats";
import {
  loadChannels,
  loadInfluencers,
  loadPosts,
  loadRates,
  ownerChoices,
  requireInfluencers,
} from "@/lib/internal/influencers/data";
import {
  bestChannel,
  bestResult,
  bestValue,
  engagementRate,
  formatCount,
  formatPercent,
  isSpiky,
  lowestRate,
  mainCurrency,
  rateLines,
  reachRate,
  results,
  sizeOf,
  totalFollowers,
  typicalViews,
  type RateLine,
} from "@/lib/internal/influencers/rules";
import {
  INFLUENCER_FIELDS,
  NICHES,
  PLATFORMS,
  SIZES,
  STATUSES,
  formatLabel,
  formatName,
  isNiche,
  isPlatform,
  isSize,
  isStatus,
  nicheLabel,
  platformLabel,
  type Channel,
  type Influencer,
  type Niche,
  type Platform,
  type Size,
} from "@/lib/internal/influencers/schema";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import {
  Muted,
  OptionPill,
  Pill,
  RowLink,
  SearchBox,
  Stat,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import {
  InfluencerTabs,
  NicheChips,
  PATH,
  Per1k,
  PlatformIcon,
  PlatformPill,
  filterItems,
  platformFilterItems,
} from "@/components/internal/influencers/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";

export const metadata: Metadata = { title: "Influencers" };

const SORTS = [
  { key: "name", label: "Name" },
  { key: "followers", label: "Followers" },
  { key: "views", label: "Typical views" },
  { key: "engagement", label: "Engagement" },
  { key: "value", label: "Best value" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

/** A price's format under its figure: the platform's logo, then "Quote tweet". */
function FormatNote({ line }: { line: RateLine }) {
  return (
    <span className="mt-0.5 flex max-w-[13rem] items-center gap-1 text-[12px] text-[var(--i-muted)]">
      <PlatformIcon platform={line.platform} size={12} />
      <span className="truncate">{formatLabel(line.format)}</span>
    </span>
  );
}

type Row = {
  influencer: Influencer;
  channels: Channel[];
  /** The channel the numbers come from: the filtered platform's, else the one seen most. */
  focus: Channel | null;
  /** Followers on the filtered platform, else added up. */
  followers: number;
  size: Size | null;
  views: number | null;
  engagement: number | null;
  lowest: RateLine | null;
  value: RateLine | null;
  posts: number;
};

export default async function InfluencersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([
    requireInfluencers(),
    searchParams,
  ]);
  const [influencers, channels, rates, posts, owners] = await Promise.all([
    loadInfluencers(),
    loadChannels(),
    loadRates(),
    loadPosts(),
    ownerChoices(),
  ]);
  const query = one(params.q)?.slice(0, 100) ?? "";
  const platform = isPlatform(one(params.platform))
    ? (one(params.platform) as Platform)
    : null;
  const status = isStatus(one(params.status))
    ? (one(params.status) as Influencer["status"])
    : null;
  const niche = isNiche(one(params.niche)) ? (one(params.niche) as Niche) : null;
  const size = isSize(one(params.size)) ? (one(params.size) as Size) : null;
  const sort: Sort =
    SORTS.find((item) => item.key === one(params.sort))?.key ?? "name";

  const link = (change: {
    platform?: string | null;
    status?: string | null;
    niche?: string | null;
    size?: string | null;
    sort?: Sort;
  }) => {
    const next = new URLSearchParams();
    const pick = (key: keyof typeof change, current: string | null) => {
      const value = change[key] === undefined ? current : change[key];
      if (value) next.set(key, value);
    };
    pick("platform", platform);
    pick("niche", niche);
    pick("size", size);
    pick("status", status);
    const nextSort = change.sort ?? sort;
    if (nextSort !== "name") next.set("sort", nextSort);
    if (query) next.set("q", query);
    return `${PATH}${next.size ? `?${next}` : ""}`;
  };

  const header = (
    <PageHeader
      eyebrow="Marketing"
      title="Influencers"
      description="Every creator and newsletter you can book: their niche and audience, what a typical post gets, what they charge for each format, and how the posts you paid for did."
      actions={
        influencers.ok ? (
          <FieldDialog
            fields={INFLUENCER_FIELDS}
            noun="influencer"
            owners={owners}
            defaults={{ owner: staff.email }}
            save={saveInfluencer.bind(null, null)}
            goTo={`${PATH}/`}
            trigger={
              <button type="button" className={buttonClass("accent")}>
                <Plus size={14} /> Add influencer
              </button>
            }
          />
        ) : null
      }
    />
  );
  if (!influencers.ok) {
    return (
      <>
        {header}
        <Notice tone="warning">{influencers.message}</Notice>
      </>
    );
  }

  const allChannels = channels.ok ? channels.rows : [];
  const allPosts = posts.ok ? posts.rows : [];
  const lines = rateLines(rates.ok ? rates.rows : [], allChannels);
  const group = <T extends { influencer_id: string }>(list: readonly T[]) => {
    const map = new Map<string, T[]>();
    for (const item of list)
      map.set(item.influencer_id, [
        ...(map.get(item.influencer_id) ?? []),
        item,
      ]);
    return map;
  };
  const channelsOf = group(allChannels);
  const linesOf = group(lines);
  const postsOf = group(allPosts);

  const all: Row[] = influencers.rows.map((influencer) => {
    const own = channelsOf.get(influencer.id) ?? [];
    const card = linesOf.get(influencer.id) ?? [];
    const focus = platform
      ? (own.find((channel) => channel.platform === platform) ?? null)
      : bestChannel(own);
    const biggest = Math.max(-1, ...own.map((channel) => channel.followers ?? -1));
    return {
      influencer,
      channels: own,
      focus,
      followers: platform ? (focus?.followers ?? 0) : totalFollowers(own),
      // Size goes by one audience, not followers added up across platforms.
      size: sizeOf(platform ? focus?.followers : biggest >= 0 ? biggest : null),
      views: focus ? typicalViews(focus) : null,
      engagement: focus ? engagementRate(focus) : null,
      lowest: lowestRate(platform ? card.filter((line) => line.platform === platform) : card),
      value: bestValue(platform ? card.filter((line) => line.platform === platform) : card),
      posts: postsOf.get(influencer.id)?.length ?? 0,
    };
  });

  const order: Record<Sort, (a: Row, b: Row) => number> = {
    name: () => 0,
    followers: (a, b) => b.followers - a.followers,
    views: (a, b) => (b.views ?? -1) - (a.views ?? -1),
    engagement: (a, b) => (b.engagement ?? -1) - (a.engagement ?? -1),
    value: (a, b) =>
      (a.value?.per1k ?? Number.POSITIVE_INFINITY) -
      (b.value?.per1k ?? Number.POSITIVE_INFINITY),
  };
  const rows = all
    .filter(
      (row) =>
        (!platform ||
          row.channels.some((channel) => channel.platform === platform)) &&
        (!status || row.influencer.status === status) &&
        (!niche || row.influencer.niches.includes(niche)) &&
        (!size || row.size === size) &&
        matches(
          query,
          row.influencer.name,
          row.influencer.topics,
          row.influencer.audience,
          row.influencer.content_style,
          row.influencer.languages,
          row.influencer.location,
          row.influencer.tags,
          row.influencer.niches.map(nicheLabel),
          row.influencer.email,
          row.channels.map((channel) => channel.handle),
        ),
    )
    .sort(order[sort]);

  // Only the niches someone has, so every filter finds somebody.
  const nichesInUse = NICHES.filter((option) =>
    all.some((row) => row.influencer.niches.includes(option.value)),
  );

  // What the posts say works; the rate cards say what should.
  const currency =
    mainCurrency(
      allPosts.filter((post) => post.cost).map((post) => post.currency),
    ) ?? "USD";
  const winner = bestResult(
    results(allPosts, (post) => post.platform, currency),
  );
  const cheapest = bestValue(lines);
  const cheapestName = cheapest
    ? influencers.rows.find((item) => item.id === cheapest.influencer_id)?.name
    : null;
  const bookable = all.filter(
    (row) => row.influencer.status !== "avoid",
  ).length;

  return (
    <>
      {header}
      <InfluencerTabs active="roster" />
      {!channels.ok || !rates.ok || !posts.ok || influencers.truncated ? (
        <div className="mb-5">
          <Notice tone="warning">
            Some of the numbers couldn&apos;t be loaded, so this page may be
            missing channels, prices or posts. Reload in a minute.
          </Notice>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Influencers"
          value={all.length}
          note={
            all.length
              ? `${bookable} you can book · ${all.filter((row) => row.influencer.status === "active").length} working with now`
              : "Nobody added yet"
          }
        />
        <Stat
          label="Followers, added up"
          value={formatCount(all.reduce((sum, row) => sum + totalFollowers(row.channels), 0))}
          note="Across every platform; the same person can follow twice"
        />
        <Stat
          label="Best platform so far"
          value={winner ? platformLabel(winner.key) : "—"}
          note={
            winner
              ? winner.per1k !== null
                ? `${formatMoney(winner.per1k, currency)} for 1k views over ${winner.posts} ${winner.posts === 1 ? "post" : "posts"}`
                : `${formatCount(winner.avgViews)} views a post over ${winner.posts} ${winner.posts === 1 ? "post" : "posts"}`
              : "Log what they post for you to find out"
          }
          href={`${PATH}/results`}
        />
        <Stat
          label="Cheapest views on paper"
          value={
            cheapest?.per1k !== null && cheapest
              ? formatMoney(cheapest.per1k, cheapest.currency)
              : "—"
          }
          note={
            cheapest
              ? `For 1k views: ${cheapestName ?? "Someone"}, ${formatName(cheapest.format)}`
              : "Needs a price and the views a typical post gets"
          }
          href={`${PATH}/rates`}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action={PATH}
          value={query}
          placeholder="Search names, handles, topics, audience"
          keep={{
            platform: platform ?? undefined,
            niche: niche ?? undefined,
            size: size ?? undefined,
            status: status ?? undefined,
            sort: sort === "name" ? undefined : sort,
          }}
        />
        <FilterDropdown
          label="Platform"
          items={platformFilterItems(PLATFORMS, platform, (value) => link({ platform: value }))}
        />
        {nichesInUse.length ? (
          <FilterDropdown
            label="Niche"
            items={filterItems("Any niche", nichesInUse, niche, (value) =>
              link({ niche: value }),
            )}
          />
        ) : null}
        <FilterDropdown
          label="Size"
          items={filterItems("Any size", SIZES, size, (value) => link({ size: value }))}
        />
        <FilterDropdown
          label="Status"
          items={filterItems("Any status", STATUSES, status, (value) =>
            link({ status: value }),
          )}
        />
        {platform || niche || size || status ? (
          <Link
            href={link({ platform: null, niche: null, size: null, status: null })}
            className={buttonClass("ghost", "sm")}
          >
            Clear
          </Link>
        ) : null}
        <div className="ml-auto">
          <FilterDropdown
            label="Sort"
            always
            align="end"
            items={SORTS.map((item) => ({
              key: item.key,
              label: item.label,
              href: link({ sort: item.key }),
              on: item.key === sort,
            }))}
          />
        </div>
      </div>

      {!rows.length ? (
        <Card>
          <EmptyState
            icon={<Megaphone size={20} />}
            title={all.length ? "Nobody matches" : "No influencers yet"}
          >
            {all.length
              ? "Try another platform, niche, size or status, or clear the search."
              : "Add a creator or a newsletter, pick their niche, then add each channel with followers and what a typical post gets, and what they charge for each format. The pages work out engagement and what a thousand views costs with each of them."}
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <Table
            head={
              <>
                <th>Influencer</th>
                <th>Status</th>
                <th>Platforms</th>
                <th title="The median post: what a usual post gets. Average and best below it.">
                  Typical views
                </th>
                <th title="Engagements for every 100 views; below it, how much of their following a typical post reaches.">
                  Engagement
                </th>
                <th>Prices from</th>
                <th>Best value</th>
                <th className="text-right">Posts for us</th>
              </>
            }
          >
            {rows.map(
              ({
                influencer,
                channels: own,
                focus,
                views,
                engagement,
                lowest,
                value,
                posts: count,
              }) => {
                const newsletter = focus?.platform === "newsletter";
                const reach = focus ? reachRate(focus) : null;
                return (
                  <tr key={influencer.id} className={rowClass}>
                    <td className="max-w-[15rem]">
                      <RowLink
                        href={`${PATH}/${influencer.id}`}
                        sub={[influencer.topics || influencer.audience, influencer.location]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        {influencer.name}
                      </RowLink>
                      {influencer.niches.length ? (
                        <div className="mt-1.5">
                          <NicheChips niches={influencer.niches} max={3} />
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <OptionPill list={STATUSES} value={influencer.status} />
                    </td>
                    <td>
                      {own.length ? (
                        <span className="flex max-w-[15rem] flex-wrap gap-1">
                          {own.map((channel) => (
                            <PlatformPill
                              key={channel.id}
                              platform={channel.platform}
                              href={channel.url}
                            >
                              <span className="tabular-nums">
                                {channel.followers !== null
                                  ? formatCount(channel.followers)
                                  : platformLabel(channel.platform)}
                              </span>
                            </PlatformPill>
                          ))}
                        </span>
                      ) : (
                        <Muted>None added</Muted>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {views !== null && focus ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="font-medium tabular-nums">{formatCount(views)}</span>
                            <Muted>
                              {newsletter ? "opens" : "views"}
                              {platform ? "" : ` on ${platformLabel(focus.platform)}`}
                            </Muted>
                            {isSpiky(focus) ? (
                              <span title="The average is at least twice the typical post: a few viral posts carry it. Plan on the typical figure.">
                                <Pill tone="amber">Spiky</Pill>
                              </span>
                            ) : null}
                          </span>
                          {focus.avg_views !== null || focus.best_views !== null ? (
                            <span className="mt-0.5 block text-[12px] text-[var(--i-muted)] tabular-nums">
                              {[
                                focus.avg_views !== null && focus.median_views !== null
                                  ? `avg ${formatCount(focus.avg_views)}`
                                  : null,
                                focus.best_views !== null ? `best ${formatCount(focus.best_views)}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {engagement !== null || reach !== null ? (
                        <>
                          <span className="block tabular-nums">
                            {engagement !== null ? (
                              <>
                                <span className="font-medium">{formatPercent(engagement)}</span>{" "}
                                <Muted>{newsletter ? "click" : "engaged"}</Muted>
                              </>
                            ) : (
                              <Muted>—</Muted>
                            )}
                          </span>
                          {reach !== null ? (
                            <span className="mt-0.5 block text-[12px] text-[var(--i-muted)] tabular-nums">
                              {newsletter
                                ? `${formatPercent(reach)} open`
                                : `${formatPercent(reach)} of followers`}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {lowest ? (
                        <>
                          <span className="block font-medium tabular-nums">
                            {formatMoney(lowest.price, lowest.currency)}
                          </span>
                          <FormatNote line={lowest} />
                        </>
                      ) : (
                        <Muted>No prices</Muted>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {value ? (
                        <>
                          <span className="block">
                            <Per1k value={value.per1k} currency={value.currency} />{" "}
                            <Muted>per 1k {value.platform === "newsletter" ? "opens" : "views"}</Muted>
                          </span>
                          <FormatNote line={value} />
                        </>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      {count || <Muted>0</Muted>}
                    </td>
                  </tr>
                );
              },
            )}
          </Table>
        </Card>
      )}
    </>
  );
}
