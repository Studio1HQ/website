"use client";

import { useOptimistic, useState, type ReactNode } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { ArrowUpRight, DotsThree, PencilSimple, Plus, Prohibit, UserCircle, UsersThree } from "@/components/internal/icons";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { blockTask as blockTaskAction, moveTask as moveTaskAction } from "@/app/internal/(dashboard)/tasks/actions";
import { setQuickField as setQuickFieldAction } from "@/app/internal/(dashboard)/community/actions";
import { cn } from "@/lib/utils";
import { ExternalLink, buttonClass, inputClass, menuContentClass, menuItemClass } from "@/components/internal/ui";
import { DueDate, Pill } from "@/components/internal/community/ui";
import { Select } from "@/components/internal/select";
import { Label, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { BlockDialog } from "@/components/internal/clients/block-dialog";
import { DeliverableDialog } from "@/components/internal/clients/deliverable-dialog";
import { KindIcon } from "@/components/internal/clients/kind-icon";
import { MoveStatusMenu } from "@/components/internal/clients/move-status-menu";
import { canChangeDeliverable, isLate as isDeliverableLate, isWaitingOnClient } from "@/lib/internal/clients/rules";
import { TaskDialog } from "@/components/internal/tasks/task-dialog";
import { TaskNote } from "@/components/internal/tasks/task-note";
import { PriorityMark } from "@/components/internal/tasks/priority";
import { withLabel } from "@/components/internal/tasks/with-picker";
import { ForChip, type ForOption, type LogTarget } from "@/components/internal/tasks/kit";
import { StatusMenuItems, StatusPill, TonePill } from "@/components/internal/tasks/status-pill";
import { cardAnnouncements, dragHandlers, underPointer, useCardSensors } from "@/components/internal/tasks/drag";
import { displayName } from "@/lib/internal/team/shared";
import type { ClientsAccess } from "@/lib/internal/clients/rules";
import { DELIVERABLE_KINDS, DELIVERABLE_STATUSES, clientPath, labelOf, statusLabel, toneOf, type Deliverable } from "@/lib/internal/clients/schema";
import {
  TASK_STATUSES,
  communityColumn,
  communityStatusFor,
  deliverableColumn,
  isOwed,
  isTaskLate,
  isTaskStatus,
  peopleOn,
  priorityRank,
  type Column,
  type CommunityCard,
  type Task,
  type Teammate,
  type Tone,
} from "@/lib/internal/tasks/shared";
import { guarded } from "@/components/internal/guarded";

// A save that never reached the server answers { ok: false } here, so the open form stays (guarded).
const blockTask = guarded(blockTaskAction);
const moveTask = guarded(moveTaskAction);
const setQuickField = guarded(setQuickFieldAction);

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
  /** Everyone active on the team list: who a task can be shared with. */
  team: Teammate[];
};

type Item =
  | { kind: "task"; column: Column; sort: string; data: BoardTask }
  | { kind: "deliverable"; column: Column; sort: string; data: BoardDeliverable }
  | { kind: "community"; column: Column; sort: string; data: CommunityCard };

/** What's being dragged: one of the person's tasks, or a community task. */
type Lifted = { kind: "task"; item: BoardTask } | { kind: "community"; card: CommunityCard };

/** Within a column: Top priority first and Low last (client cards count as Medium), then blocked, then by due date. */
function sortKey(rank: number, blocked: boolean, due: string | null | undefined, title: string) {
  return `${rank}${blocked ? "0" : "1"}${due ?? "9999-99-99"}${title.toLowerCase()}`;
}

