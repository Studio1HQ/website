import type { Metadata } from "next";
import { EnvelopeSimple, Plus } from "@/components/internal/icons";
import { saveNewsletter } from "@/app/internal/(dashboard)/influencers/actions";
import { formatMoney, todayKey } from "@/lib/internal/community/schema";
import { matches, one } from "@/lib/internal/community/stats";
import { siteHost } from "@/lib/internal/clients/logo-pick";
import {
  loadChannels,
  loadInfluencers,
  loadRates,
  ownerChoices,
  requireInfluencers,
} from "@/lib/internal/influencers/data";
import {
  bestValue,
  formatCount,
  formatPercent,
  lowestRate,
  opensPerIssue,
  rateLines,
  sizeOf,
  type RateLine,
} from "@/lib/internal/influencers/rules";
import {
  NEWSLETTER_FIELDS,
  NICHES,
  SIZES,
  STATUSES,
  formatLabel,
  isNiche,
  nicheLabel,
  type Channel,
  type Influencer,
  type Niche,
} from "@/lib/internal/influencers/schema";
import { Card, EmptyState, Notice, PageHeader, buttonClass } from "@/components/internal/ui";
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
  InfluencerTabs,
  NicheChips,
  PATH,
  Per1k,
  filterItems,
} from "@/components/internal/influencers/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";
import { SiteLogo } from "@/components/internal/site-logo";

export const metadata: Metadata = { title: "Newsletters" };

