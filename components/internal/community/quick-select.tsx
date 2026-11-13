"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check } from "@phosphor-icons/react";
import { setQuickField } from "@/app/internal/(dashboard)/community/actions";
import {
  labelOf,
  quickField,
  toneOf,
  type EntityKey,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { menuContentClass, menuItemClass } from "@/components/internal/ui";
import { Pill, TONES } from "@/components/internal/community/ui";

/** A status pill that opens a menu to change it (stage, status, column). */
export function QuickSelect({
  entity,
  id,
  value,
  canEdit,
  label,
}: {
  entity: EntityKey;
  id: string;
  value: string;
  canEdit: boolean;
  /** For screen readers: "Status of AI Meetup". */
  label?: string;
}) {
  const quick = quickField(entity);
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  if (!quick) return null;
  const pill = (
    <Pill tone={toneOf(quick.options, value)}>
      {labelOf(quick.options, value)}
    </Pill>
  );
  if (!canEdit) return pill;

  const choose = (next: string) => {
    if (next === value) return;
    startTransition(async () => {
      const result = await setQuickField(entity, id, next);
      if (result.ok) {
        toast(
          "success",
          result.message ? `Moved to ${result.message}` : "Saved",
        );
        router.refresh();
      } else {
        toast("error", result.message);
      }
    });
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label ?? "Change status"}
        disabled={busy}
        className={cn(
          "group inline-flex items-center gap-0.5 rounded-full outline-none disabled:opacity-60",
          busy && "animate-pulse",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {pill}
        <CaretDown
          size={11}
          className="text-[var(--i-faint)] group-hover:text-[var(--i-muted)]"
          aria-hidden
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(menuContentClass, "min-w-[11rem]")}
        >
          {quick.options.map((option) => (
            <Menu.Item
              key={option.value}
              onSelect={() => choose(option.value)}
              className={menuItemClass}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  TONES[option.tone ?? "stone"].dot,
                )}
              />
              <span className="flex-1">{option.label}</span>
              {option.value === value ? (
                <Check size={14} className="text-[var(--i-accent)]" />
              ) : null}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
