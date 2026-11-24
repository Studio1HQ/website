"use client";

import { startTransition, useMemo, useOptimistic, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { CaretDown, CheckCircle, Plus, Prohibit, Sparkle, UsersThree } from "@/components/internal/icons";
import { StatusPicker, StatusPill } from "@/components/internal/tasks/status-pill";
import { addTasks, editTask, leaveTask, removeTask, setDeliverableDay } from "@/app/internal/(dashboard)/tasks/actions";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import { DateField } from "@/components/internal/pickers";
import { TONES } from "@/components/internal/community/ui";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { forSelectOptions } from "@/components/internal/tasks/for-options";
import { TaskNote } from "@/components/internal/tasks/task-note";
import { PriorityMark, PriorityPicker } from "@/components/internal/tasks/priority";
import { WithPicker } from "@/components/internal/tasks/with-picker";
import { cardAnnouncements, dragHandlers, underPointer, useCardSensors } from "@/components/internal/tasks/drag";
import { earliestCardDay, type CalendarCard } from "@/lib/internal/tasks/calendar";
import {
  DEFAULT_PRIORITY,
  STUDIO_LINK,
  TASK_PRIORITIES,
  TASK_STATUSES,
  suggestLink,
  type LinkOption,
  type TaskPriority,
  type TaskStatus,
  type Teammate,
} from "@/lib/internal/tasks/shared";

/* The week calendar: a column per day, a card per task, the way the old
   tracker looked. Your own cards: "+ New" on a day, click the pill to
   change the status, click the card to edit, drag it to another day (it
   lands there at once; the save follows). Your open client deliverables
   drag too: the day they land on becomes their due date. On someone
   else's week, the same for whoever may give them tasks and change their
   cards (lib/internal/tasks/access.ts). */

const weekdayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const fullFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
/** "17 Nov" */
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const shortFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function at(day: string) {
  return new Date(`${day}T00:00:00Z`);
}


/** "- item", "• item", "1. item", "[x] item" → "item". */
function cleanPasted(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•–]|\d+[.)]|\[[ xX]?\])\s*/, "").trim())
    .filter(Boolean);
}

