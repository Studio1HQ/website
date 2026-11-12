"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Check,
  FunnelSimple,
  MagnifyingGlass,
  Tag,
} from "@phosphor-icons/react";
import { SINCE, type Filters, type SinceKey } from "@/lib/internal/sections";
import type { FacetOptions, Option } from "@/lib/internal/query";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/internal/ui";

type View =
  | { kind: "facet"; key: string }
  | { kind: "tags" }
  | { kind: "date" }
  | null;

export function FilterMenu({
  facets,
  tags,
  filters,
  dateLabel,
  onFacet,
  onTag,
  onSince,
}: {
  facets: FacetOptions;
  tags: Option[] | null;
  filters: Filters;
  dateLabel: string;
  onFacet: (key: string, value: string) => void;
  onTag: (tag: string) => void;
  onSince: (since: SinceKey | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>(null);
  const [query, setQuery] = useState("");
  const active =
    Object.values(filters.facets).reduce((sum, values) => sum + values.length, 0) +
    filters.tags.length +
    (filters.since ? 1 : 0);

  const show = (next: View) => {
    setView(next);
    setQuery("");
  };

  const facet = view?.kind === "facet" ? facets.find((item) => item.key === view.key) : null;
  const options: (Option & { checked: boolean })[] =
    view?.kind === "facet" && facet
      ? facet.options.map((option) => ({
          ...option,
          checked: filters.facets[facet.key]?.includes(option.value) ?? false,
        }))
      : view?.kind === "tags" && tags
        ? tags.map((option) => ({
            ...option,
            checked: filters.tags.some((tag) => tag.toLowerCase() === option.value.toLowerCase()),
          }))
        : [];
  const visible = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const row =
    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--i-hover)] focus-visible:bg-[var(--i-hover)] focus-visible:outline-none";

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) show(null);
      }}
    >
      <Popover.Trigger asChild>
        <button type="button" className={buttonClass("secondary")}>
          <FunnelSimple size={15} />
          Filter
          {active ? (
            <span className="ml-0.5 rounded-full bg-[var(--i-ink)] px-1.5 text-[11px] leading-[18px] tabular-nums text-[var(--i-panel)]">
              {active}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="internal-pop z-50 w-72 overflow-hidden rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]"
        >
          {view === null ? (
            <div className="p-1">
              <p className="px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-[var(--i-muted)]">
                Filter by
              </p>
              {facets.map((item) => {
                const chosen = filters.facets[item.key]?.length ?? 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={row}
                    onClick={() => show({ kind: "facet", key: item.key })}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {chosen ? (
                      <span className="text-[11.5px] tabular-nums text-[var(--i-accent-text)]">
                        {chosen}
                      </span>
                    ) : null}
                    <CaretRight size={13} className="text-[var(--i-faint)]" />
                  </button>
                );
              })}
              {tags ? (
                <button type="button" className={row} onClick={() => show({ kind: "tags" })}>
                  <Tag size={14} className="text-[var(--i-muted)]" />
                  <span className="flex-1">Tags</span>
                  {filters.tags.length ? (
                    <span className="text-[11.5px] tabular-nums text-[var(--i-accent-text)]">
                      {filters.tags.length}
                    </span>
                  ) : null}
                  <CaretRight size={13} className="text-[var(--i-faint)]" />
                </button>
              ) : null}
              <button type="button" className={row} onClick={() => show({ kind: "date" })}>
                <CalendarBlank size={14} className="text-[var(--i-muted)]" />
                <span className="flex-1">{dateLabel}</span>
                {filters.since ? (
                  <span className="text-[11.5px] text-[var(--i-accent-text)]">
                    {SINCE[filters.since].label.replace("Last ", "")}
                  </span>
                ) : null}
                <CaretRight size={13} className="text-[var(--i-faint)]" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1 border-b border-[var(--i-line)] p-1.5">
                <button
                  type="button"
                  onClick={() => show(null)}
                  aria-label="Back to filters"
                  className="flex size-7 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <CaretLeft size={14} />
                </button>
                {view.kind === "date" ? (
                  <span className="px-1 text-[13px] font-medium">{dateLabel}</span>
                ) : (
                  <div className="relative flex-1">
                    <MagnifyingGlass
                      size={13}
                      className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--i-faint)]"
                    />
                    <input
                      autoFocus
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={`Search ${view.kind === "tags" ? "tags" : (facet?.label ?? "").toLowerCase()}…`}
                      aria-label="Search options"
                      className="h-7 w-full rounded-md bg-transparent pl-7 pr-2 text-[13px] outline-none placeholder:text-[var(--i-faint)]"
                    />
                  </div>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {view.kind === "date" ? (
                  [undefined, ...(Object.keys(SINCE) as SinceKey[])].map((key) => {
                    const checked = filters.since === key;
                    return (
                      <button
                        key={key ?? "any"}
                        type="button"
                        className={row}
                        onClick={() => {
                          onSince(key);
                          setOpen(false);
                          show(null);
                        }}
                      >
                        <span className="flex-1">{key ? SINCE[key].label : "Any time"}</span>
                        {checked ? <Check size={14} className="text-[var(--i-accent)]" /> : null}
                      </button>
                    );
                  })
                ) : visible.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[12.5px] text-[var(--i-muted)]">
                    {options.length ? "Nothing matches." : "No values yet."}
                  </p>
                ) : (
                  visible.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={option.checked}
                      className={row}
                      onClick={() =>
                        view.kind === "tags" ? onTag(option.value) : onFacet(view.key, option.value)
                      }
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          option.checked
                            ? "border-[var(--i-ink)] bg-[var(--i-ink)] text-[var(--i-panel)]"
                            : "border-[var(--i-line-strong)]",
                        )}
                      >
                        {option.checked ? <Check size={11} weight="bold" /> : null}
                      </span>
                      <span className="flex-1 truncate">{option.label}</span>
                      <span className="text-[11.5px] tabular-nums text-[var(--i-faint)]">
                        {option.count}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
