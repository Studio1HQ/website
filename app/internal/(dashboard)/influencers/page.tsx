import type { Metadata } from "next";
import { Megaphone, Plus } from "@phosphor-icons/react/dist/ssr";
import { saveInfluencer } from "@/app/internal/(dashboard)/influencers/actions";
import { formatMoney, labelOf } from "@/lib/internal/community/schema";
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
  formatCount,
  lowestRate,
  mainCurrency,
  rateLines,
  results,
  totalFollowers,
  type RateLine,
} from "@/lib/internal/influencers/rules";
import {
  INFLUENCER_FIELDS,
  PLATFORMS,
  STATUSES,
  formatName,
  isPlatform,
  isStatus,
  platformLabel,
  type Channel,
  type Influencer,
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
  RowLink,
  SearchBox,
  Stat,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import {
  FilterLinks,
  InfluencerTabs,
  PATH,
  Per1k,
  PlatformPill,
} from "@/components/internal/influencers/ui";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";

export const metadata: Metadata = { title: "Influencers" };

const SORTS = [
  { key: "name", label: "Name" },
  { key: "followers", label: "Followers" },
  { key: "views", label: "Views a post" },
  { key: "value", label: "Best value" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

type Row = {
  influencer: Influencer;
  channels: Channel[];
  followers: number;
  top: Channel | null;
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
    ? (one(params.platform) as Channel["platform"])
    : null;
  const status = isStatus(one(params.status))
    ? (one(params.status) as Influencer["status"])
    : null;
  const sort: Sort =
    SORTS.find((item) => item.key === one(params.sort))?.key ?? "name";

  const link = (change: {
    platform?: string | null;
    status?: string | null;
    sort?: Sort;
  }) => {
    const next = new URLSearchParams();
    const nextPlatform =
      change.platform === undefined ? platform : change.platform;
    if (nextPlatform) next.set("platform", nextPlatform);
    const nextStatus = change.status === undefined ? status : change.status;
    if (nextStatus) next.set("status", nextStatus);
    const nextSort = change.sort ?? sort;
    if (nextSort !== "name") next.set("sort", nextSort);
    if (query) next.set("q", query);
    return `${PATH}${next.size ? `?${next}` : ""}`;
  };

  const header = (
    <PageHeader
      eyebrow="Workspaces"
      title="Influencers"
      description="Every creator you can book: where they post, what they charge for each format, the views they usually get, and how the posts you paid for did."
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
    return {
      influencer,
      channels: own,
      followers: totalFollowers(own),
      top: bestChannel(own),
      lowest: lowestRate(card),
      value: bestValue(card),
      posts: postsOf.get(influencer.id)?.length ?? 0,
    };
  });

  const order: Record<Sort, (a: Row, b: Row) => number> = {
    name: () => 0,
    followers: (a, b) => b.followers - a.followers,
    views: (a, b) => (b.top?.avg_views ?? -1) - (a.top?.avg_views ?? -1),
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
        matches(
          query,
          row.influencer.name,
          row.influencer.topics,
          row.influencer.location,
          row.influencer.tags,
          row.influencer.email,
          row.channels.map((channel) => channel.handle),
        ),
    )
    .sort(order[sort]);

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
          value={formatCount(all.reduce((sum, row) => sum + row.followers, 0))}
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
              : "Needs a price and the usual views a post"
          }
          href={`${PATH}/rates`}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action={PATH}
          value={query}
          placeholder="Search names, handles, topics, tags"
          keep={{
            platform: platform ?? undefined,
            status: status ?? undefined,
            sort: sort === "name" ? undefined : sort,
          }}
        />
        <FilterLinks
          label="Platform"
          items={[{ value: null, label: "Every platform" }, ...PLATFORMS].map(
            (option) => ({
              key: option.value ?? "all",
              label: option.label,
              href: link({ platform: option.value }),
              on: option.value === platform,
            }),
          )}
        />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FilterLinks
          label="Status"
          items={[{ value: null, label: "Any status" }, ...STATUSES].map(
            (option) => ({
              key: option.value ?? "any",
              label: option.label,
              href: link({ status: option.value }),
              on: option.value === status,
            }),
          )}
        />
        <div className="flex flex-wrap items-center gap-1 text-[12.5px] text-[var(--i-muted)]">
          <span className="px-1">Sort by</span>
          <FilterLinks
            label="Sort by"
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
              ? "Try another platform or status, or clear the search."
              : "Add a creator, then their channels with followers and usual views, and what they charge for each format. The pages work out what a thousand views costs with each of them."}
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
                <th>Views a post</th>
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
                top,
                lowest,
                value,
                posts: count,
              }) => (
                <tr key={influencer.id} className={rowClass}>
                  <td className="max-w-[16rem]">
                    <RowLink
                      href={`${PATH}/${influencer.id}`}
                      sub={[influencer.topics, influencer.location]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {influencer.name}
                    </RowLink>
                  </td>
                  <td>
                    <OptionPill list={STATUSES} value={influencer.status} />
                  </td>
                  <td>
                    {own.length ? (
                      <span className="flex flex-wrap gap-1">
                        {own.map((channel) => (
                          <PlatformPill
                            key={channel.id}
                            platform={channel.platform}
                          >
                            {labelOf(PLATFORMS, channel.platform)}
                            {channel.followers !== null ? (
                              <span className="font-normal tabular-nums opacity-80">
                                {formatCount(channel.followers)}
                              </span>
                            ) : null}
                          </PlatformPill>
                        ))}
                      </span>
                    ) : (
                      <Muted>None added</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {top?.avg_views ? (
                      <>
                        <span className="tabular-nums">
                          {formatCount(top.avg_views)}
                        </span>{" "}
                        <Muted>on {platformLabel(top.platform)}</Muted>
                      </>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {lowest ? (
                      <>
                        <span className="tabular-nums">
                          {formatMoney(lowest.price, lowest.currency)}
                        </span>{" "}
                        <Muted>{formatName(lowest.format)}</Muted>
                      </>
                    ) : (
                      <Muted>No prices</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {value ? (
                      <>
                        <Per1k value={value.per1k} currency={value.currency} />{" "}
                        <Muted>per 1k · {formatName(value.format)}</Muted>
                      </>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="text-right tabular-nums">
                    {count || <Muted>0</Muted>}
                  </td>
                </tr>
              ),
            )}
          </Table>
        </Card>
      )}
    </>
  );
}
