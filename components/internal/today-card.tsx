import Link from "next/link";
import { ArrowRight, CalendarCheck, WarningCircle } from "@/components/internal/icons";
import { Card, CardTitle } from "@/components/internal/ui";
import { timeRange } from "@/lib/internal/calls/shared";
import type { TodayCall, TodayTask } from "@/lib/internal/overview-today";
import { dayLabel } from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";

type Loaded<T> = ({ ok: true } & T) | { ok: false };
export type TodayTasks = Loaded<{ items: TodayTask[]; more: number }>;
export type TodayCalls = Loaded<{ items: TodayCall[] }>;

/** No tasks due and no calls (a half someone doesn't have counts as empty; one that failed to load doesn't). */
export function todayIsEmpty(tasks: TodayTasks | null, calls: TodayCalls | null) {
  const noTasks = !tasks || (tasks.ok && tasks.items.length === 0 && !tasks.more);
  const noCalls = !calls || (calls.ok && calls.items.length === 0);
  return noTasks && noCalls;
}

/** A small heading inside the card, with a link to the full page. */
function Heading({ children, href, linkLabel }: { children: React.ReactNode; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-2">
      <h3 className="text-[12px] font-medium text-[var(--i-muted)]">{children}</h3>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-[12px] text-[var(--i-muted)] transition-colors hover:text-[var(--i-ink)]"
      >
        {linkLabel} <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function Empty({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className="flex items-center gap-2 px-5 py-2 text-[13px] text-[var(--i-muted)]">
      {error ? <WarningCircle size={15} className="shrink-0 text-[var(--i-faint)]" /> : null}
      {children}
    </p>
  );
}

/**
 * "Today" on the overview: your own tasks due (and late), then your calls,
 * in one card. Either half is left out for someone without that area.
 */
export function TodayCard({
  tasks,
  calls,
}: {
  tasks: TodayTasks | null;
  calls: TodayCalls | null;
}) {
  // A free day: one quiet line in the middle, not two empty halves.
  if (todayIsEmpty(tasks, calls)) {
    return (
      <Card className="flex min-h-0 flex-col">
        <CardTitle>
          <CalendarCheck size={15} />
          Today
        </CardTitle>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 pb-6 pt-2 text-center">
          <p className="text-[13.5px] text-[var(--i-muted)]">
            {tasks && calls ? "Nothing due today, and no calls." : tasks ? "Nothing due today, and nothing late." : "No calls today."}
          </p>
          <span className="flex items-center gap-4">
            {tasks ? (
              <Link href="/tasks" className="inline-flex items-center gap-1 text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
                All tasks <ArrowRight size={12} />
              </Link>
            ) : null}
            {calls ? (
              <Link href="/calls" className="inline-flex items-center gap-1 text-[12px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
                Calendar <ArrowRight size={12} />
              </Link>
            ) : null}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-0 flex-col">
      <CardTitle>
        <CalendarCheck size={15} />
        Today
      </CardTitle>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2 lg:max-h-[20rem]">
        {tasks ? (
          <section>
            <Heading href="/tasks" linkLabel="All tasks">
              Your tasks
            </Heading>
            {!tasks.ok ? (
              <Empty error>Couldn&apos;t load your tasks.</Empty>
            ) : tasks.items.length === 0 ? (
              <Empty>Nothing due today, and nothing late.</Empty>
            ) : (
              <ul>
                {tasks.items.map((task) => (
                  <li key={task.id}>
                    <Link href="/tasks" className="mx-2 flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-[var(--i-hover)]">
                      <span
                        aria-hidden
                        className={cn("size-1.5 shrink-0 rounded-full", task.late ? "bg-amber-500" : "bg-[var(--i-faint)]")}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{task.title}</span>
                      {task.blocked ? <span className="shrink-0 text-[12px] text-[var(--i-muted)]">Blocked</span> : null}
                      <span
                        className={cn(
                          "shrink-0 text-[12px] tabular-nums",
                          task.late ? "text-amber-700 dark:text-amber-300" : "text-[var(--i-muted)]",
                        )}
                      >
                        {task.late ? `Late · ${dayLabel(task.due_on)}` : "Today"}
                      </span>
                    </Link>
                  </li>
                ))}
                {tasks.more ? (
                  <li>
                    <Link
                      href="/tasks"
                      className="mx-2 block rounded-lg px-3 py-1.5 text-[12.5px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                    >
                      and {tasks.more} more
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        ) : null}

        {calls ? (
          <section className={tasks ? "mt-1 border-t border-[var(--i-line)] pt-1" : undefined}>
            <Heading href="/calls" linkLabel="Calendar">
              Your calls
            </Heading>
            {!calls.ok ? (
              <Empty error>Couldn&apos;t load your calls.</Empty>
            ) : calls.items.length === 0 ? (
              <Empty>No calls today.</Empty>
            ) : (
              <ul>
                {calls.items.map((call) => (
                  <li key={call.key} className="mx-2 flex items-center rounded-lg hover:bg-[var(--i-hover)]">
                    <Link
                      href="/calls?view=day"
                      className={cn("flex min-w-0 flex-1 items-center gap-3 px-3 py-1.5", call.over ? "opacity-55" : null)}
                    >
                      <span className="w-[6.5rem] shrink-0 text-[12.5px] tabular-nums text-[var(--i-muted)]">
                        {timeRange(call.start, call.minutes)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px]">{call.title}</span>
                      {call.over ? <span className="shrink-0 text-[12px] text-[var(--i-muted)]">Done</span> : null}
                    </Link>
                    {!call.over && /^https?:\/\//.test(call.link) ? (
                      <a
                        href={call.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-2 shrink-0 rounded-md px-2 py-1 text-[12.5px] font-medium text-[var(--i-accent-text)] hover:bg-[var(--i-accent-soft)]"
                      >
                        Join
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </Card>
  );
}
