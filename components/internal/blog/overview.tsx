import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "@/components/internal/icons";
import {
  Card,
  CardTitle,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { ColumnChart, compact } from "@/components/internal/community/charts";
import { Stat } from "@/components/internal/community/ui";
import {
  Change,
  DayChart,
  TopPosts,
  shortDay,
} from "@/components/internal/blog/stats";
import type { BlogListItem } from "@/lib/internal/blog/data";
import {
  changeShare,
  fillDays,
  lastMonths,
  movers,
  pick,
  rankPosts,
  runningTotal,
  sumByMonth,
  titleFromSlug,
  type MonthWindow,
  type StatsWindow,
} from "@/lib/internal/blog/stats";
import {
  ANALYTICS_SINCE,
  type AnalyticsOverview,
} from "@/lib/internal/google-analytics";
import {
  searchTotals,
  type SearchOverview,
} from "@/lib/internal/search-console";
import { cn } from "@/lib/utils";

/*
 * Blog → Overview (app/internal/(dashboard)/blog/page.tsx), for blog
 * reviewers: this month against last, all-time views, which posts lead and
 * which are rising or slipping, and what's waiting in the pipeline. A null
 * report means that source isn't connected.
 */

const SETUP = "supabase/README.md under “Blog numbers”";

/** "Nov" or "Nov 26" (every January) for a YYYY-MM month. */
function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    month: "short",
    ...(month.endsWith("-01") ? { year: "2-digit" } : {}),
    timeZone: "UTC",
  });
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-[13px] text-[var(--i-muted)]">
      {children}
    </p>
  );
}

