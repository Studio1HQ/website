"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowRight, CaretDown, CaretLeft, CaretRight, Check, CheckCircle, Tray } from "@/components/internal/icons";
import { AREAS } from "@/components/internal/overview-areas";
import { Card, CardTitle, iconButtonClass, segmentClass, segmentedClass } from "@/components/internal/ui";
import type { AreaKey, Attention } from "@/lib/internal/overview";
import { cn } from "@/lib/utils";

const PAGE = 5;

type Filter = "all" | "urgent" | AreaKey;

function AreaIcon({ area }: { area: AreaKey }) {
  const IconComponent = AREAS[area].icon;
  return <IconComponent size={15} className="shrink-0 text-[var(--i-muted)]" />;
}

function Row({ item }: { item: Attention }) {
  const area = AREAS[item.area];
  const IconComponent = area.icon;
  // One quiet style for every row; an urgent one only gets a small dot.
  return (
    <li>
      <Link
        href={item.href}
        className="group mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
      >
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[var(--i-ink-2)] dark:bg-white/[0.07]">
          <IconComponent size={16} />
          {item.urgent ? (
            <span
              aria-label="Urgent"
              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--i-accent)] ring-2 ring-[var(--i-panel)]"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium leading-snug">{item.label}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-[var(--i-muted)]">
            {area.name}
            {item.detail ? ` · ${item.detail}` : null}
          </span>
        </span>
        <ArrowRight size={14} className="shrink-0 text-[var(--i-faint)] transition-colors group-hover:text-[var(--i-ink)]" />
      </Link>
    </li>
  );
}

/**
 * "Needs you" on the overview: every to-do from every area, sorted into
 * tabs (All, Urgent, then each area that has something) and shown five at a
 * time, so a busy day stays one tidy card instead of a long column.
 */
export function NeedsYou({ items, className }: { items: Attention[]; className?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  const tabs = useMemo(() => {
    const byArea = new Map<AreaKey, number>();
    for (const item of items) byArea.set(item.area, (byArea.get(item.area) ?? 0) + 1);
    const urgent = items.filter((item) => item.urgent).length;
    return [
      { key: "all" as Filter, label: "All", count: items.length },
      ...(urgent ? [{ key: "urgent" as Filter, label: "Urgent", count: urgent }] : []),
      ...[...byArea.entries()].map(([area, count]) => ({ key: area as Filter, label: AREAS[area].name, count })),
    ];
  }, [items]);

  const areas = tabs.filter((tab) => tab.key !== "all" && tab.key !== "urgent");
  const picked = areas.find((tab) => tab.key === filter);
  const choose = (key: Filter) => {
    setFilter(key);
    setPage(0);
  };

  const shown = items.filter((item) =>
    filter === "all" ? true : filter === "urgent" ? item.urgent : item.area === filter,
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = shown.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardTitle
        action={
          items.length ? (
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[12px] font-medium tabular-nums text-[var(--i-ink-2)] dark:bg-white/[0.08]">
              {items.length}
            </span>
          ) : null
        }
      >
        <Tray size={15} />
        Needs you
      </CardTitle>

      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-2 text-[13.5px] text-[var(--i-muted)]">
          <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p>All clear: nothing is waiting on you.</p>
        </div>
      ) : (
        <>
          {/* All and Urgent side by side; the areas in a menu, so the row never runs off the card */}
          <div className="flex items-center gap-2 px-5 pb-2 pt-1">
            <nav aria-label="Show" className={segmentedClass}>
              {tabs.slice(0, 2).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={filter === tab.key}
                  onClick={() => choose(tab.key)}
                  className={cn(segmentClass(filter === tab.key), "h-7 px-3 text-[12.5px]")}
                >
                  {tab.label}
                  <span className="tabular-nums text-[var(--i-faint)]">{tab.count}</span>
                </button>
              ))}
            </nav>
            {areas.length > 1 ? (
              <Menu.Root>
                <Menu.Trigger
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] transition-colors",
                    picked
                      ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)] dark:bg-white/[0.14] dark:ring-0"
                      : "bg-black/[0.05] text-[var(--i-muted)] hover:text-[var(--i-ink)] dark:bg-white/[0.06]",
                  )}
                >
                  {picked ? picked.label : "Area"}
                  {picked ? <span className="tabular-nums text-[var(--i-faint)]">{picked.count}</span> : null}
                  <CaretDown size={13} />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Content
                    align="start"
                    sideOffset={6}
                    className="internal-pop z-50 min-w-[220px] rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] p-1.5 shadow-[var(--i-shadow-pop)] data-[state=open]:animate-[internal-fade-in_140ms_ease-out]"
                  >
                    {areas.map((tab) => (
                      <Menu.Item
                        key={tab.key}
                        onSelect={() => choose(tab.key)}
                        className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 text-[13px] outline-none data-[highlighted]:bg-black/[0.05] dark:data-[highlighted]:bg-white/[0.07]"
                      >
                        <AreaIcon area={tab.key as AreaKey} />
                        <span className="flex-1">{tab.label}</span>
                        <span className="min-w-6 rounded-full bg-black/[0.05] px-1.5 text-center text-[11.5px] font-medium leading-5 tabular-nums text-[var(--i-muted)] dark:bg-white/[0.08]">
                          {tab.count}
                        </span>
                        {filter === tab.key ? <Check size={14} className="text-[var(--i-ink)]" /> : null}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Portal>
              </Menu.Root>
            ) : null}
          </div>

          <ul className="pb-1">
            {slice.map((item) => (
              <Row key={`${item.area}-${item.label}`} item={item} />
            ))}
          </ul>

          {pages > 1 ? (
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--i-line)] px-5 py-3">
              <p className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                {current * PAGE + 1}–{Math.min(shown.length, current * PAGE + PAGE)} of {shown.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                  className={cn(iconButtonClass(), "disabled:pointer-events-none disabled:opacity-35")}
                >
                  <CaretLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                  className={cn(iconButtonClass(), "disabled:pointer-events-none disabled:opacity-35")}
                >
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
