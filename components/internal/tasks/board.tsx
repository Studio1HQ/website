"use client";

import { useOptimistic, useState, type ReactNode } from "react";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Plus, Prohibit, UserCircle } from "@phosphor-icons/react";
import { blockTask, moveTask } from "@/app/internal/(dashboard)/tasks/actions";
import { setQuickField } from "@/app/internal/(dashboard)/community/actions";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { DueDate, Pill, TONES } from "@/components/internal/community/ui";
import { Select } from "@/components/internal/select";
import { Label, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { DeliverableCard } from "@/components/internal/clients/deliverable-card";
import { StatusBadge } from "@/components/internal/clients/ui";
import { TaskDialog } from "@/components/internal/tasks/task-dialog";
import { TaskNote } from "@/components/internal/tasks/task-note";
import { ForChip, type ForOption, type LogTarget } from "@/components/internal/tasks/kit";
import { cardAnnouncements, dragHandlers, underPointer, useCardSensors } from "@/components/internal/tasks/drag";
import { displayName } from "@/lib/internal/team/shared";
import type { ClientsAccess } from "@/lib/internal/clients/rules";
import type { Deliverable } from "@/lib/internal/clients/schema";
import {
  TASK_STATUSES,
  communityColumn,
  communityStatusFor,
  deliverableColumn,
  isTaskStatus,
  type Column,
  type CommunityCard,
  type Task,
} from "@/lib/internal/tasks/shared";

/* The board: one person's work from three places in four columns. Drag a
   task (or a community task) to another column, or pick one on the card:
   it moves at once and the save follows; a failed save puts it back. */

export type BoardDeliverable = {
  deliverable: Deliverable;
  clientName: string;
  clientSlug?: string;
  engagementName: string;
  internal: boolean;
  forLabel: string;
};

export type BoardTask = { task: Task; forLabel: string; client: boolean; changeable: boolean };

export type BoardProps = {
  person: { email: string; name: string; own: boolean };
  viewer: { email: string; clients: ClientsAccess | null; community: "manager" | "viewer" | null };
  /** May the viewer add tasks to this board. */
  canAdd: boolean;
  today: string;
  tasks: BoardTask[];
  deliverables: BoardDeliverable[];
  reviewing: BoardDeliverable[];
  community: CommunityCard[];
  forOptions: ForOption[];
  /** The person's open client deliverables, for a task's "Part of" (own board only). */
  targets: LogTarget[];
  /** email → name, for owners on client cards. */
  names: Record<string, string>;
};

type Item =
  | { kind: "task"; column: Column; sort: string; data: BoardTask }
  | { kind: "deliverable"; column: Column; sort: string; data: BoardDeliverable }
  | { kind: "community"; column: Column; sort: string; data: CommunityCard };

/** What's being dragged: one of the person's tasks, or a community task. */
type Lifted = { kind: "task"; item: BoardTask } | { kind: "community"; card: CommunityCard };

function sortKey(blocked: boolean, due: string | null | undefined, title: string) {
  return `${blocked ? "0" : "1"}${due ?? "9999-99-99"}${title.toLowerCase()}`;
}

export function Board(props: BoardProps) {
  const { person, viewer, today } = props;
  const { run } = useTeamAction();
  const sensors = useCardSensors();
  const [adding, setAdding] = useState(false);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  /** Cards moved and still saving ("task:id" / "community:id" → new status): they show in their new column already. */
  const [moved, show] = useOptimistic<Record<string, string>, { key: string; status: string }>({}, (state, next) => ({
    ...state,
    [next.key]: next.status,
  }));

  const tasks = props.tasks.map((item): BoardTask => {
    const status = moved[`task:${item.task.id}`];
    return status && isTaskStatus(status) ? { ...item, task: { ...item.task, status } } : item;
  });
  const community = props.community.map((card): CommunityCard => {
    const status = moved[`community:${card.id}`];
    return status ? { ...card, status } : card;
  });

  const items: Item[] = [
    ...tasks.map((data): Item => ({
      kind: "task",
      column: data.task.status,
      sort: sortKey(data.task.blocked, data.task.due_on, data.task.title),
      data,
    })),
    ...props.deliverables.map((data): Item => ({
      kind: "deliverable",
      column: deliverableColumn(data.deliverable.status),
      sort: sortKey(data.deliverable.blocked, data.deliverable.due_on, data.deliverable.title),
      data,
    })),
    ...community.map((data): Item => ({
      kind: "community",
      column: communityColumn(data.status),
      sort: sortKey(data.status === "blocked", data.due_on, data.title),
      data,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  const canMoveCommunity = (card: CommunityCard) =>
    viewer.community === "manager" ||
    (viewer.community === "viewer" && (card.owner ?? "").toLowerCase() === viewer.email.toLowerCase());

  const moveTaskTo = (item: BoardTask, to: Column) => {
    if (item.task.status === to) return;
    run(() => {
      show({ key: `task:${item.task.id}`, status: to });
      return moveTask(item.task.id, to);
    });
  };

  const moveCommunity = (card: CommunityCard, status: string) => {
    if (card.status === status) return;
    run(() => {
      show({ key: `community:${card.id}`, status });
      return setQuickField("task", card.id, status);
    });
  };

  /** The column a dragged card sits in now. */
  const home = (what: Lifted) => (what.kind === "task" ? what.item.task.status : communityColumn(what.card.status));

  /** Whether a dragged card may land in a column (the community list has no "In review"). */
  const fits = (what: Lifted | null, column: Column) =>
    !!what &&
    home(what) !== column &&
    (what.kind === "task" ? what.item.changeable : canMoveCommunity(what.card) && communityStatusFor(column) !== null);

  const drop = ({ active, over }: DragEndEvent) => {
    setLifted(null);
    const what = active.data.current as Lifted | undefined;
    const column = over?.id;
    if (!what || !isTaskStatus(column) || !fits(what, column)) return;
    if (what.kind === "task") moveTaskTo(what.item, column);
    else moveCommunity(what.card, communityStatusFor(column) ?? what.card.status);
  };

  const titleOf = (id: string | number) =>
    typeof id === "string"
      ? (props.tasks.find((item) => `task:${item.task.id}` === id)?.task.title ??
        props.community.find((card) => `community:${card.id}` === id)?.title)
      : undefined;
  const announcements = cardAnnouncements(titleOf, (id) => TASK_STATUSES.find((column) => column.value === id)?.label);

  const doneCount = items.filter((item) => item.column === "done").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[13px] text-[var(--i-muted)]">
          This week: <span className="font-medium text-[var(--i-ink)] tabular-nums">{doneCount}</span> done
        </p>
        {props.canAdd ? (
          <button type="button" className={buttonClass("primary")} onClick={() => setAdding(true)}>
            <Plus size={14} /> {person.own ? "Add task" : `Add a task for ${person.name.split(" ")[0]}`}
          </button>
        ) : null}
      </div>

      {props.reviewing.length ? (
        <section aria-label="Waiting on your review" className="rounded-xl bg-violet-50/60 p-2 ring-1 ring-violet-200 dark:bg-violet-500/5 dark:ring-violet-500/25">
          <h2 className="px-2 pb-2 pt-1 text-[12.5px] font-medium text-[var(--i-ink-2)]">
            Waiting on {person.own ? "your" : "their"} review · {props.reviewing.length}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {props.reviewing.map((item) => (
              <li key={item.deliverable.id}>
                <ClientCard item={item} viewer={viewer} names={props.names} today={today} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={underPointer}
        accessibility={{ announcements }}
        onDragStart={({ active }) => setLifted((active.data.current as Lifted | undefined) ?? null)}
        onDragCancel={() => setLifted(null)}
        onDragEnd={drop}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((column) => {
            const list = items.filter((item) => item.column === column.value);
            return (
              <BoardColumn
                key={column.value}
                column={column}
                count={list.length}
                fits={fits(lifted, column.value)}
                dimmed={!!lifted && !fits(lifted, column.value) && home(lifted) !== column.value}
              >
                {list.length ? (
                  <ul className="space-y-2">
                    {list.map((item) => (
                      <li key={`${item.kind}:${item.kind === "community" ? item.data.id : item.kind === "task" ? item.data.task.id : item.data.deliverable.id}`}>
                        {item.kind === "task" ? (
                          <TaskCard item={item.data} props={props} onMove={(to) => moveTaskTo(item.data, to)} />
                        ) : item.kind === "deliverable" ? (
                          <ClientCard item={item.data} viewer={viewer} names={props.names} today={today} />
                        ) : (
                          <CommunityTaskCard
                            card={item.data}
                            today={today}
                            canMove={canMoveCommunity(item.data)}
                            onMove={(status) => moveCommunity(item.data, status)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 pb-2 text-[12.5px] text-[var(--i-faint)]">
                    {column.value === "todo" && props.canAdd ? "Nothing waiting. Add a task." : "Nothing here."}
                  </p>
                )}
              </BoardColumn>
            );
          })}
        </div>

        {/* The lifted card follows the pointer; its place stays faded until it's dropped. */}
        <DragOverlay dropAnimation={null}>{lifted ? <LiftedCard what={lifted} /> : null}</DragOverlay>
      </DndContext>

      {props.canAdd ? (
        <TaskDialog
          open={adding}
          onOpenChange={setAdding}
          person={person}
          forOptions={props.forOptions}
          deliverables={props.targets.filter((target) => target.kind === "deliverable")}
          canClients={viewer.clients !== null}
          canCommunity={viewer.community === "manager"}
          today={today}
        />
      ) : null}
    </div>
  );
}

/** A column of the board, and a place to drop cards while one is dragged. */
function BoardColumn({
  column,
  count,
  fits,
  dimmed,
  children,
}: {
  column: (typeof TASK_STATUSES)[number];
  count: number;
  /** The dragged card may land here. */
  fits: boolean;
  /** A card is dragged and can't go here. */
  dimmed: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.value });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label}: ${count}`}
      className={cn(
        "min-w-0 rounded-xl bg-[var(--i-sunken)] p-2 ring-1 ring-[var(--i-line)] transition-[background-color,box-shadow,opacity] duration-150",
        isOver && fits && "bg-[var(--i-accent-soft)] ring-2 ring-[var(--i-accent)]",
        dimmed && "opacity-50",
      )}
    >
      <h2 className="flex items-center gap-2 px-2 pb-2 pt-1 text-[12.5px] font-medium text-[var(--i-ink-2)]">
        <span aria-hidden className={cn("size-1.5 rounded-full", TONES[column.tone].dot)} />
        {column.value === "done" ? "Done this week" : column.label}
        <span className="ml-auto font-normal tabular-nums text-[var(--i-faint)]">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/** The copy of a card that follows the pointer while it's dragged. */
function LiftedCard({ what }: { what: Lifted }) {
  const title = what.kind === "task" ? what.item.task.title : what.card.title;
  const status = what.kind === "task" ? TASK_STATUSES.find((option) => option.value === what.item.task.status) : null;
  return (
    <article className="flex cursor-grabbing flex-col gap-2 rounded-xl border border-[var(--i-line-strong)] bg-[var(--i-panel)] p-3 shadow-[0_12px_28px_-8px_rgb(0_0_0/0.3)] [transform:rotate(1.5deg)]">
      <div className="min-w-0 space-y-1">
        {what.kind === "task" ? <ForChip label={what.item.forLabel} client={what.item.client} /> : <ForChip label="Community task list" />}
        <p className="text-[13.5px] font-medium leading-snug">{title}</p>
      </div>
      {status ? (
        <div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
      ) : null}
    </article>
  );
}

/** A client deliverable: the client board's own card when the viewer can open client work. */
function ClientCard({
  item,
  viewer,
  names,
  today,
}: {
  item: BoardDeliverable;
  viewer: BoardProps["viewer"];
  names: Record<string, string>;
  today: string;
}) {
  if (viewer.clients) {
    return (
      <DeliverableCard
        deliverable={item.deliverable}
        viewer={{ email: viewer.email, clients: viewer.clients }}
        clientName={item.clientName}
        clientSlug={item.clientSlug}
        engagementName={item.engagementName}
        internal={item.internal}
        names={names}
        today={today}
      />
    );
  }
  return (
    <article className={cn("rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)]", item.deliverable.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]")}>
      <ForChip label={item.forLabel} client={!item.internal} />
      <p className="mt-1.5 text-[13.5px] font-medium leading-snug">{item.deliverable.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={item.deliverable.status} />
        {item.deliverable.due_on ? (
          <span className="text-[12px]">
            <DueDate day={item.deliverable.due_on} done={item.deliverable.status === "published"} today={today} />
          </span>
        ) : null}
      </div>
    </article>
  );
}

function TaskCard({ item, props, onMove }: { item: BoardTask; props: BoardProps; onMove: (to: Column) => void }) {
  const { task, changeable } = item;
  const { pending, run } = useTeamAction();
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState(task.block_reason);
  const given = task.created_by && task.created_by.toLowerCase() !== task.email.toLowerCase();
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { kind: "task", item } satisfies Lifted,
    disabled: !changeable,
  });
  return (
    <article
      ref={setNodeRef}
      {...dragHandlers(listeners)}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-[border-color,opacity] hover:border-[var(--i-line-strong)]",
        // Hold to drag on a phone: no text selection or callout getting in the way.
        changeable && "touch-manipulation select-none [-webkit-touch-callout:none] md:cursor-grab",
        task.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        pending && "opacity-60",
        isDragging && "opacity-40",
      )}
    >
      <div className="min-w-0 space-y-1">
        <ForChip label={item.forLabel} client={item.client} />
        {changeable ? (
          <button type="button" onClick={() => setEditing(true)} className="block w-full text-left text-[13.5px] font-medium leading-snug hover:text-[var(--i-accent-text)]">
            {task.title}
          </button>
        ) : (
          <p className="text-[13.5px] font-medium leading-snug">{task.title}</p>
        )}
        {task.notes ? <TaskNote text={task.notes} /> : null}
        {task.blocked ? (
          <p className="text-[12px] text-rose-700 dark:text-rose-300">
            <Prohibit size={12} className="mr-1 inline" />
            {task.block_reason}
          </p>
        ) : null}
        {given ? (
          <p className="flex items-center gap-1 text-[11.5px] text-[var(--i-faint)]">
            <UserCircle size={12} /> From {props.names[task.created_by.toLowerCase()] ?? displayName({ email: task.created_by })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {changeable ? (
          <Select
            aria-label={`Move ${task.title}`}
            size="xs"
            value={task.status}
            onChange={onMove}
            options={TASK_STATUSES.map((option) => ({ value: option.value, label: option.label }))}
            className="w-[7.5rem]"
          />
        ) : (
          <Pill tone={TASK_STATUSES.find((option) => option.value === task.status)?.tone}>
            {TASK_STATUSES.find((option) => option.value === task.status)?.label}
          </Pill>
        )}
        {task.due_on ? (
          <span className="text-[12px]">
            <DueDate day={task.due_on} done={task.status === "done"} today={props.today} />
          </span>
        ) : null}
        {changeable && task.status !== "done" ? (
          <button
            type="button"
            onClick={() => setBlocking(true)}
            aria-label={task.blocked ? "Blocked: change or unblock" : "Mark as blocked"}
            title={task.blocked ? "Blocked: change or unblock" : "Mark as blocked"}
            className={cn("ml-auto flex size-7 items-center justify-center rounded-md hover:bg-[var(--i-hover)]", task.blocked ? "text-rose-600 dark:text-rose-300" : "text-[var(--i-faint)]")}
          >
            <Prohibit size={14} />
          </button>
        ) : null}
      </div>
      {changeable ? (
        <TaskDialog
          open={editing}
          onOpenChange={setEditing}
          task={task}
          person={props.person}
          forOptions={props.forOptions}
          deliverables={props.targets.filter((target) => target.kind === "deliverable")}
          canClients={props.viewer.clients !== null}
          canCommunity={false}
          today={props.today}
        />
      ) : null}
      {changeable ? (
        <TeamDialog
          open={blocking}
          onOpenChange={setBlocking}
          title={task.blocked ? "Blocked" : "Mark as blocked"}
          description="What is it waiting for? It shows on the card and in your report."
          footer={
            <>
              {task.blocked ? (
                <button type="button" className={buttonClass("ghost")} disabled={pending} onClick={() => run(() => blockTask(task.id, ""), () => setBlocking(false))}>
                  Unblock
                </button>
              ) : null}
              <span className="flex-1" />
              <button type="button" className={buttonClass("ghost")} onClick={() => setBlocking(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={buttonClass("primary")}
                disabled={pending || !reason.trim()}
                onClick={() => run(() => blockTask(task.id, reason), () => setBlocking(false))}
              >
                Save
              </button>
            </>
          }
        >
          <Label label="Waiting for">
            <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Access to the repo from the client" className={inputClass()} />
          </Label>
        </TeamDialog>
      ) : null}
    </article>
  );
}

const COMMUNITY_STATUSES = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
] as const;

function CommunityTaskCard({
  card,
  today,
  canMove,
  onMove,
}: {
  card: CommunityCard;
  today: string;
  canMove: boolean;
  onMove: (status: string) => void;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `community:${card.id}`,
    data: { kind: "community", card } satisfies Lifted,
    disabled: !canMove,
  });
  return (
    <article
      ref={setNodeRef}
      {...dragHandlers(listeners)}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-opacity",
        canMove && "touch-manipulation select-none [-webkit-touch-callout:none] md:cursor-grab",
        card.status === "blocked" ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        isDragging && "opacity-40",
      )}
    >
      <div className="min-w-0 space-y-1">
        <ForChip label="Community task list" />
        <p className="text-[13.5px] font-medium leading-snug">{card.title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canMove ? (
          <Select
            aria-label={`Move ${card.title}`}
            size="xs"
            value={COMMUNITY_STATUSES.some((option) => option.value === card.status) ? card.status : "todo"}
            onChange={onMove}
            options={COMMUNITY_STATUSES.map((option) => ({ value: option.value, label: option.label }))}
            className="w-[7.5rem]"
          />
        ) : (
          <Pill tone={card.status === "done" ? "emerald" : card.status === "blocked" ? "rose" : card.status === "doing" ? "sky" : "stone"}>
            {COMMUNITY_STATUSES.find((option) => option.value === card.status)?.label ?? "To do"}
          </Pill>
        )}
        {card.due_on ? (
          <span className="text-[12px]">
            <DueDate day={card.due_on} done={card.status === "done"} today={today} />
          </span>
        ) : null}
      </div>
    </article>
  );
}

