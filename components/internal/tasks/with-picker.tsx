"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check, Plus, UsersThree } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { inputClass, menuContentClass, menuItemClass } from "@/components/internal/ui";
import { displayName } from "@/lib/internal/team/shared";
import type { Teammate } from "@/lib/internal/tasks/shared";

/* Who a task is shared with: a two-person job shows on both lists. A small
   "+ Add people" link in the add boxes, a field in the edit dialog; both
   open the team list with a tick per person. */

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "Shivam, Nancy" from emails, by the team's names. */
export function withLabel(emails: readonly string[], team: readonly Teammate[]) {
  return emails.map((email) => firstName(team.find((person) => person.email === email)?.name || displayName({ email }))).join(", ");
}

export function WithPicker({
  team,
  value,
  onChange,
  exclude = [],
  variant = "link",
  disabled,
}: {
  /** Everyone active on the team list. */
  team: readonly Teammate[];
  /** Picked emails (lowercase). */
  value: readonly string[];
  onChange: (emails: string[]) => void;
  /** Not offered: the task's own person. */
  exclude?: readonly string[];
  variant?: "link" | "field";
  disabled?: boolean;
}) {
  const left = new Set(exclude.map((email) => email.toLowerCase()));
  const choices = team.filter((person) => !left.has(person.email));
  if (!choices.length) return null;
  const picked = value.length ? withLabel(value, team) : "";
  const toggle = (email: string, on: boolean) =>
    onChange(on ? [...new Set([...value, email])] : value.filter((item) => item !== email));

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={picked ? `Shared with ${picked}` : "Share with people"}
        className={cn(
          variant === "field"
            ? cn(inputClass(), "flex items-center justify-between gap-2 pr-2.5 text-left data-[state=open]:bg-[var(--i-panel)]")
            : cn(
                "flex max-w-full items-center gap-1 px-0.5 text-left text-[11.5px] outline-none hover:text-[var(--i-ink)] focus-visible:text-[var(--i-ink)] data-[state=open]:text-[var(--i-ink)]",
                picked ? "text-[var(--i-ink-2)]" : "text-[var(--i-faint)]",
              ),
        )}
      >
        {variant === "field" ? (
          <>
            <span className={cn("min-w-0 truncate", !picked && "text-[var(--i-faint)]")}>{picked || "Nobody else"}</span>
            <CaretDown size={12} weight="bold" className="shrink-0 text-[var(--i-muted)]" />
          </>
        ) : picked ? (
          <>
            <UsersThree size={12} className="shrink-0" />
            <span className="truncate">With {picked}</span>
          </>
        ) : (
          <>
            <Plus size={11} className="shrink-0" /> Add people
          </>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(menuContentClass, "max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-[13rem] overflow-y-auto")}
        >
          <DropdownMenu.Label className="px-2 pb-1 pt-1.5 text-[11.5px] leading-snug text-[var(--i-faint)]">
            Doing it together: it shows on their list too
          </DropdownMenu.Label>
          {choices.map((person) => (
            <DropdownMenu.CheckboxItem
              key={person.email}
              checked={value.includes(person.email)}
              onCheckedChange={(on) => toggle(person.email, on === true)}
              // Stay open, to pick a few.
              onSelect={(event) => event.preventDefault()}
              className={menuItemClass}
            >
              <span className="min-w-0 flex-1 truncate">{person.name}</span>
              <DropdownMenu.ItemIndicator>
                <Check size={14} className="text-[var(--i-accent)]" />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
