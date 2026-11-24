import type { Metadata } from "next";
import Link from "next/link";
import { ChartBar } from "@/components/internal/icons";
import {
  formatMoney,
  formatTotals,
  sumMoney,
} from "@/lib/internal/community/schema";
import { one } from "@/lib/internal/community/stats";
import {
  loadInfluencers,
  loadPosts,
  requireInfluencers,
} from "@/lib/internal/influencers/data";
import {
  bestResult,
  byResult,
  formatCount,
  mainCurrency,
  results,
} from "@/lib/internal/influencers/rules";
import {
  formatName,
  isPlatform,
  platformLabel,
} from "@/lib/internal/influencers/schema";
import {
  Card,
  CardTitle,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/internal/ui";
import { Stat } from "@/components/internal/community/ui";
import {
  InfluencerTabs,
  PATH,
  PlatformPill,
  ResultsTable,
} from "@/components/internal/influencers/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";

export const metadata: Metadata = { title: "What works" };

const HERE = `${PATH}/results`;

export default async function InfluencerResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [, params] = await Promise.all([requireInfluencers(), searchParams]);
  const [influencers, posts] = await Promise.all([
    loadInfluencers(),
    loadPosts(),
  ]);

  const header = (
    <PageHeader
      eyebrow="Workspaces"
      title="Influencers"
      description="What the posts you paid for actually got: which platform, which format and which creator gave the most views for the money."
    />
  );
  if (!influencers.ok || !posts.ok) {
    return (
      <>
        {header}
        <Notice tone="warning">
          {!influencers.ok
            ? influencers.message
            : !posts.ok
              ? posts.message
              : ""}
        </Notice>
      </>
    );
  }

  const all = posts.rows;
  if (!all.length) {
    return (
      <>
        {header}
        <InfluencerTabs active="results" />
        <Card>
          <EmptyState icon={<ChartBar size={20} />} title="Nothing logged yet">
            When an influencer posts for you, open their page and log it: what
            it was, what you paid, and the views, likes and clicks it got. This
            page then says which platform and format work best.
          </EmptyState>
        </Card>
      </>
    );
  }

  // Money is never converted: the page shows one currency at a time.
  const paid = all.filter((post) => post.cost !== null && post.cost > 0);
  const currencies = [...new Set(paid.map((post) => post.currency))].sort();
  const asked = one(params.currency)?.toUpperCase();
  const currency =
    (asked && currencies.includes(asked) ? asked : null) ??
    mainCurrency(paid.map((post) => post.currency)) ??
    "USD";

  const byPlatform = results(all, (post) => post.platform, currency).sort(
    byResult,
  );
  const byFormat = results(all, (post) => post.format, currency).sort(byResult);
  const byPerson = results(all, (post) => post.influencer_id, currency).sort(
    byResult,
  );
  const names = new Map(
    influencers.rows.map((influencer) => [influencer.id, influencer.name]),
  );
  const platformWinner = bestResult(byPlatform);
  const formatWinner = bestResult(byFormat);
  const views = all.reduce((sum, post) => sum + (post.views ?? 0), 0);
  const missing = all.filter((post) => !post.views).length;

  const winnerNote = (row: typeof platformWinner) =>
    row
      ? row.per1k !== null
        ? `${formatMoney(row.per1k, currency)} for 1k views over ${row.posts} ${row.posts === 1 ? "post" : "posts"}`
        : `${formatCount(row.avgViews)} views a post over ${row.posts} ${row.posts === 1 ? "post" : "posts"}`
      : "Needs views on at least one post";

  return (
    <>
      {header}
      <InfluencerTabs active="results" />
      {posts.truncated ? (
        <div className="mb-5">
          <Notice tone="warning">
            There are more posts than this page loads, so the numbers are too
            low.
          </Notice>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Posts logged"
          value={all.length}
          note={
            missing
              ? `${missing} without views yet: add them to count`
              : "Every one has its views"
          }
          accent={missing > 0 && missing === all.length}
        />
        <Stat
          label="Spent"
          value={formatTotals(
            sumMoney(
              paid.map((post) => ({
                amount: post.cost,
                currency: post.currency,
              })),
            ),
            "—",
          )}
          note={`${paid.length} paid for · ${formatCount(views)} views in all`}
        />
        <Stat
          label="Best platform"
          value={platformWinner ? platformLabel(platformWinner.key) : "—"}
          note={winnerNote(platformWinner)}
        />
        <Stat
          label="Best format"
          value={formatWinner ? formatName(formatWinner.key) : "—"}
          note={winnerNote(formatWinner)}
        />
      </div>

      {currencies.length > 1 ? (
        <div className="mb-3 flex">
          <FilterDropdown
            label="Money in"
            always
            items={currencies.map((item) => ({
              key: item,
              label: item,
              href: `${HERE}?currency=${item}`,
              on: item === currency,
            }))}
          />
        </div>
      ) : null}

      <div className="space-y-5">
        <Card>
          <CardTitle>By platform</CardTitle>
          <ResultsTable
            heading="Platform"
            rows={byPlatform}
            currency={currency}
            best={platformWinner?.key}
            name={(key) =>
              isPlatform(key) ? <PlatformPill platform={key} /> : key
            }
          />
        </Card>
        <Card>
          <CardTitle>By format</CardTitle>
          <ResultsTable
            heading="Format"
            rows={byFormat}
            currency={currency}
            best={formatWinner?.key}
            name={(key) => formatName(key)}
          />
        </Card>
        <Card>
          <CardTitle>By influencer</CardTitle>
          <ResultsTable
            heading="Influencer"
            rows={byPerson}
            currency={currency}
            best={bestResult(byPerson)?.key}
            name={(key) => (
              <Link
                href={`${PATH}/${key}`}
                className="hover:text-[var(--i-accent-text)]"
              >
                {names.get(key) ?? "Someone"}
              </Link>
            )}
          />
        </Card>
      </div>
      <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-[var(--i-faint)]">
        Per 1k views counts only the posts that were paid for in {currency} and
        have their views filled in. Views a post and engagement count every
        post, free ones too. Engagement is likes, comments, reposts and saves
        for every hundred views. With only a few posts logged, treat
        &quot;best&quot; as a hint, not a verdict.
      </p>
    </>
  );
}
