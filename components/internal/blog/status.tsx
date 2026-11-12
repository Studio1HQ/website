import { cn } from "@/lib/utils";
import { STATUS_INFO, type BlogStatus } from "@/lib/internal/blog/shared";

const TONES = {
  neutral: "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-white/[0.06] dark:text-stone-300 dark:ring-white/10",
  accent: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/25",
  warning: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25",
  live: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25",
} as const;

const DOTS = {
  neutral: "bg-stone-400",
  accent: "bg-orange-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  live: "bg-sky-500",
} as const;

/** A post's stage. A live post with unsaved-to-site edits reads "Live · edited". */
export function BlogStatusBadge({ status, live = false }: { status: BlogStatus; live?: boolean }) {
  const info = STATUS_INFO[status];
  const label = live && status !== "published" ? `Live · ${info.label.toLowerCase()}` : info.label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset",
        TONES[info.tone],
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOTS[info.tone])} />
      {label}
    </span>
  );
}
