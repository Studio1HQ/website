"use client";

import { useTransition, type ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";
import { monthLabel, shiftMonth, type TeamResult } from "@/lib/internal/team/shared";

/* Small client pieces the team pages share: inputs, dialogs, month switcher. */

/** Runs a server action, toasts its message, and reports when it's done. */
export function useTeamAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<TeamResult>, onDone?: () => void) =>
    start(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (result.message) toast("success", result.message);
          onDone?.();
        } else {
          toast("error", result.message);
        }
      } catch {
        toast("error", "Something went wrong. Try again in a minute.");
      }
    });
  return { pending, run };
}

export function Label({
  label,
  hint,
  children,
  className,
  group = false,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  /** For pill groups and other sets of controls: a group, not a <label> (labels can't nest). */
  group?: boolean;
}) {
  const caption = (
    <span className="block text-[12px] text-[var(--i-muted)]">
      {label}
      {hint ? <span className="text-[var(--i-faint)]"> · {hint}</span> : null}
    </span>
  );
  return group ? (
    <div role="group" aria-label={label} className={cn("block space-y-1.5", className)}>
      {caption}
      {children}
    </div>
  ) : (
    <label className={cn("block space-y-1.5", className)}>
      {caption}
      {children}
    </label>
  );
}

/** A row of pill radios: Worked / Half day / Leave. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "inline-flex h-8 cursor-pointer select-none items-center rounded-full border px-3 text-[12.5px] transition-colors",
              on
                ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] font-medium text-[var(--i-accent-text)]"
                : "border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)]",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              checked={on}
              onChange={() => onChange(option.value)}
              name={label}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export function TeamDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]",
            wide ? "w-[min(720px,calc(100vw-1.5rem))]" : "w-[min(460px,calc(100vw-1.5rem))]",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
            <div className="min-w-0">
              <Dialog.Title className="text-[15px] font-medium">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[12.5px] text-[var(--i-muted)]">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">{footer}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** ‹ November 2026 › as links that keep the page's other query params. */
export function MonthSwitcher({
  month,
  current,
  hrefFor,
}: {
  month: string;
  /** This month: the › arrow stops here. */
  current: string;
  hrefFor: (month: string) => string;
}) {
  const next = shiftMonth(month, 1);
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] p-0.5 shadow-[var(--i-shadow-sm)]">
      <Link
        href={hrefFor(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
      >
        <CaretLeft size={14} />
      </Link>
      <span className="min-w-[8.5rem] text-center text-[13px] font-medium tabular-nums">{monthLabel(month)}</span>
      {next <= current ? (
        <Link
          href={hrefFor(next)}
          aria-label="Next month"
          className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
        >
          <CaretRight size={14} />
        </Link>
      ) : (
        <span aria-hidden className="flex size-7 items-center justify-center text-[var(--i-line-strong)]">
          <CaretRight size={14} />
        </span>
      )}
      {month !== current ? (
        <Link href={hrefFor(current)} className={cn(buttonClass("ghost", "sm"), "ml-0.5 h-7")}>
          This month
        </Link>
      ) : null}
    </div>
  );
}

/** Shrinks a photo in the browser before upload, so phone photos stay small. */
export async function shrinkImage(file: File, max = 800): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}
