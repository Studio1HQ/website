"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { menuContentClass, menuItemClass } from "@/components/internal/ui";
import { TASK_STATUSES, type Column } from "@/lib/internal/tasks/shared";
import { cn } from "@/lib/utils";

/** Notion-style status pills: a tinted fill, a dot, in each status's colour. */
export const STATUS_PILL: Record<Column, { pill: string; dot: string }> = {
  todo: { pill: "bg-black/[0.06] text-[var(--i-ink-2)] dark:bg-white/[0.1] dark:text-[var(--i-ink)]", dot: "bg-stone-400" },
  doing: { pill: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/25 dark:text-sky-100", dot: "bg-sky-500" },
  review: { pill: "bg-violet-500/15 text-violet-800 dark:bg-violet-500/25 dark:text-violet-100", dot: "bg-violet-500" },
  done: { pill: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100", dot: "bg-emerald-500" },
};

/** The statuses in Notion's three groups. */
export const STATUS_GROUPS: { label: string; values: Column[] }[] = [
  { label: "To-do", values: ["todo"] },
  { label: "In progress", values: ["doing", "review"] },
  { label: "Complete", values: ["done"] },
];

export function StatusPill({ status, label, small = false }: { status: Column; label?: string; small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        small ? "h-5 px-2 text-[11.5px]" : "h-6 px-2.5 text-[12.5px]",
        STATUS_PILL[status].pill,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", STATUS_PILL[status].dot)} />
      {label ?? TASK_STATUSES.find((option) => option.value === status)?.label}
    </span>
  );
}

/**
 * A status you can change: the pill itself is the button, and it opens the
 * status menu laid out like Notion's (the current one, then To-do, In
 * progress and Complete).
 */
export function StatusPicker({
  status,
  onChange,
  label,
  extra,
}: {
  status: Column;
  onChange: (status: Column) => void;
  label: string;
  /** More menu items under the statuses (block, edit). */
  extra?: ReactNode;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        onPointerDown={(event) => event.stopPropagation()}
        className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--i-ring)]"
      >
        <StatusPill status={status} small />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={4} className={menuContentClass}>
          <StatusMenuItems status={status} onChange={onChange} />
          {extra}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** The statuses inside a menu, in Notion's groups. */
export function StatusMenuItems({ status, onChange }: { status: Column; onChange: (status: Column) => void }) {
  return (
    <>
      <div className="px-2 pb-2 pt-1.5">
        <StatusPill status={status} />
      </div>
      {STATUS_GROUPS.map((group) => (
        <Menu.Group key={group.label} className="border-t border-[var(--i-line)] py-1">
          <Menu.Label className="px-2 pb-1 pt-1 text-[11.5px] font-medium text-[var(--i-muted)]">{group.label}</Menu.Label>
          {group.values.map((value) => (
            <Menu.Item
              key={value}
              onSelect={() => onChange(value)}
              className={cn(menuItemClass, "py-1", value === status && "bg-[var(--i-hover)]")}
            >
              <StatusPill status={value} />
            </Menu.Item>
          ))}
        </Menu.Group>
      ))}
    </>
  );
}
