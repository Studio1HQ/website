"use client";

import { useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { CheckCircle, Plus, Prohibit, Sparkle } from "@phosphor-icons/react";
import { addTasks, editTask, removeTask } from "@/app/internal/(dashboard)/tasks/actions";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { DateField } from "@/components/internal/pickers";
import { Pill, TONES } from "@/components/internal/community/ui";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { forSelectOptions } from "@/components/internal/tasks/for-options";
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

      {/* Sideways scrolling clips anything outside the box: the padding (offset
          by the negative margins) keeps the columns' outlines whole. */}
      <div className="-mx-1 -mt-1 overflow-x-auto px-1 pb-2 pt-1">
        <div className="grid gap-2 md:min-w-[60rem] md:grid-cols-7">
          {days.map((day) => {
            const list = cards.filter((card) => card.day === day);
            const isToday = day === today;
            const canAdd = own && day >= earliest;
            return (
              <section
                key={day}
                aria-label={fullFormat.format(at(day))}
                onDragOver={(event) => {
                  if (own && day >= earliest && event.dataTransfer.types.includes(DRAG)) {
                    event.preventDefault();
                    setOver(day);
                  }
                }}
                onDragLeave={() => setOver((current) => (current === day ? null : current))}
                onDrop={drop(day)}
                className={cn(
                  "flex min-w-0 flex-col rounded-xl p-1.5 ring-1 transition-shadow md:min-h-[14rem]",
                  isToday
                    ? "bg-orange-50/70 ring-orange-300 dark:bg-orange-500/[0.07] dark:ring-orange-400/50"
                    : "bg-[var(--i-sunken)] ring-[var(--i-line)]",
                  over === day && "ring-2 ring-[var(--i-accent)]",
                )}
              >
                <h3 className="flex items-center justify-between gap-2 px-1.5 pb-1.5 pt-1">
                  <span className="text-[12px] text-[var(--i-muted)]">
                    {weekdayFormat.format(at(day))}
                    {isToday ? <span className="ml-1.5 font-medium text-[var(--i-accent-text)]">Today</span> : null}
                  </span>
                  {/* Every date sits in the same round slot, so all the columns line up. */}
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[13px] font-medium tabular-nums",
                      isToday && "bg-[var(--i-accent)] text-white",
                    )}
                  >
                    {dateFormat.format(at(day))}
                  </span>
                </h3>
                <ul className="space-y-1.5">
                  {list.map((card) => (
                    <li key={`${card.kind}:${card.id}`}>
                      <Card card={card} own={own} options={options} today={today} />
                    </li>
                  ))}
                </ul>
                {canAdd ? <AddCard day={day} today={today} options={options} /> : null}
                {!list.length && !canAdd ? <p className="px-1.5 py-2 text-[12px] text-[var(--i-faint)]">Nothing.</p> : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** "+ New" at the bottom of a day: type, press Enter; paste a list for several. */
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
  const [link, setLink] = useState(STUDIO_LINK);
  const [picked, setPicked] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const choices = useMemo(() => forSelectOptions(options), [options]);
  const suggestion = !picked && text.trim().length > 3 ? suggestLink(text, options) : null;
  const ahead = day > today;

  const add = (titles: string[]) => {
    const items = titles.map((title) => ({ title, link })).filter((item) => item.title.trim());
    if (!items.length) return;
    run(
      () => addTasks(day, items),
      () => {
        setText("");
        setLink(STUDIO_LINK);
        setPicked(false);
        box.current?.focus();
      },
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[var(--i-faint)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
      >
        <Plus size={13} /> New
      </button>
    );
  }

  return (
    <div className="mt-1.5 space-y-1.5 rounded-lg bg-[var(--i-panel)] p-1.5 ring-1 ring-[var(--i-line)]">
      <input
        ref={box}
        autoFocus
        value={text}
        disabled={pending}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            add([text]);
          }
          if (event.key === "Escape" && !startOpen) setOpen(false);
        }}
        onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
          const pasted = event.clipboardData.getData("text");
          if (!/\r?\n/.test(pasted.trim())) return;
          event.preventDefault();
          add(cleanPasted(pasted));
        }}
        onBlur={() => {
          if (!text.trim() && !startOpen) setTimeout(() => setOpen(false), 150);
        }}
        maxLength={200}
        placeholder={ahead ? "What's planned?" : "What did you do?"}
        aria-label={`New task on ${fullFormat.format(at(day))}`}
        className={inputClass("sm")}
      />
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
      ) : (
        <p className="truncate px-0.5 text-[11px] text-[var(--i-faint)]" title="Paste a list to add several at once.">
          Enter to add · {ahead ? "Not started" : "Done"}
        </p>
      )}
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
        "group rounded-lg border bg-[var(--i-panel)] p-2 shadow-[var(--i-shadow-sm)]",
        card.kind === "task" && card.blocked ? "border-rose-200 dark:border-rose-500/30" : "border-[var(--i-line)]",
        editable && "md:cursor-grab md:active:cursor-grabbing",
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
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {card.kind === "task" && editable ? (
          <Select
            aria-label={`Status of ${card.title}`}
            size="xs"
            value={card.status}
            onChange={(status) => run(() => editTask(card.id, { status }))}
            options={TASK_STATUSES.map((option) => ({ value: option.value, label: option.label }))}
            className={cn(
              "h-6 w-auto gap-1 rounded-full border-0 px-2 text-[11.5px] font-medium ring-1 ring-inset",
              TONES[TASK_STATUSES.find((option) => option.value === card.status)?.tone ?? "stone"].badge,
            )}
          />
        ) : card.kind === "task" ? (
          <Pill tone={TASK_STATUSES.find((option) => option.value === card.status)?.tone}>
            {TASK_STATUSES.find((option) => option.value === card.status)?.label}
          </Pill>
        ) : (
          <Pill tone={card.tone}>{card.status}</Pill>
        )}
        {/* Only client tags on the card (what syncs to client pages); a Studio1 area shows when editing. */}
        {card.tag && (card.kind !== "task" || card.client) ? (
          <span
            title={card.kind === "task" ? card.forLabel : card.tag}
            className={cn(
              "max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset",
              card.client
                ? "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25"
                : "bg-[var(--i-sunken)] text-[var(--i-muted)] ring-[var(--i-line)]",
            )}
          >
            {card.tag}
          </span>
        ) : null}
        {card.kind === "task" && card.blocked ? (
          <span title={card.reason} className="text-rose-600 dark:text-rose-300">
            <Prohibit size={13} />
          </span>
        ) : null}
      </div>
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
  const start = () => ({ title: card.title, link: card.link, status: card.status as TaskStatus, day: card.day ?? "" });
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