export function WeekCalendar({
  days,
  today,
  cards,
  tray,
  options,
  own,
  canAdd: mayAdd = own,
  person,
  who,
  team = [],
}: {
  days: string[];
  today: string;
  cards: CalendarCard[];
  tray: CalendarCard[];
  options: LinkOption[];
  /** The viewer's own week: they can add, edit and move cards. */
  own: boolean;
  /** May add cards to this week (own, or giving the person tasks). */
  canAdd?: boolean;
  /** Whose week it is, when it isn't the viewer's: new cards go to them. */
  person?: { email: string; name: string };
  /** Whose week it is (lowercase email), own or not. */
  who: string;
  /** Everyone active on the team list: who a task can be shared with. */
  team?: Teammate[];
}) {
  const { run } = useTeamAction();
  const sensors = useCardSensors();
  /** The card being dragged. */
  const [lifted, setLifted] = useState<CalendarCard | null>(null);
  /** The "No day yet" strip, folded away or open. */
  const [trayOpen, setTrayOpen] = useState(true);
  /** Cards dropped on another day and still saving: they show there already; a failed save puts them back. */
  const [moved, move] = useOptimistic<Record<string, string>, { key: string; day: string }>({}, (state, next) => ({
    ...state,
    [next.key]: next.day,
  }));
  const earliest = earliestCardDay(today);
  const movable = [...cards, ...tray].some((card) => canMove(card, own));
  const isMoved = (card: CalendarCard) => keyOf(card) in moved;
  const placed = [...cards, ...tray.filter(isMoved)].map((card) => (isMoved(card) ? { ...card, day: moved[keyOf(card)] } : card));
  const waiting = tray.filter((card) => !isMoved(card));

  /** Whether a card may go on a day: the viewer may move it, the day isn't too far back, and done work can't be finished ahead. */
  const fits = (card: CalendarCard | null, day: string) =>
    !!card && canMove(card, own) && card.day !== day && day >= earliest && !(card.kind === "task" && card.status === "done" && day > today);

  const drop = ({ active, over }: DragEndEvent) => {
    setLifted(null);
    const card = active.data.current?.card as CalendarCard | undefined;
    const day = typeof over?.id === "string" ? over.id : null;
    if (!card || !day || !fits(card, day)) return;
    run(() => {
      move({ key: keyOf(card), day });
      // A deliverable's day is its due date; a task's is the day it's on.
      return card.kind === "deliverable" ? setDeliverableDay(card.id, day, card.day ?? "") : editTask(card.id, { day });
    });
  };

  const titleOf = (id: string | number) => [...cards, ...tray].find((card) => keyOf(card) === id)?.title;
  const announcements = cardAnnouncements(titleOf, (id) => (typeof id === "string" ? fullFormat.format(at(id)) : undefined));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={underPointer}
      accessibility={{ announcements }}
      onDragStart={({ active }) => setLifted((active.data.current?.card as CalendarCard | undefined) ?? null)}
      onDragCancel={() => setLifted(null)}
      onDragEnd={drop}
    >
      <div className="space-y-3">
        {waiting.length ? (
          <section aria-label="No day yet" className="rounded-xl bg-[var(--i-sunken)] ring-1 ring-[var(--i-line)]">
            <button
              type="button"
              aria-expanded={trayOpen}
              onClick={() => setTrayOpen(!trayOpen)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px]"
            >
              <CaretDown size={14} className={cn("shrink-0 text-[var(--i-muted)] transition-transform", !trayOpen && "-rotate-90")} />
              <span className="font-medium text-[var(--i-ink-2)]">No day yet, or from earlier</span>
              <span className="rounded-full bg-[var(--i-hover)] px-1.5 text-[11px] leading-[17px] tabular-nums text-[var(--i-muted)]">
                {waiting.length}
              </span>
              {movable && trayOpen ? <span className="ml-auto text-[12px] text-[var(--i-faint)]">Drag one onto a day</span> : null}
            </button>
            {trayOpen ? (
              // One row that scrolls sideways, so the week stays near the top.
              <ul className="flex gap-2 overflow-x-auto px-2 pb-2">
                {waiting.map((card) => (
                  <li key={`${card.kind}:${card.id}`} className="w-[250px] shrink-0">
                    <Card card={card} own={own} who={who} team={team} options={options} today={today} showDay movable />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* One panel for the week. Wide screens: seven columns. Narrower: a row
            per day (the columns would be too thin to read), never sideways scrolling. */}
        <div className="overflow-hidden rounded-xl bg-[var(--i-sunken)] ring-1 ring-[var(--i-line)]">
          <div className="divide-y divide-[var(--i-line)] xl:grid xl:grid-cols-7 xl:divide-x xl:divide-y-0">
            {days.map((day) => {
              const list = placed.filter((card) => card.day === day);
              const canAdd = mayAdd && day >= earliest;
              return (
                <DayColumn key={day} day={day} today={today} lifted={lifted} fits={fits(lifted, day)}>
                  {list.length ? (
                    <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                      {list.map((card) => (
                        <li key={`${card.kind}:${card.id}`}>
                          <Card card={card} own={own} who={who} team={team} options={options} today={today} movable />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {canAdd ? <AddCard day={day} today={today} options={options} person={person} who={who} team={team} /> : null}
                  {!list.length && !canAdd ? <p className="px-1.5 py-1 text-[12px] text-[var(--i-faint)]">Nothing.</p> : null}
                </DayColumn>
              );
            })}
          </div>
        </div>
      </div>

      {/* The lifted card follows the pointer; its place stays faded until it's dropped. */}
      <DragOverlay dropAnimation={null}>{lifted ? <LiftedCard card={lifted} /> : null}</DragOverlay>
    </DndContext>
  );
}

/** A day of the week, and a place to drop cards while one is dragged. */
function DayColumn({
  day,
  today,
  lifted,
  fits,
  children,
}: {
  day: string;
  today: string;
  lifted: CalendarCard | null;
  /** The dragged card may land here. */
  fits: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day });
  const isToday = day === today;
  const target = isOver && fits;
  return (
    <section
      ref={setNodeRef}
      aria-label={fullFormat.format(at(day))}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 p-2 transition-[background-color,opacity,box-shadow] duration-150 sm:flex-row sm:gap-3 xl:min-h-[18rem] xl:flex-col xl:gap-1.5 xl:p-1.5",
        isToday && !target && "bg-orange-50/60 dark:bg-orange-500/[0.05]",
        target && "bg-[var(--i-accent-soft)] shadow-[inset_0_0_0_1px_var(--i-accent)]",
        // While a card is dragged, days it can't go on step back.
        lifted && !fits && lifted.day !== day && "opacity-45",
      )}
    >
      <h3 className="flex items-center gap-2 px-1.5 pt-1 sm:w-20 sm:shrink-0 sm:self-start xl:w-auto xl:self-auto xl:justify-between">
        <span className={cn("text-[12px]", isToday ? "font-medium text-[var(--i-accent-text)]" : "text-[var(--i-muted)]")}>
          {weekdayFormat.format(at(day))}
        </span>
        {/* Every date sits in the same round slot, so all the days line up. */}
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[13px] font-medium tabular-nums",
            isToday && "bg-[var(--i-accent)] text-white",
          )}
        >
          {dateFormat.format(at(day))}
        </span>
      </h3>
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
    </section>
  );
}

/**
 * "+ New" at the bottom of a day: the task, an optional note for whoever
 * checks it, anyone it's shared with, what it's for and its priority, then
 * Save, which closes the box. Enter in the task moves to the
 * note; ⌘/Ctrl+Enter saves from either. Pasting a list lines up one task per line. On My day
 * the box has a Day at the top, for work that belongs to another day (last
 * night's, entered after midnight).
 */
export function AddCard({
  day,
  today,
  options,
  open: startOpen = false,
  inline = false,
  person,
  who,
  team = [],
}: {
  day: string;
  today: string;
  options: LinkOption[];
  /** Start with the box open, with a Day to pick at the top (My day). */
  open?: boolean;
  /** With open: one row (what, for, day, save), for a wide card. */
  inline?: boolean;
  /** Giving someone else tasks: they go on this person's week, Not started. */
  person?: { email: string; name: string };
  /** Whose the new tasks are (lowercase email): not offered as someone to share with. */
  who: string;
  /** Everyone active on the team list: who the tasks can be shared with. */
  team?: Teammate[];
}) {
  const { pending, run } = useTeamAction();
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  /** A pasted list: one task per line, saved together. */
  const [list, setList] = useState<string[]>([]);
  const [link, setLink] = useState(STUDIO_LINK);
  const [picked, setPicked] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);
  /** Who the tasks are shared with: on their lists too. */
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  /** The day the tasks go on: the box's own, unless another is picked. */
  const [on, setOn] = useState(day);
  const moved = on !== day;
  const panel = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const noteBox = useRef<HTMLTextAreaElement>(null);
  const choices = useMemo(() => forSelectOptions(options), [options]);
  const suggestion = !picked && text.trim().length > 3 ? suggestLink(text, options) : null;
  const ahead = on > today;
  const firstName = person ? person.name.split(/[\s@]/)[0] : "";
  const several = list.length > 0;
  const empty = !several && !text.trim() && !note.trim();

  const reset = () => {
    setText("");
    setNote("");
    setNoting(false);
    setList([]);
    setLink(STUDIO_LINK);
    setPicked(false);
    setPriority(DEFAULT_PRIORITY);
    setSharedWith([]);
  };

  const close = () => {
    reset();
    setOn(day);
    if (!startOpen) setOpen(false);
  };

  const save = () => {
    const items = several
      ? list.map((title) => ({ title, link, priority }))
      : [{ title: text.trim(), notes: note.trim(), link, priority }];
    if (!items.some((item) => item.title)) return;
    run(
      () => addTasks(on, items, { ...(person ? { email: person.email } : {}), ...(sharedWith.length ? { with: sharedWith } : {}) }),
      () => {
        // Saved: the box closes back to "+ New" (My day's box stays, empty, for the next one).
        // In the action's transition, so the box goes as the new card shows up.
        startTransition(() => {
          if (startOpen) {
            reset();
            box.current?.focus();
          } else close();
        });
      },
    );
  };

  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      if (!startOpen) close();
      return;
    }
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      save();
    } else if (event.currentTarget === box.current) {
      event.preventDefault();
      if (!text.trim()) return;
      if (noteBox.current) noteBox.current.focus();
      else setNoting(true);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[var(--i-faint)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
      >
        <Plus size={13} /> New
      </button>
    );
  }

  const dayPicker = (
    <DateField
      value={on}
      onChange={(next) => setOn(next || day)}
      min={earliestCardDay(today)}
      required
      aria-label="Day these tasks are for"
      className={cn(
        "w-auto px-2 text-[12.5px]",
        inline ? "h-8" : "h-7",
        moved && "border-[var(--i-accent)] text-[var(--i-accent-text)]",
      )}
    />
  );

  const movedNote = moved ? (
    <>
      <span>
        {shortFormat.format(at(on))}, not {day === today ? "today" : shortFormat.format(at(day))}
      </span>
      <button type="button" onClick={() => setOn(day)} className="text-[var(--i-faint)] underline hover:text-[var(--i-ink)]">
        Back to {day === today ? "today" : shortFormat.format(at(day))}
      </button>
    </>
  ) : null;

  const pastedList = (
    <div className="rounded-md bg-[var(--i-sunken)] px-2 py-1.5 text-[12px]">
      <p className="flex items-center justify-between gap-2 text-[var(--i-muted)]">
        {list.length} tasks
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setList([])}
          className="text-[var(--i-faint)] hover:text-[var(--i-ink)]"
        >
          Clear
        </button>
      </p>
      <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
        {list.map((title, index) => (
          <li key={index} className="truncate">
            {title}
          </li>
        ))}
      </ul>
    </div>
  );

  const textBox = (
    <input
      ref={box}
      autoFocus
      value={text}
      disabled={pending}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={keys}
      onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData("text");
        if (!/\r?\n/.test(pasted.trim())) return;
        event.preventDefault();
        setList(cleanPasted(pasted).slice(0, 30));
        setText("");
      }}
      maxLength={200}
      placeholder={person ? `A task for ${firstName}` : ahead ? "What's planned?" : "What did you do?"}
      title="Paste a list to add several at once."
      aria-label={`New task on ${fullFormat.format(at(on))}`}
      className={cn(inputClass("sm"), inline && "min-w-[12rem] flex-1 basis-52")}
    />
  );

  const noteField = noting ? (
    <textarea
      ref={noteBox}
      autoFocus
      value={note}
      disabled={pending}
      onChange={(event) => setNote(event.target.value)}
      onKeyDown={keys}
      rows={inline ? 2 : 3}
      maxLength={4000}
      placeholder="Context for whoever checks it"
      aria-label="Note"
      className={cn(textareaClass, "resize-none px-2 py-1.5 text-[12.5px] leading-snug")}
    />
  ) : (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => setNoting(true)}
      className="flex items-center gap-1 px-0.5 text-[11.5px] text-[var(--i-faint)] hover:text-[var(--i-ink)]"
    >
      <Plus size={11} /> Add a note
    </button>
  );

  const linkPicker = (
    <Select
      aria-label="For"
      size={inline ? "sm" : "xs"}
      value={link}
      onChange={(value) => {
        setLink(value);
        setPicked(true);
      }}
      options={choices}
      className={inline ? "w-full sm:w-48" : "w-full"}
    />
  );

  const peoplePicker = <WithPicker team={team} value={sharedWith} onChange={setSharedWith} exclude={[who]} disabled={pending} />;

  const priorityPicker = <PriorityPicker value={priority} onChange={setPriority} size={inline ? "sm" : "xs"} disabled={pending} />;

  const suggestionChip =
    suggestion && suggestion.value !== link ? (
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setLink(suggestion.value);
          setPicked(true);
          box.current?.focus();
        }}
        className={cn(
          "flex items-center gap-1 rounded-md bg-[var(--i-accent-soft)] px-2 py-1 text-left text-[11.5px] text-[var(--i-accent-text)]",
          inline ? "max-w-full" : "w-full",
        )}
      >
        <Sparkle size={11} weight="fill" className="shrink-0" />
        <span className="truncate">For {suggestion.label}?</span>
      </button>
    ) : null;

  const buttons = (
    <>
      {!startOpen || !empty || moved ? (
        <button
          type="button"
          onClick={close}
          className={cn(buttonClass("ghost", inline ? "md" : "sm"), !startOpen && "flex-1 px-1")}
        >
          {startOpen ? "Clear" : "Cancel"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={save}
        disabled={pending || (!several && !text.trim())}
        title={`Saves as ${person || ahead ? "Not started" : "Done"}`}
        className={cn(buttonClass("primary", inline ? "md" : "sm"), !startOpen && "flex-1 px-1")}
      >
        {pending ? "Saving…" : several ? `Save ${list.length}` : "Save"}
      </button>
    </>
  );

  // My day: one row (what, for, day, save); the note and hints open under it.
  if (inline) {
    return (
      <div ref={panel} className="space-y-1.5">
        {several ? pastedList : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {several ? <span className="flex-1" /> : textBox}
          {linkPicker}
          {priorityPicker}
          {dayPicker}
          {buttons}
        </div>
        {movedNote ? (
          <p className="flex flex-wrap items-center gap-x-2 px-0.5 text-[12px] text-[var(--i-muted)]">{movedNote}</p>
        ) : null}
        {several ? (
          peoplePicker
        ) : noting ? (
          <>
            {noteField}
            {peoplePicker}
          </>
        ) : text.trim() || sharedWith.length ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {noteField}
            {peoplePicker}
          </div>
        ) : null}
        {suggestionChip}
      </div>
    );
  }

  return (
    <div
      ref={panel}
      onBlur={() => {
        // Clicking away from an empty box closes it; anything typed keeps it open.
        if (startOpen || !empty) return;
        setTimeout(() => {
          const focused = document.activeElement;
          // The For list and the people and priority menus open in a portal: still in the box.
          if (focused?.closest("[data-radix-popper-content-wrapper]")) return;
          if (!panel.current?.contains(focused)) setOpen(false);
        }, 150);
      }}
      className="space-y-1.5 rounded-lg bg-[var(--i-panel)] p-1.5 ring-1 ring-[var(--i-line)]"
    >
      {startOpen ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--i-muted)]">
          <span>Day</span>
          {dayPicker}
          {movedNote}
        </div>
      ) : null}
      {several ? (
        <>
          {pastedList}
          {peoplePicker}
        </>
      ) : (
        <>
          {textBox}
          {noting ? (
            <>
              {noteField}
              {peoplePicker}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {noteField}
              {peoplePicker}
            </div>
          )}
        </>
      )}
      {linkPicker}
      {suggestionChip}
      <div className="flex items-center justify-end gap-1">
        {priorityPicker}
        {buttons}
      </div>
    </div>
  );
}

