"use client";

import { useMemo, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Minus, Plus } from "@phosphor-icons/react";
import { cleanTag } from "@/lib/internal/sections";
import type { Option } from "@/lib/internal/query";
import { cn } from "@/lib/utils";
import { tagTone } from "@/components/internal/ui";

export type TagState = "all" | "some" | "none";

/**
 * Find, toggle or create tags. `state` says whether the tag is on every
 * target (checked), some of them (dash) or none; toggling an "all" tag
 * removes it, anything else adds it.
 */
export function TagPicker({
  options,
  state,
  onToggle,
  children,
  align = "start",
  side = "bottom",
}: {
  options: Option[];
  state: (tag: string) => TagState;
  onToggle: (tag: string, add: boolean) => void;
  children: ReactNode;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const term = query.trim().toLowerCase();
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(term)),
    [options, term],
  );
  const created = cleanTag(query);
  const canCreate =
    !!created && !options.some((option) => option.label.toLowerCase() === created.toLowerCase());
  const items = [
    ...filtered.map((option) => ({ kind: "tag" as const, tag: option.value, count: option.count })),
    ...(canCreate ? [{ kind: "create" as const, tag: created!, count: 0 }] : []),
  ];

  const choose = (index: number) => {
    const item = items[index];
    if (!item) return;
    onToggle(item.tag, item.kind === "create" || state(item.tag) !== "all");
    if (item.kind === "create") setQuery("");
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="internal-pop z-50 w-64 overflow-hidden rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]"
        >
          <div className="border-b border-[var(--i-line)] p-1.5">
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, items.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  choose(active);
                }
              }}
              placeholder="Find or create a tag…"
              aria-label="Find or create a tag"
              className="h-8 w-full rounded-md bg-transparent px-2 text-[13px] outline-none placeholder:text-[var(--i-faint)]"
            />
          </div>
          <div role="listbox" aria-label="Tags" className="max-h-64 overflow-y-auto p-1">
            {items.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12.5px] text-[var(--i-muted)]">
                Type a name to create a tag.
              </p>
            ) : null}
            {items.map((item, index) => {
              const current = item.kind === "tag" ? state(item.tag) : "none";
              return (
                <button
                  key={`${item.kind}-${item.tag}`}
                  type="button"
                  role="option"
                  aria-selected={current === "all"}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px]",
                    index === active && "bg-[var(--i-hover)]",
                  )}
                >
                  {item.kind === "create" ? (
                    <>
                      <Plus size={14} className="text-[var(--i-muted)]" />
                      <span className="truncate">
                        Create <span className="font-medium">“{item.tag}”</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          current === "none"
                            ? "border-[var(--i-line-strong)]"
                            : "border-[var(--i-ink)] bg-[var(--i-ink)] text-[var(--i-panel)]",
                        )}
                      >
                        {current === "all" ? <Check size={11} weight="bold" /> : null}
                        {current === "some" ? <Minus size={11} weight="bold" /> : null}
                      </span>
                      <span
                        className={cn(
                          "truncate rounded px-1.5 py-px text-[12px] font-medium ring-1 ring-inset",
                          tagTone(item.tag),
                        )}
                      >
                        {item.tag}
                      </span>
                      {item.count ? (
                        <span className="ml-auto text-[11.5px] tabular-nums text-[var(--i-faint)]">
                          {item.count}
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
