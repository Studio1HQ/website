"use client";

import { useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { CheckCircle, Plus, Prohibit, Sparkle } from "@phosphor-icons/react";
import { addTasks, editTask, removeTask } from "@/app/internal/(dashboard)/tasks/actions";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import { DateField } from "@/components/internal/pickers";
import { TONES } from "@/components/internal/community/ui";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { forSelectOptions } from "@/components/internal/tasks/for-options";
import { TaskNote } from "@/components/internal/tasks/task-note";
import type { CalendarCard } from "@/lib/internal/tasks/calendar";
import { STUDIO_LINK, TASK_STATUSES, suggestLink, type LinkOption, type TaskStatus } from "@/lib/internal/tasks/shared";

/* The week calendar: a column per day, a card per task, the way the old
   tracker looked. Your own cards: "+ New" on a day, click the pill to
   change the status, click the card to edit, drag it to another day. */

const DRAG = "application/x-studio1-card";

const weekdayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const fullFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function at(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

/** The 1st of last month: the earliest day a card can go on. */
export function earliestCardDay(today: string) {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
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
}: {
  days: string[];
  today: string;
  cards: CalendarCard[];
  tray: CalendarCard[];
  options: LinkOption[];
  /** The viewer's own week: they can add, edit and move cards. */
  own: boolean;
}) {
  const { run } = useTeamAction();
  const [over, setOver] = useState<string | null>(null);
  const earliest = earliestCardDay(today);

  const drop = (day: string) => (event: DragEvent) => {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData(DRAG);
    const card = [...cards, ...tray].find((item) => item.kind === "task" && item.id === id);
    if (card && card.day !== day) run(() => editTask(id, { day }));
  };

  return (
    <div className="space-y-3">
      {tray.length ? (
        <section aria-label="No day yet" className="rounded-xl bg-[var(--i-sunken)] p-2 ring-1 ring-[var(--i-line)]">
          <h2 className="px-1.5 pb-2 text-[12.5px] font-medium text-[var(--i-ink-2)]">
            No day yet, or from earlier <span className="font-normal tabular-nums text-[var(--i-faint)]">{tray.length}</span>
            {own ? <span className="font-normal text-[var(--i-faint)]"> · drag one onto a day</span> : null}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {tray.map((card) => (
              <li key={`${card.kind}:${card.id}`}>
                <Card card={card} own={own} options={options} today={today} showDay />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* One panel for the week. Wide screens: seven columns. Narrower: a row
          per day (the columns would be too thin to read), never sideways scrolling. */}
      <div className="overflow-hidden rounded-xl bg-[var(--i-sunken)] ring-1 ring-[var(--i-line)]">
        <div className="divide-y divide-[var(--i-line)] xl:grid xl:grid-cols-7 xl:divide-x xl:divide-y-0">
          {days.map((day) => {
            const list = cards.filter((card) => card.day === day);
            const isToday = day === today;
            const canAdd = own && day >= earliest;
            return (
              <section
                key={day}
                aria-label={fullFormat.format(at(day))}
                aria-current={isToday ? "date" : undefined}
                onDragOver={(event) => {
                  if (own && day >= earliest && event.dataTransfer.types.includes(DRAG)) {
                    event.preventDefault();
                    setOver(day);
                  }
                }}
                onDragLeave={() => setOver((current) => (current === day ? null : current))}
                onDrop={drop(day)}
                className={cn(
                  "flex min-w-0 flex-col gap-1.5 p-2 transition-colors sm:flex-row sm:gap-3 xl:min-h-[18rem] xl:flex-col xl:gap-1.5 xl:p-1.5",
                  isToday && "bg-orange-50/60 dark:bg-orange-500/[0.05]",
                  over === day && "bg-[var(--i-accent-soft)]",
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
                <div className="min-w-0 flex-1 space-y-1.5">
                  {list.length ? (
                    <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                      {list.map((card) => (
                        <li key={`${card.kind}:${card.id}`}>
                          <Card card={card} own={own} options={options} today={today} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {canAdd ? <AddCard day={day} today={today} options={options} /> : null}
                  {!list.length && !canAdd ? <p className="px-1.5 py-1 text-[12px] text-[var(--i-faint)]">Nothing.</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * "+ New" at the bottom of a day: the task, an optional note for whoever
 * checks it, then Save. Enter in the task moves to the note; ⌘/Ctrl+Enter
 * saves from either. Pasting a list lines up one task per line.
 */
export function AddCard({
  day,
  today,
  options,
  open: startOpen = false,
}: {
  day: string;
  today: string;
  options: LinkOption[];
  /** Start with the box open (My day). */
  open?: boolean;
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
  const panel = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const noteBox = useRef<HTMLTextAreaElement>(null);
  const choices = useMemo(() => forSelectOptions(options), [options]);
  const suggestion = !picked && text.trim().length > 3 ? suggestLink(text, options) : null;
  const ahead = day > today;
  const several = list.length > 0;
  const empty = !several && !text.trim() && !note.trim();

  const reset = () => {
    setText("");
    setNote("");
    setNoting(false);
    setList([]);
    setLink(STUDIO_LINK);
    setPicked(false);
  };

  const close = () => {
    reset();
    if (!startOpen) setOpen(false);
  };

  const save = () => {
    const items = several ? list.map((title) => ({ title, link })) : [{ title: text.trim(), notes: note.trim(), link }];
    if (!items.some((item) => item.title)) return;
    run(
      () => addTasks(day, items),
      () => {
        reset();
        box.current?.focus();
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

  return (
    <div
      ref={panel}
      onBlur={() => {
        // Clicking away from an empty box closes it; anything typed keeps it open.
        if (startOpen || !empty) return;
        setTimeout(() => {
          if (!panel.current?.contains(document.activeElement)) setOpen(false);
        }, 150);
      }}
      className="space-y-1.5 rounded-lg bg-[var(--i-panel)] p-1.5 ring-1 ring-[var(--i-line)]"
    >
      {several ? (
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
      ) : (
        <>
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
            placeholder={ahead ? "What's planned?" : "What did you do?"}
            title="Paste a list to add several at once."
            aria-label={`New task on ${fullFormat.format(at(day))}`}
            className={inputClass("sm")}
          />
          {noting ? (
            <textarea
              ref={noteBox}
              autoFocus
              value={note}
              disabled={pending}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={keys}
              rows={3}
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
          )}
        </>
      )}
      <Select
        aria-label="For"
        size="xs"
        value={link}
        onChange={(value) => {
          setLink(value);
          setPicked(true);
        }}
        options={choices}
        className="w-full"
      />
      {suggestion && suggestion.value !== link ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setLink(suggestion.value);
            setPicked(true);
            box.current?.focus();
          }}
          className="flex w-full items-center gap-1 rounded-md bg-[var(--i-accent-soft)] px-2 py-1 text-left text-[11.5px] text-[var(--i-accent-text)]"
        >
          <Sparkle size={11} weight="fill" className="shrink-0" />
          <span className="truncate">For {suggestion.label}?</span>
        </button>
      ) : null}
      <div className="flex items-center justify-end gap-1">
        {!startOpen || !empty ? (
          <button
            type="button"
            onClick={close}
            className={cn(buttonClass("ghost", "sm"), !startOpen && "flex-1 px-1")}
          >
            {startOpen ? "Clear" : "Cancel"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={pending || (!several && !text.trim())}
          title={`Saves as ${ahead ? "Not started" : "Done"}`}
          className={cn(buttonClass("primary", "sm"), !startOpen && "flex-1 px-1")}
        >
          {pending ? "Saving…" : several ? `Save ${list.length}` : "Save"}
        </button>
      </div>
    </div>
  );
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
 * open ones show where they stand (yours: click to change). Only client tags
 * show (what syncs to client pages); a Studio1 area shows when editing.
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
    <Select
      aria-label={`Status of ${card.title}`}
      size="xs"
      value={card.status}
      onChange={onStatus}
      options={TASK_STATUSES.map((option) => ({
        value: option.value,
        label: <StatusText tone={option.tone} label={option.label} />,
        textValue: option.label,
      }))}
      className="-ml-1.5 h-6 w-auto gap-1 border-0 bg-transparent px-1.5 text-[11.5px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] focus:bg-[var(--i-hover)]"
    />
  ) : (
    <span className="text-[11.5px] text-[var(--i-muted)]">
      {card.kind === "task" ? (
        <StatusText tone={taskStatus?.tone} label={taskStatus?.label ?? card.status} />
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
  if (!status && !tag && !blocked) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {status}
      {tag}
      {blocked}
    </div>
  );
}

function Card({
  card,
  own,
  options,
  today,
  showDay = false,
}: {
  card: CalendarCard;
  own: boolean;
  options: LinkOption[];
  today: string;
  showDay?: boolean;
}) {
  const { pending, run } = useTeamAction();
  const [editing, setEditing] = useState(false);
  const editable = own && card.kind === "task";
  const done = card.kind === "task" ? card.status === "done" : card.done;

  return (
    <article
      draggable={editable}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG, card.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group rounded-lg border bg-[var(--i-panel)] px-2.5 py-2 shadow-[var(--i-shadow-sm)] transition-colors",
        card.kind === "task" && card.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        editable && "hover:border-[var(--i-line-strong)] md:cursor-grab md:active:cursor-grabbing",
        pending && "opacity-60",
      )}
    >
      {editable ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-start gap-1.5 text-left text-[13px] font-medium leading-snug hover:text-[var(--i-accent-text)]"
        >
          {done ? <CheckCircle size={14} weight="fill" className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" /> : null}
          <span className="line-clamp-3 min-w-0 break-words">{card.title}</span>
        </button>
      ) : card.kind !== "task" && card.href ? (
        <Link href={card.href} className="flex items-start gap-1.5 text-[13px] font-medium leading-snug hover:text-[var(--i-accent-text)]">
          {done ? <CheckCircle size={14} weight="fill" className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" /> : null}
          <span className="line-clamp-3 min-w-0 break-words">{card.title}</span>
        </Link>
      ) : (
        <p className="flex items-start gap-1.5 text-[13px] font-medium leading-snug">
          {done ? <CheckCircle size={14} weight="fill" className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" /> : null}
          <span className="line-clamp-3 min-w-0 break-words">{card.title}</span>
        </p>
      )}
      {card.kind === "task" && card.notes ? <TaskNote text={card.notes} className="mt-1" /> : null}
      <CardMeta card={card} done={done} editable={editable} onStatus={(status) => run(() => editTask(card.id, { status }))} />
      {showDay && card.day ? <p className="mt-1 text-[11px] text-[var(--i-faint)]">Was for {card.day}</p> : null}
      {card.kind === "task" && card.from ? <p className="mt-1 text-[11px] text-[var(--i-faint)]">From {card.from}</p> : null}
      {editable && card.kind === "task" ? (
        <EditCard open={editing} onOpenChange={setEditing} card={card} options={options} today={today} />
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Extract<CalendarCard, { kind: "task" }>;
  options: LinkOption[];
  today: string;
}) {
  const { pending, run } = useTeamAction();
  const start = () => ({
    title: card.title,
    notes: card.notes,
    link: card.link,
    status: card.status as TaskStatus,
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
          {confirming ? (
            <button type="button" className={buttonClass("danger")} disabled={pending} onClick={() => run(() => removeTask(card.id), close)}>
              Delete it
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
      <Label label="Day" group>
        <DateField value={form.day} onChange={(day) => setForm({ ...form, day })} min={earliestCardDay(today)} aria-label="Day" />
      </Label>
    </TeamDialog>
  );
}

/** One day's cards as a plain list with the add box open (My day). */
export function DayList({
  day,
  today,
  cards,
  options,
}: {
  day: string;
  today: string;
  cards: CalendarCard[];
  options: LinkOption[];
}) {
  return (
    <div className="space-y-2 p-3">
      {cards.length ? (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={`${card.kind}:${card.id}`}>
              <Card card={card} own options={options} today={today} />
            </li>
          ))}
        </ul>
      ) : null}
      <AddCard day={day} today={today} options={options} open />
    </div>
  );
}