/** A card's id across kinds (a task and a deliverable may not share one). */
function keyOf(card: CalendarCard) {
  return `${card.kind}:${card.id}`;
}

/** Whether the viewer may edit, move or delete a card: the page says, else your own week's tasks. */
function canEdit(card: CalendarCard, own: boolean) {
  return card.kind === "task" && (card.editable ?? own);
}

/** Whether the viewer may drag a card to another day: tasks they may edit, and client deliverables the page marked. */
function canMove(card: CalendarCard, own: boolean) {
  return card.kind === "deliverable" ? card.editable === true : canEdit(card, own);
}

/** A status as a coloured dot and its name: quieter than a pill on a small card. */
function StatusText({ tone, label }: { tone?: keyof typeof TONES; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONES[tone ?? "stone"].dot)} />
      {label}
    </span>
  );
}

/**
 * The line under a card's title. Done cards keep just the tick by the title;
 * open ones show where they stand (yours: click to change). Top and Low
 * priority show (Medium is the default). Only client tags show (what syncs
 * to client pages); a Studio1 area shows when editing.
 */
function CardMeta({
  card,
  done,
  editable,
  onStatus,
}: {
  card: CalendarCard;
  done: boolean;
  editable: boolean;
  onStatus: (status: TaskStatus) => void;
}) {
  const taskStatus = card.kind === "task" ? TASK_STATUSES.find((option) => option.value === card.status) : undefined;
  const status = done ? null : card.kind === "task" && editable ? (
    <StatusPicker status={card.status} onChange={onStatus} label={`Status of ${card.title}`} />
  ) : (
    <span className="text-[11.5px] text-[var(--i-muted)]">
      {card.kind === "task" ? (
        <StatusPill status={card.status} small label={taskStatus?.label} />
      ) : (
        <StatusText tone={card.tone} label={card.status} />
      )}
    </span>
  );
  const tag =
    card.tag && (card.kind !== "task" || card.client) ? (
      <span
        title={card.kind === "task" ? card.forLabel : card.tag}
        className={cn(
          "max-w-full truncate rounded px-1.5 py-0.5 text-[11px]",
          card.client ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" : "bg-[var(--i-sunken)] text-[var(--i-muted)]",
        )}
      >
        {card.tag}
      </span>
    ) : null;
  const blocked =
    card.kind === "task" && card.blocked ? (
      <span title={card.reason} className="text-rose-600 dark:text-rose-300">
        <Prohibit size={13} />
      </span>
    ) : null;
  const priority = card.kind === "task" && card.priority !== "medium" ? <PriorityMark priority={card.priority} /> : null;
  if (!status && !tag && !blocked && !priority) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {priority}
      {status}
      {tag}
      {blocked}
    </div>
  );
}

