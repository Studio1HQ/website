"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/internal/ui";

/**
 * The frame the client-work forms share (client, engagement, scope line,
 * invoice): the same dialog as the community RecordDialog and the
 * deliverable dialog, a bottom sheet on phones via .internal-dialog.
 */

/**
 * A dialog's open state. `onOpen` runs as it opens, so a form can start
 * again from the saved values every time.
 */
export function useDialogOpen(onOpen?: () => void) {
  const [open, setOwn] = useState(false);
  const setOpen = (next: boolean) => {
    if (next && !open) onOpen?.();
    setOwn(next);
  };
  return [open, setOpen] as const;
}

export function FormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  width = "md",
  onSubmit,
  busy,
  error,
  submitLabel,
  footerStart,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  /** For screen readers. */
  description: string;
  width?: "sm" | "md";
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  /** Left of the footer when there's no error (a delete button). */
  footerStart?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]",
            width === "sm"
              ? "w-[min(480px,calc(100vw-1.5rem))]"
              : "w-[min(680px,calc(100vw-1.5rem))]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
              <Dialog.Title className="min-w-0 truncate text-[15px] font-medium">
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
              <fieldset
                disabled={busy}
                className={cn(
                  "m-0 grid min-w-0 gap-x-4 gap-y-3.5 border-0 p-0",
                  width === "md" && "sm:grid-cols-2",
                )}
              >
                {children}
              </fieldset>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--i-line)] bg-[var(--i-panel)] px-5 py-3">
              <div className="min-w-0 flex-1">
                {error ? (
                  <p
                    role="alert"
                    className="text-[12.5px] text-rose-700 dark:text-rose-300"
                  >
                    {error}
                  </p>
                ) : (
                  footerStart
                )}
              </div>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <button type="button" className={buttonClass("ghost")}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={busy}
                  className={buttonClass("accent")}
                >
                  {busy ? "Saving…" : submitLabel}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A labelled form control, with an optional hint under it. */
export function FormField({
  id,
  label,
  required = false,
  wide = false,
  help,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  /** Both columns. */
  wide?: boolean;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <label
        htmlFor={id}
        className="mb-1 block text-[12px] text-[var(--i-muted)]"
      >
        {label}
        {required ? (
          <span className="text-[var(--i-accent-text)]"> *</span>
        ) : null}
      </label>
      {children}
      {help ? (
        <p className="mt-1 text-[11.5px] leading-snug text-[var(--i-faint)]">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** A heading row inside a form grid (e.g. "Links" with the no-secrets hint). */
export function FormSection({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="mt-1 border-t border-[var(--i-line)] pt-3.5 sm:col-span-2">
      <p className="text-[13px] font-medium">{title}</p>
      {hint ? (
        <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--i-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