/** A short list of posts with one figure each, linking to their stats. */
function PostList({
  rows,
  empty,
}: {
  rows: {
    slug: string;
    title: string;
    figure: React.ReactNode;
    note?: React.ReactNode;
  }[];
  empty: string;
}) {
  if (!rows.length)
    return (
      <p className="px-5 py-4 text-[13px] text-[var(--i-muted)]">{empty}</p>
    );
  return (
    <ol>
      {rows.map((row) => (
        <li
          key={row.slug}
          className="border-b border-[var(--i-line)] last:border-b-0"
        >
          <Link
            href={`/blog/stats/${row.slug}`}
            className="flex items-baseline justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--i-hover)]"
          >
            <span
              className="line-clamp-1 min-w-0 text-[13px]"
              title={row.title}
            >
              {row.title}
            </span>
            <span className="shrink-0 text-right text-[13px] tabular-nums">
              {row.figure}
              {row.note ? (
                <span className="ml-1.5 text-[12px] text-[var(--i-muted)]">
                  {row.note}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** One stage of the pipeline: a count and where to see it. */
function Stage({
  label,
  value,
  href,
  note,
  hot,
}: {
  label: string;
  value: number;
  href: string;
  note?: string;
  hot?: boolean;
}) {
  return (
    <li className="border-b border-[var(--i-line)] last:border-b-0">
      <Link
        href={href}
        className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--i-hover)]"
      >
        <span className="min-w-0">
          <span className="block text-[13px]">{label}</span>
          {note ? (
            <span className="block truncate text-[12px] text-[var(--i-muted)]">
              {note}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "rounded-full px-2 text-[12px] font-medium leading-[20px] tabular-nums",
            hot && value
              ? "bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
              : "bg-[var(--i-sunken)] text-[var(--i-muted)]",
          )}
        >
          {value}
        </span>
      </Link>
    </li>
  );
}

export function BlogOverview({
  me,
  month,
  stretch,
  reads,
  search,
  site,
  posts,
  newPost,
}: {
  me: string;
  /** The server action that starts a draft and opens it. */
  newPost: () => Promise<void>;
  month: MonthWindow;
  stretch: StatsWindow;
  reads: AnalyticsOverview | null;
  search: SearchOverview | null;
  site: readonly { slug: string; title: string; date: string }[];
  posts: BlogListItem[] | null;
}) {
  const ga = reads?.ok ? reads : null;
  const gsc = search?.ok ? search : null;
  const seeAbove = "Couldn't load these; the note at the top says why.";
  const titles = new Map(site.map((post) => [post.slug, post.title]));
  const titleOf = (slug: string) => titles.get(slug) ?? titleFromSlug(slug);

  // This month so far against the same days of last month.
  const lastLabel = `${shortDay(month.lastStart)}–${shortDay(month.lastEnd)}`;
  const gaHasLastMonth = month.lastStart >= ANALYTICS_SINCE;
  const viewsShare =
    ga && gaHasLastMonth
      ? changeShare(ga.month.views, ga.lastMonth.views)
      : null;
  const clicksMonth = gsc
    ? searchTotals(gsc.daily, month.start, month.end)
    : null;
  const clicksLast = gsc
    ? searchTotals(gsc.daily, month.lastStart, month.lastEnd)
    : null;
  const clicksShare =
    clicksMonth && clicksLast
      ? changeShare(clicksMonth.clicks, clicksLast.clicks)
      : null;
  const newThisMonth = site.filter(
    (post) => post.date >= month.start && post.date <= month.end,
  ).length;
  const since = `since ${shortDay(ANALYTICS_SINCE)}`;

  // All views since Google Analytics started, added up day by day.
  const gaDays = Array.from(
    {
      length: Math.max(
        0,
        Math.round(
          (Date.parse(month.end) - Date.parse(ANALYTICS_SINCE)) / 86_400_000,
        ) + 1,
      ),
    },
    (_, index) =>
      new Date(Date.parse(`${ANALYTICS_SINCE}T00:00:00Z`) + index * 86_400_000)
        .toISOString()
        .slice(0, 10),
  );
  const cumulative = ga
    ? runningTotal(fillDays({ days: gaDays }, ga.daily))
    : [];

  // Google clicks in each of the last 12 months.
  const months = lastMonths(month.month, 12);
  const clicksByMonth = gsc
    ? sumByMonth(
        Object.fromEntries(
          Object.entries(gsc.daily).map(([day, item]) => [day, item.clicks]),
        ),
        months,
      )
    : [];

  // This month's leaders: by views once there are any, else by Google clicks.
  const top = rankPosts(site, ga?.monthPosts ?? null, gsc?.monthPosts ?? null);
  const byViews = Boolean(ga && ga.month.views > 0);

  // Rising and slipping: views once Google Analytics covers both stretches, Google clicks until then.
  const moversByViews = Boolean(ga) && stretch.previousStart >= ANALYTICS_SINCE;
  const moved = moversByViews
    ? movers(
        pick(ga!.recent, (item) => item.views),
        pick(ga!.before, (item) => item.views),
        { min: 20 },
      )
    : gsc
      ? movers(
          pick(gsc.recent, (item) => item.clicks),
          pick(gsc.before, (item) => item.clicks),
          { min: 5 },
        )
      : null;
  const unit = moversByViews ? "views" : "clicks";

  // The best posts of all time: Google clicks over the 16 months Search Console keeps.
  const best = gsc
    ? Object.entries(gsc.lifetime)
        .filter(([, item]) => item.clicks > 0)
        .sort(([a, x], [b, y]) => y.clicks - x.clicks || a.localeCompare(b))
        .slice(0, 5)
    : [];

  // The pipeline from the editor.
  const list = posts ?? [];
  const waitingOnMe = list.filter(
    (post) => post.status === "in_review" && post.reviewers.includes(me),
  ).length;
  const inReview = list.filter((post) => post.status === "in_review").length;
  const approved = list.filter((post) => post.status === "approved").length;
  const changes = list.filter(
    (post) => post.status === "changes_requested",
  ).length;
  const drafts = list.filter((post) => post.status === "draft").length;

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog"
        description="How the blog is doing this month, which posts lead, and what's waiting to go live."
        actions={
          <>
            <Link href="/blog/posts" className={buttonClass("secondary")}>
              All posts
            </Link>
            <form action={newPost}>
              <button type="submit" className={buttonClass("accent")}>
                <Plus size={15} /> New post
              </button>
            </form>
          </>
        }
      />

      <div className="mb-4 space-y-2 empty:hidden">
        {!reads && !search ? (
          <Notice tone="info">
            Connect Google Analytics and Search Console to see views and clicks
            here. Setup is in {SETUP}.
          </Notice>
        ) : !reads ? (
          <Notice tone="info">
            Connect Google Analytics to see views. Setup is in {SETUP}.
          </Notice>
        ) : !search ? (
          <Notice tone="info">
            Connect Google Search Console to see clicks. Setup is in {SETUP}.
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
          label="Views this month"
          value={ga ? compact(ga.month.views) : "–"}
          note={
            !ga ? (
              "Google Analytics"
            ) : viewsShare !== null ? (
              <Change share={viewsShare} against={lastLabel} />
            ) : (
              `Counting ${since}`
            )
          }
          href="/blog/stats"
        />
        <Stat
          label="Total views"
          value={ga ? compact(ga.lifetime.views) : "–"}
          note={
            ga
              ? `${compact(ga.lifetime.readers)} readers ${since}`
              : "Google Analytics"
          }
          href="/blog/stats?range=90"
        />
        <Stat
          label="Google clicks this month"
          value={clicksMonth ? compact(clicksMonth.clicks) : "–"}
          note={
            !clicksMonth ? (
              "Search Console"
            ) : clicksShare !== null ? (
              <Change share={clicksShare} against={lastLabel} />
            ) : (
              `${compact(clicksMonth.impressions)} impressions`
            )
          }
          href="/blog/stats"
        />
        <Stat
          label="Live posts"
          value={site.length}
          note={
            newThisMonth
              ? `${newThisMonth} published this month`
              : "None published this month"
          }
          href="/blog/posts?tab=live"
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle
            action={
              ga ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  {compact(ga.lifetime.views)} views {since}
                </span>
              ) : null
            }
          >
            Cumulative views
          </CardTitle>
          {ga && cumulative.length >= 2 ? (
            <DayChart points={cumulative} unit="Views so far" />
          ) : ga ? (
            <Empty>
              The line draws once Google Analytics has two days, from{" "}
              {shortDay(ANALYTICS_SINCE)}.
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
          <CardTitle
            action={
              gsc ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  {compact(
                    clicksByMonth.reduce((sum, value) => sum + value, 0),
                  )}{" "}
                  in 12 months
                </span>
              ) : null
            }
          >
            Google clicks a month
          </CardTitle>
          {gsc ? (
            <div className="px-5 pb-4 pt-5">
              <ColumnChart
                series={["Clicks"]}
                height={132}
                format={compact}
                groups={months.map((key, index) => ({
                  key,
                  label: monthLabel(key),
                  values: [clicksByMonth[index]],
                }))}
              />
            </div>
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
        <Card className="lg:col-span-2">
          <CardTitle
            action={
              <Link
                href="/blog/stats"
                className="text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
              >
                Every post&apos;s numbers
              </Link>
            }
          >
            Top posts this month
          </CardTitle>
          <TopPosts
            rows={top.slice(0, 5)}
            shown={5}
            byViews={byViews}
            empty={
              ga || gsc
                ? "No numbers for any post this month yet."
                : reads || search
                  ? seeAbove
                  : "Shows once Google is connected."
            }
          />
        </Card>
        <Card>
          <CardTitle
            action={
              <Link
                href="/blog/posts"
                className="text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
              >
                Open posts
              </Link>
            }
          >
            Pipeline
          </CardTitle>
          {posts ? (
            <ul>
              <Stage
                label="Waiting for your review"
                value={waitingOnMe}
                href="/blog/posts?tab=review"
                note={
                  inReview > waitingOnMe
                    ? `${inReview} in review in all`
                    : undefined
                }
                hot
              />
              <Stage
                label="Approved, not published"
                value={approved}
                href="/blog/posts?tab=review"
                hot
              />
              <Stage
                label="Changes asked for"
                value={changes}
                href="/blog/posts?tab=drafts"
              />
              <Stage
                label="Drafts"
                value={drafts}
                href="/blog/posts?tab=drafts"
              />
            </ul>
          ) : (
            <Empty>Couldn&apos;t load the posts.</Empty>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle
            action={
              <span
                className="text-right text-[12px] text-[var(--i-muted)]"
                title={`${shortDay(stretch.start)}–${shortDay(stretch.end)} against ${shortDay(stretch.previousStart)}–${shortDay(stretch.previousEnd)}`}
              >
                {unit === "views" ? "Views" : "Google clicks"}, last 28 days vs
                the 28 before
              </span>
            }
          >
            Rising and slipping
          </CardTitle>
          {moved ? (
            <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-[var(--i-line)]">
              <div>
                <p className="flex items-center gap-1.5 border-b border-[var(--i-line)] px-5 py-2 text-[12px] text-[var(--i-muted)]">
                  <ArrowUp
                    size={12}
                    weight="bold"
                    className="text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />{" "}
                  Rising
                </p>
                <PostList
                  empty="No post gained much."
                  rows={moved.up.map((row) => ({
                    slug: row.slug,
                    title: titleOf(row.slug),
                    figure: `+${compact(row.delta)}`,
                    note: `${compact(row.before)} → ${compact(row.now)}`,
                  }))}
                />
              </div>
              <div className="max-sm:border-t max-sm:border-[var(--i-line)]">
                <p className="flex items-center gap-1.5 border-b border-[var(--i-line)] px-5 py-2 text-[12px] text-[var(--i-muted)]">
                  <ArrowDown
                    size={12}
                    weight="bold"
                    className="text-rose-600 dark:text-rose-400"
                    aria-hidden
                  />{" "}
                  Slipping
                </p>
                <PostList
                  empty="No post lost much."
                  rows={moved.down.map((row) => ({
                    slug: row.slug,
                    title: titleOf(row.slug),
                    figure: `−${compact(Math.abs(row.delta))}`,
                    note: `${compact(row.before)} → ${compact(row.now)}`,
                  }))}
                />
              </div>
            </div>
          ) : (
            <Empty>
              {reads || search ? seeAbove : "Shows once Google is connected."}
            </Empty>
          )}
        </Card>
        <Card>
          <CardTitle
            action={
              gsc ? (
                <span className="text-[12px] text-[var(--i-muted)]">
                  since {shortDay(gsc.since)} {gsc.since.slice(0, 4)}
                </span>
              ) : null
            }
          >
            Most Google clicks ever
          </CardTitle>
          {gsc ? (
            <PostList
              empty="No clicks yet."
              rows={best.map(([slug, item]) => ({
                slug,
                title: titleOf(slug),
                figure: compact(item.clicks),
                note: `${compact(item.impressions)} impr.`,
              }))}
            />
          ) : (
            <Empty>
              {search ? seeAbove : "Shows once Search Console is connected."}
            </Empty>
          )}
        </Card>
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--i-faint)]">
        This month is {shortDay(month.start)} to {shortDay(month.end)}, against{" "}
        {lastLabel}. Views come from Google Analytics, counted since{" "}
        {shortDay(ANALYTICS_SINCE)} 2026; visitors in the EU, UK and Switzerland
        count only after they accept cookies. Clicks come from Google Search
        Console, which keeps 16 months; the last two days are still settling.
        Numbers refresh every hour.
      </p>
    </>
  );
}