/** The tick and title of a card. */
function CardTitle({ title, done }: { title: string; done: boolean }) {
  return (
    <>
      {done ? <CheckCircle size={14} weight="fill" className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" /> : null}
      <span className="line-clamp-3 min-w-0 break-words">{title}</span>
    </>
  );
}

/** The copy of a card that follows the pointer while it's dragged. */
function LiftedCard({ card }: { card: CalendarCard }) {
  const done = card.kind === "task" ? card.status === "done" : card.done;
  return (
    <article className="cursor-grabbing rounded-lg border border-[var(--i-line-strong)] bg-[var(--i-panel)] px-2.5 py-2 shadow-[0_12px_28px_-8px_rgb(0_0_0/0.3)] [transform:rotate(1.5deg)]">
      <p className="flex items-start gap-1.5 text-[13px] font-medium leading-snug">
        <CardTitle title={card.title} done={done} />
      </p>
      {card.kind === "task" && card.notes ? <TaskNote text={card.notes} className="mt-1" /> : null}
      <CardMeta card={card} done={done} editable={false} onStatus={() => {}} />
    </article>
  );
}

function Card({
  card: saved,
  own,
  who,
  team,
  options,
  today,
  showDay = false,
  movable = false,
}: {
  card: CalendarCard;
  own: boolean;
  /** Whose week or day it's on (lowercase email). */
  who: string;
  team: Teammate[];
  options: LinkOption[];
  today: string;
  showDay?: boolean;
  /** On the week calendar: the viewer can drag it to another day. */
  movable?: boolean;
}) {
  const { run } = useTeamAction();
  /** A status picked on the card shows at once, while it saves. */
  const [card, showStatus] = useOptimistic(saved, (current, status: TaskStatus) =>
    current.kind === "task" ? { ...current, status } : current,
  );
  const [editing, setEditing] = useState(false);
  /** Bumped on each open: the editor starts again from the card, not a cancelled draft. */
  const [opened, setOpened] = useState(0);
  const editable = canEdit(card, own);
  const draggable = movable && canMove(card, own);
  const done = card.kind === "task" ? card.status === "done" : card.done;
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: keyOf(card), data: { card }, disabled: !draggable });

  return (
    <article
      ref={setNodeRef}
      {...dragHandlers(listeners)}
      className={cn(
        "group rounded-lg border bg-[var(--i-panel)] px-2.5 py-2 shadow-[var(--i-shadow-sm)] transition-[border-color,opacity]",
        card.kind === "task" && card.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        (editable || draggable) && "hover:border-[var(--i-line-strong)]",
        // Hold to drag on a phone: no text selection or callout getting in the way.
        draggable && "touch-manipulation select-none [-webkit-touch-callout:none] md:cursor-grab",
        isDragging && "opacity-40",
      )}
    >
      {editable ? (
        <button
          type="button"
          onClick={() => {
            setOpened((count) => count + 1);
            setEditing(true);
          }}
          className={cn(
            "flex w-full items-start gap-1.5 text-left text-[13px] font-medium leading-snug hover:text-[var(--i-accent-text)]",
            draggable && "md:cursor-grab",
          )}
        >
          <CardTitle title={card.title} done={done} />
        </button>
      ) : card.kind !== "task" && card.href ? (
        <Link href={card.href} className="flex items-start gap-1.5 text-[13px] font-medium leading-snug hover:text-[var(--i-accent-text)]">
          <CardTitle title={card.title} done={done} />
        </Link>
      ) : (
        <p className="flex items-start gap-1.5 text-[13px] font-medium leading-snug">
          <CardTitle title={card.title} done={done} />
        </p>
      )}
      {card.kind === "task" && card.notes ? <TaskNote text={card.notes} className="mt-1" /> : null}
      <CardMeta
        card={card}
        done={done}
        editable={editable}
        onStatus={(status) =>
          run(() => {
            showStatus(status);
            return editTask(card.id, { status });
          })
        }
      />
      {/* One quiet line: the day it was for, who gave it, who else is on it. */}
      {(showDay && card.day) || (card.kind === "task" && (card.from || card.withNames.length)) ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--i-faint)]">
          {showDay && card.day ? (
            <span className={card.day < today && !done ? "text-rose-600 dark:text-rose-400" : undefined}>
              {card.day < today ? "Was for" : "For"} {shortDay.format(at(card.day))}
            </span>
          ) : null}
          {card.kind === "task" && card.from ? <span>From {card.from}</span> : null}
          {card.kind === "task" && card.withNames.length ? (
            <span title="Shared: it's on each of their lists" className="inline-flex min-w-0 items-center gap-1">
              <UsersThree size={11} className="shrink-0" />
              <span className="truncate">{card.withNames.join(", ")}</span>
            </span>
          ) : null}
        </p>
      ) : null}
      {editable && card.kind === "task" ? (
        <EditCard
          key={opened}
          open={editing}
          onOpenChange={setEditing}
          card={card}
          options={options}
          today={today}
          team={team}
          // Shared with this person by someone else: they take themselves off rather than delete it for everyone.
          leaving={own && card.owner !== who}
        />
      ) : null}
    </article>
  );
}