const SORTS = [
  { key: "subscribers", label: "Subscribers" },
  { key: "opens", label: "Opens an issue" },
  { key: "open_rate", label: "Open rate" },
  { key: "value", label: "Cost per 1k opens" },
  { key: "name", label: "Name" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

type Row = {
  influencer: Influencer;
  channel: Channel;
  opens: number | null;
  lowest: RateLine | null;
  value: RateLine | null;
};

/**
 * Every newsletter on the roster in one table: subscribers, open and click
 * rates, what an issue reaches, what a slot costs and what 1k opens cost.
 * A newsletter is a roster entry with a newsletter channel; "Add
 * newsletter" makes both.
 */
export default async function NewslettersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireInfluencers(), searchParams]);
  const [influencers, channels, rates, owners] = await Promise.all([
    loadInfluencers(),
    loadChannels(),
    loadRates(),
    ownerChoices(),
  ]);
  const query = one(params.q)?.slice(0, 100) ?? "";
  const niche = isNiche(one(params.niche)) ? (one(params.niche) as Niche) : null;
  const sort: Sort = SORTS.find((item) => item.key === one(params.sort))?.key ?? "subscribers";
  const link = (change: { niche?: string | null; sort?: Sort }) => {
    const next = new URLSearchParams();
    const nextNiche = change.niche === undefined ? niche : change.niche;
    if (nextNiche) next.set("niche", nextNiche);
    const nextSort = change.sort ?? sort;
    if (nextSort !== "subscribers") next.set("sort", nextSort);
    if (query) next.set("q", query);
    return `${PATH}/newsletters${next.size ? `?${next}` : ""}`;
  };

  const header = (
    <PageHeader
      eyebrow="Marketing"
      title="Influencers"
      description="Every creator and newsletter you can book: their niche and audience, what a typical post gets, what they charge for each format, and how the posts you paid for did."
      actions={
        influencers.ok ? (
          <FieldDialog
            fields={NEWSLETTER_FIELDS}
            noun="newsletter"
            owners={owners}
            defaults={{ owner: staff.email, checked_on: todayKey() }}
            save={saveNewsletter}
            goTo={`${PATH}/`}
            trigger={
              <button type="button" className={buttonClass("accent")}>
                <Plus size={14} /> Add newsletter
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

  const byId = new Map(influencers.rows.map((influencer) => [influencer.id, influencer]));
  const newsletterChannels = (channels.ok ? channels.rows : []).filter(
    (channel) => channel.platform === "newsletter" && byId.has(channel.influencer_id),
  );
  const lines = rateLines(
    (rates.ok ? rates.rows : []).filter((rate) => rate.platform === "newsletter"),
    newsletterChannels,
  );
  const all: Row[] = newsletterChannels.map((channel) => {
    const card = lines.filter((line) => line.influencer_id === channel.influencer_id);
    return {
      influencer: byId.get(channel.influencer_id)!,
      channel,
      opens: opensPerIssue(channel),
      lowest: lowestRate(card),
      value: bestValue(card),
    };
  });
  const nameOf = (row: Row) => row.channel.handle || row.influencer.name;

  const order: Record<Sort, (a: Row, b: Row) => number> = {
    subscribers: (a, b) => (b.channel.followers ?? -1) - (a.channel.followers ?? -1),
    opens: (a, b) => (b.opens ?? -1) - (a.opens ?? -1),
    open_rate: (a, b) => (b.channel.open_rate ?? -1) - (a.channel.open_rate ?? -1),
    value: (a, b) =>
      (a.value?.per1k ?? Number.POSITIVE_INFINITY) - (b.value?.per1k ?? Number.POSITIVE_INFINITY),
    name: () => 0,
  };
  const rows = all
    .filter(
      (row) =>
        (!niche || row.influencer.niches.includes(niche)) &&
        matches(
          query,
          nameOf(row),
          row.influencer.name,
          row.influencer.topics,
          row.influencer.audience,
          row.influencer.niches.map(nicheLabel),
          row.channel.url,
        ),
    )
    .sort((a, b) => order[sort](a, b) || nameOf(a).localeCompare(nameOf(b)));
  const nichesInUse = NICHES.filter((option) => all.some((row) => row.influencer.niches.includes(option.value)));

  const subscribers = all.reduce((sum, row) => sum + (row.channel.followers ?? 0), 0);
  const rated = all.filter((row) => row.channel.open_rate !== null);
  const meanOpen = rated.length
    ? rated.reduce((sum, row) => sum + (row.channel.open_rate ?? 0), 0) / rated.length
    : null;
  const cheapest = bestValue(lines);
  const cheapestRow = cheapest ? all.find((row) => row.influencer.id === cheapest.influencer_id) : null;

  return (
    <>
      {header}
      <InfluencerTabs active="newsletters" />
      {!channels.ok || !rates.ok ? (
        <div className="mb-5">
          <Notice tone="warning">
            Some of the numbers couldn&apos;t be loaded, so subscribers or prices may be missing. Reload in a minute.
          </Notice>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Newsletters" value={all.length} note={
            all.length
              ? `${nichesInUse.length} ${nichesInUse.length === 1 ? "niche" : "niches"} covered`
              : "None added yet"
          } />
        <Stat label="Subscribers, added up" value={formatCount(subscribers)} note="Some readers get more than one" />
        <Stat
          label="Average open rate"
          value={formatPercent(meanOpen)}
          note={rated.length ? `Over ${rated.length} with a known rate` : "Add open rates from their media kits"}
        />
        <Stat
          label="Cheapest 1k opens"
          value={cheapest && cheapest.per1k !== null ? formatMoney(cheapest.per1k, cheapest.currency) : "—"}
          note={
            cheapest && cheapestRow
              ? `${nameOf(cheapestRow)}, ${formatLabel(cheapest.format)}`
              : "Needs a price, subscribers and the open rate"
          }
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action={`${PATH}/newsletters`}
          value={query}
          placeholder="Search newsletters, topics, readers"
          keep={{ niche: niche ?? undefined, sort: sort === "subscribers" ? undefined : sort }}
        />
        {nichesInUse.length ? (
          <FilterDropdown
            label="Niche"
            items={filterItems("Any niche", nichesInUse, niche, (value) =>
              link({ niche: value }),
            )}
          />
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
            icon={<EnvelopeSimple size={20} />}
            title={all.length ? "No newsletter matches" : "No newsletters yet"}
          >
            {all.length
              ? "Try another niche or clear the search."
              : "Add a newsletter with its site, subscribers and open rate, then its prices on its page (primary slot, sponsored feature, classified, dedicated send). This page works out what an issue reaches and what 1k opens cost."}
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <Table
            head={
              <>
                <th>Newsletter</th>
                <th>Niche</th>
                <th className="text-right">Subscribers</th>
                <th className="text-right" title="Subscribers who open an issue; below it, who click.">
                  Open rate
                </th>
                <th className="text-right" title="Subscribers × open rate">
                  Opens an issue
                </th>
                <th className="text-right">Issues a month</th>
                <th>Prices from</th>
                <th>Per 1k opens</th>
                <th>Status</th>
              </>
            }
          >
            {rows.map((row) => {
              const { influencer, channel, opens, lowest, value } = row;
              const host = siteHost(channel.url);
              const size = SIZES.find((item) => item.value === sizeOf(channel.followers));
              return (
                <tr key={channel.id} className={rowClass}>
                  <td className="max-w-[15rem]">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <SiteLogo
                        path={`${PATH}/channels/${channel.id}/logo`}
                        name={nameOf(row)}
                        website={channel.url}
                        size={26}
                      />
                      <div className="min-w-0 flex-1">
                        <RowLink
                          href={`${PATH}/${influencer.id}`}
                          sub={[host, influencer.audience].filter(Boolean).join(" · ")}
                        >
                          {nameOf(row)}
                        </RowLink>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[11rem]">
                    {influencer.niches.length ? <NicheChips niches={influencer.niches} max={2} /> : <Muted>—</Muted>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <span className="block font-medium tabular-nums">{formatCount(channel.followers)}</span>
                    {size ? <span className="mt-0.5 block text-[12px] text-[var(--i-muted)]">{size.label}</span> : null}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    <span className="block">{formatPercent(channel.open_rate)}</span>
                    {channel.click_rate !== null ? (
                      <span className="mt-0.5 block text-[12px] text-[var(--i-muted)]">
                        {formatPercent(channel.click_rate)} click
                      </span>
                    ) : null}
                  </td>
                  <td className="text-right tabular-nums">{opens === null ? <Muted>—</Muted> : formatCount(opens)}</td>
                  <td className="text-right tabular-nums">
                    {channel.posts_per_month === null ? <Muted>—</Muted> : channel.posts_per_month}
                  </td>
                  <td className="whitespace-nowrap">
                    {lowest ? (
                      <>
                        <span className="block font-medium tabular-nums">
                          {formatMoney(lowest.price, lowest.currency)}
                        </span>
                        <span className="mt-0.5 block max-w-[12rem] truncate text-[12px] text-[var(--i-muted)]">
                          {formatLabel(lowest.format)}
                        </span>
                      </>
                    ) : (
                      <Muted>No prices</Muted>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {value ? (
                      <>
                        <span className="block font-medium">
                          <Per1k value={value.per1k} currency={value.currency} />
                        </span>
                        {value.id !== lowest?.id ? (
                          <span className="mt-0.5 block text-[12px] text-[var(--i-muted)]">
                            {formatLabel(value.format)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td>
                    <OptionPill list={STATUSES} value={influencer.status} />
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
