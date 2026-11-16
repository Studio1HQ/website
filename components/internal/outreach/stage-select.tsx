"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check } from "@phosphor-icons/react";
import { setStage } from "@/app/internal/(dashboard)/outreach/actions";
import { labelOf, toneOf } from "@/lib/internal/community/schema";
import { ORG_STAGES, type OrgStage } from "@/lib/internal/outreach/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  buttonClass,
  inputClass,
  menuContentClass,
  menuItemClass,
} from "@/components/internal/ui";
import { Pill, TONES } from "@/components/internal/community/ui";

/**
 * The stage pill, which opens a menu to move the organisation along. Lost
 * asks why first: the reason is what the next pitch learns from.
 */
export function StageSelect({ id, value, name }: { id: string; value: OrgStage; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const move = (to: OrgStage, why?: string) =>
    startTransition(async () => {
      const result = await setStage(id, to, why);
      if (result.ok) {
        toast("success", result.message ?? "Saved");
        setAsking(false);
        setReason("");
        setError(null);
        router.refresh();
      } else if (asking) setError(result.message);
      else toast("error", result.message);
    });

  const choose = (to: OrgStage) => {
    if (to === value) return;
    if (to === "lost") setAsking(true);
    else move(to);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim()) move("lost", reason);
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Stage of ${name}`}
          disabled={busy}
          className={cn(
            "group inline-flex items-center gap-0.5 rounded-full outline-none disabled:opacity-60",
            busy && "animate-pulse",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <Pill tone={toneOf(ORG_STAGES, value)}>{labelOf(ORG_STAGES, value)}</Pill>
          <CaretDown size={11} className="text-[var(--i-faint)] group-hover:text-[var(--i-muted)]" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="start" sideOffset={6} collisionPadding={12} className={cn(menuContentClass, "min-w-[11rem]")}>
            {ORG_STAGES.map((option) => (
              <Menu.Item key={option.value} onSelect={() => choose(option.value)} className={menuItemClass}>
                <span aria-hidden className={cn("size-1.5 rounded-full", TONES[option.tone ?? "stone"].dot)} />
                <span className="flex-1">{option.label}</span>
                {option.value === value ? <Check size={14} className="text-[var(--i-accent)]" /> : null}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root
        open={asking}
        onOpenChange={(next) => {
          setAsking(next);
          if (!next) setError(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] p-5 text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
            <form onSubmit={submit}>
              <Dialog.Title className="text-[15px] font-medium">Why was {name} lost?</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-[var(--i-muted)]">
                A few words, so the next pitch learns from it.
              </Dialog.Description>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                required
                autoFocus
                aria-label="Why it was lost"
                placeholder="Went with an in-house hire"
                className={cn(inputClass(), "mt-3")}
              />
              {error ? (
                <p role="alert" className="mt-2 text-[12.5px] text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button type="button" className={buttonClass("ghost")}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={busy || !reason.trim()} className={buttonClass("accent")}>
                  {busy ? "Saving…" : "Mark as lost"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
