import Link from "next/link";
import { Card, CardTitle, Notice, PageHeader } from "@/components/internal/ui";
import {
  BarList,
  ColumnChart,
  compact,
} from "@/components/internal/community/charts";
import { Stat } from "@/components/internal/community/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import {
  Change,
  DayChart,
  StatsTabs,
  TopPosts,
  shortDay,
} from "@/components/internal/blog/stats";
import {
  STATS_RANGES,
  changeShare,
  fillDays,
  rankPosts,
  readTime,
  readerSources,
  type StatsRange,
  type StatsWindow,
} from "@/lib/internal/blog/stats";
import {
  ANALYTICS_SINCE,
  type AnalyticsReport,
} from "@/lib/internal/google-analytics";
import { searchTotals, type SearchReport } from "@/lib/internal/search-console";
import { monthCounts } from "@/lib/internal/trend";

/*
 * Blog → Stats (app/internal/(dashboard)/blog/stats): what the page shows,
 * given what it loaded. A null report means that source isn't connected.
 */

const SETUP = "supabase/README.md under “Blog numbers”";

/** "Nov 2026" for a YYYY-MM month. */
function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function BlogStatsView({
  range,
  window,
  reads,
  search,
  site,
}: {
  range: StatsRange;
  window: StatsWindow;
  reads: AnalyticsReport | null;
  search: SearchReport | null;
  site: readonly { slug: string; title: string; date: string }[];
}) {
  const against = `previous ${range.days} days`;
  const ga = reads?.ok ? reads : null;
  const gsc = search?.ok ? search : null;
  // Connected but failing: the notice at the top says why.
  const gaDown = Boolean(reads && !reads.ok);
  const gscDown = Boolean(search && !search.ok);
  const seeAbove = "Couldn't load these; the note at the top says why.";

  const posts = rankPosts(site, ga?.posts ?? null, gsc?.posts ?? null);
  const byViews = Boolean(ga && ga.totals.views > 0);

  // Search totals for this stretch and the one before.
  const clicksNow = gsc
    ? searchTotals(gsc.daily, window.start, window.end)
    : null;
  const clicksBefore = gsc
    ? searchTotals(gsc.daily, window.previousStart, window.previousEnd)
    : null;
  // Google Analytics only has days from ANALYTICS_SINCE: no comparison across that line.
  const gaComplete = window.previousStart >= ANALYTICS_SINCE;
  const viewsShare =
    ga && gaComplete ? changeShare(ga.totals.views, ga.previous.views) : null;
  const clicksShare =
    clicksNow && clicksBefore
      ? changeShare(clicksNow.clicks, clicksBefore.clicks)
      : null;

  // Posts published: the range's new ones, and each of the last 12 months.
  const newPosts = site.filter(
    (post) => post.date >= window.start && post.date <= window.end,
  ).length;
  const thisMonth = window.end.slice(0, 7);
  const perMonth = monthCounts(
    site.map((post) => post.date),
    thisMonth,
    12,
  );
  const monthKeys = Array.from({ length: 12 }, (_, index) => {
    const [year, month] = thisMonth.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1 - (11 - index), 1))
      .toISOString()
      .slice(0, 7);
  });

  const sources = ga ? readerSources(ga.sources) : [];
  const sourceTotal = sources.reduce((sum, row) => sum + row.views, 0);
  const sinceNote = `Counting since ${shortDay(ANALYTICS_SINCE)}`;
  // The views line starts on Google Analytics' first day and needs two days to draw.
  const gaDays = window.days.filter((day) => day >= ANALYTICS_SINCE);
  const firstLine = new Date(
    Date.parse(`${ANALYTICS_SINCE}T00:00:00Z`) + 2 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/blog" className="hover:text-[var(--i-ink)]">
            Blog
          </Link>
        }
        title="Stats"
        description="How every post is read: views from Google Analytics, clicks and searches from Google Search Console. Open a post for its own numbers."
        actions={
          <FilterDropdown
            label="Range"
            always
            align="end"
            items={STATS_RANGES.map((item) => ({
              key: item.key,
              label: item.label,
              href:
                item.key === "28"
                  ? "/blog/stats"
                  : `/blog/stats?range=${item.key}`,
              on: item.key === range.key,
            }))}
          />
        }
      />

      <StatsTabs active="site" range={range.key} />

      <div className="mb-4 space-y-2 empty:hidden">
        {!reads && !search ? (
          <Notice tone="info">
            Connect Google Analytics and Search Console to see views and clicks
            here. Setup is in {SETUP}.
          </Notice>
        ) : !reads ? (
          <Notice tone="info">
            Connect Google Analytics to see views, readers and read time. Setup
            is in {SETUP}.
          </Notice>
        ) : !search ? (
          <Notice tone="info">
            Connect Google Search Console to see clicks and searches. Setup is
            in {SETUP}.
          </Notice>
        ) : null}
        {reads && !reads.ok ? (
          <Notice tone="warning">
            Couldn&apos;t load Google Analytics: {reads.message}
          </Notice>
        ) : null}
        {search && !search.ok ? (
          <Notice tone="warning">
            Couldn&apos;t load Search Console: {search.message}
          </Notice>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Views"
          value={ga ? compact(ga.totals.views) : "–"}
          note={
            !ga ? (
              "Google Analytics"
            ) : viewsShare !== null ? (
              <Change share={viewsShare} against={against} />
            ) : gaComplete ? (
              range.label
            ) : (
              sinceNote
            )
          }
        />
        <Stat
          label="Readers"
          value={ga ? compact(ga.totals.readers) : "–"}
          note={
            ga && ga.totals.readers
              ? `Average read ${readTime(ga.totals.engaged / ga.totals.readers)}`
              : "Google Analytics"
          }
        />
        <Stat
          label="Google clicks"
          value={clicksNow ? compact(clicksNow.clicks) : "–"}
          note={
            !clicksNow ? (
              "Search Console"
            ) : clicksShare !== null ? (
              <Change share={clicksShare} against={against} />
            ) : (
              `${compact(clicksNow.impressions)} impressions`
            )
          }
        />
        <Stat
          label="Live posts"
          value={site.length}
          note={
            newPosts
              ? `${newPosts} new in ${range.days} days`
              : `None new in ${range.days} days`
          }
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle
            action={
              ga ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  {gaComplete ? `${compact(ga.totals.views)} views` : sinceNote}
                </span>
              ) : null
            }
          >
            Views a day
          </CardTitle>
          {ga && gaDays.length >= 2 ? (
            <DayChart
              points={fillDays({ days: gaDays }, ga.daily)}
              unit="Views"
            />
          ) : ga ? (
            <p className="px-5 py-12 text-center text-[13px] text-[var(--i-muted)]">
              The line starts on {shortDay(firstLine)}, once Google Analytics
              has two full days.
            </p>
          ) : (
            <p className="px-5 py-12 text-center text-[13px] text-[var(--i-muted)]">
              {gaDown
                ? seeAbove
                : "Views show here once Google Analytics is connected."}
            </p>
          )}
        </Card>
        <Card>
          <CardTitle
            action={
              clicksNow ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  {compact(clicksNow.impressions)} impressions
                  {clicksNow.impressions
                    ? ` · position ${clicksNow.position.toFixed(1)}`
                    : ""}
                </span>
              ) : null
            }
          >
            Google clicks a day
          </CardTitle>
          {gsc ? (
            <DayChart
              points={fillDays(
                window,
                Object.fromEntries(
                  Object.entries(gsc.daily).map(([day, item]) => [
                    day,
                    item.clicks,
                  ]),
                ),
              )}
              unit="Clicks"
            />
          ) : (
            <p className="px-5 py-12 text-center text-[13px] text-[var(--i-muted)]">
              {gscDown
                ? seeAbove
                : "Clicks show here once Search Console is connected."}
            </p>
          )}
        </Card>
      </div>

      <Card className="mb-5">
        <CardTitle
          action={
            posts.length ? (
              <span className="text-[12px] text-[var(--i-muted)]">
                {byViews ? "Most viewed first" : "Most Google clicks first"}
              </span>
            ) : null
          }
        >
          Top posts
        </CardTitle>
        <TopPosts
          rows={posts}
          byViews={byViews}
          empty={
            ga || gsc
              ? "No numbers for any post in this range yet."
              : gaDown || gscDown
                ? seeAbove
                : "Shows once Google Analytics or Search Console is connected."
          }
        />
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle>Top Google searches</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={
                gsc
                  ? "No searches led to a post in this range."
                  : gscDown
                    ? seeAbove
                    : "Shows once Search Console is connected."
              }
              rows={(gsc?.queries ?? []).map((row) => ({
                key: row.query,
                label: <span title={row.query}>{row.query}</span>,
                value: row.clicks,
                figure: compact(row.clicks),
                note: `${compact(row.impressions)} impr.`,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Where readers come from</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={
                ga
                  ? "No visits in this range yet."
                  : gaDown
                    ? seeAbove
                    : "Shows once Google Analytics is connected."
              }
              rows={sources.map((row) => ({
                key: row.source,
                label: row.source,
                value: row.views,
                figure: compact(row.views),
                note: sourceTotal
                  ? `${Math.round((row.views / sourceTotal) * 100)}%`
                  : undefined,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardTitle
            action={
              <span className="text-[12px] text-[var(--i-muted)]">
                {perMonth.reduce((sum, value) => sum + value, 0)} in 12 months
              </span>
            }
          >
            Posts published
          </CardTitle>
          <div className="px-5 py-4">
            <ColumnChart
              series={["Posts"]}
              height={150}
              groups={monthKeys.map((month, index) => ({
                key: month,
                label: monthLabel(month),
                values: [perMonth[index]],
              }))}
            />
          </div>
        </Card>
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--i-faint)]">
        {shortDay(window.start)} to {shortDay(window.end)}. Views, readers and
        read time come from Google Analytics, counted since{" "}
        {shortDay(ANALYTICS_SINCE)} 2026; visitors in the EU, UK and Switzerland
        count only after they accept cookies. Clicks and searches come from
        Google Search Console; the last two days are still settling. Numbers
        refresh every hour.
      </p>
    </>
  );
}
