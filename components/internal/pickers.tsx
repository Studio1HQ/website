"use client";

import { useId, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarBlank, CaretLeft, CaretRight, Check } from "@/components/internal/icons";
import { inputClass, menuContentClass } from "@/components/internal/ui";
import { cn } from "@/lib/utils";

/*
 * The dashboard's own pickers, used instead of the controls the browser
 * draws in its own style: <input type="date">, <input type="month"> and
 * <datalist>. Each opens the same panel as the dashboard's menus. Values are
 * the plain strings the native inputs gave ("YYYY-MM-DD", "YYYY-MM"), so
 * they drop in without other changes. The time of day is TimeField
 * (components/internal/team/time-field.tsx).
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (value: number) => String(value).padStart(2, "0");

/** Today as "YYYY-MM-DD" on this device's clock. */
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isDateText(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** "2026-11-14" → "14 Nov 2026". */
export function dateFieldLabel(value: string) {
  if (!isDateText(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1].slice(0, 3)} ${year}`;
}

/** "2026-11" → "November 2026". */
export function monthFieldLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return "";
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** The weeks of a month, Monday first; null for the blanks before and after. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, index) => `${year}-${pad(month)}-${pad(index + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

function stepMonth(year: number, month: number, by: number) {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const navButton =
  "flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)] disabled:opacity-40 disabled:hover:bg-transparent";

/** The field-styled button every picker opens from. */
function Trigger({
  id,
  label,
  placeholder,
  disabled,
  className,
  ariaLabel,
}: {
  id?: string;
  label: string;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Popover.Trigger asChild>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel}${label ? `: ${label}` : ""}` : undefined}
        className={cn(
          inputClass(),
          "flex items-center justify-between gap-2 text-left tabular-nums data-[state=open]:border-[var(--i-line-strong)] data-[state=open]:bg-[var(--i-panel)]",
          !label && "text-[var(--i-faint)]",
          className,
        )}
      >
        <span className="min-w-0 truncate">{label || placeholder}</span>
        <CalendarBlank size={15} className="shrink-0 text-[var(--i-muted)]" />
      </button>
    </Popover.Trigger>
  );
}

/**
 * Keeps a form's own "fill this in" check working: the browser looks at
 * this hidden input, which holds the picker's value.
 */
function RequiredProxy({ value, required }: { value: string; required?: boolean }) {
  if (!required) return null;
  return (
    <input
      tabIndex={-1}
      aria-hidden
      required
      value={value}
      onChange={() => {}}
      className="pointer-events-none absolute bottom-0 left-6 size-px opacity-0"
    />
  );
}

/* ------------------------------------------------------------------ date */

export function DateField({
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  id,
  className,
  placeholder = "Pick a date",
  "aria-label": ariaLabel,
}: {
  /** "YYYY-MM-DD", or "". */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** No Clear button, and the form won't submit while it's empty. */
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** Width and the like for the trigger. */
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = localToday();
  const start = isDateText(value) ? value : max && max < today ? max : min && min > today ? min : today;
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });

  const allowed = (day: string) => (!min || day >= min) && (!max || day <= max);
  const monthKey = (at: { year: number; month: number }) => `${at.year}-${pad(at.month)}`;
  const previous = stepMonth(view.year, view.month, -1);
  const next = stepMonth(view.year, view.month, 1);
  const pick = (day: string) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(now) => {
        // Open on the month of the value each time.
        if (now) setView({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
        setOpen(now);
      }}
    >
      <span className="relative block">
        <Trigger id={id} label={dateFieldLabel(value)} placeholder={placeholder} disabled={disabled} className={className} ariaLabel={ariaLabel} />
        <RequiredProxy value={value} required={required} />
      </span>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className={cn(menuContentClass, "w-[17rem] p-3")}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={Boolean(min) && monthKey(previous) < min!.slice(0, 7)}
              onClick={() => setView(previous)}
              className={navButton}
            >
              <CaretLeft size={14} />
            </button>
            <p className="text-[13px] font-medium" aria-live="polite">
              {MONTHS[view.month - 1]} {view.year}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={Boolean(max) && monthKey(next) > max!.slice(0, 7)}
              onClick={() => setView(next)}
              className={navButton}
            >
              <CaretRight size={14} />
            </button>
          </div>
          <table className="w-full border-collapse text-center text-[12.5px]">
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col" className="pb-1 text-[11px] font-normal text-[var(--i-faint)]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(view.year, view.month).map((week, index) => (
                <tr key={index}>
                  {week.map((day, at) => (
                    <td key={day ?? `blank-${at}`} className="p-0">
                      {day ? (
                        <button
                          type="button"
                          disabled={!allowed(day)}
                          aria-pressed={day === value}
                          aria-label={dateFieldLabel(day)}
                          autoFocus={day === (isDateText(value) ? value : today)}
                          onClick={() => pick(day)}
                          className={cn(
                            "mx-auto flex size-8 items-center justify-center rounded-lg tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--i-accent)] disabled:text-[var(--i-faint)] disabled:opacity-40",
                            day === value
                              ? "bg-[var(--i-accent)] font-medium text-white"
                              : cn(
                                  "enabled:hover:bg-[var(--i-hover)]",
                                  day === today && "font-medium text-[var(--i-accent-text)] ring-1 ring-inset ring-[var(--i-line)]",
                                ),
                          )}
                        >
                          {Number(day.slice(8))}
                        </button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--i-line)] pt-2 text-[12.5px]">
            <button
              type="button"
              disabled={!allowed(today)}
              onClick={() => pick(today)}
              className="rounded-md px-2 py-1 text-[var(--i-ink-2)] hover:bg-[var(--i-hover)] disabled:opacity-40"
            >
              Today
            </button>
            {!required && value ? (
              <button
                type="button"
                onClick={() => pick("")}
                className="rounded-md px-2 py-1 text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                Clear
              </button>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ----------------------------------------------------------------- month */

export function MonthField({
  value,
  onChange,
  required,
  id,
  className,
  placeholder = "Pick a month",
  "aria-label": ariaLabel,
}: {
  /** "YYYY-MM", or "". */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const thisMonth = localToday().slice(0, 7);
  const startYear = Number((monthFieldLabel(value) ? value : thisMonth).slice(0, 4));
  const [year, setYear] = useState(startYear);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(now) => {
        if (now) setYear(startYear);
        setOpen(now);
      }}
    >
      <span className="relative block">
        <Trigger id={id} label={monthFieldLabel(value)} placeholder={placeholder} className={className} ariaLabel={ariaLabel} />
        <RequiredProxy value={value} required={required} />
      </span>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className={cn(menuContentClass, "w-[15rem] p-3")}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous year" onClick={() => setYear(year - 1)} className={navButton}>
              <CaretLeft size={14} />
            </button>
            <p className="text-[13px] font-medium tabular-nums" aria-live="polite">
              {year}
            </p>
            <button type="button" aria-label="Next year" onClick={() => setYear(year + 1)} className={navButton}>
              <CaretRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((name, index) => {
              const key = `${year}-${pad(index + 1)}`;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === value}
                  aria-label={`${name} ${year}`}
                  autoFocus={key === (monthFieldLabel(value) ? value : thisMonth)}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-lg text-[12.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--i-accent)]",
                    key === value
                      ? "bg-[var(--i-accent)] font-medium text-white"
                      : cn("hover:bg-[var(--i-hover)]", key === thisMonth && "font-medium text-[var(--i-accent-text)] ring-1 ring-inset ring-[var(--i-line)]"),
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ----------------------------------------------------------- suggestions */

export type Suggestion = { value: string; label?: ReactNode };

/** The suggestions that match what's typed (all of them while it's blank or an exact pick). */
export function matchSuggestions(options: readonly Suggestion[], text: string) {
  const typed = text.trim().toLowerCase();
  if (!typed || options.some((option) => option.value.toLowerCase() === typed)) return [...options];
  return options.filter(
    (option) => option.value.toLowerCase().includes(typed) || (typeof option.label === "string" && option.label.toLowerCase().includes(typed)),
  );
}

/**
 * A text box that offers suggestions while still taking anything typed:
 * what <input list> with a <datalist> did, with the dashboard's own list.
 */
export function SuggestInput({
  value,
  onChange,
  options,
  className,
  ...input
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly Suggestion[];
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className" | "list">) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const shown = matchSuggestions(options, value);
  const visible = open && shown.length > 0 && !input.disabled;

  const choose = (option: Suggestion) => {
    onChange(option.value);
    setOpen(false);
    setActive(-1);
  };

  return (
    <Popover.Root open={visible} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <input
          {...input}
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={(event) => {
            setOpen(true);
            input.onFocus?.(event);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            // Mid-composition (an IME), these keys belong to the composer.
            if (event.nativeEvent.isComposing) {
              input.onKeyDown?.(event);
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (shown.length) setActive((at) => (at + (event.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
            } else if (event.key === "Enter" && visible && active >= 0) {
              event.preventDefault();
              choose(shown[active]);
            } else if (event.key === "Escape" && visible) {
              event.stopPropagation();
              setOpen(false);
            }
            input.onKeyDown?.(event);
          }}
          className={className ?? inputClass()}
        />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // The text box keeps the keyboard; the list is picked with arrows or the mouse.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            // A click back in the box isn't "outside".
            if (event.target instanceof Element && event.target.getAttribute("role") === "combobox") event.preventDefault();
          }}
          className={cn(menuContentClass, "max-h-56 w-[var(--radix-popover-trigger-width)] min-w-[10rem] overflow-y-auto")}
        >
          <ul role="listbox" id={listId}>
            {shown.map((option, index) => {
              const on = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-${index}`}
                    aria-selected={on}
                    tabIndex={-1}
                    // Arrowing past the edge of the list brings the option into view.
                    ref={index === active ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined}
                    // Keep the focus in the text box while clicking.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left outline-none",
                      index === active && "bg-[var(--i-hover)]",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label ?? option.value}</span>
                    {on ? <Check size={14} className="shrink-0 text-[var(--i-accent)]" /> : null}
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
