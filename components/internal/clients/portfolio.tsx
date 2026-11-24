import Link from "next/link";
import { Eye } from "@/components/internal/icons";
import {
  PIECE_GROUPS,
  countsTotal,
  doneOfPlanned,
  type PieceCounts,
  type ProjectRow,
} from "@/lib/internal/clients/portfolio";
import { projectName, projectPath } from "@/lib/internal/clients/projects";
import { CYCLE_STATES, monthLabel, percentOf, type Option } from "@/lib/internal/clients/schema";
import { OptionBadge, OwnerName } from "@/components/internal/clients/ui";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { cn } from "@/lib/utils";

/* The Projects and Stats pages' pictures: plain HTML, no browser code. */

const counts = new Intl.NumberFormat("en-US");

/** One colour per stage, the same hues as the status badges; not started is the empty track. */
const TONE: Record<keyof PieceCounts, string> = {
  live: "bg-emerald-500 dark:bg-emerald-400",
  approved: "bg-emerald-300 dark:bg-emerald-700",
  withClient: "bg-amber-400 dark:bg-amber-400/90",
  working: "bg-sky-400 dark:bg-sky-500",
  notStarted: "bg-black/[0.07] dark:bg-white/[0.1]",
};

function describe(counts: PieceCounts) {
  return PIECE_GROUPS.filter((group) => counts[group.key])
    .map((group) => `${group.label} ${counts[group.key]}`)
    .join(", ");
}

/** Where a project's (or many projects') pieces are, as one bar from live to not started. */
export function PiecesBar({ counts: value, className }: { counts: PieceCounts; className?: string }) {
  const total = countsTotal(value);
  return (
    <span
      role="img"
      aria-label={total ? describe(value) : "Nothing planned"}
      title={total ? describe(value) : "Nothing planned"}
      className={cn("flex h-2 w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.1]", className)}
    >
      {total
        ? PIECE_GROUPS.map((group) =>
            value[group.key] ? (
              <span
                key={group.key}
                className={cn("h-full border-r-2 border-[var(--i-panel)] last:border-r-0", TONE[group.key])}
                style={{ width: `${(value[group.key] / total) * 100}%` }}
              />
            ) : null,
          )
        : null}
    </span>
  );
}

/** The bar's key: each stage with its count. */
export function PiecesLegend({ counts: value, className }: { counts: PieceCounts; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]", className)}>
      {PIECE_GROUPS.map((group) => (
        <span key={group.key} className="inline-flex items-center gap-1.5 text-[var(--i-muted)]">
          <span aria-hidden className={cn("size-2.5 rounded-[3px]", TONE[group.key])} />
          {group.label}
          <span className="font-medium tabular-nums text-[var(--i-ink)]">{value[group.key]}</span>
        </span>
      ))}
    </div>
  );
}

function hrefOf(row: ProjectRow) {
  return projectPath(row.client.slug, row.cycle.month, { engagement: row.several ? row.engagement.id : null });
}

/** "2 blocked, 5 waiting on the client, 2 late" in full, for a tooltip. */
export function heldUpText(blocked: number, waiting: number, late: number) {
  return [blocked ? `${blocked} blocked` : "", waiting ? `${waiting} waiting on the client` : "", late ? `${late} late` : ""]
    .filter(Boolean)
    .join(", ");
}

