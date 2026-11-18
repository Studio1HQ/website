"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { menuContentClass, menuItemClass } from "@/components/internal/ui";

export type FilterOption = {
  key: string;
  label: string;
  href: string;
  on: boolean;
  icon?: ReactNode;
  /** A quiet hint after the label, like "10k–100k". */
  note?: string;
};

/**
 * One filter as a dropdown of links. The first item is the "any" choice:
 * while it's on, the button shows just the filter's name; pick another and
 * the button shows the choice and is raised. Sorts pass `always` so the
 * button always says what it's sorted by.
 */
export function FilterDropdown({
  label,
  items,
  always = false,
  align = "start",
}: {
  label: string;
  items: readonly FilterOption[];
  always?: boolean;
  align?: "start" | "end";
}) {
  const current = items.find((item) => item.on) ?? items[0];
  const chosen = Boolean(current) && current !== items[0];
  const showValue = Boolean(current) && (chosen || always);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[12.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--i-ring)] data-[state=open]:bg-[var(--i-hover)]",
          chosen
            ? "border-[var(--i-line-strong)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-sm)]"
            : "border-[var(--i-line)] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
        )}
      >
        {chosen ? current.icon : null}
        {showValue ? (
          <span>
            <span className="text-[var(--i-muted)]">{label}: </span>
            <span className="font-medium">{current.label}</span>
          </span>
        ) : (
          label
        )}
        <CaretDown size={11} aria-hidden className="text-[var(--i-faint)]" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            menuContentClass,
            "max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-auto",
          )}
        >
          {items.map((item) => (
            <DropdownMenu.Item key={item.key} asChild>
              <Link
                href={item.href}
                aria-current={item.on ? "true" : undefined}
                className={cn(menuItemClass, item.on && "font-medium")}
              >
                {item.icon ? (
                  <span className="flex w-4 shrink-0 justify-center">
                    {item.icon}
                  </span>
                ) : null}
                <span className="flex-1 truncate">{item.label}</span>
                {item.note ? (
                  <span className="text-[12px] tabular-nums text-[var(--i-faint)]">
                    {item.note}
                  </span>
                ) : null}
                <Check
                  size={13}
                  aria-hidden
                  className={cn(
                    "shrink-0 text-[var(--i-accent)]",
                    !item.on && "invisible",
                  )}
                />
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
