import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut, NotePencil, PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";
import { BlogStatusBadge } from "@/components/internal/blog/status";
import { Avatar, Card, EmptyState, Notice, PageHeader, buttonClass, formatDate, relativeDate } from "@/components/internal/ui";
import { listPosts, sitePosts, type BlogListItem, type SitePost } from "@/lib/internal/blog/data";
import { isGithubConfigured } from "@/lib/internal/blog/github";
import { nameFromEmail } from "@/lib/internal/blog/shared";
import { requireBlog } from "@/lib/internal/session";
import { cn } from "@/lib/utils";
import { editSitePost, newPost } from "./actions";

export const metadata: Metadata = { title: "Blog" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { key: "review", label: "In review", empty: "Nothing is waiting for review." },
  { key: "drafts", label: "Drafts", empty: "No drafts. Start one with New post." },
  { key: "live", label: "Live", empty: "Nothing published from here yet." },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function PostRow({ post, me }: { post: BlogListItem; me: string }) {
  const waitingOnMe = post.status === "in_review" && post.reviewers.includes(me);
  return (
    <li className="border-b border-[var(--i-line)] last:border-b-0">
      <Link
        href={`/internal/blog/${post.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-[var(--i-hover)]"
      >
        <div className="min-w-0 flex-1 basis-[280px]">
          <p className="truncate text-[14px] font-medium">{post.title.trim() || "Untitled post"}</p>
          <p className="truncate text-[12px] text-[var(--i-muted)]">
            /blog/{post.slug || "…"}
            {waitingOnMe ? <span className="ml-2 font-medium text-[var(--i-accent-text)]">Waiting for your review</span> : null}
          </p>
        </div>
        <BlogStatusBadge status={post.status} live={Boolean(post.source_path)} />
        <div className="flex w-[150px] items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
          <Avatar name={nameFromEmail(post.created_by)} email={post.created_by} size={24} />
          <span className="truncate">{nameFromEmail(post.created_by)}</span>
        </div>
        <div className="flex w-[64px] -space-x-1.5" title={post.reviewers.map(nameFromEmail).join(", ") || "No reviewers yet"}>
          {post.reviewers.slice(0, 3).map((email) => (
            <Avatar key={email} name={nameFromEmail(email)} email={email} size={24} className="ring-2 ring-[var(--i-panel)]" />
          ))}
        </div>
        <span className="w-[90px] text-right text-[12px] text-[var(--i-faint)]" title={formatDate(post.updated_at)}>
          {relativeDate(post.updated_at)}
        </span>
      </Link>
    </li>
  );
}

function SiteRow({ post }: { post: SitePost }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-[var(--i-line)] px-5 py-3 last:border-b-0">
      <div className="min-w-0 flex-1 basis-[280px]">
        <p className="truncate text-[14px]">{post.title}</p>
        <p className="truncate text-[12px] text-[var(--i-muted)]">
          /blog/{post.slug}
          {post.unlisted ? " · hidden from /blog" : ""}
        </p>
      </div>
      <span className="text-[12px] text-[var(--i-faint)]">{post.date}</span>
      <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
        <ArrowSquareOut size={14} /> View
      </a>
      <form action={editSitePost.bind(null, post.slug)}>
        <button type="submit" className={buttonClass("secondary", "sm")}>
          <PencilSimple size={14} /> Edit
        </button>
      </form>
    </li>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const staff = await requireBlog("writer");
  const params = await searchParams;
  const reviewer = staff.blog === "reviewer";
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
  const rows = groups[tab];

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog"
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

      <div className="mb-4 space-y-2">
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
            href={`/internal/blog?tab=${item.key}`}
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

      <Card>
        {rows.length ? (
          <ul>
            {rows.map((post) => (
              <PostRow key={post.id} post={post} me={staff.email} />
            ))}
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
                <SiteRow key={post.path} post={post} />
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </>
  );
}
