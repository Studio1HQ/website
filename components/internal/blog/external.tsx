import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle, Eye, Heart } from "@phosphor-icons/react/dist/ssr";
import {
  Card,
  CardTitle,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/internal/ui";
import { compact } from "@/components/internal/community/charts";
import { Stat } from "@/components/internal/community/ui";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import { SendToDevButton } from "@/components/internal/blog/external-send";
import {
  DEV_SORTS,
  devEditUrl,
  devPath,
  devTotals,
  notOnDev,
  sortDevArticles,
  type DevArticle,
  type DevSort,
} from "@/lib/internal/blog/devto";
import type { DevList } from "@/lib/internal/blog/devto-api";
import { baseUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
 * Blog → External (app/internal/(dashboard)/blog/external): the team's DEV
 * account like DEV's own dashboard, and the live posts not copied there
 * yet. Server-rendered; only the send buttons run in the browser.
 */

type SitePostLike = {
  slug: string;
  title: string;
  date: string;
  unlisted: boolean;
};

/** What the page's URL says happened: a draft sent, or a post that was already there. */
export type ExternalNote = {
  kind: "sent" | "already";
  title: string;
  path: string | null;
};

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** "12 Nov 2026" for an ISO time or a YYYY-MM-DD day. */
function longDay(value: string | null) {
  if (!value) return "";
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value,
  );
  return Number.isNaN(date.getTime()) ? value : dayFormat.format(date);
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

const linkClass =
  "font-medium text-[var(--i-ink)] underline underline-offset-2 hover:no-underline";

/** Post · Reactions · Comments · Views. Comments drop off on a phone. */
const COLUMNS =
  "grid-cols-[minmax(0,1fr)_3rem_3.5rem] sm:grid-cols-[minmax(0,1fr)_repeat(3,5.5rem)]";

function NumberHead({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <span className="flex items-center justify-end gap-1">
      <span aria-hidden className="sm:hidden">
        {icon}
      </span>
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}

function ArticleRow({
  article,
  known,
}: {
  article: DevArticle;
  known: ReadonlySet<string>;
}) {
  const path = devPath(article.url);
  const figure = (value: number) => (article.published ? compact(value) : "–");
  return (
    <li
      className={cn(
        "grid items-center gap-x-3 border-b border-[var(--i-line)] px-5 py-2.5 last:border-b-0",
        COLUMNS,
      )}
    >
      <div className="min-w-0">
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            title={article.title}
            className="line-clamp-2 text-[13.5px] hover:underline sm:line-clamp-1"
          >
            {article.title}
          </a>
        ) : (
          <p className="line-clamp-2 text-[13.5px] sm:line-clamp-1">
            {article.title}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--i-muted)]">
          {article.published ? (
            <span>{longDay(article.publishedAt) || "Published"}</span>
          ) : (
            <span className="rounded-full bg-[var(--i-sunken)] px-1.5 text-[11px] leading-[18px] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
              Draft
            </span>
          )}
          {!article.published && path ? (
            <a
              href={devEditUrl(path)}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--i-ink)] hover:underline"
            >
              Edit on DEV
            </a>
          ) : null}
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
      </div>
      <span className="text-right text-[13px] tabular-nums">
        {figure(article.reactions)}
      </span>
      <span className="text-right text-[12.5px] tabular-nums text-[var(--i-muted)] max-sm:hidden">
        {figure(article.comments)}
      </span>
      <span className="text-right text-[13px] font-medium tabular-nums">
        {figure(article.views)}
      </span>
    </li>
  );
}

/** The articles: the first `shown`, and the rest behind "Show all". */
function ArticleList({
  articles,
  known,
  shown = 20,
}: {
  articles: DevArticle[];
  known: ReadonlySet<string>;
  shown?: number;
}) {
  const rest = articles.slice(shown);
  return (
    <>
      <div
        className={cn(
          "grid gap-x-3 border-b border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-2 text-[11.5px] text-[var(--i-muted)]",
          COLUMNS,
        )}
      >
        <span>Post</span>
        <NumberHead label="Reactions" icon={<Heart size={13} />} />
        <span className="text-right max-sm:hidden">Comments</span>
        <NumberHead label="Views" icon={<Eye size={13} />} />
      </div>
      <ol>
        {articles.slice(0, shown).map((article) => (
          <ArticleRow key={article.id} article={article} known={known} />
        ))}
      </ol>
      {rest.length ? (
        <details className="group border-t border-[var(--i-line)]">
          <summary className="cursor-pointer select-none px-5 py-2.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)] group-open:border-b group-open:border-[var(--i-line)]">
            <span className="group-open:hidden">
              Show all {articles.length} articles
            </span>
            <span className="hidden group-open:inline">
              Show the first {shown}
            </span>
          </summary>
          <ol>
            {rest.map((article) => (
              <ArticleRow key={article.id} article={article} known={known} />
            ))}
          </ol>
        </details>
      ) : null}
    </>
  );
}

function PendingRow({
  post,
  send,
  disabled,
}: {
  post: SitePostLike;
  send: (slug: string) => Promise<void>;
  disabled: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--i-line)] px-4 py-3 last:border-b-0 sm:gap-x-4 sm:px-5">
      <div className="min-w-0 flex-1 basis-[260px]">
        <a
          href={`${baseUrl}/blog/${post.slug}`}
          target="_blank"
          rel="noreferrer"
          title={post.title}
          className="line-clamp-2 text-[13.5px] hover:underline sm:line-clamp-1"
        >
          {post.title}
        </a>
        <p className="mt-0.5 truncate text-[12px] text-[var(--i-muted)]">
          {longDay(post.date)}
          {post.date ? " · " : ""}/blog/{post.slug}
          {post.unlisted ? " · hidden from /blog" : ""}
        </p>
      </div>
      <form action={send.bind(null, post.slug)}>
        <SendToDevButton
          disabled={disabled}
          hint={disabled ? "Connect DEV first" : undefined}
        />
      </form>
    </li>
  );
}

