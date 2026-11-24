"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Flag } from "@/components/internal/icons";
import { cn } from "@/lib/utils";
import { menuContentClass, menuItemClass } from "@/components/internal/ui";
import { TASK_PRIORITIES, isTaskPriority, type TaskPriority } from "@/lib/internal/tasks/shared";

/* A task's priority: the mark on a card, and a small flag button to pick it
   in the add boxes. Medium is the default, so cards only mark Top and Low. */

const FLAG_TONE: Record<TaskPriority, string> = {
  top: "text-amber-600 dark:text-amber-300",
  medium: "text-[var(--i-muted)]",
  low: "text-[var(--i-faint)]",
};

function PriorityFlag({ priority, size = 12 }: { priority: TaskPriority; size?: number }) {
  return <Flag size={size} weight={priority === "top" ? "fill" : "regular"} className={cn("shrink-0", FLAG_TONE[priority])} />;
}

const labelOf = (priority: TaskPriority) => TASK_PRIORITIES.find((option) => option.value === priority)?.label ?? "Medium";

/** "Top" or "Low" on a card, with its flag; nothing for Medium. */
export function PriorityMark({ priority, className }: { priority: TaskPriority; className?: string }) {
  if (priority === "medium") return null;
  const top = priority === "top";
  return (
    <span
      title={`${labelOf(priority)} priority`}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        top ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "bg-[var(--i-sunken)] text-[var(--i-faint)]",
        className,
      )}
    >
      <PriorityFlag priority={priority} size={11} />
      {labelOf(priority)}
    </span>
  );
}

/**
 * A flag button that opens Top / Medium / Low. The flag fills in amber for
 * Top, so the choice shows without taking a whole field's width.
 */
export function PriorityPicker({
  value,
  onChange,
  size = "sm",
  disabled,
}: {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  size?: "xs" | "sm";
  disabled?: boolean;
}) {
  const label = `Priority: ${labelOf(value)}`;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg border outline-none transition-colors hover:bg-[var(--i-hover)] focus-visible:ring-2 focus-visible:ring-[var(--i-ring)] data-[state=open]:bg-[var(--i-hover)] disabled:opacity-50",
          size === "sm" ? "size-8" : "size-7",
          value === "top"
            ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
            : "border-[var(--i-line)] bg-[var(--i-sunken)]",
        )}
      >
        <PriorityFlag priority={value} size={size === "sm" ? 14 : 13} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={12} className={cn(menuContentClass, "min-w-[10rem]")}>
          <DropdownMenu.Label className="px-2 pb-1 pt-1.5 text-[11.5px] text-[var(--i-faint)]">Priority</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={value} onValueChange={(next) => isTaskPriority(next) && onChange(next)}>
            {TASK_PRIORITIES.map((option) => (
              <DropdownMenu.RadioItem key={option.value} value={option.value} className={menuItemClass}>
                <PriorityFlag priority={option.value} size={13} />
                <span className="flex-1">{option.label}</span>
                <DropdownMenu.ItemIndicator>
                  <Check size={14} className="text-[var(--i-accent)]" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
