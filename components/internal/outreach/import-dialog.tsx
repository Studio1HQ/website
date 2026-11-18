"use client";

import { useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { importOrgs } from "@/app/internal/(dashboard)/outreach/actions";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";

/**
 * Brings organisations in from a spreadsheet saved as CSV: one company per
 * row, with at most one person. Anything already here (same website) is
 * skipped, so importing the same sheet twice is safe.
 */
export function ImportDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFile(event.target.files?.[0] ?? null);
  };

  const run = () => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("That file is too big. Split it and import the parts.");
      return;
    }
    startTransition(async () => {
      const result = await importOrgs(await file.text());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.warning) toast("error", result.warning);
      else toast("success", result.message ?? "Imported");
      setOpen(false);
      setFile(null);
      router.refresh();
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setFile(null);
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
            <Dialog.Title className="text-[15px] font-medium">Import from a spreadsheet</Dialog.Title>
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
          <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed">
            <Dialog.Description className="text-[var(--i-muted)]">
              Save the sheet as CSV, one company per row. It needs a <b className="font-medium text-[var(--i-ink)]">name</b>{" "}
              (or company) column. These are read too when they&apos;re there: website, kind, stage (or outreach
              status), source, owner, notes, and the contact&apos;s name, email, role, LinkedIn and X.
            </Dialog.Description>
            <p className="text-[var(--i-muted)]">
              Prospect research comes in as well: priority, category, funding, why they fit, warm path, source
              link and conflict.
            </p>
            <p className="text-[var(--i-muted)]">
              A company whose website is already here is skipped. An owner who isn&apos;t an admin becomes you.
            </p>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={pick}
              aria-label="CSV file"
              className="block w-full text-[13px] file:mr-3 file:h-8 file:rounded-lg file:border file:border-[var(--i-line)] file:bg-[var(--i-panel)] file:px-3 file:text-[13px] file:font-medium file:text-[var(--i-ink)]"
            />
            {error ? (
              <p role="alert" className="text-[12.5px] text-rose-700 dark:text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
            <Dialog.Close asChild>
              <button type="button" className={buttonClass("ghost")}>
                Cancel
              </button>
            </Dialog.Close>
            <button type="button" onClick={run} disabled={busy || !file} className={buttonClass("accent")}>
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
