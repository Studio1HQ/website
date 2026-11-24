"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@/components/internal/icons";
import { buttonClass } from "@/components/internal/ui";
import { setSectionHidden, showAllSections, useHiddenSections } from "@/components/internal/sidebar-prefs";
import { cn } from "@/lib/utils";

/** The sidebar's sections, read from the sidebar itself (only the ones this person has). */
function readSections() {
  return [...document.querySelectorAll<HTMLElement>("#internal-sidebar [data-group]")]
    .map((group) => group.dataset.group ?? "")
    .filter(Boolean);
}

/**
 * Customise sidebar: an on/off switch for each section of the sidebar
 * (Workspaces, Pipelines, Team, ...). A switched-off section disappears from
 * the sidebar until it's switched back on; Overview always stays. Opened
 * from the account menu (the "internal:customise-sidebar" event).
 */
export function CustomiseSidebar() {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<string[]>([]);
  const hidden = useHiddenSections();

  useEffect(() => {
    const onAsk = () => {
      setSections(readSections());
      setOpen(true);
    };
    window.addEventListener("internal:customise-sidebar", onAsk);
    return () => window.removeEventListener("internal:customise-sidebar", onAsk);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="internal-pop fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-[internal-fade-in_140ms_ease-out]" />
        <Dialog.Content className="internal-pop fixed left-1/2 top-[14vh] z-50 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] p-5 shadow-[var(--i-shadow-pop)] data-[state=open]:animate-[internal-fade-in_140ms_ease-out]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[16px] font-medium">Customise sidebar</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-[var(--i-muted)]">
                Switch off the sections you don&apos;t use. Only your sidebar changes, in this browser.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]">
              <X size={16} />
            </Dialog.Close>
          </div>

          <ul className="mt-4 divide-y divide-[var(--i-line)] rounded-xl border border-[var(--i-line)]">
            {sections.map((title) => {
              const on = !hidden.includes(title);
              return (
                <li key={title} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-[14px]">{title}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Show ${title}`}
                    onClick={() => setSectionHidden(title, on)}
                    className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                      on ? "bg-[var(--i-accent)]" : "bg-black/[0.12] dark:bg-white/[0.14]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                        on && "translate-x-4",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={showAllSections} className={buttonClass("ghost", "sm")}>
              Show all
            </button>
            <Dialog.Close className={buttonClass("primary", "sm")}>Done</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
