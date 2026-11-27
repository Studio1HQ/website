"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/internal/select";
import { cn } from "@/lib/utils";

const SOURCES = [
  { value: "", label: "Every source" },
  { value: "call", label: "Call" },
  { value: "mail", label: "Mail" },
] as const;

/** The board's Source dropdown and Show lost toggle. Both live in the address, next to the Board or Table view. */
export function BoardFilters({
  source,
  showLost,
  view = "board",
}: {
  source: "" | "call" | "mail";
  showLost: boolean;
  view?: "board" | "table";
}) {
  const router = useRouter();
  const go = (next: { source: string; lost: boolean }) => {
    const query = new URLSearchParams();
    if (next.source) query.set("source", next.source);
    if (next.lost) query.set("lost", "1");
    if (view === "table") query.set("view", "table");
    router.replace(`/inbound${query.size ? `?${query}` : ""}`);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        size="sm"
        value={source}
        onChange={(next) => go({ source: next, lost: showLost })}
        aria-label="Source"
        className="w-40"
        options={SOURCES}
      />
      <button
        type="button"
        role="switch"
        aria-checked={showLost}
        onClick={() => go({ source, lost: !showLost })}
        className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)]"
      >
        <span
          aria-hidden
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            showLost ? "bg-[var(--i-accent)]" : "bg-[var(--i-line-strong)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-3 rounded-full bg-white transition-all",
              showLost ? "left-[14px]" : "left-0.5",
            )}
          />
        </span>
        Show lost
      </button>
    </div>
  );
}