/** A community task's priority (low / normal / high / urgent) on the same 0–2 scale. */
function communityRank(priority: string) {
  return priority === "urgent" || priority === "high" ? 0 : priority === "low" ? 2 : 1;
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
      sort: sortKey(priorityRank(data.task.priority), data.task.blocked, data.task.due_on, data.task.title),
      data,
    })),
    ...props.deliverables.map((data): Item => ({
      kind: "deliverable",
      column: deliverableColumn(data.deliverable.status),
      sort: sortKey(1, data.deliverable.blocked, data.deliverable.due_on, data.deliverable.title),
      data,
    })),
    ...community.map((data): Item => ({
      kind: "community",
      column: communityColumn(data.status),
      sort: sortKey(communityRank(data.priority), data.status === "blocked", data.due_on, data.title),
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
  // The bar across the top: how far the week has got, and what needs a look.
  // Late is what each card says: a task in review is handed in, so it isn't.
  const facts = items.map((item) =>
    item.kind === "task"
      ? { late: isTaskLate(item.data.task, today), blocked: item.data.task.blocked }
      : item.kind === "deliverable"
        ? { late: isDeliverableLate(item.data.deliverable, today), blocked: item.data.deliverable.blocked }
        : { late: item.data.status !== "done" && !!item.data.due_on && item.data.due_on < today, blocked: item.data.status === "blocked" },
  );
  const open = items.filter((item) => item.column !== "done");
  const lateCount = facts.filter((fact) => fact.late).length;
  const blockedCount = items.filter((item, index) => item.column !== "done" && facts[index].blocked).length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* The week on one line: progress on the left, the counts as small
          pills, then Add task. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] px-5 py-3.5 shadow-[var(--i-shadow-sm)] dark:border-transparent">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline gap-2 text-[13px]">
            <span className="font-medium">{person.own ? "This week" : `${person.name.split(" ")[0]}'s week`}</span>
            <span className="text-[12px] text-[var(--i-faint)]">{weekRange(today)}</span>
            <span className="ml-auto text-[12.5px] tabular-nums text-[var(--i-muted)]">
              <span className="font-medium text-[var(--i-ink)]">{doneCount}</span> of {items.length} done
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Done this week"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--i-track)]"
          >
            <div className="h-full rounded-full bg-[var(--i-bar)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { label: "open", value: open.length, tone: "bg-black/[0.05] text-[var(--i-ink-2)] dark:bg-white/[0.08]" },
            { label: "late", value: lateCount, tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
            { label: "blocked", value: blockedCount, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
          ].map((stat) => (
            <span
              key={stat.label}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full px-3 text-[12.5px]",
                stat.value ? stat.tone : "bg-black/[0.04] text-[var(--i-faint)] dark:bg-white/[0.05]",
              )}
            >
              <span className="font-medium tabular-nums">{stat.value}</span> {stat.label}
            </span>
          ))}
        </div>
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
                <ClientCard item={item} viewer={viewer} names={props.names} today={today} showOwner />
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
          team={props.team}
        />
      ) : null}
    </div>
  );
}