export function BlogExternalView({
  configured,
  list,
  sort,
  site,
  note,
  error,
  send,
}: {
  configured: boolean;
  /** Null when DEV isn't connected. */
  list: DevList | null;
  sort: DevSort;
  site: readonly SitePostLike[];
  note: ExternalNote | null;
  error: string | null;
  send: (slug: string) => Promise<void>;
}) {
  const articles = list?.ok ? sortDevArticles(list.articles, sort) : [];
  const totals = list?.ok ? devTotals(list.articles) : null;
  const pending = notOnDev(site, articles);
  const known = new Set(site.map((post) => post.slug));
  const down = Boolean(list && !list.ok);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/blog" className="hover:text-[var(--i-ink)]">
            Blog
          </Link>
        }
        title="External publishing"
        description="Studio1 posts copied to DEV, with the canonical link pointing back to studio1hq.com. Send a live post as a draft here, then check it and publish it on DEV."
      />

      <div className="mb-4 space-y-2 empty:hidden">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {note?.kind === "sent" ? (
          <Notice tone="info">
            &ldquo;{note.title}&rdquo; is on DEV as a draft.{" "}
            {note.path ? (
              <>
                <a
                  href={devEditUrl(note.path)}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  Open the draft
                </a>{" "}
                to check it, then publish it there.
              </>
            ) : (
              "Find it under Drafts below, then publish it on DEV."
            )}
          </Notice>
        ) : null}
        {note?.kind === "already" ? (
          <Notice tone="info">
            &ldquo;{note.title}&rdquo; was already on DEV, so nothing new was
            made.
            {note.path ? (
              <>
                {" "}
                <a
                  href={`https://dev.to${note.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  Open it on DEV
                </a>
                .
              </>
            ) : null}
          </Notice>
        ) : null}
        {!configured ? (
          <Notice tone="info">
            DEV isn&apos;t connected yet. Make a key in DEV under Settings →
            Extensions → &ldquo;DEV Community API Keys&rdquo;, then add it in
            Vercel as <code className="text-[12px]">DEV_API_KEY</code>{" "}
            (Production, Sensitive) and redeploy. To make the drafts under a DEV
            organization, also add{" "}
            <code className="text-[12px]">DEV_ORGANIZATION_ID</code>. Until then
            the posts below can&apos;t be sent.
          </Notice>
        ) : null}
        {list && !list.ok ? (
          <Notice tone="warning">Couldn&apos;t load DEV: {list.message}</Notice>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Total reactions"
          value={totals ? compact(totals.reactions) : "–"}
          note={
            totals
              ? `Across ${plural(totals.published, "published post")}`
              : "From DEV"
          }
        />
        <Stat
          label="Total comments"
          value={totals ? compact(totals.comments) : "–"}
          note={
            totals
              ? totals.drafts
                ? `${plural(totals.drafts, "draft")} not published yet`
                : "No drafts waiting"
              : "From DEV"
          }
        />
        <div className="col-span-2 sm:col-span-1">
          <Stat
            label="Total views"
            value={totals ? compact(totals.views) : "–"}
            note={
              totals
                ? `${compact(totals.studio1Views)} on Studio1 posts`
                : "From DEV"
            }
          />
        </div>
      </div>

      <Card className="mb-5">
        <CardTitle
          action={
            articles.length > 1 ? (
              <FilterDropdown
                label="Sort"
                always
                align="end"
                items={DEV_SORTS.map((item) => ({
                  key: item.key,
                  label: item.label,
                  href:
                    item.key === "new"
                      ? "/blog/external"
                      : `/blog/external?sort=${item.key}`,
                  on: item.key === sort,
                }))}
              />
            ) : null
          }
        >
          On DEV
          {list?.ok ? (
            <span className="ml-2 font-normal tabular-nums text-[var(--i-muted)]">
              {articles.length}
            </span>
          ) : null}
        </CardTitle>
        {articles.length ? (
          <ArticleList articles={articles} known={known} />
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-[var(--i-muted)]">
            {list?.ok
              ? "Nothing on DEV yet. Send a post below."
              : down
                ? "Couldn't load these; the note at the top says why."
                : "Shows once DEV is connected."}
          </p>
        )}
      </Card>

      <Card className="mb-5">
        <CardTitle>
          Studio1 posts not on DEV yet
          <span className="ml-2 font-normal tabular-nums text-[var(--i-muted)]">
            {pending.length}
          </span>
        </CardTitle>
        {down ? (
          <p className="border-b border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-2 text-[12px] text-[var(--i-muted)]">
            Couldn&apos;t load DEV, so this lists every live post. Sending
            checks DEV first, so nothing is copied twice.
          </p>
        ) : null}
        {pending.length ? (
          <ul className="max-h-[34rem] overflow-y-auto overscroll-contain">
            {pending.map((post) => (
              <PendingRow
                key={post.slug}
                post={post}
                send={send}
                disabled={!configured}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CheckCircle size={20} />}
            title="Every live post is on DEV."
          />
        )}
      </Card>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--i-faint)]">
        Numbers come from the DEV API and refresh every 10 minutes. A draft
        stays private until someone publishes it on DEV. Each copy keeps its
        canonical link to studio1hq.com, so search engines credit the original.
      </p>
    </>
  );
}
