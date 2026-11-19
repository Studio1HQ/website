import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut, ChartLine, NotePencil, PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";
import { BlogStatusBadge } from "@/components/internal/blog/status";
import { Card, EmptyState, Notice, PageHeader, buttonClass, formatDate, relativeDate } from "@/components/internal/ui";
import { TeamAvatar } from "@/components/internal/team-photos";
import { listPosts, sitePosts, type BlogListItem, type SitePost } from "@/lib/internal/blog/data";
import { isGithubConfigured } from "@/lib/internal/blog/github";
import { isSearchConsoleConfigured, searchStats, type SearchNumbers } from "@/lib/internal/search-console";
import { analyticsReport, isAnalyticsConfigured } from "@/lib/internal/google-analytics";
import { statsWindow, type ReadNumbers } from "@/lib/internal/blog/stats";
import { nameFromEmail } from "@/lib/internal/blog/shared";
import { requireBlog } from "@/lib/internal/session";
import { baseUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { editSitePost, newPost } from "../actions";

export const metadata: Metadata = { title: "Blog posts" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { key: "review", label: "In review", empty: "Nothing is waiting for review." },
  { key: "drafts", label: "Drafts", empty: "No drafts. Start one with New post." },
  { key: "live", label: "Live", empty: "Nothing published from here yet." },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const count = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** One live post's numbers over 28 days: views (Google Analytics), then Google clicks, impressions and position. */
function NumbersCell({ views, numbers }: { views: ReadNumbers | null | undefined; numbers: SearchNumbers | null | undefined }) {
  return (
    <span className="grid w-[252px] grid-cols-4 gap-2 text-right text-[12px] tabular-nums text-[var(--i-muted)] max-sm:w-full max-sm:max-w-[252px]">
      <span className="font-medium text-[var(--i-ink)]">{views === undefined ? "" : views ? count.format(views.views) : "0"}</span>
      {numbers ? (
        <>
          <span className="font-medium text-[var(--i-ink)]">{count.format(numbers.clicks)}</span>
          <span>{count.format(numbers.impressions)}</span>
          <span>{numbers.impressions ? numbers.position.toFixed(1) : "–"}</span>
        </>
      ) : numbers === null ? (
        <span className="col-span-3 text-[var(--i-faint)]">no search data</span>
      ) : (
        <span className="col-span-3" />
      )}
    </span>
  );
}

type Numbers = { views?: ReadNumbers | null; search?: SearchNumbers | null };
const hasNumbers = (numbers: Numbers) => numbers.views !== undefined || numbers.search !== undefined;

function PostRow({ post, me }: { post: BlogListItem; me: string }) {
  const waitingOnMe = post.status === "in_review" && post.reviewers.includes(me);
  return (
    <li className="border-b border-[var(--i-line)] last:border-b-0">
      <Link
        href={`/blog/${post.id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-[var(--i-hover)] sm:gap-x-4 sm:px-5"
      >
        <div className="min-w-0 flex-1 basis-[280px]">
          <p className="truncate text-[14px] font-medium">{post.title.trim() || "Untitled post"}</p>
          <p className="truncate text-[12px] text-[var(--i-muted)]">
            /blog/{post.slug || "…"}
            {waitingOnMe ? <span className="ml-2 font-medium text-[var(--i-accent-text)]">Waiting for your review</span> : null}
          </p>
        </div>
        <BlogStatusBadge status={post.status} live={Boolean(post.source_path)} />
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-[var(--i-muted)] sm:w-[150px]">
          <TeamAvatar name={nameFromEmail(post.created_by)} email={post.created_by} size={24} />
          <span className="truncate">{nameFromEmail(post.created_by)}</span>
        </div>
        <div className="flex -space-x-1.5 empty:hidden sm:w-[64px] sm:empty:flex" title={post.reviewers.map(nameFromEmail).join(", ") || "No reviewers yet"}>
          {post.reviewers.slice(0, 3).map((email) => (
            <TeamAvatar key={email} name={nameFromEmail(email)} email={email} size={24} className="ring-2 ring-[var(--i-panel)]" />
          ))}
        </div>
        <span className="ml-auto text-right text-[12px] text-[var(--i-faint)] sm:ml-0 sm:w-[90px]" title={formatDate(post.updated_at)}>
          {relativeDate(post.updated_at)}
        </span>
      </Link>
    </li>
  );
}

/** A live post published from here: its numbers, and links to the site, its stats and the editor. */
function LiveRow({ post, numbers, stats }: { post: BlogListItem; numbers: Numbers; stats: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--i-line)] px-4 py-3 last:border-b-0 sm:gap-x-4 sm:px-5">
      <div className="min-w-0 flex-1 basis-[280px]">
        <Link href={`/blog/${post.id}`} className="block truncate text-[14px] font-medium hover:underline">
          {post.title.trim() || "Untitled post"}
        </Link>
        <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-[var(--i-muted)]">
          <TeamAvatar name={nameFromEmail(post.created_by)} email={post.created_by} size={20} />
          <span className="truncate">
            {nameFromEmail(post.created_by)} · /blog/{post.slug}
          </span>
        </p>
      </div>
      {hasNumbers(numbers) ? <NumbersCell views={numbers.views} numbers={numbers.search} /> : null}
      <span className="flex gap-1.5">
        <a href={`${baseUrl}/blog/${post.slug}`} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
          <ArrowSquareOut size={14} /> View
        </a>
        {stats ? (
          <Link href={`/blog/stats/${post.slug}`} className={buttonClass("ghost", "sm")}>
            <ChartLine size={14} /> Stats
          </Link>
        ) : null}
        <Link href={`/blog/${post.id}`} className={buttonClass("secondary", "sm")}>
          <PencilSimple size={14} /> Edit
        </Link>
      </span>
    </li>
  );
}

function SiteRow({ post, numbers }: { post: SitePost; numbers: Numbers }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--i-line)] px-4 py-3 last:border-b-0 sm:gap-x-4 sm:px-5">
      <div className="min-w-0 flex-1 basis-[280px]">
        <p className="truncate text-[14px]">{post.title}</p>
        <p className="truncate text-[12px] text-[var(--i-muted)]">
          {post.date} · /blog/{post.slug}
          {post.unlisted ? " · hidden from /blog" : ""}
        </p>
      </div>
      {hasNumbers(numbers) ? <NumbersCell views={numbers.views} numbers={numbers.search} /> : null}
      <span className="flex gap-1.5">
        <a href={`${baseUrl}/blog/${post.slug}`} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
          <ArrowSquareOut size={14} /> View
        </a>
        <Link href={`/blog/stats/${post.slug}`} className={buttonClass("ghost", "sm")}>
          <ChartLine size={14} /> Stats
        </Link>
        <form action={editSitePost.bind(null, post.slug)}>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            <PencilSimple size={14} /> Edit
          </button>
        </form>
      </span>
    </li>
  );
}

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "views", label: "Most views" },
  { key: "clicks", label: "Most clicks" },
] as const;

export default async function BlogPostsPage({ searchParams }: Props) {
  const staff = await requireBlog("writer");
  const params = await searchParams;
  const reviewer = staff.blog === "reviewer";
  // On the Live tab the 28-day numbers load alongside the posts.
  const onLive = params.tab === "live";
  const searching = onLive && isSearchConsoleConfigured() ? searchStats() : null;
  const reading = onLive && isAnalyticsConfigured() ? analyticsReport(statsWindow(28)) : null;
  const listed = await listPosts(staff);
  const posts = listed.ok ? listed.posts : [];

  const tracked = new Set(posts.map((post) => post.source_path).filter(Boolean));
  const siteOnly = reviewer ? sitePosts().filter((post) => !tracked.has(post.path)) : [];
  const groups: Record<TabKey, BlogListItem[]> = {
    review: posts
      .filter((post) => post.status === "in_review" || post.status === "approved")
      .sort((a, b) => Number(b.reviewers.includes(staff.email)) - Number(a.reviewers.includes(staff.email))),
    drafts: posts.filter((post) => post.status === "draft" || post.status === "changes_requested"),
    live: posts.filter((post) => post.status === "published"),
  };
  const counts: Record<TabKey, number> = {
    review: groups.review.length,
    drafts: groups.drafts.length,
    live: groups.live.length + siteOnly.length,
  };
  const asked = typeof params.tab === "string" ? params.tab : "";
  const tab: TabKey = TABS.some((item) => item.key === asked)
    ? (asked as TabKey)
    : reviewer && counts.review
      ? "review"
      : "drafts";
  const error = typeof params.error === "string" ? params.error.slice(0, 200) : null;

  // 28-day numbers on the Live tab: Search Console and Google Analytics.
  const [search, reads] = tab === "live" ? await Promise.all([searching, reading]) : [null, null];
  const clicks = search?.ok ? search.posts : null;
  const views = reads?.ok ? reads.posts : null;
  const numbersFor = (slug: string): Numbers => ({
    ...(views ? { views: views[slug] ?? null } : {}),
    ...(clicks ? { search: clicks[slug] ?? null } : {}),
  });
  const sort =
    tab === "live" && ((params.sort === "views" && views) || (params.sort === "clicks" && clicks))
      ? (params.sort as "views" | "clicks")
      : "newest";
  if (sort !== "newest") {
    const value = (slug: string) => (sort === "views" ? (views?.[slug]?.views ?? -1) : (clicks?.[slug]?.clicks ?? -1));
    groups.live.sort((a, b) => value(b.slug) - value(a.slug));
    siteOnly.sort((a, b) => value(b.slug) - value(a.slug));
  }
  const rows = groups[tab];
  const sorts = SORTS.filter((item) => item.key === "newest" || (item.key === "views" ? views : clicks));

  return (
    <>
      <PageHeader
        eyebrow={reviewer ? <Link href="/blog" className="hover:text-[var(--i-ink)]">Blog</Link> : "Content"}
        title={reviewer ? "Posts" : "Blog"}
        description={
          reviewer
            ? "Every post in progress, what's waiting for review, and what's live. Publishing puts a post on studio1hq.com/blog a few minutes later."
            : "Write your posts here. When one is ready, ask for a review; a Studio1 reviewer publishes it."
        }
        actions={
          <form action={newPost}>
            <button type="submit" className={buttonClass("accent")}>
              <Plus size={15} /> New post
            </button>
          </form>
        }
      />

      <div className="mb-4 space-y-2 empty:hidden">
        {params.denied !== undefined ? <Notice tone="warning">That needs the Blog reviewer role.</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {!listed.ok ? <Notice tone="error">{listed.message}</Notice> : null}
        {reviewer && !isGithubConfigured() ? (
          <Notice tone="warning">
            Publishing isn&apos;t set up yet. Add a <code className="text-[12px]">GITHUB_TOKEN</code> with Contents read and
            write on the site&apos;s repo to the server&apos;s environment. Writing and reviewing work already.
          </Notice>
        ) : null}
      </div>

      <nav aria-label="Post stages" className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/blog/posts?tab=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] transition-colors",
              tab === item.key
                ? "bg-[var(--i-panel)] font-medium shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
                : "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] tabular-nums leading-[18px]",
                item.key === "review" && counts.review
                  ? "bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
                  : "bg-[var(--i-sunken)] text-[var(--i-muted)]",
              )}
            >
              {counts[item.key]}
            </span>
          </Link>
        ))}
      </nav>

      {tab === "live" && reviewer && (!isSearchConsoleConfigured() || !isAnalyticsConfigured()) ? (
        <div className="mb-4">
          <Notice tone="info">
            Connect Google Analytics and Search Console to see each post&apos;s views and Google clicks here. Setup is in
            supabase/README.md under &quot;Blog numbers&quot;.
          </Notice>
        </div>
      ) : null}
      {(search && !search.ok) || (reads && !reads.ok) ? (
        <div className="mb-4 space-y-2">
          {/* The detail names the Google account and property: reviewers only. */}
          {search && !search.ok ? (
            <Notice tone="warning">
              {reviewer ? `Couldn't load Google Search numbers: ${search.message}` : "Couldn't load Google Search numbers right now."}
            </Notice>
          ) : null}
          {reads && !reads.ok ? (
            <Notice tone="warning">
              {reviewer ? `Couldn't load views: ${reads.message}` : "Couldn't load views right now."}
            </Notice>
          ) : null}
        </div>
      ) : null}
      {clicks || views ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-[var(--i-muted)]">
          <span>Last 28 days · views, Google clicks, impressions, average position</span>
          <span className="flex gap-1">
            {sorts.map((item) => (
              <Link
                key={item.key}
                href={item.key === "newest" ? "/blog/posts?tab=live" : `/blog/posts?tab=live&sort=${item.key}`}
                aria-current={sort === item.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-0.5",
                  sort === item.key ? "bg-[var(--i-sunken)] text-[var(--i-ink)]" : "hover:bg-[var(--i-hover)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </span>
        </div>
      ) : null}

      <Card>
        {rows.length ? (
          <ul>
            {rows.map((post) =>
              tab === "live" ? (
                <LiveRow key={post.id} post={post} numbers={numbersFor(post.slug)} stats={reviewer} />
              ) : (
                <PostRow key={post.id} post={post} me={staff.email} />
              ),
            )}
          </ul>
        ) : tab !== "live" || !siteOnly.length ? (
          <EmptyState icon={<NotePencil size={20} />} title={TABS.find((item) => item.key === tab)!.empty} />
        ) : null}
        {tab === "live" && siteOnly.length ? (
          <>
            <p className="border-y border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-2 text-[12px] text-[var(--i-muted)] first:border-t-0">
              On the site · press Edit to open one here
            </p>
            <ul>
              {siteOnly.map((post) => (
                <SiteRow key={post.path} post={post} numbers={numbersFor(post.slug)} />
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </>
  );
}
