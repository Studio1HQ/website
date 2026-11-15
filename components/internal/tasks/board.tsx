"use client";

import { useState, type DragEvent } from "react";
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
import { ForChip, type ForOption, type LogTarget } from "@/components/internal/tasks/kit";
import { displayName } from "@/lib/internal/team/shared";
import type { ClientsAccess } from "@/lib/internal/clients/rules";
import type { Deliverable } from "@/lib/internal/clients/schema";
import {
  TASK_STATUSES,
  communityColumn,
  communityStatusFor,
  deliverableColumn,
  type Column,
  type CommunityCard,
  type Task,
} from "@/lib/internal/tasks/shared";

/* The board: one person's work from three places in four columns. */

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

const TASK_DRAG = "application/x-studio1-task";
const COMMUNITY_DRAG = "application/x-studio1-community";

type Item =
  | { kind: "task"; column: Column; sort: string; data: BoardTask }
  | { kind: "deliverable"; column: Column; sort: string; data: BoardDeliverable }
  | { kind: "community"; column: Column; sort: string; data: CommunityCard };

function sortKey(blocked: boolean, due: string | null | undefined, title: string) {
  return `${blocked ? "0" : "1"}${due ?? "9999-99-99"}${title.toLowerCase()}`;
}

export function Board(props: BoardProps) {
  const { person, viewer, today } = props;
  const { pending, run } = useTeamAction();
  const [adding, setAdding] = useState(false);
  const [over, setOver] = useState<Column | null>(null);

  const items: Item[] = [
    ...props.tasks.map((data): Item => ({
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
    ...props.community.map((data): Item => ({
      kind: "community",
      column: communityColumn(data.status),
      sort: sortKey(data.status === "blocked", data.due_on, data.title),
      data,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  const canMoveCommunity = (card: CommunityCard) =>
    viewer.community === "manager" ||
    (viewer.community === "viewer" && (card.owner ?? "").toLowerCase() === viewer.email.toLowerCase());

  const drop = (column: Column) => (event: DragEvent) => {
    event.preventDefault();
    setOver(null);
    const task = event.dataTransfer.getData(TASK_DRAG);
    const community = event.dataTransfer.getData(COMMUNITY_DRAG);
    if (task) {
      const found = props.tasks.find((item) => item.task.id === task);
      if (found && found.task.status !== column) run(() => moveTask(task, column));
    } else if (community) {
      const status = communityStatusFor(column);
      const found = props.community.find((item) => item.id === community);
      if (!status) return;
      if (found && communityColumn(found.status) !== column) run(() => setQuickField("task", community, status));
    }
  };

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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((column) => {
            const list = items.filter((item) => item.column === column.value);
            return (
              <section
                key={column.value}
                aria-label={`${column.label}: ${list.length}`}
                onDragOver={(event) => {
                  const types = event.dataTransfer.types;
                  if (types.includes(TASK_DRAG) || (types.includes(COMMUNITY_DRAG) && column.value !== "review")) {
                    event.preventDefault();
                    setOver(column.value);
                  }
                }}
                onDragLeave={() => setOver((current) => (current === column.value ? null : current))}
                onDrop={drop(column.value)}
                className={cn(
                  "min-w-0 rounded-xl bg-[var(--i-sunken)] p-2 ring-1 ring-[var(--i-line)] transition-shadow",
                  over === column.value && "ring-2 ring-[var(--i-accent)]",
                  pending && "opacity-90",
                )}
              >
                <h2 className="flex items-center gap-2 px-2 pb-2 pt-1 text-[12.5px] font-medium text-[var(--i-ink-2)]">
                  <span aria-hidden className={cn("size-1.5 rounded-full", TONES[column.tone].dot)} />
                  {column.value === "done" ? "Done this week" : column.label}
                  <span className="ml-auto font-normal tabular-nums text-[var(--i-faint)]">{list.length}</span>
                </h2>
                {list.length ? (
                  <ul className="space-y-2">
                    {list.map((item) => (
                      <li key={`${item.kind}:${item.kind === "community" ? item.data.id : item.kind === "task" ? item.data.task.id : item.data.deliverable.id}`}>
                        {item.kind === "task" ? (
                          <TaskCard item={item.data} props={props} />
                        ) : item.kind === "deliverable" ? (
                          <ClientCard item={item.data} viewer={viewer} names={props.names} today={today} />
                        ) : (
                          <CommunityTaskCard card={item.data} today={today} canMove={canMoveCommunity(item.data)} />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 pb-2 text-[12.5px] text-[var(--i-faint)]">
                    {column.value === "todo" && props.canAdd ? "Nothing waiting. Add a task." : "Nothing here."}
                  </p>
                )}
              </section>
            );
          })}
      </div>

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

function TaskCard({ item, props }: { item: BoardTask; props: BoardProps }) {
  const { task, changeable } = item;
  const { pending, run } = useTeamAction();
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState(task.block_reason);
  const given = task.created_by && task.created_by.toLowerCase() !== task.email.toLowerCase();
  return (
    <article
      draggable={changeable}
      onDragStart={(event) => {
        event.dataTransfer.setData(TASK_DRAG, task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-colors hover:border-[var(--i-line-strong)]",
        changeable && "md:cursor-grab md:active:cursor-grabbing",
        task.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        pending && "opacity-60",
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
            onChange={(status) => run(() => moveTask(task.id, status))}
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
}: {
  card: CommunityCard;
  today: string;
  canMove: boolean;
}) {
  const { pending, run } = useTeamAction();
  return (
    <article
      draggable={canMove}
      onDragStart={(event) => {
        event.dataTransfer.setData(COMMUNITY_DRAG, card.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)]",
        canMove && "md:cursor-grab md:active:cursor-grabbing",
        card.status === "blocked" ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        pending && "opacity-60",
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
            onChange={(status) => run(() => setQuickField("task", card.id, status))}
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

