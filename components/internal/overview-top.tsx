import Link from "next/link";
import { ArrowRight, CheckCircle } from "@/components/internal/icons";
import { NeedsYou } from "@/components/internal/needs-you";
import { TodayCard, todayIsEmpty, type TodayCalls, type TodayTasks } from "@/components/internal/today-card";
import { Card } from "@/components/internal/ui";
import type { Attention } from "@/lib/internal/overview";
import { cn } from "@/lib/utils";

/**
 * The overview's top row: "Needs you" and your own day side by side, at the
 * same height. On a day with nothing in either, it shrinks to one slim
 * "All clear" line instead of two empty boxes.
 */
export function OverviewTop({
  todo,
  tasks,
  calls,
}: {
  todo: Attention[];
  tasks: TodayTasks | null;
  calls: TodayCalls | null;
}) {
  const hasToday = Boolean(tasks || calls);

  if (todo.length === 0 && todayIsEmpty(tasks, calls)) {
    return (
      <Card className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
        <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="min-w-0 flex-1 text-[13.5px]">
          <span className="font-medium">All clear.</span>{" "}
          <span className="text-[var(--i-muted)]">
            Nothing needs you{tasks ? ", nothing is due today" : ""}
            {calls ? " and there are no calls" : ""}.
          </span>
        </p>
        <span className="flex items-center gap-4">
          {tasks ? <QuietLink href="/tasks">All tasks</QuietLink> : null}
          {calls ? <QuietLink href="/calls">Calendar</QuietLink> : null}
        </span>
      </Card>
    );
  }

  return (
    <div className={cn("mb-4 grid gap-4", hasToday ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : null)}>
      <NeedsYou items={todo} />
      {hasToday ? <TodayCard tasks={tasks} calls={calls} /> : null}
    </div>
  );
}

function QuietLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] transition-colors hover:text-[var(--i-ink)]"
    >
      {children} <ArrowRight size={12} />
    </Link>
  );
}
