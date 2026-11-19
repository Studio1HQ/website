"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { deleteDrafts } from "@/app/internal/(dashboard)/blog/actions";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";
import { cn } from "@/lib/utils";

/*
 * Picking several drafts on the Posts list and deleting them in one go.
 * DraftSelection holds the picks and draws the bar above the rows; each
 * row's DraftCheckbox reads it. The rows themselves stay server-rendered.
 */

type Selection = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  busy: boolean;
};

const SelectionContext = createContext<Selection | null>(null);

const BOX =
  "size-4 shrink-0 cursor-pointer rounded border-[var(--i-line-strong)] accent-[var(--i-accent)]";

export function DraftSelection({
  ids,
  show,
  children,
}: {
  ids: string[];
  /** Off on tabs other than Drafts: the rows render as they are, with no bar. */
  show: boolean;
  children: ReactNode;
}) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [asking, setAsking] = useState(false);
  const [busy, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  // Only drafts still on the list count (others may have gone since).
  const selected = new Set(ids.filter((id) => picked.has(id)));
  const all = ids.length > 0 && selected.size === ids.length;
  const count = selected.size;
  const drafts = (n: number) => `${n} ${n === 1 ? "draft" : "drafts"}`;

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remove = () =>
    start(async () => {
      const result = await deleteDrafts([...selected]);
      setAsking(false);
      if (!result.ok) {
        toast("error", result.message);
        return;
      }
      setPicked(new Set());
      if (result.deleted) {
        toast(
          "success",
          result.skipped
            ? `${drafts(result.deleted)} deleted. ${result.skipped} couldn't be (gone, live or in review).`
            : `${drafts(result.deleted)} deleted.`,
        );
      } else {
        toast("error", "None of those could be deleted. Reload and try again.");
      }
      router.refresh();
    });

  return (
    <SelectionContext.Provider value={{ selected, toggle, busy }}>
      {show ? (
        <div
          className={cn(
            "flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--i-line)] px-4 py-2 text-[12.5px] sm:px-5",
            count ? "bg-[var(--i-accent-soft)]/40" : "bg-[var(--i-sunken)]",
          )}
        >
          <label className="flex cursor-pointer items-center gap-3 text-[var(--i-muted)]">
            <input
              type="checkbox"
              checked={all}
              disabled={busy || !ids.length}
              ref={(input) => {
                if (input) input.indeterminate = count > 0 && !all;
              }}
              onChange={() => setPicked(all ? new Set() : new Set(ids))}
              aria-label="Select all drafts"
              className={BOX}
            />
            <span
              className={count ? "font-medium text-[var(--i-ink)]" : undefined}
            >
              {count ? `${count} selected` : "Select all"}
            </span>
          </label>
          {count ? (
            <span className="ml-auto flex items-center gap-1.5">
              {asking ? (
                <>
                  <span className="text-[var(--i-muted)]">
                    Delete {drafts(count)} for good?
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={remove}
                    className={buttonClass("danger", "sm")}
                  >
                    {busy ? "Deleting…" : `Delete ${count}`}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAsking(false)}
                    className={buttonClass("ghost", "sm")}
                  >
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPicked(new Set())}
                    className={buttonClass("ghost", "sm")}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsking(true)}
                    className={buttonClass("secondary", "sm")}
                  >
                    <Trash size={14} /> Delete selected
                  </button>
                </>
              )}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </SelectionContext.Provider>
  );
}

export function DraftCheckbox({ id, title }: { id: string; title: string }) {
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  return (
    <input
      type="checkbox"
      checked={selection.selected.has(id)}
      disabled={selection.busy}
      onChange={() => selection.toggle(id)}
      aria-label={`Select “${title}”`}
      className={BOX}
    />
  );
}
