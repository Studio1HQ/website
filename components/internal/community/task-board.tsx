"use client";

import { useMemo, useState } from "react";
import {
  CalendarBlank,
  Megaphone,
  Buildings,
  Plus,
} from "@phosphor-icons/react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  daysBetween,
  isOwnedBy,
  labelOf,
  ownerName,
  todayKey,
  type RefOptions,
  type Task,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/internal/ui";
import { Select } from "@/components/internal/select";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { TaskCheck } from "@/components/internal/community/lists";
import {
  DueDate,
  Owner,
  Pill,
  TONES,
} from "@/components/internal/community/ui";

/**
 * The team's tasks as a board: To do, Doing, Blocked, Done. Filter to your
 * own, someone else's, or what's late; click a card to edit it.
 */

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function TaskBoard({
  tasks,
  me,
  canEdit,
  refs,
  owners,
  names,
}: {
  tasks: Task[];
  me: string;
  canEdit: boolean;
  refs: RefOptions;
  owners: string[];
  /** Event, sponsor and partner names by id, for the card links. */
  names: Record<string, string>;
}) {
  const today = todayKey();
  const [who, setWho] = useState<string>(canEdit ? "all" : "me");
  const [lateOnly, setLateOnly] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const people = useMemo(() => {
    const set = new Map<string, string>();
    for (const task of tasks)
      if (task.owner) set.set(task.owner.toLowerCase(), task.owner);
    return [...set.values()].sort((a, b) =>
      ownerName(a).localeCompare(ownerName(b)),
    );
  }, [tasks]);

  const shown = tasks.filter((task) => {
    if (who === "me" && !isOwnedBy(task.owner, me)) return false;
    if (who === "none" && task.owner) return false;
    if (
      who !== "all" &&
      who !== "me" &&
      who !== "none" &&
      task.owner?.toLowerCase() !== who
    )
      return false;
    if (
      lateOnly &&
      !(task.status !== "done" && task.due_on && task.due_on < today)
    )
      return false;
    // Done: the last 30 days only.
    if (
      task.status === "done" &&
      task.completed_at &&
      daysBetween(task.completed_at.slice(0, 10), today) > 30
    )
      return false;
    return true;
  });
  const late = tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.due_on &&
      task.due_on < today &&
      (who !== "me" || isOwnedBy(task.owner, me)),
  ).length;

  const sorted = (status: string) =>
    shown
      .filter((task) => task.status === status)
      .sort((a, b) =>
        status === "done"
          ? (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
          : (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") ||
            PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="task-owner-filter">
          Whose tasks
        </label>
        <Select
          id="task-owner-filter"
          size="sm"
          className="w-auto min-w-[10rem]"
          value={who}
          onChange={setWho}
          options={[
            { value: "all", label: "Everyone's tasks" },
            { value: "me", label: "My tasks" },
            { value: "none", label: "No owner" },
            ...people.map((owner) => ({
              value: owner.toLowerCase(),
              label: ownerName(owner),
            })),
          ]}
        />
        <button
          type="button"
          onClick={() => setLateOnly((value) => !value)}
          aria-pressed={lateOnly}
          className={cn(
            buttonClass(lateOnly ? "secondary" : "ghost", "md"),
            lateOnly && "ring-1 ring-rose-300 dark:ring-rose-500/40",
          )}
        >
          Late{" "}
          <span
            className={cn(
              "tabular-nums",
              late
                ? "text-rose-600 dark:text-rose-300"
                : "text-[var(--i-faint)]",
            )}
          >
            {late}
          </span>
        </button>
        {canEdit ? (
          <span className="ml-auto">
            <RecordDialog
              entity="task"
              refs={refs}
              owners={owners}
              defaults={{
                owner:
                  who !== "all" && who !== "none"
                    ? who === "me"
                      ? me
                      : who
                    : "",
              }}
              trigger={
                <button type="button" className={buttonClass("accent")}>
                  <Plus size={14} /> New task
                </button>
              }
            />
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((column) => {
          const items = sorted(column.value);
          return (
            <section
              key={column.value}
              aria-label={column.label}
              className="min-w-0 rounded-xl bg-[var(--i-sunken)] p-2 ring-1 ring-[var(--i-line)]"
            >
              <h2 className="flex items-center gap-2 px-2 pb-2 pt-1 text-[12.5px] font-medium text-[var(--i-ink-2)]">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    TONES[column.tone ?? "stone"].dot,
                  )}
                />
                {column.label}
                <span className="tabular-nums text-[var(--i-faint)]">
                  {items.length}
                </span>
                {column.value === "done" ? (
                  <span className="ml-auto font-normal text-[var(--i-faint)]">
                    last 30 days
                  </span>
                ) : null}
              </h2>
              <ul className="space-y-2">
                {items.map((task) => {
                  const links = [
                    task.event_id
                      ? { icon: CalendarBlank, name: names[task.event_id] }
                      : null,
                    task.sponsor_id
                      ? { icon: Megaphone, name: names[task.sponsor_id] }
                      : null,
                    task.partner_id
                      ? { icon: Buildings, name: names[task.partner_id] }
                      : null,
                  ].filter(
                    (
                      item,
                    ): item is { icon: typeof CalendarBlank; name: string } =>
                      Boolean(item?.name),
                  );
                  const canMove = canEdit || isOwnedBy(task.owner, me);
                  return (
                    <li
                      key={task.id}
                      className="rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]"
                    >
                      <div className="flex items-start gap-1.5 px-2 pt-2">
                        <TaskCheck task={task} canMove={canMove} />
                        <button
                          type="button"
                          onClick={() => setEditing(task)}
                          className={cn(
                            "min-w-0 flex-1 pt-0.5 text-left text-[13px] leading-snug hover:text-[var(--i-accent-text)]",
                            task.status === "done" &&
                              "text-[var(--i-muted)] line-through",
                          )}
                        >
                          {task.title}
                        </button>
                      </div>
                      {links.length ? (
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-3 pt-1 text-[11.5px] text-[var(--i-muted)]">
                          {links.map(({ icon: LinkIcon, name }) => (
                            <span
                              key={name}
                              className="inline-flex min-w-0 items-center gap-1"
                            >
                              <LinkIcon size={11} className="shrink-0" />
                              <span className="truncate">{name}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 px-3 pb-2 pt-2 text-[12px]">
                        <span className="min-w-0 flex-1 truncate">
                          <Owner owner={task.owner} />
                        </span>
                        {task.priority === "urgent" ||
                        task.priority === "high" ? (
                          <Pill
                            tone={task.priority === "urgent" ? "rose" : "amber"}
                          >
                            {labelOf(TASK_PRIORITIES, task.priority)}
                          </Pill>
                        ) : null}
                        <DueDate
                          day={task.due_on}
                          done={task.status === "done"}
                          today={today}
                        />
                      </div>
                      {canMove ? (
                        <div className="border-t border-[var(--i-line)] px-2 py-1.5">
                          <QuickSelect
                            entity="task"
                            id={task.id}
                            value={task.status}
                            canEdit
                            label={`Move "${task.title}"`}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {items.length === 0 ? (
                <p className="px-2 pb-2 text-[12.5px] text-[var(--i-faint)]">
                  Nothing here.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <RecordDialog
        entity="task"
        record={editing ?? undefined}
        refs={refs}
        owners={owners}
        readOnly={!canEdit}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
      />
    </>
  );
}
