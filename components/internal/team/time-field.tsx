"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Clock } from "@/components/internal/icons";
import { inputClass, menuContentClass } from "@/components/internal/ui";
import { cn } from "@/lib/utils";

/*
 * A time of day: type it ("9:30", "930", "2pm", "14:15") or pick from the
 * list. Used instead of <input type="time">, whose picker the browser draws
 * in its own style. The value is "HH:MM" on a 24-hour clock, or "".
 */

/** "9", "930", "9.30", "9:30 pm", "21:30" → "09:30" / "21:30"; nonsense → null; blank → "". */
export function parseTimeText(text: string): string | null {
  const clean = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!clean) return "";
  const match = clean.match(/^(\d{1,2})(?:[:.]?(\d{2}))?(am|pm|a|p)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const half = match[3]?.[0];
  if (minutes > 59) return null;
  if (half) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (half === "p" ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "09:30" → "9:30 am", "14:00" → "2:00 pm". */
export function timeLabel(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return "";
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "am" : "pm"}`;
}

/** Every half hour of the day. */
const SLOTS = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);

export function TimeField({
  value,
  onChange,
  id,
  placeholder = "9:30 am",
  /** Where the list opens when nothing is picked yet. */
  around = "09:00",
  onInvalidChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  around?: string;
  /**
   * Told when what's typed can't be read as a time (and when it can again),
   * so the form can hold its Save button: the unreadable text then stays in
   * the box, marked. Without this, an unreadable entry is dropped when the
   * box is left and the last good time shows again, so what's on screen is
   * always what gets saved.
   */
  onInvalidChange?: (invalid: boolean) => void;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  // What's being typed; null while the field just shows the value.
  const [draft, setDraft] = useState<string | null>(null);
  const bad = draft !== null && parseTimeText(draft) === null;

  const type = (text: string | null) => {
    setDraft(text);
    onInvalidChange?.(text !== null && parseTimeText(text) === null);
  };

  const commit = () => {
    if (draft === null) return;
    const parsed = parseTimeText(draft);
    if (parsed === null) {
      // With a form holding its Save, the text stays, marked, until fixed.
      if (!onInvalidChange) type(null);
      return;
    }
    onChange(parsed);
    type(null);
  };

  const focusSlot = value ? value.slice(0, 5) : around;
  // The slot at or just before the value, so the list opens near it.
  const nearest = [...SLOTS].reverse().find((slot) => slot <= focusSlot) ?? SLOTS[0];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="relative">
          <input
            id={id}
            aria-label={ariaLabel}
            aria-invalid={bad || undefined}
            inputMode="text"
            autoComplete="off"
            placeholder={placeholder}
            value={draft ?? timeLabel(value)}
            onChange={(event) => type(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              // Enter that confirms an input method's composition isn't ours.
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
              }
            }}
            className={cn(inputClass(), "pr-9 tabular-nums", bad && "border-rose-400 dark:border-rose-500/60")}
          />
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Pick a time"
              className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
            >
              <Clock size={15} />
            </button>
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(menuContentClass, "max-h-60 w-[var(--radix-popover-trigger-width)] min-w-[9rem] overflow-y-auto")}
        >
          <ul role="listbox" aria-label="Times">
            {SLOTS.map((slot) => {
              const on = slot === value.slice(0, 5);
              return (
                <li key={slot} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    // Bring the current time (or a sensible start) into view on open.
                    ref={slot === nearest ? (node) => node?.scrollIntoView({ block: "center" }) : undefined}
                    onClick={() => {
                      onChange(slot);
                      type(null);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left tabular-nums outline-none hover:bg-[var(--i-hover)] focus-visible:bg-[var(--i-hover)]",
                      on && "font-medium",
                    )}
                  >
                    {timeLabel(slot)}
                    {on ? <Check size={14} className="text-[var(--i-accent)]" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