/** "24–30 Nov" (or "28 Nov – 4 Dec"): Monday to Sunday of the week `today` is in. */
function weekRange(today: string) {
  const date = new Date(`${today}T00:00:00`);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const month = (value: Date) => value.toLocaleString("en-GB", { month: "short" });
  return monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}–${sunday.getDate()} ${month(sunday)}`
    : `${monday.getDate()} ${month(monday)} – ${sunday.getDate()} ${month(sunday)}`;
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
      <h2 className="flex items-center gap-2 px-1 pb-2.5 pt-1">
        <StatusPill status={column.value} label={column.value === "done" ? "Done this week" : column.label} />
        <span className="ml-auto pr-1 text-[12.5px] tabular-nums text-[var(--i-faint)]">{count}</span>
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

/**
 * A client piece (from client work, read here, never copied), shaped like a
 * task card so the board reads as one list: what kind it is and its title,
 * a blocked line when it's stuck, then one quiet line with the client, its
 * status (a menu for whoever may move it), the due date and whether it's
 * waiting on the client. The title opens it; ⋯ has block and the client page.
 */
function ClientCard({
  item,
  viewer,
  names,
  today,
  showOwner = false,
}: {
  item: BoardDeliverable;
  viewer: BoardProps["viewer"];
  names: Record<string, string>;
  today: string;
  /** Someone else's piece (waiting on this person's review): say whose. */
  showOwner?: boolean;
}) {
  const { deliverable } = item;
  const [opened, setOpened] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const access = viewer.clients;
  const canChange = access ? canChangeDeliverable({ email: viewer.email, clients: access }, deliverable) : false;
  const published = deliverable.status === "published";
  const waiting = isWaitingOnClient(deliverable, today);
  const page = item.clientSlug ? clientPath(item.clientSlug) : null;
  const owner = deliverable.owner ? (names[deliverable.owner.toLowerCase()] ?? displayName({ email: deliverable.owner })) : null;
  const heading = (
    <>
      <span title={labelOf(DELIVERABLE_KINDS, deliverable.kind)} className="mt-[3px] shrink-0">
        <KindIcon kind={deliverable.kind} size={13} />
      </span>
      <span className="min-w-0">{deliverable.title}</span>
    </>
  );
  const headingClass = "flex w-full items-start gap-1.5 text-left text-[13.5px] font-medium leading-snug";

  return (
    <article
      className={cn(
        "group/card flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-colors hover:border-[var(--i-line-strong)]",
        deliverable.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {access ? (
            <button type="button" onClick={() => setOpened(true)} className={cn(headingClass, "hover:text-[var(--i-accent-text)]")}>
              {heading}
            </button>
          ) : page ? (
            <Link href={page} className={cn(headingClass, "hover:text-[var(--i-accent-text)]")}>
              {heading}
            </Link>
          ) : (
            <p className={headingClass}>{heading}</p>
          )}
        </div>
        {(canChange && !published) || page ? (
          <Menu.Root>
            <Menu.Trigger
              aria-label={`Options for ${deliverable.title}`}
              className="-mr-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--i-faint)] opacity-0 outline-none transition-opacity hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)] focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <DotsThree size={18} weight="bold" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="end" sideOffset={4} className={menuContentClass}>
                {canChange && !published ? (
                  <Menu.Item onSelect={() => setBlocking(true)} className={menuItemClass}>
                    <Prohibit size={14} /> {deliverable.blocked ? "Change or unblock" : "Mark as blocked"}
                  </Menu.Item>
                ) : null}
                {page ? (
                  <Menu.Item asChild className={menuItemClass}>
                    <Link href={page}>
                      <ArrowUpRight size={14} /> Open {item.internal ? "Studio1's" : `${item.clientName}'s`} page
                    </Link>
                  </Menu.Item>
                ) : null}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        ) : null}
      </div>

      {deliverable.blocked ? (
        <p className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-1 text-[12px] text-rose-700 dark:text-rose-300">
          <Prohibit size={12} className="shrink-0" />
          <span className="min-w-0 truncate">
            {deliverable.waits_on === "client" ? "Waiting on the client" : "Blocked"}
            {deliverable.block_reason ? `: ${deliverable.block_reason}` : ""}
          </span>
        </p>
      ) : null}

      {/* One quiet line, like a task's: the client, where it stands, when it's due. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--i-muted)]">
        <ForChip label={item.forLabel} client={!item.internal} />
        {access ? (
          <MoveStatusMenu deliverable={deliverable} internal={item.internal} canChange={canChange} />
        ) : (
          <TonePill tone={toneOf(DELIVERABLE_STATUSES, deliverable.status) as Tone} label={statusLabel(deliverable.status, deliverable.kind)} small />
        )}
        {deliverable.due_on && !published ? (
          // In client review the date is the client's to meet: the plain date, never "late".
          <DueDate day={deliverable.due_on} done={deliverable.status === "client_review"} today={today} />
        ) : null}
        {waiting ? <span className="text-amber-700 dark:text-amber-300">Waiting on the client</span> : null}
        {showOwner && owner ? (
          <span className="inline-flex items-center gap-1 text-[var(--i-faint)]">
            <UserCircle size={12} /> {owner}
          </span>
        ) : null}
        {published && deliverable.published_url ? (
          <ExternalLink href={deliverable.published_url} className="text-[12px]">
            Live
          </ExternalLink>
        ) : null}
      </div>

      {access ? (
        <DeliverableDialog
          deliverable={deliverable}
          access={access}
          canChange={canChange}
          names={names}
          open={opened}
          onOpenChange={setOpened}
        />
      ) : null}
      {canChange ? <BlockDialog deliverable={deliverable} open={blocking} onOpenChange={setBlocking} /> : null}
    </article>
  );
}

function TaskCard({ item, props, onMove }: { item: BoardTask; props: BoardProps; onMove: (to: Column) => void }) {
  const { task, changeable } = item;
  const { pending, run } = useTeamAction();
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState(task.block_reason);
  const person = props.person.email.toLowerCase();
  // From someone else, on the person's own task; shared ones say who else is on them instead.
  const given = task.created_by && task.created_by.toLowerCase() !== task.email.toLowerCase() && task.email.toLowerCase() === person;
  const others = peopleOn(task).filter((email) => email !== person);
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
        "group/card flex flex-col gap-2 rounded-xl border bg-[var(--i-panel)] p-3 shadow-[var(--i-shadow-sm)] transition-[border-color,opacity] hover:border-[var(--i-line-strong)]",
        // Hold to drag on a phone: no text selection or callout getting in the way.
        changeable && "touch-manipulation select-none [-webkit-touch-callout:none] md:cursor-grab",
        task.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        pending && "opacity-60",
        isDragging && "opacity-40",
      )}
    >
      {/* Notion-style: the title, one quiet line of details, and a ⋯ menu.
          Status changes by dragging to a column, or Move to in the menu. */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {changeable ? (
            <button type="button" onClick={() => setEditing(true)} className="block w-full text-left text-[13.5px] font-medium leading-snug hover:text-[var(--i-accent-text)]">
              {task.title}
            </button>
          ) : (
            <p className="text-[13.5px] font-medium leading-snug">{task.title}</p>
          )}
          {task.notes ? <TaskNote text={task.notes} /> : null}
        </div>
        {changeable ? (
          <Menu.Root>
            <Menu.Trigger
              aria-label={`Options for ${task.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="-mr-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--i-faint)] opacity-0 outline-none transition-opacity hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)] focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <DotsThree size={18} weight="bold" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="end" sideOffset={4} className={menuContentClass}>
                <StatusMenuItems status={task.status} onChange={onMove} />
                <Menu.Separator className="-mx-1 my-1 h-px bg-[var(--i-line)]" />
                {task.status !== "done" ? (
                  <Menu.Item onSelect={() => setBlocking(true)} className={menuItemClass}>
                    <Prohibit size={14} /> {task.blocked ? "Change or unblock" : "Mark as blocked"}
                  </Menu.Item>
                ) : null}
                <Menu.Item onSelect={() => setEditing(true)} className={menuItemClass}>
                  <PencilSimple size={14} /> Edit task
                </Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        ) : null}
      </div>

      {task.blocked ? (
        <p className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-1 text-[12px] text-rose-700 dark:text-rose-300">
          <Prohibit size={12} className="shrink-0" />
          <span className="min-w-0 truncate">{task.block_reason || "Blocked"}</span>
        </p>
      ) : null}

      {/* One quiet line: what it's for, priority, due date, who else is on it. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--i-muted)]">
        {item.forLabel ? <ForChip label={item.forLabel} client={item.client} /> : null}
        <PriorityMark priority={task.priority} />
        {!changeable ? (
          <Pill tone={TASK_STATUSES.find((option) => option.value === task.status)?.tone}>
            {TASK_STATUSES.find((option) => option.value === task.status)?.label}
          </Pill>
        ) : null}
        {/* In review is handed in: the plain date, never "late". */}
        {task.due_on ? <DueDate day={task.due_on} done={!isOwed(task.status)} today={props.today} /> : null}
        {given ? (
          <span className="inline-flex items-center gap-1 text-[var(--i-faint)]">
            <UserCircle size={12} /> {props.names[task.created_by.toLowerCase()] ?? displayName({ email: task.created_by })}
          </span>
        ) : null}
        {others.length ? (
          <span title="Shared: it's on each of their lists" className="inline-flex items-center gap-1">
            <UsersThree size={12} className="shrink-0" /> {withLabel(others, props.team)}
          </span>
        ) : null}
      </div>
      {changeable ? (
        <TaskDialog
          open={editing}
          onOpenChange={setEditing}
          task={task}
          forLabel={item.forLabel}
          person={props.person}
          forOptions={props.forOptions}
          deliverables={props.targets.filter((target) => target.kind === "deliverable")}
          canClients={props.viewer.clients !== null}
          canCommunity={false}
          today={props.today}
          team={props.team}
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