/** "2 blocked · 5 waiting · 2 late" on one line, the full words in its tooltip. */
export function HeldUpShort({ blocked, waiting, late }: { blocked: number; waiting: number; late: number }) {
  const parts = [
    blocked ? { text: `${blocked} blocked`, tone: "text-rose-700 dark:text-rose-300" } : null,
    waiting ? { text: `${waiting} waiting`, tone: "text-amber-700 dark:text-amber-300" } : null,
    late ? { text: `${late} late`, tone: "text-rose-700 dark:text-rose-300" } : null,
  ].filter((part): part is { text: string; tone: string } => part !== null);
  if (!parts.length) return <span className="text-[var(--i-faint)]">—</span>;
  return (
    <span className="block truncate text-[12px]" title={heldUpText(blocked, waiting, late)}>
      {parts.map((part, index) => (
        <span key={part.text}>
          {index ? <span className="text-[var(--i-faint)]"> · </span> : null}
          <span className={part.tone}>{part.text}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * One project's month on one line: its name, a thin bar of done of planned,
 * the numbers, and a red dot when something's held up. For lists where a
 * company has a line per project.
 */
export function ProgressLine({
  href,
  label,
  done,
  planned,
  held = "",
  note,
}: {
  href: string;
  label: string;
  done: number;
  planned: number;
  /** What's held up, in words; a dot shows when there's any. */
  held?: string;
  /** Instead of the bar ("Nov not started"). */
  note?: string;
}) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-2 text-[12.5px]" title={held || undefined}>
      <span className="min-w-0 flex-1 truncate text-[var(--i-ink-2)] group-hover:text-[var(--i-accent-text)]">{label}</span>
      {note ? (
        <span className="shrink-0 text-[12px] text-[var(--i-faint)]">{note}</span>
      ) : (
        <>
          <span aria-hidden className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.1]">
            <span className="block h-full rounded-full bg-[var(--i-accent)]" style={{ width: `${planned ? Math.min(100, (done / planned) * 100) : 0}%` }} />
          </span>
          <span className="w-10 shrink-0 text-right tabular-nums text-[var(--i-muted)]">
            <span className="text-[var(--i-ink)]">{done}</span>/{planned || "—"}
          </span>
        </>
      )}
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", held ? "bg-rose-500" : "bg-transparent")} />
    </Link>
  );
}

/** The project's pieces bar with "9/12" and its share beside it, on one line. */
function LiveLine({ row }: { row: ProjectRow }) {
  const { done, planned } = doneOfPlanned([row]);
  return (
    <span className="flex items-center gap-2.5 text-[12.5px] tabular-nums">
      <PiecesBar counts={row.counts} className="min-w-0 flex-1" />
      <span
        className="w-[4.5rem] shrink-0 text-right"
        title={row.planned ? undefined : "This month had no plan set, so its pieces count as the plan"}
      >
        <span className="font-medium text-[var(--i-ink)]">{done}</span>
        <span className="text-[var(--i-muted)]">/{planned || "—"}</span>
        {row.planned ? <span className="ml-1.5 text-[var(--i-faint)]">{percentOf(done, planned)}%</span> : null}
      </span>
    </span>
  );
}

/** Company and project on one line: "Jozu  DevRel". */
function ProjectCell({ row, types }: { row: ProjectRow; types: readonly Option[] }) {
  return (
    <Link href={hrefOf(row)} className="group flex min-w-0 items-center gap-2.5">
      <ClientLogo slug={row.client.slug} name={row.client.name} website={row.client.website} size={20} />
      <span className="min-w-0 truncate">
        <span className="font-medium group-hover:text-[var(--i-accent-text)]">{row.client.name}</span>
        <span className="ml-1.5 text-[var(--i-muted)]">{projectName(row.engagement, row.client.name, types)}</span>
      </span>
    </Link>
  );
}

const dash = <span className="text-[var(--i-faint)]">—</span>;

/** Every project as a table (compact rows on phones): who, which month, how far, what's held up, reach, owner. */
export function ProjectsTable({
  rows,
  types,
  names,
}: {
  rows: readonly ProjectRow[];
  types: readonly Option[];
  names: Readonly<Record<string, string>>;
}) {
  return (
    <>
      <ul className="divide-y divide-[var(--i-line)] lg:hidden">
        {rows.map((row) => (
          <li key={row.cycle.id} className="space-y-1.5 px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <ProjectCell row={row} types={types} />
              <span className="shrink-0 text-[12px] text-[var(--i-muted)]">{monthLabel(row.cycle.month, true)}</span>
            </div>
            <LiveLine row={row} />
            {row.blocked || row.waiting || row.late || row.views ? (
              <div className="flex items-center justify-between gap-3">
                <HeldUpShort blocked={row.blocked} waiting={row.waiting} late={row.late} />
                {row.views ? (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-[var(--i-muted)]">
                    <Eye size={12} aria-hidden /> {counts.format(row.views)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:px-3 [&>th]:py-2 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
              <th scope="col" className="w-[24%]">Project</th>
              <th scope="col" className="w-[9%]">Month</th>
              <th scope="col" className="w-[10%]">State</th>
              <th scope="col" className="w-[21%]">Pieces live</th>
              <th scope="col" className="w-[16%]">Held up</th>
              <th scope="col" className="w-[8%] text-right">Reach</th>
              <th scope="col" className="w-[12%]">Owner</th>
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-3 [&>tr>td]:py-2 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
            {rows.map((row) => (
              <tr key={row.cycle.id} className="transition-colors hover:bg-[var(--i-hover)]">
                <td>
                  <ProjectCell row={row} types={types} />
                </td>
                <td className="text-[var(--i-ink-2)]">{monthLabel(row.cycle.month, true)}</td>
                <td>
                  <OptionBadge list={CYCLE_STATES} value={row.cycle.state} />
                </td>
                <td>
                  <LiveLine row={row} />
                </td>
                <td>
                  <HeldUpShort blocked={row.blocked} waiting={row.waiting} late={row.late} />
                </td>
                <td className="text-right tabular-nums text-[var(--i-ink-2)]">{row.views ? counts.format(row.views) : dash}</td>
                <td>
                  <span className="flex">
                    <OwnerName email={row.engagement.owner} names={names} empty="—" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Each project line (a company's engagement) across the months: a cell per
 * month with how much of the plan went live, so a client's history and a
 * slow month stand out at a glance.
 */
export function ProjectsTimeline({
  rows,
  months,
  types,
}: {
  rows: readonly ProjectRow[];
  months: readonly string[];
  types: readonly Option[];
}) {
  const lines = new Map<string, ProjectRow[]>();
  for (const row of rows) lines.set(row.engagement.id, [...(lines.get(row.engagement.id) ?? []), row]);
  const ordered = [...lines.values()].sort(
    (a, b) => a[0].client.name.localeCompare(b[0].client.name) || a[0].engagement.name.localeCompare(b[0].engagement.name),
  );
  const current = months.at(-1);
  return (
    <div className="internal-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)]">
            <th scope="col" className="sticky left-0 z-[1] w-56 bg-[var(--i-panel)] py-2.5 pl-5 pr-4 font-normal">
              Project
            </th>
            {months.map((month) => (
              <th
                key={month}
                scope="col"
                className={cn("px-1.5 py-2.5 text-center font-normal", month === current && "text-[var(--i-ink)]")}
              >
                {monthLabel(month, true)}
              </th>
            ))}
            <th aria-hidden className="w-3" />
          </tr>
        </thead>
        <tbody>
          {ordered.map((line) => {
            const first = line[0];
            const byMonth = new Map(line.map((row) => [row.cycle.month, row]));
            return (
              <tr key={first.engagement.id} className="border-b border-[var(--i-line)] last:border-0">
                <th scope="row" className="sticky left-0 z-[1] bg-[var(--i-panel)] py-2.5 pl-5 pr-4 font-normal">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ClientLogo slug={first.client.slug} name={first.client.name} website={first.client.website} size={24} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{first.client.name}</span>
                      <span className="block truncate text-[12px] text-[var(--i-muted)]">
                        {projectName(first.engagement, first.client.name, types)}
                      </span>
                    </span>
                  </span>
                </th>
                {months.map((month) => {
                  const row = byMonth.get(month);
                  if (!row)
                    return (
                      <td key={month} className="px-1.5 py-2.5">
                        <span aria-hidden className="block h-12 rounded-lg border border-dashed border-[var(--i-line)]" />
                      </td>
                    );
                  const { done, planned } = doneOfPlanned([row]);
                  const held = row.blocked + row.waiting + row.late;
                  return (
                    <td key={month} className="px-1.5 py-2.5">
                      <Link
                        href={hrefOf(row)}
                        title={`${projectName(row.engagement, row.client.name, types)} · ${monthLabel(row.cycle.month)}: ${describe(row.counts) || "nothing planned"}`}
                        className={cn(
                          "flex h-12 flex-col justify-between rounded-lg border bg-[var(--i-panel)] px-2.5 py-2 transition-colors hover:border-[var(--i-line-strong)] hover:bg-[var(--i-hover)]",
                          month === current ? "border-[var(--i-line-strong)]" : "border-[var(--i-line)]",
                        )}
                      >
                        <span className="flex items-baseline justify-between gap-1.5 text-[12px] tabular-nums">
                          <span>
                            <span className="font-medium text-[var(--i-ink)]">{done}</span>
                            <span className="text-[var(--i-faint)]">/{planned || "—"}</span>
                            {planned ? <span className="ml-1.5 text-[var(--i-faint)]">{percentOf(done, planned)}%</span> : null}
                          </span>
                          {held ? (
                            <span className="size-1.5 shrink-0 self-center rounded-full bg-rose-500" title={`${held} held up`} />
                          ) : row.cycle.state === "closed" ? (
                            <span className="text-[11px] text-[var(--i-faint)]">closed</span>
                          ) : null}
                        </span>
                        <PiecesBar counts={row.counts} className="h-1.5" />
                      </Link>
                    </td>
                  );
                })}
                <td aria-hidden />
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--i-line)] px-5 py-2.5 text-[12px] text-[var(--i-muted)]">
        <span>Each month: live of planned</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-rose-500" /> something blocked, waiting on the client or late
        </span>
      </p>
    </div>
  );
}
