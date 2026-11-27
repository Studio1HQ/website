"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@/components/internal/icons";
import { guarded } from "@/components/internal/guarded";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";
import type { InboundResult } from "@/lib/internal/inbound/schema";

/**
 * A small dialog around one form: the trigger opens it, Save runs `submit`,
 * and a refusal is written under the fields with what was typed kept. A
 * save closes it and toasts. The page refreshes itself from the action's
 * revalidate, so nothing here refreshes it again.
 */
export function FormDialog({
  trigger,
  title,
  description,
  submitLabel,
  submit,
  onSaved,
  onOpen,
  disabled = false,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  submit: () => Promise<InboundResult>;
  /** After a save, with the action's answer (to go to the new page, or clear the fields). */
  onSaved?: (result: Extract<InboundResult, { ok: true }>) => void;
  /** Each time it opens, to start the fields clean. */
  onOpen?: () => void;
  /** The form isn't ready to send (a required field is empty). */
  disabled?: boolean;
  children: ReactNode;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    setError(null);
    startSaving(async () => {
      const result = await guarded(submit)();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      onSaved?.(result);
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setError(null);
          onOpen?.();
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
              <Dialog.Title className="text-[15px] font-medium">
                {title}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                {description}
              </Dialog.Description>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <fieldset disabled={saving} className="m-0 grid min-w-0 gap-3.5 border-0 p-0">
                <p className="text-[13px] leading-relaxed text-[var(--i-muted)]">
                  {description}
                </p>
                {children}
              </fieldset>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--i-line)] bg-[var(--i-panel)] px-5 py-3">
              <p
                role="alert"
                className="min-w-0 flex-1 text-[12.5px] text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <button type="button" className={buttonClass("ghost")}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={saving || disabled}
                  className={buttonClass("accent")}
                >
                  {saving ? "Saving…" : submitLabel}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function LabelledField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-[12.5px] text-[var(--i-muted)]">
      {label}
      <span className="mt-1 block text-[var(--i-ink)]">{children}</span>
      {hint ? (
        <span className="mt-1 block text-[11.5px] leading-snug text-[var(--i-faint)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
