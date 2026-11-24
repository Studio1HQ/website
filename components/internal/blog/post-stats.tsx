import Link from "next/link";
import { ArrowSquareOut, PencilSimple } from "@/components/internal/icons";
import {
  Card,
  CardTitle,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { BarList, compact } from "@/components/internal/community/charts";
import { Stat } from "@/components/internal/community/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import { Change, DayChart, shortDay } from "@/components/internal/blog/stats";
import {
  STATS_RANGES,
  changeShare,
  fillDays,
  readTime,
  readerSources,
  type StatsRange,
  type StatsWindow,
} from "@/lib/internal/blog/stats";
import type { DevArticle } from "@/lib/internal/blog/devto";

/** What the page shows of a post's DEV copy; views are null when DEV gives none. */
export type DevCopy = Pick<
  DevArticle,
  "url" | "published" | "reactions" | "comments"
> & { views: number | null };
import {
  ANALYTICS_SINCE,
  type AnalyticsPost,
} from "@/lib/internal/google-analytics";
import { searchTotals, type SearchPost } from "@/lib/internal/search-console";
import { baseUrl } from "@/lib/site";

/*
 * Blog → Stats → one post (app/internal/(dashboard)/blog/stats/[slug]):
 * how it's read, how Google finds it, and where its readers come from. A
 * null report means that source isn't connected.
 */

const SETUP = "supabase/README.md under “Blog numbers”";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-[13px] text-[var(--i-muted)]">
      {children}
    </p>
  );
}

