import "server-only";
import { selectRows } from "@/lib/supabase-server";
import { addDays } from "@/lib/internal/clients/schema";
import { istMidnight, listTasks } from "@/lib/internal/tasks/data";
import { istDay } from "@/lib/internal/tasks/report";

/**
 * Reads for the Team view: how much each person finished in a range, from
 * all three places work lives (their tasks, client deliverables they own,
 * community tasks given to them), in three reads for the whole team rather
 * than a report snapshot per person. Server only.
 */

export type DoneCounts =
  | {
      ok: true;
      /** email → things done in the range. */
      counts: Record<string, number>;
      /** email → day → things done that day. */
      byDay: Record<string, Record<string, number>>;
    }
  | { ok: false; missing: boolean; message: string };

export async function doneCounts(emails: readonly string[], from: string, to: string): Promise<DoneCounts> {
  const wanted = new Set(emails.map((email) => email.toLowerCase()));
  const counts: Record<string, number> = Object.fromEntries([...wanted].map((email) => [email, 0]));
  const byDay: Record<string, Record<string, number>> = Object.fromEntries([...wanted].map((email) => [email, {}]));
  if (!wanted.size) return { ok: true, counts, byDay };
  const start = istMidnight(from);
  const end = istMidnight(addDays(to, 1));

  const deliverableQuery = new URLSearchParams({ select: "owner,published_at", status: "eq.published", limit: "5000" });
  deliverableQuery.append("published_at", `gte.${start}`);
  deliverableQuery.append("published_at", `lt.${end}`);
  const communityQuery = new URLSearchParams({ select: "owner,completed_at", status: "eq.done", limit: "5000" });
  communityQuery.append("completed_at", `gte.${start}`);
  communityQuery.append("completed_at", `lt.${end}`);

  const [tasks, deliverables, community] = await Promise.all([
    listTasks({ emails: [...wanted], from, to }),
    selectRows<{ owner: string | null; published_at: string | null }>("client_deliverables", deliverableQuery),
    selectRows<{ owner: string | null; completed_at: string | null }>("community_tasks", communityQuery),
  ]);
  if (!tasks.ok) return tasks;

  const add = (owner: string | null | undefined, day: string | null) => {
    const email = owner?.trim().toLowerCase();
    if (!email || !wanted.has(email)) return;
    counts[email] += 1;
    if (day) byDay[email][day] = (byDay[email][day] ?? 0) + 1;
  };
  for (const task of tasks.rows)
    if (task.status === "done" && task.done_on && task.done_on >= from && task.done_on <= to) add(task.email, task.done_on);
  // Client work and community are counted when they can be read; a hiccup
  // there leaves those out rather than hiding the whole team.
  if (deliverables.ok) for (const row of deliverables.rows) add(row.owner, istDay(row.published_at));
  else console.error(`[tasks] counting published deliverables failed: ${deliverables.message}`);
  if (community.ok) for (const row of community.rows) add(row.owner, istDay(row.completed_at));
  else console.error(`[tasks] counting done community tasks failed: ${community.message}`);
  return { ok: true, counts, byDay };
}
