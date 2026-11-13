"use client";

import type { ReactNode } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  inputClass,
  menuContentClass,
  menuItemClass,
} from "@/components/internal/ui";

/**
 * The dashboard's dropdown for picking one value: a field-styled trigger
 * and the same list as the dashboard's menus (check on the right). Use it
 * instead of a native <select>, whose list the OS draws.
 */

export type SelectOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  /** Typeahead text when the label isn't a plain string. */
  textValue?: string;
  disabled?: boolean;
};

/** Radix can't hold "" as an item value, so a blank option (None, All) rides on this. */
const BLANK = "__blank__";
const toItem = (value: string) => (value === "" ? BLANK : value);

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  size = "md",
  id,
  name,
  required,
  disabled,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  /** Shown while the value is "" and no option has the value "". */
  placeholder?: string;
  size?: "xs" | "sm" | "md";
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Width and the like for the trigger. */
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const hasBlank = options.some((option) => option.value === "");
  return (
    <RadixSelect.Root
      value={value === "" && !hasBlank ? "" : toItem(value)}
      onValueChange={(next) => onChange((next === BLANK ? "" : next) as T)}
      name={name}
      required={required}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        className={cn(
          inputClass(size),
          "flex items-center justify-between gap-2 text-left data-[placeholder]:text-[var(--i-faint)] data-[state=open]:border-[var(--i-line-strong)] data-[state=open]:bg-[var(--i-panel)]",
          size === "xs" ? "pr-1.5" : "pr-2.5",
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon asChild>
          <CaretDown
            size={12}
            weight="bold"
            className="shrink-0 text-[var(--i-muted)]"
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            menuContentClass,
            "max-h-[min(20rem,calc(var(--radix-select-content-available-height)/var(--s1-zoom,1)))] min-w-[max(calc(var(--radix-select-trigger-width)/var(--s1-zoom,1)),8rem)]",
            contentClassName,
          )}
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value || BLANK}
                value={toItem(option.value)}
                disabled={option.disabled}
                textValue={option.textValue}
                className={menuItemClass}
              >
                <span className="min-w-0 flex-1 truncate">
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </span>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-[var(--i-accent)]" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