function EditCard({
  open,
  onOpenChange,
  card,
  options,
  today,
  team,
  leaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Extract<CalendarCard, { kind: "task" }>;
  options: LinkOption[];
  today: string;
  team: Teammate[];
  /** It's shared with the viewer: Delete takes them off instead. */
  leaving: boolean;
}) {
  const { pending, run } = useTeamAction();
  const start = () => ({
    title: card.title,
    notes: card.notes,
    link: card.link,
    status: card.status as TaskStatus,
    priority: card.priority,
    people: card.people,
    day: card.day ?? "",
  });
  const [form, setForm] = useState(start);
  const [confirming, setConfirming] = useState(false);
  const choices = useMemo(() => forSelectOptions(options, { value: card.link, label: card.forLabel }), [options, card.link, card.forLabel]);

  const close = () => {
    setConfirming(false);
    onOpenChange(false);
  };

  const save = () => {
    const patch: Record<string, unknown> = {};
    if (form.title.trim() !== card.title) patch.title = form.title;
    if (form.notes.trim() !== card.notes) patch.notes = form.notes;
    if (form.link !== card.link) patch.link = form.link;
    if (form.status !== card.status) patch.status = form.status;
    if (form.priority !== card.priority) patch.priority = form.priority;
    if ([...form.people].sort().join() !== [...card.people].sort().join()) patch.with = form.people;
    if (form.day && form.day !== card.day) patch.day = form.day;
    if (!Object.keys(patch).length) return close();
    run(() => editTask(card.id, patch), close);
  };

  return (
    <TeamDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm(start());
        onOpenChange(next);
      }}
      title="Edit task"
      footer={
        <>
          {leaving ? (
            <button type="button" className={buttonClass("ghost")} disabled={pending} onClick={() => run(() => leaveTask(card.id), close)}>
              Take me off
            </button>
          ) : confirming ? (
            <button type="button" className={buttonClass("danger")} disabled={pending} onClick={() => run(() => removeTask(card.id), close)}>
              {card.people.length ? "Delete it for everyone" : "Delete it"}
            </button>
          ) : (
            <button type="button" className={buttonClass("ghost")} onClick={() => setConfirming(true)}>
              Delete…
            </button>
          )}
          <span className="flex-1" />
          <button type="button" className={buttonClass("ghost")} onClick={close}>
            Cancel
          </button>
          <button type="button" className={buttonClass("primary")} disabled={pending || !form.title.trim()} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <Label label="Day" group>
        <DateField value={form.day} onChange={(day) => setForm({ ...form, day })} min={earliestCardDay(today)} aria-label="Day" />
      </Label>
      <Label label="Task">
        <input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          maxLength={200}
          className={inputClass()}
        />
      </Label>
      <Label label="Notes" hint="optional">
        <textarea
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          rows={3}
          maxLength={4000}
          placeholder="Context for whoever checks it"
          className={textareaClass}
        />
      </Label>
      <Label label="For" group>
        <Select aria-label="For" value={form.link} onChange={(link) => setForm({ ...form, link })} options={choices} className="w-full" />
      </Label>
      <Label label="Status" group>
        <Segmented
          label="Status"
          value={form.status}
          onChange={(status) => setForm({ ...form, status })}
          options={TASK_STATUSES.map((option) => ({ value: option.value, label: option.label }))}
        />
      </Label>
      <Label label="Priority" group>
        <Segmented
          label="Priority"
          value={form.priority}
          onChange={(priority) => setForm({ ...form, priority })}
          options={TASK_PRIORITIES.map((option) => ({ value: option.value, label: option.label }))}
        />
      </Label>
      {team.length && !leaving ? (
        <Label label="With" hint="shared: on their lists too" group>
          <WithPicker team={team} value={form.people} onChange={(people) => setForm({ ...form, people })} exclude={[card.owner]} variant="field" />
        </Label>
      ) : null}
    </TeamDialog>
  );
}

/** One day's cards as a plain list with the add box open (My day). */
export function DayList({
  day,
  today,
  cards,
  options,
  who,
  team = [],
}: {
  day: string;
  today: string;
  cards: CalendarCard[];
  options: LinkOption[];
  /** Whose day it is (lowercase email). */
  who: string;
  /** Everyone active on the team list: who a task can be shared with. */
  team?: Teammate[];
}) {
  // The box on top, the cards under it; in a card with a set height (My day
  // on a wide screen) the cards scroll on their own.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--i-line)] p-3">
        <AddCard day={day} today={today} options={options} open inline who={who} team={team} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {cards.length ? (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {cards.map((card) => (
              <li key={`${card.kind}:${card.id}`}>
                <Card card={card} own who={who} team={team} options={options} today={today} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 py-2 text-[12.5px] text-[var(--i-faint)]">Nothing here yet. Add what you work on as you go.</p>
        )}
      </div>
    </div>
  );
}