/** "Jul 2025" for a YYYY-MM-DD day. */
function monthYear(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PostStatsView({
  slug,
  title,
  date,
  onSite,
  unlisted,
  editorId,
  editSitePost,
  range,
  window,
  reads,
  search,
  dev,
}: {
  slug: string;
  title: string;
  date: string | null;
  onSite: boolean;
  unlisted: boolean;
  /** The post's draft in the editor, when it was published from here. */
  editorId: string | null;
  /** Opens a post that's only on the site in the editor. */
  editSitePost: (() => Promise<void>) | null;
  range: StatsRange;
  window: StatsWindow;
  reads: AnalyticsPost | null;
  search: SearchPost | null;
  /** Its copy on DEV: the Studio1 organization's, else the publishing account's. */
  dev: DevCopy | null;
}) {
  const ga = reads?.ok ? reads : null;
  const gsc = search?.ok ? search : null;
  const seeAbove = "Couldn't load these; the note at the top says why.";
  const against = `previous ${range.days} days`;
  const here = `/blog/stats/${slug}`;

  const gaComplete = window.previousStart >= ANALYTICS_SINCE;
  const viewsShare =
    ga && gaComplete ? changeShare(ga.totals.views, ga.previous.views) : null;
  const clicksNow = gsc
    ? searchTotals(gsc.daily, window.start, window.end)
    : null;
  const clicksBefore = gsc
    ? searchTotals(gsc.daily, window.previousStart, window.previousEnd)
    : null;
  const clicksShare =
    clicksNow && clicksBefore
      ? changeShare(clicksNow.clicks, clicksBefore.clicks)
      : null;
  const positionBefore = clicksBefore?.impressions
    ? clicksBefore.position
    : null;
  const ctr = clicksNow?.impressions
    ? clicksNow.clicks / clicksNow.impressions
    : null;

  const gaDays = window.days.filter((day) => day >= ANALYTICS_SINCE);
  const sources = ga ? readerSources(ga.sources) : [];
  const sourceTotal = sources.reduce((sum, row) => sum + row.views, 0);
  const countries = ga
    ? ga.countries.filter((row) => row.views > 0).slice(0, 6)
    : [];
  const countryTotal = countries.reduce((sum, row) => sum + row.views, 0);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link href="/blog" className="hover:text-[var(--i-ink)]">
              Blog
            </Link>
            <span aria-hidden>/</span>
            <Link href="/blog/stats" className="hover:text-[var(--i-ink)]">
              Stats
            </Link>
          </span>
        }
        title={title}
        description={
          <>
            {date ? `Published ${shortDay(date)} ${date.slice(0, 4)} · ` : ""}
            /blog/{slug}
            {unlisted ? " · hidden from /blog" : ""}
            {!onSite ? " · no longer on the site" : ""}
          </>
        }
        actions={
          <>
            <FilterDropdown
              label="Range"
              always
              align="end"
              items={STATS_RANGES.map((item) => ({
                key: item.key,
                label: item.label,
                href: item.key === "28" ? here : `${here}?range=${item.key}`,
                on: item.key === range.key,
              }))}
            />
            {onSite ? (
              <a
                href={`${baseUrl}/blog/${slug}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("ghost")}
              >
                <ArrowSquareOut size={15} /> View
              </a>
            ) : null}
            {editorId ? (
              <Link
                href={`/blog/${editorId}`}
                className={buttonClass("secondary")}
              >
                <PencilSimple size={15} /> Edit
              </Link>
            ) : editSitePost ? (
              <form action={editSitePost}>
                <button type="submit" className={buttonClass("secondary")}>
                  <PencilSimple size={15} /> Edit
                </button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="mb-4 space-y-2 empty:hidden">
        {!reads && !search ? (
          <Notice tone="info">
            Connect Google Analytics and Search Console to see this post&apos;s
            numbers. Setup is in {SETUP}.
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

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Views"
          value={ga ? compact(ga.totals.views) : "–"}
          note={
            !ga ? (
              "Google Analytics"
            ) : viewsShare !== null ? (
              <Change share={viewsShare} against={against} />
            ) : (
              `Counting since ${shortDay(ANALYTICS_SINCE)}`
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
          label="Average position"
          value={clicksNow?.impressions ? clicksNow.position.toFixed(1) : "–"}
          note={
            !clicksNow
              ? "Search Console"
              : clicksNow.impressions
                ? `${compact(clicksNow.impressions)} impressions · ${((ctr ?? 0) * 100).toFixed(1)}% clicked${
                    positionBefore !== null
                      ? ` · was ${positionBefore.toFixed(1)}`
                      : ""
                  }`
                : "Not shown on Google in this range"
          }
        />
      </div>
      <p className="mb-5 px-1 text-[12.5px] text-[var(--i-muted)]">
        All time:{" "}
        <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
          {ga ? compact(ga.lifetime.views) : "–"}
        </span>{" "}
        views since {shortDay(ANALYTICS_SINCE)}
        {" · "}
        <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
          {gsc ? compact(gsc.lifetime.clicks) : "–"}
        </span>{" "}
        Google clicks{gsc ? ` since ${monthYear(gsc.since)}` : ""}
        {gsc ? ` from ${compact(gsc.lifetime.impressions)} impressions` : ""}
        {dev ? (
          <>
            {" · "}
            {dev.url ? (
              <a
                href={dev.url}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                On DEV
              </a>
            ) : (
              "On DEV"
            )}
            {dev.published ? (
              <>
                :{" "}
                {dev.views !== null ? (
                  <>
                    <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
                      {compact(dev.views)}
                    </span>{" "}
                    views,{" "}
                  </>
                ) : null}
                {compact(dev.reactions)} reactions, {compact(dev.comments)}{" "}
                comments
              </>
            ) : (
              " as a draft"
            )}
          </>
        ) : null}
      </p>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle>Views a day</CardTitle>
          {ga && gaDays.length >= 2 ? (
            <DayChart
              points={fillDays({ days: gaDays }, ga.daily)}
              unit="Views"
            />
          ) : ga ? (
            <Empty>
              The line draws once Google Analytics has two days in this range.
            </Empty>
          ) : (
            <Empty>
              {reads
                ? seeAbove
                : "Views show here once Google Analytics is connected."}
            </Empty>
          )}
        </Card>
        <Card>
          <CardTitle>Google clicks a day</CardTitle>
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
            <Empty>
              {search
                ? seeAbove
                : "Clicks show here once Search Console is connected."}
            </Empty>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle>Searches that find it</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={
                gsc
                  ? "No Google searches showed it in this range."
                  : search
                    ? seeAbove
                    : "Shows once Search Console is connected."
              }
              rows={(gsc?.queries ?? []).map((row) => ({
                key: row.query,
                label: (
                  <span
                    title={`${row.query} · position ${row.position.toFixed(1)}`}
                  >
                    {row.query}
                  </span>
                ),
                value: row.clicks || row.impressions / 100,
                figure: compact(row.clicks),
                note: `${compact(row.impressions)} impr. · #${Math.round(row.position)}`,
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
                  : reads
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
          <CardTitle>Countries</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={
                ga
                  ? "No visits in this range yet."
                  : reads
                    ? seeAbove
                    : "Shows once Google Analytics is connected."
              }
              rows={countries.map((row) => ({
                key: row.source,
                label: row.source === "(not set)" ? "Unknown" : row.source,
                value: row.views,
                figure: compact(row.views),
                note: countryTotal
                  ? `${Math.round((row.views / countryTotal) * 100)}%`
                  : undefined,
              }))}
            />
          </div>
        </Card>
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--i-faint)]">
        {shortDay(window.start)} to {shortDay(window.end)}. Views, readers, read
        time, sources and countries come from Google Analytics, counted since{" "}
        {shortDay(ANALYTICS_SINCE)} 2026; visitors in the EU, UK and Switzerland
        count only after they accept cookies. Clicks, positions and searches
        come from Google Search Console; the last two days are still settling.
        Numbers refresh every hour.
      </p>
    </>
  );
}
