"use client";

import { useState, useTransition } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check } from "@/components/internal/icons";
import {
  saveClient as saveClientAction,
} from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import { CLIENT_STATUSES, type ClientStatus } from "@/lib/internal/clients/schema";
import { OptionBadge } from "@/components/internal/clients/ui";
import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useToast } from "@/components/internal/toast";
import { menuContentClass, menuItemClass } from "@/components/internal/ui";
import { cn } from "@/lib/utils";

const saveClient = guarded(saveClientAction);

/**
 * A company's status as a pill that opens a menu (Prospect, Active, Paused,
 * Ended). The pill shows the new status at once and goes back if the save
 * fails. Without `canEdit` it's just the pill; saveClient checks the role
 * again on the server.
 */
export function ClientStatusMenu({
  clientId,
  name,
  status,
  canEdit,
}: {
  clientId: string;
  name: string;
  status: ClientStatus;
  canEdit: boolean;
}) {
  const toast = useToast();
  const afterSave = useAfterSave();
  const [shown, setShown] = useState(status);
  const [seen, setSeen] = useState(status);
  const [busy, startSaving] = useTransition();
  // A save elsewhere (the Edit dialog, another tab) changed it: follow.
  if (status !== seen) {
    setSeen(status);
    setShown(status);
  }
  if (!canEdit) return <OptionBadge list={CLIENT_STATUSES} value={status} />;

  const pick = (next: ClientStatus) => {
    if (next === shown) return;
    const before = shown;
    setShown(next);
    startSaving(async () => {
      const result = await saveClient(clientId, { status: next });
      // Not saved, or the request never arrived (offline): the pill goes back.
      if (!result.ok) {
        setShown(before);
        toast("error", result.message);
        return;
      }
      toast("success", `${name}: ${CLIENT_STATUSES.find((item) => item.value === next)?.label ?? next}`);
      afterSave();
    });
  };

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={`Status of ${name}: ${CLIENT_STATUSES.find((item) => item.value === shown)?.label}. Change it`}
        disabled={busy}
        className={cn(
          "group inline-flex items-center gap-0.5 rounded-full outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--i-ring)] disabled:opacity-60",
        )}
      >
        <OptionBadge list={CLIENT_STATUSES} value={shown} />
        <CaretDown size={12} className="text-[var(--i-faint)] group-hover:text-[var(--i-ink)] group-data-[state=open]:text-[var(--i-ink)]" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={6} className={menuContentClass}>
          {CLIENT_STATUSES.map((option) => (
            <Menu.Item key={option.value} className={menuItemClass} onSelect={() => pick(option.value)}>
              <span className="flex-1">
                <OptionBadge list={CLIENT_STATUSES} value={option.value} />
              </span>
              {option.value === shown ? <Check size={14} className="text-[var(--i-accent)]" /> : null}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
