import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardTitle, ExternalLink } from "@/components/internal/ui";
import { Meter, Pill, Stat } from "@/components/internal/community/ui";
import { STATE_INFO, shortDayLabel, type ReportState } from "@/lib/internal/tasks/report-status";
import {
  nextPeriodLabel,
  statusLabel,
  type ReportPeriod,
  type ReportSnapshot,
  type SnapshotItem,
} from "@/lib/internal/tasks/shared";

/*
 * A weekly or monthly report on the page: the person's three answers and
 * the numbers (live while it's a draft, frozen once submitted). No hooks,
 * so server pages render it directly.
 */

/** Where a report stands, amber when it's late. */
export function ReportStatePill({ state, late = false }: { state: ReportState; late?: boolean }) {
  if (late) return <Pill tone="amber">{state === "draft" ? "Draft, late" : state === "returned" ? "Sent back, late" : "Late"}</Pill>;
  const info = STATE_INFO[state];
  return <Pill tone={info.tone}>{info.label}</Pill>;
}

function attendanceText(snapshot: ReportSnapshot) {
  const days = snapshot.attendance;
  if (!days) return "—";
  const worked = days.worked + days.half / 2;
  return `${worked % 1 ? worked.toFixed(1) : worked} day${worked === 1 ? "" : "s"}`;
}

function attendanceNote(snapshot: ReportSnapshot) {
  const days = snapshot.attendance;
  if (!days) return "Attendance couldn't be read";
  const parts: string[] = [];
  if (days.half) parts.push(`${days.half} half day${days.half === 1 ? "" : "s"}`);
  if (days.leave) parts.push(`${days.leave} on leave`);
  return parts.join(" · ") || "From My day";
}

function sourceLabel(item: SnapshotItem) {
  return item.source === "deliverable" ? "Client deliverable" : item.source === "community" ? "Community task" : "Task";
}

function ItemList({ items, empty, children }: { items: number; empty: string; children: ReactNode }) {
  if (!items) return <p className="px-5 py-4 text-[13px] text-[var(--i-faint)]">{empty}</p>;
  return <ul className="divide-y divide-[var(--i-line)]">{children}</ul>;
}

/** The numbers and lists: where the work went, what got done, client moves, what's open. */
export function ReportSnapshotView({ snapshot }: { snapshot: ReportSnapshot }) {
  // Done items per "for" (a client, or Studio1 and an area).
  const counts = new Map<string, number>();
  for (const item of snapshot.done) counts.set(item.for, (counts.get(item.for) ?? 0) + 1);
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const biggest = Math.max(1, ...rows.map(([, count]) => count));
  const client = rows.filter(([label]) => !label.startsWith("Studio1")).reduce((sum, [, count]) => sum + count, 0);
  const studio = snapshot.done.length - client;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Done"
          value={snapshot.done.length}
          note={`${snapshot.done.filter((item) => item.source === "deliverable").length} client deliverables`}
        />
        <Stat label="For clients" value={client} note={`${studio} for Studio1`} />
        <Stat
          label="Still open"
          value={snapshot.open.length}
          note={`${snapshot.open.filter((item) => item.blocked).length} blocked`}
        />
        <Stat label="Attendance" value={attendanceText(snapshot)} note={attendanceNote(snapshot)} />
      </div>

      <Card>
        <CardTitle>Where the work went</CardTitle>
        {rows.length ? (
          <ul className="space-y-3 px-5 py-4">
            {rows.map(([label, count]) => (
              <li key={label} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">
                    {label}
                    {!label.startsWith("Studio1") ? <span className="ml-2 text-[11.5px] text-[var(--i-faint)]">client</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--i-muted)]">
                    {count} done
                  </span>
                </div>
                <Meter value={count} max={biggest} label={`${label}: ${count} done`} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[13px] text-[var(--i-faint)]">Nothing done in this period yet.</p>
        )}
      </Card>

      <Card>
        <CardTitle>Done ({snapshot.done.length})</CardTitle>
        <ItemList items={snapshot.done.length} empty="Nothing marked done in this period.">
          {snapshot.done.map((item, index) => (
            <li key={`${item.source}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-[13px]">
              <span className="min-w-0">
                <span className="font-medium">{item.title}</span>
                <span className="block text-[12px] text-[var(--i-muted)]">
                  {item.for} · {sourceLabel(item)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[12px] text-[var(--i-muted)]">
                {item.day ? shortDayLabel(item.day) : null}
                {item.url ? (
                  <ExternalLink href={item.url} className="text-[12px]">
                    Live
                  </ExternalLink>
                ) : null}
              </span>
            </li>
          ))}
        </ItemList>
      </Card>

      {snapshot.moved.length ? (
        <Card>
          <CardTitle>Client work moved ({snapshot.moved.length})</CardTitle>
          <ul className="divide-y divide-[var(--i-line)]">
            {snapshot.moved.map((move, index) => (
              <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-[13px]">
                <span className="min-w-0">
                  <span className="font-medium">{move.title}</span>
                  <span className="block text-[12px] text-[var(--i-muted)]">{move.for}</span>
                </span>
                <span className="shrink-0 text-[12px] text-[var(--i-muted)]">
                  {move.from} → {move.to} · {shortDayLabel(move.day)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Still open ({snapshot.open.length})</CardTitle>
        <ItemList items={snapshot.open.length} empty="Nothing open.">
          {snapshot.open.map((item, index) => (
            <li key={`${item.source}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-[13px]">
              <span className="min-w-0">
                <span className="font-medium">{item.title}</span>
                <span className="block text-[12px] text-[var(--i-muted)]">
                  {item.for} · {item.status ?? (item.column ? statusLabel(item.column) : "")}
                  {item.due_on ? ` · due ${shortDayLabel(item.due_on)}` : ""}
                </span>
                {item.blocked && item.reason ? (
                  <span className="mt-0.5 block text-[12px] text-rose-700 dark:text-rose-300">{item.reason}</span>
                ) : null}
              </span>
              {item.blocked ? <Pill tone="rose">Blocked</Pill> : null}
            </li>
          ))}
        </ItemList>
      </Card>
    </div>
  );
}

function Answer({ title, value }: { title: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <h3 className="text-[12px] font-medium text-[var(--i-muted)]">{title}</h3>
      <p
        className={cn(
          "mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed",
          !value.trim() && "text-[var(--i-faint)]",
        )}
      >
        {value.trim() || "Nothing written."}
      </p>
    </div>
  );
}

/** The person's three answers. */
export function ReportWordsView({
  period,
  words,
}: {
  period: ReportPeriod;
  words: { highlights: string; blockers: string; next_plan: string };
}) {
  return (
    <Card>
      <div className="divide-y divide-[var(--i-line)]">
        <Answer title="What went well" value={words.highlights} />
        <Answer title="Blockers / what they need" value={words.blockers} />
        <Answer title={`Plan for ${nextPeriodLabel(period)}`} value={words.next_plan} />
      </div>
    </Card>
  );
}
