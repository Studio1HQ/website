import Link from "next/link";
import { Card, CardTitle, Notice, PageHeader } from "@/components/internal/ui";
import { BarList, compact } from "@/components/internal/community/charts";
import { Stat } from "@/components/internal/community/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import {
  Change,
  DayChart,
  StatsTabs,
  shortDay,
} from "@/components/internal/blog/stats";
import {
  DEV_ORG_SORTS,
  DEV_ORG_URL,
  devDayValues,
  devWriters,
  sortDevOrgArticles,
  sumDevDays,
  type DevOrgArticle,
  type DevOrgSort,
} from "@/lib/internal/blog/devto-stats";
import type { DevOrgStats } from "@/lib/internal/blog/devto-stats-api";
import {
  STATS_RANGES,
  changeShare,
  fillDays,
  readTime,
  type StatsRange,
  type StatsWindow,
} from "@/lib/internal/blog/stats";
import { cn } from "@/lib/utils";

/*
 * Blog → Stats → DEV (app/internal/(dashboard)/blog/stats/dev): the Studio1
 * organization on DEV, from DEV's own analytics. A null `stats` means the
 * stats key isn't set. Server-rendered.
 */

const SETUP = "supabase/README.md under “Blog → Stats → DEV”";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function longDay(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dayFormat.format(date);
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${compact(count)} ${count === 1 ? one : many}`;

function query(range: string, sort?: string) {
  const params = new URLSearchParams();
  if (range !== "28") params.set("range", range);
  if (sort) params.set("sort", sort);
  const text = params.toString();
  return `/blog/stats/dev${text ? `?${text}` : ""}`;
}

/** Post · In range · All time · Reactions · Comments; views drop out when DEV gives none. */
function columns(hasViews: boolean) {
  return hasViews
    ? "grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] sm:grid-cols-[minmax(0,1fr)_repeat(4,5.5rem)]"
    : "grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] sm:grid-cols-[minmax(0,1fr)_repeat(2,5.5rem)]";
}

function sortValue(article: DevOrgArticle, sort: DevOrgSort) {
  if (sort === "read") return article.rangeViews ?? 0;
  if (sort === "views") return article.views ?? 0;
  if (sort === "comments") return article.comments;
  return article.reactions;
}

function PostRow({
  article,
  rank,
  max,
  sort,
  hasViews,
  known,
}: {
  article: DevOrgArticle;
  rank: number;
  max: number;
  sort: DevOrgSort;
  hasViews: boolean;
  known: ReadonlySet<string>;
}) {
  const value = sortValue(article, sort);
  return (
    <li
      className={cn(
        "grid items-center gap-x-3 border-b border-[var(--i-line)] px-5 py-2.5 last:border-b-0",
        columns(hasViews),
      )}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="w-5 shrink-0 text-right text-[11.5px] tabular-nums text-[var(--i-faint)]">
            {rank}
          </span>
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              title={article.title}
              className="line-clamp-2 min-w-0 text-[13.5px] hover:underline sm:line-clamp-1"
            >
              {article.title}
            </a>
          ) : (
            <p className="line-clamp-2 min-w-0 text-[13.5px] sm:line-clamp-1">
              {article.title}
            </p>
          )}
        </div>
        <div className="ml-[30px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--i-muted)]">
          {article.publishedAt ? (
            <span>{longDay(article.publishedAt)}</span>
          ) : null}
          {article.author ? <span>{article.author.name}</span> : null}
          {article.slug ? (
            known.has(article.slug) ? (
              <Link
                href={`/blog/stats/${article.slug}`}
                title="This post's numbers on studio1hq.com"
                className="rounded-md bg-[var(--i-accent-soft)] px-1.5 text-[11px] font-medium leading-[18px] text-[var(--i-accent-text)] hover:underline"
              >
                Studio1 post
              </Link>
            ) : (
              <span className="rounded-md bg-[var(--i-accent-soft)] px-1.5 text-[11px] font-medium leading-[18px] text-[var(--i-accent-text)]">
                Studio1 post
              </span>
            )
          ) : null}
        </div>
        {sort !== "new" ? (
          <span
            aria-hidden
            className="ml-[30px] mt-1.5 block h-1 max-w-[18rem] overflow-hidden rounded-full bg-[var(--i-track)]"
          >
            <span
              className="block h-full rounded-full bg-[var(--i-bar)]"
              style={{
                width: value > 0 ? `max(3px, ${(value / max) * 100}%)` : 0,
              }}
            />
          </span>
        ) : null}
      </div>
      {hasViews ? (
        <>
          <span className="text-right text-[13px] font-medium tabular-nums">
            {article.rangeViews === null ? "–" : compact(article.rangeViews)}
          </span>
          <span className="text-right text-[12.5px] tabular-nums text-[var(--i-muted)] max-sm:hidden">
            {article.views === null ? "–" : compact(article.views)}
          </span>
        </>
      ) : null}
      <span className="text-right text-[13px] tabular-nums">
        {compact(article.reactions)}
      </span>
      <span
        className={cn(
          "text-right text-[12.5px] tabular-nums text-[var(--i-muted)]",
          hasViews && "max-sm:hidden",
        )}
      >
        {compact(article.comments)}
      </span>
    </li>
  );
}

function PostList({
  articles,
  sort,
  hasViews,
  days,
  known,
  shown = 10,
}: {
  articles: DevOrgArticle[];
  sort: DevOrgSort;
  hasViews: boolean;
  days: number;
  known: ReadonlySet<string>;
  shown?: number;
}) {
  if (!articles.length) {
    return (
      <p className="px-5 py-8 text-center text-[13px] text-[var(--i-muted)]">
        No posts on the organization yet.
      </p>
    );
  }
  const max = Math.max(
    1,
    ...articles.map((article) => sortValue(article, sort)),
  );
  const rest = articles.slice(shown);
  const row = (article: DevOrgArticle, rank: number) => (
    <PostRow
      key={article.id}
      article={article}
      rank={rank}
      max={max}
      sort={sort}
      hasViews={hasViews}
      known={known}
    />
  );
  return (
    <>
      <div
        className={cn(
          "grid gap-x-3 border-b border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-2 text-[11.5px] text-[var(--i-muted)]",
          columns(hasViews),
        )}
      >
        <span className="pl-[30px]">Post</span>
        {hasViews ? (
          <>
            <span
              className="text-right"
              title={`Views in the last ${days} days`}
            >
              {days} days
            </span>
            <span className="text-right max-sm:hidden">All time</span>
          </>
        ) : null}
        <span className="text-right">Reactions</span>
        <span className={cn("text-right", hasViews && "max-sm:hidden")}>
          Comments
        </span>
      </div>
      <ol>
        {articles
          .slice(0, shown)
          .map((article, index) => row(article, index + 1))}
      </ol>
      {rest.length ? (
        <details className="group border-t border-[var(--i-line)]">
          <summary className="cursor-pointer select-none px-5 py-2.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)] group-open:border-b group-open:border-[var(--i-line)]">
            <span className="group-open:hidden">
              Show all {articles.length} posts
            </span>
            <span className="hidden group-open:inline">
              Show the top {shown}
            </span>
          </summary>
          <ol>
            {rest.map((article, index) => row(article, shown + index + 1))}
          </ol>
        </details>
      ) : null}
    </>
  );
}

export function DevStatsView({
  range,
  window,
  stats,
  sort,
  site,
}: {
  range: StatsRange;
  window: StatsWindow;
  stats: DevOrgStats | null;
  sort: DevOrgSort;
  site: readonly { slug: string }[];
}) {
  const data = stats?.ok ? stats : null;
  const against = `previous ${range.days} days`;
  const seeAbove = "Couldn't load these; the note at the top says why.";
  const waiting = stats ? seeAbove : "Shows once DEV is connected.";

  const now = data
    ? sumDevDays(data.dashboard.days, window.start, window.end)
    : null;
  const before = data
    ? sumDevDays(data.previous, window.previousStart, window.previousEnd)
    : null;
  const change = (key: "views" | "reactions" | "comments") => {
    const share = now && before ? changeShare(now[key], before[key]) : null;
    return share === null ? (
      range.label
    ) : (
      <Change share={share} against={against} />
    );
  };
  const totals = data?.dashboard.totals ?? null;
  const followers = data
    ? (data.dashboard.engagement?.followers ?? data.dashboard.totals.follows)
    : null;

  const hasViews = Boolean(data && data.viewsNote === null);
  const articles = data ? sortDevOrgArticles(data.articles, sort) : [];
  const known = new Set(site.map((post) => post.slug));
  const writers = data ? devWriters(data.articles) : [];
  const referrers = data?.dashboard.referrers ?? [];
  const referred = referrers.reduce((sum, row) => sum + row.views, 0);
  const engagement = data?.dashboard.engagement ?? null;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/blog" className="hover:text-[var(--i-ink)]">
            Blog
          </Link>
        }
        title="Stats"
        description="How the Studio1 organization on DEV is read: views, reactions, comments and followers from DEV's own analytics."
        actions={
          <FilterDropdown
            label="Range"
            always
            align="end"
            items={STATS_RANGES.map((item) => ({
              key: item.key,
              label: item.label,
              href: query(item.key),
              on: item.key === range.key,
            }))}
          />
        }
      />

      <StatsTabs active="dev" range={range.key} />

      <div className="mb-4 space-y-2 empty:hidden">
        {!stats ? (
          <Notice tone="info">
            Add DEV_STATS_API_KEY to see the organization&apos;s numbers here.
            It only reads; publishing to DEV uses its own key. Setup is in{" "}
            {SETUP}.
          </Notice>
        ) : !stats.ok ? (
          <Notice tone="warning">
            Couldn&apos;t load DEV: {stats.message}
          </Notice>
        ) : data?.viewsNote ? (
          <Notice tone="info">{data.viewsNote}</Notice>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Views"
          value={now ? compact(now.views) : "–"}
          note={now ? change("views") : "DEV"}
        />
        <Stat
          label="Reactions"
          value={now ? compact(now.reactions) : "–"}
          note={now ? change("reactions") : "DEV"}
        />
        <Stat
          label="Comments"
          value={now ? compact(now.comments) : "–"}
          note={now ? change("comments") : "DEV"}
        />
        <Stat
          label="Followers"
          value={followers === null ? "–" : compact(followers)}
          note={
            now
              ? now.follows
                ? `${compact(now.follows)} new in ${range.days} days`
                : `None new in ${range.days} days`
              : "DEV"
          }
        />
      </div>

      <p className="mb-5 px-1 text-[12.5px] text-[var(--i-muted)]">
        All time:{" "}
        <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
          {totals ? compact(totals.views) : "–"}
        </span>{" "}
        views,{" "}
        <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
          {totals ? compact(totals.reactions) : "–"}
        </span>{" "}
        reactions,{" "}
        <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
          {totals ? compact(totals.comments) : "–"}
        </span>{" "}
        comments
        {data ? ` on ${plural(data.articles.length, "post")}` : ""}
        {totals && totals.readSeconds
          ? ` · average read ${readTime(totals.readSeconds)}`
          : ""}
        {" · "}
        <a
          href={DEV_ORG_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          dev.to/studio1hq
        </a>
      </p>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle
            action={
              now && now.readSeconds ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  Average read {readTime(now.readSeconds)}
                </span>
              ) : null
            }
          >
            Views a day
          </CardTitle>
          {data ? (
            <DayChart
              points={fillDays(
                window,
                devDayValues(data.dashboard.days, "views"),
              )}
              unit="Views"
            />
          ) : (
            <p className="px-5 py-12 text-center text-[13px] text-[var(--i-muted)]">
              {waiting}
            </p>
          )}
        </Card>
        <Card>
          <CardTitle
            action={
              now ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  {plural(now.comments, "comment")}
                </span>
              ) : null
            }
          >
            Reactions a day
          </CardTitle>
          {data ? (
            <DayChart
              points={fillDays(
                window,
                devDayValues(data.dashboard.days, "reactions"),
              )}
              unit="Reactions"
            />
          ) : (
            <p className="px-5 py-12 text-center text-[13px] text-[var(--i-muted)]">
              {waiting}
            </p>
          )}
        </Card>
      </div>

      <Card className="mb-5">
        <CardTitle
          action={
            data ? (
              <FilterDropdown
                label="Sort"
                always
                align="end"
                items={DEV_ORG_SORTS.filter(
                  (item) => hasViews || !item.needsViews,
                ).map((item) => ({
                  key: item.key,
                  label: item.label,
                  href: query(range.key, item.key),
                  on: item.key === sort,
                }))}
              />
            ) : null
          }
        >
          Posts
        </CardTitle>
        {data ? (
          <PostList
            articles={articles}
            sort={sort}
            hasViews={hasViews}
            days={range.days}
            known={known}
          />
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-[var(--i-muted)]">
            {waiting}
          </p>
        )}
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle>Where readers come from</CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={
                data ? "No visits from other sites in this range." : waiting
              }
              rows={referrers.slice(0, 8).map((row) => ({
                key: row.domain,
                label: <span title={row.domain}>{row.domain}</span>,
                value: row.views,
                figure: compact(row.views),
                note: referred
                  ? `${Math.round((row.views / referred) * 100)}%`
                  : undefined,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardTitle
            action={
              hasViews ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  Views in {range.days} days
                </span>
              ) : data ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  Reactions, all time
                </span>
              ) : null
            }
          >
            Writers
          </CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={data ? "No posts yet." : waiting}
              rows={writers.slice(0, 8).map((writer) => {
                const value = hasViews
                  ? (writer.rangeViews ?? 0)
                  : writer.reactions;
                return {
                  key: writer.username,
                  label: (
                    <a
                      href={`https://dev.to/${writer.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {writer.name}
                    </a>
                  ),
                  value,
                  figure: compact(value),
                  note: plural(writer.posts, "post"),
                };
              })}
            />
          </div>
        </Card>
        <Card>
          <CardTitle
            action={
              engagement && engagement.followers ? (
                <span
                  className="text-[12px] text-[var(--i-muted)]"
                  title={`${compact(engagement.engaged)} of ${compact(engagement.followers)} followers reacted or commented in ${range.days} days`}
                >
                  {Math.round(engagement.percent)}% of followers engaged
                </span>
              ) : null
            }
          >
            Most engaged readers
          </CardTitle>
          <div className="px-5 py-4">
            <BarList
              empty={
                data ? "Nobody reacted or commented in this range." : waiting
              }
              rows={(data?.dashboard.contributors ?? [])
                .slice(0, 8)
                .map((person) => ({
                  key: person.username,
                  label: (
                    <a
                      href={`https://dev.to/${person.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {person.name}
                    </a>
                  ),
                  // Ranked as DEV ranks them: a comment counts as six reactions.
                  value: person.reactions + person.comments * 6,
                  figure: plural(person.reactions, "reaction"),
                  note: person.comments
                    ? plural(person.comments, "comment")
                    : undefined,
                }))}
            />
          </div>
        </Card>
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--i-faint)]">
        {shortDay(window.start)} to {shortDay(window.end)}. Everything here
        comes from DEV&apos;s analytics for the Studio1 organization, read with
        a key that never publishes; posts written under a personal account
        aren&apos;t counted. DEV counts readers who aren&apos;t signed in too;
        read time is for signed-in readers. Numbers refresh every hour.
      </p>
    </>
  );
}
