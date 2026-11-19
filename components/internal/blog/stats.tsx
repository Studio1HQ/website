import { ArrowDown, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import {
  Sparkline,
  TableView,
  compact,
} from "@/components/internal/community/charts";
import { readTime, type PostStat } from "@/lib/internal/blog/stats";
import { baseUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
 * Pieces of Blog → Stats (app/internal/(dashboard)/blog/stats): a change
 * against the stretch before, a line of numbers a day, and the top posts.
 * Server-rendered; the charts' hover readouts are CSS only.
 */

/** "18 Nov" for a YYYY-MM-DD day. */
export function shortDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Up or down against the stretch before, as a share: "▲ 12% vs previous 28 days". */
export function Change({ share, against }: { share: number; against: string }) {
  const rounded = Math.round(share * 100);
  const Icon = rounded > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {rounded === 0 ? null : (
        <Icon
          size={12}
          weight="bold"
          aria-hidden
          className={
            rounded > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
        />
      )}
      <span className="font-medium tabular-nums text-[var(--i-ink-2)]">
        {rounded === 0 ? "Same" : `${Math.abs(rounded)}%`}
      </span>
      <span>{rounded === 0 ? `as ${against}` : `vs ${against}`}</span>
    </span>
  );
}

/** One number a day as a line, with the first and last day under it and a table view. */
export function DayChart({
  points,
  unit,
}: {
  points: { day: string; value: number }[];
  unit: string;
}) {
  const middle = points[Math.floor((points.length - 1) / 2)];
  return (
    <div className="px-5 pb-4 pt-5">
      <Sparkline
        points={points.map((point) => ({
          label: shortDay(point.day),
          value: point.value,
        }))}
        height={132}
      />
      <div className="mt-2 flex justify-between text-[11px] text-[var(--i-faint)]">
        <span>{points[0] ? shortDay(points[0].day) : ""}</span>
        <span className="max-sm:hidden">
          {middle ? shortDay(middle.day) : ""}
        </span>
        <span>
          {points.length ? shortDay(points[points.length - 1].day) : ""}
        </span>
      </div>
      <TableView
        head={["Day", unit]}
        rows={[...points]
          .reverse()
          .map((point) => [shortDay(point.day), point.value])}
      />
    </div>
  );
}

/** Post · Views · Read time · Google clicks · Position, one row each. */
const COLUMNS =
  "grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] sm:grid-cols-[minmax(0,1fr)_repeat(4,5.75rem)]";

function PostRow({
  row,
  rank,
  max,
  byViews,
}: {
  row: PostStat;
  rank: number;
  max: number;
  byViews: boolean;
}) {
  const value = byViews ? (row.reads?.views ?? 0) : (row.search?.clicks ?? 0);
  const perReader = row.reads?.readers
    ? row.reads.engaged / row.reads.readers
    : 0;
  return (
    <li
      className={cn(
        "grid items-center gap-x-3 border-b border-[var(--i-line)] px-5 py-2.5 last:border-b-0",
        COLUMNS,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="w-5 shrink-0 text-right text-[11.5px] tabular-nums text-[var(--i-faint)]">
            {rank}
          </span>
          <a
            href={`${baseUrl}/blog/${row.slug}`}
            target="_blank"
            rel="noreferrer"
            title={
              row.date ? `${row.title} · published ${row.date}` : row.title
            }
            className="line-clamp-2 min-w-0 text-[13.5px] hover:underline sm:line-clamp-1"
          >
            {row.title}
          </a>
        </div>
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
      </div>
      <span className="text-right text-[13px] font-medium tabular-nums">
        {row.reads ? compact(row.reads.views) : "–"}
      </span>
      <span className="text-right text-[12.5px] tabular-nums text-[var(--i-muted)] max-sm:hidden">
        {readTime(perReader)}
      </span>
      <span className="text-right text-[13px] tabular-nums">
        {row.search ? compact(row.search.clicks) : "–"}
      </span>
      <span className="text-right text-[12.5px] tabular-nums text-[var(--i-muted)] max-sm:hidden">
        {row.search?.impressions ? row.search.position.toFixed(1) : "–"}
      </span>
    </li>
  );
}

/** The ranked posts: the first ten, and the rest behind "Show all". */
export function TopPosts({
  rows,
  byViews,
  empty,
  shown = 10,
}: {
  rows: PostStat[];
  byViews: boolean;
  empty: string;
  shown?: number;
}) {
  if (!rows.length) {
    return (
      <p className="px-5 py-8 text-center text-[13px] text-[var(--i-muted)]">
        {empty}
      </p>
    );
  }
  const max = Math.max(
    1,
    ...rows.map((row) =>
      byViews ? (row.reads?.views ?? 0) : (row.search?.clicks ?? 0),
    ),
  );
  const rest = rows.slice(shown);
  return (
    <>
      <div
        className={cn(
          "grid gap-x-3 border-b border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-2 text-[11.5px] text-[var(--i-muted)]",
          COLUMNS,
        )}
      >
        <span className="pl-[30px]">Post</span>
        <span className="text-right">Views</span>
        <span className="text-right max-sm:hidden">Read time</span>
        <span className="text-right">
          <span className="sm:hidden">Clicks</span>
          <span className="max-sm:hidden">Google clicks</span>
        </span>
        <span className="text-right max-sm:hidden">Position</span>
      </div>
      <ol>
        {rows.slice(0, shown).map((row, index) => (
          <PostRow
            key={row.slug}
            row={row}
            rank={index + 1}
            max={max}
            byViews={byViews}
          />
        ))}
      </ol>
      {rest.length ? (
        <details className="group border-t border-[var(--i-line)]">
          <summary className="cursor-pointer select-none px-5 py-2.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)] group-open:border-b group-open:border-[var(--i-line)]">
            <span className="group-open:hidden">
              Show all {rows.length} posts
            </span>
            <span className="hidden group-open:inline">
              Show the top {shown}
            </span>
          </summary>
          <ol>
            {rest.map((row, index) => (
              <PostRow
                key={row.slug}
                row={row}
                rank={shown + index + 1}
                max={max}
                byViews={byViews}
              />
            ))}
          </ol>
        </details>
      ) : null}
    </>
  );
}
