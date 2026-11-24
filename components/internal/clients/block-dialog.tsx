"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@/components/internal/icons";
import {
  clearBlocked as clearBlockedAction,
  setBlocked as setBlockedAction,
} from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import {
  WAITS_ON,
  type Deliverable,
  type WaitsOn,
} from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import { buttonClass, inputClass } from "@/components/internal/ui";

const clearBlocked = guarded(clearBlockedAction);
const setBlocked = guarded(setBlockedAction);

/**
 * Flag a deliverable as blocked (reason and who it waits on, both needed),
 * change the reason, or unblock it. Opens from `trigger`, or is controlled
 * with open/onOpenChange.
 */
export function BlockDialog({
  deliverable,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  deliverable: Pick<
    Deliverable,
    "id" | "title" | "blocked" | "block_reason" | "waits_on"
  >;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(480px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]"
          onClick={(event) => event.stopPropagation()}
        >
          <BlockForm
            key={deliverable.id}
            deliverable={deliverable}
            close={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BlockForm({
  deliverable,
  close,
}: {
  deliverable: Pick<
    Deliverable,
    "id" | "title" | "blocked" | "block_reason" | "waits_on"
  >;
  close: () => void;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [reason, setReason] = useState(deliverable.block_reason ?? "");
  const [waitsOn, setWaitsOn] = useState<WaitsOn | "">(
    deliverable.waits_on ?? "",
  );
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const done = (
    result: { ok: true; message?: string } | { ok: false; message: string },
  ) => {
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast("success", result.message ?? "Saved");
    close();
    afterSave();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () =>
      done(await setBlocked(deliverable.id, { reason, waits_on: waitsOn })),
    );
  };

  const unblock = () => {
    setError(null);
    startTransition(async () =>
      done(await clearBlocked(deliverable.id, comment)),
    );
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
        <Dialog.Title className="min-w-0 truncate text-[15px] font-medium">
          {deliverable.blocked ? "Blocked" : "Mark as blocked"}
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          Say what {deliverable.title} is waiting for and who it waits on.
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
      <fieldset
        disabled={busy}
        className="m-0 flex min-w-0 flex-col gap-3.5 border-0 px-5 py-4"
      >
        <p className="truncate text-[13px] text-[var(--i-muted)]">
          {deliverable.title}
        </p>
        <label className="block">
          <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
            What is it waiting for?{" "}
            <span className="text-[var(--i-accent-text)]">*</span>
          </span>
          <input
            type="text"
            required
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Access to the staging docs"
            className={inputClass()}
          />
          <span className="mt-1 block text-[12px] text-[var(--i-muted)]">
            This shows in the client&rsquo;s monthly report, so write it for
            them.
          </span>
        </label>
        <div>
          <span
            id={`waits-${deliverable.id}`}
            className="mb-1 block text-[12px] text-[var(--i-muted)]"
          >
            Waiting on <span className="text-[var(--i-accent-text)]">*</span>
          </span>
          <Select
            aria-labelledby={`waits-${deliverable.id}`}
            value={waitsOn}
            onChange={setWaitsOn}
            required
            placeholder="Pick one"
            options={WAITS_ON}
          />
        </div>
        {deliverable.blocked ? (
          <label className="block border-t border-[var(--i-line)] pt-3.5">
            <span className="mb-1 block text-[12px] text-[var(--i-muted)]">
              What unblocked it? (optional)
            </span>
            <input
              type="text"
              maxLength={500}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className={inputClass()}
            />
          </label>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="text-[12.5px] text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
      </fieldset>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
        {deliverable.blocked ? (
          <button
            type="button"
            onClick={unblock}
            disabled={busy}
            className={buttonClass("secondary")}
          >
            Unblock
          </button>
        ) : (
          <Dialog.Close asChild>
            <button type="button" className={buttonClass("ghost")}>
              Cancel
            </button>
          </Dialog.Close>
        )}
        <button
          type="submit"
          disabled={busy || !reason.trim() || !waitsOn}
          className={buttonClass("accent")}
        >
          {busy
            ? "Saving…"
            : deliverable.blocked
              ? "Save reason"
              : "Mark as blocked"}
        </button>
      </div>
    </form>
  );
}
