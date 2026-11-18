import Link from "next/link";
import type { RoleKey } from "@/lib/internal/roles";
import { Card, CardTitle } from "@/components/internal/ui";
import { firstDay, lastDay, personName } from "@/lib/internal/clients/schema";
import { tasksForEngagements } from "@/lib/internal/tasks/data";

/**
 * A client workspace's "Team tasks": the tasks people tagged with this
 * engagement in Tasks this month, done and still open, per person and per
 * deliverable. Internal only: never in the client's report. Client tasks
 * show to everyone who can open the client (the owner's rule, 15 Nov 2026).
 * Renders nothing when there are none or Tasks isn't set up yet.
 */
export async function EngagementTime({
  engagementId,
  month,
  deliverables,
  names,
}: {
  /** Who's looking (kept for the call site; client tasks show to anyone with client access). */
  viewer: { email: string; status: string; roles: readonly RoleKey[] };
  engagementId: string;
  month: string;
  deliverables: readonly { id: string; title: string }[];
  names: Readonly<Record<string, string>>;
}) {
  const tasks = await tasksForEngagements([engagementId], firstDay(month), lastDay(month));
  if (!tasks.ok || !tasks.rows.length) return null;

  type Tally = { done: number; open: number };
  const add = (map: Map<string, Tally>, key: string, done: boolean) => {
    const tally = map.get(key) ?? { done: 0, open: 0 };
    map.set(key, done ? { ...tally, done: tally.done + 1 } : { ...tally, open: tally.open + 1 });
  };
  const byPerson = new Map<string, Tally>();
  const byDeliverable = new Map<string, Tally>();
  const other: Tally = { done: 0, open: 0 };
  for (const task of tasks.rows) {
    const done = task.status === "done";
    add(byPerson, task.email, done);
    if (task.deliverable_id) add(byDeliverable, task.deliverable_id, done);
    else if (done) other.done += 1;
    else other.open += 1;
  }
  const titles = new Map(deliverables.map((item) => [item.id, item.title]));
  const order = (a: [string, Tally], b: [string, Tally]) => b[1].done - a[1].done || b[1].open - a[1].open;
  const people = [...byPerson.entries()].sort(order);
  const items = [...byDeliverable.entries()].sort(order);
  const tally = (value: Tally) => [value.done ? `${value.done} done` : "", value.open ? `${value.open} open` : ""].filter(Boolean).join(" · ");
  const done = tasks.rows.filter((task) => task.status === "done").length;

  return (
    <Card className="mt-5">
      <CardTitle action={<span className="text-[12px] text-[var(--i-faint)]">From Tasks · internal only</span>}>
        Team tasks{" "}
        <span className="font-normal tabular-nums text-[var(--i-muted)]">
          {tally({ done, open: tasks.rows.length - done })}
        </span>
      </CardTitle>
      <div className="grid gap-5 px-5 py-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[12px] text-[var(--i-muted)]">By person</p>
          <ul className="space-y-1.5 text-[13px]">
            {people.map(([email, value]) => (
              <li key={email} className="flex items-center justify-between gap-3">
                <Link href={`/tasks?view=month&month=${month}&person=${encodeURIComponent(email)}`} className="truncate hover:text-[var(--i-accent-text)]">
                  {personName(email, names)}
                </Link>
                <span className="shrink-0 tabular-nums text-[var(--i-muted)]">{tally(value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[12px] text-[var(--i-muted)]">By deliverable</p>
          <ul className="space-y-1.5 text-[13px]">
            {items.map(([id, value]) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <span className="truncate">{titles.get(id) ?? "A deliverable from another month"}</span>
                <span className="shrink-0 tabular-nums text-[var(--i-muted)]">{tally(value)}</span>
              </li>
            ))}
            {other.done || other.open ? (
              <li className="flex items-center justify-between gap-3 text-[var(--i-muted)]">
                <span className="truncate">Other work (calls, research…)</span>
                <span className="shrink-0 tabular-nums">{tally(other)}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </Card>
  );
}
